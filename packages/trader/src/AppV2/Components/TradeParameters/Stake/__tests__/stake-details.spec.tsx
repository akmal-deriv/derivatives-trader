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

describe('StakeDetails multiplier info', () => {
    const renderStakeDetails = (props = {}, trade_overrides = {}) => {
        const store = mockStore({
            modules: { trade: { amount: 10, multiplier: 100, ...trade_overrides } },
        });
        return render(
            <TraderProviders store={store}>
                <ModulesProvider store={store}>
                    <StakeDetails {...base_props} {...props} />
                </ModulesProvider>
            </TraderProviders>
        );
    };

    it('opens the Stop out explanation (in-sheet page) when the Stop out label is tapped', async () => {
        const onOpenStopOut = jest.fn();
        renderStakeDetails({ onOpenStopOut, onOpenCommission: jest.fn() });

        await userEvent.click(screen.getByText('Stop out'));

        expect(onOpenStopOut).toHaveBeenCalledTimes(1);
    });

    it('opens the Commission explanation (in-sheet page) when the Commission label is tapped', async () => {
        const onOpenCommission = jest.fn();
        renderStakeDetails({ onOpenStopOut: jest.fn(), onOpenCommission });

        await userEvent.click(screen.getByText('Commission'));

        expect(onOpenCommission).toHaveBeenCalledTimes(1);
    });

    it('does not make Commission navigable when its formula cannot be derived', async () => {
        const onOpenCommission = jest.fn();
        renderStakeDetails({ onOpenStopOut: jest.fn(), onOpenCommission }, { amount: 0, multiplier: 0 });

        await userEvent.click(screen.getByText('Commission'));

        expect(onOpenCommission).not.toHaveBeenCalled();
    });
});
