/**
 * Account Creation Runner
 *
 * Runs `v2_create_account.js` directly as a child process instead of going
 * through the QA Script Runner HTTP service. Use this as a drop-in replacement
 * for `createAccountV2()` when the remote service is unreachable or flaky.
 *
 * Supports both staging (default) and production environments. On production,
 * top-up, KYC helpers, and POI/POA automation are disabled by the underlying script.
 *
 * ⚠️ CWE-214: --password and --apikey are passed as CLI arguments to child scripts
 * and are visible in process listings (ps aux, /proc/<pid>/cmdline) for the lifetime
 * of the child process. This is an accepted risk because the child scripts cannot be
 * modified to accept credentials via stdin or environment variables.
 *
 * @example
 * ```typescript
 * import { createAccountV2viaJS } from '../utils';
 * ```
 */

/// <reference types="node" />
import { execFile } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';
import { DataFactory } from './dataFactory';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

// Internal types — not exported to avoid name collisions with qaScriptRunner.ts
type POIStatus = 'approved' | 'rejected';
type POAStatus = 'approved' | 'rejected';
type EmploymentStatus = 'full_time' | 'part_time' | 'self_employed' | 'unemployed' | 'retired' | 'student';
type MT5AccountType = 'standard' | 'financial' | 'swap-free' | 'zero-spread' | 'gold' | 'crypto';
type PartnerEntityType = 'retail' | 'corporate';
type PartnerType = 'individual' | 'company';

/**
 * Partners (affiliate) account configuration.
 *
 * Passing any `partner` value (`true` or an object) triggers the full Partners
 * onboarding flow via `--client_type affiliate`:
 *   1. PUT  /v1/client/attributes  — set client_type=affiliate + entity_type
 *   2. PUT  /v1/client/profile     — address details
 *   3. GET  /v1/client/kyc-status  — snapshot
 *   4. POST /v1/client/tnc         — accept Partners T&C
 *   5. POST /v1/partners/wallets   — create Partners wallet
 *
 * Defaults are tuned for the e2e-deriv-api suite, which only needs INDIVIDUAL
 * partner accounts. `company` and the related `companyName` / `companyRegistrationNumber`
 * fields are accepted but unused by our tests today — left in the API for callers
 * who need them.
 *
 * NOTE: when partner is enabled the underlying script SKIPS the regular real-account
 * wallet block — only the Partners wallet is created. This is the intended behaviour
 * for affiliate accounts. Use a non-partner account if your test needs a regular wallet.
 */
interface PartnerOptions {
    /** 'retail' (default) or 'corporate' */
    entityType?: PartnerEntityType;
    /** 'individual' (default) or 'company'. When 'company', also pass companyName + companyRegistrationNumber. */
    partnerType?: PartnerType;
    /** Wallet currency for the Partners wallet (default 'USD'). */
    partnerCurrency?: string;
    /** Partner website URL (default 'xyz.com'). */
    website?: string;
    /** Company name (default 'Deriv Limited') — only used when partnerType is 'company'. */
    companyName?: string;
    /** Company registration number (default '12345') — only used when partnerType is 'company'. */
    companyRegistrationNumber?: string;
    /** Affiliate provider/network name (default 'dynamicworks'). */
    provider?: string;
    /** Phone calling country code, digits only (default '60' for Malaysia). */
    callingCountryCode?: string;
}

interface KYCOptions {
    poi?: {
        status: POIStatus;
        /** Valid values: 'NAME_MISMATCH', 'EXPIRED', 'DOB_MISMATCH' */
        rejectionReasons?: string;
    };
    poa?: {
        status: POAStatus;
        /** Valid value: 'ADDRESS_MISMATCH' */
        rejectionReasons?: string;
    };
}

interface UserDetails {
    firstName?: string;
    lastName?: string;
    /** YYYY-MM-DD format */
    dateOfBirth?: string;
    phone?: string;
    address?: string;
    city?: string;
}

interface TaxInfo {
    id: string;
    residence: string;
}

/** Optional configuration for account creation. All fields are optional and only applicable to real accounts unless specified. */
export interface AccountCreationOptions {
    /** Email address. Must use @webapps.mailisk.net or @mobileapps.mailisk.net. Auto-generated if not provided. */
    email?: string;
    /** Password. Uses TEST_PASSWORD from .env if not provided. */
    password?: string;
    /** KYC configuration. Real accounts only. */
    kyc?: KYCOptions;
    /** User personal details. Real accounts only. Auto-generated if not provided. */
    userDetails?: UserDetails;
    /** Tax information (both id and residence required together). Real accounts only. */
    tax?: TaxInfo;
    /** Wallet currency or currencies (e.g., 'USD' or ['USD', 'BTC']). Real accounts only. */
    currency?: string | string[];
    /** Top up wallet with 2000 USD and transfer 1000 USD to Options trading account. Real accounts only. */
    trading?: boolean;
    /** Employment status. Real accounts only. */
    employmentStatus?: EmploymentStatus;
    /** Submit financial assessment. Requires employmentStatus. Real accounts only. */
    financialAssessment?: boolean;
    /** Fallback email to use if account creation fails. Real accounts only. */
    backupAccount?: string;
    /** Enable debug mode for detailed logging. */
    debug?: boolean;
    /**
     * Target environment. Defaults to `'staging'`.
     * Use `'production'` to run against live Core/ORY endpoints.
     * On production, top-up, KYC helpers, and POI/POA automation are disabled.
     */
    environment?: 'staging' | 'production';
    /** Call MT5 onboarding API. Real accounts only. */
    mt5Onboarding?: boolean;
    /** Call MT5 routing APIs for all account types. Real accounts only. */
    mt5Routing?: boolean;
    /** MT5 account creation configuration. Real accounts only. */
    mt5?: {
        /** MT5 trading password */
        password: string;
        /** MT5 account type(s) to create */
        types: MT5AccountType | MT5AccountType[] | 'all';
    };
    /** Number of cTrader accounts to create (1-5) or 'all'. Real accounts only. */
    ctrader?: number | 'all';
    /**
     * Create a Partners (affiliate) account. Real accounts only.
     *
     * - `true` — enable with all defaults (entity_type=retail, partner_type=individual, currency=USD)
     * - `PartnerOptions` object — enable with custom settings
     * - omitted / `false` — standard non-partner account
     *
     * When enabled, the underlying script skips the regular real-account wallet block
     * and creates a Partners wallet instead. See `PartnerOptions` for details.
     */
    partner?: boolean | PartnerOptions;
}

/** Result returned from account creation */
export interface AccountCreationResult {
    /** Email address of the created account */
    email: string;
    /** Password of the created account */
    password: string;
    /** Country code used */
    country: string;
    /** Account type */
    type: 'real' | 'demo';
    /** Session token for API calls */
    sessionToken?: string;
    /** Client ID (real accounts only) */
    clientId?: string;
    /** Wallet ID (real accounts with wallet only — not populated for partner accounts) */
    walletId?: string;
    /** Partners client UUID (only set when partner option is enabled) */
    partnersClientId?: string;
    /** Partners wallet ID (only set when partner option is enabled and the wallet was created) */
    partnersWalletId?: string;
    /** Raw stdout from the script */
    response: string;
}

const execFileAsync = promisify(execFile);

/** Scrub secrets from child-process error output before logging or re-throwing (CWE-532). */
function sanitizeDetail(detail: string): string {
    return (
        detail
            .replace(/--password\s+\S+/gi, '--password [REDACTED]')
            .replace(/--apikey\s+\S+/gi, '--apikey [REDACTED]')
            // MT5 password is a positional arg: --mt5 <types> <password>
            .replace(/(--mt5\s+\S+\s+)\S+/gi, '$1[REDACTED]')
    );
}

/** Path to the v2_create_account.js script relative to the playwright/ folder. */
const SCRIPT_PATH = path.resolve(__dirname, '../scripts/v2_create_account.js');

/** Path to the v2_topup.js script relative to the playwright/ folder. */
const TOPUP_SCRIPT_PATH = path.resolve(__dirname, '../scripts/v2_topup.js');

/** Path to the v2_poi_poa.js script relative to the playwright/ folder. */
const POI_POA_SCRIPT_PATH = path.resolve(__dirname, '../scripts/v2_poi_poa.js');

// ─────────────────────────────────────────────────────────────────────────────
// topupAccountViaJS — types & function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Options for topping up a wallet.
 * Either `walletId` OR (`email` + `password`) must be provided.
 */
export interface TopupAccountViaJSOptions {
    /**
     * Wallet ID to top up directly.
     * Takes precedence over email/password if both are provided.
     */
    walletId?: string;
    /**
     * Email of the account to log in and retrieve the wallet ID.
     * Required when walletId is not provided.
     */
    email?: string;
    /**
     * Password of the account.
     * Required when email is provided.
     */
    password?: string;
    /** Enable debug mode for detailed logging. */
    debug?: boolean;
}

/** Result returned from a wallet top-up operation */
export interface TopupAccountViaJSResult {
    /** Whether the top-up was successful */
    success: boolean;
    /**
     * Wallet ID that was topped up.
     * `undefined` when not provided directly and could not be extracted from script output.
     */
    walletId: string | undefined;
    /** Amount that was topped up */
    amount: number;
    /** Currency of the top-up */
    currency: string;
    /** Raw stdout from the script */
    response: string;
}

/** Default country code used when no country is passed to createAccountV2viaJS. */
const DEFAULT_COUNTRY = 'al' as const;

/**
 * Creates a disposable test account by running `v2_create_account.js` directly
 * as a child process — no HTTP round-trip to the QA Script Runner service.
 *
 * Supports staging (default) and production. On production, top-up, KYC helpers,
 * and POI/POA automation are disabled by the underlying script.
 *
 * @param type    - Account type: `'real'` or `'demo'`
 * @param country - Optional 2-letter ISO country code (defaults to `'al'`)
 * @param options - Optional config (pass `environment: 'production'` for live endpoints)
 * @returns Promise resolving to an `AccountCreationResult`
 *
 * @example
 * // Simple demo account (country defaults to 'al')
 * const account = await createAccountV2viaJS('demo');
 *
 * @example
 * // Real account with options, country defaults to 'al'
 * const account = await createAccountV2viaJS('real', {
 *   currency: 'USD',
 *   kyc: { poi: { status: 'approved' }, poa: { status: 'approved' } },
 * });
 *
 * @example
 * // Real account with explicit country
 * const account = await createAccountV2viaJS('real', 'gb', { currency: 'USD' });
 *
 * @example
 * // Production real account (top-up and KYC helpers are disabled on production)
 * const account = await createAccountV2viaJS('real', { currency: 'USD', environment: 'production' });
 */
export function createAccountV2viaJS(
    type: 'real' | 'demo',
    options?: AccountCreationOptions
): Promise<AccountCreationResult>;
export function createAccountV2viaJS(
    type: 'real' | 'demo',
    country?: string,
    options?: AccountCreationOptions
): Promise<AccountCreationResult>;
export async function createAccountV2viaJS(
    type: 'real' | 'demo',
    countryOrOptions: string | AccountCreationOptions = DEFAULT_COUNTRY,
    options: AccountCreationOptions = {}
): Promise<AccountCreationResult> {
    // Resolve overload: string → explicit country; object → options with default country; else → programming error (non-TS callers).
    if (typeof countryOrOptions === 'string') {
        if (countryOrOptions.length === 0) {
            throw new Error(
                `createAccountV2viaJS: country must not be an empty string — omit the argument to use the default ('${DEFAULT_COUNTRY}')`
            );
        }
    } else if (typeof countryOrOptions === 'object' && countryOrOptions !== null) {
        options = countryOrOptions;
    } else {
        throw new Error(`createAccountV2viaJS: unexpected type for second argument (got: ${typeof countryOrOptions})`);
    }
    const country = (typeof countryOrOptions === 'string' ? countryOrOptions : DEFAULT_COUNTRY).toLowerCase();
    const finalEmail = options.email ?? DataFactory.generateEmailWithPrefix('v2');
    const finalPassword = options.password ?? process.env.TEST_PASSWORD;
    const apiKey = process.env.MAILISK_API_KEY;

    if (!finalPassword) {
        throw new Error(
            'createAccountV2viaJS: Password not provided and TEST_PASSWORD is not set in playwright/.env.staging or playwright/.env.production'
        );
    }

    if (!apiKey) {
        throw new Error(
            'createAccountV2viaJS: MAILISK_API_KEY is not set in playwright/.env.staging or playwright/.env.production'
        );
    }

    // ── Input validation ──────────────────────────────────────────────────────

    const VALID_EMAIL_DOMAINS = ['@webapps.mailisk.net', '@mobileapps.mailisk.net'];
    if (!VALID_EMAIL_DOMAINS.some(domain => finalEmail.endsWith(domain))) {
        throw new Error(
            `createAccountV2viaJS: email must end with one of ${VALID_EMAIL_DOMAINS.join(', ')} (got: ${finalEmail})`
        );
    }

    if (!/^[a-z]{2}$/i.test(country)) {
        throw new Error(`createAccountV2viaJS: country must be a 2-letter ISO code (got: ${JSON.stringify(country)})`);
    }

    if (type === 'demo') {
        const realOnlyFields: (keyof AccountCreationOptions)[] = [
            'kyc',
            'currency',
            'tax',
            'trading',
            'employmentStatus',
            'financialAssessment',
            'mt5Onboarding',
            'mt5Routing',
            'mt5',
            'ctrader',
            'partner',
        ];
        // An explicit `false` (e.g. `partner: false`) means "explicitly disabled" and is
        // semantically equivalent to omitting the field — accept it for demo accounts.
        // Also treat empty arrays as "not used" (e.g. `mt5: undefined` vs `mt5: []`).
        const usedRealOnlyFields = realOnlyFields.filter(f => {
            const val = options[f];
            if (val === undefined || val === false) return false;
            if (Array.isArray(val) && val.length === 0) return false;
            return true;
        });
        if (usedRealOnlyFields.length > 0) {
            throw new Error(`createAccountV2viaJS: demo accounts do not support: ${usedRealOnlyFields.join(', ')}`);
        }
    }

    const VALID_KYC_STATUSES = ['approved', 'rejected'] as const;
    const VALID_POI_REJECTION_REASONS = ['NAME_MISMATCH', 'EXPIRED', 'DOB_MISMATCH'] as const;
    const VALID_POA_REJECTION_REASONS = ['ADDRESS_MISMATCH'] as const;

    if (options.kyc?.poi) {
        if (!VALID_KYC_STATUSES.includes(options.kyc.poi.status)) {
            throw new Error(
                `createAccountV2viaJS: kyc.poi.status must be one of ${VALID_KYC_STATUSES.join(', ')} (got: ${JSON.stringify(options.kyc.poi.status)})`
            );
        }
        if (
            options.kyc.poi.rejectionReasons &&
            !VALID_POI_REJECTION_REASONS.includes(
                options.kyc.poi.rejectionReasons as (typeof VALID_POI_REJECTION_REASONS)[number]
            )
        ) {
            throw new Error(
                `createAccountV2viaJS: kyc.poi.rejectionReasons must be one of ${VALID_POI_REJECTION_REASONS.join(', ')} (got: ${JSON.stringify(options.kyc.poi.rejectionReasons)})`
            );
        }
    }

    if (options.kyc?.poa) {
        if (!VALID_KYC_STATUSES.includes(options.kyc.poa.status)) {
            throw new Error(
                `createAccountV2viaJS: kyc.poa.status must be one of ${VALID_KYC_STATUSES.join(', ')} (got: ${JSON.stringify(options.kyc.poa.status)})`
            );
        }
        if (
            options.kyc.poa.rejectionReasons &&
            !VALID_POA_REJECTION_REASONS.includes(
                options.kyc.poa.rejectionReasons as (typeof VALID_POA_REJECTION_REASONS)[number]
            )
        ) {
            throw new Error(
                `createAccountV2viaJS: kyc.poa.rejectionReasons must be one of ${VALID_POA_REJECTION_REASONS.join(', ')} (got: ${JSON.stringify(options.kyc.poa.rejectionReasons)})`
            );
        }
    }

    if (options.userDetails?.dateOfBirth) {
        const dob = options.userDetails.dateOfBirth;
        const dobDate = new Date(dob);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || isNaN(dobDate.getTime())) {
            throw new Error(
                `createAccountV2viaJS: userDetails.dateOfBirth must be a valid date in YYYY-MM-DD format (got: ${JSON.stringify(dob)})`
            );
        }
    }

    if (options.financialAssessment && !options.employmentStatus) {
        throw new Error('createAccountV2viaJS: financialAssessment requires employmentStatus to be set');
    }

    const VALID_MT5_TYPES: MT5AccountType[] = ['standard', 'financial', 'swap-free', 'zero-spread', 'gold', 'crypto'];
    if (options.mt5 && options.mt5.types !== 'all') {
        const types = Array.isArray(options.mt5.types) ? options.mt5.types : [options.mt5.types];
        const invalidTypes = types.filter(t => !VALID_MT5_TYPES.includes(t));
        if (invalidTypes.length > 0) {
            throw new Error(
                `createAccountV2viaJS: invalid mt5.types: ${invalidTypes.join(', ')}. Must be one of ${VALID_MT5_TYPES.join(', ')} or "all"`
            );
        }
    }

    // ─────────────────────────────────────────────────────────────────────────

    const args = buildArgs(finalEmail, finalPassword, country, type, apiKey, options);

    let stdout: string;
    try {
        const result = await execFileAsync('node', [SCRIPT_PATH, ...args], {
            // Script can be slow — allow up to 2 minutes (same as the HTTP timeout)
            timeout: 120_000,
            maxBuffer: 10 * 1024 * 1024, // 10 MB — handles verbose --debug / multi-MT5 output
            env: process.env,
        });
        stdout = result.stdout;
        if (options.debug) {
            console.log('[createAccountV2viaJS] Script output:\n', stdout);
        }
    } catch (err: unknown) {
        // execFile rejects when the process exits with non-zero or times out.
        // The error object carries stdout/stderr from the child process.
        const childErr = err as { stdout?: string; stderr?: string; message?: string };
        const detail = sanitizeDetail(childErr.stderr ?? childErr.stdout ?? childErr.message ?? String(err));

        if (options.backupAccount && type === 'real') {
            console.warn(
                `⚠️ createAccountV2viaJS: Script failed. Using backup account: ${options.backupAccount}\n  Error: ${detail}`
            );
            return {
                email: options.backupAccount,
                password: finalPassword,
                country,
                type,
                response: `Backup account used due to script error: ${detail}`,
            };
        }

        throw new Error(`createAccountV2viaJS: Script execution failed:\n${detail}`);
    }

    // Parse output — mirrors the regex used in createAccountV2()
    const emailMatch = stdout.match(/Email:\s*([^\s\n]+)/);
    const actualEmail = emailMatch?.[1] ?? finalEmail;

    const sessionTokenMatch = stdout.match(/Session Token:\s*([^\s\n]+)/);
    const sessionToken = sessionTokenMatch?.[1];

    let clientId: string | undefined;
    if (type === 'real') {
        const clientIdMatch = stdout.match(/client_id['":\s]+([a-f0-9-]{36})/i);
        clientId = clientIdMatch?.[1];
    }

    let walletId: string | undefined;
    if (type === 'real' && options.currency && !options.partner) {
        // Partner accounts skip the regular wallet block — no "Wallet ID:" line for them.
        const walletIdMatch = stdout.match(/Wallet ID:\s*([^\s\n]+)/);
        walletId = walletIdMatch?.[1];
    }

    let partnersClientId: string | undefined;
    let partnersWalletId: string | undefined;
    if (type === 'real' && options.partner) {
        // Strict UUID length ({36}) — matches the existing clientId pattern style and
        // prevents silent matches on truncated/malformed IDs.
        const partnersClientIdMatch = stdout.match(/🤝 Partners Client ID:\s*([a-f0-9-]{36})/i);
        partnersClientId = partnersClientIdMatch?.[1];
        const partnersWalletIdMatch = stdout.match(/🤝 Partners Wallet ID:\s*([a-f0-9-]{36})/i);
        partnersWalletId = partnersWalletIdMatch?.[1];
    }

    if (!stdout.includes('Account creation completed successfully')) {
        console.warn(
            '⚠️ createAccountV2viaJS: Success confirmation not found in script output — account creation may have issues'
        );
    } else if (options.partner) {
        // Partner flag was requested — fail loudly if the partners flow didn't complete
        // OR if we couldn't parse the partner IDs, so callers never receive a partner
        // account result with undefined partnersClientId/partnersWalletId.
        if (!stdout.includes('Partners account creation flow completed successfully')) {
            throw new Error(
                'createAccountV2viaJS: Partner flag was set but the Partners account flow did not complete. ' +
                    'Check the script output for the failing Partners API call.'
            );
        }
        if (!partnersClientId || !partnersWalletId) {
            throw new Error(
                `createAccountV2viaJS: Partner flow completed but could not parse partner IDs from script output ` +
                    `(partnersClientId=${partnersClientId ?? 'undefined'}, partnersWalletId=${partnersWalletId ?? 'undefined'}). ` +
                    `The script's "🤝 Partners …" output line format may have changed.`
            );
        }
        console.log(`[accountCreationRunner] Account created successfully: ${finalEmail} (partner)`);
    } else {
        console.log(`[accountCreationRunner] Account created successfully: ${finalEmail}`);
    }

    return {
        email: actualEmail,
        password: finalPassword,
        country,
        type,
        sessionToken,
        clientId,
        walletId,
        partnersClientId,
        partnersWalletId,
        response: sanitizeDetail(stdout),
    };
}

/**
 * Tops up a wallet with a specified currency and amount by running `v2_topup.js`
 * directly as a child process — no HTTP round-trip to the QA Script Runner service.
 *
 * ⚠️ STAGING ONLY — never use in production tests.
 *
 * Either `walletId` OR (`email` + `password`) must be provided in options.
 *
 * @param currency - Wallet currency code (e.g., 'USD', 'BTC', 'TRX')
 * @param amount   - Amount to top up (must be a positive number)
 * @param options  - Wallet identification and optional configuration
 * @returns Promise with top-up result
 *
 * @example
 * // Top up using wallet ID directly
 * const result = await topupAccountViaJS('USD', 1000, {
 *   walletId: '6ba2eeef-2164-44ed-8e62-9921a51a7111'
 * });
 *
 * @example
 * // Top up by logging in with email and password
 * const result = await topupAccountViaJS('USD', 500, {
 *   email: 'user@webapps.mailisk.net',
 *   password: process.env.TEST_PASSWORD,
 * });
 */
export async function topupAccountViaJS(
    currency: string,
    amount: number,
    options: TopupAccountViaJSOptions
): Promise<TopupAccountViaJSResult> {
    const apiKey = process.env.MAILISK_API_KEY;

    if (!apiKey) {
        throw new Error('topupAccountViaJS: MAILISK_API_KEY is not set in playwright/.env.staging');
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error(`topupAccountViaJS: amount must be a positive finite number, got ${amount}`);
    }

    const hasWalletId = !!options.walletId;
    const hasEmail = !!options.email;
    const hasPassword = !!options.password;

    if (!hasWalletId && !hasEmail) {
        throw new Error('topupAccountViaJS: Either walletId OR email (with password) must be provided');
    }
    if (hasEmail && !hasPassword) {
        throw new Error('topupAccountViaJS: password is required when email is provided');
    }
    if (hasPassword && !hasEmail) {
        throw new Error('topupAccountViaJS: email is required when password is provided');
    }
    if (hasWalletId && hasEmail) {
        console.warn('⚠️ topupAccountViaJS: Both walletId and email provided — walletId takes precedence.');
    }

    assertSafeArg(apiKey, 'apiKey');
    assertSafeArg(currency, 'currency');

    const args: string[] = ['--apikey', apiKey, '--currency', currency, '--amount', String(amount)];

    if (options.walletId) {
        assertSafeArg(options.walletId, 'walletId');
        args.push('--wallet_id', options.walletId);
    } else {
        assertSafeArg(options.email!, 'email');
        assertSafeArg(options.password!, 'password');
        args.push('--email', options.email!, '--password', options.password!);
    }

    if (options.debug) {
        args.push('--debug');
    }

    let stdout: string;
    try {
        const result = await execFileAsync('node', [TOPUP_SCRIPT_PATH, ...args], {
            timeout: 120_000,
            maxBuffer: 10 * 1024 * 1024, // 10 MB — handles verbose --debug / multi-MT5 output
            env: process.env,
        });
        stdout = result.stdout;
    } catch (err: unknown) {
        const childErr = err as { stdout?: string; stderr?: string; message?: string };
        const detail = sanitizeDetail(childErr.stderr ?? childErr.stdout ?? childErr.message ?? String(err));
        throw new Error(`topupAccountViaJS: Script execution failed:\n${detail}`);
    }

    const topupSucceeded = stdout.includes('Top-up completed successfully!');
    if (!topupSucceeded) {
        console.warn('⚠️ topupAccountViaJS: Success confirmation not found in script output — top-up may have issues');
    } else {
        console.log(`[accountCreationRunner] Wallet topped up successfully (direct JS): ${amount} ${currency}`);
    }

    const providedWalletId = options.walletId?.trim() || undefined;
    let resolvedWalletId: string | undefined = providedWalletId;
    if (!resolvedWalletId) {
        const walletIdMatch = stdout.match(/Wallet ID:\s*([^\s\n]+)/);
        resolvedWalletId = walletIdMatch?.[1];
    }

    return {
        success: topupSucceeded,
        walletId: resolvedWalletId,
        amount,
        currency,
        response: sanitizeDetail(stdout),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// changePoiPoaStatusViaJS — types & function
// ─────────────────────────────────────────────────────────────────────────────

/** POI configuration for changePoiPoaStatusViaJS */
export interface PoiViaJSConfig {
    /** 'approved' or 'rejected' */
    status: 'approved' | 'rejected';
    /** Required when status is 'rejected'. Valid values: 'NAME_MISMATCH', 'EXPIRED', 'DOB_MISMATCH' */
    rejectionReasons?: string;
}

/** POA configuration for changePoiPoaStatusViaJS */
export interface PoaViaJSConfig {
    /** 'approved' or 'rejected' */
    status: 'approved' | 'rejected';
    /** Required when status is 'rejected'. Valid value: 'ADDRESS_MISMATCH' */
    rejectionReasons?: string;
}

/** Options for changePoiPoaStatusViaJS */
export interface ChangePoiPoaViaJSOptions {
    /**
     * Client UUID. Takes precedence over email/password if both are provided.
     */
    clientId?: string;
    /**
     * Email of the account. Required when clientId is not provided.
     */
    email?: string;
    /**
     * Password of the account. Required when email is provided.
     */
    password?: string;
    /** POI configuration. At least one of poi or poa must be provided. */
    poi?: PoiViaJSConfig;
    /** POA configuration. At least one of poi or poa must be provided. */
    poa?: PoaViaJSConfig;
    /** Enable debug mode for detailed logging. */
    debug?: boolean;
}

/** Result returned from a POI/POA status change */
export interface ChangePoiPoaViaJSResult {
    /** Whether the update was successful */
    success: boolean;
    /**
     * Client ID that was updated.
     * `undefined` when not provided directly and could not be extracted from script output.
     */
    clientId: string | undefined;
    /** Raw stdout from the script */
    response: string;
}

/**
 * Updates POI/POA verification status for an existing account by running `v2_poi_poa.js`
 * directly as a child process — no HTTP round-trip to the QA Script Runner service.
 *
 * ⚠️ STAGING ONLY — never use in production tests.
 *
 * Either `clientId` OR (`email` + `password`) must be provided.
 * At least one of `poi` or `poa` must be specified.
 *
 * @param options - Client identification, POI/POA config, and optional flags
 * @returns Promise with the update result
 *
 * @example
 * // Approve POI using email
 * await changePoiPoaStatusViaJS({
 *   email: account.email,
 *   password: account.password,
 *   poi: { status: 'approved' },
 * });
 *
 * @example
 * // Reject POA with reason using client ID
 * await changePoiPoaStatusViaJS({
 *   clientId: account.clientId,
 *   poa: { status: 'rejected', rejectionReasons: 'ADDRESS_MISMATCH' },
 * });
 *
 * @example
 * // Approve both POI and POA
 * await changePoiPoaStatusViaJS({
 *   email: account.email,
 *   password: account.password,
 *   poi: { status: 'approved' },
 *   poa: { status: 'approved' },
 * });
 */
export async function changePoiPoaStatusViaJS(options: ChangePoiPoaViaJSOptions): Promise<ChangePoiPoaViaJSResult> {
    const apiKey = process.env.MAILISK_API_KEY;

    if (!apiKey) {
        throw new Error('changePoiPoaStatusViaJS: MAILISK_API_KEY is not set in playwright/.env.staging');
    }

    const hasClientId = !!options.clientId;
    const hasEmail = !!options.email;
    const hasPassword = !!options.password;

    if (!hasClientId && !hasEmail) {
        throw new Error('changePoiPoaStatusViaJS: Either clientId OR email (with password) must be provided');
    }
    if (hasEmail && !hasPassword) {
        throw new Error('changePoiPoaStatusViaJS: password is required when email is provided');
    }
    if (hasPassword && !hasEmail) {
        throw new Error('changePoiPoaStatusViaJS: email is required when password is provided');
    }
    if (!options.poi && !options.poa) {
        throw new Error('changePoiPoaStatusViaJS: At least one of poi or poa must be provided');
    }
    if (options.poi?.status === 'rejected' && !options.poi.rejectionReasons) {
        throw new Error('changePoiPoaStatusViaJS: poi.rejectionReasons is required when poi status is "rejected"');
    }
    if (options.poa?.status === 'rejected' && !options.poa.rejectionReasons) {
        throw new Error('changePoiPoaStatusViaJS: poa.rejectionReasons is required when poa status is "rejected"');
    }
    if (hasClientId && hasEmail) {
        console.warn('⚠️ changePoiPoaStatusViaJS: Both clientId and email provided — clientId takes precedence.');
    }

    assertSafeArg(apiKey, 'apiKey');

    const args: string[] = ['--apikey', apiKey];

    if (options.clientId) {
        assertSafeArg(options.clientId, 'clientId');
        args.push('--client_id', options.clientId);
    } else {
        assertSafeArg(options.email!, 'email');
        assertSafeArg(options.password!, 'password');
        args.push('--email', options.email!, '--password', options.password!);
    }

    if (options.poi) {
        assertSafeArg(options.poi.status, 'poi.status');
        args.push('--poi', options.poi.status);
        if (options.poi.rejectionReasons) {
            assertSafeArg(options.poi.rejectionReasons, 'poi.rejectionReasons');
            args.push('--poi_rejection_reasons', options.poi.rejectionReasons);
        }
    }

    if (options.poa) {
        assertSafeArg(options.poa.status, 'poa.status');
        args.push('--poa', options.poa.status);
        if (options.poa.rejectionReasons) {
            assertSafeArg(options.poa.rejectionReasons, 'poa.rejectionReasons');
            args.push('--poa_rejection_reasons', options.poa.rejectionReasons);
        }
    }

    if (options.debug) {
        args.push('--debug');
    }

    let stdout: string;
    try {
        const result = await execFileAsync('node', [POI_POA_SCRIPT_PATH, ...args], {
            timeout: 120_000,
            maxBuffer: 10 * 1024 * 1024, // 10 MB — handles verbose --debug / multi-MT5 output
            env: process.env,
        });
        stdout = result.stdout;
    } catch (err: unknown) {
        const childErr = err as { stdout?: string; stderr?: string; message?: string };
        const detail = sanitizeDetail(childErr.stderr ?? childErr.stdout ?? childErr.message ?? String(err));
        throw new Error(`changePoiPoaStatusViaJS: Script execution failed:\n${detail}`);
    }

    const poiPoaSucceeded = stdout.includes('POI/POA status update completed successfully!');
    if (!poiPoaSucceeded) {
        console.warn(
            '⚠️ changePoiPoaStatusViaJS: Success confirmation not found in script output — update may have issues'
        );
    } else {
        console.log('[✅] POI/POA status updated successfully (direct JS)');
    }

    let resolvedClientId: string | undefined = options.clientId;
    if (!resolvedClientId) {
        const clientIdMatch = stdout.match(/Client ID:\s*([^\s\n]+)/i);
        resolvedClientId = clientIdMatch?.[1];
    }

    return {
        success: poiPoaSucceeded,
        clientId: resolvedClientId,
        response: sanitizeDetail(stdout),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Guards against argument injection (CWE-88). execFile does not invoke a shell,
 * but a value starting with '-' would still be interpreted as a CLI flag by the
 * child script. Reject any such value before it reaches the args array.
 */
function assertSafeArg(value: string, name: string): void {
    if (!value.trim()) {
        throw new Error(`buildArgs: ${name} must not be empty`);
    }
    if (value.startsWith('-')) {
        throw new Error(`buildArgs: ${name} must not start with '-' (got: ${JSON.stringify(value)})`);
    }
}

/**
 * Translates a `CreateAccountOptions` object into the CLI args array expected
 * by `v2_create_account.js`.
 */
function buildArgs(
    email: string,
    password: string,
    country: string,
    type: 'real' | 'demo',
    apiKey: string,
    options: AccountCreationOptions
): string[] {
    assertSafeArg(email, 'email');
    assertSafeArg(password, 'password');
    assertSafeArg(country, 'country');
    assertSafeArg(apiKey, 'apiKey');

    const environment = options.environment ?? 'staging';
    const ALLOWED_ENVIRONMENTS = ['staging', 'production'] as const;
    if (!(ALLOWED_ENVIRONMENTS as readonly string[]).includes(environment)) {
        throw new Error(
            `buildArgs: environment must be 'staging' or 'production', got: ${JSON.stringify(environment)}`
        );
    }

    const args: string[] = [
        '--email',
        email,
        '--password',
        password,
        '--country',
        country.toLowerCase(),
        '--type',
        type,
        '--apikey',
        apiKey,
        '--environment',
        environment,
    ];

    if (type !== 'real') {
        // Demo accounts accept no further options
        return args;
    }

    if (options.kyc?.poi) {
        assertSafeArg(options.kyc.poi.status, 'kyc.poi.status');
        args.push('--poi', options.kyc.poi.status);
        if (options.kyc.poi.rejectionReasons) {
            assertSafeArg(options.kyc.poi.rejectionReasons, 'kyc.poi.rejectionReasons');
            args.push('--poi_rejection_reasons', options.kyc.poi.rejectionReasons);
        }
    }

    if (options.kyc?.poa) {
        assertSafeArg(options.kyc.poa.status, 'kyc.poa.status');
        args.push('--poa', options.kyc.poa.status);
        if (options.kyc.poa.rejectionReasons) {
            assertSafeArg(options.kyc.poa.rejectionReasons, 'kyc.poa.rejectionReasons');
            args.push('--poa_rejection_reasons', options.kyc.poa.rejectionReasons);
        }
    }

    if (options.userDetails?.firstName) {
        assertSafeArg(options.userDetails.firstName, 'userDetails.firstName');
        args.push('--firstname', options.userDetails.firstName);
    }
    if (options.userDetails?.lastName) {
        assertSafeArg(options.userDetails.lastName, 'userDetails.lastName');
        args.push('--lastname', options.userDetails.lastName);
    }
    if (options.userDetails?.dateOfBirth) {
        assertSafeArg(options.userDetails.dateOfBirth, 'userDetails.dateOfBirth');
        args.push('--dob', options.userDetails.dateOfBirth);
    }
    if (options.userDetails?.phone) {
        assertSafeArg(options.userDetails.phone, 'userDetails.phone');
        args.push('--phone', options.userDetails.phone);
    }
    if (options.userDetails?.address) {
        assertSafeArg(options.userDetails.address, 'userDetails.address');
        args.push('--address', options.userDetails.address);
    }
    if (options.userDetails?.city) {
        assertSafeArg(options.userDetails.city, 'userDetails.city');
        args.push('--city', options.userDetails.city);
    }

    if (options.tax) {
        assertSafeArg(options.tax.id, 'tax.id');
        assertSafeArg(options.tax.residence, 'tax.residence');
        args.push('--tax_id', options.tax.id);
        args.push('--tax_residence', options.tax.residence);
    }

    if (options.currency) {
        const currencyList = Array.isArray(options.currency) ? options.currency : [options.currency];
        currencyList.forEach((c, i) => assertSafeArg(c, `currency[${i}]`));
        args.push('--walletCurrency', currencyList.join(','));
    }

    if (options.trading) {
        args.push('--trading');
    }

    if (options.employmentStatus) {
        assertSafeArg(options.employmentStatus, 'employmentStatus');
        args.push('--employment_status', options.employmentStatus);
    }

    if (options.financialAssessment) {
        args.push('--fa');
    }

    if (options.mt5Onboarding) {
        args.push('--mt5_onboarding');
    }

    if (options.mt5Routing) {
        args.push('--mt5_routing');
    }

    if (options.mt5) {
        assertSafeArg(options.mt5.password, 'mt5.password');
        if (options.mt5.types === 'all') {
            args.push('--mt5', 'all', options.mt5.password);
        } else {
            const types = Array.isArray(options.mt5.types) ? options.mt5.types.join(',') : options.mt5.types;
            args.push('--mt5', types, options.mt5.password);
        }
    }

    if (options.ctrader !== undefined) {
        if (
            options.ctrader !== 'all' &&
            (!Number.isInteger(options.ctrader) || options.ctrader < 1 || options.ctrader > 5)
        ) {
            throw new Error(`buildArgs: ctrader must be an integer 1–5 or "all", got ${options.ctrader}`);
        }
        args.push('--ctrader', options.ctrader.toString());
    }

    if (options.partner) {
        const partnerOptions: PartnerOptions = options.partner === true ? {} : options.partner;

        const VALID_ENTITY_TYPES: PartnerEntityType[] = ['retail', 'corporate'];
        if (partnerOptions.entityType && !VALID_ENTITY_TYPES.includes(partnerOptions.entityType)) {
            throw new Error(
                `buildArgs: partner.entityType must be one of ${VALID_ENTITY_TYPES.join(', ')} (got: ${JSON.stringify(partnerOptions.entityType)})`
            );
        }
        const VALID_PARTNER_TYPES: PartnerType[] = ['individual', 'company'];
        if (partnerOptions.partnerType && !VALID_PARTNER_TYPES.includes(partnerOptions.partnerType)) {
            throw new Error(
                `buildArgs: partner.partnerType must be one of ${VALID_PARTNER_TYPES.join(', ')} (got: ${JSON.stringify(partnerOptions.partnerType)})`
            );
        }
        if (partnerOptions.callingCountryCode && !/^\d+$/.test(partnerOptions.callingCountryCode)) {
            throw new Error(
                `buildArgs: partner.callingCountryCode must be digits only (got: ${JSON.stringify(partnerOptions.callingCountryCode)})`
            );
        }

        const partnerCurrency = partnerOptions.partnerCurrency ?? 'USD';
        assertSafeArg(partnerCurrency, 'partner.partnerCurrency');

        args.push('--client_type', 'affiliate');
        args.push('--entity_type', partnerOptions.entityType ?? 'retail');
        args.push('--partner_type', partnerOptions.partnerType ?? 'individual');
        args.push('--partner_currency', partnerCurrency);

        if (partnerOptions.website) {
            assertSafeArg(partnerOptions.website, 'partner.website');
            args.push('--website', partnerOptions.website);
        }
        if (partnerOptions.companyName) {
            assertSafeArg(partnerOptions.companyName, 'partner.companyName');
            args.push('--company_name', partnerOptions.companyName);
        }
        if (partnerOptions.companyRegistrationNumber) {
            assertSafeArg(partnerOptions.companyRegistrationNumber, 'partner.companyRegistrationNumber');
            args.push('--company_registration_number', partnerOptions.companyRegistrationNumber);
        }
        if (partnerOptions.provider) {
            assertSafeArg(partnerOptions.provider, 'partner.provider');
            args.push('--provider', partnerOptions.provider);
        }
        if (partnerOptions.callingCountryCode) {
            args.push('--calling_country_code', partnerOptions.callingCountryCode);
        }
    }

    if (options.debug) {
        args.push('--debug');
    }

    return args;
}
