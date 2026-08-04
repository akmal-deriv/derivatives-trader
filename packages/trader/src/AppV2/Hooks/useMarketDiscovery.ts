import { useEffect, useMemo, useState } from 'react';

import { TTicksHistoryRequest, useQueries } from '@deriv/api';

import {
    DEFAULT_DISCOVERY_WINDOW,
    DISCOVERY_WINDOW_CONFIG,
    getCandleChangePercentage,
    getCandleSeries,
    getTicksChangePercentage,
    rankDiscoverySections,
    TDiscoveryWindow,
    TSymbolChange,
} from 'AppV2/Utils/market-discovery-utils';

// Periodic refresh so discovery content stays current. NOTE: computed client-side from
// ticks, so rankings are per-client snapshots rather than a server-authoritative shared feed —
// this hook is the abstraction boundary where a server feed can later be swapped in unchanged.
const DISCOVERY_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Fallback bucket, used only for candle windows (whose tick epoch is computed but unused). Tick
// windows bucket to their own `range_seconds` instead (see `tick_bucket_ms` below), so the whole
// window is cached as a single snapshot.
const TICK_WINDOW_BUCKET_MS = 30 * 1000;

// Bucket-aligned epoch (seconds) for `bucket_ms` — the anchoring end of the exact tick range.
const getBucketedEpoch = (bucket_ms: number) => Math.floor(Date.now() / bucket_ms) * (bucket_ms / 1000);

// One shared, SESSION-RELATIVE epoch per bucket size. A wall-clock-aligned bucket would roll at
// absolute marks (e.g. every :00/:05), which forces a full refetch whenever a view is reopened just
// after a boundary. Instead the epoch is anchored when a window is first shown and only advances one
// bucket from that anchor. It's module-level so every instance of the same window reads the same value
// (their query keys match → cache dedup) and it survives unmount/remount, so returning to a view
// within the window reuses the cached snapshot instead of refetching. Different window sizes (e.g. the
// 1m list vs the 5m discovery section) are independent entries.
type TBucketState = {
    epoch: number;
    // Wall-clock ms when `epoch` was last (re)computed; it advances one bucket after this.
    anchored_at: number;
    listeners: Set<() => void>;
    timeout: ReturnType<typeof setTimeout> | null;
};
const bucket_states = new Map<number, TBucketState>();

// Current shared epoch for a bucket, lazily created and rolled forward only once its window has fully
// elapsed since the anchor (covers the gap where the timer is paused because no view is subscribed).
const getBucketState = (bucket_ms: number): TBucketState => {
    const now = Date.now();
    let state = bucket_states.get(bucket_ms);
    if (!state) {
        state = { epoch: getBucketedEpoch(bucket_ms), anchored_at: now, listeners: new Set(), timeout: null };
        bucket_states.set(bucket_ms, state);
    } else if (now - state.anchored_at >= bucket_ms) {
        state.epoch = getBucketedEpoch(bucket_ms);
        state.anchored_at = now;
    }
    return state;
};

const useSharedTickEpoch = (enabled: boolean, bucket_ms: number) => {
    const [, forceRerender] = useState(0);

    useEffect(() => {
        if (!enabled) return undefined;
        const state = getBucketState(bucket_ms);
        const listener = () => forceRerender(tick => tick + 1);
        state.listeners.add(listener);
        // Advance one bucket after the anchor, then re-arm — a steady session-relative cadence that
        // notifies every subscriber to recompute its query key (the periodic discovery refresh).
        const scheduleNext = () => {
            const delay = Math.max(0, state.anchored_at + bucket_ms - Date.now());
            state.timeout = setTimeout(() => {
                state.epoch = getBucketedEpoch(bucket_ms);
                state.anchored_at = Date.now();
                state.listeners.forEach(notify => notify());
                scheduleNext();
            }, delay + 50);
        };
        if (!state.timeout) scheduleNext();
        return () => {
            state.listeners.delete(listener);
            if (state.listeners.size === 0 && state.timeout) {
                clearTimeout(state.timeout);
                state.timeout = null;
            }
        };
    }, [enabled, bucket_ms]);

    return getBucketState(bucket_ms).epoch;
};

/**
 * Computes Trending / Gainers / Losers for a set of symbols over a performance window by fetching a
 * short series per symbol (raw ticks for the 1-minute window, candles for the longer ones) and
 * deriving the windowed percentage change.
 *
 * Callers should pass an already-scoped list (curated ∩ available-for-trade-type, tradeable first)
 * to keep the fan-out bounded — never the full symbol universe.
 *
 * @param underlying_symbols symbols to rank.
 * @param window performance window (`1m` | `5m` | `15m` | `1h`).
 * @param options.auto_refresh when true (default) the shared tick window advances each window
 *   (bucketed to the window's own duration) and candle windows refetch periodically, keeping
 *   many-symbol views current without subscriptions. Set false for a single-symbol view backed by a
 *   live tick subscription: the snapshot is then fetched once per window (freshness from the sub).
 * @param options.enabled_symbols when set, only these symbols actually FETCH; the rest are passed as
 *   disabled queries — which still return already-cached data (so cached rows show immediately) but
 *   never hit the network. Used by the category list to lazy-fetch only rows scrolled into view while
 *   still showing symbols the Featured view already cached. Omit to enable (fetch) every symbol.
 * @param options.fetch_latest when true, tick windows fetch the LAST-AVAILABLE ticks (`end: 'latest'`)
 *   instead of a recent wall-clock window — so a worm still renders for a closed market (whose recent
 *   window has no ticks). Candle windows already fetch `end: 'latest'`. Used by the info screen when
 *   the market is closed.
 */
const useMarketDiscovery = (
    underlying_symbols: string[],
    window: TDiscoveryWindow = DEFAULT_DISCOVERY_WINDOW,
    {
        auto_refresh = true,
        enabled_symbols,
        fetch_latest = false,
    }: { auto_refresh?: boolean; enabled_symbols?: Set<string>; fetch_latest?: boolean } = {}
) => {
    const config = DISCOVERY_WINDOW_CONFIG[window];
    const is_ticks = config.style === 'ticks';

    // Bucket each tick window to its OWN duration, so the whole window is cached as one snapshot and
    // every consumer of the same window (discovery, the category list, the info screen) shares one
    // query key — switching between them reuses the cache instead of refetching.
    const tick_bucket_ms = config.style === 'ticks' ? config.range_seconds * 1000 : TICK_WINDOW_BUCKET_MS;

    // Refetch cadence — one refresh per the selected change period:
    //  - tick windows: no timed interval; the epoch key-slide (bucketed to the window duration) is the
    //    refetch, so it fires exactly once per window (e.g. 5m → every 5 min, 15m → every 15 min).
    //  - candle windows: the list/discovery (auto-refresh) refetches once per window (granularity ×
    //    count → e.g. 1h → every 1 hour); the static info screen refetches once per candle
    //    (granularity → 60s) to keep its worm live off the one-shot snapshot.
    const refetch_interval: number | false =
        config.style === 'candles'
            ? auto_refresh
                ? config.granularity * config.count * 1000
                : config.granularity * 1000
            : false;

    // Auto-refresh: the shared epoch (bucketed to the window duration) gives every same-window instance
    // the same range — and thus the same query key. See `useSharedTickEpoch`.
    const shared_tick_end_epoch = useSharedTickEpoch(is_ticks && auto_refresh, tick_bucket_ms);
    // Static mode: capture the tick range's end epoch once on mount and whenever the window changes,
    // but never advance it — so the query key stays fixed and the snapshot is fetched once per window.
    const [frozen_tick_end_epoch, setFrozenTickEndEpoch] = useState(() => getBucketedEpoch(tick_bucket_ms));
    useEffect(() => {
        if (auto_refresh) return;
        setFrozenTickEndEpoch(getBucketedEpoch(tick_bucket_ms));
    }, [auto_refresh, window, tick_bucket_ms]);
    const tick_end_epoch = auto_refresh ? shared_tick_end_epoch : frozen_tick_end_epoch;

    const results = useQueries(
        'ticks_history',
        underlying_symbols.map(underlying_symbol => {
            let payload: TTicksHistoryRequest;
            if (config.style === 'ticks') {
                payload = fetch_latest
                    ? {
                          ticks_history: underlying_symbol,
                          style: 'ticks',
                          // Last-available ticks (used for a closed market, whose recent window is
                          // empty). `count` ~ one tick/sec over the window; api-types mistype it as
                          // `number & string`, so cast the literal past it.
                          end: 'latest',
                          count: config.range_seconds as unknown as number & string,
                      }
                    : {
                          ticks_history: underlying_symbol,
                          style: 'ticks',
                          // Exact `range_seconds`-long range ending at the bucketed epoch (always
                          // slightly in the past, so `end` is never a future timestamp regardless of
                          // clock skew). `end` is a string per the API type; `start` is a numeric epoch.
                          start: tick_end_epoch - config.range_seconds,
                          end: `${tick_end_epoch}`,
                      };
            } else {
                payload = {
                    ticks_history: underlying_symbol,
                    style: 'candles',
                    granularity: config.granularity,
                    count: config.count,
                    end: 'latest',
                    adjust_start_time: 1,
                };
            }
            // Disabled symbols still return cached data (React Query reads the cache for disabled
            // queries) but never fetch — so already-cached rows show instantly while uncached ones wait
            // until enabled (scrolled into view).
            const is_enabled = !!underlying_symbol && (!enabled_symbols || enabled_symbols.has(underlying_symbol));
            return {
                payload,
                options: {
                    enabled: is_enabled,
                    staleTime: DISCOVERY_REFRESH_INTERVAL,
                    cacheTime: DISCOVERY_REFRESH_INTERVAL,
                    refetchInterval: refetch_interval,
                    refetchOnWindowFocus: false,
                },
            };
        })
    );

    const isLoading = results.some(result => result.isLoading);
    // Stable dependency: changes only when a response actually lands.
    const data_signature = results.map(result => result.dataUpdatedAt).join(',');

    const changes = useMemo<TSymbolChange[]>(
        () =>
            underlying_symbols.map((underlying_symbol, index) => ({
                underlying_symbol,
                change_percentage: is_ticks
                    ? getTicksChangePercentage(results[index]?.data?.history)
                    : getCandleChangePercentage(results[index]?.data?.candles),
            })),
        // `results` is a new array every render, so it can't be a dep; `data_signature` (the joined
        // dataUpdatedAt timestamps) is the stable stand-in that changes only when data lands.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [underlying_symbols, data_signature, is_ticks]
    );

    const sections = useMemo(() => rankDiscoverySections(changes), [changes]);

    // Handy for cards / the info-screen change chip: underlying_symbol -> % change over the window.
    const change_by_symbol = useMemo(
        () =>
            new Map(changes.map(({ underlying_symbol, change_percentage }) => [underlying_symbol, change_percentage])),
        [changes]
    );

    // underlying_symbol -> price points for the card sparkline (worm) chart. Ticks expose the raw
    // price array directly; candles are flattened to open + closes.
    const series_by_symbol = useMemo(
        () =>
            new Map(
                underlying_symbols.map((symbol, index) => [
                    symbol,
                    is_ticks
                        ? (results[index]?.data?.history?.prices ?? [])
                        : getCandleSeries(results[index]?.data?.candles),
                ])
            ),
        // Same reasoning as `changes`: `results` is unstable, `data_signature` is the stable stand-in.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [underlying_symbols, data_signature, is_ticks]
    );

    // underlying_symbol -> pip size (decimal places) from the candle response, for formatting values.
    const pip_size_by_symbol = useMemo(
        () => new Map(underlying_symbols.map((symbol, index) => [symbol, results[index]?.data?.pip_size])),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [underlying_symbols, data_signature]
    );

    return { sections, change_by_symbol, series_by_symbol, pip_size_by_symbol, changes, isLoading };
};

export default useMarketDiscovery;
