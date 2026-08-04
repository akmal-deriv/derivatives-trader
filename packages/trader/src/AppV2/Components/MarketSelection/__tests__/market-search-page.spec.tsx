import { TActiveSymbolsResponse } from '@deriv/api';
import { getSymbolDisplayName } from '@deriv/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MarketSearchPage from '../market-search-page';

jest.mock('@deriv-com/ui', () => ({ useDevice: () => ({ isMobile: true }) }));
jest.mock('../../SymbolIconsMapper/symbol-icons-mapper', () => {
    const SymbolIcon = () => <div data-testid='symbol-icon' />;
    return SymbolIcon;
});
jest.mock('AppV2/Hooks/useFavouriteMarkets', () => ({
    __esModule: true,
    default: () => ({ favourites: [], isFavourite: () => false, toggleFavourite: jest.fn() }),
}));
// The worm sparkline + % change are fetched via useMarketDiscovery; stub it so results render
// without an API/QueryClient context.
jest.mock('AppV2/Hooks/useMarketDiscovery', () => ({
    __esModule: true,
    default: () => ({ change_by_symbol: new Map(), series_by_symbol: new Map() }),
}));

type ActiveSymbols = NonNullable<TActiveSymbolsResponse['active_symbols']>;

const makeSymbol = (underlying_symbol: string): ActiveSymbols[number] =>
    ({
        underlying_symbol,
        market: 'forex',
        submarket: 'major_pairs',
        subgroup: 'major_pairs',
        exchange_is_open: 1,
        is_trading_suspended: 0,
        display_order: 0,
    }) as ActiveSymbols[number];

const eur = makeSymbol('frxEURUSD');
// EUR/USD is tradeable under two trade types → it should appear once per group.
const symbols_by_trade_type = new Map<string, ActiveSymbols>([
    ['Rise/Fall', [eur]],
    ['Higher/Lower', [eur]],
]);
const eur_name = getSymbolDisplayName('frxEURUSD');

const renderPage = (props = {}) =>
    render(
        <MarketSearchPage
            symbols_by_trade_type={symbols_by_trade_type}
            onSelectSymbol={jest.fn()}
            onBack={jest.fn()}
            {...props}
        />
    );

describe('MarketSearchPage', () => {
    it('shows a prompt and no results before the user types', () => {
        renderPage();
        expect(screen.getByText('Search for a market by name.')).toBeInTheDocument();
        expect(screen.queryByText(eur_name)).not.toBeInTheDocument();
    });

    it('groups matches by trade type, repeating the symbol under each available trade type', async () => {
        renderPage();
        await userEvent.type(screen.getByPlaceholderText('Search markets'), 'eur');
        expect(screen.getByText('Rise/Fall')).toBeInTheDocument();
        expect(screen.getByText('Higher/Lower')).toBeInTheDocument();
        expect(screen.getAllByText(eur_name)).toHaveLength(2);
    });

    it('splits each trade-type group into submarket subgroups with a title', async () => {
        renderPage();
        await userEvent.type(screen.getByPlaceholderText('Search markets'), 'eur');
        // One "Major pairs" submarket title per trade-type group (Rise/Fall + Higher/Lower).
        expect(screen.getAllByText('Major pairs')).toHaveLength(2);
    });

    it('shows the empty state when nothing matches', async () => {
        renderPage();
        await userEvent.type(screen.getByPlaceholderText('Search markets'), 'zzzzz');
        expect(screen.getByText('No result found')).toBeInTheDocument();
    });

    it('commits the symbol under the trade type of the tapped group', async () => {
        const onSelectSymbol = jest.fn();
        renderPage({ onSelectSymbol });
        await userEvent.type(screen.getByPlaceholderText('Search markets'), 'eur');
        // Tap the first row (under the first group, Rise/Fall).
        await userEvent.click(screen.getAllByText(eur_name)[0]);
        expect(onSelectSymbol).toHaveBeenCalledWith('frxEURUSD', 'Rise/Fall');
    });

    it('calls onBack from the cancel button', async () => {
        const onBack = jest.fn();
        renderPage({ onBack });
        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onBack).toHaveBeenCalled();
    });
});
