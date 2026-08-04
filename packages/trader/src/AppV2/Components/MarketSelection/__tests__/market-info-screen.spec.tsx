import { TActiveSymbolsResponse } from '@deriv/api';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MarketInfoScreen from '../market-info-screen';

const mockSelectMarketAndTradeType = jest.fn().mockResolvedValue(undefined);
const mockToggleFavourite = jest.fn();
let mockIsLoading = false;
let mockLiveTick: { quote: number; epoch?: number; pip_size?: number } | null = null;
// The selected window's series (worm-chart points, oldest→newest) and its windowed % change.
let mockChartSeries: number[] = [];
let mockChartChange: number | null = null;
// Market-availability content from useSymbolTradingTimes (countdown / next-open / schedule summary).
let mockMarketAvailability: {
    is_all_day: boolean;
    closes_in_minutes: number | null;
    session: { close: string; reopen: string | null } | null;
    next_open: { when: string; time: string } | null;
    description: string;
} = {
    is_all_day: false,
    closes_in_minutes: 134,
    session: null,
    next_open: null,
    description: 'Open Monday to Friday, 24 hours a day.',
};

jest.mock('../../SymbolIconsMapper/symbol-icons-mapper', () => {
    const SymbolIcon = () => <div data-testid='symbol-icon' />;
    return SymbolIcon;
});

jest.mock('Stores/useTraderStores', () => ({
    useTraderStore: () => ({
        contract_type: 'rise_fall',
        selectMarketAndTradeType: mockSelectMarketAndTradeType,
    }),
}));

jest.mock('AppV2/Hooks/useFavouriteMarkets', () => ({
    __esModule: true,
    default: () => ({ favourites: [], isFavourite: () => false, toggleFavourite: mockToggleFavourite }),
}));

// Live tick is null by default → the headline price falls back to the window snapshot's close and the
// change % to the hook's windowed value. Individual tests set `mockLiveTick` to exercise the live path.
jest.mock('AppV2/Hooks/useLiveTick', () => ({
    __esModule: true,
    default: () => mockLiveTick,
}));

jest.mock('AppV2/Hooks/useMarketInfoTradeTypes', () => ({
    __esModule: true,
    default: () => ({
        trade_types: [
            { id: 'Rise/Fall', tradeType: 'Rise/Fall', for: ['rise_fall', 'rise_fall_equal'], category: 'directional' },
            { id: 'Multipliers', tradeType: 'Multipliers', for: ['multiplier'], category: 'growth_based' },
        ],
        isLoading: false,
    }),
}));

jest.mock('AppV2/Hooks/useSymbolTradingTimes', () => ({
    __esModule: true,
    default: () => ({ market_availability: mockMarketAvailability, isLoading: false }),
}));

jest.mock('AppV2/Hooks/useMarketDiscovery', () => ({
    __esModule: true,
    default: () => ({
        sections: { trending: [], gainers: [], losers: [] },
        change_by_symbol: new Map([['frxEURUSD', mockChartChange]]),
        series_by_symbol: new Map([['frxEURUSD', mockChartSeries]]),
        pip_size_by_symbol: new Map([['frxEURUSD', 4]]),
        changes: [],
        isLoading: mockIsLoading,
    }),
}));

type ActiveSymbols = NonNullable<TActiveSymbolsResponse['active_symbols']>;

const item = {
    underlying_symbol: 'frxEURUSD',
    market: 'forex',
    submarket: 'major_pairs',
    subgroup: 'major_pairs',
    exchange_is_open: 1,
    is_trading_suspended: 0,
    display_order: 0,
} as ActiveSymbols[number];

describe('MarketInfoScreen', () => {
    beforeEach(() => {
        mockSelectMarketAndTradeType.mockClear();
        mockToggleFavourite.mockClear();
        mockIsLoading = false;
        mockLiveTick = null;
        mockChartSeries = [];
        mockChartChange = null;
        mockMarketAvailability = {
            is_all_day: false,
            closes_in_minutes: 134,
            session: null,
            next_open: null,
            description: 'Open Monday to Friday, 24 hours a day.',
        };
    });

    it('shows a skeleton while data is loading', () => {
        mockIsLoading = true;
        render(<MarketInfoScreen item={item} onBack={jest.fn()} onTraded={jest.fn()} />);
        expect(screen.getByTestId('dt_market_info_skeleton')).toBeInTheDocument();
        expect(screen.queryByText('1.0826')).not.toBeInTheDocument();
        expect(screen.queryByText('Trade on')).not.toBeInTheDocument();
    });

    it('renders stats, description, trade types and market availability', () => {
        // No window series yet → the header % falls back to the chart's windowed change; the live tick
        // supplies the headline price.
        mockChartChange = 1.25;
        mockLiveTick = { quote: 1.0826, pip_size: 4 };
        render(<MarketInfoScreen item={item} onBack={jest.fn()} onTraded={jest.fn()} />);
        expect(screen.getByText('1.0826')).toBeInTheDocument();
        expect(screen.getByText('+1.25%')).toBeInTheDocument();
        expect(screen.getByText('Open price')).toBeInTheDocument();
        expect(screen.getByText('Lowest price')).toBeInTheDocument();
        expect(screen.getByText('Trade on')).toBeInTheDocument();
        // Market availability: open status + countdown (134 min → 2 hr 14 min). The schedule summary
        // now lives in the title's info tooltip, so it isn't asserted inline here.
        expect(screen.getByText('Market availability')).toBeInTheDocument();
        expect(screen.getByText('Open now')).toBeInTheDocument();
        expect(screen.getByText('Closes in 2 hr 14 min')).toBeInTheDocument();
    });

    it('shows the live price and a change % scoped to the selected window (live price vs window open)', () => {
        // Window opens at 1.08 (flat); live tick 1.0854.
        mockChartSeries = [1.08, 1.08, 1.08];
        mockChartChange = 9.99; // stale windowed % — the live recompute must win over this
        mockLiveTick = { quote: 1.0854, pip_size: 4 };
        render(<MarketInfoScreen item={item} onBack={jest.fn()} onTraded={jest.fn()} />);
        // The headline shows the live price (the snapshot close 1.0800 stays in the OHLC cells)...
        expect(screen.getByText('1.0854')).toBeInTheDocument();
        // ...and the change is (1.0854 - 1.08) / 1.08 * 100 = 0.50%, over the window (not the stale 9.99%).
        expect(screen.getByText('+0.50%')).toBeInTheDocument();
    });

    it('calls onBack when the back button is pressed', async () => {
        const onBack = jest.fn();
        render(<MarketInfoScreen item={item} onBack={onBack} onTraded={jest.fn()} />);
        await userEvent.click(screen.getByRole('button', { name: 'Back' }));
        expect(onBack).toHaveBeenCalled();
    });

    it('commits under the current trade type and closes when its card is tapped', async () => {
        const onTraded = jest.fn();
        render(<MarketInfoScreen item={item} onBack={jest.fn()} onTraded={onTraded} />);
        await userEvent.click(screen.getByText('Rise/Fall'));
        expect(mockSelectMarketAndTradeType).toHaveBeenCalledWith('frxEURUSD', 'rise_fall');
        expect(onTraded).toHaveBeenCalled();
    });

    it('commits the tapped trade type when a different card is tapped', async () => {
        render(<MarketInfoScreen item={item} onBack={jest.fn()} onTraded={jest.fn()} />);
        await userEvent.click(screen.getByText('Multipliers'));
        expect(mockSelectMarketAndTradeType).toHaveBeenCalledWith('frxEURUSD', 'multiplier');
    });

    it('favourites under the first available trade type by default', async () => {
        render(<MarketInfoScreen item={item} onBack={jest.fn()} onTraded={jest.fn()} />);
        await userEvent.click(screen.getByRole('button', { name: 'Favourite' }));
        expect(mockToggleFavourite).toHaveBeenCalledWith('frxEURUSD', 'Rise/Fall', 'market_info');
    });

    it('favourites under the trade type the info screen was opened from', async () => {
        render(
            <MarketInfoScreen item={item} onBack={jest.fn()} onTraded={jest.fn()} default_trade_type='Multipliers' />
        );
        await userEvent.click(screen.getByRole('button', { name: 'Favourite' }));
        expect(mockToggleFavourite).toHaveBeenCalledWith('frxEURUSD', 'Multipliers', 'market_info');
    });

    it('shows the "Market closed" overlay, Closed badge + next-open availability for a closed market', () => {
        mockChartChange = 1.25;
        mockMarketAvailability = {
            is_all_day: false,
            closes_in_minutes: null,
            session: null,
            next_open: { when: 'tomorrow', time: '08:00' },
            description: 'Open Monday to Friday, 24 hours a day.',
        };
        render(<MarketInfoScreen item={{ ...item, exchange_is_open: 0 }} onBack={jest.fn()} onTraded={jest.fn()} />);
        expect(screen.getByText('Market closed')).toBeInTheDocument();
        // "Closed" appears in both the price-row badge and the market-availability status.
        expect(screen.getAllByText('Closed').length).toBeGreaterThanOrEqual(2);
        expect(screen.getByText('Opens tomorrow at 08:00 GMT')).toBeInTheDocument();
        // OHLC shows dashes for a closed market (4 stat cells).
        expect(screen.getAllByText('–').length).toBeGreaterThanOrEqual(4);
        // The price row is replaced by the badge — no price / % change shown.
        expect(screen.queryByText('1.0826')).not.toBeInTheDocument();
        expect(screen.queryByText('+1.25%')).not.toBeInTheDocument();
    });

    it('shows Closes + Reopens for a multi-session open market', () => {
        mockMarketAvailability = {
            is_all_day: false,
            closes_in_minutes: null,
            session: { close: '04:00', reopen: '05:00' },
            next_open: null,
            description: 'Open Monday to Friday from 01:30–04:00 GMT and 05:00–08:00 GMT.',
        };
        render(<MarketInfoScreen item={item} onBack={jest.fn()} onTraded={jest.fn()} />);
        expect(screen.getByText('Open now')).toBeInTheDocument();
        expect(screen.getByText('Closes 04:00 GMT')).toBeInTheDocument();
        expect(screen.getByText('Reopens 05:00 GMT')).toBeInTheDocument();
    });

    it('shows "24 hours" (no countdown) for an all-day open market', () => {
        mockMarketAvailability = {
            is_all_day: true,
            closes_in_minutes: null,
            session: null,
            next_open: null,
            description: 'Open 24 hours a day, 7 days a week.',
        };
        render(<MarketInfoScreen item={item} onBack={jest.fn()} onTraded={jest.fn()} />);
        expect(screen.getByText('Open now')).toBeInTheDocument();
        expect(screen.getByText('24 hours a day (GMT)')).toBeInTheDocument();
        expect(screen.queryByText(/Closes in/)).not.toBeInTheDocument();
    });
});
