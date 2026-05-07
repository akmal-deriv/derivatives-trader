import { getApiCoreBaseUrl } from '../utils/brand';

export type TMigrationStatus = 'complete' | 'pending' | 'failed';

export type TMigrationStatusResponse = {
    status: TMigrationStatus;
};

export type TMigrationStatusError = {
    error: { code?: number; status?: string; message?: string };
};

/**
 * Fetch v1 migration status via REST API.
 * Returns { status: 'complete' | 'pending' | 'failed' } or { error }.
 * Status === 'complete' means the user has historical v1 data and the
 * Archived Statement feature should be visible.
 */
export const fetchMigrationStatus = async (): Promise<TMigrationStatusResponse | TMigrationStatusError> => {
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
        console.error('[MigrationStatus Error]', error);
        return { error: { message: (error as Error).message } };
    }
};
