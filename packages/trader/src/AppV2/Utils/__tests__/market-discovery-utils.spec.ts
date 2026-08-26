import { TTicksHistoryResponse } from '@deriv/api';

import {
    DISCOVERY_WINDOW_CONFIG,
    formatChangePercentage,
    getCandleChangePercentage,
    getTicksChangePercentage,
    getTrendingSymbols,
    rankDiscoverySections,
    TSymbolChange,
} from '../market-discovery-utils';

type TCandles = NonNullable<TTicksHistoryResponse['candles']>;

// active_symbols carries `trade_count`; it isn't in the generated api-types, so cast in the fixtures.
const symbol = (underlying_symbol: string, trade_count?: number) =>
    ({ underlying_symbol, trade_count }) as unknown as Parameters<typeof getTrendingSymbols>[0][number];

const candles = (points: Array<{ open: number; close: number }>): TCandles =>
    points.map(({ open, close }, index) => ({ open, close, high: close, low: open, epoch: index }));

describe('market-discovery-utils', () => {
    describe('getCandleChangePercentage', () => {
        it('computes (last close - first open) / first open * 100', () => {
            expect(
                getCandleChangePercentage(
                    candles([
                        { open: 100, close: 101 },
                        { open: 101, close: 105 },
                    ])
                )
            ).toBe(5);
        });

        it('returns a negative change for a downward move', () => {
            expect(
                getCandleChangePercentage(
                    candles([
                        { open: 200, close: 199 },
                        { open: 199, close: 190 },
                    ])
                )
            ).toBe(-5);
        });

        it('returns null for empty or missing candles', () => {
            expect(getCandleChangePercentage([])).toBeNull();
            expect(getCandleChangePercentage(undefined)).toBeNull();
        });

        it('returns null when the baseline open is zero', () => {
            expect(getCandleChangePercentage(candles([{ open: 0, close: 5 }]))).toBeNull();
        });

        it('returns null when open/close are not numbers', () => {
            expect(getCandleChangePercentage([{ epoch: 1 }, { epoch: 2 }])).toBeNull();
        });
    });

    describe('getTicksChangePercentage', () => {
        it('computes (last price - first price) / first price * 100', () => {
            expect(getTicksChangePercentage({ prices: [100, 102, 105] })).toBe(5);
        });

        it('returns a negative change for a downward move', () => {
            expect(getTicksChangePercentage({ prices: [200, 195, 190] })).toBe(-5);
        });

        it('returns null for empty or missing prices', () => {
            expect(getTicksChangePercentage({ prices: [] })).toBeNull();
            expect(getTicksChangePercentage(undefined)).toBeNull();
        });

        it('returns null when the baseline price is zero', () => {
            expect(getTicksChangePercentage({ prices: [0, 5] })).toBeNull();
        });
    });

    describe('rankDiscoverySections', () => {
        const changes: TSymbolChange[] = [
            { underlying_symbol: 'A', change_percentage: 3 },
            { underlying_symbol: 'B', change_percentage: -5 },
            { underlying_symbol: 'C', change_percentage: 1 },
            { underlying_symbol: 'D', change_percentage: -2 },
            { underlying_symbol: 'E', change_percentage: null },
        ];

        it('ranks gainers by descending positive change', () => {
            const { gainers } = rankDiscoverySections(changes);
            expect(gainers.map(g => g.underlying_symbol)).toEqual(['A', 'C']);
        });

        it('ranks losers by ascending (most negative first) change', () => {
            const { losers } = rankDiscoverySections(changes);
            expect(losers.map(l => l.underlying_symbol)).toEqual(['B', 'D']);
        });

        it('caps each section at the default limit of 5', () => {
            const many = Array.from({ length: 8 }, (_, i) => ({
                underlying_symbol: `S${i}`,
                change_percentage: i + 1,
            }));
            expect(rankDiscoverySections(many).gainers).toHaveLength(5);
        });

        it('excludes entries whose change could not be computed', () => {
            const { gainers, losers } = rankDiscoverySections(changes);
            const all = [...gainers, ...losers].map(e => e.underlying_symbol);
            expect(all).not.toContain('E');
        });

        it('respects the limit', () => {
            expect(rankDiscoverySections(changes, 1).gainers).toHaveLength(1);
        });
    });

    describe('getTrendingSymbols', () => {
        it('ranks symbols by descending trade_count', () => {
            const symbols = [symbol('A', 10), symbol('B', 50), symbol('C', 30)];
            expect(getTrendingSymbols(symbols)).toEqual(['B', 'C', 'A']);
        });

        it('excludes symbols with no or zero trade_count', () => {
            const symbols = [symbol('A', 10), symbol('B', 0), symbol('C')];
            expect(getTrendingSymbols(symbols)).toEqual(['A']);
        });

        it('caps at the given limit', () => {
            const symbols = Array.from({ length: 8 }, (_, i) => symbol(`S${i}`, i + 1));
            expect(getTrendingSymbols(symbols, 3)).toHaveLength(3);
        });
    });

    describe('DISCOVERY_WINDOW_CONFIG', () => {
        it('defines granularity + count for candle windows and a positive range for tick windows', () => {
            Object.values(DISCOVERY_WINDOW_CONFIG).forEach(config => {
                if (config.style === 'candles') {
                    expect(config.granularity).toBeGreaterThan(0);
                    expect(config.count).toBeGreaterThan(0);
                } else {
                    expect(config.range_seconds).toBeGreaterThan(0);
                }
            });
        });

        it('uses exact tick ranges for 1m/5m/15m and 1-minute candles for 1h', () => {
            expect(DISCOVERY_WINDOW_CONFIG['1m']).toEqual({ style: 'ticks', range_seconds: 60 });
            expect(DISCOVERY_WINDOW_CONFIG['5m']).toEqual({ style: 'ticks', range_seconds: 300 });
            expect(DISCOVERY_WINDOW_CONFIG['15m']).toEqual({ style: 'ticks', range_seconds: 900 });
            expect(DISCOVERY_WINDOW_CONFIG['1h']).toEqual({ style: 'candles', granularity: 60, count: 60 });
        });
    });

    describe('formatChangePercentage', () => {
        it('prefixes positive values with + and fixes to 2 decimals', () => {
            expect(formatChangePercentage(1.25)).toBe('+1.25%');
        });

        it('keeps the minus sign for negative values', () => {
            expect(formatChangePercentage(-2.4)).toBe('-2.40%');
        });

        it('renders a dash for null', () => {
            expect(formatChangePercentage(null)).toBe('–');
        });

        it('does not prefix zero', () => {
            expect(formatChangePercentage(0)).toBe('0.00%');
        });
    });
});
