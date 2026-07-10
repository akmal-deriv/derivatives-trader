import React from 'react';

import { mockStore } from '@deriv/stores';
import { TCoreStores } from '@deriv/stores/types';
import { render, screen } from '@testing-library/react';

import TraderProviders from '../../../../trader-providers';
import ActiveSymbolsList from '../../ActiveSymbolsList';
import MarketSelector from '../market-selector';

// Mock the WS object from @deriv/shared
jest.mock('@deriv/shared', () => ({
    ...jest.requireActual('@deriv/shared'),
    WS: {
        authorized: {
            send: jest.fn().mockResolvedValue({}),
        },
        send: jest.fn().mockResolvedValue({}),
        getMarketNamesMap: jest.fn().mockReturnValue({}),
    },
    getMarketNamesMap: jest.fn().mockReturnValue({}),
    getSymbolDisplayName: jest.fn((symbol: string) => {
        const symbolMap: Record<string, string> = {
            EURUSD: 'EUR/USD',
            GBPUSD: 'GBP/USD',
            CADAUD: 'CAD/AUD',
        };
        return symbolMap[symbol] || symbol;
    }),
}));

jest.mock('AppV2/Hooks/useActiveSymbols', () => ({
    ...jest.requireActual('AppV2/Hooks/useActiveSymbols'),
    __esModule: true,
    default: jest.fn(() => ({
        activeSymbols: [
            { underlying_symbol: 'EURUSD', exchange_is_open: 1, pip_size: 4 },
            { underlying_symbol: 'GBPUSD', exchange_is_open: 0, pip_size: 4 },
            { underlying_symbol: 'CADAUD', exchange_is_open: 0, pip_size: 4 },
        ],
    })),
}));

// Mock the useContractsFor hook
jest.mock('AppV2/Hooks/useContractsFor', () => ({
    __esModule: true,
    default: jest.fn(() => ({
        trade_types: [{ value: 'rise_fall', text: 'Rise/Fall' }],
        contract_types_list: [],
        available_contract_types: {},
        is_fetching_ref: { current: false },
        resetTradeTypes: jest.fn(),
    })),
}));

// Mock the useSnackbar hook and Skeleton component
jest.mock('@deriv-com/quill-ui', () => ({
    ...jest.requireActual('@deriv-com/quill-ui'),
    useSnackbar: jest.fn(() => ({
        addSnackbar: jest.fn(),
    })),
    Skeleton: {
        Square: ({ height, width }: { height: number; width: number }) => (
            <div data-testid='square-skeleton' style={{ height, width }} />
        ),
    },
}));

jest.mock('AppV2/Components/ActiveSymbolsList', () => jest.fn(() => 'MockedActiveSymbolsList'));

describe('MarketSelector', () => {
    let default_trade_store: TCoreStores;

    beforeEach(() => {
        default_trade_store = mockStore({
            modules: {
                trade: {
                    symbol: 'EURUSD',
                    tick_data: {
                        quote: 1234.23,
                        pip_size: 2,
                    },
                },
            },
        });
    });

    const MockedMarketSelector = ({ onOpenChange }: { onOpenChange?: (is_open: boolean) => void } = {}) => {
        return (
            <TraderProviders store={default_trade_store}>
                <MarketSelector onOpenChange={onOpenChange} />
            </TraderProviders>
        );
    };

    it('renders storeSymbol when storeSymbol is set', () => {
        render(MockedMarketSelector());

        expect(screen.getByText('EUR/USD')).toBeInTheDocument();
        expect(screen.getByText(default_trade_store.modules.trade.tick_data.quote)).toBeInTheDocument();
    });
    it('renders CLOSED when current symbol exchange_is_open is 0', () => {
        default_trade_store.modules.trade.symbol = 'GBPUSD';
        render(MockedMarketSelector());

        expect(screen.getByText('GBP/USD')).toBeInTheDocument();
        expect(screen.getByText(default_trade_store.modules.trade.tick_data.quote)).toBeInTheDocument();
        expect(screen.getByText('CLOSED')).toBeInTheDocument();
    });
    it('renders error message when current symbol is not among active symbols list', () => {
        default_trade_store.modules.trade.symbol = 'USDJPY';
        render(MockedMarketSelector());

        expect(screen.getByText('Symbol not available. Please select another market.')).toBeInTheDocument();
    });
    it('renders loader instead of current spot when tick_data is empty', () => {
        default_trade_store.modules.trade.tick_data = {};
        render(MockedMarketSelector());

        expect(screen.getByTestId('square-skeleton')).toBeInTheDocument();
    });
    it('renders dash instead of current spot when market is closed and tick_data is empty', () => {
        default_trade_store.modules.trade.symbol = 'GBPUSD';
        default_trade_store.modules.trade.is_market_closed = true;
        default_trade_store.modules.trade.tick_data = {};
        render(MockedMarketSelector());

        expect(screen.getByText('-')).toBeInTheDocument();
    });

    describe('view_markets URL param', () => {
        const mocked_active_symbols_list = ActiveSymbolsList as unknown as jest.Mock;

        afterEach(() => {
            window.history.replaceState({}, document.title, '/');
        });

        it('opens the market selector on load when view_markets=true is in the URL', () => {
            mocked_active_symbols_list.mockClear();
            window.history.pushState({}, document.title, '/?view_markets=true');

            render(MockedMarketSelector());

            const opened_with_true = mocked_active_symbols_list.mock.calls.some(([props]) => props.isOpen);
            expect(opened_with_true).toBe(true);
            // one-time param must be stripped from the URL after being consumed
            expect(window.location.search).toBe('');
        });

        it('does not open the market selector on load when view_markets is absent', () => {
            mocked_active_symbols_list.mockClear();

            render(MockedMarketSelector());

            const opened_with_true = mocked_active_symbols_list.mock.calls.some(([props]) => props.isOpen);
            expect(opened_with_true).toBe(false);
        });

        it('reports the selector closed via onOpenChange when the symbol errors after opening on load', () => {
            // Land with the selector open, but on a symbol that is not in the active symbols list.
            default_trade_store.modules.trade.symbol = 'USDJPY';
            window.history.pushState({}, document.title, '/?view_markets=true');
            const onOpenChange = jest.fn();

            render(MockedMarketSelector({ onOpenChange }));

            // Error state must report closed so a deferred onboarding isn't stuck for the session.
            expect(onOpenChange).toHaveBeenLastCalledWith(false);
        });
    });
});
