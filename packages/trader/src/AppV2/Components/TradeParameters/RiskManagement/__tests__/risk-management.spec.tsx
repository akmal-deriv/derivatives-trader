import React from 'react';

import { isMobile } from '@deriv/shared';
import { mockStore } from '@deriv/stores';
import { render, screen } from '@testing-library/react';

import ModulesProvider from 'Stores/Providers/modules-providers';

import TraderProviders from '../../../../../trader-providers';
import RiskManagement from '../risk-management';

// `RiskManagement` dispatches on `isMobile()`; default to the desktop branch, which is what the
// suite below asserts on. Mobile has its own describe block at the bottom — the two branches keep
// separate copies of `getRiskManagementText`, so both need covering even though they now agree.
jest.mock('@deriv/shared', () => ({
    ...jest.requireActual('@deriv/shared'),
    isMobile: jest.fn(() => false),
}));

const risk_management = 'Risk management';

describe('RiskManagement', () => {
    let default_mock_store: ReturnType<typeof mockStore>;

    beforeEach(
        () =>
            (default_mock_store = mockStore({
                modules: {
                    trade: {
                        ...mockStore({}).modules.trade,
                        currency: 'USD',
                    },
                },
            }))
    );

    afterEach(() => jest.clearAllMocks());

    const mockRiskManagement = () =>
        render(
            <TraderProviders store={default_mock_store}>
                <ModulesProvider store={default_mock_store}>
                    <RiskManagement is_minimized />
                </ModulesProvider>
            </TraderProviders>
        );

    it('renders Risk Management trade param with correct value', () => {
        mockRiskManagement();

        expect(screen.getByText(risk_management)).toBeInTheDocument();
        expect(screen.getByRole('textbox')).toHaveValue('-');
    });

    it('renders Risk Management trade param with correct value for active DC', () => {
        default_mock_store.modules.trade.has_cancellation = true;
        default_mock_store.modules.trade.cancellation_duration = '30m';

        mockRiskManagement();

        expect(screen.getByText(risk_management)).toBeInTheDocument();
        expect(screen.getByRole('textbox')).toHaveValue('DC: 30 minutes');
    });

    it('renders Risk Management trade param with correct value for both active TP&SL', () => {
        default_mock_store.modules.trade.has_take_profit = true;
        default_mock_store.modules.trade.has_stop_loss = true;
        default_mock_store.modules.trade.take_profit = '5';
        default_mock_store.modules.trade.stop_loss = '1';

        mockRiskManagement();

        expect(screen.getByText(risk_management)).toBeInTheDocument();
        expect(screen.getByRole('textbox')).toHaveValue('TP: $5 / SL: $1');
    });

    it('renders Risk Management trade param with correct value for active TP', () => {
        default_mock_store.modules.trade.has_take_profit = true;
        default_mock_store.modules.trade.take_profit = '10';

        mockRiskManagement();

        expect(screen.getByText(risk_management)).toBeInTheDocument();
        expect(screen.getByRole('textbox')).toHaveValue('TP: $10');
    });

    it('renders Risk Management trade param with correct value for active SL', () => {
        default_mock_store.modules.trade.has_stop_loss = true;
        default_mock_store.modules.trade.stop_loss = '2';

        mockRiskManagement();

        expect(screen.getByText(risk_management)).toBeInTheDocument();
        expect(screen.getByRole('textbox')).toHaveValue('SL: $2');
    });

    it('disables trade param if is_market_closed === true', () => {
        default_mock_store.modules.trade.is_market_closed = true;
        mockRiskManagement();

        expect(screen.getByRole('textbox')).toBeDisabled();
    });

    // Both branches prefix the currency symbol (`TP: $5`) rather than suffixing the code
    // (`TP: 5 USD`), so a truncated field still leads with the amount. Asserted separately here
    // because mobile and desktop each build the string in their own component.
    describe('minimized mobile chip', () => {
        beforeEach(() => (isMobile as jest.Mock).mockReturnValue(true));

        it('prefixes the currency symbol for both active TP&SL', () => {
            default_mock_store.modules.trade.has_take_profit = true;
            default_mock_store.modules.trade.has_stop_loss = true;
            default_mock_store.modules.trade.take_profit = '5';
            default_mock_store.modules.trade.stop_loss = '1';

            mockRiskManagement();

            expect(screen.getByRole('textbox')).toHaveValue('TP: $5 / SL: $1');
        });

        it('prefixes the currency symbol for active TP only', () => {
            default_mock_store.modules.trade.has_take_profit = true;
            default_mock_store.modules.trade.take_profit = '10';

            mockRiskManagement();

            expect(screen.getByRole('textbox')).toHaveValue('TP: $10');
        });

        it('falls back to the currency code for a currency with no symbol', () => {
            default_mock_store.modules.trade.currency = 'USDC';
            default_mock_store.modules.trade.has_stop_loss = true;
            default_mock_store.modules.trade.stop_loss = '2';

            mockRiskManagement();

            expect(screen.getByRole('textbox')).toHaveValue('SL: USDC2');
        });

        it('leaves the deal-cancellation value alone (no currency in it)', () => {
            default_mock_store.modules.trade.has_cancellation = true;
            default_mock_store.modules.trade.cancellation_duration = '30m';

            mockRiskManagement();

            expect(screen.getByRole('textbox')).toHaveValue('DC: 30 minutes');
        });
    });
});
