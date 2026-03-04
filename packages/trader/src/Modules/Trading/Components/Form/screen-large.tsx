import React from 'react';
import classNames from 'classnames';

import { TradeParamsLoader } from 'App/Components/Elements/ContentLoader';
import Fieldset from 'App/Components/Form/fieldset';

import ContractType from '../../Containers/contract-type';
import Purchase from '../../Containers/purchase';
import TradeParams from '../../Containers/trade-params';
import TradeParamsFooter from '../Elements/trade-params-footer';

type TScreenLarge = {
    is_market_closed?: boolean;
    is_trade_enabled: boolean;
    is_single_logging_in?: boolean;
};
const ScreenLarge = ({ is_market_closed = false, is_trade_enabled, is_single_logging_in = false }: TScreenLarge) => (
    <div
        className={classNames('trade-params-v1__items', {
            'trade-params-v1__items--market-closed': is_market_closed,
        })}
    >
        {!is_trade_enabled || is_single_logging_in ? (
            <div className='trade-params-v1__items-content'>
                <TradeParamsLoader speed={2} />
            </div>
        ) : (
            <React.Fragment>
                <div className='trade-params-v1__items-content'>
                    <Fieldset className='trade-container__fieldset trade-types'>
                        <ContractType />
                    </Fieldset>
                    <TradeParams />
                    <div className='purchase-container'>
                        <Purchase is_market_closed={is_market_closed} />
                    </div>
                </div>
                <TradeParamsFooter />
            </React.Fragment>
        )}
    </div>
);

export default ScreenLarge;
