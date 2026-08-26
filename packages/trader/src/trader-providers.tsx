import React from 'react';

import { APIProvider } from '@deriv/api';
import { StoreProvider } from '@deriv/stores';
import type { TCoreStores } from '@deriv/stores/types';

import { AutomationStoreProvider } from 'Stores/useAutomationStore';
import { TraderStoreProvider } from 'Stores/useTraderStores';

export const TraderProviders = ({ children, store }: React.PropsWithChildren<{ store: TCoreStores }>) => {
    return (
        <StoreProvider store={store}>
            <APIProvider>
                <TraderStoreProvider>
                    <AutomationStoreProvider>{children}</AutomationStoreProvider>
                </TraderStoreProvider>
            </APIProvider>
        </StoreProvider>
    );
};

export default TraderProviders;
