import { useMemo } from 'react';

import { useDerivativesAccount } from '@deriv/api';
import { useStore } from '@deriv/stores';

// Account groups identifying EU (DIEL) clients. Centralised here so any feature
// needing EU-vs-non-EU branching shares a single source of truth.
export const EU_ACCOUNT_GROUPS: string[] = ['DIEL Default Group'];

type TUseIsEuAccount = {
    is_eu: boolean;
    // True once we know enough to render an EU-aware UI: either the user is
    // logged out (so EU branching is irrelevant) or the account API has
    // returned data. Consumers should gate variant-specific UI on this so EU
    // users never see the non-EU variant flash first.
    is_ready: boolean;
};

const useIsEuAccount = (): TUseIsEuAccount => {
    const { client } = useStore();
    const { is_logged_in, loginid } = client;
    const { data, isError } = useDerivativesAccount(loginid, is_logged_in);

    return useMemo(() => {
        if (!is_logged_in || !loginid) return { is_eu: false, is_ready: true };
        if (isError) return { is_eu: false, is_ready: true };
        if (!data) return { is_eu: false, is_ready: false };

        const current_account = data.data?.find(account => account.account_id === loginid);
        const group = current_account?.group;
        return {
            is_eu: !!group && EU_ACCOUNT_GROUPS.includes(group),
            is_ready: true,
        };
    }, [data, isError, is_logged_in, loginid]);
};

export default useIsEuAccount;
