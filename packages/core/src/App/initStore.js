import { configure } from 'mobx';

import { clearAccountId, getAccountId, getBrandDomains } from '@deriv/shared';

import { checkWhoAmI } from 'Services';
import NetworkMonitor from 'Services/network-monitor';
import RootStore from 'Stores';

configure({ enforceActions: 'observed' });

const setStorageEvents = root_store => {
    window.addEventListener('storage', evt => {
        switch (evt.key) {
            case 'client.accounts': {
                const active_loginid = root_store.client.loginid;
                const new_currency = JSON.parse(evt.newValue)?.[active_loginid]?.currency;
                const old_currency = JSON.parse(evt.oldValue)?.[active_loginid]?.currency;

                if (document.hidden && new_currency && old_currency !== new_currency) {
                    root_store.client.updateAccountCurrency(new_currency, false);
                }
                break;
            }
            case 'active_loginid':
                if (localStorage.getItem('active_loginid') === 'null' || !localStorage.getItem('active_loginid')) {
                    root_store.client.logout();
                }
                if (document.hidden) {
                    window.location.reload();
                }
                break;
            // no default
        }
    });
};

const initStore = async notification_messages => {
    // Check Endpoint from URL need to be done before initializing store to avoid
    // race condition with setting up user session from URL
    const url_query_string = window.location.search;
    const url_params = new URLSearchParams(url_query_string);

    if (url_params.get('action') === 'signup') {
        // If a user comes from the signup process,
        // we need to give him a clean setup
        const server_url = localStorage.getItem('config.server_url');

        localStorage.clear();

        if (server_url) localStorage.setItem('config.server_url', server_url);
    }

    // Handle Ory recovery link for mobile app
    const is_mobile_app = url_params?.get('is_mobile_app');
    const ory_cookie_link = url_params?.get('ory_cookie_link');

    if (is_mobile_app && ory_cookie_link) {
        try {
            const decodedRecoveryLink = atob(ory_cookie_link);

            // Validate URL is from trusted domain
            const url = new URL(decodedRecoveryLink);
            const allowedHosts = getBrandDomains().flatMap(domain => [`auth.${domain}`, `staging-auth.${domain}`]);

            if (!allowedHosts.includes(url.hostname)) {
                // eslint-disable-next-line no-console
                console.error('Invalid ory_cookie_link domain:', url.hostname);
                return root_store; // or throw error
            }

            // Enforce HTTPS
            if (url.protocol !== 'https:') {
                // eslint-disable-next-line no-console
                console.error('ory_cookie_link must use HTTPS');
                return root_store;
            }

            await fetch(decodedRecoveryLink, {
                credentials: 'include',
            });
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error('Failed to decode ory_cookie_link:', e);
        }
    }

    // Check whoami BEFORE initializing NetworkMonitor to prevent connecting with stale credentials
    let external_id;
    const account_id = getAccountId();
    if (account_id) {
        const whoami_result = await checkWhoAmI();

        // If session is invalid (401), clear credentials before any WebSocket connection
        if (whoami_result.error?.code === 401) {
            // Clear credentials to prevent WebSocket from connecting with stale account_id
            clearAccountId();
            localStorage.removeItem('account_type');
            localStorage.removeItem('active_loginid');
            sessionStorage.removeItem('active_loginid');
            localStorage.removeItem('current_account');
        } else if (whoami_result.data?.identity?.external_id) {
            external_id = whoami_result.data.identity.external_id;
        }
    }

    const root_store = new RootStore();

    // Set up global store reference for analytics and other utilities
    if (typeof window !== 'undefined') {
        window.__deriv_store = root_store;
    }

    setStorageEvents(root_store);

    // Now safe to initialize NetworkMonitor - credentials are validated
    NetworkMonitor.init(root_store);
    root_store.client.init(external_id);
    root_store.common.init();
    root_store.ui.init(notification_messages);

    return root_store;
};

export default initStore;
