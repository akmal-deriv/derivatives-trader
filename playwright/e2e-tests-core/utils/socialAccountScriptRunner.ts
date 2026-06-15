/**
 * Social Account Script Runner Utilities
 *
 * This module provides TypeScript wrappers for the Social Account API, which manages
 * social (OAuth) user accounts on the Deriv identity service.
 *
 * The API performs two sequential steps for every operation:
 *   1. Set the QA endpoint (e.g. qa10) so the identity service targets the correct QA box
 *   2. Execute the requested operation (add / remove / check) for the given email
 *
 * ⚠️ STAGING ONLY — never use these utilities in production tests.
 *
 * Supported operations:
 * - `addSocialAccount()`    — create a social account linked to an email address
 * - `removeSocialAccount()` — remove a social account by email
 * - `checkSocialAccount()`  — check whether a social account exists for an email
 *
 * @example
 * ```typescript
 * import { addSocialAccount, removeSocialAccount, checkSocialAccount } from '../utils';
 * ```
 */

import { APIRequestContext } from '@playwright/test';

/** Base URL for the Social Account identity service */
const SOCIAL_API_BASE_URL = 'https://identity-staging-ecj697.buildship.run/qa/lookup-config';

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valid brand codes accepted by the social account API
 */
export type SocialBrandCode = 'legacy' | 'deriv';

/**
 * Valid operations for the social account API
 */
export type SocialOperation = 'add' | 'remove' | 'check';

/**
 * Result returned from any social account operation
 */
export interface SocialAccountResult {
    /** Whether the operation completed successfully */
    success: boolean;
    /** The operation that was performed */
    operation: SocialOperation;
    /** The email address the operation was performed on */
    email: string;
    /** The QA endpoint that was targeted (e.g. 'qa10') */
    qaEndpoint: string;
    /** Raw response body from the operation step */
    response: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// addSocialAccount — types & function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Options for adding a social account
 */
export interface AddSocialAccountOptions {
    /**
     * Brand code for the account.
     * Defaults to 'deriv' if not provided.
     */
    brandCode?: SocialBrandCode;

    /**
     * Password for the social account.
     * Must not contain special characters (Ory Mock IDP restriction).
     * If not provided, falls back to `SOCIAL_PASSWORD` from `.env`.
     * Throws if neither is set.
     */
    password?: string;

    /**
     * Enable debug mode for detailed logging.
     */
    debug?: boolean;
}

/**
 * Creates a social account on the Deriv identity service for the given QA endpoint.
 *
 * This function performs two sequential API calls:
 *   1. Sets the QA endpoint (e.g. qa10) on the identity service
 *   2. Adds the social account with the provided email, brand code, and password
 *
 * ⚠️ STAGING ONLY — never use in production tests.
 *
 * @param request - Playwright APIRequestContext for making HTTP requests
 * @param qaEndpoint - QA box identifier (e.g. 'qa10', 'qa137')
 * @param email - Email address for the social account
 * @param options - Optional configuration (brandCode, password, debug)
 * @returns Promise with the result of the add operation
 *
 * @example
 * // Add a social account with defaults (brand: deriv, password from SOCIAL_PASSWORD in .env)
 * const result = await addSocialAccount(request, 'qa10', 'test@gmail.com');
 *
 * @example
 * // Add a social account with explicit brand and password
 * const result = await addSocialAccount(request, 'qa10', 'test@gmail.com', {
 *   brandCode: 'deriv',
 *   password: 'Abcd1234'
 * });
 */
export async function addSocialAccount(
    request: APIRequestContext,
    qaEndpoint: string,
    email: string,
    options: AddSocialAccountOptions = {}
): Promise<SocialAccountResult> {
    const validationErrors: string[] = [];

    if (!qaEndpoint || qaEndpoint.trim() === '') {
        validationErrors.push('🔴 qaEndpoint is required (e.g. "qa10")');
    }

    if (!email || email.trim() === '') {
        validationErrors.push('🔴 email is required');
    } else if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email)) {
        validationErrors.push(`🔴 Invalid email format: ${email}`);
    }

    // SOCIAL_PASSWORD must not contain special characters (Ory Mock IDP restriction).
    // We deliberately do NOT fall back to TEST_PASSWORD because TEST_PASSWORD typically
    // contains special characters that would cause the Mock Social Login to reject the password.
    const finalPassword = options.password ?? process.env.SOCIAL_PASSWORD;
    if (!finalPassword) {
        validationErrors.push(
            '🔴 Password not provided and SOCIAL_PASSWORD not set in .env file. ' +
                'Set SOCIAL_PASSWORD to a value without special characters (Ory Mock IDP restriction). ' +
                'Do NOT use TEST_PASSWORD as a fallback — it may contain special characters.'
        );
    }

    const brandCode: SocialBrandCode = options.brandCode ?? 'deriv';
    const validBrandCodes: SocialBrandCode[] = ['legacy', 'deriv'];
    if (!validBrandCodes.includes(brandCode)) {
        validationErrors.push(`🔴 Invalid brandCode: ${brandCode}. Must be one of: ${validBrandCodes.join(', ')}`);
    }

    if (validationErrors.length > 0) {
        throw new Error(`addSocialAccount validation failed:\n${validationErrors.join('\n')}`);
    }

    if (options.debug) {
        console.log(`🔍 [addSocialAccount] qaEndpoint=${qaEndpoint}, email=${email}, brandCode=${brandCode}`);
    }

    // Step 1: Set QA endpoint
    await setQaEndpoint(request, qaEndpoint, options.debug);

    // Step 2: Add the social account
    const operationPayload = {
        operation: 'add',
        email,
        email_verified: true,
        brand_code: brandCode,
        password: finalPassword!,
    };

    const responseText = await executeSocialApiCall(
        request,
        operationPayload,
        `add social account for ${email}`,
        options.debug
    );

    console.log(`✅ Social account added successfully for ${email} on ${qaEndpoint}`);

    return {
        success: true,
        operation: 'add',
        email,
        qaEndpoint,
        response: responseText,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// removeSocialAccount — types & function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Options for removing a social account
 */
export interface RemoveSocialAccountOptions {
    /**
     * Enable debug mode for detailed logging.
     */
    debug?: boolean;
}

/**
 * Removes a social account from the Deriv identity service for the given QA endpoint.
 *
 * This function performs two sequential API calls:
 *   1. Sets the QA endpoint (e.g. qa10) on the identity service
 *   2. Removes the social account associated with the provided email
 *
 * ⚠️ STAGING ONLY — never use in production tests.
 *
 * @param request - Playwright APIRequestContext for making HTTP requests
 * @param qaEndpoint - QA box identifier (e.g. 'qa10', 'qa137')
 * @param email - Email address of the social account to remove
 * @param options - Optional configuration (debug)
 * @returns Promise with the result of the remove operation
 *
 * @example
 * const result = await removeSocialAccount(request, 'qa10', 'test@gmail.com');
 */
export async function removeSocialAccount(
    request: APIRequestContext,
    qaEndpoint: string,
    email: string,
    options: RemoveSocialAccountOptions = {}
): Promise<SocialAccountResult> {
    const validationErrors: string[] = [];

    if (!qaEndpoint || qaEndpoint.trim() === '') {
        validationErrors.push('🔴 qaEndpoint is required (e.g. "qa10")');
    }

    if (!email || email.trim() === '') {
        validationErrors.push('🔴 email is required');
    } else if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email)) {
        validationErrors.push(`🔴 Invalid email format: ${email}`);
    }

    if (validationErrors.length > 0) {
        throw new Error(`removeSocialAccount validation failed:\n${validationErrors.join('\n')}`);
    }

    if (options.debug) {
        console.log(`🔍 [removeSocialAccount] qaEndpoint=${qaEndpoint}, email=${email}`);
    }

    // Step 1: Set QA endpoint
    await setQaEndpoint(request, qaEndpoint, options.debug);

    // Step 2: Remove the social account
    const operationPayload = {
        operation: 'remove',
        email,
    };

    const responseText = await executeSocialApiCall(
        request,
        operationPayload,
        `remove social account for ${email}`,
        options.debug
    );

    console.log(`✅ Social account removed successfully for ${email} on ${qaEndpoint}`);

    return {
        success: true,
        operation: 'remove',
        email,
        qaEndpoint,
        response: responseText,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// checkSocialAccount — types & function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Options for checking a social account
 */
export interface CheckSocialAccountOptions {
    /**
     * Enable debug mode for detailed logging.
     */
    debug?: boolean;
}

/**
 * Result returned from a social account check operation
 */
export interface CheckSocialAccountResult extends SocialAccountResult {
    /** Whether the social account exists */
    exists: boolean;
}

/**
 * Checks whether a social account exists on the Deriv identity service for the given QA endpoint.
 *
 * This function performs two sequential API calls:
 *   1. Sets the QA endpoint (e.g. qa10) on the identity service
 *   2. Checks whether a social account exists for the provided email
 *
 * ⚠️ STAGING ONLY — never use in production tests.
 *
 * @param request - Playwright APIRequestContext for making HTTP requests
 * @param qaEndpoint - QA box identifier (e.g. 'qa10', 'qa137')
 * @param email - Email address to check
 * @param options - Optional configuration (debug)
 * @returns Promise with the result including an `exists` boolean
 *
 * @example
 * const result = await checkSocialAccount(request, 'qa10', 'test@gmail.com');
 * if (result.exists) {
 *   console.log('Social account exists');
 * }
 */
export async function checkSocialAccount(
    request: APIRequestContext,
    qaEndpoint: string,
    email: string,
    options: CheckSocialAccountOptions = {}
): Promise<CheckSocialAccountResult> {
    const validationErrors: string[] = [];

    if (!qaEndpoint || qaEndpoint.trim() === '') {
        validationErrors.push('🔴 qaEndpoint is required (e.g. "qa10")');
    }

    if (!email || email.trim() === '') {
        validationErrors.push('🔴 email is required');
    } else if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email)) {
        validationErrors.push(`🔴 Invalid email format: ${email}`);
    }

    if (validationErrors.length > 0) {
        throw new Error(`checkSocialAccount validation failed:\n${validationErrors.join('\n')}`);
    }

    if (options.debug) {
        console.log(`🔍 [checkSocialAccount] qaEndpoint=${qaEndpoint}, email=${email}`);
    }

    // Step 1: Set QA endpoint
    await setQaEndpoint(request, qaEndpoint, options.debug);

    // Step 2: Check the social account
    const operationPayload = {
        operation: 'check',
        email,
    };

    const responseText = await executeSocialApiCall(
        request,
        operationPayload,
        `check social account for ${email}`,
        options.debug
    );

    // Determine existence from the response body.
    // The API returns: { "is_success": true, "found": true|false, "identity": {...}|null }
    // We parse the JSON and check the "found" field directly.
    // Falls back to heuristic string checks if the response is not valid JSON.
    let exists = false;
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw API response shape is unknown at compile time
        const parsed = JSON.parse(responseText) as Record<string, any>;
        if (typeof parsed.found === 'boolean') {
            // Prefer the explicit "found" field returned by the check operation
            exists = parsed.found;
        } else if (parsed.is_success === true && parsed.identity !== null && parsed.identity !== undefined) {
            // Fallback: treat a non-null identity as existing
            exists = true;
        }
    } catch {
        // Response is not JSON — fall back to heuristic string checks
        const lowerResponse = responseText.toLowerCase();
        exists =
            !lowerResponse.includes('not found') &&
            !lowerResponse.includes('does not exist') &&
            !lowerResponse.includes('no user') &&
            responseText.trim() !== '' &&
            responseText.trim() !== '{}' &&
            responseText.trim() !== 'null';
    }

    console.log(`✅ Social account check completed for ${email} on ${qaEndpoint}: ${exists ? 'exists' : 'not found'}`);

    return {
        success: true,
        operation: 'check',
        email,
        qaEndpoint,
        exists,
        response: responseText,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sets the QA endpoint on the identity service so subsequent operations target the correct QA box.
 * This must be called before every operation — it is step 1 of the two-step flow.
 *
 * Corresponds to:
 * ```bash
 * curl --request POST 'https://identity-staging-ecj697.buildship.run/qa/lookup-config' \
 *   --header 'Content-Type: application/json' \
 *   --data-raw '{ "operation": "qa", "qa_endpoint": "qa10" }'
 * ```
 *
 * @param request - Playwright APIRequestContext
 * @param qaEndpoint - QA box identifier (e.g. 'qa10')
 * @param debug - Whether to log debug output
 */
async function setQaEndpoint(request: APIRequestContext, qaEndpoint: string, debug?: boolean): Promise<void> {
    const payload = {
        operation: 'qa',
        qa_endpoint: qaEndpoint,
    };

    if (debug) {
        console.log(`🔍 [setQaEndpoint] Setting QA endpoint to: ${qaEndpoint}`);
        console.log(`🔍 [setQaEndpoint] Payload: ${JSON.stringify(payload)}`);
    }

    const response = await request.post(SOCIAL_API_BASE_URL, {
        headers: {
            'Content-Type': 'application/json',
            Accept: '*/*',
            'User-Agent': 'Playwright/e2e-deriv-home',
            Connection: 'keep-alive',
        },
        data: payload,
        timeout: 30000,
    });

    if (!response.ok()) {
        const errorText = await response.text();
        throw new Error(`Failed to set QA endpoint to "${qaEndpoint}": HTTP ${response.status()} — ${errorText}`);
    }

    const responseText = await response.text();

    if (debug) {
        console.log(`🔍 [setQaEndpoint] Response (${response.status()}): ${responseText}`);
    }

    console.log(`📍 QA endpoint set to: ${qaEndpoint}`);
}

/**
 * Executes a social account operation (add / remove / check) against the identity service.
 * This is step 2 of the two-step flow — must be called after `setQaEndpoint`.
 *
 * @param request - Playwright APIRequestContext
 * @param payload - Request body for the operation
 * @param description - Human-readable description for logging
 * @param debug - Whether to log debug output
 * @returns Raw response body text
 */
async function executeSocialApiCall(
    request: APIRequestContext,
    payload: Record<string, unknown>,
    description: string,
    debug?: boolean
): Promise<string> {
    if (debug) {
        console.log(`🔍 [executeSocialApiCall] ${description}`);
        // Redact the password field before logging to prevent credential leaks in CI logs
        const safePayload = { ...payload, ...(payload['password'] !== undefined ? { password: '***' } : {}) };
        console.log(`🔍 [executeSocialApiCall] Payload: ${JSON.stringify(safePayload)}`);
    }

    const response = await request.post(SOCIAL_API_BASE_URL, {
        headers: {
            'Content-Type': 'application/json',
            Accept: '*/*',
            'User-Agent': 'Playwright/e2e-deriv-home',
            Connection: 'keep-alive',
        },
        data: payload,
        timeout: 30000,
    });

    const responseText = await response.text();

    if (debug) {
        console.log(`🔍 [executeSocialApiCall] Response (${response.status()}): ${responseText}`);
    }

    if (!response.ok()) {
        throw new Error(`Social API call failed (${description}): HTTP ${response.status()} — ${responseText}`);
    }

    return responseText;
}
