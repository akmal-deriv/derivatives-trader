import { getMarketsOrder, shouldIgnoreGranularityChange } from '../chart-utils';

type TActiveSymbols = Parameters<typeof getMarketsOrder>[0];

describe('getMarketsOrder', () => {
    it('puts synthetic_index first and keeps the remaining markets in underlying_symbol order', () => {
        const active_symbols = [
            { market: 'forex', underlying_symbol: 'frxEURUSD' },
            { market: 'synthetic_index', underlying_symbol: 'R_100' },
            { market: 'cryptocurrency', underlying_symbol: 'cryBTCUSD' },
        ] as TActiveSymbols;

        expect(getMarketsOrder(active_symbols)).toEqual(['synthetic_index', 'cryptocurrency', 'forex']);
    });

    it('omits synthetic_index when no symbol belongs to it', () => {
        const active_symbols = [
            { market: 'forex', underlying_symbol: 'frxEURUSD' },
            { market: 'cryptocurrency', underlying_symbol: 'cryBTCUSD' },
        ] as TActiveSymbols;

        expect(getMarketsOrder(active_symbols)).toEqual(['cryptocurrency', 'forex']);
    });
});

describe('shouldIgnoreGranularityChange', () => {
    it('ignores candle granularities while only the tick chart type is allowed', () => {
        expect(shouldIgnoreGranularityChange(60, true)).toBe(true);
        expect(shouldIgnoreGranularityChange(86400, true)).toBe(true);
    });

    it('allows the tick granularity while only the tick chart type is allowed', () => {
        expect(shouldIgnoreGranularityChange(0, true)).toBe(false);
    });

    it('allows every granularity when the tick chart type is not the only one allowed', () => {
        expect(shouldIgnoreGranularityChange(60, false)).toBe(false);
        expect(shouldIgnoreGranularityChange(0, false)).toBe(false);
    });
});
