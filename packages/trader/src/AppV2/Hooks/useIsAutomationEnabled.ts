import { useMemo } from 'react';

import { useDerivativesAccount } from '@deriv/api';
import { getIsAutomationEnabled } from '@deriv/shared';
import { useStore } from '@deriv/stores';

// EU (DIEL) account groups for which automation is hidden. Mirrors
// `RESTRICTED_TRADE_TYPE_GROUPS`; the backend remains the source of truth.
export const AUTOMATION_RESTRICTED_GROUPS: string[] = ['DIEL Default Group'];

/**
 * Whether the automation feature is available to the user: enabled for their
 * country (the `?automation` flag) AND not a restricted EU (DIEL) account.
 * Fail-open on the group check — treated as allowed until the account group is
 * known (matches `useIsTradeTypeSelectionRestricted`).
 */
const useIsAutomationEnabled = (): boolean => {
    const { client } = useStore();
    const { is_logged_in, loginid } = client;
    const { data } = useDerivativesAccount(loginid, is_logged_in);

    return useMemo(() => {
        if (!getIsAutomationEnabled()) return false;
        if (!is_logged_in || !loginid) return true;
        const group = data?.data?.find(account => account.account_id === loginid)?.group;
        return !group || !AUTOMATION_RESTRICTED_GROUPS.includes(group);
    }, [data, is_logged_in, loginid]);
};

export default useIsAutomationEnabled;
