import { TActiveSymbolsResponse } from '@deriv/api';
import { localize } from '@deriv-com/translations';

import sortSymbols from '../sort-symbols-utils';

jest.mock('@deriv-com/translations', () => ({
    localize: jest.fn((text: string) => text),
}));

describe('sortSymbols', () => {
    it('should sort symbols correctly according to market order', () => {
        const symbolsList = [
            {
                underlying_symbol: 'BTCUSD',
                display_order: 1,
                exchange_is_open: 1,
                market: 'cryptocurrency',
                submarket: 'non_stable_coin',
                is_trading_suspended: 0,
                subgroup: 'crypto',
            },
            {
                underlying_symbol: 'EURUSD',
                display_order: 2,
                exchange_is_open: 1,
                market: 'forex',
                submarket: 'major_pairs',
                is_trading_suspended: 0,
                subgroup: 'major',
            },
            {
                underlying_symbol: 'OTC_N225',
                display_order: 3,
                exchange_is_open: 1,
                market: 'indices',
                submarket: 'asia_oceania_OTC',
                is_trading_suspended: 0,
                subgroup: 'asia',
            },
            {
                underlying_symbol: 'GOLD',
                display_order: 4,
                exchange_is_open: 1,
                market: 'commodities',
                submarket: 'metals',
                is_trading_suspended: 0,
                subgroup: 'metals',
            },
            {
                underlying_symbol: '1HZ100V',
                display_order: 5,
                exchange_is_open: 1,
                market: 'synthetic_index',
                submarket: 'random_index',
                is_trading_suspended: 0,
                subgroup: 'volatility',
            },
        ];
        const sortedSymbols = sortSymbols(symbolsList as NonNullable<TActiveSymbolsResponse['active_symbols']>);
        expect(sortedSymbols).toEqual([
            {
                underlying_symbol: '1HZ100V',
                display_order: 5,
                exchange_is_open: 1,
                market: 'synthetic_index',
                submarket: 'random_index',
                is_trading_suspended: 0,
                subgroup: 'volatility',
            },
            {
                underlying_symbol: 'EURUSD',
                display_order: 2,
                exchange_is_open: 1,
                market: 'forex',
                submarket: 'major_pairs',
                is_trading_suspended: 0,
                subgroup: 'major',
            },
            {
                underlying_symbol: 'OTC_N225',
                display_order: 3,
                exchange_is_open: 1,
                market: 'indices',
                submarket: 'asia_oceania_OTC',
                is_trading_suspended: 0,
                subgroup: 'asia',
            },
            {
                underlying_symbol: 'BTCUSD',
                display_order: 1,
                exchange_is_open: 1,
                market: 'cryptocurrency',
                submarket: 'non_stable_coin',
                is_trading_suspended: 0,
                subgroup: 'crypto',
            },
            {
                underlying_symbol: 'GOLD',
                display_order: 4,
                exchange_is_open: 1,
                market: 'commodities',
                submarket: 'metals',
                is_trading_suspended: 0,
                subgroup: 'metals',
            },
        ]);
    });
    it('should handle symbols with same market correctly', () => {
        const symbolsList = [
            {
                underlying_symbol: 'GBPUSD',
                display_order: 1,
                exchange_is_open: 1,
                market: 'forex',
                submarket: 'major_pairs',
                is_trading_suspended: 0,
                subgroup: 'major',
            },
            {
                underlying_symbol: 'EURUSD',
                display_order: 2,
                exchange_is_open: 1,
                market: 'forex',
                submarket: 'major_pairs',
                is_trading_suspended: 0,
                subgroup: 'major',
            },
            {
                underlying_symbol: 'ETHUSD',
                display_order: 3,
                exchange_is_open: 1,
                market: 'cryptocurrency',
                submarket: 'non_stable_coin',
                is_trading_suspended: 0,
                subgroup: 'crypto',
            },
            {
                underlying_symbol: 'BTCUSD',
                display_order: 4,
                exchange_is_open: 1,
                market: 'cryptocurrency',
                submarket: 'non_stable_coin',
                is_trading_suspended: 0,
                subgroup: 'crypto',
            },
        ];

        const sortedSymbols = sortSymbols(symbolsList as NonNullable<TActiveSymbolsResponse['active_symbols']>);
        expect(sortedSymbols).toEqual([
            {
                underlying_symbol: 'GBPUSD',
                display_order: 1,
                exchange_is_open: 1,
                market: 'forex',
                submarket: 'major_pairs',
                is_trading_suspended: 0,
                subgroup: 'major',
            },
            {
                underlying_symbol: 'EURUSD',
                display_order: 2,
                exchange_is_open: 1,
                market: 'forex',
                submarket: 'major_pairs',
                is_trading_suspended: 0,
                subgroup: 'major',
            },
            {
                underlying_symbol: 'ETHUSD',
                display_order: 3,
                exchange_is_open: 1,
                market: 'cryptocurrency',
                submarket: 'non_stable_coin',
                is_trading_suspended: 0,
                subgroup: 'crypto',
            },
            {
                underlying_symbol: 'BTCUSD',
                display_order: 4,
                exchange_is_open: 1,
                market: 'cryptocurrency',
                submarket: 'non_stable_coin',
                is_trading_suspended: 0,
                subgroup: 'crypto',
            },
        ]);
    });

    it('resolves the localized submarket map once per call, not once per comparison', () => {
        // Regression guard for the INP regression: the old implementation resolved the 28-entry
        // localized map inside the comparator (twice per comparison), so an O(n log n) sort dragged
        // ~84,000 `localize()` calls along for a ~200-symbol list. The rewrite builds it once per
        // call, so `localize` must be invoked at most once per map entry (28) regardless of size.
        (localize as jest.Mock).mockClear();

        const markets = ['synthetic_index', 'forex', 'indices', 'cryptocurrency', 'commodities'];
        const submarkets = ['random_index', 'major_pairs', 'asia_oceania_OTC', 'non_stable_coin', 'metals'];
        const largeSymbolsList = Array.from({ length: 200 }, (_, i) => ({
            underlying_symbol: `SYM_${i}`,
            display_order: i,
            exchange_is_open: 1,
            market: markets[i % markets.length],
            submarket: submarkets[i % submarkets.length],
            is_trading_suspended: 0,
            subgroup: 'group',
        }));

        sortSymbols(largeSymbolsList as NonNullable<TActiveSymbolsResponse['active_symbols']>);

        expect((localize as jest.Mock).mock.calls.length).toBeLessThanOrEqual(28);
    });
});
