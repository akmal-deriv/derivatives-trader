import { useDerivativesAccount } from '@deriv/api';
import { useStore } from '@deriv/stores';
import { renderHook } from '@testing-library/react-hooks';

import useIsTradeTypeSelectionRestricted, { RESTRICTED_TRADE_TYPE_GROUPS } from '../useIsTradeTypeSelectionRestricted';

jest.mock('@deriv/stores', () => ({
    useStore: jest.fn(),
}));

jest.mock('@deriv/api', () => ({
    useDerivativesAccount: jest.fn(),
}));

const mockUseStore = useStore as jest.Mock;
const mockUseDerivativesAccount = useDerivativesAccount as jest.Mock;

const DEFAULT_LOGINID = 'DOT90819180';
const RESTRICTED_GROUP = RESTRICTED_TRADE_TYPE_GROUPS[0] ?? 'DIEL Default Group';

const mockClient = (overrides: Partial<{ is_logged_in: boolean; loginid: string }> = {}) => {
    mockUseStore.mockReturnValue({
        client: { is_logged_in: true, loginid: DEFAULT_LOGINID, ...overrides },
    });
};

const mockAccounts = (accounts: Array<{ account_id: string; group: string }> | undefined) => {
    mockUseDerivativesAccount.mockReturnValue({ data: accounts ? { data: accounts } : undefined });
};

describe('useIsTradeTypeSelectionRestricted', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockClient();
        mockAccounts(undefined);
    });

    it('returns false when the user is not logged in', () => {
        mockClient({ is_logged_in: false });
        const { result } = renderHook(() => useIsTradeTypeSelectionRestricted());
        expect(result.current).toBe(false);
    });

    it('returns false when loginid is missing', () => {
        mockClient({ loginid: '' });
        const { result } = renderHook(() => useIsTradeTypeSelectionRestricted());
        expect(result.current).toBe(false);
    });

    it('returns false while account data is still loading', () => {
        mockAccounts(undefined);
        const { result } = renderHook(() => useIsTradeTypeSelectionRestricted());
        expect(result.current).toBe(false);
    });

    it('returns false when the current account is not present in the response', () => {
        mockAccounts([{ account_id: 'SOMEONE_ELSE', group: RESTRICTED_GROUP }]);
        const { result } = renderHook(() => useIsTradeTypeSelectionRestricted());
        expect(result.current).toBe(false);
    });

    it('returns false when the current account has no group field', () => {
        mockAccounts([{ account_id: DEFAULT_LOGINID, group: '' }]);
        const { result } = renderHook(() => useIsTradeTypeSelectionRestricted());
        expect(result.current).toBe(false);
    });

    it('returns false when the group is not in the restricted list', () => {
        mockAccounts([{ account_id: DEFAULT_LOGINID, group: 'Some Unrestricted Group' }]);
        const { result } = renderHook(() => useIsTradeTypeSelectionRestricted());
        expect(result.current).toBe(false);
    });

    it('returns true when the current account group is in the restricted list', () => {
        mockAccounts([{ account_id: DEFAULT_LOGINID, group: RESTRICTED_GROUP }]);
        const { result } = renderHook(() => useIsTradeTypeSelectionRestricted());
        expect(result.current).toBe(true);
    });

    it('selects the current account by loginid even when other accounts have different groups', () => {
        mockAccounts([
            { account_id: 'OTHER_1', group: 'Some Unrestricted Group' },
            { account_id: DEFAULT_LOGINID, group: RESTRICTED_GROUP },
            { account_id: 'OTHER_2', group: 'Another Group' },
        ]);
        const { result } = renderHook(() => useIsTradeTypeSelectionRestricted());
        expect(result.current).toBe(true);
    });
});
