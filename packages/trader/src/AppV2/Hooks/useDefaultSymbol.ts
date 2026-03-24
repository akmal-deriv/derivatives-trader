import { useCallback, useEffect, useRef, useState } from 'react';

import { TActiveSymbolsResponse } from '@deriv/api';
import { pickDefaultSymbol, setTradeURLParams } from '@deriv/shared';

import { useTraderStore } from 'Stores/useTraderStores';

import useActiveSymbols from './useActiveSymbols';

// The hook handles the cases when the selected `contract_type` is changed during account switch or if the symbol is not available in the URL param.
const useDefaultSymbol = () => {
    const { processContractsForV2, onChange, symbol: symbol_from_store } = useTraderStore();
    const { activeSymbols: active_symbols } = useActiveSymbols();
    const has_initialized_ref = useRef(false);
    const [symbol, setSymbol] = useState('');

    const isSymbolAvailable = useCallback(
        (active_symbols: NonNullable<TActiveSymbolsResponse['active_symbols']>) => {
            return active_symbols.some(symbol_info => symbol_info.underlying_symbol === symbol_from_store);
        },
        [symbol_from_store]
    );

    const processNewSymbol = useCallback(
        async (new_symbol: string) => {
            const has_initialized = has_initialized_ref.current;
            const is_initailization = !has_initialized && new_symbol;
            const has_symbol_changed = symbol_from_store != new_symbol && new_symbol;

            setSymbol(new_symbol);

            if (is_initailization || has_symbol_changed) {
                await onChange({ target: { name: 'symbol', value: new_symbol } });
                processContractsForV2();
            }
            setTradeURLParams({ symbol: new_symbol });
        },
        [onChange, processContractsForV2, symbol_from_store]
    );

    useEffect(() => {
        const process = async () => {
            if (active_symbols.length === 0) {
                return;
            }

            const is_symbol_available = isSymbolAvailable(active_symbols);
            const has_initialized = has_initialized_ref.current;

            // After initialization, don't override the current symbol just because
            // active_symbols changed (e.g., due to contract_type filter change in useActiveSymbols).
            // Only pick a default during initialization or when no symbol is set.
            // useContractsFor will handle updating the contract type for the selected symbol.
            const should_pick_default = !is_symbol_available && (!has_initialized || !symbol_from_store);

            const new_symbol = should_pick_default
                ? (await pickDefaultSymbol(active_symbols)) || '1HZ100V'
                : symbol_from_store;

            processNewSymbol(new_symbol);
            has_initialized_ref.current = true;
        };
        process();
    }, [active_symbols, isSymbolAvailable, processNewSymbol, symbol_from_store]);

    return { symbol };
};

export default useDefaultSymbol;
