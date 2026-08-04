import { useMemo } from 'react';

import { TActiveSymbolsRequest, TActiveSymbolsResponse, useQueries } from '@deriv/api';

import { getApiContractTypesForTradeType } from 'AppV2/Utils/contracts-for-utils';
import sortSymbols from 'AppV2/Utils/sort-symbols-utils';
import { TAvailableContract } from 'AppV2/Utils/trade-types-utils';

type ActiveSymbols = NonNullable<TActiveSymbolsResponse['active_symbols']>;

const ALL_TRADE_TYPE_SYMBOLS_CACHE_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches the markets available for EVERY given trade type in parallel (one `active_symbols` request
 * per trade type, server-filtered by `contract_type`) and returns a trade-type-id → symbols map.
 *
 * Used to power the search view's per-trade-type grouping: a symbol appears under each trade type it
 * is tradeable for. Requests share React Query's cache with `useTradeTypeSymbols` (identical query
 * keys), so browsing a trade type warms this — and vice versa — and the 5-minute cache means opening
 * the selector repeatedly doesn't refetch.
 *
 * @param trade_types the trade types to fetch symbols for (kept stable by the caller).
 * @param enabled gate the fetch (e.g. only while the selector is open).
 */
const useAllTradeTypeSymbols = (trade_types: TAvailableContract[], enabled: boolean) => {
    const items = useMemo(
        () =>
            trade_types.map(trade_type => ({
                payload: {
                    active_symbols: 'brief' as const,
                    contract_type: getApiContractTypesForTradeType(
                        trade_type
                    ) as TActiveSymbolsRequest['contract_type'],
                },
                options: {
                    enabled,
                    cacheTime: ALL_TRADE_TYPE_SYMBOLS_CACHE_TIME,
                    staleTime: ALL_TRADE_TYPE_SYMBOLS_CACHE_TIME,
                    keepPreviousData: true,
                },
            })),
        [trade_types, enabled]
    );

    const results = useQueries('active_symbols', items);

    // `results` is a fresh array every render, so it can't be a memo dep (it would re-sort every
    // trade type on every keystroke in search). `data_signature` — the joined dataUpdatedAt stamps —
    // is the stable stand-in that changes only when a query actually lands new data.
    const data_signature = results.map(result => result.dataUpdatedAt).join(',');

    const symbols_by_trade_type = useMemo(() => {
        const map = new Map<string, ActiveSymbols>();
        trade_types.forEach((trade_type, index) => {
            map.set(trade_type.id, sortSymbols(results[index]?.data?.active_symbols ?? []));
        });
        return map;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trade_types, data_signature]);

    const isLoading = enabled && results.some(result => result.isLoading);

    return { symbols_by_trade_type, isLoading };
};

export default useAllTradeTypeSymbols;
