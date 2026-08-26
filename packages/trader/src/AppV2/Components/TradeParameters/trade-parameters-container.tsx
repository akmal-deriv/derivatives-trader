import React from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';

import { useStore } from '@deriv/stores';

import ClosedMarketMessage from 'AppV2/Components/ClosedMarketMessage';
import PurchaseButton from 'AppV2/Components/PurchaseButton';
import { isTradeParamVisible } from 'AppV2/Utils/layout-utils';
import { useTraderStore } from 'Stores/useTraderStores';

import TradeParameters from './trade-parameters';
import TradeTypeTabs from './TradeTypeTabs';

type TTradeParametersContainer = {
    is_market_closed?: boolean;
};

/**
 * Mobile bottom sheet holding the trade params and the Buy button. The params row sizes every
 * param to fit the screen at once, so the sheet has a single, fixed height — there is no
 * expand/collapse affordance and `TradeParameters` is always rendered minimized. Each param still
 * opens its own action sheet on tap, which is where full (untruncated) values live.
 */
const TradeParametersContainer = ({ is_market_closed }: TTradeParametersContainer) => {
    const { contract_type, has_cancellation, symbol } = useTraderStore();
    const {
        ui: { is_chart_maximized },
    } = useStore();

    return (
        <div
            className={clsx('trade-params__container', {
                'trade-params__container--chart-maximized': is_chart_maximized,
            })}
            data-testid='trade-params-container'
        >
            {isTradeParamVisible({ component_key: 'trade_type_tabs', contract_type, has_cancellation, symbol }) && (
                <div className='trade-params__container-tabs'>
                    <TradeTypeTabs />
                </div>
            )}
            <div className='trade-params__container-content'>
                <section className='trade-params--minimized'>
                    <TradeParameters is_minimized />
                    <ClosedMarketMessage />
                    {!is_market_closed && <PurchaseButton />}
                </section>
            </div>
        </div>
    );
};

export default observer(TradeParametersContainer);
