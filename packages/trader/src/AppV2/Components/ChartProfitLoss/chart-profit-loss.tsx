import React from 'react';

import { getSymbolDisplayName, isAccumulatorContract, trackPlPillClicked } from '@deriv/shared';
import { observer, useStore } from '@deriv/stores';
import { useDevice } from '@deriv-com/ui';

import { filterPositionsBySymbolAndTradeType, getTotalPositionsProfit } from 'AppV2/Utils/positions-utils';
import { useTraderStore } from 'Stores/useTraderStores';

import OpenPositionsSheet from './open-positions-sheet';
import ProfitLossPill from './profit-loss-pill';

import './chart-profit-loss.scss';

const ChartProfitLoss = observer(() => {
    const { isMobile } = useDevice();
    const {
        client: { currency },
        common: { server_time },
        portfolio: { active_positions, onClickCancel, onClickSell },
    } = useStore();
    const { symbol, contract_type } = useTraderStore();
    const [is_open, setIsOpen] = React.useState(false);

    // Accumulators allow only one running contract at a time, so the multi-contract pill/sheet does
    // not apply — the feature covers every other trade type.
    const is_accumulator = isAccumulatorContract(contract_type);

    // Running contracts for the currently selected market + trade type (same set drawn on the chart).
    // Computed inline (not memoised) so the observer tracks bid-price updates and the P/L stays live.
    const filtered_positions = is_accumulator
        ? []
        : filterPositionsBySymbolAndTradeType(active_positions, symbol, contract_type);
    const count = filtered_positions.length;
    const total_profit = getTotalPositionsProfit(filtered_positions);
    const market_name = getSymbolDisplayName(symbol);

    // Close the sheet once the last running contract for this market/trade type has closed.
    React.useEffect(() => {
        if (count === 0 && is_open) setIsOpen(false);
    }, [count, is_open]);

    if (!isMobile || is_accumulator || count === 0) return null;

    return (
        <React.Fragment>
            <ProfitLossPill
                count={count}
                currency={currency}
                onClick={() => {
                    trackPlPillClicked({
                        market_name,
                        open_position_count: count,
                        pl_value: total_profit,
                        pl_state: total_profit >= 0 ? 'profit' : 'loss',
                        trade_type: contract_type,
                    });
                    setIsOpen(true);
                }}
                totalProfit={total_profit}
            />
            <OpenPositionsSheet
                currency={currency}
                isOpen={is_open}
                marketName={market_name}
                onClickCancel={onClickCancel}
                onClickSell={onClickSell}
                onClose={() => setIsOpen(false)}
                positions={filtered_positions}
                serverTime={server_time}
                totalProfit={total_profit}
            />
        </React.Fragment>
    );
});

export default ChartProfitLoss;
