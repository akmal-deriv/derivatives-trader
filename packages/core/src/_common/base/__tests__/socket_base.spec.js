jest.mock('@deriv/shared', () => ({
    getCompleteWebSocketURL: jest.fn(() => 'wss://test.example/websockets/v3'),
    getAccountId: jest.fn(() => null),
    cloneObject: jest.fn(obj => obj),
    State: { set: jest.fn() },
}));

jest.mock('@deriv-com/translations', () => ({
    localize: text => text,
}));

jest.mock('../socket_cache', () => ({}));
// NOTE: api_middleware is deliberately NOT mocked — the connection-death settlement race lives
// there and is under test end-to-end through socket_base.

// Emulates the real deriv-api flow (verified against the minified dist): send() consults
// middleware.sendWillBeCalled (dedup) first, then sendIsCalled — whose truthy return value
// REPLACES the raw promise as send()'s result. The raw promise never settles unless the test
// settles it, mirroring the library's behavior on connection death.
const api_instances = [];
jest.mock('@deriv/deriv-api/dist/DerivAPIBasic', () =>
    jest.fn().mockImplementation(({ middleware }) => {
        const instance = {
            middleware,
            callbacks: {},
            pending: [],
            onOpen: () => ({ subscribe: cb => (instance.callbacks.open = cb) }),
            onMessage: () => ({ subscribe: cb => (instance.callbacks.message = cb) }),
            onClose: () => ({ subscribe: cb => (instance.callbacks.close = cb) }),
            send: jest.fn((request, options) => {
                const deduped = middleware.sendWillBeCalled({ args: [request, options] });
                if (deduped) return deduped;
                const raw = new Promise((resolve, reject) => {
                    instance.pending.push({ request, resolve, reject });
                });
                return middleware.sendIsCalled({ response_promise: raw, args: [request, options] }) || raw;
            }),
        };
        api_instances.push(instance);
        return instance;
    })
);

describe('BinarySocketBase pending-request settlement', () => {
    let BinarySocket;
    let sockets;
    let ws_event;

    class MockWebSocket {
        constructor() {
            this.readyState = 0; // CONNECTING
            sockets.push(this);
        }
        addEventListener() {
            // error listener registration — not needed for these tests
        }
        close() {
            if (this.readyState === 0 || this.readyState === 1) this.readyState = 2;
        }
    }

    beforeEach(() => {
        jest.resetModules();
        sockets = [];
        api_instances.length = 0;
        global.WebSocket = MockWebSocket;

        BinarySocket = require('../socket_base');
        ws_event = jest.fn();
        BinarySocket.init({ options: { wsEvent: ws_event, isOnline: () => true }, client: {} });
        BinarySocket.openNewConnection();
    });

    const expectConnectionLost = (promise, echo_req, msg_type) =>
        expect(promise).resolves.toMatchObject({
            echo_req,
            msg_type,
            error: { code: 'ConnectionLost' },
        });

    it('settles an in-flight request with a synthetic error-response when its connection closes', async () => {
        const request = { proposal: 1, amount: 150 };
        const pending = BinarySocket.send(request);

        api_instances[0].callbacks.close();

        await expectConnectionLost(pending, request, 'proposal');
    });

    it('settles an in-flight request when its connection is replaced by a new one', async () => {
        const request = { proposal: 1, amount: 250 };
        const pending = BinarySocket.send(request);

        // Rebuild: mark the current socket closed so openNewConnection creates a fresh pair.
        sockets[0].readyState = 3;
        BinarySocket.openNewConnection();
        expect(api_instances).toHaveLength(2);

        await expectConnectionLost(pending, request, 'proposal');
    });

    it('covers trade actions (buy) — no request path can hang on a dead connection', async () => {
        const pending = BinarySocket.buy({ proposal_id: 'abc123', price: 10 });

        api_instances[0].callbacks.close();

        await expectConnectionLost(pending, { buy: 'abc123', price: 10 }, 'buy');
    });

    it('settles dedup-shared promises too — a duplicate request during the death window is not stranded', async () => {
        const first = BinarySocket.send({ time: 1 });
        const second = BinarySocket.send({ time: 1 });

        // Dedup: the second call shares the first's (raced) promise — only one raw request exists.
        expect(api_instances[0].pending).toHaveLength(1);

        api_instances[0].callbacks.close();

        await expectConnectionLost(first, { time: 1 }, 'time');
        await expectConnectionLost(second, { time: 1 }, 'time');
    });

    it('does not let a replaced connection`s late close event settle the new connection`s requests', async () => {
        const old_pending = BinarySocket.send({ time: 1 });

        sockets[0].readyState = 3;
        BinarySocket.openNewConnection();
        await expectConnectionLost(old_pending, { time: 1 }, 'time');

        const new_pending = BinarySocket.send({ proposal: 1, amount: 150 });
        const race = Promise.race([
            new_pending.then(
                () => 'settled',
                () => 'settled'
            ),
            Promise.resolve().then(() => 'pending'),
        ]);

        // The OLD connection's close event arrives after the new one is already active.
        api_instances[0].callbacks.close();

        expect(await race).toBe('pending');

        // The new connection's own close still settles its requests as usual.
        api_instances[1].callbacks.close();
        await expectConnectionLost(new_pending, { proposal: 1, amount: 150 }, 'proposal');
    });

    it('resolves normally when the response arrives before any connection death', async () => {
        const pending = BinarySocket.send({ time: 1 });

        api_instances[1 - 1].pending[0].resolve({ msg_type: 'time', time: 123, echo_req: { time: 1 } });

        await expect(pending).resolves.toMatchObject({ time: 123 });
    });

    it('ignores a replaced CLOSING socket`s late close — only the current instance`s close is genuine', () => {
        // The socket is mid-close-handshake (close event not yet delivered) when the retry loop
        // calls openNewConnection() directly.
        sockets[0].readyState = 2; // CLOSING
        BinarySocket.openNewConnection();
        expect(api_instances).toHaveLength(2);

        ws_event.mockClear();
        // The OLD socket's belated close event arrives — it is not the current instance, so no
        // 'close' wsEvent (which would schedule a spurious reconnect and stop the fresh
        // connection's keep-alive).
        api_instances[0].callbacks.close();
        expect(ws_event).not.toHaveBeenCalledWith('close');

        // The NEW connection's own genuine close still propagates normally.
        api_instances[1].callbacks.close();
        expect(ws_event).toHaveBeenCalledWith('close');
    });

    it('ignores a replaced CLOSED socket`s late-dispatched close (frozen-tab race)', () => {
        // Real mobile freeze: the socket died while JS was suspended — readyState is already
        // CLOSED at thaw, but its close event is still queued and dispatches only AFTER the
        // resume path has replaced the connection. A counter keyed on readyState could not
        // cover this; instance identity does.
        sockets[0].readyState = 3; // CLOSED, close event still queued
        BinarySocket.openNewConnection();
        expect(api_instances).toHaveLength(2);

        ws_event.mockClear();
        api_instances[0].callbacks.close(); // the queued close finally dispatches
        expect(ws_event).not.toHaveBeenCalledWith('close');

        // The new connection's first genuine close must still propagate.
        api_instances[1].callbacks.close();
        expect(ws_event).toHaveBeenCalledWith('close');
    });

    it('flags the disconnect once when a connection is replaced, not again on its late close', () => {
        const on_disconnect = jest.fn();
        BinarySocket.setOnDisconnect(on_disconnect);

        sockets[0].readyState = 3;
        BinarySocket.openNewConnection();

        // The replacement itself is the disconnect: the outgoing instance's close event is
        // identity-gated out, so reporting has to happen here or not at all.
        expect(on_disconnect).toHaveBeenCalledTimes(1);

        // Old instance's late close adds nothing — it must not re-flag under a healthy successor.
        api_instances[0].callbacks.close();
        expect(on_disconnect).toHaveBeenCalledTimes(1);

        // The new connection's own genuine close is its own disconnect.
        api_instances[1].callbacks.close();
        expect(on_disconnect).toHaveBeenCalledTimes(2);
    });

    it('reports a disconnect on an account switch so the chart rebuilds its tick streams', () => {
        // Regression: SmartCharts re-issues ticks_history only on an isConnectionOpened
        // false -> true transition (common_store.is_socket_opened, driven by onDisconnect/onOpen).
        // switchAccount() calls closeAndOpenNewConnection(), which replaces the connection
        // synchronously — the outgoing socket's close event dispatches a task later, by which
        // point the identity gate discards it. Without a disconnect at the swap, is_socket_opened
        // never dips, the chart keeps a stream on the dead connection and freezes.
        const on_disconnect = jest.fn();
        BinarySocket.setOnDisconnect(on_disconnect);

        sockets[0].readyState = 1; // OPEN — a live connection, as during a real account switch
        BinarySocket.closeAndOpenNewConnection();

        expect(api_instances).toHaveLength(2);
        expect(on_disconnect).toHaveBeenCalledTimes(1);

        // The old socket's close event arrives after the swap and changes nothing.
        api_instances[0].callbacks.close();
        expect(on_disconnect).toHaveBeenCalledTimes(1);
    });

    it('does not report a disconnect for the initial connection (no predecessor)', () => {
        jest.resetModules();
        sockets = [];
        api_instances.length = 0;

        const Fresh = require('../socket_base');
        const on_disconnect = jest.fn();
        Fresh.init({
            options: { wsEvent: jest.fn(), isOnline: () => true, onDisconnect: on_disconnect },
            client: {},
        });
        Fresh.openNewConnection();

        expect(on_disconnect).not.toHaveBeenCalled();
    });

    it('does not double-report when a closed connection that already reported is replaced', () => {
        const on_disconnect = jest.fn();
        BinarySocket.setOnDisconnect(on_disconnect);

        // Genuine close first: the current connection reports its own disconnect.
        api_instances[0].callbacks.close();
        expect(on_disconnect).toHaveBeenCalledTimes(1);

        // The network monitor then rebuilds it — already reported, so no second notification.
        sockets[0].readyState = 3;
        BinarySocket.openNewConnection();
        expect(on_disconnect).toHaveBeenCalledTimes(1);
    });
});

describe('BinarySocketBase waitForAuth', () => {
    let BinarySocket;

    class MockWebSocket {
        constructor() {
            this.readyState = 0;
        }
        addEventListener() {
            // not needed
        }
        close() {
            this.readyState = 2;
        }
    }

    beforeEach(() => {
        jest.resetModules();
        api_instances.length = 0;
        global.WebSocket = MockWebSocket;
        BinarySocket = require('../socket_base');
    });

    it('resolves once is_authorize flips true (auth confirmation on ANY connection instance)', async () => {
        const { observable, runInAction } = require('mobx');
        const client = observable({ is_authorize: false });
        BinarySocket.init({ options: { wsEvent: jest.fn(), isOnline: () => true }, client });

        let resolved = false;
        const gate = BinarySocket.waitForAuth().then(() => {
            resolved = true;
        });

        await Promise.resolve();
        expect(resolved).toBe(false);

        runInAction(() => {
            client.is_authorize = true;
        });
        await gate;
        expect(resolved).toBe(true);
    });

    it('resolves immediately when auth is already confirmed', async () => {
        const { observable } = require('mobx');
        BinarySocket.init({
            options: { wsEvent: jest.fn(), isOnline: () => true },
            client: observable({ is_authorize: true }),
        });

        await expect(BinarySocket.waitForAuth()).resolves.toBeUndefined();
    });

    it('short-circuits safely before init (no store to observe)', async () => {
        await expect(BinarySocket.waitForAuth()).resolves.toBeUndefined();
    });

    it('rejects on timeout so callers can fall back to session validation', async () => {
        const { observable } = require('mobx');
        BinarySocket.init({
            options: { wsEvent: jest.fn(), isOnline: () => true },
            client: observable({ is_authorize: false }),
        });

        await expect(BinarySocket.waitForAuth({ timeout: 1 })).rejects.toThrow();
    });
});
