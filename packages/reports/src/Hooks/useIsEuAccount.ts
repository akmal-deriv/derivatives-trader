import { useStore } from '@deriv/stores';

// Account groups identifying EU (DIEL) clients. EU detection in derivatives-trader is group-based:
// `client.is_eu` (landing_company === 'maltainvest') is NOT reliably populated for these accounts —
// the account `group` is the source of truth.
export const EU_ACCOUNT_GROUPS: string[] = ['DIEL Default Group'];

type TDerivativesAccount = { account_id?: string; group?: string };

type TUseIsEuAccount = {
    is_eu: boolean;
    is_ready: boolean;
};

// Reports is bundled separately and does NOT share @deriv/api's React context, so calling the
// @deriv/api hooks here (useDerivativesAccount → useRestAPI) throws "must be used within APIProvider".
// The derivatives-accounts response is, however, available in the cross-bundle React Query cache
// (window.ReactQueryClient) — core seeds it at bootstrap and the header keeps it fresh on account
// switch. We read the group from there directly. Fail-open: if the cache is unavailable we report
// non-EU so the full (non-EU) UI renders rather than crashing or hiding controls.
const getCachedDerivativesAccounts = (loginid: string): TDerivativesAccount[] | undefined => {
    const query_client = (
        window as unknown as {
            ReactQueryClient?: { getQueryData: (key: unknown[]) => { data?: TDerivativesAccount[] } | undefined };
        }
    ).ReactQueryClient;
    return query_client?.getQueryData(['derivatives', 'account', loginid])?.data;
};

const useIsEuAccount = (): TUseIsEuAccount => {
    const { client } = useStore();
    const { is_logged_in, loginid } = client;

    if (!is_logged_in || !loginid) return { is_eu: false, is_ready: true };

    const group = getCachedDerivativesAccounts(loginid)?.find(account => account.account_id === loginid)?.group;

    return { is_eu: !!group && EU_ACCOUNT_GROUPS.includes(group), is_ready: true };
};

export default useIsEuAccount;
