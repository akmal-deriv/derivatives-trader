import { useMemo } from 'react';

import { TActiveSymbolsRequest, useQueries } from '@deriv/api';

import { getApiContractTypesForTradeType } from 'AppV2/Utils/contracts-for-utils';
import { TAvailableContract } from 'AppV2/Utils/trade-types-utils';

const TRADE_TYPE_AVAILABILITY_CACHE_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Answers availability only: which of the given trade types the server actually offers this client.
 *
 * A trade type is offered iff its `active_symbols` request (server-filtered by `contract_type`)
 * returns at least one symbol — a count question, not a list one. Unlike `useAllTradeTypeSymbols`,
 * this hook does NOT sort or retain the symbol lists; it keeps only the set of tradeable trade-type
 * ids. The query payload, options, and keys are identical to `useAllTradeTypeSymbols`, so both share
 * React Query's cache and no extra network requests are issued.
 *
 * @param trade_types the trade types to check availability for (kept stable by the caller).
 */
const useTradeTypeAvailability = (trade_types: TAvailableContract[]) => {
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
                    cacheTime: TRADE_TYPE_AVAILABILITY_CACHE_TIME,
                    staleTime: TRADE_TYPE_AVAILABILITY_CACHE_TIME,
                    keepPreviousData: true,
                },
            })),
        [trade_types]
    );

    const results = useQueries('active_symbols', items);

    // `results` is a fresh array every render, so it can't be a memo dep (it would rebuild the set on
    // every render). `data_signature` — the joined dataUpdatedAt stamps — is the stable stand-in that
    // changes only when a query actually lands new data.
    const data_signature = results.map(result => result.dataUpdatedAt).join(',');

    const available_trade_type_ids = useMemo(() => {
        const ids = new Set<string>();
        trade_types.forEach((trade_type, index) => {
            if (results[index]?.data?.active_symbols?.length) {
                ids.add(trade_type.id);
            }
        });
        return ids;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trade_types, data_signature]);

    const isLoading = results.some(result => result.isLoading);

    return { available_trade_type_ids, isLoading };
};

export default useTradeTypeAvailability;
