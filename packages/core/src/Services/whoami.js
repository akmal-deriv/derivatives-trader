import { getWhoAmIURL } from '@deriv/shared';

/**
 * Check session validity via REST API whoami endpoint
 * @returns Promise with response data: { success: true } or { error: { code: 401, status: 'Unauthorized' } }
 */
export const checkWhoAmI = async () => {
    try {
        const whoamiUrl = getWhoAmIURL();

        const response = await fetch(whoamiUrl, {
            method: 'GET',
            credentials: 'include',
        });

        const data = await response.json();

        // Check for 401 Unauthorized error in response body
        if (data.error && (data.error.code === 401 || data.error.status === 'Unauthorized')) {
            return { error: { code: 401, status: 'Unauthorized' } };
        }

        // Return success response
        return { success: true, data };
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[WhoAmI Error]', error);
        // Return error but don't trigger cleanup for network errors
        return { error: { message: error.message } };
    }
};
