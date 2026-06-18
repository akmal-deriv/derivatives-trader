import React from 'react';

import { observer } from '@deriv/stores';
import { useTranslations } from '@deriv-com/translations';

import { TRADE_MODE } from 'AppV2/Components/Filter/trade-mode-filter';
import useTradeModeFilter from 'AppV2/Hooks/useTradeModeFilter';

import PositionsDrawerDropdownFilter from './positions-drawer-dropdown-filter';

/**
 * Desktop equivalent of the mobile `<TradeModeFilter>` chip + bottom-sheet.
 * Owns the trade-mode options + applies the selection to the positions
 * store; rendering is delegated to the shared `PositionsDrawerDropdownFilter`.
 */
const PositionsDrawerTradeModeFilter = observer(() => {
    const { localize } = useTranslations();
    const { tradeModeFilter, setTradeModeFilter } = useTradeModeFilter();

    const selected_value = tradeModeFilter || TRADE_MODE.ALL;
    const is_active = !!tradeModeFilter && tradeModeFilter !== TRADE_MODE.ALL;

    const options = React.useMemo(
        () => [
            // The default option's chip label differs from the radio label:
            // when no filter is applied the chip reads "Trade modes"
            { value: TRADE_MODE.ALL, label: localize('All'), trigger_label: localize('Trade modes') },
            { value: TRADE_MODE.MANUAL, label: localize('Manual') },
            { value: TRADE_MODE.AUTOMATION, label: localize('Automation') },
        ],
        [localize]
    );

    return (
        <PositionsDrawerDropdownFilter
            name='positions-drawer-trade-mode-filter'
            options={options}
            value={selected_value}
            isActive={is_active}
            onChange={value => setTradeModeFilter(value === TRADE_MODE.ALL ? '' : value)}
        />
    );
});

export default PositionsDrawerTradeModeFilter;
