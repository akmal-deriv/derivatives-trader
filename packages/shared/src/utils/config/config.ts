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
 * Strictly demo: the account_id begins with the `DOT` prefix.
 */
export const isDemoAccountId = (account_id?: string | null): boolean => !!account_id?.startsWith('DOT');

/**
 * Strictly real: the account_id begins with the `ROT` prefix.
 */
export const isRealAccountId = (account_id?: string | null): boolean => !!account_id?.startsWith('ROT');

/**
 * Resolves the WebSocket server segment purely from the account_id prefix. There is no
 * `account_type` URL param, localStorage value or fallback: `DOT…` → demo, `ROT…` → real,
 * and anything else (missing or unrecognised id) → public. We never guess `real`.
 * @returns 'demo', 'real', or 'public'
 */
export const getAccountServer = (account_id: string | null = getAccountId()): 'demo' | 'real' | 'public' => {
    if (isDemoAccountId(account_id)) return 'demo';
    if (isRealAccountId(account_id)) return 'real';
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

/** Removes a stale `account_type` query param from the URL (deprecated; server follows the account_id prefix). */
export const clearAccountTypeParam = (): void => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('account_type')) {
        url.searchParams.delete('account_type');
        window.history.replaceState({}, document.title, url.pathname + url.search);
    }
};

/**
 * Gets migrated status from localStorage (set during app init via migration-status API)
 * @returns true if user is a fully migrated user
 */
export const getIsMigratedUser = (): boolean => {
    return localStorage.getItem('is_migrated_user') === 'true';
};

/**
 * Gets the complete WebSocket URL with proper endpoint and query params
 * @returns Complete WebSocket URL
 */
export const getCompleteWebSocketURL = (): string => {
    const server = getSocketURL();
    const account_id = getAccountId();
    const server_type = getAccountServer(account_id); // 'demo' | 'real' | 'public'

    // Authenticated endpoints (demo/real) carry the account_id; public never does.
    const is_authenticated = server_type !== 'public';

    let url = `wss://${server}/${server_type}`;
    if (is_authenticated) {
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
