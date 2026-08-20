import { act, renderHook } from '@testing-library/react-hooks';

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

// Mutable across renders so a store contract_type change can be simulated via rerender,
// mirroring how the MobX observable would update in the real app.
let mock_contract_type = 'rise_fall';

jest.mock('Stores/useTraderStores', () => ({
    useTraderStore: jest.fn(() => ({
        contract_type: mock_contract_type,
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

/**
 * Renders the hook the way a shell does: `is_open` is a prop, so a close/reopen cycle is a `rerender`
 * with a new value (the hook stays mounted across cycles in both shells).
 */
const renderMarketSelection = (is_open = true) =>
    renderHook(({ is_open: open }) => useMarketSelection({ is_open: open, onClose: jest.fn() }), {
        initialProps: { is_open },
    });

describe('useMarketSelection', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mock_contract_type = 'rise_fall';
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

    describe('browse trade type resyncs to the live store contract type', () => {
        it('resets current_trade_type when the store contract_type changes', () => {
            mock_contract_type = 'rise_fall';
            const { result, rerender } = renderMarketSelection();

            expect(result.current.current_trade_type).toBe(CONTRACT_LIST.RISE_FALL);

            mock_contract_type = 'accumulator';
            rerender();

            expect(result.current.current_trade_type).toBe(CONTRACT_LIST.ACCUMULATORS);
        });

        it('clears stale info state when the store contract_type changes', () => {
            mock_contract_type = 'rise_fall';
            const { result, rerender } = renderMarketSelection();

            act(() => {
                result.current.showInfo('R_100', 'Rise/Fall');
            });
            expect(result.current.info_symbol).toBe('R_100');
            expect(result.current.info_trade_type).toBe('Rise/Fall');

            mock_contract_type = 'accumulator';
            rerender();

            expect(result.current.info_symbol).toBeNull();
            expect(result.current.info_trade_type).toBe('');
        });

        it('browses the new trade type on reopen after contract_type changed while closed', () => {
            mock_contract_type = 'rise_fall';
            const { result, rerender } = renderMarketSelection();

            // The reported sequence: switch trade type on the strip while the selector is closed.
            rerender({ is_open: false });
            mock_contract_type = 'accumulator';
            rerender({ is_open: true });

            expect(result.current.current_trade_type).toBe(CONTRACT_LIST.ACCUMULATORS);
        });

        it('preserves a voluntary browse-tab pick across a rerender that does not change contract_type', () => {
            mock_contract_type = 'rise_fall';
            const { result, rerender } = renderMarketSelection();

            const multipliers = AVAILABLE_CONTRACTS.find(contract => contract.id === CONTRACT_LIST.MULTIPLIERS);
            expect(multipliers).toBeDefined();

            act(() => {
                result.current.handleSelectTradeType(multipliers as TAvailableContract);
            });
            expect(result.current.current_trade_type).toBe(CONTRACT_LIST.MULTIPLIERS);

            // Same store contract_type — voluntary browse pick must survive.
            rerender();

            expect(result.current.current_trade_type).toBe(CONTRACT_LIST.MULTIPLIERS);
        });
    });

    describe('browse state re-seeds on every open/close cycle', () => {
        const contractFor = (id: string) =>
            AVAILABLE_CONTRACTS.find(contract => contract.id === id) as TAvailableContract;

        it('drops an abandoned browse-tab pick when the selector is reopened', () => {
            mock_contract_type = 'accumulator';
            const { result, rerender } = renderMarketSelection();

            expect(result.current.current_trade_type).toBe(CONTRACT_LIST.ACCUMULATORS);

            // Browse Turbos without committing a market, then close.
            act(() => {
                result.current.handleSelectTradeType(contractFor(CONTRACT_LIST.TURBOS));
            });
            expect(result.current.current_trade_type).toBe(CONTRACT_LIST.TURBOS);
            rerender({ is_open: false });

            // Reopen: the browse tab must follow the still-selected trade type, not the abandoned pick.
            rerender({ is_open: true });

            expect(result.current.current_trade_type).toBe(CONTRACT_LIST.ACCUMULATORS);
        });

        it('re-seeds the browse tab on close, so the reopened selector never renders the abandoned pick', () => {
            mock_contract_type = 'accumulator';
            const { result, rerender } = renderMarketSelection();

            act(() => {
                result.current.handleSelectTradeType(contractFor(CONTRACT_LIST.TURBOS));
            });
            rerender({ is_open: false });

            expect(result.current.current_trade_type).toBe(CONTRACT_LIST.ACCUMULATORS);
        });

        it('drops an abandoned category and favourites tab when the selector is reopened', () => {
            mock_contract_type = 'accumulator';
            const { result, rerender } = renderMarketSelection();

            act(() => {
                result.current.setSelectedCategory('forex');
                result.current.setIsFavouritesTab(true);
            });
            expect(result.current.selected_category).toBe('forex');
            expect(result.current.is_favourites_tab).toBe(true);

            rerender({ is_open: false });
            rerender({ is_open: true });

            expect(result.current.selected_category).toBe('');
            expect(result.current.is_favourites_tab).toBe(false);
        });

        it('drops an abandoned info symbol when the selector is reopened', () => {
            mock_contract_type = 'accumulator';
            const { result, rerender } = renderMarketSelection();

            act(() => {
                result.current.showInfo('R_100', CONTRACT_LIST.TURBOS);
            });
            expect(result.current.info_symbol).toBe('R_100');

            rerender({ is_open: false });
            rerender({ is_open: true });

            expect(result.current.info_symbol).toBeNull();
            expect(result.current.info_trade_type).toBe('');
        });

        it('drops search mode when the selector is closed without going through handleClose', () => {
            mock_contract_type = 'accumulator';
            const { result, rerender } = renderMarketSelection();

            act(() => {
                result.current.setIsSearching(true);
            });
            expect(result.current.is_searching).toBe(true);

            // The onboarding guide closes the selector straight through the store, so `handleClose`
            // (which also clears search mode) never runs — the reopened selector must still not
            // land the user back on the search page.
            rerender({ is_open: false });
            rerender({ is_open: true });

            expect(result.current.is_searching).toBe(false);
        });

        it('keeps search mode for the rest of the open session', () => {
            mock_contract_type = 'accumulator';
            const { result, rerender } = renderMarketSelection();

            act(() => {
                result.current.setIsSearching(true);
            });

            rerender({ is_open: true });

            expect(result.current.is_searching).toBe(true);
        });

        it('keeps a voluntary browse-tab pick for the rest of the open session', () => {
            mock_contract_type = 'accumulator';
            const { result, rerender } = renderMarketSelection();

            act(() => {
                result.current.handleSelectTradeType(contractFor(CONTRACT_LIST.TURBOS));
            });

            // Still open — unrelated rerenders must not snap the tab back.
            rerender({ is_open: true });
            rerender({ is_open: true });

            expect(result.current.current_trade_type).toBe(CONTRACT_LIST.TURBOS);
        });
    });
});
