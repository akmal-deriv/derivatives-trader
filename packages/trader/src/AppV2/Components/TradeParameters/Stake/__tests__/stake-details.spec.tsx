import { mockStore } from '@deriv/stores';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ModulesProvider from 'Stores/Providers/modules-providers';

import TraderProviders from '../../../../../trader-providers';
import StakeDetails from '../stake-details';

jest.mock('@deriv-com/ui', () => ({
    ...jest.requireActual('@deriv-com/ui'),
    useDevice: jest.fn(() => ({ isDesktop: false })),
}));

const base_props = {
    contract_type: 'multiplier',
    contract_types: ['MULTUP'],
    currency: 'USD',
    has_stop_loss: false,
    is_loading_proposal: false,
    is_multiplier: true,
    is_empty: false,
    should_show_payout_details: false,
    details: {
        commission: 0.5,
        first_contract_payout: 0,
        max_payout: '',
        max_stake: '',
        min_stake: '',
        second_contract_payout: 0,
        stop_out: -10,
    },
};

describe('StakeDetails commission tooltip', () => {
    const renderStakeDetails = (trade_overrides = {}) => {
        const store = mockStore({
            modules: { trade: { amount: 10, multiplier: 100, ...trade_overrides } },
        });
        return render(
            <TraderProviders store={store}>
                <ModulesProvider store={store}>
                    <StakeDetails {...base_props} />
                </ModulesProvider>
            </TraderProviders>
        );
    };

    it('reveals the commission formula when the Commission label is tapped', async () => {
        renderStakeDetails();

        expect(screen.getByText('Commission')).toBeInTheDocument();
        expect(screen.queryByTestId('dt_commission_formula')).not.toBeInTheDocument();

        await userEvent.click(screen.getByText('Commission'));

        // commission_percentage = (0.5 * 100) / (100 * 10) = 0.0500
        expect(screen.getByTestId('dt_commission_formula')).toBeInTheDocument();
        expect(screen.getByText('0.0500%')).toBeInTheDocument();
    });

    it('does not reveal a formula when stake/multiplier are unavailable', async () => {
        renderStakeDetails({ amount: 0, multiplier: 0 });

        await userEvent.click(screen.getByText('Commission'));

        expect(screen.queryByTestId('dt_commission_formula')).not.toBeInTheDocument();
    });
});
