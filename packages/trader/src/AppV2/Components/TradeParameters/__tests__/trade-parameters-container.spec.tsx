import { render, screen } from '@testing-library/react';

import TradeParametersContainer from '../trade-parameters-container';

const mockUseTraderStore = jest.fn(() => ({
    contract_type: 'rise_fall',
    has_cancellation: false,
    symbol: 'frxEURUSD',
}));

const mockIsTradeParamVisible = jest.fn(
    ({ component_key }: { component_key: string }) => component_key === 'trade_type_tabs'
);

jest.mock('../trade-parameters', () => ({
    __esModule: true,
    default: jest.fn(({ is_minimized }) => <div>TradeParameters-{is_minimized ? 'minimized' : 'expanded'}</div>),
}));

jest.mock('../TradeTypeTabs', () => ({
    __esModule: true,
    default: jest.fn(() => <div data-testid='mock-trade-type-tabs'>TradeTypeTabs</div>),
}));

jest.mock('AppV2/Components/PurchaseButton', () => ({
    __esModule: true,
    default: jest.fn(() => <button data-testid='mock-purchase-button'>PurchaseButton</button>),
}));

jest.mock('AppV2/Components/ClosedMarketMessage', () => ({
    __esModule: true,
    default: jest.fn(() => <div data-testid='mock-closed-market-message'>ClosedMarketMessage</div>),
}));

jest.mock('Stores/useTraderStores', () => ({
    useTraderStore: () => mockUseTraderStore(),
}));

const mockUseStore = jest.fn(() => ({ ui: { is_chart_maximized: false } }));
jest.mock('@deriv/stores', () => ({
    ...jest.requireActual('@deriv/stores'),
    useStore: () => mockUseStore(),
}));

jest.mock('AppV2/Utils/layout-utils', () => ({
    isTradeParamVisible: jest.fn((args: { component_key: string }) => mockIsTradeParamVisible(args)),
}));

jest.mock('../../Guide', () => jest.fn(() => 'Guide'));
jest.mock('@deriv-com/ui', () => ({
    ...jest.requireActual('@deriv-com/ui'),
    useDevice: jest.fn(() => ({ isMobile: false, isDesktop: true })),
}));
jest.mock('@deriv/shared', () => ({
    ...jest.requireActual('@deriv/shared'),
    isMobile: jest.fn(() => true),
}));

describe('TradeParametersContainer', () => {
    beforeEach(() => {
        mockUseTraderStore.mockReturnValue({
            contract_type: 'rise_fall',
            has_cancellation: false,
            symbol: 'frxEURUSD',
        });
        mockUseStore.mockReturnValue({ ui: { is_chart_maximized: false } });
        mockIsTradeParamVisible.mockImplementation(({ component_key }) => component_key === 'trade_type_tabs');
    });

    it('should render the params and the purchase button', () => {
        render(<TradeParametersContainer />);

        expect(screen.getByText('TradeParameters-minimized')).toBeInTheDocument();
        expect(screen.getByText('PurchaseButton')).toBeInTheDocument();
    });

    // The sheet is a single fixed height with no expand affordance, so the params are always
    // rendered minimized and there is nothing to toggle.
    it('should always render trade parameters minimized and expose no expand handle', () => {
        render(<TradeParametersContainer />);

        expect(screen.getByText('TradeParameters-minimized')).toBeInTheDocument();
        expect(screen.queryByText('TradeParameters-expanded')).not.toBeInTheDocument();
        expect(screen.queryByTestId('trade-params-handle')).not.toBeInTheDocument();
    });

    it('should not carry expanded/collapsed state classes', () => {
        render(<TradeParametersContainer />);

        const container = screen.getByTestId('trade-params-container');
        expect(container).toHaveClass('trade-params__container');
        expect(container).not.toHaveClass('trade-params__container--expanded');
        expect(container).not.toHaveClass('trade-params__container--collapsed');
    });

    it('should not render purchase button when market is closed', () => {
        render(<TradeParametersContainer is_market_closed />);

        expect(screen.queryByText('PurchaseButton')).not.toBeInTheDocument();
        expect(screen.getByText('TradeParameters-minimized')).toBeInTheDocument();
    });

    it('should render closed market message (which self-gates on is_market_closed) when market is closed', () => {
        render(<TradeParametersContainer is_market_closed />);

        expect(screen.getByTestId('mock-closed-market-message')).toBeInTheDocument();
        expect(screen.queryByText('PurchaseButton')).not.toBeInTheDocument();
    });

    it('should render trade type tabs when the current trade type has them', () => {
        render(<TradeParametersContainer />);

        expect(screen.getByTestId('mock-trade-type-tabs')).toBeInTheDocument();
    });

    it('should not render trade type tabs when the current trade type has none', () => {
        mockIsTradeParamVisible.mockImplementation(() => false);
        render(<TradeParametersContainer />);

        expect(screen.queryByTestId('mock-trade-type-tabs')).not.toBeInTheDocument();
    });

    it('should drop to the screen edge when the chart is maximized', () => {
        mockUseStore.mockReturnValue({ ui: { is_chart_maximized: true } });
        render(<TradeParametersContainer />);

        expect(screen.getByTestId('trade-params-container')).toHaveClass('trade-params__container--chart-maximized');
    });
});
