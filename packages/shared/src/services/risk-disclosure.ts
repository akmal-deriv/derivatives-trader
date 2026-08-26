import { getApiCoreBaseUrl } from '../utils/brand';

export type TRiskDisclosureField = {
    value: boolean | null;
    created_at: string | null;
    updated_at: string | null;
    assigned_by: string | null;
};

export type TProfileIdentity = {
    residence?: string;
    citizenship?: string;
    country_of_birth?: string;
};

export type TProfileIdentityResponse = {
    meta?: {
        endpoint?: string;
        verb?: string;
        timing?: number;
    };
    data?: TProfileIdentity;
};

export type TRiskDisclosureResponse = {
    spain_risk_disclosure_accepted: TRiskDisclosureField;
    additional_spain_risk_disclosure_accepted: TRiskDisclosureField;
};

export type TRiskDisclosurePostBody = {
    spain_risk_disclosure?: true;
    additional_spain_risk_disclosure_accepted?: true;
};

export type TRiskDisclosureError = {
    error: { code?: string; status?: number; field?: string; message?: string };
};

const PROFILE_IDENTITY_PATH = '/kyc-pii/v1/pii/identity';
const RISK_DISCLOSURE_PATH = '/v1/client/risk-disclosure';

type TErrorEnvelope = { errors?: Array<{ status?: number; code?: string; field?: string; message?: string }> };

const buildError = (status: number, statusText: string, body: unknown): TRiskDisclosureError => {
    const first = (body as TErrorEnvelope)?.errors?.[0];
    return {
        error: {
            code: first?.code,
            status: first?.status ?? status,
            field: first?.field,
            message: first?.message ?? statusText,
        },
    };
};

/**
 * Fetch the client's profile identity (residence / country_code) via REST API.
 */
export const fetchProfileIdentity = async (): Promise<TProfileIdentityResponse | TRiskDisclosureError> => {
    try {
        const response = await fetch(`${getApiCoreBaseUrl()}${PROFILE_IDENTITY_PATH}`, {
            method: 'GET',
            credentials: 'include',
        });

        const result = await response.json();

        if (!response.ok) {
            return buildError(response.status, response.statusText, result);
        }

        return result as TProfileIdentityResponse;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[ProfileIdentity Error]', error);
        return { error: { message: (error as Error).message } };
    }
};

/**
 * Fetch the client's current risk-disclosure acceptance state.
 * Each field is shaped as { value, created_at, updated_at, assigned_by }.
 * `value === true` means the user has accepted; `null` / `false` means not accepted.
 */
export const fetchRiskDisclosure = async (): Promise<TRiskDisclosureResponse | TRiskDisclosureError> => {
    try {
        const response = await fetch(`${getApiCoreBaseUrl()}${RISK_DISCLOSURE_PATH}`, {
            method: 'GET',
            credentials: 'include',
        });

        const result = await response.json();

        if (!response.ok) {
            return buildError(response.status, response.statusText, result);
        }

        return result as TRiskDisclosureResponse;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[RiskDisclosure Error]', error);
        return { error: { message: (error as Error).message } };
    }
};

/**
 * Persist acceptance of the risk-disclosure fields. Returns `{}` on success
 * (the endpoint replies 204 No Content).
 *
 * Only the fields that were false / null should be sent (each set to `true`).
 */
export const postRiskDisclosure = async (
    body: TRiskDisclosurePostBody
): Promise<Record<string, never> | TRiskDisclosureError> => {
    try {
        const response = await fetch(`${getApiCoreBaseUrl()}${RISK_DISCLOSURE_PATH}`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (response.ok) return {};

        // Error responses come with a JSON body; success is 204 No Content.
        const result = await response.json();
        return buildError(response.status, response.statusText, result);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[RiskDisclosure Post Error]', error);
        return { error: { message: (error as Error).message } };
    }
};

export const isRiskFieldAccepted = (field: TRiskDisclosureField | undefined): boolean => field?.value === true;

export const isRiskDisclosureError = <T extends object>(
    response: T | TRiskDisclosureError
): response is TRiskDisclosureError => 'error' in response && Boolean((response as TRiskDisclosureError).error);
