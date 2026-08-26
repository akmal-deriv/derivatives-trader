import { useEffect } from 'react';

import { useSubscription } from '@deriv/api';

export type TLiveTick = { quote: number; epoch?: number; pip_size?: number } | null;

/**
 * Subscribes to the live `ticks` stream for `underlying_symbol` via `useSubscription` (React Query)
 * and returns the latest quote. The subscription is forgotten automatically when the screen unmounts
 * (useSubscription's own cleanup) and re-pointed when the symbol changes. Returns `null` until the
 * first matching tick lands — including the brief window after a symbol switch while `data` still
 * holds the previous symbol's tick — so callers can fall back to a static price.
 */
const useLiveTick = (underlying_symbol: string): TLiveTick => {
    const { subscribe, unsubscribe, data } = useSubscription('ticks');

    useEffect(() => {
        if (!underlying_symbol) return undefined;
        subscribe({ payload: { ticks: underlying_symbol } });
        return () => unsubscribe();
    }, [underlying_symbol, subscribe, unsubscribe]);

    const tick = data?.tick;
    // Ignore a stale tick still belonging to the previously subscribed symbol right after a switch.
    if (typeof tick?.quote !== 'number' || tick.symbol !== underlying_symbol) return null;
    return { quote: tick.quote, epoch: tick.epoch, pip_size: tick.pip_size };
};

export default useLiveTick;
