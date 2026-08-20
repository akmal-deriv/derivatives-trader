import React from 'react';

import { mockStore } from '@deriv/stores';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Import the hook mock to manipulate it in tests
import useIsVirtualKeyboardOpen from 'AppV2/Hooks/useIsVirtualKeyboardOpen';
import ModulesProvider from 'Stores/Providers/modules-providers';

import TraderProviders from '../../../../../trader-providers';
import TakeProfitAndStopLossContainer from '../take-profit-and-stop-loss-container';

jest.mock('@deriv/shared', () => ({
    ...jest.requireActual('@deriv/shared'),
    WS: {
        forget: jest.fn(),
        send: jest.fn(),
        authorized: {
            send: jest.fn(),
        },
    },
}));

jest.mock('AppV2/Hooks/useProposal', () => ({
    useProposal: jest.fn(() => ({
        data: {
            proposal: {},
        },
        error: null,
        isFetching: false,
    })),
}));

jest.mock('AppV2/Hooks/useIsVirtualKeyboardOpen', () => ({
    __esModule: true,
    default: jest.fn(() => ({ is_key_board_visible: false })),
}));

describe('TakeProfitAndStopLossContainer', () => {
    let default_mock_store: ReturnType<typeof mockStore>;

    beforeEach(() => {
        default_mock_store = mockStore({
            modules: {
                trade: {
                    ...mockStore({}).modules.trade,
                    currency: 'USD',
                    validation_params: {
                        TURBOSLONG: { take_profit: { min: '0.1', max: '100' }, stop_loss: { min: '0.1', max: '10' } },
                    },
                    validation_errors: {},
                    contract_type: 'turboslong',
                    trade_types: { TURBOSLONG: 'Turbos Long' },
                    trade_type_tab: 'TURBOSLONG',
                },
            },
        });
        Element.prototype.scrollIntoView = jest.fn();
    });

    afterEach(() => jest.clearAllMocks());

    // The container no longer renders its own Save button; it lifts the commit handler + dirty gate
    // to the header owner (the picker) via `onActionsChange`. This harness stands in for that owner,
    // rendering the same Save action wired to the reported handler so the behaviour stays covered.
    const HeaderActionsHarness = () => {
        const [actions, setActions] = React.useState<{ onSave: () => void; is_save_disabled: boolean }>();
        return (
            <React.Fragment>
                <TakeProfitAndStopLossContainer closeActionSheet={jest.fn()} onActionsChange={setActions} />
                <button onClick={() => actions?.onSave()}>Save</button>
            </React.Fragment>
        );
    };

    const mockTakeProfitAndStopLossContainer = () =>
        render(
            <TraderProviders store={default_mock_store}>
                <ModulesProvider store={default_mock_store}>
                    <HeaderActionsHarness />
                </ModulesProvider>
            </TraderProviders>
        );

    // Unlike the harness above, this one reflects the reported gate on the Save button so the enabled
    // state itself can be asserted.
    const GatedHeaderHarness = () => {
        const [actions, setActions] = React.useState<{ onSave: () => void; is_save_disabled: boolean }>();
        return (
            <React.Fragment>
                <TakeProfitAndStopLossContainer closeActionSheet={jest.fn()} onActionsChange={setActions} />
                <button disabled={actions?.is_save_disabled ?? true} onClick={() => actions?.onSave()}>
                    Save
                </button>
            </React.Fragment>
        );
    };

    it('enables the header save once Take profit is turned on with a valid amount', async () => {
        // Regression: the gate read the api-response *ref*. A ref write inside the response effect does
        // not re-render, so when the proposal landed on the same render as the toggle the gate kept the
        // stale "no response yet" value and the check stayed disabled for the sheet's lifetime.
        // The proposal must therefore arrive *after* the toggle, which is what the flag below stages.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { useProposal } = require('AppV2/Hooks/useProposal');
        let proposal_has_landed = false;
        useProposal.mockImplementation(() =>
            proposal_has_landed
                ? { data: { proposal: {} }, error: null, isFetching: false }
                : { data: undefined, error: null, isFetching: false }
        );

        render(
            <TraderProviders store={default_mock_store}>
                <ModulesProvider store={default_mock_store}>
                    <GatedHeaderHarness />
                </ModulesProvider>
            </TraderProviders>
        );
        const save = () => screen.getByRole('button', { name: 'Save' });
        expect(save()).toBeDisabled();

        proposal_has_landed = true;
        const toggle = screen
            .getAllByRole('button')
            .find(button => button.classList.contains('toggle-switch')) as HTMLElement;
        await userEvent.click(toggle);

        await waitFor(() => expect(save()).toBeEnabled());
    });

    it('should render both inputs for TP&SL', async () => {
        mockTakeProfitAndStopLossContainer();

        await userEvent.click(screen.getByText('Save'));
        expect(screen.getByText('Take profit')).toBeInTheDocument();
        expect(screen.getByText('Stop loss')).toBeInTheDocument();
        expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('should call onChangeMultiple if user clicked on Save button', async () => {
        mockTakeProfitAndStopLossContainer();

        expect(default_mock_store.modules.trade.onChangeMultiple).not.toBeCalled();
        await userEvent.click(screen.getByText('Save'));
        expect(default_mock_store.modules.trade.onChangeMultiple).toBeCalled();
    });

    it('should render correctly when keyboard is visible', () => {
        (useIsVirtualKeyboardOpen as jest.Mock).mockReturnValue({ is_key_board_visible: true });

        mockTakeProfitAndStopLossContainer();

        expect(screen.getByText('Take profit')).toBeInTheDocument();
        expect(screen.getByText('Stop loss')).toBeInTheDocument();
        expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('should render correctly when keyboard is hidden', () => {
        (useIsVirtualKeyboardOpen as jest.Mock).mockReturnValue({ is_key_board_visible: false });

        mockTakeProfitAndStopLossContainer();

        expect(screen.getByText('Take profit')).toBeInTheDocument();
        expect(screen.getByText('Stop loss')).toBeInTheDocument();
        expect(screen.getByText('Save')).toBeInTheDocument();
    });
});
