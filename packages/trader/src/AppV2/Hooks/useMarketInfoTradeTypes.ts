import { useMemo } from 'react';

import { useQuery } from '@deriv/api';

import { getAvailableTradeTypeValues } from 'AppV2/Utils/contracts-for-utils';
import { AVAILABLE_CONTRACTS, TAvailableContract } from 'AppV2/Utils/trade-types-utils';

/**
 * The trade-type tabs available for a specific symbol, for the info screen's "Available trade
 * types" chips. Uses `contracts_for` (symbol → its trade types) and maps to `AVAILABLE_CONTRACTS`.
 */
const useMarketInfoTradeTypes = (underlying_symbol: string) => {
    const { data, isLoading } = useQuery('contracts_for', {
        payload: { contracts_for: underlying_symbol },
        options: {
            enabled: !!underlying_symbol,
            staleTime: 5 * 60 * 1000,
        },
    });

    const trade_types = useMemo<TAvailableContract[]>(() => {
        const available = new Set(getAvailableTradeTypeValues(data?.contracts_for));
        return AVAILABLE_CONTRACTS.filter(contract => contract.for.some(value => available.has(value)));
    }, [data]);

    return { trade_types, isLoading };
};

export default useMarketInfoTradeTypes;
