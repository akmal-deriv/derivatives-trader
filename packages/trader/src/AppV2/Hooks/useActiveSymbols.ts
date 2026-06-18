import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { useQuery } from '@deriv/api';
import { routes } from '@deriv/shared';
import { useStore } from '@deriv/stores';
import { localize } from '@deriv-com/translations';

import { isMultiplierOnlySymbol } from 'AppV2/Utils/symbol-categories-utils';
import { useTraderStore } from 'Stores/useTraderStores';

// Cache configuration for active symbols query
const ACTIVE_SYMBOLS_CACHE_CONFIG = {
    CACHE_TIME: 10 * 60 * 1000, // 10 minutes - keep in cache even if unused
} as const;

/**
 * Hook to fetch and manage active symbols for trading
 */
const useActiveSymbols = () => {
    const { common } = useStore();
    const { showError } = common;
    const { setActiveSymbolsV2 } = useTraderStore();
    const { pathname } = useLocation();
    // The mobile automation tab (its own route) can't trade Multipliers, so
    // hide Multiplier-only markets from its market list.
    const exclude_multiplier_only = pathname === routes.trader_automate;

    // Fetch all active symbols without contract_type filter.
    // Previously, contract_type was included in the payload which caused
    // React Query to refetch whenever contract_type changed during initialization.
    // The contract_type filter is not needed — useContractsFor already filters
    // available contracts for the selected symbol.
    const {
        data: response,
        error: queryError,
        isLoading,
    } = useQuery('active_symbols', {
        payload: {
            active_symbols: 'brief',
        },
        options: {
            cacheTime: ACTIVE_SYMBOLS_CACHE_CONFIG.CACHE_TIME,
            staleTime: ACTIVE_SYMBOLS_CACHE_CONFIG.CACHE_TIME,
            keepPreviousData: true,
        },
    });

    // Handle query errors
    useEffect(() => {
        if (queryError) {
            showError({ message: localize('Failed to load market data. Please refresh the page.') });
        }
    }, [queryError, showError]);

    // Update MobX store when data is received (for trade-store internal operations).
    // Always stores the full, unfiltered list — the filter below only affects
    // what this hook returns for display.
    useEffect(() => {
        if (!response) return;

        const { active_symbols = [] } = response;

        if (!active_symbols?.length) {
            showError({ message: localize('Trading is unavailable at this time.') });
            setActiveSymbolsV2([]);
        } else {
            // Update store with fresh data
            setActiveSymbolsV2(active_symbols);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [response]);

    const activeSymbols = useMemo(() => {
        const all_symbols = response?.active_symbols || [];
        return exclude_multiplier_only ? all_symbols.filter(symbol => !isMultiplierOnlySymbol(symbol)) : all_symbols;
    }, [response, exclude_multiplier_only]);

    return {
        activeSymbols,
        isLoading,
    };
};

export default useActiveSymbols;
