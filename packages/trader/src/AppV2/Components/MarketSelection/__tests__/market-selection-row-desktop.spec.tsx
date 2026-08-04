import { TActiveSymbolsResponse } from '@deriv/api';
import { getSymbolDisplayName } from '@deriv/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MarketSelectionRowDesktop from '../market-selection-row-desktop';

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

describe('MarketSelectionRowDesktop', () => {
    beforeEach(() => {
        mockToggleFavourite.mockClear();
        mockIsFavourite = false;
    });

    it('renders the display name and the % change pill for an open market', () => {
        render(
            <MarketSelectionRowDesktop
                item={makeItem()}
                trade_type='Rise/Fall'
                onSelect={jest.fn()}
                change_percentage={1.25}
            />
        );
        expect(screen.getByText(eur_name)).toBeInTheDocument();
        expect(screen.getByText('+1.25%')).toBeInTheDocument();
    });

    it('shows a CLOSED tag instead of the change when the market is shut', () => {
        render(
            <MarketSelectionRowDesktop
                item={makeItem({ exchange_is_open: 0 })}
                trade_type='Rise/Fall'
                onSelect={jest.fn()}
                change_percentage={1.25}
            />
        );
        expect(screen.getByText('CLOSED')).toBeInTheDocument();
        expect(screen.queryByText('+1.25%')).not.toBeInTheDocument();
    });

    it('renders no sparkline (and no stray "0") when the market is closed', () => {
        const { container } = render(
            <MarketSelectionRowDesktop
                item={makeItem({ exchange_is_open: 0 })}
                trade_type='Rise/Fall'
                onSelect={jest.fn()}
                series={[100, 101, 102]}
            />
        );
        expect(screen.queryByTestId('dt_market_sparkline')).not.toBeInTheDocument();
        // Regression: `exchange_is_open` (0|1) must be compared, not truthy-tested — else `0` leaks in.
        expect(container).not.toHaveTextContent('0');
    });

    it('renders the sparkline for an open market with a usable series', () => {
        render(
            <MarketSelectionRowDesktop
                item={makeItem()}
                trade_type='Rise/Fall'
                onSelect={jest.fn()}
                series={[100, 101, 102]}
            />
        );
        expect(screen.getByTestId('dt_market_sparkline')).toBeInTheDocument();
    });

    it('fires onSelect when the row body is clicked', async () => {
        const onSelect = jest.fn();
        render(<MarketSelectionRowDesktop item={makeItem()} trade_type='Rise/Fall' onSelect={onSelect} />);
        await userEvent.click(screen.getByTestId('symbol-icon'));
        expect(onSelect).toHaveBeenCalledWith('frxEURUSD');
    });

    it('opens info via the inline Info button without selecting the market', async () => {
        const onSelect = jest.fn();
        const onInfo = jest.fn();
        render(
            <MarketSelectionRowDesktop item={makeItem()} trade_type='Rise/Fall' onSelect={onSelect} onInfo={onInfo} />
        );
        await userEvent.click(screen.getByRole('button', { name: 'Info' }));
        expect(onInfo).toHaveBeenCalledWith('frxEURUSD', 'Rise/Fall');
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('toggles the favourite via the inline star without selecting the market', async () => {
        const onSelect = jest.fn();
        render(<MarketSelectionRowDesktop item={makeItem()} trade_type='Rise/Fall' onSelect={onSelect} />);
        await userEvent.click(screen.getByRole('button', { name: 'Favourite' }));
        expect(mockToggleFavourite).toHaveBeenCalledWith('frxEURUSD', 'Rise/Fall', 'market_list');
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('does not render the Info button when no onInfo handler is provided', () => {
        render(<MarketSelectionRowDesktop item={makeItem()} trade_type='Rise/Fall' onSelect={jest.fn()} />);
        expect(screen.queryByRole('button', { name: 'Info' })).not.toBeInTheDocument();
    });
});
