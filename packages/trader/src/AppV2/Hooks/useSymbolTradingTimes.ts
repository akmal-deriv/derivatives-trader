import { TTradingTimesResponse, useQuery } from '@deriv/api';
import { dayjs } from '@deriv/shared';

import { getSymbol } from 'AppV2/Utils/closed-market-message-utils';
import { getMarketAvailability, TSymbolTimes } from 'AppV2/Utils/market-availability-utils';

type TTradingTimes = NonNullable<DeepRequired<TTradingTimesResponse['trading_times']>>;

/**
 * Resolves a symbol's "Market availability" for the info screen: a countdown to the current session's
 * close (when open), the next open time (when closed), and a plain-English schedule summary. Reuses
 * the shared `getSymbol` traversal of the `trading_times` response.
 *
 * @param underlying_symbol the symbol to resolve.
 * @param is_open whether the market is currently open (from `active_symbols.exchange_is_open`).
 */
const useSymbolTradingTimes = (underlying_symbol: string, is_open: boolean) => {
    // Captured at render: the info screen mounts fresh each time it's opened, so a single snapshot of
    // "now" (GMT — trading times are GMT) is enough; the countdown / next-open don't tick live.
    const now = dayjs.utc();

    const { data, isLoading } = useQuery('trading_times', {
        payload: { trading_times: now.format('YYYY-MM-DD') },
        options: {
            enabled: !!underlying_symbol,
            staleTime: 60 * 60 * 1000,
        },
    });

    const symbol_times = data?.trading_times
        ? (getSymbol(underlying_symbol, data.trading_times as TTradingTimes) as TSymbolTimes | undefined)
        : undefined;

    const market_availability = getMarketAvailability(symbol_times, is_open, now);

    return {
        market_availability,
        isLoading,
    };
};

export default useSymbolTradingTimes;
