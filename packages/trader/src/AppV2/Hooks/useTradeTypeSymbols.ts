import { useCallback, useMemo } from 'react';

import { TActiveSymbolsRequest, useQuery } from '@deriv/api';

import { getApiContractTypesForTradeType } from 'AppV2/Utils/contracts-for-utils';
import sortSymbols from 'AppV2/Utils/sort-symbols-utils';
import { TAvailableContract } from 'AppV2/Utils/trade-types-utils';

const TRADE_TYPE_SYMBOLS_CACHE_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Returns the markets available for a given trade-type tab.
 *
 * Rather than asking the API per symbol which trade types it supports (and inverting), we let the
 * server do the filtering: `active_symbols` accepts a `contract_type` filter, so one request returns
 * exactly the symbols tradeable for the selected tab — already account/region-aware. We render that
 * set as-is (no frontend allow-list), ordered by market → submarket via `sortSymbols`. Display names
 * for every symbol come from `getSymbolDisplayName` (getMarketNamesMap), so nothing is dropped.
 *
 * @param trade_type the selected trade-type tab, or undefined to disable the query.
 */
const useTradeTypeSymbols = (trade_type?: TAvailableContract) => {
    const contract_type = useMemo(() => (trade_type ? getApiContractTypesForTradeType(trade_type) : []), [trade_type]);

    const { data, isLoading } = useQuery('active_symbols', {
        payload: {
            active_symbols: 'brief',
            contract_type: contract_type as TActiveSymbolsRequest['contract_type'],
        },
        options: {
            enabled: contract_type.length > 0,
            cacheTime: TRADE_TYPE_SYMBOLS_CACHE_TIME,
            staleTime: TRADE_TYPE_SYMBOLS_CACHE_TIME,
            keepPreviousData: true,
        },
    });

    // Everything tradeable for the trade type, ordered by market → submarket. Closed markets are
    // retained (their exchange_is_open flag drives the CLOSED indicator).
    const symbols = useMemo(() => sortSymbols(data?.active_symbols ?? []), [data]);

    const underlying_symbols = useMemo(
        () => symbols.map(symbol => symbol.underlying_symbol ?? '').filter(Boolean),
        [symbols]
    );

    const available_set = useMemo(() => new Set(underlying_symbols), [underlying_symbols]);

    /** Whether a specific symbol is tradeable for the selected trade type. */
    const isSymbolAvailable = useCallback(
        (underlying_symbol: string) => available_set.has(underlying_symbol),
        [available_set]
    );

    return {
        /** Curated symbols available for the trade type, in curated order. */
        symbols,
        /** Their `underlying_symbol` codes (handy for `useMarketDiscovery`). */
        underlying_symbols,
        isSymbolAvailable,
        isLoading,
    };
};

export default useTradeTypeSymbols;
