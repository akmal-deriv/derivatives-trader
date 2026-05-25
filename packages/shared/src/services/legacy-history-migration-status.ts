import { getApiCoreBaseUrl } from '../utils/brand';

export type TLegacyHistoryMigrationStatus = 'complete' | 'pending' | 'failed';

export type TLegacyHistoryMigrationStatusResponse = {
    status: TLegacyHistoryMigrationStatus;
};

export type TLegacyHistoryMigrationStatusError = {
    error: { code?: number; status?: string; message?: string };
};

/**
 * Fetch v1 legacy-history migration status via REST API.
 * Returns { status: 'complete' | 'pending' | 'failed' } or { error }.
 * Status === 'complete' means the user has historical v1 data and the
 * Archived Statement feature should be visible.
 */
export const fetchLegacyHistoryMigrationStatus = async (): Promise<
    TLegacyHistoryMigrationStatusResponse | TLegacyHistoryMigrationStatusError
> => {
    try {
        const response = await fetch(`${getApiCoreBaseUrl()}/options/v1/legacy-history/migration-status`, {
            method: 'GET',
            credentials: 'include',
        });

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
        console.error('[LegacyHistoryMigrationStatus Error]', error);
        return { error: { message: (error as Error).message } };
    }
};
