import React from 'react';

import { mockStore } from '@deriv/stores';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ModulesProvider from 'Stores/Providers/modules-providers';

import TraderProviders from '../../../../../trader-providers';
import DealCancellation from '../deal-cancellation';

const deal_cancellation = 'Deal cancellation';
const wheel_picker = 'Wheel Picker';
const save_button = 'Save';

jest.mock('@deriv-com/quill-ui', () => ({
    ...jest.requireActual('@deriv-com/quill-ui'),
    WheelPicker: jest.fn(({ data, setSelectedValue }) => (
        <div>
            <p>{wheel_picker}</p>
            <ul>
                {data.map(({ label, value }: { label: string; value: string }) => (
                    <li key={value}>
                        <button onClick={() => setSelectedValue(value)}>{label}</button>
                    </li>
                ))}
            </ul>
        </div>
    )),
}));

// The DC fee is fetched live for the selected duration; stub the proposal hook.
const mockUseProposal = jest.fn();
jest.mock('AppV2/Hooks/useProposal', () => ({
    useProposal: (...args: unknown[]) => mockUseProposal(...args),
}));

describe('DealCancellation', () => {
    let default_mock_store: ReturnType<typeof mockStore>;

    beforeEach(
        () =>
            (default_mock_store = mockStore({
                modules: {
                    trade: {
                        ...mockStore({}),
                        cancellation_range_list: [
                            { text: '60 minutes', value: '60m' },
                            { text: '30 minutes', value: '30m' },
                            { text: '15 minutes', value: '15m' },
                        ],
                        cancellation_duration: '60m',
                    },
                },
            }))
    );

    beforeEach(() => mockUseProposal.mockReturnValue({ data: undefined }));

    afterEach(() => jest.clearAllMocks());

    // DealCancellation lifts its commit handler + dirty gate to the header owner (the picker) via
    // `onActionsChange` instead of rendering its own footer Save. This harness stands in for that
    // owner: it renders the Save action after the component, wired to the reported handler, keeping
    // the commit/no-commit behaviour covered.
    const HeaderActionsHarness = () => {
        const [actions, setActions] = React.useState<{ onSave: () => void; is_save_disabled: boolean }>();
        return (
            <React.Fragment>
                <DealCancellation closeActionSheet={jest.fn()} onActionsChange={setActions} />
                <button onClick={() => actions?.onSave()}>{save_button}</button>
            </React.Fragment>
        );
    };

    const mockDealCancellation = () =>
        render(
            <TraderProviders store={default_mock_store}>
                <ModulesProvider store={default_mock_store}>
                    <HeaderActionsHarness />
                </ModulesProvider>
            </TraderProviders>
        );

    it('should render title, Wheel Picker and Save button', () => {
        mockDealCancellation();

        expect(screen.getByText(deal_cancellation)).toBeInTheDocument();
        expect(screen.getByText(wheel_picker)).toBeInTheDocument();
        expect(screen.getByText(save_button)).toBeInTheDocument();
        expect(screen.queryByTestId('square-skeleton')).not.toBeInTheDocument();
    });

    it('shows the deal cancellation fee returned for the selected duration', () => {
        default_mock_store.modules.trade.currency = 'USD';
        default_mock_store.modules.trade.has_cancellation = true;
        mockUseProposal.mockReturnValue({ data: { proposal: { cancellation: { ask_price: 0.82 } } } });
        mockDealCancellation();

        expect(screen.getByText('Deal cancellation fee')).toBeInTheDocument();
        expect(screen.getByText(/\$0.82/)).toBeInTheDocument();
    });

    it('shows a skeleton while the fee is loading (cancellation on, no fee yet)', () => {
        default_mock_store.modules.trade.has_cancellation = true;
        mockUseProposal.mockReturnValue({ data: undefined });
        mockDealCancellation();

        expect(screen.getByText('Deal cancellation fee')).toBeInTheDocument();
        expect(screen.getByTestId('square-skeleton')).toBeInTheDocument();
    });

    it('omits the deal cancellation fee row when cancellation is off', () => {
        default_mock_store.modules.trade.has_cancellation = false;
        mockUseProposal.mockReturnValue({ data: undefined });
        mockDealCancellation();

        expect(screen.queryByText('Deal cancellation fee')).not.toBeInTheDocument();
    });

    it('should render Skeleton loader instead of Wheel Picker if cancellation_range_list is empty', () => {
        default_mock_store.modules.trade.cancellation_range_list = [];
        mockDealCancellation();

        expect(screen.getByTestId('square-skeleton')).toBeInTheDocument();
        expect(screen.queryByText(wheel_picker)).not.toBeInTheDocument();
    });

    it("should not call onChangeMultiple if user clicks on Save button, but the value hasn't changed", async () => {
        mockDealCancellation();

        await userEvent.click(screen.getByText(save_button));

        expect(default_mock_store.modules.trade.onChangeMultiple).not.toBeCalled();
    });

    it('should call onChangeMultiple with correct arguments if user clicks on Save button and he changed the value previously', async () => {
        mockDealCancellation();

        await userEvent.click(screen.getByText('30 min'));
        await userEvent.click(screen.getByText(save_button));

        expect(default_mock_store.modules.trade.onChangeMultiple).toBeCalledWith({
            cancellation_duration: '30m',
            has_cancellation: false,
        });
    });

    it('should call onChangeMultiple with correct arguments even if has_stop_loss and has_take_profit were true', async () => {
        default_mock_store.modules.trade.has_stop_loss = true;
        default_mock_store.modules.trade.has_take_profit = true;
        mockDealCancellation();

        // The `Deal cancellation` label carries an info tooltip, which is a button too; the toggle
        // switch is the unnamed one, so match on that rather than on DOM position.
        const toggle_switch = screen.getAllByRole('button').find(button => !button.getAttribute('aria-label'));
        await userEvent.click(toggle_switch as HTMLElement);
        await userEvent.click(screen.getByText('15 min'));
        await userEvent.click(screen.getByText(save_button));

        expect(default_mock_store.modules.trade.onChangeMultiple).toBeCalledWith({
            cancellation_duration: '15m',
            has_cancellation: true,
            has_stop_loss: false,
            has_take_profit: false,
        });
    });
});
