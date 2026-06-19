import { useStore } from '@deriv/stores';
import { renderHook } from '@testing-library/react-hooks';

import useIsEuAccount, { EU_ACCOUNT_GROUPS } from '../useIsEuAccount';

jest.mock('@deriv/stores', () => ({
    useStore: jest.fn(),
}));

const mockUseStore = useStore as jest.Mock;

const DEFAULT_LOGINID = 'DOT90819180';
const EU_GROUP = EU_ACCOUNT_GROUPS[0] ?? 'DIEL Default Group';

const mockClient = (overrides: Partial<{ is_logged_in: boolean; loginid: string }> = {}) => {
    mockUseStore.mockReturnValue({
        client: { is_logged_in: true, loginid: DEFAULT_LOGINID, ...overrides },
    });
};

const setAccountsCache = (accounts: Array<{ account_id: string; group: string }> | undefined) => {
    (window as unknown as { ReactQueryClient?: unknown }).ReactQueryClient = {
        getQueryData: jest.fn(() => (accounts ? { data: accounts } : undefined)),
    };
};

describe('useIsEuAccount (reports)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockClient();
        setAccountsCache(undefined);
    });

    afterEach(() => {
        delete (window as unknown as { ReactQueryClient?: unknown }).ReactQueryClient;
    });

    it('returns is_eu=false and is_ready=true when the user is not logged in', () => {
        mockClient({ is_logged_in: false });
        const { result } = renderHook(() => useIsEuAccount());
        expect(result.current).toEqual({ is_eu: false, is_ready: true });
    });

    it('fails open (is_eu=false) when the accounts cache is unavailable', () => {
        setAccountsCache(undefined);
        const { result } = renderHook(() => useIsEuAccount());
        expect(result.current).toEqual({ is_eu: false, is_ready: true });
    });

    it('returns is_eu=false when the current account group is not an EU group', () => {
        setAccountsCache([{ account_id: DEFAULT_LOGINID, group: 'Some Other Group' }]);
        const { result } = renderHook(() => useIsEuAccount());
        expect(result.current).toEqual({ is_eu: false, is_ready: true });
    });

    it('returns is_eu=true when the current account group is an EU group', () => {
        setAccountsCache([{ account_id: DEFAULT_LOGINID, group: EU_GROUP }]);
        const { result } = renderHook(() => useIsEuAccount());
        expect(result.current).toEqual({ is_eu: true, is_ready: true });
    });

    it('selects the current account by loginid when multiple accounts are present', () => {
        setAccountsCache([
            { account_id: 'OTHER_1', group: 'Some Other Group' },
            { account_id: DEFAULT_LOGINID, group: EU_GROUP },
        ]);
        const { result } = renderHook(() => useIsEuAccount());
        expect(result.current).toEqual({ is_eu: true, is_ready: true });
    });
});
