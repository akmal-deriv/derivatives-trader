import React, { useCallback, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { isTurbosContract } from '@deriv/shared';
import { Localize } from '@deriv-com/translations';

import { TradeParameterPopover, useTradeParameterPopover } from 'AppV2/Components/TradeParameters/Shared';
import { useTraderStore } from 'Stores/useTraderStores';

import BarrierContentDesktop from './barrier-content-desktop';
import BarrierTypeSelector from './barrier-type-selector';

interface BarrierDesktopProps {
    is_minimized?: boolean;
}

const getBarrierType = (barrier: string, support: 'relative' | 'absolute'): string => {
    if (support === 'absolute') return 'fixed_barrier';
    return barrier?.startsWith('-') ? 'below_spot' : 'above_spot';
};

const BarrierPopoverContent: React.FC<{
    selectedType: string;
    onSelectType: (type: string) => void;
    support: 'relative' | 'absolute';
}> = ({ selectedType, onSelectType, support }) => {
    const { closePopover } = useTradeParameterPopover();

    return (
        <div className='barrier-popover__layout'>
            <div className='barrier-popover__sidebar'>
                <BarrierTypeSelector selectedType={selectedType} onSelectType={onSelectType} support={support} />
            </div>
            <div className='barrier-popover__main'>
                <div className='barrier-popover__content'>
                    <BarrierContentDesktop barrierType={selectedType} onClose={closePopover} />
                </div>
            </div>
        </div>
    );
};

const BarrierDesktop: React.FC<BarrierDesktopProps> = observer(({ is_minimized }) => {
    const trade_store = useTraderStore();
    const { barrier_1, contract_type, is_market_closed, symbol } = trade_store;
    const is_turbos = isTurbosContract(contract_type);

    // Barrier support (relative offset vs absolute price), derived from the sign of the API's
    // per-expiry-type default barrier — shared with the mobile barrier input.
    const barrierSupport = trade_store.getSymbolBarrierSupport(symbol);

    const initialType = useMemo(() => getBarrierType(barrier_1, barrierSupport), [barrier_1, barrierSupport]);
    const [selectedType, setSelectedType] = useState(initialType);

    React.useEffect(() => {
        setSelectedType(initialType);
    }, [initialType]);

    const handleTypeSelect = useCallback((type: string) => {
        setSelectedType(type);
    }, []);

    return (
        <TradeParameterPopover
            popoverWidth={360}
            label={<Localize i18n_default_text='Barrier' key={`barrier${is_minimized ? '-minimized' : ''}`} />}
            value={barrier_1}
            is_minimized={is_minimized}
            disabled={is_market_closed}
            popover_classname='barrier-popover'
            description={
                is_turbos ? (
                    <Localize i18n_default_text="This is the corresponding price level based on the payout per point you've selected. If this barrier is ever breached, your contract would be terminated." />
                ) : undefined
            }
        >
            <BarrierPopoverContent
                selectedType={selectedType}
                onSelectType={handleTypeSelect}
                support={barrierSupport}
            />
        </TradeParameterPopover>
    );
});

export default BarrierDesktop;
