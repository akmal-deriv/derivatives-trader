jest.mock('@deriv-com/translations', () => ({
    localize: text => text,
}));

jest.mock('../socket_base', () => ({
    init: jest.fn(),
    openNewConnection: jest.fn(),
    closeAndOpenNewConnection: jest.fn(),
    sendKeepAlive: jest.fn(),
    close: jest.fn(),
    hasReadyState: jest.fn(),
}));

describe('NetworkMonitorBase', () => {
    let BinarySocket, fncUpdateUI, wsEvent;

    // Make the mocked socket report the given readyState (WebSocket constants: 0=CONNECTING,
    // 1=OPEN, 2=CLOSING, 3=CLOSED, null=never created).
    const setReadyState = ready_state => {
        BinarySocket.hasReadyState.mockImplementation(
            (...states) => ready_state !== null && states.some(s => s === ready_state)
        );
    };

    const flushTimers = () => {
        // The reconnect loop uses jittered delays; run in bounded steps rather than runAllTimers
        // so a non-terminating loop fails the test instead of hanging it.
        for (let i = 0; i < 50; i++) {
            jest.advanceTimersByTime(10000);
        }
    };

    beforeEach(() => {
        // NetworkMonitorBase is an IIFE singleton whose init() registers window/document listeners;
        // a fresh module (and a fresh socket_base mock) per test keeps listeners from stacking.
        jest.resetModules();
        jest.useFakeTimers();
        BinarySocket = require('../socket_base');
        const NetworkMonitorBase = require('../network_monitor_base');

        fncUpdateUI = jest.fn();
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
        setReadyState(1);
        NetworkMonitorBase.init({}, fncUpdateUI, {});
        wsEvent = BinarySocket.init.mock.calls[0][0].options.wsEvent;
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('always registers config with the socket, and opens the initial connection when online', () => {
        expect(BinarySocket.init).toHaveBeenCalled();
        expect(BinarySocket.openNewConnection).toHaveBeenCalledTimes(1);
    });

    describe('reconnect loop', () => {
        it('probes once and stops when the socket is already OPEN (no infinite ping loop)', () => {
            window.dispatchEvent(new Event('online'));
            flushTimers();

            expect(BinarySocket.sendKeepAlive).toHaveBeenCalledTimes(1);
            // Initial connection only — the loop must not keep re-opening or rescheduling.
            expect(BinarySocket.openNewConnection).toHaveBeenCalledTimes(1);
        });

        it('reopens a CLOSED socket after a close event and stops once it opens', () => {
            setReadyState(3);
            wsEvent('close');

            jest.advanceTimersByTime(5000);
            expect(BinarySocket.openNewConnection).toHaveBeenCalledTimes(2);

            // Connection succeeds: `open` must clear the retry loop.
            setReadyState(1);
            wsEvent('open');
            flushTimers();
            expect(BinarySocket.openNewConnection).toHaveBeenCalledTimes(2);
            expect(BinarySocket.sendKeepAlive).not.toHaveBeenCalled();
        });

        it('leaves a CONNECTING handshake alone but keeps checking on it', () => {
            setReadyState(3);
            wsEvent('close');
            jest.advanceTimersByTime(5000);
            expect(BinarySocket.openNewConnection).toHaveBeenCalledTimes(2);

            // Handshake in progress: no new openNewConnection while CONNECTING.
            setReadyState(0);
            jest.advanceTimersByTime(20000);
            expect(BinarySocket.openNewConnection).toHaveBeenCalledTimes(2);

            // Handshake failed (socket CLOSED again): the loop reopens.
            setReadyState(3);
            flushTimers();
            expect(BinarySocket.openNewConnection.mock.calls.length).toBeGreaterThan(2);
        });

        it('does not schedule reconnects while offline', () => {
            Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
            setReadyState(3);
            wsEvent('close');
            flushTimers();
            expect(BinarySocket.openNewConnection).toHaveBeenCalledTimes(1);
        });
    });

    describe('resume verification', () => {
        it('probes an OPEN socket instead of rebuilding it on visibility resume', () => {
            document.dispatchEvent(new Event('visibilitychange'));

            expect(BinarySocket.sendKeepAlive).toHaveBeenCalledTimes(1);
            expect(BinarySocket.closeAndOpenNewConnection).not.toHaveBeenCalled();
        });

        it('rebuilds a CLOSED socket on visibility resume', () => {
            setReadyState(3);
            document.dispatchEvent(new Event('visibilitychange'));

            expect(BinarySocket.closeAndOpenNewConnection).toHaveBeenCalledTimes(1);
            expect(BinarySocket.sendKeepAlive).not.toHaveBeenCalled();
        });

        it('leaves a CONNECTING handshake alone on visibility resume', () => {
            setReadyState(0);
            document.dispatchEvent(new Event('visibilitychange'));

            expect(BinarySocket.closeAndOpenNewConnection).not.toHaveBeenCalled();
            expect(BinarySocket.sendKeepAlive).not.toHaveBeenCalled();
        });

        it('ignores pageshow on a normal load and verifies only bfcache restores', () => {
            setReadyState(3);

            const normal_load = new Event('pageshow');
            window.dispatchEvent(normal_load);
            expect(BinarySocket.closeAndOpenNewConnection).not.toHaveBeenCalled();

            const bfcache_restore = new Event('pageshow');
            Object.defineProperty(bfcache_restore, 'persisted', { value: true });
            window.dispatchEvent(bfcache_restore);
            expect(BinarySocket.closeAndOpenNewConnection).toHaveBeenCalledTimes(1);
        });

        it('rebuilds a CLOSED socket on window focus — screen-unlock can fire focus without any visibilitychange', () => {
            setReadyState(3);

            window.dispatchEvent(new Event('focus'));

            expect(BinarySocket.closeAndOpenNewConnection).toHaveBeenCalledTimes(1);
        });

        it('rebuilds a CLOSED socket on the Page Lifecycle resume event (frozen-tab thaw)', () => {
            setReadyState(3);

            document.dispatchEvent(new Event('resume'));

            expect(BinarySocket.closeAndOpenNewConnection).toHaveBeenCalledTimes(1);
        });

        it('only probes (never rebuilds) on focus when the socket is OPEN', () => {
            setReadyState(1);

            window.dispatchEvent(new Event('focus'));

            expect(BinarySocket.sendKeepAlive).toHaveBeenCalledTimes(1);
            expect(BinarySocket.closeAndOpenNewConnection).not.toHaveBeenCalled();
        });
    });
});
