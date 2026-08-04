import React from 'react';

import { mockStore } from '@deriv/stores';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import * as positionsUtils from 'AppV2/Utils/positions-utils';
import ModulesProvider from 'Stores/Providers/modules-providers';

import TraderProviders from '../../../../trader-providers';
import ChartProfitLoss from '../chart-profit-loss';

jest.mock('@deriv-com/ui', () => ({
    ...jest.requireActual('@deriv-com/ui'),
    useDevice: jest.fn(() => ({ isMobile: true })),
}));

jest.mock('AppV2/Utils/positions-utils', () => ({
    ...jest.requireActual('AppV2/Utils/positions-utils'),
    filterPositionsBySymbolAndTradeType: jest.fn(),
    getTotalPositionsProfit: jest.fn(),
}));

// Lightweight stubs so we only assert the orchestrator's wiring (count/total, open/close).
jest.mock('../profit-loss-pill', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const MockProfitLossPill = ({ count, totalProfit, onClick }: any) => (
        <button data-testid='pill' onClick={onClick}>{`count:${count} total:${totalProfit}`}</button>
    );
    return MockProfitLossPill;
});
jest.mock('../open-positions-sheet', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const MockOpenPositionsSheet = ({ isOpen, positions }: any) =>
        isOpen ? <div data-testid='sheet'>{`rows:${positions.length}`}</div> : null;
    return MockOpenPositionsSheet;
});

const mockFilter = positionsUtils.filterPositionsBySymbolAndTradeType as jest.Mock;
const mockTotal = positionsUtils.getTotalPositionsProfit as jest.Mock;

const renderComponent = (store = mockStore({})) =>
    render(
        <TraderProviders store={store}>
            <ModulesProvider store={store}>
                <ChartProfitLoss />
            </ModulesProvider>
        </TraderProviders>
    );

describe('ChartProfitLoss', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockTotal.mockReturnValue(0);
        mockFilter.mockReturnValue([]);
    });

    it('renders nothing when there are no running contracts for the market/trade type', () => {
        renderComponent();
        expect(screen.queryByTestId('pill')).not.toBeInTheDocument();
    });

    it('renders the pill with the count and combined P/L when contracts exist', () => {
        mockFilter.mockReturnValue([{ contract_info: { contract_id: 1 } }, { contract_info: { contract_id: 2 } }]);
        mockTotal.mockReturnValue(1.15);
        renderComponent();
        expect(screen.getByTestId('pill')).toHaveTextContent('count:2 total:1.15');
    });

    it('opens the open-positions sheet when the pill is tapped', async () => {
        mockFilter.mockReturnValue([{ contract_info: { contract_id: 1 } }]);
        mockTotal.mockReturnValue(1.15);
        renderComponent();

        expect(screen.queryByTestId('sheet')).not.toBeInTheDocument();
        await userEvent.click(screen.getByTestId('pill'));
        expect(screen.getByTestId('sheet')).toHaveTextContent('rows:1');
    });

    it('never renders for the Accumulators trade type', () => {
        mockFilter.mockReturnValue([{ contract_info: { contract_id: 1 } }]);
        mockTotal.mockReturnValue(1.15);
        const store = mockStore({
            modules: { trade: { ...mockStore({}).modules.trade, contract_type: 'accumulator' } },
        });
        renderComponent(store);
        expect(screen.queryByTestId('pill')).not.toBeInTheDocument();
    });
});
