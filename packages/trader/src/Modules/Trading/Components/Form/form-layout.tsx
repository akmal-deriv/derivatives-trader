import React, { Suspense } from 'react';

import { observer, useStore } from '@deriv/stores';

import { useTraderStore } from 'Stores/useTraderStores.js';

// Move React.lazy outside the component to prevent potential race conditions
const ScreenLarge = React.lazy(() => import(/* webpackChunkName: "screen-large" */ './screen-large'));

type TFormLayout = {
    is_market_closed: ReturnType<typeof useTraderStore>['is_market_closed'];
    is_trade_enabled: boolean;
};

const FormLayout = observer(({ is_market_closed, is_trade_enabled }: TFormLayout) => {
    const { common, client } = useStore();
    const { current_language } = common;
    const { is_logging_in } = client;

    return (
        <React.Fragment key={current_language}>
            <Suspense fallback={null}>
                <ScreenLarge
                    is_trade_enabled={is_trade_enabled}
                    is_market_closed={is_market_closed}
                    is_single_logging_in={is_logging_in}
                />
            </Suspense>
        </React.Fragment>
    );
});

export default React.memo(FormLayout);
