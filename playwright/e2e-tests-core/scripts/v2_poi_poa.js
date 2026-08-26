#!/usr/bin/env node
/**
 * Deriv POI/POA Status Management Script
 *
 * This script allows updating POI (Proof of Identity) and POA (Proof of Address)
 * status for existing Deriv accounts.
 *
 * Usage:
 * node v2_poi_poa.js --email <email> --apikey <key> [--poi <state>] [--poa <state>] [options]
 */

// Debug flag - will be set via command line arguments
let DEBUG_MODE = false;

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
            parsedBody = JSON.parse(body);
        } catch (e) {
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
        try {
            responseBody = await responseClone.text();
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

const STAGING_AUTH_URL = 'https://staging-auth.deriv.com';
const STAGING_API_CORE_URL = 'https://staging-api-core.deriv.com';

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
 * Get client UUID using the feature flag API (same method as v2_create_account.js)
 * @param {string} sessionToken - Session token for authentication
 * @returns {Promise<string>} Client UUID
 */
async function getClientIdFromFeatureFlag(sessionToken) {
    const url = 'https://staging-api-core.deriv.com/v1/client/feature-flags';

    console.log(`🔍 Getting client ID using feature flag API...`);
    debug.log('Calling feature flag API to get client ID');

    const featureFlagData = {
        flag: 'onboarding_tour_completed',
        value: true,
    };

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Session-Token': sessionToken,
        },
        body: JSON.stringify(featureFlagData),
    };

    const response = DEBUG_MODE ? await debugFetch(url, options) : await fetch(url, options);

    if (!response.ok) {
        throw new Error(`Failed to get client ID from feature flag: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data && data.data && data.data.client_id) {
        console.log(`✅ Client ID found: ${data.data.client_id}`);
        return data.data.client_id;
    } else {
        throw new Error('Client ID not found in feature flag response');
    }
}

/**
 * Get login flow ID from Deriv auth service
 * @returns {Promise<string>} Flow ID
 */
async function getLoginFlowId() {
    const url = `${STAGING_AUTH_URL}/self-service/login/api`;

    debug.log('Getting login flow ID');

    const options = {
        method: 'GET',
    };

    const response = DEBUG_MODE ? await debugFetch(url, options) : await fetch(url, options);

    if (!response.ok) {
        throw new Error(`Failed to get login flow ID: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.id) {
        debug.log('Flow ID obtained', { flowId: data.id });
        return data.id;
    } else {
        throw new Error('Login flow response missing id');
    }
}

/**
 * Login with email and password to get session token
 * @param {string} flowId - Login flow ID
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<string>} Session token (ory token)
 */
async function loginWithPassword(flowId, email, password) {
    const url = `${STAGING_AUTH_URL}/self-service/login?flow=${flowId}`;

    debug.log('Logging in with password', { email, flowId });

    const loginData = {
        identifier: email,
        method: 'password',
        password: password,
    };

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
    };

    const response = DEBUG_MODE ? await debugFetch(url, options) : await fetch(url, options);

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Login failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();

    if (data.session_token) {
        debug.log('Session token obtained', { token_length: data.session_token.length });
        console.log('✅ Login successful');
        return data.session_token;
    } else {
        throw new Error('Login response missing session_token');
    }
}

/**
 * Login with email and get session token
 * @param {string} email - Email address
 * @param {string} password - Account password
 * @returns {Promise<string>} Session token
 */
async function loginAndGetSessionToken(email, password) {
    console.log('🔐 Logging in to get client ID...');

    // Step 1: Get flow ID
    const flowId = await getLoginFlowId();

    // Step 2: Login with password to get session token
    const sessionToken = await loginWithPassword(flowId, email, password);

    return sessionToken;
}

/**
 * Get M2M authentication token for file API (dummy1)
 * @param {string} passphrase - Passphrase for decrypting credentials
 * @returns {Promise<string>} Access token for file API
 */
async function getFileAPIToken(passphrase) {
    const url = 'https://staging-deriv-m2m-auth.auth.us-east-1.amazoncognito.com/oauth2/token';

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
            Host: 'staging-deriv-m2m-auth.auth.us-east-1.amazoncognito.com',
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
    const url = 'https://staging-deriv-m2m-auth.auth.us-east-1.amazoncognito.com/oauth2/token';

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
            Host: 'staging-deriv-m2m-auth.auth.us-east-1.amazoncognito.com',
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
 * Upload file for POI workflow
 * @param {string} clientId - Client UUID
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
 * @param {string} clientId - Client UUID
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
                change_reason: 'POI status update via v2_poi_poa script',
                staff_name: 'qa_automation',
                ip_addr: '1.1.1.1',
                system: 'v2_poi_poa_script',
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
            validator: 'qa_automation',
            files: [
                {
                    id: fileId,
                },
            ],
            issuance_date: '2020-10-10',
            state: state,
            rejection_reasons: rejectionReasons,
            audit: {
                change_reason: 'POA status update via v2_poi_poa script',
                staff_name: 'qa_automation',
                ip_addr: '1.1.1.1',
                system: 'v2_poi_poa_script',
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

            if (value && !value.startsWith('--')) {
                args[key] = value;
                i++; // Skip the value in next iteration
            } else {
                args[key] = true; // Flag without value
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
🚀 Deriv POI/POA Status Management Script

This script allows you to update POI (Proof of Identity) and POA (Proof of Address) 
status for existing Deriv accounts.

Usage: node v2_poi_poa.js [options]

Required Options:
  --apikey <key>           Mailisk API key (used for credential decryption)

Client Identification (choose one):
  Option 1: Direct client ID
    --client_id <uuid>     Client UUID (if known)

  Option 2: Login with credentials  
    --email <email>        Email address of the account
    --password <password>  Account password

POI Options:
  --poi <state>            POI state: 'approved' or 'rejected'
  --poi_rejection_reasons <reasons>  POI rejection reasons (comma-separated)

POA Options:
  --poa <state>            POA state: 'approved' or 'rejected'
  --poa_rejection_reasons <reasons>  POA rejection reasons (comma-separated)

Other Options:
  --debug                  Enable debug mode for detailed logging
  --help                   Show this help message

Examples:
  # Set POI to approved using client ID
  node v2_poi_poa.js --client_id a1b2c3d4-e5f6-7890-abcd-ef1234567890 --apikey YOUR_KEY --poi approved

  # Set POI to approved using email and password
  node v2_poi_poa.js --email user@webapps.mailisk.net --password MyPassword123 --apikey YOUR_KEY --poi approved

  # Set POI to rejected with reasons
  node v2_poi_poa.js --email user@webapps.mailisk.net --password MyPassword123 --apikey YOUR_KEY --poi rejected --poi_rejection_reasons "EXPIRED,BLURRY"

  # Set POA to approved
  node v2_poi_poa.js --email user@webapps.mailisk.net --password MyPassword123 --apikey YOUR_KEY --poa approved

  # Set POA to rejected with reasons
  node v2_poi_poa.js --email user@webapps.mailisk.net --password MyPassword123 --apikey YOUR_KEY --poa rejected --poa_rejection_reasons "ADDRESS_MISMATCH"

  # Set both POI and POA
  node v2_poi_poa.js --email user@webapps.mailisk.net --password MyPassword123 --apikey YOUR_KEY --poi approved --poa rejected --poa_rejection_reasons "DOCUMENT_TOO_OLD"

  # Enable debug mode
  node v2_poi_poa.js --email user@webapps.mailisk.net --password MyPassword123 --apikey YOUR_KEY --poi approved --debug

Common POI Rejection Reasons:
  - NAME_MISMATCH: Name doesn't match account
  - EXPIRED: Document has expired  
  - DOB_MISMATCH: Date of birth doesn't match account

Common POA Rejection Reasons:
  - ADDRESS_MISMATCH: Address doesn't match account

Note: You can provide either --client_id directly or use --email and --password to login and extract the client ID automatically.

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

        // Set debug mode
        if (args.debug) {
            DEBUG_MODE = true;
            console.log('🔍 Debug mode enabled');
        }

        // Validate required arguments - apikey is always required
        if (!args.apikey) {
            console.error(`❌ Missing required argument: apikey`);
            console.error('Use --help for usage information');
            process.exit(1);
        }

        // Validate client identification - either client_id OR (email AND password)
        if (!args.client_id && (!args.email || !args.password)) {
            console.error(`❌ Client identification required. Choose one:`);
            console.error('  Option 1: Provide --client_id <uuid>');
            console.error('  Option 2: Provide --email <email> --password <password>');
            console.error('Use --help for usage information');
            process.exit(1);
        }

        // Ensure both email and password are provided if using login method
        if ((args.email && !args.password) || (!args.email && args.password)) {
            console.error('❌ Both --email and --password are required when using login method');
            process.exit(1);
        }

        // Validate that at least one action is specified
        if (!args.poi && !args.poa) {
            console.error('❌ At least one of --poi or --poa must be specified');
            console.error('Use --help for usage information');
            process.exit(1);
        }

        // Validate POI state if provided
        if (args.poi && !['approved', 'rejected'].includes(args.poi)) {
            console.error('❌ POI state must be "approved" or "rejected"');
            process.exit(1);
        }

        // Validate POA state if provided
        if (args.poa && !['approved', 'rejected'].includes(args.poa)) {
            console.error('❌ POA state must be "approved" or "rejected"');
            process.exit(1);
        }

        console.log('\n🚀 Starting POI/POA status update process...');

        // Get client ID - either provided directly or via login
        let clientId = args.client_id;

        if (!clientId) {
            // Need to login to get client ID
            console.log(`📧 Email: ${args.email}`);
            const sessionToken = await loginAndGetSessionToken(args.email, args.password);
            clientId = await getClientIdFromFeatureFlag(sessionToken);
        }

        console.log(`🆔 Client ID: ${clientId}`);

        if (args.poi) {
            console.log(`📋 POI Status: ${args.poi}`);
            if (args.poi_rejection_reasons) {
                console.log(`📋 POI Rejection Reasons: ${args.poi_rejection_reasons}`);
            }
        }

        if (args.poa) {
            console.log(`🏠 POA Status: ${args.poa}`);
            if (args.poa_rejection_reasons) {
                console.log(`🏠 POA Rejection Reasons: ${args.poa_rejection_reasons}`);
            }
        }

        // Handle POI workflow
        if (args.poi) {
            console.log('\n==================================================');
            console.log('🔄 Processing POI Workflow');
            console.log('==================================================');

            // Upload two files for POI (selfie and front)
            const poiFile1 = await uploadPOIFile(clientId, args.apikey);
            const poiFile2 = await uploadPOIFile(clientId, args.apikey);

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
                args.apikey
            );
        }

        // Handle POA workflow
        if (args.poa) {
            console.log('\n==================================================');
            console.log('🔄 Processing POA Workflow');
            console.log('==================================================');

            // Upload file for POA
            const poaFile = await uploadPOAFile(clientId, args.apikey);

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
                args.apikey
            );
        }

        console.log('\n🎉 POI/POA status update completed successfully!');
        console.log(`🆔 Client ID: ${clientId}`);

        if (args.poi) {
            console.log(`🆔 POI Status: ${args.poi}`);
            if (args.poi_rejection_reasons) {
                console.log(`🆔 POI Rejection Reasons: ${args.poi_rejection_reasons}`);
            }
        }

        if (args.poa) {
            console.log(`🏠 POA Status: ${args.poa}`);
            if (args.poa_rejection_reasons) {
                console.log(`🏠 POA Rejection Reasons: ${args.poa_rejection_reasons}`);
            }
        }
    } catch (error) {
        console.error('\n❌ Error during POI/POA status update:');
        console.error(error.message);

        if (DEBUG_MODE) {
            console.error('\n🔍 Full error details:');
            console.error(error);
        }

        process.exit(1);
    }
}

main();
