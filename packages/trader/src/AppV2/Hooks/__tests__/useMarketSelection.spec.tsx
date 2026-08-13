import { renderHook } from '@testing-library/react-hooks';

import { AVAILABLE_CONTRACTS, CONTRACT_LIST, TAvailableContract } from 'AppV2/Utils/trade-types-utils';

import useActiveSymbols from '../useActiveSymbols';
import useAvailableContracts from '../useAvailableContracts';
import useFavouriteMarkets from '../useFavouriteMarkets';
import useMarketSelection from '../useMarketSelection';

jest.mock('../useTradeTypeSymbols', () => ({
    __esModule: true,
    default: jest.fn(() => ({ symbols: [], isLoading: false })),
}));

jest.mock('../useAllTradeTypeSymbols', () => ({
    __esModule: true,
    default: jest.fn(() => ({ symbols_by_trade_type: new Map(), isLoading: false })),
}));

jest.mock('../useMarketDiscovery', () => ({
    __esModule: true,
    default: jest.fn(() => ({ change_by_symbol: {}, series_by_symbol: {} })),
}));

jest.mock('../useActiveSymbols', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('../useFavouriteMarkets', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('../useAvailableContracts', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('Stores/useTraderStores', () => ({
    useTraderStore: jest.fn(() => ({
        contract_type: 'rise_fall',
        selectMarketAndTradeType: jest.fn(),
    })),
}));

const activeSymbol = (underlying_symbol: string) => ({
    underlying_symbol,
    display_name: underlying_symbol,
    market: 'synthetic_index',
    submarket: 'random_index',
    subgroup: 'synthetics',
});

/** Favourites are only grouped for symbols present in active_symbols, so both must be seeded. */
const ACTIVE_SYMBOLS = [activeSymbol('R_100'), activeSymbol('R_50')];

const contractsFor = (...ids: string[]): TAvailableContract[] =>
    AVAILABLE_CONTRACTS.filter(contract => ids.includes(contract.id));

const renderMarketSelection = () => renderHook(() => useMarketSelection({ onClose: jest.fn() }));

describe('useMarketSelection', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (useActiveSymbols as jest.Mock).mockReturnValue({ activeSymbols: ACTIVE_SYMBOLS, isLoading: false });
        (useAvailableContracts as jest.Mock).mockReturnValue(AVAILABLE_CONTRACTS);
        (useFavouriteMarkets as jest.Mock).mockReturnValue({ favourites: [] });
    });

    describe('favourites filtered by trade-type availability', () => {
        it('keeps favourites whose trade type is still on offer', () => {
            (useFavouriteMarkets as jest.Mock).mockReturnValue({
                favourites: [{ symbol: 'R_100', trade_type: CONTRACT_LIST.MULTIPLIERS }],
            });
            (useAvailableContracts as jest.Mock).mockReturnValue(contractsFor(CONTRACT_LIST.MULTIPLIERS));

            const { result } = renderMarketSelection();

            expect(result.current.favourites).toEqual([{ symbol: 'R_100', trade_type: CONTRACT_LIST.MULTIPLIERS }]);
        });

        it('drops favourites whose trade type is no longer on offer (e.g. EU: Multipliers only)', () => {
            (useFavouriteMarkets as jest.Mock).mockReturnValue({
                favourites: [
                    { symbol: 'R_100', trade_type: CONTRACT_LIST.MULTIPLIERS },
                    { symbol: 'R_50', trade_type: CONTRACT_LIST.RISE_FALL },
                    { symbol: 'R_100', trade_type: CONTRACT_LIST.ACCUMULATORS },
                ],
            });
            (useAvailableContracts as jest.Mock).mockReturnValue(contractsFor(CONTRACT_LIST.MULTIPLIERS));

            const { result } = renderMarketSelection();

            expect(result.current.favourites).toEqual([{ symbol: 'R_100', trade_type: CONTRACT_LIST.MULTIPLIERS }]);
        });

        it('excludes the dropped favourites from the grouped favourites view', () => {
            (useFavouriteMarkets as jest.Mock).mockReturnValue({
                favourites: [
                    { symbol: 'R_100', trade_type: CONTRACT_LIST.MULTIPLIERS },
                    { symbol: 'R_50', trade_type: CONTRACT_LIST.RISE_FALL },
                ],
            });
            (useAvailableContracts as jest.Mock).mockReturnValue(contractsFor(CONTRACT_LIST.MULTIPLIERS));

            const { result } = renderMarketSelection();

            expect(result.current.favourite_groups.map(group => group.trade_type)).toEqual([CONTRACT_LIST.MULTIPLIERS]);
        });

        it('groups every favourite when nothing is restricted', () => {
            (useFavouriteMarkets as jest.Mock).mockReturnValue({
                favourites: [
                    { symbol: 'R_100', trade_type: CONTRACT_LIST.MULTIPLIERS },
                    { symbol: 'R_50', trade_type: CONTRACT_LIST.RISE_FALL },
                ],
            });

            const { result } = renderMarketSelection();

            expect(result.current.favourites).toHaveLength(2);
            // Ordered by the trade-type display order, in which Rise/Fall precedes Multipliers.
            expect(result.current.favourite_groups.map(group => group.trade_type)).toEqual([
                CONTRACT_LIST.RISE_FALL,
                CONTRACT_LIST.MULTIPLIERS,
            ]);
        });

        it('shows all favourites while availability is still resolving (useAvailableContracts fails open)', () => {
            (useFavouriteMarkets as jest.Mock).mockReturnValue({
                favourites: [
                    { symbol: 'R_100', trade_type: CONTRACT_LIST.MULTIPLIERS },
                    { symbol: 'R_50', trade_type: CONTRACT_LIST.RISE_FALL },
                ],
            });
            (useAvailableContracts as jest.Mock).mockReturnValue(AVAILABLE_CONTRACTS);

            const { result } = renderMarketSelection();

            expect(result.current.favourites).toHaveLength(2);
        });
    });
});
