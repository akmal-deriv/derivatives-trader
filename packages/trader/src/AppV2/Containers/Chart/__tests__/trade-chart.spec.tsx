import { mockStore } from '@deriv/stores';
import { render, screen } from '@testing-library/react';

import useActiveSymbols from 'AppV2/Hooks/useActiveSymbols';
import { useSmartChartsAdapter } from 'Modules/SmartChart/Hooks/useSmartChartsAdapter';

import TraderProviders from '../../../../trader-providers';
import TradeChart from '../trade-chart';

const mock_chart = 'Mocked Chart';

let mockSmartChartProps: Record<string, any> = {};
jest.mock('Modules/SmartChart', () => ({
    SmartChart: (props: Record<string, any>) => {
        mockSmartChartProps = props;
        return 'Mocked Chart';
    },
}));

jest.mock('Modules/SmartChart/Hooks/useSmartChartsAdapter', () => ({
    useSmartChartsAdapter: jest.fn(() => ({
        smartChartsAdapter: {},
        chartData: {
            activeSymbols: [{ symbol: 'EURUSD', display_name: 'EUR/USD', market: 'forex', exchange_is_open: 1 }],
            tradingTimes: { EURUSD: { isOpen: true, openTime: '00:00', closeTime: '23:59' } },
        },
        isLoading: false,
        error: null,
        getQuotes: jest.fn(),
        subscribeQuotes: jest.fn(),
        unsubscribeQuotes: jest.fn(),
        retryFetchChartData: jest.fn(),
        isValidGranularity: jest.fn(() => true),
        shouldUseCandlesOverride: false,
    })),
}));
jest.mock('react-router-dom', () => ({
    useLocation: jest.fn(() => ({
        pathname: '/',
    })),
    withRouter: jest.fn(children => children),
}));
jest.mock('@deriv-com/ui', () => ({
    ...jest.requireActual('@deriv-com/ui'),
    useDevice: jest.fn(() => ({ isDesktop: true })),
}));
jest.mock('AppV2/Hooks/useActiveSymbols', () => ({
    ...jest.requireActual('AppV2/Hooks/useActiveSymbols'),
    __esModule: true,
    default: jest.fn(() => ({
        activeSymbols: [{ symbol: 'EURUSD', display_name: 'EUR/USD', exchange_is_open: 1 }],
    })),
}));

describe('TradeChart', () => {
    const mockedTradeChart = (store_override?: ReturnType<typeof mockStore>) => {
        const store = store_override || mockStore({});
        render(
            <TraderProviders store={store}>
                <TradeChart />
            </TraderProviders>
        );
    };

    it('does not render the chart if active_symbols array is empty', () => {
        (useActiveSymbols as jest.Mock).mockReturnValueOnce({
            activeSymbols: [],
        });
        mockedTradeChart();

        expect(screen.queryByText(mock_chart)).not.toBeInTheDocument();
    });

    it('does not render the chart if there is no symbol', () => {
        const store = mockStore({});
        store.modules.trade.symbol = '';
        mockedTradeChart(store);

        expect(screen.queryByText(mock_chart)).not.toBeInTheDocument();
    });

    it('renders the chart', async () => {
        const store = mockStore({});
        store.modules.trade.symbol = 'EURUSD';
        mockedTradeChart(store);
        // Wait for async chartData effect
        expect(await screen.findByText(mock_chart)).toBeInTheDocument();
    });

    it('wires is_socket_opened to the chart data adapter and SmartChart connection props', async () => {
        const store = mockStore({});
        store.modules.trade.symbol = 'EURUSD';
        store.common.is_socket_opened = true;
        mockedTradeChart(store);

        expect(await screen.findByText(mock_chart)).toBeInTheDocument();
        expect(useSmartChartsAdapter).toHaveBeenCalledWith(expect.objectContaining({ is_connection_opened: true }));
        expect(mockSmartChartProps.isConnectionOpened).toBe(true);
    });
});
