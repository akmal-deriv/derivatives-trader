import { CONTRACT_TYPES, TRADE_TYPES } from '@deriv/shared';
import { mockStore } from '@deriv/stores';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ModulesProvider from 'Stores/Providers/modules-providers';

import TraderProviders from '../../../../../trader-providers';
import Stake from '../stake';
import StakeInput from '../stake-input';
import StakeInputDesktop from '../stake-input-desktop';

const stake_param_label = 'Stake';

jest.mock('AppV2/Hooks/useContractsFor', () => ({
    __esModule: true,
    default: jest.fn(() => ({
        available_contract_types: {
            vanillalongcall: {
                title: 'Call/Put',
                trade_types: ['VANILLALONGCALL'],
                basis: ['stake'],
                components: ['duration', 'strike', 'amount', 'trade_type_tabs'],
                barrier_count: 1,
                config: {
                    barrier_category: 'euro_non_atm',
                    default_stake: 10,
                },
            },
        },
    })),
}));

jest.mock('@deriv/shared', () => ({
    ...jest.requireActual('@deriv/shared'),
    isMobile: jest.fn(() => false), // Default to desktop mode
    WS: {
        send: jest.fn(),
        authorized: {
            send: jest.fn(),
        },
    },
}));

// Create stable mock data outside the mock function to prevent infinite loops
const mockProposalData = {
    proposal: {},
};

jest.mock('AppV2/Hooks/useProposal', () => ({
    useProposal: jest.fn(() => ({
        data: mockProposalData,
        error: null,
        isFetching: false,
    })),
}));

describe('Stake', () => {
    let default_mock_store: ReturnType<typeof mockStore>;

    beforeEach(() => {
        default_mock_store = mockStore({
            modules: {
                trade: {
                    ...mockStore({}).modules.trade,
                    amount: 10,
                    basis: 'stake',
                    contract_type: TRADE_TYPES.RISE_FALL,
                    currency: 'USD',
                    proposal_info: {
                        [CONTRACT_TYPES.CALL]: {
                            has_error: false,
                            message:
                                'Win payout if Volatility 100 (1s) Index is strictly higher than entry spot at 5 minutes after contract start time.',
                            payout: 19.55,
                        },
                        [CONTRACT_TYPES.PUT]: {
                            has_error: false,
                            message:
                                'Win payout if Volatility 100 (1s) Index is strictly lower than entry spot at 5 minutes after contract start time.',
                            payout: 19.51,
                        },
                    },
                    trade_types: {
                        [CONTRACT_TYPES.CALL]: 'Higher',
                        [CONTRACT_TYPES.PUT]: 'Lower',
                    },
                    trade_type_tab: 'CALL',
                    validation_params: {
                        [CONTRACT_TYPES.CALL]: { stake: { max: '50000.00', min: '0.35' } },
                        [CONTRACT_TYPES.PUT]: { stake: { max: '50000.00', min: '0.35' } },
                    },
                },
            },
        });
        // Override is_mobile for desktop tests
        default_mock_store.ui.is_mobile = false;
    });

    const MockedStake = ({ store = default_mock_store }: { store?: ReturnType<typeof mockStore> }) => (
        <TraderProviders store={store}>
            <ModulesProvider store={store}>
                <Stake is_minimized />
            </ModulesProvider>
        </TraderProviders>
    );

    it('renders trade param with "Stake" label and input with a value equal to the current stake amount value', () => {
        render(<MockedStake />);
        const { amount, currency } = default_mock_store.modules.trade;
        expect(screen.getByText(stake_param_label)).toBeInTheDocument();
        expect(screen.getByRole('textbox')).toHaveValue(`${amount} ${currency}`);
    });

    it('opens popover with chips if user clicks on "Stake" trade param (desktop)', async () => {
        render(<MockedStake />);

        await userEvent.click(screen.getByText(stake_param_label));

        // Desktop uses popover with value chips, not ActionSheet
        expect(screen.getByLabelText('Select value 10 USD')).toBeInTheDocument();
        // Desktop popover doesn't show payout details in the same way as mobile
    });

    it('calls onChange if user clicks on a chip value (desktop)', async () => {
        render(<MockedStake />);

        await userEvent.click(screen.getByText(stake_param_label));

        // Desktop uses chips - click on a different value
        await userEvent.click(screen.getByLabelText('Select value 20 USD'));

        expect(default_mock_store.modules.trade.onChange).toHaveBeenCalledWith({
            target: { name: 'amount', value: 20 },
        });
    });

    it('does not render payout details for Accumulators', async () => {
        default_mock_store.modules.trade.is_accumulator = true;
        render(<MockedStake />);
        await userEvent.click(screen.getByText(stake_param_label));
        expect(screen.queryByText(/payout/i)).not.toBeInTheDocument();
    });

    it('does not render payout details for Turbos', async () => {
        default_mock_store.modules.trade.is_turbos = true;
        render(<MockedStake />);
        await userEvent.click(screen.getByText(stake_param_label));
        expect(screen.queryByText(/payout/i)).not.toBeInTheDocument();
    });

    it('does not render payout details for Vanillas', async () => {
        default_mock_store.modules.trade.is_vanilla = true;
        render(<MockedStake />);
        await userEvent.click(screen.getByText(stake_param_label));
        expect(screen.queryByText(/payout/i)).not.toBeInTheDocument();
    });

    it('opens popover for Multipliers (desktop)', async () => {
        const multiplier_store = mockStore({
            modules: {
                trade: {
                    ...mockStore({}).modules.trade,
                    amount: 10,
                    basis: 'stake',
                    commission: 0.36,
                    contract_type: TRADE_TYPES.MULTIPLIER,
                    currency: 'USD',
                    is_multiplier: true,
                    proposal_info: {
                        [CONTRACT_TYPES.MULTIPLIER.UP]: {
                            has_error: false,
                            message:
                                "If you select 'Up', your total profit/loss will be the percentage increase in Volatility 100 (1s) Index, multiplied by 1000, minus commissions.",
                            payout: 0,
                        },
                        [CONTRACT_TYPES.MULTIPLIER.DOWN]: {
                            has_error: false,
                            message:
                                "If you select 'Down', your total profit/loss will be the percentage decrease in Volatility 100 (1s) Index, multiplied by 1000, minus commissions.",
                            payout: 0,
                        },
                    },
                    stop_out: -10,
                    trade_types: {
                        [CONTRACT_TYPES.MULTIPLIER.UP]: 'Multiply Up',
                        [CONTRACT_TYPES.MULTIPLIER.DOWN]: 'Multiply Down',
                    },
                    validation_params: {
                        [CONTRACT_TYPES.MULTIPLIER.UP]: {
                            stake: {
                                max: '2000.00',
                                min: '1.00',
                            },
                        },
                        [CONTRACT_TYPES.MULTIPLIER.DOWN]: {
                            stake: {
                                max: '2000.00',
                                min: '1.00',
                            },
                        },
                    },
                },
            },
        });
        multiplier_store.ui.is_mobile = false;

        render(<MockedStake store={multiplier_store} />);

        await userEvent.click(screen.getByText(stake_param_label));
        // Desktop popover should open with chips
        expect(screen.getByLabelText('Select value 10 USD')).toBeInTheDocument();
    });

    it('shows error in case of a validation error (desktop)', async () => {
        default_mock_store.modules.trade.contract_type = TRADE_TYPES.HIGH_LOW;
        default_mock_store.modules.trade.trade_type_tab = 'CALL';
        default_mock_store.modules.trade.validation_params = {
            CALL: { stake: { max: '50000.00', min: '0.35' } },
        };

        render(<MockedStake />);

        await userEvent.click(screen.getByText(stake_param_label));

        // Desktop popover should show chips - verify popover is open
        expect(screen.getByLabelText('Select value 10 USD')).toBeInTheDocument();
    });

    it('disables trade param if is_market_closed == true', () => {
        default_mock_store.modules.trade.is_market_closed = true;
        render(<MockedStake />);

        expect(screen.getByRole('textbox')).toBeDisabled();
    });
});

describe('StakeInput', () => {
    let default_mock_store: ReturnType<typeof mockStore>;

    beforeEach(() => {
        default_mock_store = mockStore({
            modules: {
                trade: {
                    ...mockStore({}).modules.trade,
                    amount: 10,
                    basis: 'stake',
                    contract_type: TRADE_TYPES.RISE_FALL,
                    currency: 'USD',
                    trade_types: {
                        [CONTRACT_TYPES.CALL]: 'Higher',
                        [CONTRACT_TYPES.PUT]: 'Lower',
                    },
                    trade_type_tab: 'CALL',
                    validation_params: {
                        [CONTRACT_TYPES.CALL]: { stake: { max: '50000.00', min: '0.35' } },
                        [CONTRACT_TYPES.PUT]: { stake: { max: '50000.00', min: '0.35' } },
                    },
                },
            },
        });
    });

    const renderStakeInput = (store = default_mock_store) =>
        render(
            <TraderProviders store={store}>
                <ModulesProvider store={store}>
                    <StakeInput onClose={jest.fn()} is_open />
                </ModulesProvider>
            </TraderProviders>
        );

    it('does not increment stake when typing a digit that would exceed max decimal places', async () => {
        default_mock_store.modules.trade.amount = 5.34;
        const user = userEvent.setup();
        renderStakeInput();

        const stake_input = screen.getByDisplayValue('5.34');

        // Cursor is at the end of '5.34' (position 4).
        // For USD (decimals=2), adding a 3rd decimal digit must be blocked
        // so TextFieldWithSteppers cannot round it (e.g. 5.345 -> 5.35).
        await user.type(stake_input, '5');
        expect(stake_input).toHaveValue('5.34');

        // Confirm it stays blocked on repeated presses
        await user.type(stake_input, '5');
        expect(stake_input).toHaveValue('5.34');
    });

    it('does not corrupt stake when cursor is repositioned within the decimal portion', async () => {
        default_mock_store.modules.trade.amount = 5.34;
        const user = userEvent.setup();
        renderStakeInput();

        const stake_input = screen.getByDisplayValue('5.34') as HTMLInputElement;

        // Place cursor between '3' and '4' (position 3) and type '5'.
        // Without the fix: 5.354 -> toFixed(2) -> 5.35 (wrong).
        // With the fix: insertion is blocked, value stays 5.34.
        stake_input.setSelectionRange(3, 3);
        await user.type(stake_input, '5');
        expect(stake_input).toHaveValue('5.34');
    });

    it('allows typing a digit when still within max decimal places', async () => {
        default_mock_store.modules.trade.amount = 5.3; // only 1 decimal digit used
        const user = userEvent.setup();
        renderStakeInput();

        const stake_input = screen.getByDisplayValue('5.3');

        // Typing '4' appends a second decimal digit — this must NOT be blocked
        await user.type(stake_input, '4');
        expect(stake_input).toHaveValue('5.34');
    });

    it('renders the stake range and all preset chips valid for the contract limits', () => {
        renderStakeInput();

        expect(screen.getByText('Range 0.35 - 50,000.00 USD')).toBeInTheDocument();
        [1, 5, 10, 20, 50, 100].forEach(value =>
            expect(screen.getByRole('button', { name: `Select value ${value} USD` })).toBeInTheDocument()
        );
    });

    it('does not render preset chips below the market minimum', () => {
        default_mock_store.modules.trade.validation_params = {
            [CONTRACT_TYPES.CALL]: { stake: { max: '50000.00', min: '5.00' } },
            [CONTRACT_TYPES.PUT]: { stake: { max: '50000.00', min: '5.00' } },
        };
        renderStakeInput();

        expect(screen.queryByRole('button', { name: 'Select value 1 USD' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Select value 5 USD' })).toBeInTheDocument();
    });

    it('fills the input without committing when a preset is tapped', async () => {
        const user = userEvent.setup();
        renderStakeInput();

        await user.click(screen.getByRole('button', { name: 'Select value 20 USD' }));

        expect(screen.getByDisplayValue('20')).toBeInTheDocument();
        expect(default_mock_store.modules.trade.onChange).not.toHaveBeenCalled();
    });

    it('publishes the tapped preset as the committed amount to the header save handler', async () => {
        const onClose = jest.fn();
        const registerHeaderActions = jest.fn();
        const user = userEvent.setup();
        render(
            <TraderProviders store={default_mock_store}>
                <ModulesProvider store={default_mock_store}>
                    <StakeInput onClose={onClose} is_open registerHeaderActions={registerHeaderActions} />
                </ModulesProvider>
            </TraderProviders>
        );

        await user.click(screen.getByRole('button', { name: 'Select value 20 USD' }));

        // The header host (stake-mobile) drives Save; the input publishes the commit handler + gate.
        const { onSave, is_save_disabled } = registerHeaderActions.mock.calls.at(-1)[0];
        expect(is_save_disabled).toBe(false);

        onSave();

        expect(default_mock_store.modules.trade.onChange).toHaveBeenCalledWith({
            target: { name: 'amount', value: '20' },
        });
        expect(onClose).toHaveBeenCalled();
    });

    it('reports the save action disabled while the input is empty', async () => {
        const registerHeaderActions = jest.fn();
        const user = userEvent.setup();
        render(
            <TraderProviders store={default_mock_store}>
                <ModulesProvider store={default_mock_store}>
                    <StakeInput onClose={jest.fn()} is_open registerHeaderActions={registerHeaderActions} />
                </ModulesProvider>
            </TraderProviders>
        );

        await user.clear(screen.getByDisplayValue('10'));

        expect(registerHeaderActions.mock.calls.at(-1)[0].is_save_disabled).toBe(true);
    });
});

describe('StakeInputDesktop', () => {
    let default_mock_store: ReturnType<typeof mockStore>;

    beforeEach(() => {
        default_mock_store = mockStore({
            modules: {
                trade: {
                    ...mockStore({}).modules.trade,
                    amount: 10,
                    basis: 'stake',
                    contract_type: TRADE_TYPES.RISE_FALL,
                    currency: 'USD',
                    trade_types: {
                        [CONTRACT_TYPES.CALL]: 'Higher',
                        [CONTRACT_TYPES.PUT]: 'Lower',
                    },
                    trade_type_tab: 'CALL',
                    validation_params: {
                        [CONTRACT_TYPES.CALL]: { stake: { max: '50000.00', min: '0.35' } },
                        [CONTRACT_TYPES.PUT]: { stake: { max: '50000.00', min: '0.35' } },
                    },
                },
            },
        });
    });

    const renderStakeInputDesktop = (store = default_mock_store) =>
        render(
            <TraderProviders store={store}>
                <ModulesProvider store={store}>
                    <StakeInputDesktop onClose={jest.fn()} is_open />
                </ModulesProvider>
            </TraderProviders>
        );

    it('does not increment stake when typing a digit that would exceed max decimal places', async () => {
        default_mock_store.modules.trade.amount = 5.34;
        const user = userEvent.setup();
        renderStakeInputDesktop();

        const stake_input = screen.getByDisplayValue('5.34');

        // Cursor is at the end of '5.34' (position 4).
        // For USD (decimals=2), adding a 3rd decimal digit must be blocked
        // so TextField cannot round it (e.g. 5.345 -> 5.35).
        await user.type(stake_input, '5');
        expect(stake_input).toHaveValue('5.34');

        // Confirm it stays blocked on repeated presses
        await user.type(stake_input, '5');
        expect(stake_input).toHaveValue('5.34');
    });

    it('does not corrupt stake when cursor is repositioned within the decimal portion', async () => {
        default_mock_store.modules.trade.amount = 5.34;
        const user = userEvent.setup();
        renderStakeInputDesktop();

        const stake_input = screen.getByDisplayValue('5.34') as HTMLInputElement;

        // Place cursor between '3' and '4' (position 3) and type '5'.
        // Without the fix: 5.354 -> toFixed(2) -> 5.35 (wrong).
        // With the fix: insertion is blocked, value stays 5.34.
        stake_input.setSelectionRange(3, 3);
        await user.type(stake_input, '5');
        expect(stake_input).toHaveValue('5.34');
    });

    it('allows typing a digit when still within max decimal places', async () => {
        default_mock_store.modules.trade.amount = 5.3; // only 1 decimal digit used
        const user = userEvent.setup();
        renderStakeInputDesktop();

        const stake_input = screen.getByDisplayValue('5.3');

        // Typing '4' appends a second decimal digit — this must NOT be blocked
        await user.type(stake_input, '4');
        expect(stake_input).toHaveValue('5.34');
    });
});

describe('Stake - Mobile header actions', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useProposal } = require('AppV2/Hooks/useProposal');
    let default_mock_store: ReturnType<typeof mockStore>;

    beforeEach(() => {
        useProposal.mockReturnValue({ data: mockProposalData, error: null, isFetching: false });
        default_mock_store = mockStore({
            modules: {
                trade: {
                    ...mockStore({}).modules.trade,
                    amount: 10,
                    basis: 'stake',
                    contract_type: TRADE_TYPES.RISE_FALL,
                    currency: 'USD',
                    trade_types: {
                        [CONTRACT_TYPES.CALL]: 'Higher',
                        [CONTRACT_TYPES.PUT]: 'Lower',
                    },
                    trade_type_tab: 'CALL',
                    validation_params: {
                        [CONTRACT_TYPES.CALL]: { stake: { max: '50000.00', min: '0.35' } },
                        [CONTRACT_TYPES.PUT]: { stake: { max: '50000.00', min: '0.35' } },
                    },
                },
            },
        });
        default_mock_store.ui.is_mobile = true;
        // `Stake` picks the mobile/desktop variant from `modules.trade.root_store.ui.is_mobile`;
        // mockStore doesn't wire `root_store`, so point it back at the root to mount `StakeMobile`.
        default_mock_store.modules.trade.root_store = default_mock_store;
    });

    afterEach(() => {
        useProposal.mockReturnValue({ data: mockProposalData, error: null, isFetching: false });
    });

    const renderMobileStake = (store = default_mock_store) =>
        render(
            <TraderProviders store={store}>
                <ModulesProvider store={store}>
                    <Stake is_minimized />
                </ModulesProvider>
            </TraderProviders>
        );

    const openSheet = async (user: ReturnType<typeof userEvent.setup>) => {
        // The mobile field's onClick lives on the input, so click the value, not the <label> text.
        await user.click(screen.getByDisplayValue('10 USD'));
    };

    it('disables the header save action when the sheet opens (unchanged value)', async () => {
        const user = userEvent.setup();
        renderMobileStake();

        await openSheet(user);

        expect(screen.getByRole('button', { name: /Save/i })).toBeDisabled();
    });

    it('enables the header save action after the stake is changed', async () => {
        const user = userEvent.setup();
        renderMobileStake();

        await openSheet(user);
        await user.click(screen.getByRole('button', { name: 'Select value 20 USD' }));

        expect(screen.getByRole('button', { name: /Save/i })).toBeEnabled();
    });

    it('commits the changed stake to the store when the header save is tapped', async () => {
        const user = userEvent.setup();
        renderMobileStake();

        await openSheet(user);
        await user.click(screen.getByRole('button', { name: 'Select value 20 USD' }));
        await user.click(screen.getByRole('button', { name: /Save/i }));

        expect(default_mock_store.modules.trade.onChange).toHaveBeenCalledWith({
            target: { name: 'amount', value: '20' },
        });
    });

    it('does not commit when the sheet is dismissed via the overlay', async () => {
        const user = userEvent.setup();
        renderMobileStake();

        await openSheet(user);
        await user.click(screen.getByRole('button', { name: 'Select value 20 USD' }));
        await user.click(screen.getByTestId('dt-actionsheet-overlay'));

        expect(default_mock_store.modules.trade.onChange).not.toHaveBeenCalled();
    });

    it('re-enables the header save once an invalid draft is corrected back to a valid dirty value', async () => {
        // `25.` -> backspace -> `25` hits the "same value as the last proposal" shortcut, which must
        // still clear the FE error: the draft is valid and still differs from the committed 10.
        const user = userEvent.setup();
        renderMobileStake();
        await openSheet(user);

        // The proposal is debounced by 300ms; settle between steps so a pending timer from an earlier
        // keystroke can't clear the error and mask what is being tested.
        const settle = () => new Promise(resolve => setTimeout(resolve, 400));
        const save = () => screen.getByRole('button', { name: /Save/i });

        const input = screen.getByTestId('dt_stake_input');
        await user.clear(input);
        await user.type(input, '25');
        await settle();
        await waitFor(() => expect(save()).toBeEnabled());

        await user.type(input, '.');
        await settle();
        expect(screen.getByText('Should be a valid number.')).toBeInTheDocument();
        expect(save()).toBeDisabled();

        await user.type(input, '{backspace}');
        await settle();
        expect(screen.queryByText('Should be a valid number.')).not.toBeInTheDocument();
        expect(save()).toBeEnabled();
    });

    it('re-enables the header save after a rejected amount is corrected to a valid dirty one', async () => {
        // The other half of the contract: an API stake error must clear once a new amount validates,
        // so a corrected-but-still-dirty draft can be committed. Reject only `0`.
        useProposal.mockImplementation(
            ({ proposal_request_values }: { proposal_request_values?: { amount?: unknown } } = {}) =>
                Number(proposal_request_values?.amount) === 0
                    ? {
                          data: undefined,
                          error: { message: 'Should be a valid number.', details: { field: 'stake' } },
                          isFetching: false,
                      }
                    : { data: mockProposalData, error: null, isFetching: false }
        );
        const settle = () => new Promise(resolve => setTimeout(resolve, 400));
        const save = () => screen.getByRole('button', { name: /Save/i });
        const user = userEvent.setup();
        renderMobileStake();
        await openSheet(user);

        const input = screen.getByTestId('dt_stake_input');
        await user.clear(input);
        await user.type(input, '0');
        await settle();
        expect(save()).toBeDisabled();

        await user.clear(input);
        await user.type(input, '25');
        await settle();
        await waitFor(() => expect(save()).toBeEnabled());
    });

    it('clears the trailing-separator error even when the draft returns to the committed amount', async () => {
        // `10.` -> backspace -> `10` equals the committed stake, so save stays off on the dirty check
        // — but the FE error must not survive the correction.
        const settle = () => new Promise(resolve => setTimeout(resolve, 400));
        const user = userEvent.setup();
        renderMobileStake();
        await openSheet(user);

        const input = screen.getByTestId('dt_stake_input');
        await user.type(input, '.');
        await settle();
        expect(screen.getByText('Should be a valid number.')).toBeInTheDocument();

        await user.type(input, '{backspace}');
        await settle();
        expect(screen.queryByText('Should be a valid number.')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Save/i })).toBeDisabled();
    });

    it('does not enable the header save before the typed amount has been validated', async () => {
        // The check used to flash on between keystroke and request (the 300ms debounce), and again
        // between the two Rise/Fall proposals. It must stay off until the draft is actually committable.
        const settle = () => new Promise(resolve => setTimeout(resolve, 400));
        const save = () => screen.getByRole('button', { name: /Save/i });
        const user = userEvent.setup();
        renderMobileStake();
        await openSheet(user);

        const input = screen.getByTestId('dt_stake_input');
        await user.clear(input);
        await user.type(input, '4');
        // Still inside the debounce window: valid and dirty, but not yet validated.
        expect(save()).toBeDisabled();

        await settle();
        await waitFor(() => expect(save()).toBeEnabled());
    });

    it('keeps the header save disabled while a stake validation error is shown', async () => {
        // A rejected proposal (field: stake) surfaces a stake_error, which must keep save disabled.
        // Return a fresh error object per requested amount so the value change re-triggers the
        // proposal error effect — a single static reference never re-fires after `RESET_ERRORS`,
        // whereas a real backend returns a new error for the new amount.
        const error_by_amount = new Map<string, unknown>();
        useProposal.mockImplementation(
            ({ proposal_request_values }: { proposal_request_values?: { amount?: unknown } } = {}) => {
                const key = String(proposal_request_values?.amount ?? '');
                if (!error_by_amount.has(key)) {
                    error_by_amount.set(key, {
                        data: undefined,
                        error: {
                            message: 'Please enter a stake amount that is at least 0.35.',
                            details: { field: 'stake' },
                        },
                        isFetching: false,
                    });
                }
                return error_by_amount.get(key);
            }
        );
        const user = userEvent.setup();
        renderMobileStake();

        await openSheet(user);
        await user.click(screen.getByRole('button', { name: 'Select value 20 USD' }));

        expect(screen.getByRole('button', { name: /Save/i })).toBeDisabled();
    });
});
