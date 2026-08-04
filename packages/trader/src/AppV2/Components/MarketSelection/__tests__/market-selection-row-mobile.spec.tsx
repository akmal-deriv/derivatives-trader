import { TActiveSymbolsResponse } from '@deriv/api';
import { getSymbolDisplayName } from '@deriv/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MarketSelectionRowMobile from '../market-selection-row-mobile';

const mockToggleFavourite = jest.fn();
let mockIsFavourite = false;

jest.mock('AppV2/Hooks/useFavouriteMarkets', () => ({
    __esModule: true,
    default: () => ({
        favourites: [],
        isFavourite: () => mockIsFavourite,
        toggleFavourite: mockToggleFavourite,
    }),
}));

jest.mock('../../SymbolIconsMapper/symbol-icons-mapper', () => {
    const SymbolIcon = () => <div data-testid='symbol-icon' />;
    return SymbolIcon;
});

type ActiveSymbols = NonNullable<TActiveSymbolsResponse['active_symbols']>;

const makeItem = (overrides: Partial<ActiveSymbols[number]> = {}): ActiveSymbols[number] =>
    ({
        underlying_symbol: 'frxEURUSD',
        market: 'forex',
        submarket: 'major_pairs',
        subgroup: 'major_pairs',
        exchange_is_open: 1,
        is_trading_suspended: 0,
        display_order: 0,
        ...overrides,
    }) as ActiveSymbols[number];

const eur_name = getSymbolDisplayName('frxEURUSD');

describe('MarketSelectionRowMobile', () => {
    beforeEach(() => {
        mockToggleFavourite.mockClear();
        mockIsFavourite = false;
    });

    it('renders the symbol display name', () => {
        render(<MarketSelectionRowMobile item={makeItem()} trade_type='Rise/Fall' onSelect={jest.fn()} />);
        expect(screen.getByText(eur_name)).toBeInTheDocument();
    });

    it('shows the % change pill when the market is open', () => {
        render(
            <MarketSelectionRowMobile
                item={makeItem()}
                trade_type='Rise/Fall'
                onSelect={jest.fn()}
                change_percentage={1.25}
            />
        );
        expect(screen.getByText('+1.25%')).toBeInTheDocument();
    });

    it('shows a CLOSED tag instead of the change when the market is shut', () => {
        render(
            <MarketSelectionRowMobile
                item={makeItem({ exchange_is_open: 0 })}
                trade_type='Rise/Fall'
                onSelect={jest.fn()}
                change_percentage={1.25}
            />
        );
        expect(screen.getByText('CLOSED')).toBeInTheDocument();
        expect(screen.queryByText('+1.25%')).not.toBeInTheDocument();
    });

    it('renders no stray "0" when the market is closed', () => {
        const { container } = render(
            <MarketSelectionRowMobile
                item={makeItem({ exchange_is_open: 0 })}
                trade_type='Rise/Fall'
                onSelect={jest.fn()}
            />
        );
        // Regression: `exchange_is_open` (0|1) must be compared, not truthy-tested — else `0` leaks in.
        expect(container).not.toHaveTextContent('0');
    });

    it('never renders a worm sparkline on mobile, even with a usable series', () => {
        // The mobile market list intentionally omits the sparkline (unlike desktop). The `series`
        // prop is still accepted for parity but must not render anything.
        render(
            <MarketSelectionRowMobile
                item={makeItem()}
                trade_type='Rise/Fall'
                onSelect={jest.fn()}
                series={[100, 101, 102]}
            />
        );
        expect(screen.queryByTestId('dt_market_sparkline')).not.toBeInTheDocument();
    });

    it('fires onSelect when the row content is clicked', async () => {
        const onSelect = jest.fn();
        render(<MarketSelectionRowMobile item={makeItem()} trade_type='Rise/Fall' onSelect={onSelect} />);
        await userEvent.click(screen.getByRole('button', { name: eur_name }));
        expect(onSelect).toHaveBeenCalledWith('frxEURUSD');
    });

    it('exposes Info + Favourite swipe actions and wires them', async () => {
        const onInfo = jest.fn();
        render(
            <MarketSelectionRowMobile item={makeItem()} trade_type='Rise/Fall' onSelect={jest.fn()} onInfo={onInfo} />
        );
        // Swipe actions are hidden from the a11y tree until the row is swiped open, so the default
        // (accessible-only) query can't see them.
        expect(screen.queryByRole('button', { name: 'Favourite' })).not.toBeInTheDocument();
        // They still exist in the DOM and stay wired — query with { hidden: true } to reach them.
        await userEvent.click(screen.getByRole('button', { name: 'Favourite', hidden: true }));
        expect(mockToggleFavourite).toHaveBeenCalledWith('frxEURUSD', 'Rise/Fall', 'market_list');
        await userEvent.click(screen.getByRole('button', { name: 'Info', hidden: true }));
        expect(onInfo).toHaveBeenCalledWith('frxEURUSD', 'Rise/Fall');
    });

    it('hides the Info action when no onInfo handler is provided', () => {
        render(<MarketSelectionRowMobile item={makeItem()} trade_type='Rise/Fall' onSelect={jest.fn()} />);
        expect(screen.queryByRole('button', { name: 'Info', hidden: true })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Favourite', hidden: true })).toBeInTheDocument();
    });
});
