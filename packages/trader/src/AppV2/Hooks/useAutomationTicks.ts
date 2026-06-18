import { useEffect, useRef } from 'react';

import { WS } from '@deriv/shared';

import { isDigitTradeType } from 'AppV2/Utils/digits';
import { useTraderStore } from 'Stores/useTraderStores';

const TICKS_COUNT = 1000;

type TTicksHistoryResponse = {
    error?: unknown;
    pip_size?: number;
    history?: { prices?: number[]; times?: number[] };
    tick?: { quote?: number; epoch?: number; symbol?: string; pip_size?: number };
};

// `digit_stats[d]` is the count of digit `d` over the last `TICKS_COUNT` ticks;
// the Digit component renders it as `count / 10` %.
const computeDigitCounts = (prices: number[], pip_size: number) => {
    const counts = new Array(10).fill(0);
    prices.forEach(price => {
        const last_digit = Number(price.toFixed(pip_size).slice(-1));
        if (Number.isInteger(last_digit) && last_digit >= 0 && last_digit <= 9) counts[last_digit] += 1;
    });
    return counts;
};

/**
 * Feeds the tick-derived data the automation tab needs for digit trade types
 * (Matches/Differs, Over/Under): `digit_stats` for the picker and `tick_data`
 * for the CurrentSpot display. The chart normally provides both, but the
 * automation tab has no chart — so we replicate the SmartCharts transport: a
 * `ticks_history` snapshot (`count: 1000`) for the initial distribution plus a
 * `subscribe` (`count: 1`) stream for live updates.
 */
const useAutomationTicks = () => {
    const { contract_type, symbol, setDigitStats, setTickData } = useTraderStore();
    const prices_ref = useRef<number[]>([]);
    const pip_size_ref = useRef(0);

    const is_digit = isDigitTradeType(contract_type);

    useEffect(() => {
        if (!is_digit || !symbol || !WS?.storage?.send || !WS?.subscribeTicksHistory) return undefined;

        let cancelled = false;
        prices_ref.current = [];
        pip_size_ref.current = 0;

        const publishDigitStats = () => {
            if (!cancelled && prices_ref.current.length) {
                setDigitStats(computeDigitCounts(prices_ref.current, pip_size_ref.current));
            }
        };

        // Initial distribution + spot snapshot. Uses the cached `storage.send`
        // (like the chart's getQuotes) so the one-off history fetch stays on a
        // separate path from the live subscription below — mixing `send` and
        // `subscribe` for the same `ticks_history` breaks the stream on
        // re-subscribe (e.g. after switching to the manual tab and back).
        WS.storage
            .send({ ticks_history: symbol, end: 'latest', count: TICKS_COUNT, style: 'ticks', adjust_start_time: 1 })
            .then((response: TTicksHistoryResponse) => {
                if (cancelled || !response || response.error || !response.history?.prices?.length) return;
                if (typeof response.pip_size === 'number') pip_size_ref.current = response.pip_size;
                prices_ref.current = [...response.history.prices];
                publishDigitStats();

                const last = prices_ref.current.length - 1;
                setTickData({
                    quote: prices_ref.current[last],
                    epoch: response.history.times?.[last],
                    symbol,
                    pip_size: pip_size_ref.current,
                });
            });

        // Live updates — mirrors the chart's subscribeQuotes (count: 1).
        const subscription = WS.subscribeTicksHistory(
            { ticks_history: symbol, end: 'latest', count: 1, style: 'ticks', subscribe: 1 },
            (response: TTicksHistoryResponse) => {
                if (cancelled || !response || response.error) return;
                if (typeof response.pip_size === 'number') pip_size_ref.current = response.pip_size;

                const quote = response.tick?.quote;
                if (typeof quote !== 'number') return;

                setTickData({
                    quote,
                    epoch: response.tick?.epoch,
                    symbol: response.tick?.symbol ?? symbol,
                    pip_size: response.tick?.pip_size ?? pip_size_ref.current,
                });

                if (!prices_ref.current.length) return;
                prices_ref.current = [...prices_ref.current, quote].slice(-TICKS_COUNT);
                publishDigitStats();
            }
        );

        return () => {
            cancelled = true;
            subscription?.unsubscribe?.();
            setDigitStats([]);
            setTickData(null);
        };
    }, [is_digit, symbol, setDigitStats, setTickData]);
};

export default useAutomationTicks;
