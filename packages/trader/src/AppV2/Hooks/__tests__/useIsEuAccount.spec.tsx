import { useDerivativesAccount } from '@deriv/api';
import { useStore } from '@deriv/stores';
import { renderHook } from '@testing-library/react-hooks';

import useIsEuAccount, { EU_ACCOUNT_GROUPS } from '../useIsEuAccount';

jest.mock('@deriv/stores', () => ({
    useStore: jest.fn(),
}));

jest.mock('@deriv/api', () => ({
    useDerivativesAccount: jest.fn(),
}));

const mockUseStore = useStore as jest.Mock;
const mockUseDerivativesAccount = useDerivativesAccount as jest.Mock;

const DEFAULT_LOGINID = 'DOT90819180';
const EU_GROUP = EU_ACCOUNT_GROUPS[0] ?? 'DIEL Default Group';

const mockClient = (overrides: Partial<{ is_logged_in: boolean; loginid: string }> = {}) => {
    mockUseStore.mockReturnValue({
        client: { is_logged_in: true, loginid: DEFAULT_LOGINID, ...overrides },
    });
};

const mockAccounts = (
    accounts: Array<{ account_id: string; group: string }> | undefined,
    { isError = false }: { isError?: boolean } = {}
) => {
    mockUseDerivativesAccount.mockReturnValue({
        data: accounts ? { data: accounts } : undefined,
        isError,
    });
};

describe('useIsEuAccount', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockClient();
        mockAccounts(undefined);
    });

    it('returns is_eu=false and is_ready=true when the user is not logged in', () => {
        mockClient({ is_logged_in: false });
        const { result } = renderHook(() => useIsEuAccount());
        expect(result.current).toEqual({ is_eu: false, is_ready: true });
    });

    it('returns is_eu=false and is_ready=true when loginid is missing', () => {
        mockClient({ loginid: '' });
        const { result } = renderHook(() => useIsEuAccount());
        expect(result.current).toEqual({ is_eu: false, is_ready: true });
    });

    it('returns is_ready=false while account data is still loading', () => {
        mockAccounts(undefined);
        const { result } = renderHook(() => useIsEuAccount());
        expect(result.current).toEqual({ is_eu: false, is_ready: false });
    });

    it('fails open with is_ready=true and is_eu=false when the account API errors', () => {
        // data is undefined in both the loading and the error state; without
        // honouring isError the hook would permanently report is_ready=false
        // and silently suppress any UI gated on it.
        mockAccounts(undefined, { isError: true });
        const { result } = renderHook(() => useIsEuAccount());
        expect(result.current).toEqual({ is_eu: false, is_ready: true });
    });

    it('returns is_eu=false when the current account is not present in the response', () => {
        mockAccounts([{ account_id: 'SOMEONE_ELSE', group: EU_GROUP }]);
        const { result } = renderHook(() => useIsEuAccount());
        expect(result.current).toEqual({ is_eu: false, is_ready: true });
    });

    it('returns is_eu=false when the current account has no group field', () => {
        mockAccounts([{ account_id: DEFAULT_LOGINID, group: '' }]);
        const { result } = renderHook(() => useIsEuAccount());
        expect(result.current).toEqual({ is_eu: false, is_ready: true });
    });

    it('returns is_eu=false when the group is not an EU group', () => {
        mockAccounts([{ account_id: DEFAULT_LOGINID, group: 'Some Other Group' }]);
        const { result } = renderHook(() => useIsEuAccount());
        expect(result.current).toEqual({ is_eu: false, is_ready: true });
    });

    it('returns is_eu=true when the current account group is an EU group', () => {
        mockAccounts([{ account_id: DEFAULT_LOGINID, group: EU_GROUP }]);
        const { result } = renderHook(() => useIsEuAccount());
        expect(result.current).toEqual({ is_eu: true, is_ready: true });
    });

    it('selects the current account by loginid when multiple accounts are present', () => {
        mockAccounts([
            { account_id: 'OTHER_1', group: 'Some Other Group' },
            { account_id: DEFAULT_LOGINID, group: EU_GROUP },
            { account_id: 'OTHER_2', group: 'Another Group' },
        ]);
        const { result } = renderHook(() => useIsEuAccount());
        expect(result.current).toEqual({ is_eu: true, is_ready: true });
    });
});
