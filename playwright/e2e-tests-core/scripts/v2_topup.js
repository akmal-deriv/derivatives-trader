#!/usr/bin/env node
/**
 * Deriv Wallet Top-up Script
 *
 * This script tops up a wallet with a specified amount and currency.
 *
 * Usage:
 * - Requires wallet_id, apikey, currency, and amount
 */

const WALLETS_INTERNAL_TEST_URL = 'https://xano-prod.deriv.cloud/tenant/tfek-t9ct-1ca0/api:tN1Ud5uD';
const STAGING_AUTH_URL = 'https://staging-auth.deriv.com';
const STAGING_API_CORE_URL = 'https://staging-api-core.deriv.com';

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

    // Clone the response to read it twice
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

    debug.apiResponse(response.status, response.statusText, response.headers, responseBody);

    return response;
}

// Encrypted M2M credentials (AES-256-CBC with PBKDF2)
const ENCRYPTED_M2M_CREDENTIALS = {
    client_id: 'U2FsdGVkX1/S8iIuaEyD+h4HacR/i6Mn6prGnWTkAXlOklBrtOATtVxGMhhlGsP9',
    client_secret:
        'U2FsdGVkX1/znGMrtr8srRv57fe/4+8Y5TTj1qEBWor3sFIUocmoSpvqlIpte91NvjUf0UskO+CcUMOAqtsRp3PX1qkZ47jg0OfI3kTcfnk=',
};

/**
 * Decrypt credentials using OpenSSL command
 * @param {string} encryptedData - Base64 encrypted data
 * @param {string} passphrase - Decryption key
 * @returns {Promise<string>} Decrypted text
 */
async function decryptCredential(encryptedData, passphrase) {
    const { execSync } = require('child_process');

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
 * @returns {Promise<string>} M2M access token
 */
async function getM2MAuthToken(apiKey) {
    const url = 'https://staging-deriv-m2m-auth.auth.us-east-1.amazoncognito.com/oauth2/token';

    const clientId = await decryptCredential(ENCRYPTED_M2M_CREDENTIALS.client_id, apiKey);
    const clientSecret = await decryptCredential(ENCRYPTED_M2M_CREDENTIALS.client_secret, apiKey);

    debug.log('Getting M2M authentication token');

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append(
        'scope',
        'WalletResourceService/read_balances WalletResourceService/transfer_wallets WalletResourceService/manage_holds WalletResourceService/transfer_cashier WalletResourceService/create_transaction WalletResourceService/read_transactions WalletResourceService/transfer_platform WalletResourceService/create_wallet WalletResourceService/set_wallet_status'
    );

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
        debug.log('M2M token obtained', { token_length: data.access_token.length });
        return data.access_token;
    } else {
        throw new Error('M2M auth response missing access_token');
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
 * Get total balance and extract wallet ID
 * @param {string} sessionToken - Ory session token
 * @returns {Promise<string>} Wallet ID
 */
async function getTotalBalance(sessionToken) {
    const url = `${STAGING_API_CORE_URL}/v1/client/total-balance`;

    debug.log('Getting total balance to extract wallet ID');

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
        debug.log('Wallet ID extracted', { walletId });
        console.log(`💼 Wallet ID found: ${walletId}`);
        return walletId;
    } else {
        throw new Error('No wallet found in total-balance response');
    }
}

/**
 * Get wallet ID either from parameter or by logging in
 * @param {Object} args - Command line arguments
 * @returns {Promise<string>} Wallet ID
 */
async function getWalletId(args) {
    // If wallet_id is provided, use it directly
    if (args.wallet_id) {
        debug.log('Using provided wallet ID', { walletId: args.wallet_id });
        return args.wallet_id;
    }

    // Otherwise, login with email and password to get wallet ID
    if (!args.email || !args.password) {
        throw new Error('Either --wallet_id or both --email and --password must be provided');
    }

    console.log('🔐 Logging in to get wallet ID...');

    // Step 1: Get flow ID
    const flowId = await getLoginFlowId();

    // Step 2: Login with password to get session token
    const sessionToken = await loginWithPassword(flowId, args.email, args.password);

    // Step 3: Get wallet ID from total-balance
    const walletId = await getTotalBalance(sessionToken);

    return walletId;
}

/**
 * Top-up wallet balance
 * @param {string} walletId - Wallet ID to top-up
 * @param {string} walletCurrency - Wallet currency (e.g., 'USD', 'EUR', 'BTC')
 * @param {number} amount - Amount to top-up
 * @param {string} mailiskApiKey - Mailisk API key used as decryption passphrase
 * @returns {Promise<Object>} Response data with transaction details
 */
async function topUpWallet(walletId, walletCurrency, amount, mailiskApiKey) {
    const m2mToken = await getM2MAuthToken(mailiskApiKey);

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
                description: 'Created from v2_topup.js',
            },
            description: 'Created from v2_topup.js by QA team',
        },
    };

    console.log(`💰 Topping up wallet ${walletId} with ${amount} ${walletCurrency}...`);
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
        console.log(`✅ Wallet topped up successfully`);
        console.log(`   Wallet ID: ${walletId}`);
        console.log(`   Amount: ${amount} ${walletCurrency}`);
        console.log(`   Request ID: ${requestId}`);
        console.log(`   External Reference ID: ${externalReferenceId}`);
        return {
            success: true,
            requestId: requestId,
            externalReferenceId: externalReferenceId,
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
                i++;
            } else {
                args[key] = true;
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
🚀 Deriv Wallet Top-up Script

Usage: node v2_topup.js [options]

Required Options:
  --apikey <key>          Mailisk API key (used for M2M authentication)
  --currency <currency>    Currency code (e.g., 'USD', 'BTC', 'TRX')
  --amount <amount>        Amount to top-up

Wallet Identification (choose one):
  Option 1: Direct wallet ID
    --wallet_id <id>       Wallet ID to top-up

  Option 2: Login with credentials
    --email <email>        User email address
    --password <password>  User password

Optional Options:
  --debug                  Enable debug mode for detailed logging
  --help                   Show this help message

Note: A random external_reference_id (UUID) is automatically generated for each transaction.

Examples:
  # Top-up using wallet ID directly
  node v2_topup.js --wallet_id 6ba2eeef-2164-44ed-8e62-9921a51a7111 --apikey MAILISK_API_KEY --currency USD --amount 1000

  # Top-up using email and password (script will login and get wallet ID)
  node v2_topup.js --email "user@example.com" --password "mypassword" --apikey MAILISK_API_KEY --currency USD --amount 1000

  # Top-up with debug mode enabled
  node v2_topup.js --email "user@example.com" --password "mypassword" --apikey MAILISK_API_KEY --currency USD --amount 500 --debug

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

        // Validate required arguments
        const requiredArgs = ['apikey', 'currency', 'amount'];
        const missingArgs = requiredArgs.filter(arg => !args[arg]);

        if (missingArgs.length > 0) {
            console.error(`❌ Missing required arguments: ${missingArgs.join(', ')}`);
            console.error('Use --help for usage information');
            process.exit(1);
        }

        // Validate wallet identification method
        const hasWalletId = !!args.wallet_id;
        const hasEmailPassword = !!(args.email && args.password);

        if (!hasWalletId && !hasEmailPassword) {
            console.error('❌ Either --wallet_id or both --email and --password must be provided');
            console.error('Use --help for usage information');
            process.exit(1);
        }

        if (hasEmailPassword && !args.email) {
            console.error('❌ --email is required when using password authentication');
            process.exit(1);
        }

        if (hasEmailPassword && !args.password) {
            console.error('❌ --password is required when using email authentication');
            process.exit(1);
        }

        // Parse amount as number
        const amount = parseFloat(args.amount);
        if (isNaN(amount) || amount <= 0) {
            console.error('❌ Amount must be a positive number');
            process.exit(1);
        }

        console.log('\n🚀 Starting wallet top-up process...');
        console.log(`💱 Currency: ${args.currency}`);
        console.log(`💰 Amount: ${amount}`);

        // Get wallet ID (either from parameter or by logging in)
        const walletId = await getWalletId(args);
        console.log(`💼 Wallet ID: ${walletId}`);

        // Top-up wallet
        const result = await topUpWallet(walletId, args.currency, amount, args.apikey);

        console.log('\n🎉 Top-up completed successfully!');
    } catch (error) {
        console.error('\n❌ Error during wallet top-up:');
        console.error(error.message);

        if (DEBUG_MODE) {
            console.error('\n🔍 Full error details:');
            console.error(error);
        }

        process.exit(1);
    }
}

main();
