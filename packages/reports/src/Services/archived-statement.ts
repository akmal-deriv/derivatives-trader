import { getApiCoreBaseUrl } from '@deriv/shared';

export type TTransactionItem = {
    transaction_id: number;
    account_id: number;
    loginid: string;
    action_type: string;
    amount: string | null;
    balance_after: string | null;
    transaction_time: number | null;
    contract_id: number | null;
    currency: string | null;
    shortcode: string | null;
    bet_class: string | null;
    bet_type: string | null;
    symbol: string | null;
    app_id: number | null;
};

export type TStatementResponse = {
    transactions: TTransactionItem[];
};

export type TAccountItem = {
    account_id: number;
    currency: string;
};

export type TAccountsResponse = {
    loginids: Record<string, TAccountItem[]>;
};

type TFetchParams = {
    date_from?: number | null;
    date_to?: number | null;
    action_type?: string;
    loginid?: string;
    limit?: number;
    offset?: number;
};

type TArchivedStatementError = {
    error: { code?: number; status?: string; message?: string };
};

const requestJson = async <T>(url: string, errorPrefix: string): Promise<T | TArchivedStatementError> => {
    try {
        const response = await fetch(url, { method: 'GET', credentials: 'include' });
        const result = await response.json();

        if (!response.ok) {
            return {
                error: {
                    code: response.status,
                    status: result.error || response.statusText,
                    message: result.message || response.statusText,
                },
            };
        }

        return result;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error(errorPrefix, error);
        return { error: { message: (error as Error).message } };
    }
};

/**
 * Fetch v1 accounts grouped by loginid via REST API
 */
export const fetchArchivedStatementAccounts = (): Promise<TAccountsResponse | TArchivedStatementError> =>
    requestJson<TAccountsResponse>(
        `${getApiCoreBaseUrl()}/options/v1/legacy-history/accounts`,
        '[ArchivedStatement Accounts Error]'
    );

/**
 * Fetch archived v1 statement history via REST API
 * @param params - Query parameters for filtering and pagination
 */
export const fetchArchivedStatement = (
    params: TFetchParams = {}
): Promise<TStatementResponse | TArchivedStatementError> => {
    const searchParams = new URLSearchParams();
    if (params.date_from) searchParams.append('date_from', String(params.date_from));
    if (params.date_to) searchParams.append('date_to', String(params.date_to));
    if (params.action_type) searchParams.append('action_type', params.action_type);
    if (params.loginid) searchParams.append('loginid', params.loginid);
    if (params.limit) searchParams.append('limit', String(params.limit));
    if (params.offset != null) searchParams.append('offset', String(params.offset));
    const queryString = searchParams.toString();
    const url = `${getApiCoreBaseUrl()}/options/v1/legacy-history/statement${queryString ? `?${queryString}` : ''}`;

    return requestJson<TStatementResponse>(url, '[ArchivedStatement Error]');
};
