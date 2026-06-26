/*
 * Configuration values needed in js codes
 *
 * NOTE:
 * Please use the following command to avoid accidentally committing personal changes
 * git update-index --assume-unchanged packages/shared/src/utils/config.js
 *
 */

import Cookies from 'js-cookie';

import { getWebSocketURL } from '../brand';

/**
 * Reads the account_id from the shared `.deriv.com` `options_account_id` cookie.
 * This cookie is written by home.deriv.com on login (real account if the user has
 * one, otherwise the demo account) and removed on logout, so it acts as the
 * cross-subdomain session hint. The value is a plain account_id string, and since
 * account_id === loginid in this system it is a valid account_id as-is.
 * @returns account_id string or null when the cookie is missing
 */
const getAccountIdFromCookie = (): string | null => Cookies.get('options_account_id') || null;

/**
 * Gets account_type with priority: URL parameter > localStorage > derived from the
 * resolved account_id (which may itself come from the session cookie) > default 'public'
 * @returns 'real', 'demo', or 'public'
 */
export const getAccountType = (): 'real' | 'demo' | 'public' => {
    const search = window.location.search;
    const search_params = new URLSearchParams(search);
    const accountTypeFromUrl = search_params.get('account_type');

    // First priority: URL parameter
    if (accountTypeFromUrl === 'real' || accountTypeFromUrl === 'demo') {
        window.localStorage.setItem('account_type', accountTypeFromUrl);

        // Remove account_type from URL after processing
        const url = new URL(window.location.href);
        if (url.searchParams.has('account_type')) {
            url.searchParams.delete('account_type');
            window.history.replaceState({}, document.title, url.pathname + url.search);
        }

        return accountTypeFromUrl;
    }

    // Second priority: localStorage
    const storedAccountType = window.localStorage.getItem('account_type');
    if (storedAccountType === 'real' || storedAccountType === 'demo') {
        return storedAccountType;
    }

    // Third priority: derive from the resolved account_id. Since account_id === loginid,
    // its prefix gives the type (virtual `VR*` → demo, otherwise real), mirroring
    // getClientAccountType's `/^VR/` check. Deriving from getAccountId() — rather than
    // reading the cookie independently here — guarantees the type matches whichever
    // account_id the app actually uses, even when account_id comes from the URL/localStorage
    // while the shared session cookie belongs to a different account.
    const account_id = getAccountId();
    if (account_id) {
        const account_type = /^VR/.test(account_id) ? 'demo' : 'real';
        window.localStorage.setItem('account_type', account_type);
        return account_type;
    }

    // Default to public when no account_type parameter or invalid value
    return 'public';
};

/**
 * Gets account_id with priority: URL parameter > localStorage > session cookie > null
 * @returns account_id string or null
 */
export const getAccountId = (): string | null => {
    // 1. Check URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const accountIdFromUrl = urlParams.get('account_id');

    if (accountIdFromUrl) {
        localStorage.setItem('account_id', accountIdFromUrl);
        // Remove from URL after storing
        const url = new URL(window.location.href);
        url.searchParams.delete('account_id');
        window.history.replaceState({}, document.title, url.pathname + url.search);
        return accountIdFromUrl;
    }

    // 2. Check localStorage
    const storedAccountId = localStorage.getItem('account_id');
    if (storedAccountId) return storedAccountId;

    // 3. Fall back to the shared `.deriv.com` `options_account_id` cookie. This lets
    // DTrader recognise an existing login from another Deriv app (e.g. home.deriv.com)
    // without a round-trip. Persist it like the URL-param branch so the normal
    // whoami/logout cleanup (which clears localStorage) applies; whoami validates
    // it on init and clears a stale cookie on 401.
    const accountIdFromCookie = getAccountIdFromCookie();
    if (accountIdFromCookie) {
        localStorage.setItem('account_id', accountIdFromCookie);
        return accountIdFromCookie;
    }

    return null;
};

/**
 * Clears account_id from localStorage
 */
export const clearAccountId = (): void => {
    localStorage.removeItem('account_id');
};

/**
 * Gets migrated status from localStorage (set during app init via migration-status API)
 * @returns true if user is a fully migrated user
 */
export const getIsMigratedUser = (): boolean => {
    return localStorage.getItem('is_migrated_user') === 'true';
};

// Automation feature flag, off by default. Reads `?automation` from the URL (set
// at the edge per country) and remembers it; `true` enables, `false` disables.
// Falls back to the saved value when the param isn't in the URL.
export const getIsAutomationEnabled = (): boolean => {
    const automationFromUrl = new URLSearchParams(window.location.search).get('automation');

    if (automationFromUrl !== null) {
        const is_enabled = automationFromUrl === 'true';
        localStorage.setItem('automation_enabled', String(is_enabled));
        // Strip the param from the URL after persisting
        const url = new URL(window.location.href);
        url.searchParams.delete('automation');
        window.history.replaceState({}, document.title, url.pathname + url.search);
        return is_enabled;
    }

    return localStorage.getItem('automation_enabled') === 'true';
};

/**
 * Gets the complete WebSocket URL with proper endpoint and query params
 * @returns Complete WebSocket URL
 */
export const getCompleteWebSocketURL = (): string => {
    const server = getSocketURL();
    const account_id = getAccountId();
    const account_type = getAccountType();

    // Only connect to demo/real if BOTH account_type and account_id are present
    // Otherwise, connect to public endpoint
    const shouldUseAuthenticatedEndpoint = account_id && (account_type === 'real' || account_type === 'demo');

    let url = `wss://${server}/${shouldUseAuthenticatedEndpoint ? account_type : 'public'}`;

    // Add account_id query param for authenticated endpoints (real/demo)
    if (shouldUseAuthenticatedEndpoint) {
        url += `?account_id=${account_id}`;
    }

    return url;
};

export const getSocketURL = () => {
    const local_storage_server_url = window.localStorage.getItem('config.server_url');
    if (local_storage_server_url) {
        // Validate it's a reasonable hostname (not a full URL, no protocol)
        if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(local_storage_server_url)) {
            return local_storage_server_url;
        }
        // Clear invalid value
        window.localStorage.removeItem('config.server_url');
    }

    // Get WebSocket server URL from brand config based on environment
    const server_url = getWebSocketURL();

    return server_url;
};

export const getDebugServiceWorker = () => {
    const debug_service_worker_flag = window.localStorage.getItem('debug_service_worker');
    if (debug_service_worker_flag) return !!parseInt(debug_service_worker_flag);

    return false;
};
