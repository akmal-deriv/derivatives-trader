/**
 * QA Script Runner Utilities
 *
 * This module provides TypeScript wrappers for all QA Script Runner service operations.
 * All functions call the QA Script Runner API (staging only) to perform account management
 * tasks that would otherwise require manual backoffice access.
 *
 * ⚠️ STAGING ONLY — never use these utilities in production tests.
 *
 * Supported operations:
 * - `createAccountV1()`       — create accounts using create_account.pl (legacy Perl script)
 * - `createAccountV2()` — create Deriv test accounts with full configuration (v2_create_account.js)
 * - `topupAccount()`          — top up a wallet with a specified currency and amount
 * - `changePoiPoaStatus()`    — update POI/POA verification status for an existing account
 *
 * @example
 * ```typescript
 * import { createAccountV1, createAccountV2, topupAccount, changePoiPoaStatus } from '../utils';
 * ```
 */

import { APIRequestContext } from '@playwright/test';
import { DataFactory } from './dataFactory';

/** Delay (ms) before retrying a failed account creation request. */
const RETRY_DELAY_MS = 5000;

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POI (Proof of Identity) status options
 */
export type POIStatus = 'approved' | 'rejected';

/**
 * POI rejection reasons
 */
export type POIRejectionReason = 'NAME_MISMATCH' | 'EXPIRED' | 'DOB_MISMATCH';

/**
 * POA (Proof of Address) status options
 */
export type POAStatus = 'approved' | 'rejected';

/**
 * POA rejection reasons
 */
export type POARejectionReason = 'ADDRESS_MISMATCH';

/**
 * Employment status options
 */
export type EmploymentStatus = 'full_time' | 'part_time' | 'self_employed' | 'unemployed' | 'retired' | 'student';

/**
 * MT5 account types supported for creation
 */
export type MT5AccountType = 'standard' | 'financial' | 'swap-free' | 'zero-spread' | 'gold' | 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// createAccountV1 — types & function (Legacy Perl Script)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Broker code options for V1 account creation
 */
export type BrokerCode = 'VRTC' | 'VRW' | 'CR' | 'CRW' | 'MFW' | 'MF' | 'MLT';

/**
 * Optional configuration for V1 account creation using create_account.pl
 */
export interface CreateAccountV1Options {
    /**
     * Email address for the account.
     * Must use @webapps.mailisk.net or @mobileapps.mailisk.net domain.
     * Auto-generated if not provided.
     */
    email?: string;

    /**
     * Password for the account.
     * Uses TEST_PASSWORD from .env if not provided.
     */
    password?: string;

    /**
     * Enable payment agent functionality
     */
    paymentAgent?: boolean;

    /**
     * Enable POI verification
     */
    poiVerified?: boolean;

    /**
     * Disable deposit functionality
     */
    noDeposit?: boolean;

    /**
     * Disable currency setup
     */
    noCurrency?: boolean;

    /**
     * Enable copier functionality
     */
    copier?: boolean;

    /**
     * Set advertiser nickname (empty string for default)
     */
    advertiser?: string;

    /**
     * Disable advertisement creation
     */
    noAd?: boolean;

    /**
     * Enable authentication
     */
    authenticated?: boolean;

    /**
     * Enable RF (multiple crypto accounts)
     */
    rf?: boolean;

    /**
     * Enable all crypto currencies
     */
    allCrypto?: boolean;

    /**
     * Enable MT5 accounts
     */
    mt5?: boolean;

    /**
     * Create low balance account
     */
    lowBalance?: boolean;

    /**
     * Enable trading account
     */
    trading?: boolean;

    /**
     * Link MT5 account (requires specific MT5 ID)
     */
    linkMt5?: string;

    /**
     * Link to token
     */
    linkToToken?: string;

    /**
     * Create DIEL account
     */
    diel?: boolean;

    /**
     * Enable wallet migration
     */
    migrated?: boolean;

    /**
     * Disable VR (virtual) account creation
     */
    noVr?: boolean;

    /**
     * Create old account (with past date)
     */
    oldAccount?: boolean;

    /**
     * Pending crypto deposit
     */
    pendingDept?: boolean;

    /**
     * Confirmed crypto deposit
     */
    confirmedDept?: boolean;

    /**
     * Pending crypto withdrawal
     */
    reviewWith?: boolean;

    /**
     * Verified crypto withdrawal
     */
    verifiedWith?: boolean;

    /**
     * Phone number verified account
     */
    pnv?: boolean;

    /**
     * Show TNC dialog
     */
    tnc?: boolean;

    /**
     * Custom phone number
     */
    phone?: string;

    /**
     * Sibling currencies (comma-separated)
     */
    sibling?: string;

    /**
     * Payment agent sibling currencies (comma-separated)
     */
    paSibling?: string;

    /**
     * Partner information
     */
    partner?: string;

    /**
     * Use FA version 1
     */
    faV1?: boolean;

    /**
     * Output in JSON format
     */
    json?: boolean;

    /**
     * Migrate to P2P v2
     */
    migrateToV2?: boolean;

    /**
     * Generate random nickname for advertiser
     */
    randomNickname?: boolean;

    /**
     * Enable debug mode for detailed logging
     */
    debug?: boolean;
}

/**
 * Result returned from V1 account creation
 */
export interface CreateAccountV1Result {
    /** Email address of the created account */
    email: string;
    /** Password of the created account */
    password: string;
    /** Broker code used */
    brokerCode: BrokerCode;
    /** Country code used */
    country: string;
    /** Currency used */
    currency: string;
    /** Raw response from the API */
    response: string;
}

/**
 * Creates a disposable test account using the legacy QA Script Runner Service (create_account.pl).
 *
 * ⚠️ STAGING ONLY — never use in production tests.
 * ⚠️ LEGACY — This uses the old Perl script. Consider using createAccountV2() for new tests.
 *
 * @param request - Playwright APIRequestContext for making HTTP requests
 * @param brokerCode - Broker code (VRTC, VRW, CR, CRW, MFW, MF, MLT)
 * @param residence - Country code (e.g., 'al', 'us', 'gb')
 * @param currency - Currency code (e.g., 'USD', 'BTC', 'EUR')
 * @param options - Optional configuration for account creation
 * @returns Promise with account creation result
 *
 * @example
 * // Simple virtual account
 * const account = await createAccountV1(request, 'VRTC', 'al', 'USD');
 *
 * @example
 * // Real account with payment agent
 * const account = await createAccountV1(request, 'CR', 'al', 'USD', {
 *   paymentAgent: true,
 *   authenticated: true
 * });
 *
 * @example
 * // Crypto wallet account
 * const account = await createAccountV1(request, 'CRW', 'al', 'BTC', {
 *   trading: true,
 *   rf: true
 * });
 */
export async function createAccountV1(
    request: APIRequestContext,
    brokerCode: BrokerCode,
    residence: string,
    currency: string,
    options: CreateAccountV1Options = {}
): Promise<CreateAccountV1Result> {
    // Collect all validation errors
    const validationErrors: string[] = [];

    // Generate email and password if not provided in options
    const finalEmail = options.email ?? DataFactory.generateEmailWithPrefix('qa');
    const finalPassword = options.password ?? process.env.TEST_PASSWORD;

    if (!finalPassword) {
        validationErrors.push('🔴 Password not provided and TEST_PASSWORD not set in .env file');
    }

    // Validate email domain if provided
    if (options.email) {
        const emailRegex = /^[^\s@]+(@webapps\.mailisk\.net|@mobileapps\.mailisk\.net)$/;
        if (!emailRegex.test(options.email)) {
            validationErrors.push(
                `🔴 Invalid email domain: ${options.email}. Only emails with domains "@webapps.mailisk.net" and "@mobileapps.mailisk.net" are supported.`
            );
        }
    }

    const validBrokerCodes: BrokerCode[] = ['VRTC', 'VRW', 'CR', 'CRW', 'MFW', 'MF', 'MLT'];
    if (!validBrokerCodes.includes(brokerCode)) {
        validationErrors.push(`🔴 Invalid broker code: ${brokerCode}. Must be one of: ${validBrokerCodes.join(', ')}`);
    }

    if (!residence || residence.trim() === '') {
        validationErrors.push('🔴 Residence (country code) is required');
    } else if (!/^[a-z]{2}$/i.test(residence)) {
        validationErrors.push('🔴 Residence must be a valid 2-letter ISO code (e.g., "al", "us", "gb")');
    }

    if (!currency || currency.trim() === '') {
        validationErrors.push('🔴 Currency is required');
    }

    // Throw all validation errors together
    if (validationErrors.length > 0) {
        throw new Error(`V1 Account creation validation failed:\n${validationErrors.join('\n')}`);
    }

    const { qaUrl, qaUsername, qaPassword } = getQAScriptRunnerCredentials();

    // Build arguments array - create_account.pl uses positional args first, then options
    const args: string[] = [finalEmail, finalPassword!, brokerCode, residence.toLowerCase(), currency];

    // Add optional flags
    if (options.paymentAgent) args.push('--pa');
    if (options.poiVerified) args.push('--poi_verified');
    if (options.noDeposit) args.push('--no_deposit');
    if (options.noCurrency) args.push('--no_currency');
    if (options.copier) args.push('--copier');
    if (options.advertiser !== undefined) args.push('--advertiser', options.advertiser);
    if (options.noAd) args.push('--no_ad');
    if (options.authenticated) args.push('--authenticated');
    if (options.rf) args.push('--rf');
    if (options.allCrypto) args.push('--all_crypto');
    if (options.mt5) args.push('--mt5');
    if (options.lowBalance) args.push('--low_balance');
    if (options.trading) args.push('--trading');
    if (options.linkMt5) args.push('--link_mt5', options.linkMt5);
    if (options.linkToToken) args.push('--link_to_token', options.linkToToken);
    if (options.diel) args.push('--diel');
    if (options.migrated) args.push('--migrated');
    if (options.noVr) args.push('--no_vr');
    if (options.oldAccount) args.push('--old_account');
    if (options.pendingDept) args.push('--pending_dept');
    if (options.confirmedDept) args.push('--confirmed_dept');
    if (options.reviewWith) args.push('--review_with');
    if (options.verifiedWith) args.push('--verified_with');
    if (options.pnv) args.push('--pnv');
    if (options.tnc) args.push('--tnc');
    if (options.phone) args.push('--phone', options.phone);
    if (options.sibling) args.push('--sibling', options.sibling);
    if (options.paSibling) args.push('--pa_sibling', options.paSibling);
    if (options.partner) args.push('--partner', options.partner);
    if (options.faV1) args.push('--fa_v1');
    if (options.json) args.push('--json');
    if (options.migrateToV2) args.push('--migrate_to_v2');
    if (options.randomNickname) args.push('--random_nickname');

    const payload = {
        script_name: 'create_account.pl',
        args,
    };

    try {
        const response = await callQAScriptRunner(request, qaUrl, qaUsername, qaPassword, payload);

        if (!response.ok()) {
            const errorText = await response.text();
            throw new Error(`V1 Account creation failed: HTTP ${response.status()} - ${errorText}`);
        }

        const responseText = await response.text();
        console.log(`[✅] Account created successfully: ${finalEmail}`);

        return {
            email: finalEmail,
            password: finalPassword!,
            brokerCode,
            country: residence.toLowerCase(),
            currency,
            response: responseText,
        };
    } catch (error) {
        throw error;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// createAccountV2 — types & function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * KYC (Know Your Customer) configuration for real accounts
 */
export interface KYCOptions {
    /**
     * POI (Proof of Identity) configuration
     */
    poi?: {
        /** POI status - 'approved' or 'rejected' */
        status: POIStatus;
        /**
         * Required when status is 'rejected'.
         * Must be a single reason string.
         * Valid values: 'NAME_MISMATCH', 'EXPIRED', 'DOB_MISMATCH'
         */
        rejectionReasons?: string;
    };

    /**
     * POA (Proof of Address) configuration
     */
    poa?: {
        /** POA status - 'approved' or 'rejected' */
        status: POAStatus;
        /**
         * Required when status is 'rejected'.
         * Must be a single reason string.
         * Valid value: 'ADDRESS_MISMATCH'
         */
        rejectionReasons?: string;
    };
}

/**
 * User personal details for real accounts
 */
export interface UserDetails {
    /** First name - auto-generated if not provided */
    firstName?: string;
    /** Last name - auto-generated if not provided */
    lastName?: string;
    /** Date of birth in YYYY-MM-DD format - auto-generated if not provided */
    dateOfBirth?: string;
    /** Phone number - auto-generated if not provided */
    phone?: string;
    /** Address - auto-generated if not provided */
    address?: string;
    /** City - auto-generated if not provided */
    city?: string;
}

/**
 * Tax information for real accounts.
 * Both fields are required together.
 */
export interface TaxInfo {
    /** Tax identification number */
    id: string;
    /** Tax residence country code (e.g., 'ar', 'my') */
    residence: string;
}

/**
 * Optional configuration for account creation.
 * All fields are optional and only applicable to real accounts unless specified.
 */
export interface CreateAccountOptions {
    /**
     * Email address for the account.
     * Must use @webapps.mailisk.net or @mobileapps.mailisk.net domain.
     * Auto-generated if not provided.
     */
    email?: string;

    /**
     * Password for the account.
     * Uses TEST_PASSWORD from .env if not provided.
     */
    password?: string;

    /**
     * KYC (Know Your Customer) configuration.
     * Only applicable to real accounts.
     */
    kyc?: KYCOptions;

    /**
     * User personal details.
     * Only applicable to real accounts. Auto-generated if not provided.
     */
    userDetails?: UserDetails;

    /**
     * Tax information (both id and residence required together).
     * Only applicable to real accounts.
     */
    tax?: TaxInfo;

    /**
     * Wallet currency or currencies.
     * Can be single currency (e.g., 'USD') or array (e.g., ['USD', 'BTC', 'TRX']).
     * Only applicable to real accounts.
     */
    currency?: string | string[];

    /**
     * Enable trading account setup.
     * When true, tops up wallet with 2000 USD and transfers 1000 USD to Options trading account.
     * Only applicable to real accounts.
     */
    trading?: boolean;

    /**
     * Employment status.
     * Only applicable to real accounts.
     */
    employmentStatus?: EmploymentStatus;

    /**
     * Enable financial assessment submission.
     * Requires employmentStatus to be set.
     * Only applicable to real accounts.
     */
    financialAssessment?: boolean;

    /**
     * Backup account email to use if account creation fails.
     * Only applicable to real accounts.
     */
    backupAccount?: string;

    /**
     * Enable debug mode for detailed logging.
     */
    debug?: boolean;

    /**
     * MT5 onboarding - calls MT5 onboarding API.
     * Only applicable to real accounts.
     */
    mt5Onboarding?: boolean;

    /**
     * MT5 routing - calls MT5 routing APIs for all account types.
     * Only applicable to real accounts.
     */
    mt5Routing?: boolean;

    /**
     * MT5 account creation configuration.
     * Only applicable to real accounts.
     */
    mt5?: {
        /** MT5 trading password */
        password: string;
        /** MT5 account type(s) to create - single type or array of types */
        types: MT5AccountType | MT5AccountType[] | 'all';
    };

    /**
     * cTrader account creation.
     * Specify number of accounts to create (1-5) or 'all' for maximum (5).
     * Only applicable to real accounts.
     */
    ctrader?: number | 'all';
}

/**
 * Result returned from account creation
 */
export interface CreateAccountResult {
    /** Email address of the created account */
    email: string;
    /** Password of the created account */
    password: string;
    /** Country code used */
    country: string;
    /** Account type (real or demo) */
    type: 'real' | 'demo';
    /** Session token for API calls (extracted from response) */
    sessionToken?: string;
    /** Client ID (extracted from response, real accounts only) */
    clientId?: string;
    /** Wallet ID (extracted from response, real accounts with wallet only) */
    walletId?: string;
    /** Raw response from the API */
    response: string;
}

/**
 * Creates a disposable test account using the QA Script Runner Service (v2_create_account.js).
 *
 * ⚠️ STAGING ONLY — never use in production tests.
 *
 * Includes an automatic single retry on transient server errors (e.g. HTTP 500).
 * The retry uses a fresh email to avoid "email already exists" collisions and waits 5s
 * before the second attempt. If both attempts fail, falls back to `backupAccount` (if provided)
 * or throws an error.
 *
 * @param request - Playwright APIRequestContext for making HTTP requests
 * @param country - Country code (e.g., 'us', 'ar', 'gb', 'my'). Use 'al' by default.
 * @param type - Account type ('real' or 'demo')
 * @param options - Optional configuration for account creation
 * @returns Promise with account creation result
 *
 * @example
 * // Simple demo account
 * const account = await createAccountV2(request, 'al', 'demo');
 *
 * @example
 * // Real account with approved KYC
 * const account = await createAccountV2(request, 'al', 'real', {
 *   currency: 'USD',
 *   kyc: {
 *     poi: { status: 'approved' },
 *     poa: { status: 'approved' }
 *   }
 * });
 *
 * @example
 * // Real account with trading setup
 * const account = await createAccountV2(request, 'al', 'real', {
 *   currency: 'USD',
 *   trading: true
 * });
 */
export async function createAccountV2(
    request: APIRequestContext,
    country: string,
    type: 'real' | 'demo',
    options: CreateAccountOptions = {}
): Promise<CreateAccountResult> {
    // Collect all validation errors
    const validationErrors: string[] = [];

    // Validate country code (basic validation only - detailed validation handled by create account script)
    if (!country || country.trim() === '') {
        validationErrors.push('🔴 Country code is required');
    } else if (!/^[a-z]{2}$/i.test(country)) {
        validationErrors.push('🔴 Country code must be a valid 2-letter ISO code (e.g., "al", "us", "gb")');
    }

    // Validate account type
    if (!['real', 'demo'].includes(type)) {
        validationErrors.push(`Invalid account type: ${type}. Only "real" and "demo" are supported.`);
    }

    // Validate demo account restrictions
    if (type === 'demo') {
        if (options.kyc) {
            validationErrors.push('🔴 KYC (POI/POA) can only be set for real accounts');
        }
        if (options.userDetails) {
            validationErrors.push('🔴 User details can only be set for real accounts');
        }
        if (options.tax) {
            validationErrors.push('🔴 Tax information can only be set for real accounts');
        }
        if (options.currency) {
            validationErrors.push('🔴 Currency can only be set for real accounts');
        }
        if (options.trading) {
            validationErrors.push('🔴 Trading setup can only be enabled for real accounts');
        }
        if (options.employmentStatus) {
            validationErrors.push('🔴 Employment status can only be set for real accounts');
        }
        if (options.financialAssessment) {
            validationErrors.push('🔴 Financial assessment can only be enabled for real accounts');
        }
        if (options.mt5Onboarding) {
            validationErrors.push('🔴 MT5 onboarding can only be enabled for real accounts');
        }
        if (options.mt5Routing) {
            validationErrors.push('🔴 MT5 routing can only be enabled for real accounts');
        }
        if (options.mt5) {
            validationErrors.push('🔴 MT5 account creation can only be enabled for real accounts');
        }
        if (options.ctrader) {
            validationErrors.push('🔴 cTrader account creation can only be enabled for real accounts');
        }
    }

    // Validate email domain if provided
    if (options.email) {
        const emailRegex = /^[^\s@]+(@webapps\.mailisk\.net|@mobileapps\.mailisk\.net)$/;
        if (!emailRegex.test(options.email)) {
            validationErrors.push(
                `🔴 Invalid email domain: ${options.email}. Only emails with domains "@webapps.mailisk.net" and "@mobileapps.mailisk.net" are supported.`
            );
        }
    }

    // Validate KYC options for real accounts
    if (type === 'real' && options.kyc) {
        if (options.kyc.poi) {
            const validPoiStatuses: POIStatus[] = ['approved', 'rejected'];
            if (!validPoiStatuses.includes(options.kyc.poi.status)) {
                validationErrors.push(
                    `🔴 Invalid POI status: ${options.kyc.poi.status}. Must be one of: ${validPoiStatuses.join(', ')}`
                );
            }
            if (options.kyc.poi.status === 'rejected' && !options.kyc.poi.rejectionReasons) {
                validationErrors.push(
                    '🔴 POI rejectionReasons is required when status is "rejected". Must be one of: NAME_MISMATCH, EXPIRED, DOB_MISMATCH'
                );
            }
            if (options.kyc.poi.rejectionReasons) {
                const validReasons: POIRejectionReason[] = ['NAME_MISMATCH', 'EXPIRED', 'DOB_MISMATCH'];
                const invalidReasons = [options.kyc.poi.rejectionReasons].filter(
                    r => !validReasons.includes(r as POIRejectionReason)
                );
                if (invalidReasons.length > 0) {
                    validationErrors.push(
                        `🔴 Invalid POI rejection reason(s): ${invalidReasons.join(', ')}. Must be one of: ${validReasons.join(', ')}`
                    );
                }
            }
        }

        if (options.kyc.poa) {
            const validPoaStatuses: POAStatus[] = ['approved', 'rejected'];
            if (!validPoaStatuses.includes(options.kyc.poa.status)) {
                validationErrors.push(
                    `🔴 Invalid POA status: ${options.kyc.poa.status}. Must be one of: ${validPoaStatuses.join(', ')}`
                );
            }
            if (options.kyc.poa.status === 'rejected' && !options.kyc.poa.rejectionReasons) {
                validationErrors.push(
                    '🔴 POA rejectionReasons is required when status is "rejected". Must be: ADDRESS_MISMATCH'
                );
            }
            if (options.kyc.poa.rejectionReasons) {
                const validReasons: POARejectionReason[] = ['ADDRESS_MISMATCH'];
                const invalidReasons = [options.kyc.poa.rejectionReasons].filter(
                    r => !validReasons.includes(r as POARejectionReason)
                );
                if (invalidReasons.length > 0) {
                    validationErrors.push(
                        `🔴 Invalid POA rejection reason(s): ${invalidReasons.join(', ')}. Must be: ADDRESS_MISMATCH`
                    );
                }
            }
        }
    }

    // Validate tax information - both fields required together
    if (options.tax) {
        if (!options.tax.id || !options.tax.residence) {
            validationErrors.push('🔴 Both tax ID and tax residence are required when providing tax information');
        }
    }

    // Validate date of birth format and validity if provided
    if (options.userDetails?.dateOfBirth) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(options.userDetails.dateOfBirth)) {
            validationErrors.push(
                `🔴 Invalid date format for dateOfBirth: ${options.userDetails.dateOfBirth}. Format should be YYYY-MM-DD`
            );
        } else {
            const date = new Date(options.userDetails.dateOfBirth);
            if (isNaN(date.getTime()) || date.toISOString().split('T')[0] !== options.userDetails.dateOfBirth) {
                validationErrors.push(`🔴 Invalid date value for dateOfBirth: ${options.userDetails.dateOfBirth}`);
            }
        }
    }

    // Validate financial assessment requirements
    if (options.financialAssessment && !options.employmentStatus) {
        validationErrors.push('🔴 Employment status is required when financial assessment is enabled');
    }

    // Validate MT5 options
    if (options.mt5) {
        if (!options.mt5.password) {
            validationErrors.push('🔴 MT5 password is required when creating MT5 accounts');
        }
        if (!options.mt5.types) {
            validationErrors.push('🔴 MT5 account type(s) must be specified');
        } else if (options.mt5.types !== 'all') {
            const types = Array.isArray(options.mt5.types) ? options.mt5.types : [options.mt5.types];
            const validTypes: MT5AccountType[] = [
                'standard',
                'financial',
                'swap-free',
                'zero-spread',
                'gold',
                'crypto',
            ];
            const invalidTypes = types.filter(t => !validTypes.includes(t));
            if (invalidTypes.length > 0) {
                validationErrors.push(
                    `🔴 Invalid MT5 account type(s): ${invalidTypes.join(', ')}. Must be one of: ${validTypes.join(', ')}, or 'all'`
                );
            }
        }
    }

    // Validate cTrader options
    if (options.ctrader) {
        if (
            options.ctrader !== 'all' &&
            (typeof options.ctrader !== 'number' || options.ctrader < 1 || options.ctrader > 5)
        ) {
            validationErrors.push('🔴 cTrader must be a number between 1 and 5, or "all"');
        }
    }

    // Throw all validation errors together
    if (validationErrors.length > 0) {
        throw new Error(`Account creation validation failed:\n${validationErrors.join('\n')}`);
    }

    // Delegate email generation to DataFactory to ensure a random suffix is included.
    // Prefix 'v2' provides traceability in Mailisk/QA Script Runner logs.
    const finalEmail = options.email ?? DataFactory.generateEmailWithPrefix('v2');

    // Use provided password or default from environment
    const finalPassword = options.password ?? process.env.TEST_PASSWORD;

    if (!finalPassword) {
        throw new Error('Password not provided and TEST_PASSWORD not set in .env file');
    }

    const { qaUrl, qaUsername, qaPassword, qaApiKey } = getQAScriptRunnerCredentials();

    // Build arguments array
    const args: string[] = [
        '--email',
        finalEmail,
        '--password',
        finalPassword,
        '--country',
        country.toLowerCase(),
        '--type',
        type,
        '--apikey',
        qaApiKey,
    ];

    // Add real account specific options
    if (type === 'real') {
        if (options.kyc?.poi) {
            args.push('--poi', options.kyc.poi.status);
            if (options.kyc.poi.rejectionReasons) {
                args.push('--poi_rejection_reasons', options.kyc.poi.rejectionReasons);
            }
        }

        if (options.kyc?.poa) {
            args.push('--poa', options.kyc.poa.status);
            if (options.kyc.poa.rejectionReasons) {
                args.push('--poa_rejection_reasons', options.kyc.poa.rejectionReasons);
            }
        }

        if (options.userDetails?.firstName) {
            args.push('--firstname', options.userDetails.firstName);
        }
        if (options.userDetails?.lastName) {
            args.push('--lastname', options.userDetails.lastName);
        }
        if (options.userDetails?.dateOfBirth) {
            args.push('--dob', options.userDetails.dateOfBirth);
        }
        if (options.userDetails?.phone) {
            args.push('--phone', options.userDetails.phone);
        }
        if (options.userDetails?.address) {
            args.push('--address', options.userDetails.address);
        }
        if (options.userDetails?.city) {
            args.push('--city', options.userDetails.city);
        }

        if (options.tax) {
            args.push('--tax_id', options.tax.id);
            args.push('--tax_residence', options.tax.residence);
        }

        if (options.currency) {
            const currencies = Array.isArray(options.currency) ? options.currency.join(',') : options.currency;
            args.push('--walletCurrency', currencies);
        }

        if (options.trading) {
            args.push('--trading');
        }

        if (options.employmentStatus) {
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
            if (options.mt5.types === 'all') {
                args.push('--mt5', 'all', options.mt5.password);
            } else {
                const types = Array.isArray(options.mt5.types) ? options.mt5.types.join(',') : options.mt5.types;
                args.push('--mt5', types, options.mt5.password);
            }
        }

        if (options.ctrader) {
            args.push('--ctrader', options.ctrader.toString());
        }
    }

    if (options.debug) {
        args.push('--debug');
    }

    const payload = {
        script_name: 'v2_create_account.js',
        args,
    };

    try {
        let response = await callQAScriptRunner(request, qaUrl, qaUsername, qaPassword, payload);

        // Track which email was actually used (may change on retry)
        let actualEmail = finalEmail;

        if (!response.ok()) {
            const firstErrorText = await response.text();

            // Only retry on transient server errors (5xx) with auto-generated email.
            // Client errors (4xx) are deterministic — retrying won't help.
            // User-provided emails skip retry — account may exist server-side despite error.
            const isServerError = response.status() >= 500;
            const canRetry = isServerError && !options.email;

            if (!canRetry) {
                if (options.backupAccount && type === 'real') {
                    const skipReason = options.email ? 'user-provided email' : `client error (${response.status()})`;
                    console.warn(
                        `⚠️ createAccountV2: Failed with ${skipReason} (HTTP ${response.status()}). ` +
                            `Skipping retry — using backup account: ${options.backupAccount}\n  Error: ${firstErrorText}`
                    );
                    return {
                        email: options.backupAccount,
                        password: finalPassword,
                        country,
                        type,
                        response: `Backup account used (no retry for ${skipReason}): ${firstErrorText}`,
                    };
                }
                throw new Error(`Account creation failed (HTTP ${response.status()}, no retry): ${firstErrorText}`);
            }

            // Transient server error (5xx) with auto-generated email — retry once
            console.warn(
                `⚠️ createAccountV2: First attempt failed (HTTP ${response.status()}). ` +
                    `Retrying once after ${RETRY_DELAY_MS}ms delay...\n  Error: ${firstErrorText}`
            );
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));

            // Generate a fresh email for the retry — 'retry' prefix for traceability.
            const retryEmail = DataFactory.generateEmailWithPrefix('retry');
            actualEmail = retryEmail;

            // Replace the email value in the args array by locating the '--email' flag.
            // This is refactor-safe: it finds the flag by name rather than by value/position.
            const retryArgs = [...args];
            const emailFlagIndex = retryArgs.indexOf('--email');
            if (emailFlagIndex === -1 || emailFlagIndex + 1 >= retryArgs.length) {
                throw new Error('createAccountV2 retry: could not locate --email flag in args array');
            }
            retryArgs[emailFlagIndex + 1] = retryEmail;

            const retryPayload = { script_name: 'v2_create_account.js', args: retryArgs };
            response = await callQAScriptRunner(request, qaUrl, qaUsername, qaPassword, retryPayload);

            if (!response.ok()) {
                const retryErrorText = await response.text();

                if (options.backupAccount && type === 'real') {
                    console.warn(
                        `⚠️ Account creation failed after retry. Using backup account: ${options.backupAccount}`
                    );
                    return {
                        email: options.backupAccount,
                        password: finalPassword,
                        country,
                        type,
                        response: `Backup account used due to creation failure after retry: ${retryErrorText}`,
                    };
                }

                throw new Error(`Account creation failed after retry: HTTP ${response.status()} - ${retryErrorText}`);
            }
        }

        const responseText = await response.text();
        console.log(`[✅] Account created successfully: ${actualEmail}`);

        // Extract actual email from response if available (falls back to the email we sent)
        const emailMatch = responseText.match(/Email:\s*([^\s\n]+)/);
        if (emailMatch?.[1]) {
            actualEmail = emailMatch[1];
        }

        // Extract session token from response
        let sessionToken: string | undefined;
        const sessionTokenMatch = responseText.match(/Session Token:\s*([^\s\n]+)/);
        if (sessionTokenMatch?.[1]) {
            sessionToken = sessionTokenMatch[1];
        }

        // Extract client ID from response (real accounts only)
        let clientId: string | undefined;
        if (type === 'real') {
            const clientIdMatch = responseText.match(/client_id['":\s]+([a-f0-9-]{36})/i);
            if (clientIdMatch?.[1]) {
                clientId = clientIdMatch[1];
            }
        }

        // Extract wallet ID from response (real accounts with wallet only)
        let walletId: string | undefined;
        if (type === 'real' && options.currency) {
            const walletIdMatch = responseText.match(/Wallet ID:\s*([^\s\n]+)/);
            if (walletIdMatch?.[1]) {
                walletId = walletIdMatch[1];
            }
        }

        if (!responseText.includes('Account creation completed successfully')) {
            console.warn('⚠️ Success confirmation not found in response - account creation may have issues');
        }

        return {
            email: actualEmail,
            password: finalPassword,
            country,
            type,
            sessionToken,
            clientId,
            walletId,
            response: responseText,
        };
    } catch (error) {
        if (options.backupAccount && type === 'real') {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn(`⚠️ Account creation failed with error. Using backup account: ${options.backupAccount}`);
            console.warn(`Error details: ${errorMessage}`);
            // NOTE: Backup account returns minimal data — sessionToken, clientId, walletId are unavailable.
            // This is a failsafe mechanism to prevent test failures on account creation issues.
            return {
                email: options.backupAccount,
                password: finalPassword,
                country,
                type,
                response: `Backup account used due to error: ${errorMessage}`,
            };
        }

        throw error;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// topupAccount — types & function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Options for topping up a wallet.
 * Either `walletId` OR (`email` + `password`) must be provided.
 */
export interface TopupAccountOptions {
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

    /**
     * Enable debug mode for detailed logging.
     */
    debug?: boolean;
}

/**
 * Result returned from a wallet top-up operation
 */
export interface TopupAccountResult {
    /** Whether the top-up was successful */
    success: boolean;
    /**
     * Wallet ID that was topped up.
     * `undefined` when not provided directly and could not be extracted from the API response.
     */
    walletId: string | undefined;
    /** Amount that was topped up */
    amount: number;
    /** Currency of the top-up */
    currency: string;
    /** Raw response from the API */
    response: string;
}

/**
 * Tops up a wallet with a specified currency and amount via the QA Script Runner Service.
 *
 * ⚠️ STAGING ONLY — never use in production tests.
 *
 * Either `walletId` OR (`email` + `password`) must be provided in options.
 * When email/password are provided, the script logs in and retrieves the wallet ID automatically.
 *
 * @param request - Playwright APIRequestContext for making HTTP requests
 * @param currency - Wallet currency code (e.g., 'USD', 'BTC', 'TRX')
 * @param amount - Amount to top up (must be a positive number)
 * @param options - Wallet identification and optional configuration
 * @returns Promise with top-up result
 *
 * @example
 * // Top up using wallet ID directly
 * const result = await topupAccount(request, 'USD', 1000, {
 *   walletId: '6ba2eeef-2164-44ed-8e62-9921a51a7111'
 * });
 *
 * @example
 * // Top up by logging in with email and password
 * const result = await topupAccount(request, 'USD', 500, {
 *   email: 'user@webapps.mailisk.net',
 *   password: 'MyPassword123!'
 * });
 */
export async function topupAccount(
    request: APIRequestContext,
    currency: string,
    amount: number,
    options: TopupAccountOptions
): Promise<TopupAccountResult> {
    const validationErrors: string[] = [];

    // Validate currency
    if (!currency || currency.trim() === '') {
        validationErrors.push('🔴 Currency is required');
    }

    // Validate amount
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
        validationErrors.push('🔴 Amount must be a positive number');
    }

    // Validate wallet identification — either walletId OR (email + password)
    const hasWalletId = !!options.walletId;
    const hasEmail = !!options.email;
    const hasPassword = !!options.password;

    if (!hasWalletId && !hasEmail) {
        validationErrors.push('🔴 Either walletId OR email (with password) must be provided');
    }

    if (hasEmail && !hasPassword) {
        validationErrors.push('🔴 password is required when email is provided');
    }

    if (hasPassword && !hasEmail) {
        validationErrors.push('🔴 email is required when password is provided');
    }

    // Warn when both identifiers are provided so the caller knows which one wins
    if (hasWalletId && hasEmail) {
        console.warn(
            '⚠️ topupAccount: Both walletId and email provided — walletId takes precedence. email/password will be ignored.'
        );
    }

    if (validationErrors.length > 0) {
        throw new Error(`topupAccount validation failed:\n${validationErrors.join('\n')}`);
    }

    const { qaUrl, qaUsername, qaPassword, qaApiKey } = getQAScriptRunnerCredentials();

    // Build arguments array — wallet_id takes precedence over email/password
    const args: string[] = ['--apikey', qaApiKey, '--currency', currency, '--amount', String(amount)];

    if (options.walletId) {
        args.push('--wallet_id', options.walletId);
    } else {
        // NOTE: email and password are guaranteed to be defined here due to validation above
        if (!options.email || !options.password) {
            throw new Error('Email and password are required but not provided');
        }
        args.push('--email', options.email, '--password', options.password);
    }

    if (options.debug) {
        args.push('--debug');
    }

    const payload = {
        script_name: 'v2_topup.js',
        args,
    };

    const response = await callQAScriptRunner(request, qaUrl, qaUsername, qaPassword, payload);

    if (!response.ok()) {
        const errorText = await response.text();
        throw new Error(`Wallet top-up failed: HTTP ${response.status()} - ${errorText}`);
    }

    const responseText = await response.text();

    if (!responseText.includes('Top-up completed successfully!')) {
        console.warn(
            '⚠️ topupAccount: Success confirmation not found in response — the script may have failed despite HTTP 200. Check response for details.'
        );
    }

    console.log(`✅ Wallet topped up successfully: ${amount} ${currency}`);

    // Extract wallet ID from response if not provided directly.
    // Use options.walletId only when it is a non-empty string to avoid returning '' as a resolved ID.
    // Remains undefined if the regex does not match — callers must handle this case.
    const providedWalletId = options.walletId && options.walletId.trim() !== '' ? options.walletId : undefined;
    let resolvedWalletId: string | undefined = providedWalletId;
    if (!resolvedWalletId) {
        const walletIdMatch = responseText.match(/Wallet ID:\s*([^\s\n]+)/);
        resolvedWalletId = walletIdMatch?.[1];
    }

    return {
        success: true,
        walletId: resolvedWalletId,
        amount,
        currency,
        response: responseText,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// changePoiPoaStatus — types & function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POI configuration for changePoiPoaStatus
 */
export interface PoiConfig {
    /** POI status to set */
    status: POIStatus;
    /**
     * A single rejection reason string.
     * Required when status is 'rejected'.
     * Valid values: 'NAME_MISMATCH', 'EXPIRED', 'DOB_MISMATCH'
     */
    rejectionReasons?: string;
}

/**
 * POA configuration for changePoiPoaStatus
 */
export interface PoaConfig {
    /** POA status to set */
    status: POAStatus;
    /**
     * A single rejection reason string.
     * Required when status is 'rejected'.
     * Valid value: 'ADDRESS_MISMATCH'
     */
    rejectionReasons?: string;
}

/**
 * Options for changing POI/POA status.
 * Either `clientId` OR (`email` + `password`) must be provided.
 * At least one of `poi` or `poa` must be specified.
 */
export interface ChangePoiPoaOptions {
    /**
     * Client UUID to update directly.
     * Takes precedence over email/password if both are provided.
     */
    clientId?: string;

    /**
     * Email of the account to log in and retrieve the client ID.
     * Required when clientId is not provided.
     */
    email?: string;

    /**
     * Password of the account.
     * Required when email is provided.
     */
    password?: string;

    /**
     * POI (Proof of Identity) configuration.
     * At least one of poi or poa must be provided.
     */
    poi?: PoiConfig;

    /**
     * POA (Proof of Address) configuration.
     * At least one of poi or poa must be provided.
     */
    poa?: PoaConfig;

    /**
     * Enable debug mode for detailed logging.
     */
    debug?: boolean;
}

/**
 * Result returned from a POI/POA status change operation
 */
export interface ChangePoiPoaResult {
    /** Whether the operation was successful */
    success: boolean;
    /**
     * Client ID that was updated.
     * `undefined` when not provided directly and could not be extracted from the API response.
     */
    clientId: string | undefined;
    /** POI status that was set (if applicable) */
    poiStatus?: POIStatus;
    /** POA status that was set (if applicable) */
    poaStatus?: POAStatus;
    /** Raw response from the API */
    response: string;
}

/**
 * Updates POI (Proof of Identity) and/or POA (Proof of Address) status for an existing account
 * via the QA Script Runner Service.
 *
 * ⚠️ STAGING ONLY — never use in production tests.
 *
 * Either `clientId` OR (`email` + `password`) must be provided in options.
 * At least one of `poi` or `poa` must be specified.
 *
 * @param request - Playwright APIRequestContext for making HTTP requests
 * @param options - Client identification, POI/POA configuration, and optional settings
 * @returns Promise with the result of the status change
 *
 * @example
 * // Set POI to approved using client ID
 * const result = await changePoiPoaStatus(request, {
 *   clientId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 *   poi: { status: 'approved' }
 * });
 *
 * @example
 * // Set both POI and POA using email/password
 * const result = await changePoiPoaStatus(request, {
 *   email: 'user@webapps.mailisk.net',
 *   password: 'MyPassword123!',
 *   poi: { status: 'approved' },
 *   poa: { status: 'approved' }
 * });
 *
 * @example
 * // Set POI to rejected with a reason
 * const result = await changePoiPoaStatus(request, {
 *   email: 'user@webapps.mailisk.net',
 *   password: 'MyPassword123!',
 *   poi: {
 *     status: 'rejected',
 *     rejectionReasons: 'NAME_MISMATCH'
 *   }
 * });
 *
 * @example
 * // Set POA to rejected with reason
 * const result = await changePoiPoaStatus(request, {
 *   email: 'user@webapps.mailisk.net',
 *   password: 'MyPassword123!',
 *   poa: {
 *     status: 'rejected',
 *     rejectionReasons: 'ADDRESS_MISMATCH'
 *   }
 * });
 */
export async function changePoiPoaStatus(
    request: APIRequestContext,
    options: ChangePoiPoaOptions
): Promise<ChangePoiPoaResult> {
    const validationErrors: string[] = [];

    // Validate client identification — either clientId OR (email + password)
    const hasClientId = !!options.clientId;
    const hasEmail = !!options.email;
    const hasPassword = !!options.password;

    if (!hasClientId && !hasEmail) {
        validationErrors.push('🔴 Either clientId OR email (with password) must be provided');
    }

    if (hasEmail && !hasPassword) {
        validationErrors.push('🔴 password is required when email is provided');
    }

    if (hasPassword && !hasEmail) {
        validationErrors.push('🔴 email is required when password is provided');
    }

    // Warn when both identifiers are provided so the caller knows which one wins
    if (hasClientId && hasEmail) {
        console.warn(
            '⚠️ changePoiPoaStatus: Both clientId and email provided — clientId takes precedence. email/password will be ignored.'
        );
    }

    // Validate at least one of POI or POA is specified
    if (!options.poi && !options.poa) {
        validationErrors.push('🔴 At least one of poi or poa must be provided');
    }

    // Validate POI state if provided
    if (options.poi) {
        if (!['approved', 'rejected'].includes(options.poi.status)) {
            validationErrors.push('🔴 POI status must be "approved" or "rejected"');
        }
        if (options.poi.status === 'rejected' && !options.poi.rejectionReasons) {
            validationErrors.push('🔴 POI rejectionReasons is required when status is "rejected"');
        }
    }

    // Validate POA state if provided
    if (options.poa) {
        if (!['approved', 'rejected'].includes(options.poa.status)) {
            validationErrors.push('🔴 POA status must be "approved" or "rejected"');
        }
        if (options.poa.status === 'rejected' && !options.poa.rejectionReasons) {
            validationErrors.push('🔴 POA rejectionReasons is required when status is "rejected"');
        }
    }

    if (validationErrors.length > 0) {
        throw new Error(`changePoiPoaStatus validation failed:\n${validationErrors.join('\n')}`);
    }

    const { qaUrl, qaUsername, qaPassword, qaApiKey } = getQAScriptRunnerCredentials();

    // Build arguments array — client_id takes precedence over email/password
    const args: string[] = ['--apikey', qaApiKey];

    if (options.clientId) {
        args.push('--client_id', options.clientId);
    } else {
        // NOTE: email and password are guaranteed to be defined here due to validation above
        if (!options.email || !options.password) {
            throw new Error('Email and password are required but not provided');
        }
        args.push('--email', options.email, '--password', options.password);
    }

    // Add POI parameters if provided
    if (options.poi) {
        args.push('--poi', options.poi.status);
        if (options.poi.rejectionReasons) {
            args.push('--poi_rejection_reasons', options.poi.rejectionReasons);
        }
    }

    // Add POA parameters if provided
    if (options.poa) {
        args.push('--poa', options.poa.status);
        if (options.poa.rejectionReasons) {
            args.push('--poa_rejection_reasons', options.poa.rejectionReasons);
        }
    }

    if (options.debug) {
        args.push('--debug');
    }

    const payload = {
        script_name: 'v2_poi_poa.js',
        args,
    };

    const response = await callQAScriptRunner(request, qaUrl, qaUsername, qaPassword, payload);

    if (!response.ok()) {
        const errorText = await response.text();
        throw new Error(`POI/POA status change failed: HTTP ${response.status()} - ${errorText}`);
    }

    const responseText = await response.text();

    if (!responseText.includes('POI/POA status update completed successfully!')) {
        console.warn(
            '⚠️ changePoiPoaStatus: Success confirmation not found in response — the script may have failed despite HTTP 200. Check response for details.'
        );
    }

    console.log('✅ POI/POA status updated successfully');

    // Extract client ID from response if not provided directly.
    // Remains undefined if the regex does not match — callers must handle this case.
    let resolvedClientId: string | undefined = options.clientId;
    if (!resolvedClientId) {
        const clientIdMatch = responseText.match(/Client ID:\s*([^\s\n]+)/i);
        resolvedClientId = clientIdMatch?.[1];
    }

    return {
        success: true,
        clientId: resolvedClientId,
        poiStatus: options.poi?.status,
        poaStatus: options.poa?.status,
        response: responseText,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reads and validates QA Script Runner credentials from environment variables.
 * Throws a descriptive error if any required variable is missing.
 *
 * @returns Object containing all required QA Script Runner credentials
 * @throws Error if any required environment variable is missing
 */
function getQAScriptRunnerCredentials(): {
    qaUrl: string;
    qaUsername: string;
    qaPassword: string;
    qaApiKey: string;
} {
    const qaUrl = process.env.QA_SCRIPT_RUNNER_URL;
    const qaUsername = process.env.QA_SCRIPT_RUNNER_USERNAME;
    const qaPassword = process.env.QA_SCRIPT_RUNNER_PASSWORD;

    // MAILISK_API_KEY is intentionally reused as --apikey for all QA scripts.
    // The scripts use this key for payload decryption, not as a separate QA service credential.
    // Both services share the same key by design. If the Mailisk key is rotated, update QA scripts too.
    const qaApiKey = process.env.MAILISK_API_KEY;

    if (!qaUrl || !qaUsername || !qaPassword || !qaApiKey) {
        throw new Error(
            'Missing QA Script Runner credentials in .env file. ' +
                'Required: QA_SCRIPT_RUNNER_URL, QA_SCRIPT_RUNNER_USERNAME, ' +
                'QA_SCRIPT_RUNNER_PASSWORD, MAILISK_API_KEY'
        );
    }

    return { qaUrl, qaUsername, qaPassword, qaApiKey };
}

/**
 * Sends a POST request to the QA Script Runner API with Basic Auth.
 * Properly encodes special characters in credentials for Basic Authentication.
 *
 * @param request - Playwright APIRequestContext
 * @param qaUrl - QA Script Runner base URL
 * @param qaUsername - Basic auth username
 * @param qaPassword - Basic auth password (may contain special characters)
 * @param payload - Request body containing script_name and args
 * @returns Playwright APIResponse
 */
async function callQAScriptRunner(
    request: APIRequestContext,
    qaUrl: string,
    qaUsername: string,
    qaPassword: string,
    payload: { script_name: string; args: string[] }
): ReturnType<APIRequestContext['post']> {
    // Properly encode credentials for Basic Auth
    // RFC 7617 requires credentials to be Base64 encoded, but special chars in passwords
    // need to be handled correctly before Base64 encoding
    const credentials = `${qaUsername}:${qaPassword}`;
    const authBuffer = Buffer.from(credentials, 'utf8').toString('base64');

    // Debug logging removed to keep output clean during test runs

    return request.post(qaUrl, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${authBuffer}`,
        },
        data: payload,
        timeout: 120000,
    });
}
