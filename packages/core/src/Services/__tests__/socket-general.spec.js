import { Analytics } from '@deriv-com/analytics';

import WS from '../ws-methods';
import BinarySocketGeneral from '../socket-general';

jest.mock('@deriv/shared', () => ({
    getAccountId: jest.fn(() => null),
    getPropertyValue: jest.fn(),
    getSocketURL: jest.fn(() => 'wss://test.example/websockets/v3'),
    mapErrorMessage: jest.fn(),
}));

jest.mock('../ws-methods', () => ({
    __esModule: true,
    default: {
        setOnReconnect: jest.fn(),
        get: jest.fn(),
        subscribeBalance: jest.fn(),
        forgetAll: jest.fn(),
    },
}));

jest.mock('_common/base/server_time', () => ({
    __esModule: true,
    default: {
        init: jest.fn(),
        get: jest.fn(),
    },
}));

describe('BinarySocketGeneral onOpen response timeout reporting', () => {
    const trackEvent = Analytics.trackEvent;
    let onOpen;
    let console_error_spy;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        console_error_spy = jest.spyOn(console, 'error').mockImplementation(() => {});

        WS.get.mockReturnValue({
            expect_response_types: {
                ping: { state: 'pending' },
                time: { state: 'resolved' },
            },
        });

        const store = {
            client: { loginid: 'CR123' },
            common: { setIsSocketOpened: jest.fn(), setServerTime: jest.fn() },
            gtm: {},
        };

        ({ onOpen } = BinarySocketGeneral.init(store));
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        console_error_spy.mockRestore();
    });

    it('reports a websocket_timeout event with the pending response types after 30s', () => {
        onOpen(true);

        jest.advanceTimersByTime(30000);

        expect(trackEvent).toHaveBeenCalledTimes(1);
        expect(trackEvent).toHaveBeenCalledWith('websocket_timeout', {
            message: 'deriv-api: no message received after 30s',
            websocketUrl: 'wss://test.example/websockets/v3',
            pendingResponseTypes: ['ping'],
        });
    });

    it('does not report before the 30s timeout has elapsed', () => {
        onOpen(true);

        jest.advanceTimersByTime(29999);

        expect(trackEvent).not.toHaveBeenCalled();
    });

    it('swallows analytics reporting failures without throwing from the timer callback', () => {
        trackEvent.mockImplementationOnce(() => {
            throw new Error('analytics down');
        });

        onOpen(true);

        expect(() => jest.advanceTimersByTime(30000)).not.toThrow();
        expect(console_error_spy).toHaveBeenCalledWith('Failed to report error to analytics:', expect.any(Error));
    });
});

describe('BinarySocketGeneral logged-out session guards', () => {
    const { getAccountId, getPropertyValue } = jest.requireMock('@deriv/shared');
    let onMessage;
    let client_store;

    const makeErrorResponse = (msg_type, code) => {
        getPropertyValue.mockReturnValue(code);
        return { msg_type, error: { code } };
    };

    beforeEach(() => {
        jest.clearAllMocks();

        client_store = {
            loginid: 'CR123',
            logout: jest.fn(() => Promise.resolve({ logout: 1 })),
        };
        const store = {
            client: client_store,
            common: { setIsSocketOpened: jest.fn(), setServerTime: jest.fn() },
            gtm: {},
        };

        ({ onMessage } = BinarySocketGeneral.init(store));
    });

    it('does not log out a public (logged-out) session on AuthorizationRequired — that would loop reconnects forever', () => {
        getAccountId.mockReturnValue(null);

        onMessage(makeErrorResponse('balance', 'AuthorizationRequired'));

        expect(client_store.logout).not.toHaveBeenCalled();
    });

    it('logs out a logged-in session on AuthorizationRequired', () => {
        getAccountId.mockReturnValue('DOT12345');

        onMessage(makeErrorResponse('balance', 'AuthorizationRequired'));

        expect(client_store.logout).toHaveBeenCalledTimes(1);
    });

    it('ignores InvalidToken on a public session instead of reload-looping', () => {
        getAccountId.mockReturnValue(null);

        onMessage(makeErrorResponse('balance', 'InvalidToken'));

        expect(client_store.logout).not.toHaveBeenCalled();
    });

    it('still reloads within a bounded window when the InvalidToken logout call hangs', async () => {
        jest.useFakeTimers();
        const reload = jest.fn();
        const original_location = window.location;
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { ...original_location, reload },
        });

        try {
            getAccountId.mockReturnValue('DOT12345');
            // The REST logout's fetch has no timeout — under a hung network it never settles.
            client_store.logout.mockImplementation(() => new Promise(() => undefined));

            onMessage(makeErrorResponse('balance', 'InvalidToken'));
            expect(client_store.logout).toHaveBeenCalledTimes(1);

            jest.advanceTimersByTime(5000);
            // Flush the Promise.race/.finally microtasks queued by the timer resolution.
            await Promise.resolve();
            await Promise.resolve();
            await Promise.resolve();

            expect(reload).toHaveBeenCalledTimes(1);
        } finally {
            Object.defineProperty(window, 'location', { configurable: true, value: original_location });
            jest.useRealTimers();
        }
    });

    it('only re-subscribes balance on reconnect when logged in', () => {
        const reconnect_handler = WS.setOnReconnect.mock.calls[0][0];

        getAccountId.mockReturnValue(null);
        reconnect_handler();
        expect(WS.subscribeBalance).not.toHaveBeenCalled();

        getAccountId.mockReturnValue('DOT12345');
        reconnect_handler();
        expect(WS.subscribeBalance).toHaveBeenCalledTimes(1);
    });
});

describe('BinarySocketGeneral onConnectionError session validation', () => {
    const { getAccountId } = jest.requireMock('@deriv/shared');
    let onConnectionError;
    let client_store;
    let common_store;

    beforeEach(() => {
        jest.clearAllMocks();

        client_store = {
            loginid: 'CR123',
            handleWhoAmI: jest.fn(() => Promise.resolve()),
        };
        common_store = { setError: jest.fn(), setIsSocketOpened: jest.fn(), setServerTime: jest.fn() };

        ({ onConnectionError } = BinarySocketGeneral.init({
            client: client_store,
            common: common_store,
            gtm: {},
        }));
    });

    it('routes a logged-in session through the shared whoami validation instead of showing the error screen', () => {
        getAccountId.mockReturnValue('DOT12345');

        onConnectionError();

        expect(client_store.handleWhoAmI).toHaveBeenCalledTimes(1);
        expect(common_store.setError).not.toHaveBeenCalled();
    });

    it('shows the error screen directly on a public session, where refusal cannot be an auth event', () => {
        getAccountId.mockReturnValue(null);

        onConnectionError();

        expect(client_store.handleWhoAmI).not.toHaveBeenCalled();
        expect(common_store.setError).toHaveBeenCalledTimes(1);
    });
});
