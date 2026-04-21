import { getApiCoreBaseUrl } from '@deriv/shared';

/**
 * Fetch onboarding status via REST API
 * @returns Promise with onboarding status data
 */
export const fetchOnboardingStatus = async () => {
    try {
        const response = await fetch(`${getApiCoreBaseUrl()}/v1/client/onboarding-status`, {
            method: 'GET',
            credentials: 'include',
        });

        if (!response.ok) {
            return { error: { code: response.status, status: response.statusText } };
        }

        const result = await response.json();
        return result;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[OnboardingStatus Error]', error);
        return { error: { message: error.message } };
    }
};
