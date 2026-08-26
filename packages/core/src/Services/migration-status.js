import { getApiCoreBaseUrl } from '@deriv/shared';

/**
 * Fetch client migration status via REST API.
 * Identifies the client by `client_id` (preferred) or `connection_provider_id`
 * (binary_user_id). Response shape:
 *   { data: { client_id, metadata: { status }, connection_provider_id, created_at, updated_at } }
 * where `status` is one of 'fully_migrated' | 'p2p_migrated' | 'started'.
 *
 * @param {{ client_id?: string, connection_provider_id?: string }} body
 * @returns Promise with migration status data or { error }
 */
export const fetchMigrationStatus = async body => {
    try {
        const response = await fetch(`${getApiCoreBaseUrl()}/v1/identity/migration-status`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            return { error: { code: response.status, status: response.statusText } };
        }

        const result = await response.json();
        return result;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[MigrationStatus Error]', error);
        return { error: { message: error.message } };
    }
};
