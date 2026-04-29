import { useMemo } from 'react';

import { useDerivativesAccount } from '@deriv/api';
import { useStore } from '@deriv/stores';

// Account groups whose clients are limited to a single trade type. The trade
// type selector (grid button, "View all") is hidden for these groups; the
// selected chip is still shown as a read-only indicator.
export const RESTRICTED_TRADE_TYPE_GROUPS: string[] = ['DIEL Default Group'];

const useIsTradeTypeSelectionRestricted = (): boolean => {
    const { client } = useStore();
    const { is_logged_in, loginid } = client;
    const { data } = useDerivativesAccount(loginid, is_logged_in);

    // Fail-open: if the account group cannot be determined (still loading, API error,
    // or missing `group` field) we return false so the full UI renders. The restriction
    // is a UX affordance, not a security control — the backend is the source of truth
    // for which trade types a client can actually buy.
    return useMemo(() => {
        if (!is_logged_in || !loginid) return false;
        const current_account = data?.data?.find(account => account.account_id === loginid);
        if (!current_account?.group) return false;
        return RESTRICTED_TRADE_TYPE_GROUPS.includes(current_account.group);
    }, [data, is_logged_in, loginid]);
};

export default useIsTradeTypeSelectionRestricted;
