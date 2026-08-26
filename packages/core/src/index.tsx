/* eslint-disable import/no-named-as-default-member */
/* eslint-disable import/no-named-as-default */
import React from 'react';
import { createRoot } from 'react-dom/client';

import App from 'App/app.jsx';
import { connectClient, initStore } from 'App/initStore';
import { AnalyticsInitializer } from 'Utils/Analytics';
// eslint-disable-next-line
import registerServiceWorker from 'Utils/PWA';

import AppNotificationMessages from './App/Containers/app-notification-messages.jsx';

if (
    !!window?.localStorage.getItem?.('debug_service_worker') || // To enable local service worker related development
    !window.location.hostname.startsWith('localhost')
) {
    registerServiceWorker();
}

const initApp = async () => {
    // Validate session and create the RootStore. React mounts as soon as this resolves.
    const { root_store, external_id, account_id } = await initStore(AppNotificationMessages);

    const wrapper = document.getElementById('derivatives_trader');
    if (wrapper) {
        const root = createRoot(wrapper);
        root.render(<App root_store={root_store} />);
        AnalyticsInitializer();
    }

    // Open the WebSocket and finish initializing the client store in the background.
    // Components observe `is_logging_in` / `is_client_store_initialized` for loading state.
    // Catch at the call site so an uncaught error (e.g. NetworkMonitor.init failure) is logged
    // rather than swallowed as an unhandled promise rejection — otherwise the app shell stays
    // in a permanent "logging in" state with no console signal.
    connectClient(root_store, external_id, account_id).catch(e => {
        // eslint-disable-next-line no-console
        console.error('connectClient failed:', e);
    });
};

initApp();
