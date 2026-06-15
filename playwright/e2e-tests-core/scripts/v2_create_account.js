#!/usr/bin/env node
/**
 * Deriv Signup Automation Script
 *
 * This script automates the complete signup process for Deriv accounts.
 * It defaults to staging, with an explicit production mode for account creation
 * without internal test wallet top-up helpers.
 * Includes email verification using Mailisk API and creation of demo or real accounts.
 *
 * Usage:
 * - Requires --apikey or MAILISK_API_KEY
 * - Accepts email, password, country code, and account type as parameters
 */

const ENVIRONMENT_CONFIGS = {
    staging: {
        derivApiBase: 'https://staging-api-core.deriv.com/v1',
        oryAuthBase: 'https://staging-auth.deriv.com/self-service',
        landingPageUrl: 'https://staging-home.deriv.com/dashboard/',
        apiCoreHost: 'staging-api-core.deriv.com',
        m2mAuthUrl: 'https://staging-deriv-m2m-auth.auth.us-east-1.amazoncognito.com/oauth2/token',
        m2mAuthHost: 'staging-deriv-m2m-auth.auth.us-east-1.amazoncognito.com',
        allowInternalTestHelpers: true,
    },
    production: {
        derivApiBase: 'https://api-core.deriv.com/v1',
        oryAuthBase: 'https://auth.deriv.com/self-service',
        landingPageUrl: 'https://home.deriv.com/dashboard/',
        apiCoreHost: 'api-core.deriv.com',
        m2mAuthUrl: null,
        m2mAuthHost: null,
        allowInternalTestHelpers: false,
    },
};

let ACTIVE_ENVIRONMENT = 'staging';
let ACTIVE_ENVIRONMENT_CONFIG = ENVIRONMENT_CONFIGS.staging;
let DERIV_API_BASE = ACTIVE_ENVIRONMENT_CONFIG.derivApiBase;
let ORY_AUTH_BASE = ACTIVE_ENVIRONMENT_CONFIG.oryAuthBase;

const WALLETS_INTERNAL_TEST_URL = 'https://xano-prod.deriv.cloud/tenant/tfek-t9ct-1ca0/api:tN1Ud5uD';
const OPTIONS_INTERNAL_TEST_URL = 'https://xano-prod.deriv.cloud/tenant/tgu1-pmpw-a374/api:_aL0wUZD';

// Wait (in ms) inserted after setPassword() completes and before the first
// PUT /client/profile call (updatePersonalDetails). Lets the ORY session
// settle so the profile update isn't rejected on a freshly-set password.
// Adjust this single value to tune timing for the whole flow.
const WAIT_MS_BEFORE_PROFILE_UPDATE = 10000;

// Retry behaviour for PUT /client/profile (updatePersonalDetails).
// Total attempts = 1 initial + (MAX_PROFILE_UPDATE_ATTEMPTS - 1) retries.
// Retries are triggered ONLY on 5xx responses (transient backend errors).
// 4xx responses (validation failures) are treated as permanent and fail fast.
const MAX_PROFILE_UPDATE_ATTEMPTS = 4;
const PROFILE_UPDATE_RETRY_DELAY_MS = 2500;

// Debug flag - will be set via command line arguments
let DEBUG_MODE = false;

function normalizeEnvironment(environment) {
    const value = (environment || 'staging').toLowerCase();
    if (value === 'prod') {
        return 'production';
    }
    if (value === 'stage') {
        return 'staging';
    }
    return value;
}

function configureEnvironment(environment) {
    const normalizedEnvironment = normalizeEnvironment(environment);
    const config = ENVIRONMENT_CONFIGS[normalizedEnvironment];

    if (!config) {
        throw new Error(`Invalid environment "${environment}". Use "staging" or "production".`);
    }

    ACTIVE_ENVIRONMENT = normalizedEnvironment;
    ACTIVE_ENVIRONMENT_CONFIG = config;
    DERIV_API_BASE = config.derivApiBase;
    ORY_AUTH_BASE = config.oryAuthBase;
}

function assertInternalTestHelpersAllowed(operationName) {
    if (!ACTIVE_ENVIRONMENT_CONFIG.allowInternalTestHelpers) {
        throw new Error(
            `${operationName} is disabled in production. Production account creation must not use internal test top-up/KYC helpers.`
        );
    }
}

function applyProductionSafety(args) {
    if (ACTIVE_ENVIRONMENT_CONFIG.allowInternalTestHelpers) {
        return;
    }

    if (args.poi || args.poa) {
        throw new Error(
            'POI/POA automation is disabled in production because it uses staging-only internal KYC helpers.'
        );
    }

    if (args.trading) {
        console.warn(
            '⚠️ Production mode: --trading was requested, but Options direct top-up is disabled. Continuing without trading top-up.'
        );
        args.trading = false;
    }

    if (args.topup_amount) {
        console.warn('⚠️ Production mode: --topup_amount will be ignored because wallet top-up is disabled.');
    }
}

/**
 * Debug logging utility - only logs when DEBUG_MODE is true
 */
const debug = {
    log: (message, data = null) => {
        if (DEBUG_MODE) {
            console.log(`🔍 DEBUG: ${message}`);
            if (data) {
                console.log(JSON.stringify(data, null, 2));
            }
        }
    },

    apiRequest: (method, url, headers = {}, body = null) => {
        if (DEBUG_MODE) {
            console.log('\n🔷 API REQUEST:');
            console.log(`📡 ${method} ${url}`);
            console.log('📋 Headers:');
            console.log(JSON.stringify(headers, null, 2));
            if (body) {
                console.log('📦 Body:');
                console.log(JSON.stringify(body, null, 2));
            }
            console.log('-----------------------------------');
        }
    },

    apiResponse: (status, statusText, headers = {}, body = null) => {
        if (DEBUG_MODE) {
            console.log('\n🔶 API RESPONSE:');
            console.log(`📊 Status: ${status} ${statusText}`);
            console.log('📋 Headers:');
            console.log(JSON.stringify(Object.fromEntries(headers.entries()), null, 2));
            if (body) {
                console.log('📦 Body:');
                console.log(JSON.stringify(body, null, 2));
            }
            console.log('-----------------------------------');
        }
    },
};

/**
 * Enhanced fetch function with debug logging
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} - Fetch response
 */
async function debugFetch(url, options = {}) {
    const method = options.method || 'GET';
    const headers = options.headers || {};
    const body = options.body;

    // Log request details if debug mode is enabled
    let parsedBody = null;
    if (body) {
        try {
            // Try to parse as JSON first
            parsedBody = JSON.parse(body);
        } catch (e) {
            // If not JSON, it might be form data or other format
            parsedBody = body.toString();
        }
    }
    debug.apiRequest(method, url, headers, parsedBody);

    // Perform the actual fetch
    const response = await fetch(url, options);

    // Clone the response to read it twice (once for logging, once for the caller)
    const responseClone = response.clone();

    // Try to parse response as JSON for logging
    let responseBody;
    try {
        responseBody = await responseClone.json();
    } catch (e) {
        // If not JSON, get as text
        try {
            responseBody = await responseClone.text();
            // Try to parse as JSON if it looks like JSON
            if (responseBody.trim().startsWith('{') || responseBody.trim().startsWith('[')) {
                responseBody = JSON.parse(responseBody);
            }
        } catch (textError) {
            responseBody = 'Unable to parse response body';
        }
    }

    // Log response details if debug mode is enabled
    debug.apiResponse(response.status, response.statusText, response.headers, responseBody);

    return response;
}

// Encrypted M2M credentials (AES-256-CBC with PBKDF2)
// Encrypt by using OpenSSL command:
// echo -n "your_text_here" | openssl enc -aes-256-cbc -a -salt -pbkdf2 -pass pass:your_passphrase
const ENCRYPTED_M2M_CREDENTIALS = {
    client_id: 'U2FsdGVkX1/S8iIuaEyD+h4HacR/i6Mn6prGnWTkAXlOklBrtOATtVxGMhhlGsP9',
    client_secret:
        'U2FsdGVkX1/znGMrtr8srRv57fe/4+8Y5TTj1qEBWor3sFIUocmoSpvqlIpte91NvjUf0UskO+CcUMOAqtsRp3PX1qkZ47jg0OfI3kTcfnk=',
};

// Encrypted KYC API credentials (AES-256-CBC with PBKDF2)
const ENCRYPTED_KYC_CREDENTIALS = {
    client_id: 'U2FsdGVkX1/Ub89PvKbVO8D2UYau5q51GYdhGAUI+PFa6ZmgXEPmflcQskWbxCeA',
    client_secret:
        'U2FsdGVkX19wBDDD8gZy/29AvIPdqy3VKdzuQ49vvP5oI8qQp4XxfJdu1Bv14KIL3lUip3o1ynRYvKuYfjOk6u4J3sPYjcXSdooJlF8movM=',
};

/**
 * Decrypt credentials using OpenSSL command
 * @param {string} encryptedData - Base64 encrypted data
 * @param {string} passphrase - Decryption key
 * @returns {Promise<string>} Decrypted text
 */
async function decryptCredential(encryptedData, passphrase) {
    const { execSync } = require('child_process');

    // Check if this is a placeholder value
    if (encryptedData.includes('PLACEHOLDER')) {
        throw new Error(
            `Cannot decrypt placeholder value: ${encryptedData}. Please replace with actual encrypted credentials.`
        );
    }

    try {
        const command = `echo "${encryptedData}" | openssl enc -aes-256-cbc -a -d -salt -pbkdf2 -pass pass:${passphrase}`;
        const result = execSync(command, { encoding: 'utf8' });
        return result.trim();
    } catch (error) {
        throw new Error(`Failed to decrypt credential: ${error.message}`);
    }
}

/**
 * Generate a random email address using Mailisk domains
 * @returns {string} Random email address
 */
function generateRandomEmail() {
    const domain = 'webapps.mailisk.net';

    // Generate random username (8-12 characters)
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const usernameLength = 8 + Math.floor(Math.random() * 5); // 8-12 characters
    let username = '';

    for (let i = 0; i < usernameLength; i++) {
        username += chars[Math.floor(Math.random() * chars.length)];
    }

    return `${username}@${domain}`;
}

/**
 * Generate a random name with at least one vowel
 * @returns {string} Random name
 */
function generateRandomName() {
    const consonants = 'bcdfghjklmnpqrstvwxyz';
    const vowels = 'aeiou';
    const length = 5 + Math.floor(Math.random() * 5); // 5-9 characters

    let name = '';
    for (let i = 0; i < length; i++) {
        if (i === 1 || Math.random() > 0.7) {
            name += vowels[Math.floor(Math.random() * vowels.length)];
        } else {
            name += consonants[Math.floor(Math.random() * consonants.length)];
        }
    }

    return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Generate random phone number for Malaysia
 * @returns {string} Random Malaysian phone number
 */
function generateRandomPhone() {
    const randomDigits = Math.floor(100000000 + Math.random() * 900000000);
    return randomDigits.toString();
}

/**
 * Generate random address
 * @returns {string} Random address
 */
function generateRandomAddress() {
    const streetNumber = Math.floor(1 + Math.random() * 9999);
    const streets = ['Main St', 'Oak Ave', 'Park Rd', 'Elm St', 'Market St', 'River Rd'];
    return `${streetNumber} ${streets[Math.floor(Math.random() * streets.length)]}`;
}

/**
 * Generate random city name
 * @returns {string} Random city
 */
function generateRandomCity() {
    const cities = ['Springfield', 'Riverside', 'Greenville', 'Madison', 'Franklin', 'Clinton'];
    return cities[Math.floor(Math.random() * cities.length)];
}

/**
 * Get date 18-40 years ago in YYYY-MM-DD format
 * Ensures the person is at least 18 years old TODAY
 * @returns {string} Random date of birth
 */
function generateRandomDOB() {
    const today = new Date();
    const yearsAgo = 18 + Math.floor(Math.random() * 22); // 18-40 years ago

    // Create a date that's exactly yearsAgo years before today
    const birthDate = new Date(today);
    birthDate.setFullYear(today.getFullYear() - yearsAgo);

    // Subtract one more day to ensure they're definitely 18+ years old
    birthDate.setDate(birthDate.getDate() - 1);

    const year = birthDate.getFullYear();
    const month = birthDate.getMonth() + 1; // getMonth() returns 0-11
    const day = birthDate.getDate();

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Get current date in YYYY-MM-DD format
 * @returns {string} Current date
 */
function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Step 0: Check if country is client enabled
 * @param {string} countryCode - 2-letter country code (e.g., 'ar', 'my')
 * @returns {Promise<Object>} Country validation result
 */
async function validateCountryEnabled(countryCode) {
    const url = `${DERIV_API_BASE}/countries`;

    console.log(`🌍 Validating country: ${countryCode}...`);
    debug.log(`Checking if country ${countryCode} is client enabled`);

    const response = DEBUG_MODE ? await debugFetch(url, { method: 'GET' }) : await fetch(url, { method: 'GET' });

    if (!response.ok) {
        throw new Error(`Failed to fetch countries list: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Validate response structure
    if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid response format from countries API');
    }

    // Find the country in the list using alpha2 field
    const country = data.data.find(c => c.alpha2 && c.alpha2.toLowerCase() === countryCode.toLowerCase());

    if (!country) {
        console.error(`❌ Country not found: ${countryCode}`);
        throw new Error(`Country not supported for v2: ${countryCode}`);
    }

    // Check if country is client enabled
    if (!country.client_enabled) {
        console.error(`❌ Country not client enabled: ${countryCode}`);
        throw new Error(`Country not supported for v2: ${countryCode}`);
    }

    console.log(`✅ Country ${countryCode} is client enabled`);
    debug.log('Country validation passed', {
        code: country.alpha2,
        name: country.name,
        client_enabled: country.client_enabled,
    });

    return {
        success: true,
        country: country,
    };
}

/**
 * Step 1: Initialize ORY signup flow
 * @returns {Promise<string>} Signup flow ID
 */
async function initializeORYSignupFlow() {
    const url = `${ORY_AUTH_BASE}/registration/api`;

    console.log('🔗 Initializing ORY signup flow...');
    debug.log('Requesting signup flow initialization');

    const response = DEBUG_MODE ? await debugFetch(url, { method: 'GET' }) : await fetch(url, { method: 'GET' });

    if (!response.ok) {
        throw new Error(`Failed to initialize ORY signup flow: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.id) {
        // console.log(`✅ Signup Flow ID: ${data.id}`);
        return data.id;
    } else {
        console.error('❌ ORY signup flow initialization failed:', data);
        throw new Error('Failed to get signup flow ID');
    }
}

/**
 * Step 2: Register new account using ORY
 * @param {string} signupFlowId - Signup flow ID from ORY initialization
 * @param {string} email - Email address for signup
 * @param {string} countryCode - 2-letter country code (e.g., 'al')
 * @returns {Promise<Object>} Response data
 */
async function signupWithORY(signupFlowId, email, countryCode) {
    const url = `${ORY_AUTH_BASE}/registration?flow=${signupFlowId}`;
    const signupData = {
        method: 'code',
        traits: {
            email: email,
        },
        transient_payload: {
            cor: countryCode,
            lang: 'en',
            tracking_data: {
                utm_data: {
                    utm_source: 'api_automation',
                },
                date_first_contact: getCurrentDate(),
                signup_device: 'api',
                landing_page_url: ACTIVE_ENVIRONMENT_CONFIG.landingPageUrl,
            },
        },
    };

    console.log('📝 Sending ORY signup request...');
    debug.log('Signup data prepared', signupData);

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(signupData),
    };

    const response = DEBUG_MODE ? await debugFetch(url, options) : await fetch(url, options);

    // Handle empty or non-JSON responses
    const responseText = await response.text();
    if (!responseText.trim()) {
        console.error('❌ ORY signup failed: Empty response from server');
        console.error(`❌ Response status: ${response.status} ${response.statusText}`);
        throw new Error('ORY signup failed: Empty response from server');
    }

    let data;
    try {
        data = JSON.parse(responseText);
    } catch (jsonError) {
        console.error('❌ ORY signup failed: Invalid JSON response');
        console.error(`❌ Response status: ${response.status} ${response.statusText}`);
        console.error(`❌ Response text: ${responseText}`);
        throw new Error('ORY signup failed: Invalid JSON response');
    }

    // ORY returns status 400 with success message - this is expected behavior
    // Messages are located in data.ui.messages
    if (response.status === 400 && data.ui && data.ui.messages && data.ui.messages.length > 0) {
        // Look specifically for the success message
        const successMessage = data.ui.messages.find(
            msg =>
                msg.text ===
                'A code has been sent to the address(es) you provided. If you have not received a message, check the spelling of the address and retry the registration.'
        );

        if (successMessage) {
            console.log('✅ ORY signup completed - Verification email sent');
            return { success: true, flow_id: signupFlowId, message: successMessage.text, response: data };
        }

        // If the exact message not found, log what we got for debugging
        console.log(
            '🔍 ORY Messages received:',
            data.ui.messages.map(m => `${m.type}: ${m.text}`)
        );
    }

    console.error('❌ ORY signup failed:', data);
    console.error(`❌ Expected status 400 with messages, got status ${response.status}`);
    console.error('❌ Full response:', JSON.stringify(data, null, 2));
    throw new Error('ORY signup failed');
}

/**
 * Combined ORY signup process (Step 1 + 2)
 * @param {string} email - Email address for signup
 * @param {string} countryCode - 2-letter country code (e.g., 'al')
 * @returns {Promise<Object>} Response data with flow ID
 */
async function signup(email, countryCode) {
    debug.log(`Starting signup process for ${email} from ${countryCode}`);
    const signupFlowId = await initializeORYSignupFlow();
    const result = await signupWithORY(signupFlowId, email, countryCode);
    return result;
}

/**
 * Determine the Mailisk namespace based on the email
 * @param {string} email - Email address
 * @returns {string} Mailisk namespace ('mobileapps' or 'webapps')
 * @throws {Error} If email is not from a valid Mailisk domain
 */
function determineMailiskNamespace(email) {
    if (email.includes('@webapps.mailisk.net')) {
        return 'webapps';
    }
    if (email.includes('@mobileapps.mailisk.net')) {
        return 'mobileapps';
    }
    if (email.includes('@kycreject.mailisk.net')) {
        return 'kycreject';
    }
    throw new Error('Email must use webapps.mailisk.net, mobileapps.mailisk.net, or kycreject.mailisk.net domain');
}

/**
 * Step 3: Retrieve OTP from Mailisk
 * @param {string} email - Email address to check
 * @param {string} apiKey - Mailisk API key
 * @param {number} signupTimestamp - Unix timestamp of when signup was initiated (optional)
 * @returns {Promise<string>} 6-digit OTP code
 */
async function getOTPFromMailisk(email, apiKey, signupTimestamp = null) {
    const emailPrefix = email.split('@')[0];
    const mailiskNamespace = determineMailiskNamespace(email);

    const mailiskUrl =
        `https://api.mailisk.com/api/emails/${mailiskNamespace}/inbox` +
        `?to_addr_prefix=${encodeURIComponent(emailPrefix)}` +
        `&from_addr_includes=no-reply@deriv.com` +
        // TODO: Uncomment and update subject filter once email subject is finalized
        // `&subject_includes=your+one-time+code` +
        `&limit=1` +
        `&wait=true` +
        `&from_timestamp=${signupTimestamp}`;

    console.log('📩 Fetching OTP from Mailisk...');
    console.log('⏳ Waiting for email (this may take 30-60 seconds)...');
    debug.log(`Checking Mailisk for emails to ${emailPrefix}@${mailiskNamespace}.mailisk.net`);

    const options = {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            'X-Api-Key': apiKey,
        },
    };

    const response = DEBUG_MODE ? await debugFetch(mailiskUrl, options) : await fetch(mailiskUrl, options);

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error(
                'Mailisk API request failed: 401 Unauthorized. The value passed via --apikey/--mailisk_api_key must be a valid Mailisk API key for reading OTP emails.'
            );
        }
        throw new Error(`Mailisk API request failed: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.data && data.data.length > 0) {
        const latestEmail = data.data[0];
        // Check both text and html fields, and also the subject line
        const bodyText = latestEmail.text || '';
        const bodyHtml = latestEmail.html || '';
        const subject = latestEmail.subject || '';
        const combinedContent = `${subject} ${bodyText} ${bodyHtml}`;

        debug.log('Email received', {
            id: latestEmail.id,
            subject: latestEmail.subject,
            from: latestEmail.from?.address || latestEmail.from_addr,
            received_timestamp: latestEmail.received_timestamp,
            received_date: new Date(latestEmail.received_timestamp * 1000).toISOString(),
        });

        // Robust regex to find any 6-digit numeric code
        // \b ensures word boundary, \d{6} matches exactly 6 digits, \b ensures word boundary
        const match = combinedContent.match(/\b\d{6}\b/);
        if (match) {
            console.log(`✅ OTP extracted: ${match[0]}`);
            return match[0];
        } else {
            debug.log('Email subject:', subject);
            debug.log('Email text body:', bodyText.substring(0, 500));
            debug.log('Email html body:', bodyHtml.substring(0, 500));
            throw new Error('❌ No 6-digit OTP code found in email');
        }
    } else {
        throw new Error('❌ No emails found with given filters');
    }
}

/**
 * Step 4: Verify email with OTP using ORY
 * @param {string} signupFlowId - Signup flow ID from ORY initialization
 * @param {string} email - Email address
 * @param {string} otp - 6-digit OTP code
 * @param {string} countryCode - 2-letter country code (e.g., 'al')
 * @returns {Promise<Object>} Response data with session_token
 */
async function verifyEmailWithORY(signupFlowId, email, otp, countryCode) {
    const url = `${ORY_AUTH_BASE}/registration?flow=${signupFlowId}`;
    const verifyData = {
        code: otp,
        method: 'code',
        traits: {
            email: email,
        },
        transient_payload: {
            cor: countryCode,
        },
    };

    console.log('🔐 Verifying email with OTP using ORY...');
    debug.log(`Using OTP: ${otp} for flow: ${signupFlowId}`);

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(verifyData),
    };

    const response = DEBUG_MODE ? await debugFetch(url, options) : await fetch(url, options);

    const data = await response.json();

    if (response.ok && response.status === 200 && data.session_token) {
        console.log('✅ Email verified successfully with ORY');
        debug.log('Session token obtained', { token_length: data.session_token.length });
        return {
            success: true,
            session_token: data.session_token,
            response: data,
        };
    } else {
        console.error('❌ ORY email verification failed:', data);
        console.error(`❌ Expected status 200 with session_token, got status ${response.status}`);
        throw new Error('ORY email verification failed');
    }
}

/**
 * Step 5: Set password for the account using ORY
 * @param {string} sessionToken - Session token from email verification
 * @param {string} password - Password to set
 * @returns {Promise<Object>} Response data
 */
async function setPassword(sessionToken, password) {
    console.log('🔒 Setting password with ORY...');
    debug.log('Requesting password flow ID');

    try {
        // Step 1: Get password flow ID
        const settingsUrl = `${ORY_AUTH_BASE}/settings/api`;
        const settingsOptions = {
            method: 'GET',
            headers: {
                'X-Session-Token': sessionToken,
            },
        };

        const settingsResponse = DEBUG_MODE
            ? await debugFetch(settingsUrl, settingsOptions)
            : await fetch(settingsUrl, settingsOptions);

        if (!settingsResponse.ok) {
            throw new Error(
                `Failed to get password flow ID: ${settingsResponse.status} ${settingsResponse.statusText}`
            );
        }

        const settingsText = await settingsResponse.text();
        if (!settingsText.trim()) {
            throw new Error('Empty response from password flow ID endpoint');
        }

        let settingsData;
        try {
            settingsData = JSON.parse(settingsText);
        } catch (jsonError) {
            throw new Error(`Invalid JSON response: ${jsonError.message}`);
        }

        if (!settingsData.id) {
            throw new Error('Password flow ID not found in response');
        }

        const passwordFlowId = settingsData.id;
        debug.log(`Password flow ID obtained: ${passwordFlowId}`);

        // Step 2: Set the password
        debug.log('Setting password');
        const passwordUrl = `${ORY_AUTH_BASE}/settings?flow=${passwordFlowId}`;
        const passwordOptions = {
            method: 'POST',
            headers: {
                'X-Session-Token': sessionToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                method: 'password',
                password: password,
            }),
        };

        const passwordResponse = DEBUG_MODE
            ? await debugFetch(passwordUrl, passwordOptions)
            : await fetch(passwordUrl, passwordOptions);

        const passwordText = await passwordResponse.text();
        if (!passwordText.trim()) {
            throw new Error('Empty response from password setup endpoint');
        }

        let passwordData;
        try {
            passwordData = JSON.parse(passwordText);
        } catch (jsonError) {
            throw new Error(`Invalid JSON response: ${jsonError.message}`);
        }

        if (!passwordResponse.ok) {
            let errorMessage = `Password setup failed: ${passwordResponse.status} ${passwordResponse.statusText}`;

            // Extract error messages from ORY response
            const detailedErrors = [];

            // Check ui.messages and ui.nodes for error messages
            passwordData?.ui?.messages
                ?.filter(msg => msg.type === 'error')
                .forEach(msg => detailedErrors.push(msg.text));
            passwordData?.ui?.nodes?.forEach(node => {
                node.messages?.filter(msg => msg.type === 'error').forEach(msg => detailedErrors.push(msg.text));
            });

            // Check direct error fields
            if (passwordData?.error) {
                detailedErrors.push(
                    typeof passwordData.error === 'string' ? passwordData.error : passwordData.error.message
                );
            }
            passwordData?.errors?.forEach(err => detailedErrors.push(err.message || err.toString()));

            if (detailedErrors.length > 0) {
                errorMessage += ` - ${detailedErrors.join('; ')}`;
            }

            throw new Error(errorMessage);
        }

        console.log('✅ Password set successfully');

        return {
            success: true,
            flowId: passwordFlowId,
            response: passwordData,
        };
    } catch (error) {
        // Don't log error here - let the main function handle it
        throw error;
    }
}

/**
 * Step 6: Update profile with personal details (Real account only)
 * @param {string} email - Email address
 * @param {string} countryCode - Country code
 * @param {string} sessionToken - ORY session token from verification
 * @param {Object} personalDetails - Optional personal details (firstName, lastName, dob)
 * @returns {Promise<Object>} Response data
 */
async function updatePersonalDetails(email, countryCode, sessionToken, personalDetails = {}) {
    const url = `${DERIV_API_BASE}/client/profile`;

    const firstName = personalDetails.firstName || generateRandomName();
    const lastName = personalDetails.lastName || generateRandomName();
    const dob = personalDetails.dateOfBirth || generateRandomDOB();
    const phoneNumber = personalDetails.phoneNumber || generateRandomPhone();

    const phoneCallingCode = personalDetails.callingCountryCode || '60';

    const profileData = {
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dob,
        citizenship: countryCode,
        phone_calling_code: phoneCallingCode,
        phone_national_format: phoneNumber,
        phone_country_code: countryCode.toLowerCase(),
        country_of_birth: countryCode,
    };

    console.log('👤 Updating personal details...');
    console.log(`   Name: ${firstName} ${lastName}`);
    console.log(`   DOB: ${dob}`);
    console.log(`   Phone: +${phoneCallingCode}${phoneNumber}`);
    debug.log('Profile data prepared', profileData);

    const options = {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Session-Token': sessionToken,
        },
        body: JSON.stringify(profileData),
    };

    // Retry loop: retry only on 5xx (transient backend errors). 4xx is permanent.
    let response;
    let data;
    let lastError;

    for (let attempt = 1; attempt <= MAX_PROFILE_UPDATE_ATTEMPTS; attempt++) {
        try {
            response = DEBUG_MODE ? await debugFetch(url, options) : await fetch(url, options);

            data = await response.json();

            if (response.ok) {
                if (attempt > 1) {
                    console.log(
                        `✅ Personal details updated (succeeded on attempt ${attempt}/${MAX_PROFILE_UPDATE_ATTEMPTS})`
                    );
                } else {
                    console.log('✅ Personal details updated');
                }
                return data;
            }

            // 4xx — permanent failure, do not retry
            if (response.status >= 400 && response.status < 500) {
                console.error(`❌ Personal details update failed (HTTP ${response.status} — permanent):`, data);
                throw new Error(`Personal details update failed with HTTP ${response.status}`);
            }

            // 5xx — transient, retry if attempts remain
            lastError = data;
            const isLastAttempt = attempt === MAX_PROFILE_UPDATE_ATTEMPTS;
            if (isLastAttempt) {
                console.error(
                    `❌ Personal details update failed after ${MAX_PROFILE_UPDATE_ATTEMPTS} attempts (HTTP ${response.status}):`,
                    data
                );
                throw new Error(
                    `Personal details update failed after ${MAX_PROFILE_UPDATE_ATTEMPTS} attempts (HTTP ${response.status})`
                );
            }
            console.warn(
                `⚠️  Attempt ${attempt}/${MAX_PROFILE_UPDATE_ATTEMPTS} failed (HTTP ${response.status}). Retrying in ${PROFILE_UPDATE_RETRY_DELAY_MS}ms...`
            );
            await new Promise(resolve => setTimeout(resolve, PROFILE_UPDATE_RETRY_DELAY_MS));
        } catch (err) {
            // Rethrow permanent (4xx) errors immediately
            if (err.message && err.message.includes('permanent')) throw err;
            // Treat network / parse errors like transient — retry if attempts remain
            lastError = err;
            const isLastAttempt = attempt === MAX_PROFILE_UPDATE_ATTEMPTS;
            if (isLastAttempt) {
                console.error(
                    `❌ Personal details update failed after ${MAX_PROFILE_UPDATE_ATTEMPTS} attempts (network/parse error):`,
                    err.message
                );
                throw err;
            }
            console.warn(
                `⚠️  Attempt ${attempt}/${MAX_PROFILE_UPDATE_ATTEMPTS} threw error (${err.message}). Retrying in ${PROFILE_UPDATE_RETRY_DELAY_MS}ms...`
            );
            await new Promise(resolve => setTimeout(resolve, PROFILE_UPDATE_RETRY_DELAY_MS));
        }
    }

    // Should not reach here — loop either returns or throws
    throw new Error(`Personal details update failed after ${MAX_PROFILE_UPDATE_ATTEMPTS} attempts`);
}

/**
 * Step 7: Set phone number via ORY identity traits (unverified — no OTP required)
 * @param {string} sessionToken - ORY session token
 * @param {string} callingCode - Country calling code (e.g., '60' for Malaysia)
 * @param {string} nationalFormat - Phone number in national format (e.g., '123456789')
 * @returns {Promise<void>}
 */
async function setPhoneViaORY(sessionToken, callingCode, nationalFormat) {
    const settingsUrl = `${ORY_AUTH_BASE}/settings/api`;
    const settingsResp = DEBUG_MODE
        ? await debugFetch(settingsUrl, { method: 'GET', headers: { 'X-Session-Token': sessionToken } })
        : await fetch(settingsUrl, { method: 'GET', headers: { 'X-Session-Token': sessionToken } });

    if (!settingsResp.ok) {
        console.warn(`⚠️  Could not get ORY settings flow for phone (${settingsResp.status}) — skipping phone setup`);
        return;
    }

    const settingsData = await settingsResp.json();
    const flowId = settingsData.id;
    if (!flowId) {
        console.warn('⚠️  No settings flow ID found — skipping phone setup');
        return;
    }

    const phoneE164 = `+${callingCode}${nationalFormat}`;
    debug.log(`Setting ORY traits.unverified_phone = ${phoneE164}`);

    const settingsPostUrl = `${ORY_AUTH_BASE}/settings?flow=${flowId}`;
    const settingsPostOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Session-Token': sessionToken,
        },
        body: JSON.stringify({
            method: 'profile',
            traits: {
                unverified_phone: phoneE164,
            },
        }),
    };

    const settingsPostResp = DEBUG_MODE
        ? await debugFetch(settingsPostUrl, settingsPostOptions)
        : await fetch(settingsPostUrl, settingsPostOptions);

    const settingsPostData = await settingsPostResp.json();

    if (settingsPostData.state === 'success') {
        console.log(`✅ Phone set via ORY (unverified): ${phoneE164}`);
    } else {
        const messages = settingsPostData.ui?.messages?.map(m => m.text).join('; ') || 'unknown';
        console.warn(
            `⚠️  ORY phone setting returned: ${settingsPostData.state || 'no state'} — ${messages} (phone: ${phoneE164})`
        );
    }
}

/**
 * Step 8: Update address details (Real account only)
 * @param {string} sessionToken - ORY session token
 * @param {Object} addressDetails - Optional address details
 * @returns {Promise<Object>} Response data
 */
async function updateAddressDetails(sessionToken, addressDetails = {}) {
    const url = `${DERIV_API_BASE}/client/profile`;

    const address = addressDetails.address || generateRandomAddress();
    const city = addressDetails.city || generateRandomCity();

    const addressData = {
        address_line_1: address,
        address_city: city,
    };

    console.log('🏠 Updating address details...');
    console.log(`   Address: ${address}`);
    console.log(`   City: ${city}`);
    debug.log('Address data prepared', addressData);

    const options = {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Session-Token': sessionToken,
        },
        body: JSON.stringify(addressData),
    };

    const response = DEBUG_MODE ? await debugFetch(url, options) : await fetch(url, options);

    const data = await response.json();

    if (response.ok) {
        console.log('✅ Address details updated');
    } else {
        console.error('❌ Address update failed:', data);
        throw new Error('Address update failed');
    }

    return data;
}

/**
 * Step 9: Accept terms and conditions - Creates real account (Real account only)
 * @param {string} sessionToken - ORY session token
 * @returns {Promise<Object>} Response data
 */
async function acceptTermsAndCreateAccount(sessionToken) {
    const url = `${DERIV_API_BASE}/client/tnc`;
    const tncData = {
        account: {
            create_options: true,
        },
        compliance: {
            fatca: false,
            pep: false,
        },
    };

    console.log('📝 Accepting terms and creating real account...');
    debug.log('Terms and conditions data', tncData);

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Session-Token': sessionToken,
        },
        body: JSON.stringify(tncData),
    };

    const response = DEBUG_MODE ? await debugFetch(url, options) : await fetch(url, options);

    const data = await response.json();

    if (response.ok) {
        console.log('✅ Terms accepted - Real account created!');
    } else {
        console.error('❌ Real account creation failed:', data);
        throw new Error('Real account creation failed');
    }

    return data;
}

/**
 * Set onboarding tour completed feature flag
 * @param {string} sessionToken - ORY session token
 * @returns {Promise<Object>} Response data
 */
async function setOnboardingTourCompleted(sessionToken) {
    const url = `${DERIV_API_BASE}/client/feature-flags`;
    const featureFlagData = {
        flag: 'onboarding_tour_completed',
        value: true,
    };

    console.log('🚩 Setting onboarding tour completed feature flag...');
    debug.log('Feature flag data', featureFlagData);

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Session-Token': sessionToken,
        },
        body: JSON.stringify(featureFlagData),
    };

    const response = DEBUG_MODE ? await debugFetch(url, options) : await fetch(url, options);

    const data = await response.json();

    if (response.ok) {
        console.log('✅ Onboarding tour completed feature flag set successfully');
    } else {
        console.warn('⚠️ Failed to set onboarding tour completed feature flag:', data);
        // Don't throw error here, just warn and continue
    }

    return data;
}

/**
 * Get total balance and extract wallet ID
 * @param {string} sessionToken - ORY session token
 * @returns {Promise<string|null>} Wallet ID or null if no wallet exists
 */
async function getTotalBalance(sessionToken) {
    const url = `${DERIV_API_BASE}/client/total-balance`;

    debug.log('Getting total balance to check for existing wallet');

    const options = {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${sessionToken}`,
        },
    };

    const response = DEBUG_MODE ? await debugFetch(url, options) : await fetch(url, options);

    if (!response.ok) {
        throw new Error(`Failed to get total balance: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Extract wallet ID from response: $.data.wallets.items[0].wallet_id
    if (data.data && data.data.wallets && data.data.wallets.items && data.data.wallets.items.length > 0) {
        const walletId = data.data.wallets.items[0].wallet_id;
        debug.log('Wallet ID found in total balance', { walletId });
        return walletId;
    } else {
        debug.log('No wallet found in total-balance response');
        return null;
    }
}

/**
 * Step 10: Create wallet (Mandatory - real accounts only)
 * @param {string} sessionToken - ORY session token
 * @param {string|Array} walletCurrency - Wallet currency(ies) (e.g., 'USD' or ['USD', 'TRX', 'BTC'])
 * @returns {Promise<Object>} Response data with wallet_id
 */
async function createWallet(sessionToken, walletCurrency = 'USD') {
    const url = `${DERIV_API_BASE}/wallets`;

    // Handle both single currency and multiple currencies
    const currencies = Array.isArray(walletCurrency) ? walletCurrency : [walletCurrency];
    const walletData = {
        currency: currencies,
    };

    debug.log('Wallet creation data', walletData);

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Session-Token': sessionToken,
        },
        body: JSON.stringify(walletData),
    };

    const response = DEBUG_MODE ? await debugFetch(url, options) : await fetch(url, options);

    const data = await response.json();

    // Handle successful creation
    if (response.ok && response.status === 200 && data.data && data.data.length > 0 && data.data[0].wallet_id) {
        const walletId = data.data[0].wallet_id;
        console.log(`✅ Wallet created successfully with ${currencies.join(', ')} currencies`);
        console.log(`✅ Wallet ID: ${walletId}`);
        // Return the wallet data in the expected format for backward compatibility
        return { wallet_id: walletId, ...data.data[0] };
    }
    // Handle duplicate wallet error (failsafe) - extract wallet ID from error response
    else if (response.status === 409 && data.errors && data.errors.length > 0) {
        const duplicateError = data.errors.find(error => error.code === 'DuplicateWallet');
        if (duplicateError && duplicateError.wallet_id) {
            console.log(`✅ Wallet already exists (caught by failsafe) with ${currencies.join(', ')} currencies`);
            console.log(`✅ Using existing Wallet ID: ${duplicateError.wallet_id}`);
            // Return the existing wallet data in the expected format
            return {
                wallet_id: duplicateError.wallet_id,
                currency: currencies[0], // Use first currency for backward compatibility
                existing: true, // Flag to indicate this was an existing wallet
            };
        } else {
            console.error('❌ Duplicate wallet error but no wallet_id found:', data);
            throw new Error('Duplicate wallet error but no wallet_id found');
        }
    }
    // Handle other errors
    else {
        console.error('❌ Wallet creation failed:', data);
        throw new Error('Wallet creation failed');
    }
}

/**
 * Generate a random UUID v4
 * @returns {string} Random UUID
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Get M2M authentication token for Xano APIs
 * @param {string} apiKey - API key used as decryption passphrase
 * @param {string} scopeType - Scope type: 'wallet', 'options', or custom scope string
 * @returns {Promise<string>} M2M access token
 */
async function getM2MAuthToken(apiKey, scopeType) {
    assertInternalTestHelpersAllowed('M2M authentication');
    const url = ACTIVE_ENVIRONMENT_CONFIG.m2mAuthUrl;

    // Decrypt credentials using the API key as passphrase
    const clientId = await decryptCredential(ENCRYPTED_M2M_CREDENTIALS.client_id, apiKey);
    const clientSecret = await decryptCredential(ENCRYPTED_M2M_CREDENTIALS.client_secret, apiKey);

    // Predefined scopes for better maintainability
    const scopes = {
        wallet: 'WalletResourceService/read_balances WalletResourceService/transfer_wallets WalletResourceService/manage_holds WalletResourceService/transfer_cashier WalletResourceService/create_transaction WalletResourceService/read_transactions WalletResourceService/transfer_platform WalletResourceService/create_wallet WalletResourceService/set_wallet_status',
        options:
            'CFDResourceService/read_only_transactions CFDResourceService/read_write_transactions CFDResourceService/read_only_accounts CFDResourceService/read_write_accounts CFDResourceService/send_message',
    };

    // Determine the actual scope to use
    const tokenScope = scopes[scopeType] || scopeType;

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('scope', tokenScope);

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
    };

    const response = DEBUG_MODE ? await debugFetch(url, options) : await fetch(url, options);

    if (!response.ok) {
        throw new Error(`M2M auth failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.access_token) {
        debug.log('M2M token obtained', { token_length: data.access_token.length, scope: tokenScope });
        return data.access_token;
    } else {
        throw new Error('M2M auth response missing access_token');
    }
}

/**
 * Get default top-up amount based on currency type
 * @param {string} currency - Wallet currency
 * @returns {number} Default amount based on currency
 */
function getDefaultTopUpAmount(currency) {
    const upperCurrency = currency.toUpperCase();

    // Custom amounts for specific currencies
    const customAmounts = {
        TRX: 1000,
        USDT_TRON: 1000,
        USDT_ETHEREUM: 1000,
        BTC: 1,
    };

    if (customAmounts[upperCurrency]) {
        return customAmounts[upperCurrency];
    }

    // Default amounts for other currencies
    const cryptoCurrencies = ['ETH', 'LTC', 'BCH', 'UST', 'USDT_TRON', 'USDT_ETHEREUM'];
    return cryptoCurrencies.includes(upperCurrency) ? 5 : 1000;
}

/**
 * Step 11: Top-up wallet balance (Mandatory - real accounts only)
 * @param {string} accessToken - Deriv access token (not used for Xano API)
 * @param {string} walletId - Wallet ID to top-up
 * @param {string} walletCurrency - Wallet currency (e.g., 'USD', 'EUR', 'BTC')
 * @param {number} amount - Amount to top-up (default: 5 for crypto, 1000 for fiat)
 * @param {string} mailiskApiKey - Mailisk API key used as decryption passphrase
 * @returns {Promise<Object>} Response data with transaction details
 */
async function topUpWallet(accessToken, walletId, walletCurrency = 'USD', amount = null, mailiskApiKey) {
    assertInternalTestHelpersAllowed('Wallet top-up');

    // Use currency-specific default amount if not provided
    if (amount === null) {
        amount = getDefaultTopUpAmount(walletCurrency);
    }
    // Get M2M authentication token for Xano API
    const m2mToken = await getM2MAuthToken(mailiskApiKey, 'wallet');

    const url = `${WALLETS_INTERNAL_TEST_URL}/wallet/${walletId}/transaction`;
    const requestId = generateUUID();
    const externalReferenceId = generateUUID();

    const topupData = {
        data: {
            net_amount: amount,
            currency: walletCurrency,
            direction: 'to_wallet',
            request_id: requestId,
            external_reference_id: externalReferenceId,
            metadata: {
                description: 'Created from v2_create_account.js',
            },
            description: 'Created from v2_create_account.js by QA team',
        },
    };

    console.log(`💰 Topping up wallet with ${amount} ${walletCurrency}...`);
    console.log(`🔗 External Reference ID: ${externalReferenceId}`);
    debug.log('Wallet top-up data', {
        walletId,
        amount,
        currency: walletCurrency,
        requestId,
        externalReferenceId,
    });

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${m2mToken}`,
        },
        body: JSON.stringify(topupData),
    };

    const response = DEBUG_MODE ? await debugFetch(url, options) : await fetch(url, options);

    const data = await response.json();

    if (response.ok && response.status === 200 && data.data === 'OK') {
        return {
            success: true,
            requestId: requestId,
            amount: amount,
            currency: walletCurrency,
            walletId: walletId,
            response: data,
        };
    } else {
        console.error('❌ Wallet top-up failed:', data);
        console.error(`❌ Expected: status 200 with data: "OK", got: status ${response.status} with data:`, data.data);
        throw new Error('Wallet top-up failed');
    }
}

/**
 * Upload file for POI workflow
 * @param {string} clientId - Client UUID from feature flag response
 * @param {string} apiKey - API key for decrypting credentials
 * @returns {Promise<Object>} Response data with file ID
 */
async function uploadPOIFile(clientId, apiKey) {
    const url = 'https://xano-pii.deriv.cloud/tenant/te7r-g7ji-077f/api:jTm4juW3/v1/files';

    // Get the file API token (dummy1)
    const fileAPIToken = await getFileAPIToken(apiKey);

    // Base64 encoded 1x1 transparent PNG image
    const base64File = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';

    const fileData = {
        data: {
            workflow: 'poi',
            file: base64File,
        },
    };

    console.log('📁 Uploading file for POI workflow...');
    debug.log('POI file upload data', { clientId, workflow: 'poi' });

    const options = {
        method: 'POST',
        headers: {
            'X-Client-ID': clientId,
            'User-Agent': 'Apidog/1.0.0 (https://apidog.com)',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${fileAPIToken}`,
            Accept: '*/*',
            Host: 'xano-pii.deriv.cloud',
            Connection: 'keep-alive',
            Cookie: '',
        },
        body: JSON.stringify(fileData),
    };

    const response = DEBUG_MODE ? await debugFetch(url, options) : await fetch(url, options);

    const data = await response.json();

    if (response.ok && data.data && data.data.id) {
        console.log(`✅ POI file uploaded successfully with ID: ${data.data.id}`);
        return data;
    } else {
        console.error('❌ POI file upload failed:', data);
        throw new Error('POI file upload failed');
    }
}

/**
 * Upload file for POA workflow
 * @param {string} clientId - Client UUID from feature flag response
 * @param {string} apiKey - API key for decrypting credentials
 * @returns {Promise<Object>} Response data with file ID
 */
async function uploadPOAFile(clientId, apiKey) {
    const url = 'https://xano-pii.deriv.cloud/tenant/te7r-g7ji-077f/api:jTm4juW3/v1/files';

    // Get the file API token (dummy1)
    const fileAPIToken = await getFileAPIToken(apiKey);

    // Base64 encoded 1x1 transparent PNG image
    const base64File = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';

    const fileData = {
        data: {
            workflow: 'poa',
            file: base64File,
        },
    };

    console.log('📁 Uploading file for POA workflow...');
    debug.log('POA file upload data', { clientId, workflow: 'poa' });

    const options = {
        method: 'POST',
        headers: {
            'X-Client-ID': clientId,
            'User-Agent': 'Apidog/1.0.0 (https://apidog.com)',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${fileAPIToken}`,
            Accept: '*/*',
            Host: 'xano-pii.deriv.cloud',
            Connection: 'keep-alive',
            Cookie: '',
        },
        body: JSON.stringify(fileData),
    };

    const response = DEBUG_MODE ? await debugFetch(url, options) : await fetch(url, options);

    const data = await response.json();

    if (response.ok && data.data && data.data.id) {
        console.log(`✅ POA file uploaded successfully with ID: ${data.data.id}`);
        return data;
    } else {
        console.error('❌ POA file upload failed:', data);
        throw new Error('POA file upload failed');
    }
}

/**
 * Submit KYC ready for backoffice (POI)
 * @param {string} clientId - Client UUID
 * @param {number} id1 - First file ID
 * @param {number} id2 - Second file ID
 * @param {string} state - KYC state (e.g., 'approved', 'rejected')
 * @param {Array} rejectionReasons - Array of rejection reasons (optional)
 * @param {string} apiKey - API key for decrypting credentials
 * @returns {Promise<Object>} Response data
 */
async function submitKYCReady(clientId, id1, id2, state = 'approved', rejectionReasons = [], apiKey) {
    const url = 'https://xano-pii.deriv.cloud/tenant/te7r-g7ji-077f/api:KrKZf2Ub/v1/kyc/ready/backoffice';

    // Get the KYC write API token (dummy2)
    const kycWriteAPIToken = await getKYCWriteAPIToken(apiKey);

    const kycData = {
        data: {
            document_type: 'passport',
            workflow: 'poi',
            country: 'ar',
            validator: 'felipe',
            files: [
                {
                    id: id1,
                    role: 'selfie',
                },
                {
                    id: id2,
                    role: 'front',
                },
            ],
            expiration_date: '2030-10-10',
            document_number: '111-111-111',
            state: state,
            rejection_reasons: rejectionReasons,
            audit: {
                change_reason: 'Add a legit document',
                staff_name: 'felipe',
                ip_addr: '1.1.1.1',
                system: 'apidog',
            },
        },
    };

    console.log(`📋 Submitting KYC ready for backoffice with state: ${state}...`);
    debug.log('KYC ready data', { clientId, id1, id2, state, rejectionReasons });

    const options = {
        method: 'POST',
        headers: {
            'X-Client-ID': clientId,
            'User-Agent': 'Apidog/1.0.0 (https://apidog.com)',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${kycWriteAPIToken}`,
        },
        body: JSON.stringify(kycData),
    };

    const response = DEBUG_MODE ? await debugFetch(url, options) : await fetch(url, options);

    const data = await response.json();

    if (response.ok) {
        console.log(`✅ KYC ready submitted successfully with state: ${state}`);
    } else {
        console.error('❌ KYC ready submission failed:', data);
        throw new Error('KYC ready submission failed');
    }

    return data;
}

/**
 * Submit POA KYC ready for backoffice
 * @param {string} clientId - Client UUID
 * @param {number} fileId - POA file ID
 * @param {string} state - KYC state (e.g., 'approved', 'rejected')
 * @param {Array} rejectionReasons - Array of rejection reasons (optional)
 * @param {string} apiKey - API key for decrypting credentials
 * @returns {Promise<Object>} Response data
 */
async function submitPOAKYCReady(clientId, fileId, state = 'approved', rejectionReasons = [], apiKey) {
    const url = 'https://xano-pii.deriv.cloud/tenant/te7r-g7ji-077f/api:KrKZf2Ub/v1/kyc/ready/backoffice';

    // Get the KYC write API token (dummy2)
    const kycWriteAPIToken = await getKYCWriteAPIToken(apiKey);

    const kycData = {
        data: {
            document_type: 'bank_statement',
            workflow: 'poa',
            country: 'ar',
            validator: 'felipe',
            files: [
                {
                    id: fileId,
                },
            ],
            issuance_date: '2020-10-10',
            state: state,
            rejection_reasons: rejectionReasons,
            audit: {
                change_reason: 'Add a suspicious document',
                staff_name: 'felipe',
                ip_addr: '1.1.1.1',
                system: 'apidog',
            },
        },
    };

    console.log(`📋 Submitting POA KYC ready for backoffice with state: ${state}...`);
    debug.log('POA KYC ready data', { clientId, fileId, state, rejectionReasons });

    const options = {
        method: 'POST',
        headers: {
            'X-Client-ID': clientId,
            'User-Agent': 'Apidog/1.0.0 (https://apidog.com)',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${kycWriteAPIToken}`,
            Accept: '*/*',
            Host: 'xano-pii.deriv.cloud',
            Connection: 'keep-alive',
            Cookie: '',
        },
        body: JSON.stringify(kycData),
    };

    const response = DEBUG_MODE ? await debugFetch(url, options) : await fetch(url, options);

    const data = await response.json();

    if (response.ok) {
        console.log(`✅ POA KYC ready submitted successfully with state: ${state}`);
    } else {
        console.error('❌ POA KYC ready submission failed:', data);
        throw new Error('POA KYC ready submission failed');
    }

    return data;
}

/**
 * Get M2M authentication token for file API (dummy1)
 * @param {string} passphrase - Passphrase for decrypting credentials
 * @returns {Promise<string>} Access token for file API
 */
async function getFileAPIToken(passphrase) {
    assertInternalTestHelpersAllowed('KYC file API authentication');
    const url = ACTIVE_ENVIRONMENT_CONFIG.m2mAuthUrl;

    debug.log('Getting file API authentication token (dummy1)');

    // Decrypt credentials
    const clientId = await decryptCredential(ENCRYPTED_KYC_CREDENTIALS.client_id, passphrase);
    const clientSecret = await decryptCredential(ENCRYPTED_KYC_CREDENTIALS.client_secret, passphrase);

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('scope', 'KYCResourceService/file_api');

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: '*/*',
            Host: ACTIVE_ENVIRONMENT_CONFIG.m2mAuthHost,
            Connection: 'keep-alive',
            Cookie: '',
        },
        body: params.toString(),
    };

    const response = DEBUG_MODE ? await debugFetch(url, options) : await fetch(url, options);

    if (!response.ok) {
        throw new Error(`File API auth failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.access_token) {
        debug.log('File API token obtained', { token_length: data.access_token.length });
        return data.access_token;
    } else {
        throw new Error('File API auth response missing access_token');
    }
}

/**
 * Get M2M authentication token for KYC write API (dummy2)
 * @param {string} passphrase - Passphrase for decrypting credentials
 * @returns {Promise<string>} Access token for KYC write API
 */
async function getKYCWriteAPIToken(passphrase) {
    assertInternalTestHelpersAllowed('KYC write API authentication');
    const url = ACTIVE_ENVIRONMENT_CONFIG.m2mAuthUrl;

    debug.log('Getting KYC write API authentication token (dummy2)');

    // Decrypt credentials
    const clientId = await decryptCredential(ENCRYPTED_KYC_CREDENTIALS.client_id, passphrase);
    const clientSecret = await decryptCredential(ENCRYPTED_KYC_CREDENTIALS.client_secret, passphrase);

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('scope', 'KYCResourceService/kyc_write');

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: '*/*',
            Host: ACTIVE_ENVIRONMENT_CONFIG.m2mAuthHost,
            Connection: 'keep-alive',
            Cookie: '',
        },
        body: params.toString(),
    };

    const response = DEBUG_MODE ? await debugFetch(url, options) : await fetch(url, options);

    if (!response.ok) {
        throw new Error(`KYC write API auth failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.access_token) {
        debug.log('KYC write API token obtained', { token_length: data.access_token.length });
        return data.access_token;
    } else {
        throw new Error('KYC write API auth response missing access_token');
    }
}

/**
 * Submit tax information to Deriv API
 * @param {string} sessionToken - Session token for authentication
 * @param {string} taxResidence - Tax residence country code (optional)
 * @param {string} taxId - Tax identification number (optional)
 * @param {string} employmentStatus - Employment status (optional)
 * @returns {Promise<Object>} Response data
 */
async function submitTaxInformation(sessionToken, taxResidence = null, taxId = null, employmentStatus = null) {
    const url = `${DERIV_API_BASE}/client/tax-information`;

    const taxData = {
        account_opening_reason: 'additional_revenue',
    };

    // Only include employment_status if provided
    if (employmentStatus) {
        taxData.employment_status = employmentStatus;
    }

    // Only include tax_info if both taxResidence and taxId are provided
    if (taxResidence && taxId) {
        taxData.tax_info = [
            {
                tax_residence: taxResidence,
                tax_identification_number: taxId,
            },
        ];
    }

    console.log('📋 Submitting tax information...');
    console.log('   Account Opening Reason: additional_revenue');

    if (employmentStatus) {
        console.log(`   Employment Status: ${employmentStatus}`);
    }

    // Only log TIN details if they are provided
    if (taxResidence && taxId) {
        console.log(`   Tax Residence: ${taxResidence}`);
        console.log(`   Tax ID: ${taxId}`);
    }

    debug.log('Tax information data', taxData);

    const options = {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${sessionToken}`,
            'User-Agent': 'Apidog/1.0.0 (https://apidog.com)',
            'Content-Type': 'application/json',
            Accept: '*/*',
            Host: ACTIVE_ENVIRONMENT_CONFIG.apiCoreHost,
            Connection: 'keep-alive',
            Cookie: '',
        },
        body: JSON.stringify(taxData),
    };

    const response = DEBUG_MODE ? await debugFetch(url, options) : await fetch(url, options);

    const data = await response.json();

    if (response.ok) {
        console.log('✅ Tax information submitted successfully');
        return data;
    } else {
        console.error('❌ Tax information submission failed:', data);
        throw new Error('Tax information submission failed');
    }
}

/**
 * Submit financial assessment to Deriv API
 * @param {string} sessionToken - Session token for authentication
 * @param {string} employmentStatus - Employment status to determine which data to send
 * @returns {Promise<Object>} Response data
 */
async function submitFinancialAssessment(sessionToken, employmentStatus) {
    const url = `${DERIV_API_BASE}/client/financial-assessment`;

    // Base financial assessment data for all employment statuses
    let financialData = {
        source_of_wealth: ['inheritance', 'investment_income'],
        intended_annual_investment: '50000_to_250000',
        estimated_net_worth: '50000_to_250000',
        source_of_funds: ['sale_of_assets', 'salaries'],
        net_annual_income: '50000_to_250000',
    };

    // Add employment-specific fields for employed statuses
    if (['full_time', 'part_time', 'self_employed'].includes(employmentStatus)) {
        financialData.industry_of_employment = 'finance_digital_and_banking';
        financialData.job_title = 'professional';
    }

    console.log('💰 Submitting financial assessment...');
    console.log(`   Employment Status: ${employmentStatus}`);
    debug.log('Financial assessment data', financialData);

    const options = {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${sessionToken}`,
            'User-Agent': 'Apidog/1.0.0 (https://apidog.com)',
            'Content-Type': 'application/json',
            Accept: '*/*',
            Host: ACTIVE_ENVIRONMENT_CONFIG.apiCoreHost,
            Connection: 'keep-alive',
            Cookie: 'dummy',
        },
        body: JSON.stringify(financialData),
    };

    const response = DEBUG_MODE ? await debugFetch(url, options) : await fetch(url, options);

    const data = await response.json();

    if (response.ok) {
        console.log('✅ Financial assessment submitted successfully');
        return data;
    } else {
        console.error('❌ Financial assessment submission failed:', data);
        throw new Error('Financial assessment submission failed');
    }
}

/**
 * Get client accounts and extract platform account IDs
 * @param {string} sessionToken - Session token for authentication
 * @returns {Promise<Object>} Object containing account data and platform account IDs
 */
async function getClientAccounts(sessionToken) {
    const url = `${DERIV_API_BASE}/client/accounts`;

    const options = {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${sessionToken}`,
            'User-Agent': 'Apidog/1.0.0 (https://apidog.com)',
            Accept: '*/*',
            Host: ACTIVE_ENVIRONMENT_CONFIG.apiCoreHost,
            Connection: 'keep-alive',
        },
    };

    const response = DEBUG_MODE ? await debugFetch(url, options) : await fetch(url, options);

    const data = await response.json();

    if (response.ok && data.data && data.data.all) {
        const platformAccountIds = data.data.all.map(account => account.platform_account_id);

        // Print platform name with account ID
        console.log('📝 Account IDs:');
        data.data.all.forEach(account => {
            console.log(`   ${account.platform_code}: ${account.platform_account_id}`);
        });

        return {
            accounts: data.data.all,
            platformAccountIds: platformAccountIds,
        };
    } else {
        console.error('❌ Client accounts retrieval failed:', data);
        throw new Error('Client accounts retrieval failed');
    }
}

/**
 * Transfer funds between wallet and platform accounts
 * @param {string} sessionToken - Session token for authentication
 * @param {string} walletId - Wallet ID
 * @param {string} platformCode - Platform code (e.g., 'options', 'mt5')
 * @param {string} platformAccountId - Platform account ID
 * @param {number} amount - Amount to transfer
 * @param {string} currency - Currency code (e.g., 'USD')
 * @param {string} direction - Transfer direction ('from_wallet' or 'to_wallet')
 * @returns {Promise<Object>} Response data with transfer status
 */
async function transferFunds(
    sessionToken,
    walletId,
    platformCode,
    platformAccountId,
    amount,
    currency = 'USD',
    direction = 'from_wallet'
) {
    console.log(`💸 Transferring ${amount} ${currency} to ${platformCode}...`);

    const requestId = generateUUID();
    const transferData = {
        amount,
        currency,
        direction,
        platform_name: platformCode,
        platform_account_id: platformAccountId,
        wallet_id: walletId,
        request_id: requestId,
    };

    debug.log('Transfer data', transferData);

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(transferData),
    };

    const response = DEBUG_MODE
        ? await debugFetch(`${DERIV_API_BASE}/wallets/transfers/platforms`, options)
        : await fetch(`${DERIV_API_BASE}/wallets/transfers/platforms`, options);

    const data = await response.json();

    if (response.ok && data.data?.status === 'TransferSuccessful') {
        return {
            success: true,
            externalReferenceId: data.data.external_reference_id,
            requestId,
        };
    }

    console.error('❌ Transfer failed:', data);
    throw new Error(`Transfer failed: ${data.message || 'Unknown error'}`);
}

/**
 * Direct top-up to Options trading account
 * @param {string} platformAccountId - Options platform account ID
 * @param {number} amount - Amount to top-up directly
 * @param {string} currency - Currency code (e.g., 'USD')
 * @param {string} mailiskApiKey - Mailisk API key used as decryption passphrase
 * @returns {Promise<Object>} Response data with transaction details
 */
async function directOptionsTopup(platformAccountId, amount, currency = 'USD', mailiskApiKey) {
    assertInternalTestHelpersAllowed('Direct Options top-up');

    // Get M2M authentication token for Options API with correct CFD scopes
    const m2mToken = await getM2MAuthToken(mailiskApiKey, 'options');

    const url = `${OPTIONS_INTERNAL_TEST_URL}/accounts/${platformAccountId}/transfer`;
    const requestId = generateUUID();

    // Use JSON format for the request body
    const topupData = {
        transfer_type: 'deposit',
        request_id: requestId,
        client_name: 'options_transfer',
        amount: amount,
        currency: currency,
        is_retryable: false,
    };

    console.log(`💰 Direct top-up to Options account: ${amount} ${currency}...`);
    debug.log('Direct Options top-up data', {
        platformAccountId,
        ...topupData,
    });

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${m2mToken}`,
        },
        body: JSON.stringify(topupData),
    };

    const response = DEBUG_MODE ? await debugFetch(url, options) : await fetch(url, options);

    const data = await response.json();

    if (response.ok && response.status === 200 && data.data && data.data.status === 'COMPLETED') {
        console.log(`✅ Direct Options top-up completed successfully`);

        return {
            success: true,
            response: data,
        };
    } else {
        console.error('❌ Direct Options top-up failed:', data);
        throw new Error('Direct Options top-up failed!');
    }
}

/**
 * Call MT5 onboarding API
 * @param {string} sessionToken - Session token from previous API
 * @returns {Promise<Object>} Response data
 */
async function callMT5Onboarding(sessionToken) {
    const url = `${DERIV_API_BASE}/mt5/onboarding`;

    console.log('🏢 Calling MT5 onboarding API...');
    debug.log('MT5 onboarding request');

    const options = {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${sessionToken}`,
            'User-Agent': 'Apidog/1.0.0 (https://apidog.com)',
            Accept: '*/*',
            Host: ACTIVE_ENVIRONMENT_CONFIG.apiCoreHost,
            Connection: 'keep-alive',
        },
    };

    const response = DEBUG_MODE ? await debugFetch(url, options) : await fetch(url, options);

    const data = await response.json();

    if (response.ok) {
        console.log('✅ MT5 onboarding API call successful');
        debug.log('MT5 onboarding response', data);
    } else {
        console.error('❌ MT5 onboarding API call failed:', data);
        throw new Error('MT5 onboarding API call failed');
    }

    return data;
}

/**
 * Call MT5 routing API for a specific type
 * @param {string} sessionToken - Session token from previous API
 * @param {string} type - MT5 account type (standard, zero-spread, stp, gold, swap-free, financial, crypto)
 * @param {boolean} isDemo - Whether this is a demo account (true) or real account (false)
 * @returns {Promise<Object>} Response data
 */
async function callMT5Routing(sessionToken, type, isDemo = false) {
    const url = `${DERIV_API_BASE}/mt5/routing?type=${type}&is_demo=${isDemo}&currency=usd`;

    debug.log(`MT5 routing request for type: ${type}`);

    const options = {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${sessionToken}`,
            'User-Agent': 'Apidog/1.0.0 (https://apidog.com)',
            Accept: '*/*',
            Host: ACTIVE_ENVIRONMENT_CONFIG.apiCoreHost,
            Connection: 'keep-alive',
        },
    };

    const response = DEBUG_MODE ? await debugFetch(url, options) : await fetch(url, options);

    const data = await response.json();

    if (response.ok) {
        debug.log(`MT5 routing response for ${type}`, data);
        return data;
    } else {
        console.error(`❌ MT5 routing API call failed for ${type}:`, data);
        throw new Error(`MT5 routing API call failed for ${type}`);
    }
}

/**
 * Extract server identifier from mt5_group string
 * @param {string} mt5Group - MT5 group string (e.g., "real\\p02_ts01\\zerospread\\dbvi_default_usd")
 * @returns {string} Server identifier (e.g., "dbvi")
 */
function extractServerFromMT5Group(mt5Group) {
    if (!mt5Group || typeof mt5Group !== 'string') {
        return 'unknown';
    }

    // Split by backslashes and get the last part before "_default_"
    const parts = mt5Group.split('\\');
    if (parts.length >= 4) {
        const lastPart = parts[parts.length - 1]; // e.g., "dbvi_default_usd"
        const serverPart = lastPart.split('_')[0]; // e.g., "dbvi"
        return serverPart;
    }

    return 'unknown';
}

/**
 * Call MT5 routing APIs for all types and log results
 * @param {string} sessionToken - Session token from previous API
 * @param {boolean} isDemo - Whether this is a demo account (true) or real account (false)
 * @returns {Promise<void>}
 */
async function callMT5RoutingAll(sessionToken, isDemo = false) {
    const types = ['standard', 'financial', 'gold', 'zero-spread', 'swap-free', 'stp', 'crypto'];
    const results = [];

    console.log(`🏢 Calling MT5 routing APIs for all types (${isDemo ? 'demo' : 'real'} account)...`);

    for (const type of types) {
        try {
            const response = await callMT5Routing(sessionToken, type, isDemo);

            if (response.data && response.data.mt5_group) {
                const serverIdentifier = extractServerFromMT5Group(response.data.mt5_group);
                results.push({
                    type: type,
                    counterparty: serverIdentifier,
                    blocked: response.data.blocked || false,
                    mt5_group: response.data.mt5_group,
                    selected_server: response.data.selected_server || 'unknown',
                    error_codes: [],
                    error_messages: [],
                });
            } else {
                // Handle error cases - collect all error codes and messages
                let errorCodes = [];
                let errorMessages = [];

                if (response.data && response.data.errors && response.data.errors.length > 0) {
                    response.data.errors.forEach(error => {
                        if (error.code) {
                            errorCodes.push(error.code);
                        }
                        if (error.message) {
                            errorMessages.push(error.message);
                        }
                    });
                }

                results.push({
                    type: type,
                    counterparty: 'no mt5_group found',
                    blocked: response.data ? response.data.blocked : true,
                    mt5_group: null,
                    selected_server: null,
                    error_codes: errorCodes,
                    error_messages: errorMessages,
                });
            }
        } catch (error) {
            results.push({
                type: type,
                counterparty: 'error',
                blocked: true,
                mt5_group: null,
                selected_server: null,
                error_codes: ['API_ERROR'],
                error_messages: [error.message],
            });
        }
    }

    // Display all results together in the new detailed format
    console.log('\n📋 MT5 Routing Results:');
    results.forEach(result => {
        console.log(`${result.type}:`);
        console.log(`  counterparty: ${result.counterparty}`);
        console.log(`  blocked: ${result.blocked}`);

        if (result.mt5_group) {
            console.log(`  mt5_group: ${result.mt5_group}`);
        }

        if (result.selected_server) {
            console.log(`  selected_server: ${result.selected_server}`);
        }

        if (result.error_codes.length > 0) {
            console.log(`  error_code: ${result.error_codes.join(', ')}`);
        }

        if (result.error_messages.length > 0) {
            console.log(`  error_message: ${result.error_messages.join('; ')}`);
        }
    });

    console.log('\n✅ MT5 routing API calls completed');
}

// Supported MT5 account types for creation
const SUPPORTED_MT5_ACCOUNT_TYPES = ['standard', 'financial', 'swap-free', 'zero-spread', 'gold', 'crypto'];
const MAX_MT5_STANDARD_ACCOUNTS = 5;
const MAX_CTRADER_ACCOUNTS = 5;

/**
 * Create an MT5 trading account
 * @param {string} sessionToken - Session token for authentication
 * @param {string} mt5Password - Password to set for the MT5 account
 * @param {string} mt5Type - MT5 account type (standard, financial, swap-free, zero-spread, gold, crypto)
 * @param {boolean} isDemo - Whether this is a demo account (true) or real account (false)
 * @param {string} currency - Account currency (default: "USD")
 * @returns {Promise<Object>} Response data
 */
async function createMT5Account(sessionToken, mt5Password, mt5Type, isDemo = false, currency = 'USD') {
    const url = `${DERIV_API_BASE}/deriv/trading/account`;

    if (!SUPPORTED_MT5_ACCOUNT_TYPES.includes(mt5Type)) {
        throw new Error(
            `Unsupported MT5 account type: ${mt5Type}. Supported types: ${SUPPORTED_MT5_ACCOUNT_TYPES.join(', ')}`
        );
    }

    const mt5Data = {
        is_demo: isDemo,
        currency: currency,
        password: mt5Password,
        platform: 'mt5',
        account_type: mt5Type,
    };

    console.log(`🏦 Creating MT5 ${isDemo ? 'demo' : 'real'} account: ${mt5Type}...`);
    debug.log('MT5 account creation data', mt5Data);

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(mt5Data),
    };

    const response = DEBUG_MODE ? await debugFetch(url, options) : await fetch(url, options);

    // Guard against empty response body (server may return 2xx with no body after creating the account)
    const responseText = await response.text();
    let data = null;
    if (responseText.trim()) {
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            // Non-JSON body on a successful response — treat as ok
            debug.log(`MT5 account creation response was non-JSON: ${responseText}`);
        }
    }

    if (response.ok) {
        console.log(`✅ MT5 account created successfully (${mt5Type})`);
        return data || { success: true };
    } else {
        console.error(`❌ MT5 account creation failed for type ${mt5Type}:`, data);
        throw new Error(`MT5 account creation failed for type ${mt5Type}`);
    }
}

/**
 * Create a cTrader trading account
 * @param {string} sessionToken - Session token for authentication
 * @param {boolean} isDemo - Whether this is a demo account (true) or real account (false)
 * @param {string} currency - Account currency (default: "USD")
 * @returns {Promise<Object>} Response data
 */
async function createCTraderAccount(sessionToken, isDemo = false, currency = 'USD') {
    const url = `${DERIV_API_BASE}/deriv/trading/account`;

    const ctraderData = {
        is_demo: isDemo,
        currency: currency,
        password: '',
        platform: 'ctrader',
        account_type: 'standard',
    };

    console.log(`🏦 Creating cTrader ${isDemo ? 'demo' : 'real'} account...`);
    debug.log('cTrader account creation data', ctraderData);

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(ctraderData),
    };

    const response = DEBUG_MODE ? await debugFetch(url, options) : await fetch(url, options);

    const data = await response.json();

    if (response.ok && data && data.data) {
        console.log(`✅ cTrader account created successfully`);
        return data;
    } else {
        console.error(`❌ cTrader account creation failed:`, data);
        throw new Error(`cTrader account creation failed`);
    }
}

/**
 * Create DevHub apps (PAT + OAuth) and an API token for the authenticated user.
 * Called only when --developer is passed. Soft-fails on each step.
 * @param {string} sessionToken - Bearer token from ORY signup flow
 * @returns {Promise<void>}
 */
async function runDeveloperFlow(sessionToken) {
    console.log('\n==================================================');
    console.log('🛠️  Developer Flow');
    console.log('==================================================');

    const devhubBase = `https://${ACTIVE_ENVIRONMENT_CONFIG.apiCoreHost}/devhub/v1`;

    async function devhubRequest(method, path, body = null) {
        const url = `${devhubBase}${path}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${sessionToken}`,
            },
        };
        if (body) {
            options.body = JSON.stringify(body);
        }
        const response = DEBUG_MODE ? await debugFetch(url, options) : await fetch(url, options);
        const data = await response.json();
        return { status: response.status, data };
    }

    let patAppId = null;
    let oauthAppId = null;
    let apiTokenId = null;
    let apiToken = null;

    // Step 1: Create PAT app
    try {
        console.log('📱 Creating PAT app...');
        const result = await devhubRequest('POST', '/apps', {
            name: 'QA Auto PAT App',
            type: 'pat',
        });
        if (result.status === 200 || result.status === 201) {
            patAppId = result.data?.data?.id;
            console.log(`✅ PAT app created (ID: ${patAppId})`);
        } else {
            console.warn(`⚠️  PAT app creation returned HTTP ${result.status}: ${JSON.stringify(result.data)}`);
        }
    } catch (err) {
        console.warn(`⚠️  PAT app creation failed: ${err.message}`);
    }

    // Step 2: Create OAuth app
    try {
        console.log('🔐 Creating OAuth app...');
        const result = await devhubRequest('POST', '/apps', {
            name: 'QA Auto OAuth App',
            type: 'oauth',
            redirect_uris: ['https://example.com/callback'],
            scopes: ['trade', 'account_manage', 'application_read'],
        });
        if (result.status === 200 || result.status === 201) {
            oauthAppId = result.data?.data?.id;
            console.log(`✅ OAuth app created (ID: ${oauthAppId})`);
        } else {
            console.warn(`⚠️  OAuth app creation returned HTTP ${result.status}: ${JSON.stringify(result.data)}`);
        }
    } catch (err) {
        console.warn(`⚠️  OAuth app creation failed: ${err.message}`);
    }

    // Step 3: Create API token (all scopes, 90-day expiry)
    try {
        console.log('🔑 Creating API token...');
        const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
        const result = await devhubRequest('POST', '/pat', {
            name: 'QA Auto Token',
            scopes: ['trade', 'account_manage', 'application_read'],
            expiresAt,
        });
        if (result.status === 200 || result.status === 201) {
            apiTokenId = result.data?.data?.id;
            apiToken = result.data?.data?.token;
            console.log(`✅ API token created (ID: ${apiTokenId})`);
        } else {
            console.warn(`⚠️  API token creation returned HTTP ${result.status}: ${JSON.stringify(result.data)}`);
        }
    } catch (err) {
        console.warn(`⚠️  API token creation failed: ${err.message}`);
    }

    console.log('\n🛠️  Developer Resources:');
    console.log(`🛠️  PAT App ID: ${patAppId || 'N/A'}`);
    console.log(`🛠️  OAuth App ID: ${oauthAppId || 'N/A'}`);
    console.log(`🛠️  API Token ID: ${apiTokenId || 'N/A'}`);
    console.log(`🛠️  API Token: ${apiToken || 'N/A'}`);
    console.log('✅ Developer flow completed!');
}

/**
 * ── Partners account completion flow ──────────────────────────────────────────
 *
 * Called only when --client_type affiliate is passed.
 * Performs all post-signup Partners API steps using the session token obtained
 * from the standard ORY signup flow. All endpoints use DERIV_API_BASE.
 *
 * Steps:
 *   1. PUT  /v1/client/attributes  — set client_type=affiliate + entity_type
 *   2. GET  /v1/client/profile     — resolve external_reference_id (client UUID)
 *   3. PUT  /v1/client/profile     — set address_line_1 + address_city
 *   4. GET  /v1/client/kyc-status  — snapshot POI/POA state
 *   5. POST /v1/client/tnc         — accept T&C with Partners payload
 *   6. POST /v1/partners/wallets   — create Partners wallet
 *
 * @param {string} sessionToken - Bearer token obtained from ORY signup flow
 * @param {Object} partnerArgs  - Partner-specific CLI args (entity_type, partner_type, etc.)
 * @returns {Promise<void>}
 */
async function runPartnersAccountFlow(sessionToken, partnerArgs) {
    console.log('\n==================================================');
    console.log('🤝 Partners Account Flow');
    console.log('==================================================');

    const entityType = partnerArgs.entity_type || 'retail';
    const address = partnerArgs.address || '123 Test Street';
    const city = partnerArgs.city || 'Tirana';

    async function partnersRequest(method, path, body = null) {
        const url = `${DERIV_API_BASE}${path}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Token': sessionToken,
            },
        };
        if (body) {
            options.body = JSON.stringify(body);
        }
        const response = DEBUG_MODE ? await debugFetch(url, options) : await fetch(url, options);
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            const text = await response.text();
            console.error(
                `❌ Partners API (${method} ${path}) returned non-JSON response (HTTP ${response.status}): ${text.substring(0, 200)}`
            );
            return { status: response.status, data: { error: 'Non-JSON response', body: text.substring(0, 500) } };
        }
        const data = await response.json();
        return { status: response.status, data };
    }

    const partnerTypeForAttrs = partnerArgs.partner_type || 'individual';
    const attrsBody = {
        client_type: 'affiliate',
        entity_type: entityType,
    };
    if (partnerTypeForAttrs === 'company') {
        const companyNameForAttrs = partnerArgs.company_name || 'Deriv Limited';
        const companyRegNoForAttrs = partnerArgs.company_registration_number || '12345';
        const businessDomain = partnerArgs.business_domain || 'example.com';
        attrsBody.business_name = companyNameForAttrs;
        attrsBody.business_domain = businessDomain;
        attrsBody.attributes = { company_registration_no: companyRegNoForAttrs };
        console.log(
            `🔧 Setting client attributes: client_type=affiliate, entity_type=${entityType}, business_name="${companyNameForAttrs}", company_registration_no="${companyRegNoForAttrs}"...`
        );
    } else {
        console.log(`🔧 Setting client attributes: client_type=affiliate, entity_type=${entityType}...`);
    }
    const attrsResult = await partnersRequest('PUT', '/client/attributes', attrsBody);
    if (attrsResult.status !== 200) {
        throw new Error(
            `Partners: PUT /v1/client/attributes failed (HTTP ${attrsResult.status}). ` +
                `Response: ${JSON.stringify(attrsResult.data)}`
        );
    }
    console.log(`✅ Partners attributes set: client_type=affiliate, entity_type=${entityType}`);
    debug.log('Attributes response', attrsResult.data);

    console.log('🔍 Fetching client profile to resolve client UUID...');
    const profileGetResult = await partnersRequest('GET', '/client/profile');
    let partnersClientId = null;
    if (profileGetResult.status === 200 && profileGetResult.data) {
        partnersClientId =
            profileGetResult.data?.data?.external_reference_id ?? profileGetResult.data?.data?.client_id ?? null;
    }
    if (!partnersClientId) {
        throw new Error(
            `Partners: Could not resolve client UUID from GET /v1/client/profile ` +
                `(HTTP ${profileGetResult.status}). Response: ${JSON.stringify(profileGetResult.data)}`
        );
    }
    console.log(`✅ Partners Client ID: ${partnersClientId}`);

    const partnerType = partnerArgs.partner_type || 'individual';
    const isCompany = partnerType === 'company';
    const profilePutBody = {
        address_line_1: address,
        address_city: city,
    };
    if (isCompany) {
        const companyName = partnerArgs.company_name || 'Deriv Limited';
        const companyRegNo = partnerArgs.company_registration_number || '12345';
        profilePutBody.company_name = companyName;
        profilePutBody.company_registration_no = companyRegNo;
        profilePutBody.company_registration_number = companyRegNo;
        console.log(
            `🏠 Updating Partners profile (company): ${address}, ${city}, company="${companyName}", reg="${companyRegNo}"...`
        );
    } else {
        console.log(`🏠 Updating Partners profile address: ${address}, ${city}...`);
    }
    const profilePutResult = await partnersRequest('PUT', '/client/profile', profilePutBody);
    if (profilePutResult.status === 200) {
        console.log(`✅ Partners profile${isCompany ? ' (company)' : ''} set: ${address}, ${city}`);
    } else if (profilePutResult.status === 403) {
        const reason = profilePutResult.data?.errors?.[0]?.details?.reason || 'kyc_verified_field_locked';
        console.log(
            `⚠️  Partners: PUT /v1/client/profile skipped (${reason}) — fields locked after KYC approval, continuing`
        );
    } else {
        throw new Error(
            `Partners: PUT /v1/client/profile (address${isCompany ? '/company' : ''}) failed (HTTP ${profilePutResult.status}). ` +
                `Response: ${JSON.stringify(profilePutResult.data)}`
        );
    }

    const kycResult = await partnersRequest('GET', '/client/kyc-status');
    let kycPoi = 'unknown';
    let kycPoa = 'unknown';
    let kycLevel = 0;
    if (kycResult.status === 200 && kycResult.data) {
        const entries = kycResult.data?.data || [];
        kycPoi = entries.find(e => e.kyc_step === 'poi')?.status ?? 'unknown';
        kycPoa = entries.find(e => e.kyc_step === 'poa')?.status ?? 'unknown';
        kycLevel = kycResult.data?.level ?? 0;
        console.log(`✅ Partners KYC: POI=${kycPoi}, POA=${kycPoa}, Level=${kycLevel}`);
    } else {
        console.warn(`⚠️ Partners: GET /v1/client/kyc-status returned HTTP ${kycResult.status} — continuing`);
    }

    console.log('📝 Accepting Partners T&C...');
    const tncResult = await partnersRequest('POST', '/client/tnc', {
        brand_code: 'partners',
        compliance: { fatca: false, pep: true },
        account: { create_options: false },
    });
    let tncAccepted = false;
    if (tncResult.status === 200 || tncResult.status === 201) {
        tncAccepted = true;
        console.log('✅ Partners T&C accepted successfully');
    } else if (tncResult.status === 409) {
        tncAccepted = true;
        console.log('✅ Partners T&C already accepted (409 treated as success)');
    } else {
        throw new Error(
            `Partners: POST /v1/client/tnc failed (HTTP ${tncResult.status}). ` +
                `Response: ${JSON.stringify(tncResult.data)}`
        );
    }

    console.log('💼 Creating Partners wallet...');
    const walletsPostResult = await partnersRequest('POST', '/partners/wallets', {});
    let partnersWalletId = null;

    const isWalletExists = (status, data) => {
        if (status === 409) return true;
        if (status === 400 && data && typeof data === 'object') {
            return (data.errors || []).some(e => (e.message || '').toLowerCase().includes('wallet already exists'));
        }
        return false;
    };

    if (walletsPostResult.status === 200 || walletsPostResult.status === 201) {
        partnersWalletId =
            walletsPostResult.data?.data?.wallets?.[0]?.wallet_id ??
            walletsPostResult.data?.data?.wallets?.[0]?.id ??
            null;
        if (!partnersWalletId) {
            const walletsGetResult = await partnersRequest('GET', '/partners/wallets');
            if (walletsGetResult.status === 200) {
                partnersWalletId =
                    walletsGetResult.data?.data?.wallets?.[0]?.wallet_id ??
                    walletsGetResult.data?.data?.wallets?.[0]?.id ??
                    null;
            }
        }
        if (!partnersWalletId) {
            console.warn(
                '⚠️ Partners: wallet created/found but wallet_id could not be resolved from POST or GET /partners/wallets — downstream top-up will be skipped'
            );
        }
        console.log(`✅ Partners wallet created${partnersWalletId ? ` (ID: ${partnersWalletId})` : ''}`);
    } else if (isWalletExists(walletsPostResult.status, walletsPostResult.data)) {
        const walletsGetResult = await partnersRequest('GET', '/partners/wallets');
        if (walletsGetResult.status === 200) {
            partnersWalletId =
                walletsGetResult.data?.data?.wallets?.[0]?.wallet_id ??
                walletsGetResult.data?.data?.wallets?.[0]?.id ??
                null;
        }
        if (!partnersWalletId) {
            console.warn(
                '⚠️ Partners: wallet already exists but wallet_id could not be resolved from GET /partners/wallets — downstream top-up will be skipped'
            );
        }
        console.log(
            `✅ Partners wallet already exists (treated as success)${partnersWalletId ? ` (ID: ${partnersWalletId})` : ''}`
        );
    } else {
        console.warn(
            `⚠️ Partners: POST /v1/partners/wallets returned HTTP ${walletsPostResult.status}. ` +
                `Response: ${JSON.stringify(walletsPostResult.data)}`
        );
    }

    if (partnersWalletId && partnerArgs.topup_amount && ACTIVE_ENVIRONMENT_CONFIG.allowInternalTestHelpers) {
        const topupAmount = parseFloat(partnerArgs.topup_amount);
        if (!isNaN(topupAmount) && topupAmount > 0) {
            console.log(`💰 Topping up Partners wallet with ${topupAmount} USD...`);
            try {
                await topUpWallet(
                    null,
                    partnersWalletId,
                    'USD',
                    topupAmount,
                    partnerArgs.topupApiKey || partnerArgs.apikey
                );
                console.log(`✅ Partners wallet topped up: ${topupAmount} USD → ${partnersWalletId}`);
            } catch (topupErr) {
                console.warn(`⚠️ Partners wallet topup failed (continuing): ${topupErr.message}`);
            }
        }
    } else if (partnersWalletId && partnerArgs.topup_amount) {
        console.log('⚠️ Partners wallet top-up skipped because production mode disables internal test funding helpers');
    }

    console.log(`🤝 Partners Client ID: ${partnersClientId}`);
    console.log(`🤝 Partners Wallet ID: ${partnersWalletId || 'N/A'}`);
    console.log(`🤝 Partners TNC Accepted: ${tncAccepted}`);
    console.log(`🤝 Partners KYC POI: ${kycPoi}`);
    console.log(`🤝 Partners KYC POA: ${kycPoa}`);
    console.log(`🤝 Partners KYC Level: ${kycLevel}`);
    console.log(`🤝 Partners Entity Type: ${entityType}`);
    console.log(`🤝 Partners Partner Type: ${partnerType}`);
    if (isCompany) {
        console.log(`🤝 Partners Company Name: ${partnerArgs.company_name || 'Deriv Limited (default)'}`);
        console.log(`🤝 Partners Company Reg No: ${partnerArgs.company_registration_number || '12345 (default)'}`);
    }
    console.log('✅ Partners account creation flow completed successfully!');
}

/**
 * Parse command line arguments
 * @returns {Object} Parsed arguments
 */
function parseArguments() {
    const args = {};
    const argv = process.argv.slice(2);

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg.startsWith('--')) {
            const key = arg.substring(2);
            const value = argv[i + 1];

            if (
                [
                    'client_type',
                    'entity_type',
                    'partner_type',
                    'company_name',
                    'company_registration_number',
                    'partner_currency',
                    'website',
                    'provider',
                    'calling_country_code',
                ].includes(key)
            ) {
                if (value && !value.startsWith('--')) {
                    args[key] = value;
                    i++;
                } else {
                    args[key] = true;
                }
            }
            // Special handling for MT5 creation arguments:
            //
            //   --mt5 standard <password>
            //       → 1 standard account
            //
            //   --mt5 standard 2 <password>
            //       → 2 standard accounts (count 1-5, standard only)
            //
            //   --mt5 standard 5 <password>
            //       → 5 standard accounts (max)
            //
            //   --mt5 all <password>
            //       → 5× standard + 1× each of financial, swap-free, zero-spread, gold, crypto
            //
            //   --mt5 financial,standard 2,gold,swap-free,zero-spread,crypto <password>
            //       → 1 financial, 2 standard, 1 gold, 1 swap-free, 1 zero-spread, 1 crypto
            //
            else if (key === 'mt5') {
                // Collect all non-flag tokens after --mt5; last token = password, rest = type spec
                const tokens = [];
                let j = i + 1;
                while (j < argv.length && !argv[j].startsWith('--')) {
                    tokens.push(argv[j]);
                    j++;
                }

                if (tokens.length === 0) {
                    console.error('❌ --mt5 requires a type and password. Usage: --mt5 <type> [count] <password>');
                    process.exit(1);
                }

                const mt5Password = tokens[tokens.length - 1];
                const typeSpec = tokens
                    .slice(0, tokens.length - 1)
                    .join(' ')
                    .trim();

                // Advance i past all consumed tokens
                i = j - 1;

                const mt5TypeCounts = {}; // { typeName: count }

                if (!typeSpec) {
                    console.error('❌ --mt5 requires a type. Usage: --mt5 <type> [count] <password>');
                    console.error(`   Supported types: ${SUPPORTED_MT5_ACCOUNT_TYPES.join(', ')}, or 'all'`);
                    console.error('   Examples:');
                    console.error('     --mt5 standard MyPass123!');
                    console.error('     --mt5 standard 5 MyPass123!');
                    console.error('     --mt5 all MyPass123!');
                    process.exit(1);
                } else if (typeSpec === 'all') {
                    // 'all' → 5× standard + 1× each of the rest
                    mt5TypeCounts['standard'] = MAX_MT5_STANDARD_ACCOUNTS;
                    SUPPORTED_MT5_ACCOUNT_TYPES.filter(t => t !== 'standard').forEach(t => {
                        mt5TypeCounts[t] = 1;
                    });
                } else {
                    // Comma-separated entries; each entry is "type" or "type N"
                    const entries = typeSpec
                        .split(',')
                        .map(e => e.trim())
                        .filter(Boolean);
                    for (const entry of entries) {
                        const parts = entry.split(/\s+/);
                        const typeName = parts[0].toLowerCase();
                        const countStr = parts[1];

                        if (!SUPPORTED_MT5_ACCOUNT_TYPES.includes(typeName)) {
                            console.error(`❌ Invalid MT5 account type: '${typeName}'`);
                            console.error(`   Supported types: ${SUPPORTED_MT5_ACCOUNT_TYPES.join(', ')}, or 'all'`);
                            process.exit(1);
                        }

                        let count = 1;
                        if (countStr !== undefined) {
                            if (typeName !== 'standard') {
                                console.error(`❌ Count is only supported for 'standard' type, not '${typeName}'`);
                                process.exit(1);
                            }
                            count = parseInt(countStr, 10);
                            if (isNaN(count) || count < 1 || count > MAX_MT5_STANDARD_ACCOUNTS) {
                                console.error(
                                    `❌ MT5 standard count must be between 1 and ${MAX_MT5_STANDARD_ACCOUNTS}`
                                );
                                process.exit(1);
                            }
                        }

                        mt5TypeCounts[typeName] = (mt5TypeCounts[typeName] || 0) + count;

                        if (typeName === 'standard' && mt5TypeCounts['standard'] > MAX_MT5_STANDARD_ACCOUNTS) {
                            console.error(
                                `❌ Total MT5 standard count exceeds maximum of ${MAX_MT5_STANDARD_ACCOUNTS}`
                            );
                            process.exit(1);
                        }
                    }
                }

                args.mt5_type_counts = mt5TypeCounts;
                args.mt5_password = mt5Password;
            }
            // Special handling for cTrader creation arguments: --ctrader [count|all]
            else if (key === 'ctrader') {
                if (value && !value.startsWith('--')) {
                    // Check if value is "all" or a number
                    if (value === 'all') {
                        args.ctrader = 'all';
                    } else {
                        const count = parseInt(value, 10);
                        if (isNaN(count) || count < 1 || count > MAX_CTRADER_ACCOUNTS) {
                            console.error(
                                `❌ Invalid cTrader count. Must be a number between 1 and ${MAX_CTRADER_ACCOUNTS}, or "all"`
                            );
                            process.exit(1);
                        }
                        args.ctrader = count;
                    }
                    i++; // Skip the value in next iteration
                } else {
                    // No value provided, default to 1
                    args.ctrader = 1;
                }
            } else {
                if (value && !value.startsWith('--')) {
                    args[key] = value;
                    i++; // Skip the value in next iteration
                } else {
                    args[key] = true; // Flag without value
                }
            }
        }
    }

    return args;
}

/**
 * Display help information
 */
function displayHelp() {
    console.log(`
🚀 Deriv KYC Automation Script

Usage: node v2_create_account.js [options]

Required Options:
  --email <email>           Email address (must use webapps.mailisk.net, mobileapps.mailisk.net, or kycreject.mailisk.net)
  --password <password>     Password for the account
  --country <code>          2-letter country code (e.g., 'ar', 'my')
  --type <type>            Account type: 'demo' or 'real'
  --apikey <key>           Mailisk API key, or set MAILISK_API_KEY.
                           Backward-compatible fallback for staging-only top-up/KYC helper credentials.
  --mailisk_api_key <key>  Explicit Mailisk API key alias. Overrides MAILISK_API_KEY.
  --topup_api_key <key>    Optional separate staging-only top-up/KYC credential passphrase.

Environment Options:
  --environment <env>      Environment: 'staging' (default) or 'production'. Alias: --env.
                           Production uses live Core/ORY endpoints and disables internal test top-up/KYC helpers.

Optional Options (Real account only):
  --firstname <name>        First name (random if not provided)
  --lastname <name>         Last name (random if not provided)
  --dob <date>             Date of birth in YYYY-MM-DD format (random if not provided)
  --phone <number>         Phone number (random if not provided)
  --address <address>       Address (random if not provided)
  --city <city>            City (random if not provided)
  --walletCurrency <currencies>  Wallet currency(ies) (optional, skips wallet if omitted, real account only)
                           Can be single currency (USD) or comma-separated multiple currencies (USD,TRX,BTC)
                           Add 'no-topup' to skip automatic staging top-up (e.g., USD,no-topup or USD,BTC,no-topup)
                           Production mode always skips top-up.
  --topup_amount <amount>  Custom top-up amount for trading wallet (overrides default 2000 USD).
                           Applies to all currencies in --walletCurrency in staging only.
                           Also used to top up the Partners wallet when --client_type affiliate is set.

KYC Options:
  --poi <state>            POI state: 'approved' or 'rejected'
  --poi_rejection_reasons <reasons>  POI rejection reasons (comma-separated)
  --poa <state>            POA state: 'approved' or 'rejected'
  --poa_rejection_reasons <reasons>  POA rejection reasons (comma-separated)
                           POI/POA automation is staging-only.

Tax Information Options:
  --tax_residence <code>   Tax residence country code (e.g., 'ar')
  --tax_id <number>        Tax identification number
  --employment_status <status>  Employment status (optional, only set if provided)

Financial Assessment Options:
  --fa                     Submit financial assessment (requires employment_status)

MT5 Options:
  --mt5_onboarding         Call MT5 onboarding API using session token
  --mt5_routing            Call MT5 routing APIs for all account types and log server assignments
  --mt5_is_demo <boolean>  Whether MT5 accounts should be demo (true) or real (false) - only used with --mt5_routing
  --mt5 <type> [count] <password>
                           Create MT5 account(s) at the end of the flow.
                           type is required: standard, financial, swap-free, zero-spread, gold, crypto, or 'all'
                           count (1-5) is optional and only applies to 'standard' type
                           --mt5 all creates 5x standard + 1x each of financial, swap-free, zero-spread, gold, crypto
                           password is the MT5 trading password to set (always last argument)

cTrader Options:
  --ctrader [count|all]    Create cTrader account(s) at the end of the flow.
                           If no value provided, creates 1 account.
                           If a number (1-5) is provided, creates that many accounts.
                           If 'all' is provided, creates all 5 cTrader accounts (maximum).

Trading Options:
  --trading                Staging only: top-up USD wallet with 2000 USD and direct top-up 1000 USD to Options trading account

Partners Account Options (only active when --client_type affiliate is set):
  --client_type affiliate  Trigger the full Partners account flow after signup.
                           Runs: PUT /v1/client/attributes, GET/PUT /v1/client/profile,
                           GET /v1/client/kyc-status, POST /v1/client/tnc (Partners payload),
                           POST /v1/partners/wallets.
                           Emits structured output lines prefixed "🤝 Partners ..." for the caller to parse.
  --entity_type <type>     Partners entity type: 'retail' (default) or 'corporate'
  --partner_type <type>    Partner sub-type: 'individual' (default) or 'company'
                           When 'company', also pass --company_name and --company_registration_number
  --company_name <name>    Company name (default: 'Deriv Limited') — used with partner_type=company
  --company_registration_number <num>
                           Company registration number (default: '12345') — used with partner_type=company
  --partner_currency <cur> Currency for the partner account (default: 'USD')
  --website <url>          Partner website URL (default: 'xyz.com')
  --provider <name>        Affiliate provider/network name (default: 'dynamicworks')
  --calling_country_code <code>
                           Phone calling country code, digits only (default: '60' for Malaysia)

Developer Options:
  --developer              Create DevHub resources after account setup:
                           - PAT app (QA Auto PAT App)
                           - OAuth app (QA Auto OAuth App, all scopes, example redirect URI)
                           - API token (QA Auto Token, all scopes, 90-day expiry)
                           Works with any account type. Can be combined with --client_type affiliate.

Other Options:
  --debug                  Enable debug mode for detailed logging
  --help                   Show this help message

Examples:
  # Create demo account
  node v2_create_account.js --email test@webapps.mailisk.net --password Test123! --country ar --type demo --apikey YOUR_KEY

  # Create production demo account
  node v2_create_account.js --environment production --email test@webapps.mailisk.net --password Test123! --country ar --type demo --apikey YOUR_KEY

  # Create production real account without wallet top-up
  node v2_create_account.js --environment production --email test@webapps.mailisk.net --password Test123! --country ar --type real --apikey YOUR_KEY

  # Create real account with POI approved
  node v2_create_account.js --email test@webapps.mailisk.net --password Test123! --country ar --type real --apikey YOUR_KEY --poi approved

  # Create real account with single currency wallet
  node v2_create_account.js --email test@webapps.mailisk.net --password Test123! --country ar --type real --apikey YOUR_KEY --walletCurrency USD

  # Create real account with multi-currency wallet
  node v2_create_account.js --email test@webapps.mailisk.net --password Test123! --country ar --type real --apikey YOUR_KEY --walletCurrency USD,TRX,BTC

  # Create real account with POI rejected
  node v2_create_account.js --email test@webapps.mailisk.net --password Test123! --country ar --type real --apikey YOUR_KEY --poi rejected --poi_rejection_reasons "EXPIRED,BLURRY"

  # Create real account with both POI and POA and wallet
  node v2_create_account.js --email test@webapps.mailisk.net --password Test123! --country ar --type real --apikey YOUR_KEY --poi approved --poa rejected --poa_rejection_reasons "ADDRESS_MISMATCH" --walletCurrency USD,BTC

  # Create real account with MT5 routing check
  node v2_create_account.js --email test@webapps.mailisk.net --password Test123! --country ar --type real --apikey YOUR_KEY --mt5_routing

  # Create real account with tax information
  node v2_create_account.js --email test@webapps.mailisk.net --password Test123! --country ar --type real --apikey YOUR_KEY --tax_residence ar --tax_id 354354354

  # Create real account with financial assessment
  node v2_create_account.js --email test@webapps.mailisk.net --password Test123! --country ar --type real --apikey YOUR_KEY --employment_status full_time --fa

  # Create real account with tax information and financial assessment
  node v2_create_account.js --email test@webapps.mailisk.net --password Test123! --country ar --type real --apikey YOUR_KEY --tax_residence ar --tax_id 354354354 --employment_status self_employed --fa

  # Create real account and transfer USD 1000 to Options trading account
  node v2_create_account.js --email test@webapps.mailisk.net --password Test123! --country ar --type real --apikey YOUR_KEY --walletCurrency USD --trading

  # Create real account and 1 MT5 Standard account
  node v2_create_account.js --email test@webapps.mailisk.net --password Test123! --country ar --type real --apikey YOUR_KEY --mt5 standard <password>

  # Create real account and 2 MT5 Standard accounts
  node v2_create_account.js --email test@webapps.mailisk.net --password Test123! --country ar --type real --apikey YOUR_KEY --mt5 standard 2 <password>

  # Create real account and 5 MT5 Standard accounts (max)
  node v2_create_account.js --email test@webapps.mailisk.net --password Test123! --country ar --type real --apikey YOUR_KEY --mt5 standard 5 <password>

  # Create real account and all MT5 account types (5x standard + 1x each of financial, swap-free, zero-spread, gold, crypto)
  node v2_create_account.js --email test@webapps.mailisk.net --password Test123! --country ar --type real --apikey YOUR_KEY --mt5 all <password>

  # Create real account with mixed MT5 types (1 financial, 2 standard, 1 gold, 1 swap-free, 1 zero-spread, 1 crypto)
  node v2_create_account.js --email test@webapps.mailisk.net --password Test123! --country ar --type real --apikey YOUR_KEY --mt5 "financial,standard 2,gold,swap-free,zero-spread,crypto" <password>

  # Create real account and 1 cTrader account
  node v2_create_account.js --email test@webapps.mailisk.net --password Test123! --country ar --type real --apikey YOUR_KEY --ctrader

  # Create real account and 3 cTrader accounts
  node v2_create_account.js --email test@webapps.mailisk.net --password Test123! --country ar --type real --apikey YOUR_KEY --ctrader 3

  # Create real account and all 5 cTrader accounts
  node v2_create_account.js --email test@webapps.mailisk.net --password Test123! --country ar --type real --apikey YOUR_KEY --ctrader all

`);
}

/**
 * Main execution function
 */
async function main() {
    try {
        const args = parseArguments();

        // Check for help flag
        if (args.help) {
            displayHelp();
            return;
        }

        args.environment =
            args.environment || args.env || process.env.DERIV_ENVIRONMENT || process.env.DERIV_ENV || 'staging';
        configureEnvironment(args.environment);
        applyProductionSafety(args);

        args.mailiskApiKey = args.mailisk_api_key || args.mailiskApiKey || args.apikey || process.env.MAILISK_API_KEY;
        args.topupApiKey =
            args.topup_api_key || args.topupApiKey || process.env.TOPUP_API_KEY || args.apikey || args.mailiskApiKey;
        args.apikey = args.mailiskApiKey;

        // Set debug mode
        if (args.debug) {
            DEBUG_MODE = true;
            console.log('🔍 Debug mode enabled');
        }

        // Generate random email if not provided
        if (!args.email) {
            args.email = generateRandomEmail();
            console.log(`📧 Generated random email: ${args.email}`);
        }

        // Validate required arguments (email is now optional as it can be auto-generated)
        const requiredArgs = ['password', 'country', 'type', 'apikey'];
        const missingArgs = requiredArgs.filter(arg => !args[arg]);

        if (missingArgs.length > 0) {
            console.error(`❌ Missing required arguments: ${missingArgs.join(', ')}`);
            console.error('Use --help for usage information');
            process.exit(1);
        }

        // Validate account type
        if (!['demo', 'real'].includes(args.type)) {
            console.error('❌ Account type must be "demo" or "real"');
            process.exit(1);
        }

        // Validate email domain
        if (!args.email.includes('@webapps.mailisk.net') && !args.email.includes('@mobileapps.mailisk.net')) {
            console.error('❌ Email must use webapps.mailisk.net or mobileapps.mailisk.net domain');
            process.exit(1);
        }

        console.log('\n🚀 Starting Deriv account creation process...');
        console.log(`📧 Email: ${args.email}`);
        console.log(`🌍 Country: ${args.country}`);
        console.log(`🏦 Account Type: ${args.type}`);
        console.log(`🌐 Environment: ${ACTIVE_ENVIRONMENT}`);
        if (!ACTIVE_ENVIRONMENT_CONFIG.allowInternalTestHelpers) {
            console.log('ℹ️  Production mode: internal wallet top-up helpers are disabled.');
        }

        console.log('\n==================================================');
        console.log('🔄 Step 0: Validate Country');
        console.log('==================================================');

        // Step 0: Validate country is client enabled (FIRST CHECK)
        await validateCountryEnabled(args.country);

        console.log('\n==================================================');
        console.log('🔄 Step 1-2: ORY Signup Process');
        console.log('==================================================');

        // Capture signup timestamp before making the signup request
        const signupTimestamp = Math.floor(Date.now() / 1000);
        debug.log(`Signup initiated at timestamp: ${signupTimestamp} (${new Date().toISOString()})`);

        // Step 1-2: Signup with ORY
        const signupResult = await signup(args.email, args.country);
        console.log(`✅ Signup completed successfully`);

        console.log('\n==================================================');
        console.log('🔄 Step 3: Retrieve OTP from Mailisk');
        console.log('==================================================');

        // Step 3: Get OTP from Mailisk
        const otp = await getOTPFromMailisk(args.email, args.apikey, signupTimestamp);

        console.log('\n==================================================');
        console.log('🔄 Step 4: Verify Email with OTP');
        console.log('==================================================');

        // Step 4: Verify email with OTP
        const verifyResult = await verifyEmailWithORY(signupResult.flow_id, args.email, otp, args.country);
        const sessionToken = verifyResult.session_token;
        console.log(`✅ Email verification successful`);

        console.log('\n==================================================');
        console.log('🔄 Step 5: Set Password');
        console.log('==================================================');

        // Step 5: Set password
        const passwordResult = await setPassword(sessionToken, args.password);

        if (args.type === 'real') {
            console.log('\n==================================================');
            console.log('🔄 Continuing with real account creation...');
            console.log('==================================================');

            // Real account creation steps
            const personalDetails = {
                firstName: args.firstname,
                lastName: args.lastname,
                dateOfBirth: args.dob,
                phoneNumber: args.phone,
            };

            const addressDetails = {
                address: args.address,
                city: args.city,
            };

            console.log('\n==================================================');
            console.log('🔄 Step 6: Update Personal Details');
            console.log('==================================================');

            // Wait for ORY session to settle after setPassword before the first
            // PUT /client/profile call. Duration controlled by
            // WAIT_MS_BEFORE_PROFILE_UPDATE constant at the top of the file.
            if (WAIT_MS_BEFORE_PROFILE_UPDATE > 0) {
                console.log(`⏳ Waiting ${WAIT_MS_BEFORE_PROFILE_UPDATE}ms before profile update...`);
                await new Promise(resolve => setTimeout(resolve, WAIT_MS_BEFORE_PROFILE_UPDATE));
            }

            // Step 6: Update personal details
            const profileResult = await updatePersonalDetails(args.email, args.country, sessionToken, personalDetails);

            console.log('\n==================================================');
            console.log('🔄 Step 7: Add Phone Number (Optional)');
            console.log('==================================================');

            {
                const phoneCallingCode = args.calling_country_code || personalDetails.callingCountryCode || '60';
                const phoneNational = personalDetails.phoneNumber || generateRandomPhone();
                try {
                    await setPhoneViaORY(sessionToken, phoneCallingCode, phoneNational);
                } catch (error) {
                    console.warn(`⚠️ Phone setup via ORY failed (continuing): ${error.message}`);
                }
            }

            console.log('\n==================================================');
            console.log('🔄 Step 8: Update Address Details');
            console.log('==================================================');

            // Step 8: Update address details
            const addressResult = await updateAddressDetails(sessionToken, addressDetails);

            console.log('\n==================================================');
            console.log('🔄 Step 9: Accept Terms and Create Real Account');
            console.log('==================================================');

            if (args.client_type === 'affiliate') {
                // TNC for affiliates is handled entirely inside runPartnersAccountFlow() (Step 5).
                // No inline TNC call here to avoid a redundant double-POST.
                console.log('ℹ️  Affiliate flow: TNC will be accepted inside runPartnersAccountFlow()');
            } else {
                await acceptTermsAndCreateAccount(sessionToken);
            }
        }

        console.log('\n==================================================');
        console.log('🔄 Setting Feature Flag');
        console.log('==================================================');

        // Set onboarding tour completed feature flag
        const featureFlagResult = await setOnboardingTourCompleted(sessionToken);

        // Extract client ID from feature flag response for KYC operations
        let clientId = null;
        if (featureFlagResult && featureFlagResult.data && featureFlagResult.data.client_id) {
            clientId = featureFlagResult.data.client_id;
        }

        // Store wallet ID for later use
        let walletId = null;

        if (args.type === 'real' && args.walletCurrency && args.client_type !== 'affiliate') {
            console.log('\n==================================================');
            console.log('🔄 Wallet Operations');
            console.log('==================================================');

            // Check if 'no-topup' is in the walletCurrency parameter.
            // Production always skips top-up, even if the caller forgets the flag.
            const requestedNoTopUp = args.walletCurrency.toLowerCase().includes('no-topup');
            const skipTopUp = requestedNoTopUp || !ACTIVE_ENVIRONMENT_CONFIG.allowInternalTestHelpers;

            // Handle both single currency and multiple currencies
            // Remove 'no-topup' from the currencies list if present
            const currencies = args.walletCurrency.includes(',')
                ? args.walletCurrency
                      .split(',')
                      .map(c => c.trim())
                      .filter(c => c.toLowerCase() !== 'no-topup')
                : [args.walletCurrency].filter(c => c.toLowerCase() !== 'no-topup');

            if (currencies.length === 0) {
                console.log('⚠️  No wallet currencies requested after removing no-topup flag; skipping wallet setup');
            } else {
                console.log(`💰 Setting up wallet with ${currencies.join(', ')} currencies...`);
                if (skipTopUp) {
                    console.log(
                        `⚠️  Top-up will be skipped (${requestedNoTopUp ? 'no-topup flag detected' : 'production mode'})`
                    );
                }

                // Check if wallet already exists (created automatically after TNC)
                console.log('🔍 Checking for existing wallet...');
                const existingWalletId = await getTotalBalance(sessionToken);

                if (existingWalletId) {
                    console.log(`✅ Wallet already exists (auto-created after TNC)`);
                    console.log(`✅ Using existing Wallet ID: ${existingWalletId}`);
                    walletId = existingWalletId;
                } else {
                    console.log('📝 No existing wallet found, creating new wallet...');
                    // Create wallet once with all currencies
                    const walletResult = await createWallet(sessionToken, currencies);
                    walletId = walletResult.wallet_id;
                }

                const walletBalances = {};

                // Only top-up in staging, unless 'no-topup' is present.
                if (!skipTopUp) {
                    // Top-up each currency separately
                    for (let i = 0; i < currencies.length; i++) {
                        const currency = currencies[i];

                        let topUpAmount = null;
                        if (args.topup_amount) {
                            topUpAmount = parseFloat(args.topup_amount);
                        } else if (currency.toUpperCase() === 'USD') {
                            topUpAmount = 2000;
                        }

                        const topUpResult = await topUpWallet(null, walletId, currency, topUpAmount, args.topupApiKey);
                        walletBalances[currency] = topUpResult.amount;
                    }

                    console.log(
                        `✅ Wallet setup completed - Balances: ${Object.entries(walletBalances)
                            .map(([curr, amt]) => `${amt} ${curr}`)
                            .join(', ')}`
                    );
                } else {
                    console.log(`✅ Wallet setup completed (no top-up performed)`);
                }
            }
        }

        // Track if KYC operations actually ran
        let kycOperationsRan = false;

        if (!clientId) {
            console.warn('⚠️ Could not extract client ID from feature flag response');
            console.warn('⚠️ KYC operations will be skipped');
        }

        // Handle KYC operations if client ID is available
        if (clientId && (args.poi || args.poa)) {
            kycOperationsRan = true;

            console.log('\n==================================================');
            console.log('🔄 Starting KYC Operations');
            console.log('==================================================');

            // Get tokens once for both POI and POA (optimization)
            let fileAPIToken = null;
            let kycWriteAPIToken = null;

            if (args.poi || args.poa) {
                fileAPIToken = await getFileAPIToken(args.topupApiKey);
                kycWriteAPIToken = await getKYCWriteAPIToken(args.topupApiKey);
            }

            // Handle POI workflow
            if (args.poi) {
                console.log('\n==================================================');
                console.log('🔄 Processing POI Workflow');
                console.log('==================================================');

                // Upload two files for POI (selfie and front)
                const poiFile1 = await uploadPOIFile(clientId, args.topupApiKey);

                const poiFile2 = await uploadPOIFile(clientId, args.topupApiKey);

                // Parse POI rejection reasons
                const poiRejectionReasons = args.poi_rejection_reasons
                    ? args.poi_rejection_reasons.split(',').map(r => r.trim())
                    : [];

                // Submit POI KYC ready
                const poiKycResult = await submitKYCReady(
                    clientId,
                    poiFile1.data.id,
                    poiFile2.data.id,
                    args.poi,
                    poiRejectionReasons,
                    args.topupApiKey
                );
            }

            // Handle POA workflow
            if (args.poa) {
                console.log('\n==================================================');
                console.log('🔄 Processing POA Workflow');
                console.log('==================================================');

                // Upload file for POA
                const poaFile = await uploadPOAFile(clientId, args.topupApiKey);

                // Parse POA rejection reasons
                const poaRejectionReasons = args.poa_rejection_reasons
                    ? args.poa_rejection_reasons.split(',').map(r => r.trim())
                    : [];

                // Submit POA KYC ready
                const poaKycResult = await submitPOAKYCReady(
                    clientId,
                    poaFile.data.id,
                    args.poa,
                    poaRejectionReasons,
                    args.topupApiKey
                );
            }
        }

        // Handle tax information submission - always submit for real accounts
        if (args.type === 'real') {
            console.log('\n==================================================');
            console.log('🔄 Submitting Tax Information');
            console.log('==================================================');
            try {
                const taxResult = await submitTaxInformation(
                    sessionToken,
                    args.tax_residence,
                    args.tax_id,
                    args.employment_status
                );
            } catch (error) {
                console.error('❌ Tax information submission failed:', error.message);
                if (DEBUG_MODE) {
                    console.error('🔍 Tax submission error details:', error);
                }
            }
        }

        // Handle financial assessment submission
        if (args.fa && args.employment_status) {
            console.log('\n==================================================');
            console.log('🔄 Submitting Financial Assessment');
            console.log('==================================================');
            try {
                const faResult = await submitFinancialAssessment(sessionToken, args.employment_status);
                console.log('✅ Financial assessment submitted successfully');
            } catch (error) {
                console.error('❌ Financial assessment submission failed:', error.message);
                if (DEBUG_MODE) {
                    console.error('🔍 Financial assessment error details:', error);
                }
            }
        }

        // Handle MT5 onboarding if requested
        if (args.mt5_onboarding) {
            console.log('\n==================================================');
            console.log('🔄 MT5 Onboarding');
            console.log('==================================================');

            const mt5Result = await callMT5Onboarding(sessionToken);

            console.log('\n==================================================');
            console.log('📊 MT5 Onboarding Results');
            console.log('==================================================');

            try {
                // Process the MT5 onboarding response data
                const onboardingResults = validateMT5OnboardingData(mt5Result.data);

                // Format and display the results
                const formattedOutput = formatValidationResults(onboardingResults);
                console.log('\n📋 MT5 Account Requirements:');
                console.log(formattedOutput);
            } catch (processingError) {
                console.error('❌ MT5 onboarding data processing failed:', processingError.message);
                if (DEBUG_MODE) {
                    console.error('🔍 Processing error details:', processingError);
                }
            }
        }

        // Handle MT5 routing if requested
        if (args.mt5_routing) {
            console.log('\n==================================================');
            console.log('🔄 MT5 Routing');
            console.log('==================================================');

            // Use mt5_is_demo parameter if provided, otherwise fall back to account type
            let isDemo;
            if (args.mt5_is_demo !== undefined) {
                isDemo = args.mt5_is_demo === 'true';
            } else {
                isDemo = args.type === 'demo';
            }

            console.log(`🔍 MT5 routing mode: ${isDemo ? 'demo' : 'real'}`);
            await callMT5RoutingAll(sessionToken, isDemo);
        }

        // Handle MT5 account creation (always at the end, after other operations)
        if (args.mt5_type_counts && args.mt5_password) {
            console.log('\n==================================================');
            console.log('🔄 MT5 Account Creation');
            console.log('==================================================');

            const isDemoForMT5 = args.type === 'demo';
            const typeCounts = args.mt5_type_counts; // e.g. { standard: 5, financial: 1 }

            // Summary log
            const summary = Object.entries(typeCounts)
                .map(([t, n]) => `${n}× ${t}`)
                .join(', ');
            console.log(`📌 MT5 request: ${summary}`);

            // Iterate in SUPPORTED_MT5_ACCOUNT_TYPES order for consistent output
            for (const mt5Type of SUPPORTED_MT5_ACCOUNT_TYPES) {
                const repeatCount = typeCounts[mt5Type];
                if (!repeatCount) continue; // type not requested

                for (let c = 0; c < repeatCount; c++) {
                    if (repeatCount > 1) {
                        console.log(`\n   ── ${mt5Type} account ${c + 1} of ${repeatCount} ──`);
                    }
                    try {
                        await createMT5Account(sessionToken, args.mt5_password, mt5Type, isDemoForMT5, 'USD');
                    } catch (error) {
                        console.error(
                            `❌ Failed to create MT5 ${mt5Type} account (${c + 1}/${repeatCount}):`,
                            error.message
                        );
                        if (DEBUG_MODE) {
                            console.error('🔍 MT5 creation error details:', error);
                        }
                    }
                }
            }
        }

        // Handle cTrader account creation (always at the end, after other operations)
        if (args.ctrader) {
            console.log('\n==================================================');
            console.log('🔄 cTrader Account Creation');
            console.log('==================================================');

            const isDemoForCTrader = args.type === 'demo';
            let accountsToCreate = 1;

            if (args.ctrader === 'all') {
                accountsToCreate = MAX_CTRADER_ACCOUNTS;
                console.log(`📌 cTrader request: all accounts (${MAX_CTRADER_ACCOUNTS} accounts)`);
            } else {
                accountsToCreate = args.ctrader;
                console.log(`📌 cTrader request: ${accountsToCreate} account(s)`);
            }

            for (let i = 0; i < accountsToCreate; i++) {
                try {
                    await createCTraderAccount(sessionToken, isDemoForCTrader, 'USD');
                } catch (error) {
                    console.error(`❌ Failed to create cTrader account ${i + 1}/${accountsToCreate}:`, error.message);
                    if (DEBUG_MODE) {
                        console.error('🔍 cTrader creation error details:', error);
                    }
                }
            }
        }

        // Handle trading account top-up if requested
        if (args.trading && walletId) {
            console.log('\n==================================================');
            console.log('🔄 Trading Account');
            console.log('==================================================');

            try {
                const accountsData = await getClientAccounts(sessionToken);
                const optionsAccount = accountsData.accounts.find(
                    acc => acc.platform_code === 'options' && acc.platform_account_id.startsWith('R')
                );

                await directOptionsTopup(optionsAccount.platform_account_id, 1000, 'USD', args.topupApiKey);
                console.log(`✅ Direct Options top-up successful: 1000 USD → ${optionsAccount.platform_account_id}`);
            } catch (error) {
                console.error('❌ Direct Options top-up failed:', error.message);
            }
        }

        console.log('\n🎉 Account creation completed successfully!');
        console.log(`📧 Email: ${args.email}`);
        console.log(`🔑 Password: ${args.password}`);
        console.log(`🌍 Country: ${args.country}`);
        console.log(`🏦 Account Type: ${args.type}`);
        console.log(`🎫 Session Token: ${sessionToken}`);

        if (args.poi) {
            console.log(`🆔 POI Status: ${args.poi}`);
        }
        if (args.poa) {
            console.log(`🏠 POA Status: ${args.poa}`);
        }
        if (args.mt5_onboarding) {
            console.log(`🏢 MT5 Onboarding: Completed`);
        }
        if (args.tax_residence && args.tax_id) {
            console.log(`📋 Tax Residence: ${args.tax_residence}`);
            console.log(`📋 Tax ID: ${args.tax_id}`);
        }

        if (args.client_type === 'affiliate') {
            await runPartnersAccountFlow(sessionToken, args);
        }

        if (args.developer) {
            await runDeveloperFlow(sessionToken);
        }
    } catch (error) {
        console.error('\n❌ Error during account creation:');
        console.error(error.message);

        if (DEBUG_MODE) {
            console.error('\n🔍 Full error details:');
            console.error(error);
        }

        process.exit(1);
    }
}

// Validation function for MT5 onboarding verify command
function validateMT5OnboardingData(data) {
    const results = {};

    // Input validation - ensure data is an array
    if (!Array.isArray(data)) {
        throw new Error('Invalid data format: expected array');
    }

    data.forEach(account => {
        // Input validation for account object structure
        if (!account || typeof account !== 'object') {
            throw new Error('Invalid account data: expected object');
        }

        if (!account.type || typeof account.type !== 'string') {
            throw new Error('Invalid account type: expected string');
        }

        if (!account.actions || typeof account.actions !== 'object') {
            throw new Error('Invalid account actions: expected object');
        }

        const { type, actions, can_proceed, errors } = account;
        const { poi_required, poa_required, tin_required, fa_required } = actions;

        // Validate account type against allowed values
        const allowedTypes = ['gold', 'stp', 'swap-free', 'standard', 'zero-spread', 'financial', 'crypto'];
        if (!allowedTypes.includes(type)) {
            throw new Error(`Invalid account type: ${type}. Allowed types: ${allowedTypes.join(', ')}`);
        }

        // Extract error information if present - handle multiple errors
        let errorCodes = [];
        let errorMessages = [];
        if (errors && Array.isArray(errors) && errors.length > 0) {
            errors.forEach(error => {
                if (error.code) {
                    errorCodes.push(error.code);
                }
                if (error.message) {
                    errorMessages.push(error.message);
                }
            });
        }

        // Set default values if no errors found
        const errorCode = errorCodes.length > 0 ? errorCodes.join(', ') : 'none';
        const errorMessage = errorMessages.length > 0 ? errorMessages.join('; ') : 'none';

        let validationResult = {
            poi_required: poi_required || 'not_set',
            poa_required: poa_required || 'not_set',
            tin_required: tin_required || 'not_set',
            fa_required_creation: (fa_required && fa_required.creation) || 'not_set',
            fa_required_deposit: (fa_required && fa_required.deposit) || 'not_set',
            can_proceed_actual: can_proceed,
            error_code: errorCode,
            error_message: errorMessage,
        };

        results[type] = validationResult;
    });

    return results;
}

// Format validation results for display
function formatValidationResults(results) {
    let output = '';

    Object.keys(results).forEach(accountType => {
        const result = results[accountType];
        output += `${accountType}:\n`;
        output += `  poi_required: ${result.poi_required}\n`;
        output += `  poa_required: ${result.poa_required}\n`;
        output += `  tin_required: ${result.tin_required}\n`;
        output += `  fa_required.creation: ${result.fa_required_creation}\n`;
        output += `  fa_required.deposit: ${result.fa_required_deposit}\n`;
        output += `  can_proceed: ${result.can_proceed_actual}\n`;
        output += `  error_code: ${result.error_code}\n`;
        output += `  error_message: ${result.error_message}\n`;

        output += '\n';
    });

    return output.trim();
}

main();
