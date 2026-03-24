import React from 'react';
import { when } from 'mobx';

import { trackAnalyticsEvent } from '@deriv/shared';
import type { TCoreStores } from '@deriv/stores/types';

import Routes from 'App/Containers/Routes/routes';
import TradeSettingsExtensions from 'App/Containers/trade-settings-extensions';
import { NetworkStatusToastErrorPopup } from 'Modules/Trading/Containers/toast-popup';
import ModulesProvider from 'Stores/Providers/modules-providers';
import type { TWebSocket } from 'Types';

import TraderProviders from '../trader-providers';

import initStore from './init-store';

import 'Sass/app.scss';

type Apptypes = {
    passthrough: {
        root_store: TCoreStores;
        WS: TWebSocket;
    };
};

const TradeModalsLazy = React.lazy(
    () => import(/* webpackChunkName: "trade-modals", webpackPrefetch: true */ './Containers/Modals')
);

const TradeModals = () => (
    <React.Suspense fallback={null}>
        <TradeModalsLazy />
    </React.Suspense>
);

const App = ({ passthrough }: Apptypes) => {
    const root_store = initStore(passthrough.root_store, passthrough.WS);
    const analyticsCalledRef = React.useRef(false);

    React.useEffect(() => {
        return () => root_store.ui.setPromptHandler(false);
    }, [root_store]);

    React.useEffect(() => {
        // Prevent duplicate analytics calls if component remounts
        if (analyticsCalledRef.current) {
            return;
        }

        // Wait for auth to resolve before firing the event so account_type is correct.
        // For non-logged-in users, is_logging_in is already false so when() fires immediately.
        // For logged-in users, is_logging_in is true until auth completes.
        const dispose = when(
            () => !root_store.client.is_logging_in,
            () => {
                analyticsCalledRef.current = true;
                trackAnalyticsEvent('ce_dtrader_app_v2', {
                    action: 'open',
                });
            }
        );

        return dispose;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <TraderProviders store={root_store}>
            <ModulesProvider store={root_store}>
                <Routes />
                <TradeModals />
                <NetworkStatusToastErrorPopup />
                <TradeSettingsExtensions store={root_store} />
            </ModulesProvider>
        </TraderProviders>
    );
};

export default App;
