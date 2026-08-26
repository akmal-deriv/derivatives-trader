import { mockStore } from '@deriv/stores';
import { TCoreStores } from '@deriv/stores/types';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useProposal } from 'AppV2/Hooks/useProposal';
import ModulesProvider from 'Stores/Providers/modules-providers';

import TraderProviders from '../../../../../trader-providers';
import BarrierInput from '../barrier-input';

jest.mock('AppV2/Hooks/useProposal', () => ({
    useProposal: jest.fn(() => ({ data: { proposal: {} }, error: null, isFetching: false })),
}));

describe('BarrierInput', () => {
    const onChange = jest.fn();
    const onClose = jest.fn();

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
        (useProposal as jest.Mock).mockReturnValue({ data: { proposal: {} }, error: null, isFetching: false });

        // Reset the default trade store
        default_trade_store.modules.trade.barrier_1 = '+10';
        default_trade_store.modules.trade.validation_errors.barrier_1 = [];
        default_trade_store.modules.trade.symbol = '1HZ100V';
        default_trade_store.modules.trade.contract_type = '';
    });

    // getSymbolBarrierSupport/getDefaultBarrierValue come from @deriv/stores' mockStore default,
    // which mirrors the real trade-store's non-API-backed fallback (support from the symbol's
    // market, default barrier from the hardcoded constants) since no contracts_for config is
    // loaded in this unit test.
    const default_trade_store = {
        modules: {
            trade: {
                ...mockStore({}).modules.trade,
                barrier_1: '+10',
                onChange,
                validation_errors: { barrier_1: [] },
                duration: 10,
                proposal_info: { CALL: { id: '123', message: 'test_message', has_error: true, spot: 12345 } },
                symbol: '1HZ100V', // Synthetic symbol to show the relative offset control
                tick_data: { quote: 1234.56 },
                barrier_choices: [],
                validation_params: {},
                active_symbols: [
                    {
                        underlying_symbol: '1HZ100V',
                        display_name: 'Volatility 100 (1s) Index',
                        market: 'synthetic_index',
                        underlying_symbol_type: 'synthetic_index',
                        exchange_is_open: 1,
                    },
                    {
                        underlying_symbol: 'EURUSD',
                        display_name: 'EUR/USD',
                        market: 'forex',
                        underlying_symbol_type: 'forex',
                        exchange_is_open: 1,
                    },
                ],
            },
        },
    };

    const mockBarrierInput = (mocked_store: TCoreStores, is_open?: boolean) => {
        render(
            <TraderProviders store={mocked_store}>
                <ModulesProvider store={mocked_store}>
                    <BarrierInput onClose={onClose} is_open={is_open} />
                </ModulesProvider>
            </TraderProviders>
        );
    };

    // The barrier input debounces its validation by 300ms and the header save stays disabled until the
    // draft has been validated, so tests must let that window close before committing.
    const settleValidation = () => new Promise(resolve => setTimeout(resolve, 400));

    it('renders BarrierInput component correctly with Above spot / Below spot options for a relative barrier', () => {
        mockBarrierInput(mockStore(default_trade_store));
        expect(screen.getAllByRole('tab')).toHaveLength(2);
        expect(screen.getByRole('tab', { name: 'Above spot' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Below spot' })).toBeInTheDocument();
        expect(screen.queryByText('Fixed barrier')).not.toBeInTheDocument();
        expect(screen.getByPlaceholderText('Distance to spot')).toBeInTheDocument();
        expect(screen.getByText('Current spot')).toBeInTheDocument();
    });

    it('disables the header save action on open (nothing changed yet)', () => {
        mockBarrierInput(mockStore(default_trade_store));
        expect(screen.getByRole('button', { name: /Save/i })).toBeDisabled();
    });

    it('shows the barrier description in the header info tooltip', () => {
        mockBarrierInput(mockStore(default_trade_store));
        fireEvent.mouseEnter(screen.getByRole('button', { name: 'Barrier' }));
        expect(screen.getByText('Above spot:')).toBeInTheDocument();
        expect(screen.getByText('Below spot:')).toBeInTheDocument();
        // A relative barrier is a signed offset from spot, so the description must not offer a
        // fixed price the sign selector does not let the user pick.
        expect(screen.queryByText('Fixed barrier:')).not.toBeInTheDocument();
    });

    it('describes the fixed barrier in the tooltip when the symbol uses absolute barriers', () => {
        default_trade_store.modules.trade.symbol = 'EURUSD';
        default_trade_store.modules.trade.barrier_1 = '1.0000';
        mockBarrierInput(mockStore(default_trade_store));

        fireEvent.mouseEnter(screen.getByRole('button', { name: 'Barrier' }));
        expect(screen.getByText('Fixed barrier:')).toBeInTheDocument();
        expect(screen.queryByText('Above spot:')).not.toBeInTheDocument();
    });

    it('describes the payout-derived barrier in the tooltip for Turbos', () => {
        default_trade_store.modules.trade.contract_type = 'turboslong';
        mockBarrierInput(mockStore(default_trade_store));

        fireEvent.mouseEnter(screen.getByRole('button', { name: 'Barrier' }));
        expect(screen.getByText(/corresponding price level based on the payout per point/)).toBeInTheDocument();
    });

    it('closes ActionSheet on tapping the header save action after a change', async () => {
        mockBarrierInput(mockStore(default_trade_store));
        const input = screen.getByPlaceholderText('Distance to spot');
        fireEvent.change(input, { target: { value: '25' } });
        await settleValidation();
        await userEvent.click(screen.getByRole('button', { name: /Save/i }));
        await waitFor(() => {
            expect(onClose).toBeCalledWith(true);
        });
    });

    it('does not enable the header save before the drafted barrier has been validated', async () => {
        // The check used to flash on between keystroke and request (the 300ms debounce) and off again
        // once the proposal started. It must stay off until the draft is actually committable.
        mockBarrierInput(mockStore(default_trade_store));
        const input = screen.getByPlaceholderText('Distance to spot');

        fireEvent.change(input, { target: { value: '25' } });
        expect(screen.getByRole('button', { name: /Save/i })).toBeDisabled();

        await settleValidation();
        expect(screen.getByRole('button', { name: /Save/i })).toBeEnabled();
    });

    it('initializes with the sign tab selected based on the barrier_1 value', () => {
        mockBarrierInput(mockStore(default_trade_store));
        expect(screen.getByRole('tab', { name: 'Above spot' })).toHaveAttribute('aria-selected', 'true');
    });

    it('toggling the sign does not call onChange until Save is pressed, and preserves magnitude', async () => {
        mockBarrierInput(mockStore(default_trade_store));

        await userEvent.click(screen.getByRole('tab', { name: 'Below spot' }));
        expect(onChange).not.toHaveBeenCalled();
        expect(screen.getByDisplayValue('10')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: /Save/i }));
        expect(onChange).toHaveBeenCalledWith({ target: { name: 'barrier_1', value: '-10' } });
    });

    it('handles input change correctly', async () => {
        mockBarrierInput(mockStore(default_trade_store));
        const input = screen.getByPlaceholderText('Distance to spot');

        // onChange should not be called during input change
        fireEvent.change(input, { target: { value: '20' } });
        expect(onChange).not.toHaveBeenCalled();

        await userEvent.click(screen.getByRole('tab', { name: 'Below spot' }));
        fireEvent.change(input, { target: { value: '15' } });
        expect(onChange).not.toHaveBeenCalled();

        // onChange should only be called when Save is clicked
        await settleValidation();
        await userEvent.click(screen.getByRole('button', { name: /Save/i }));
        expect(onChange).toHaveBeenCalledWith({ target: { name: 'barrier_1', value: '-15' } });
    });

    it('sets initial barrier value and sign correctly for a positive barrier', () => {
        mockBarrierInput(mockStore(default_trade_store));
        expect(screen.getByRole('tab', { name: 'Above spot' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    });

    it('sets initial barrier value and sign correctly for a negative barrier', () => {
        default_trade_store.modules.trade.barrier_1 = '-10';
        mockBarrierInput(mockStore(default_trade_store));
        expect(screen.getByRole('tab', { name: 'Below spot' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    });

    it('shows error when a validation error comes', async () => {
        default_trade_store.modules.trade.validation_errors.barrier_1 = ['Something went wrong'] as never;
        mockBarrierInput(mockStore(default_trade_store));

        // Clear the input to trigger validation error
        const input = screen.getByPlaceholderText('Distance to spot');
        await userEvent.clear(input);

        // Wait for debounced validation to trigger
        await waitFor(() => {
            expect(screen.getByText('Barrier is a required field.')).toBeInTheDocument();
        });
    });

    it('shows error when a validation error comes for an absolute (fixed price) barrier too', async () => {
        default_trade_store.modules.trade.validation_errors.barrier_1 = ['Something went wrong'] as never;
        default_trade_store.modules.trade.symbol = 'EURUSD';
        default_trade_store.modules.trade.barrier_1 = '1.0000';
        mockBarrierInput(mockStore(default_trade_store));

        // Clear the input to trigger validation error
        const input = screen.getByPlaceholderText('Price');
        await userEvent.clear(input);

        // Wait for debounced validation to trigger
        await waitFor(() => {
            expect(screen.getByText('Barrier is a required field.')).toBeInTheDocument();
        });
    });

    it('handles sign toggle correctly for "Below spot" when initial barrier is negative', async () => {
        default_trade_store.modules.trade.barrier_1 = '-10';
        mockBarrierInput(mockStore(default_trade_store));

        await userEvent.click(screen.getByRole('tab', { name: 'Above spot' }));

        // onChange should not be called during tab selection
        expect(onChange).not.toHaveBeenCalled();

        // onChange should only be called when Save is clicked
        await userEvent.click(screen.getByRole('button', { name: /Save/i }));
        expect(onChange).toHaveBeenCalledWith({ target: { name: 'barrier_1', value: '+10' } });
    });

    it('handles sign toggle correctly for "Above spot" when initial barrier is positive', async () => {
        default_trade_store.modules.trade.barrier_1 = '+0.6';
        mockBarrierInput(mockStore(default_trade_store));

        await userEvent.click(screen.getByRole('tab', { name: 'Below spot' }));

        // onChange should not be called during tab selection
        expect(onChange).not.toHaveBeenCalled();

        // onChange should only be called when Save is clicked
        await userEvent.click(screen.getByRole('button', { name: /Save/i }));
        expect(onChange).toHaveBeenCalledWith({ target: { name: 'barrier_1', value: '-0.6' } });
    });

    it('does not show a sign toggle for forex symbols (absolute barrier support)', () => {
        default_trade_store.modules.trade.symbol = 'EURUSD';
        default_trade_store.modules.trade.barrier_1 = '1.0000'; // Set a valid forex barrier
        mockBarrierInput(mockStore(default_trade_store));

        // No sign toggle should be visible for forex symbols
        expect(screen.queryByRole('tab')).not.toBeInTheDocument();
        expect(screen.queryByText('Above spot')).not.toBeInTheDocument();
        expect(screen.queryByText('Below spot')).not.toBeInTheDocument();

        // Should show price input directly
        expect(screen.getByPlaceholderText('Price')).toBeInTheDocument();
    });

    it('pre-populates from the hardcoded fallback default when the store has no barrier_1 and no API default is available', () => {
        default_trade_store.modules.trade.barrier_1 = '';
        mockBarrierInput(mockStore(default_trade_store));

        expect(onChange).toHaveBeenCalledWith({ target: { name: 'barrier_1', value: '+0.1' } });
    });

    it('shows current spot price', () => {
        mockBarrierInput(mockStore(default_trade_store));
        expect(screen.getByText('1234.56')).toBeInTheDocument();
    });

    // Tests for new API validation features
    describe('API Validation Features', () => {
        it('renders correctly when is_open prop is passed', () => {
            mockBarrierInput(mockStore(default_trade_store));
            // Component should render without errors
            expect(screen.getByText('Current spot')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Distance to spot')).toBeInTheDocument();
        });

        it('disables Save button when there is a client-side validation error', async () => {
            mockBarrierInput(mockStore(default_trade_store));
            const input = screen.getByPlaceholderText('Distance to spot');

            // Enter invalid value (zero)
            await userEvent.clear(input);
            await userEvent.type(input, '0');

            // Wait for debounced validation
            await waitFor(() => {
                expect(screen.getByText('Barrier cannot be zero.')).toBeInTheDocument();
            });

            // Save button should be disabled
            const saveButton = screen.getByRole('button', { name: /Save/i });
            expect(saveButton).toBeDisabled();
        });

        it('shows validation error for incomplete decimal values', async () => {
            mockBarrierInput(mockStore(default_trade_store));
            const input = screen.getByPlaceholderText('Distance to spot');

            // Enter incomplete decimal
            await userEvent.clear(input);
            await userEvent.type(input, '1.');

            // Wait for debounced validation
            await screen.findByText('Please enter a complete number.');
        });

        it('shows validation error for invalid number', async () => {
            mockBarrierInput(mockStore(default_trade_store));
            const input = screen.getByPlaceholderText('Distance to spot');

            // Enter invalid characters (should be filtered by regex, but test validation)
            await userEvent.clear(input);

            // Wait for debounced validation
            await waitFor(() => {
                expect(screen.getByText('Barrier is a required field.')).toBeInTheDocument();
            });
        });

        it('does not call onChange during typing, only on Save', async () => {
            mockBarrierInput(mockStore(default_trade_store));
            const input = screen.getByPlaceholderText('Distance to spot');

            // Type a new value
            await userEvent.clear(input);
            await userEvent.type(input, '25');

            // onChange should NOT be called during typing
            expect(onChange).not.toHaveBeenCalled();

            // Click Save
            await settleValidation();
            await userEvent.click(screen.getByRole('button', { name: /Save/i }));

            // onChange should be called only once on Save
            await waitFor(() => {
                expect(onChange).toHaveBeenCalledTimes(1);
                expect(onChange).toHaveBeenCalledWith({ target: { name: 'barrier_1', value: '+25' } });
            });
        });

        it('updates proposalRequestValues without updating store', async () => {
            mockBarrierInput(mockStore(default_trade_store));
            const input = screen.getByPlaceholderText('Distance to spot');

            // Type a new value
            await userEvent.clear(input);
            await userEvent.type(input, '15');

            // Wait for debounce
            await waitFor(
                () => {
                    // onChange should NOT be called (store not updated)
                    expect(onChange).not.toHaveBeenCalled();
                },
                { timeout: 500 }
            );

            // Value should be in local state but not in store
            expect(input).toHaveValue('15');
        });

        it('validates zero values correctly', async () => {
            mockBarrierInput(mockStore(default_trade_store));
            const input = screen.getByPlaceholderText('Distance to spot');

            // Enter zero
            await userEvent.clear(input);
            await userEvent.type(input, '0');

            // Wait for debounced validation
            await waitFor(() => {
                expect(screen.getByText('Barrier cannot be zero.')).toBeInTheDocument();
            });

            // Save button should be disabled
            const saveButton = screen.getByRole('button', { name: /Save/i });
            expect(saveButton).toBeDisabled();
        });

        it('does not call onChange during input changes', async () => {
            mockBarrierInput(mockStore(default_trade_store));
            const input = screen.getByPlaceholderText('Distance to spot');

            // Type a new value
            await userEvent.clear(input);
            await userEvent.type(input, '15');

            // onChange should NOT be called during typing
            expect(onChange).not.toHaveBeenCalled();

            // Value should be updated in local state
            expect(input).toHaveValue('15');
        });

        it('renders correctly with different barrier values', () => {
            // Test with negative barrier
            default_trade_store.modules.trade.barrier_1 = '-5';
            mockBarrierInput(mockStore(default_trade_store));

            // Component should render without errors
            expect(screen.getByText('Current spot')).toBeInTheDocument();
            const input = screen.getByPlaceholderText('Distance to spot');
            expect(input).toHaveValue('5');
        });

        it('validates input changes with debounce', async () => {
            mockBarrierInput(mockStore(default_trade_store));
            const input = screen.getByPlaceholderText('Distance to spot');

            // Type a valid value
            await userEvent.clear(input);
            await userEvent.type(input, '25');

            // Wait for debounced validation
            await waitFor(
                () => {
                    expect(input).toHaveValue('25');
                },
                { timeout: 500 }
            );

            // onChange should NOT be called (only on Save)
            expect(onChange).not.toHaveBeenCalled();

            // Save button should be enabled for valid input, once validation has settled
            await settleValidation();
            expect(screen.getByRole('button', { name: /Save/i })).toBeEnabled();
        });

        it('shows the API barrier rejection message', async () => {
            (useProposal as jest.Mock).mockReturnValue({
                data: null,
                error: { message: 'Barrier is not valid', details: { field: 'barrier' } },
                isFetching: false,
            });
            mockBarrierInput(mockStore(default_trade_store), true);

            expect(await screen.findByText('Barrier is not valid')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Save/i })).toBeDisabled();
        });

        it('states the accepted range when the barrier rejection carries code_args', async () => {
            (useProposal as jest.Mock).mockReturnValue({
                data: null,
                error: { subcode: 'BarrierOutOfRange', code_args: ['30.5', '45.2'], details: { field: 'barrier' } },
                isFetching: false,
            });
            mockBarrierInput(mockStore(default_trade_store), true);

            expect(await screen.findByText('Barrier must be between 30.5 and 45.2.')).toBeInTheDocument();
        });

        it('ignores a proposal error raised against a field other than the barrier', () => {
            (useProposal as jest.Mock).mockReturnValue({
                data: null,
                error: { message: 'Stake is not valid', details: { field: 'amount' } },
                isFetching: false,
            });
            mockBarrierInput(mockStore(default_trade_store), true);

            expect(screen.queryByText('Stake is not valid')).not.toBeInTheDocument();
        });

        it('disables Save while the proposal is still validating the drafted barrier', () => {
            (useProposal as jest.Mock).mockReturnValue({ data: null, error: null, isFetching: true });
            mockBarrierInput(mockStore(default_trade_store), true);

            const input = screen.getByPlaceholderText('Distance to spot');
            fireEvent.change(input, { target: { value: '25' } });

            expect(screen.getByRole('button', { name: /Save/i })).toBeDisabled();
        });
    });
});
