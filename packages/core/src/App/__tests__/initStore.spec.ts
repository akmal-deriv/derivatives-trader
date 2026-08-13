import { getAccountId, removeCookies } from '@deriv/shared';

import { initStore } from '../initStore';

// initStore instantiates the full RootStore and talks to Services/whoami — mock the
// heavy collaborators so we can assert the session-cleanup behaviour in isolation.
jest.mock('@deriv/shared', () => ({
    clearAccountId: jest.fn(),
    fetchLegacyHistoryMigrationStatus: jest.fn().mockResolvedValue({}),
    getAccountId: jest.fn(),
    getApiCoreBaseUrl: jest.fn(() => 'https://api-core.deriv.com'),
    getBrandDomains: jest.fn(() => []),
    isDemoAccountId: jest.fn((id?: string | null) => !!id?.startsWith('DOT')),
    removeCookies: jest.fn(),
    clearAccountTypeParam: jest.fn(),
}));

jest.mock('Services', () => ({
    checkWhoAmI: jest.fn(),
    fetchMigrationStatus: jest.fn().mockResolvedValue({}),
}));

jest.mock('Services/network-monitor', () => ({
    __esModule: true,
    default: { init: jest.fn() },
}));

jest.mock('Stores', () => ({
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
        common: { init: jest.fn() },
        ui: { init: jest.fn() },
        client: { setIsLoggingIn: jest.fn() },
    })),
}));

// `Services` is an aliased barrel; reference the mock via requireMock so this stays
// resolvable under both jest and tsc (tsc's core paths only map `Services/*`).
const mockCheckWhoAmI = jest.requireMock('Services').checkWhoAmI as jest.Mock;
const mockGetAccountId = getAccountId as jest.Mock;
const mockRemoveCookies = removeCookies as jest.Mock;
const mockClearAccountId = jest.requireMock('@deriv/shared').clearAccountId as jest.Mock;
const RootStoreMock = jest.requireMock('Stores').default as jest.Mock;

// initStore creates the RootStore once per call; grab the client from the latest instance.
const latestClient = () => RootStoreMock.mock.results[RootStoreMock.mock.results.length - 1]?.value?.client;

describe('initStore - stale session cleanup', () => {
    // initStore reads window.location.search; provide a stable, param-free location.
    const mockLocation = () => {
        delete (window as any).location;
        (window as any).location = { search: '', href: 'https://dtrader.deriv.com', pathname: '/' };
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // clearAllMocks keeps implementations, so reset the per-test ones explicitly.
        mockGetAccountId.mockReset();
        mockClearAccountId.mockReset();
        mockCheckWhoAmI.mockReset();
        mockLocation();
    });

    it('clears the stale session (cookie + account_id) on a 401 and does not enter logging-in', async () => {
        // Model the real clearAccountId → getAccountId contract: once cleared, account_id is gone.
        let session_cleared = false;
        mockGetAccountId.mockImplementation(() => (session_cleared ? null : 'ROT90070611'));
        mockClearAccountId.mockImplementation(() => {
            session_cleared = true;
        });
        mockCheckWhoAmI.mockResolvedValue({ error: { code: 401 } });

        await initStore({});

        expect(mockCheckWhoAmI).toHaveBeenCalled();
        expect(mockClearAccountId).toHaveBeenCalled();
        expect(mockRemoveCookies).toHaveBeenCalledWith('client_information', 'region');
        // Session was invalidated — the client must NOT be flagged as logging in.
        expect(latestClient().setIsLoggingIn).not.toHaveBeenCalled();
    });

    it('keeps the cookie and enters logging-in when whoami succeeds', async () => {
        mockGetAccountId.mockReturnValue('ROT90070611');
        mockCheckWhoAmI.mockResolvedValue({ success: true, data: { identity: { external_id: 'abc' } } });

        await initStore({});

        expect(mockCheckWhoAmI).toHaveBeenCalled();
        expect(mockClearAccountId).not.toHaveBeenCalled();
        expect(mockRemoveCookies).not.toHaveBeenCalled();
        expect(latestClient().setIsLoggingIn).toHaveBeenCalledWith(true);
    });

    it('skips whoami, cookie cleanup, and logging-in when there is no account_id (public load)', async () => {
        mockGetAccountId.mockReturnValue(null);

        await initStore({});

        expect(mockCheckWhoAmI).not.toHaveBeenCalled();
        expect(mockRemoveCookies).not.toHaveBeenCalled();
        expect(latestClient().setIsLoggingIn).not.toHaveBeenCalled();
    });
});
