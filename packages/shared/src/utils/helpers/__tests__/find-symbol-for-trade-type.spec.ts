import { TActiveSymbolsResponse } from '@deriv/api';

import { CONTRACT_TYPES, TRADE_TYPES } from '../../contract';
import { findSymbolForTradeType, isTradeTypeOfferedForSymbol } from '../active-symbols';

type TActiveSymbols = NonNullable<TActiveSymbolsResponse['active_symbols']>;

const contracts_for_by_symbol: Record<string, string[]> = {
    // Boom 1000 offers only Multipliers.
    BOOM1000: [CONTRACT_TYPES.MULTIPLIER.UP, CONTRACT_TYPES.MULTIPLIER.DOWN],
    // Volatility 100 (1s) offers Rise/Fall (CALL/PUT).
    '1HZ100V': [CONTRACT_TYPES.CALL, CONTRACT_TYPES.PUT],
};

const mockContractsFor = jest.fn((symbol: string) => {
    if (!(symbol in contracts_for_by_symbol)) {
        return Promise.resolve({ error: { code: 'InvalidSymbol' }, contracts_for: undefined });
    }
    return Promise.resolve({
        contracts_for: {
            available: contracts_for_by_symbol[symbol].map(contract_type => ({ contract_type })),
            non_available: [],
        },
    });
});

jest.mock('../../../services', () => ({
    WS: {
        storage: {
            contractsFor: (symbol: string) => mockContractsFor(symbol),
        },
    },
}));

const makeSymbol = (underlying_symbol: string, submarket = 'random_index'): TActiveSymbols[number] =>
    ({
        underlying_symbol,
        exchange_is_open: 1,
        market: 'synthetic_index',
        submarket,
        display_order: 0,
        is_trading_suspended: 0,
        subgroup: 'synthetics',
    }) as unknown as TActiveSymbols[number];

const active_symbols: TActiveSymbols = [makeSymbol('BOOM1000', 'crash_boom'), makeSymbol('1HZ100V')];

describe('isTradeTypeOfferedForSymbol', () => {
    beforeEach(() => mockContractsFor.mockClear());

    it('returns true when the symbol offers the trade type', async () => {
        await expect(isTradeTypeOfferedForSymbol('1HZ100V', TRADE_TYPES.RISE_FALL)).resolves.toBe(true);
    });

    it('returns false when the symbol does not offer the trade type', async () => {
        await expect(isTradeTypeOfferedForSymbol('BOOM1000', TRADE_TYPES.RISE_FALL)).resolves.toBe(false);
    });

    it('returns false for an unknown trade type without hitting the API', async () => {
        await expect(isTradeTypeOfferedForSymbol('1HZ100V', 'not_a_real_trade_type')).resolves.toBe(false);
        expect(mockContractsFor).not.toHaveBeenCalled();
    });

    it('returns false when contracts_for errors for the symbol', async () => {
        await expect(isTradeTypeOfferedForSymbol('UNKNOWN', TRADE_TYPES.RISE_FALL)).resolves.toBe(false);
    });
});

describe('findSymbolForTradeType', () => {
    beforeEach(() => mockContractsFor.mockClear());

    it('returns a symbol that offers the requested trade type (Rise/Fall)', async () => {
        await expect(findSymbolForTradeType(active_symbols, TRADE_TYPES.RISE_FALL)).resolves.toBe('1HZ100V');
    });

    it('scans past the preferred default symbol to find a Multipliers-only market', async () => {
        // The default symbol (1HZ100V) does not offer Multipliers, so the scan must find Boom 1000.
        await expect(findSymbolForTradeType(active_symbols, TRADE_TYPES.MULTIPLIER)).resolves.toBe('BOOM1000');
    });

    it('returns an empty string for an unknown trade type', async () => {
        await expect(findSymbolForTradeType(active_symbols, 'not_a_real_trade_type')).resolves.toBe('');
    });

    it('returns an empty string when there are no active symbols', async () => {
        await expect(findSymbolForTradeType([], TRADE_TYPES.RISE_FALL)).resolves.toBe('');
    });
});
