import React from 'react';

import { mockStore } from '@deriv/stores';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ModulesProvider from 'Stores/Providers/modules-providers';

import TraderProviders from '../../../../../trader-providers';
import PayoutPerPoint from '../payout-per-point';

const payout_per_point_label = 'Payout per point';

jest.mock('@deriv/shared', () => ({
    ...jest.requireActual('@deriv/shared'),
    isMobile: jest.fn(() => true),
}));

jest.mock('@deriv-com/quill-ui', () => ({
    ...jest.requireActual('@deriv-com/quill-ui'),
    WheelPicker: jest.fn(({ data, setSelectedValue }) => (
        <div>
            <p>WheelPicker</p>
            <ul>
                {data.map(({ value }: { value: string }) => (
                    <li key={value}>
                        <button onClick={() => setSelectedValue(value)}>{value}</button>
                    </li>
                ))}
            </ul>
        </div>
    )),
}));

jest.mock('../payout-per-point-wheel', () => ({
    __esModule: true,
    default: jest.fn(({ barrier, onDetailClick, setValue, is_api_response_received_ref, payout_per_point_list }) => (
        <div>
            <p>WheelPicker</p>
            <ul>
                {payout_per_point_list.map(({ value: option_value }: { value: string }) => (
                    <li key={option_value}>
                        <button
                            onClick={() => {
                                // Mimic the real wheel: a selection means the barrier proposal resolved,
                                // which unblocks the header Save (handleSave checks this ref).
                                if (is_api_response_received_ref) is_api_response_received_ref.current = true;
                                setValue(option_value);
                            }}
                        >
                            {option_value}
                        </button>
                    </li>
                ))}
            </ul>
            <button onClick={() => onDetailClick?.(2)}>Barrier</button>
            {barrier && <p>{barrier}</p>}
        </div>
    )),
}));

describe('PayoutPerPoint', () => {
    let default_mock_store: ReturnType<typeof mockStore>;

    beforeEach(
        () =>
            (default_mock_store = mockStore({
                modules: {
                    trade: {
                        ...mockStore({}),
                        barrier_1: '+1.80',
                        payout_choices: ['6', '5', '4', '3', '2', '1'],
                        currency: 'USD',
                        payout_per_point: '3',
                        trade_types: {
                            TURBOSSHORT: 'Turbos Short',
                        },
                    },
                },
                ui: {
                    is_mobile: true,
                },
            }))
    );

    afterEach(() => jest.clearAllMocks());

    const mockPayoutPerPoint = () =>
        render(
            <TraderProviders store={default_mock_store}>
                <ModulesProvider store={default_mock_store}>
                    <PayoutPerPoint />
                </ModulesProvider>
            </TraderProviders>
        );
    it('renders Skeleton loader if payout_per_point is falsy', () => {
        default_mock_store.modules.trade.payout_per_point = '';
        mockPayoutPerPoint();

        expect(screen.getByTestId('dt_skeleton')).toBeInTheDocument();
        expect(screen.queryByText(payout_per_point_label)).not.toBeInTheDocument();
    });

    it('renders trade param with "Payout per point" label and input with value equal to current payout_per_point value', () => {
        mockPayoutPerPoint();

        expect(screen.getByText(payout_per_point_label)).toBeInTheDocument();
        expect(screen.getByRole('textbox')).toHaveValue('$3');
    });

    it('disables trade param if is_market_closed === true', () => {
        default_mock_store.modules.trade.is_market_closed = true;
        mockPayoutPerPoint();

        expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('opens ActionSheet with WheelPicker component, barrier information, "Save" button and text content with definition if user clicks on trade param', async () => {
        mockPayoutPerPoint();

        expect(screen.queryByTestId('dt-actionsheet-overlay')).not.toBeInTheDocument();

        await userEvent.click(screen.getByText(payout_per_point_label));

        expect(screen.getByTestId('dt-actionsheet-overlay')).toBeInTheDocument();
        expect(screen.getByText('WheelPicker')).toBeInTheDocument();
        expect(screen.getByText('Barrier')).toBeInTheDocument();
        expect(screen.getByText('+1.80')).toBeInTheDocument();
        // Save is now the header action (icon-only, aria-label) instead of a footer text button.
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
        // The definition moved into the header title's info-icon tooltip — revealed on hover/tap.
        fireEvent.mouseEnter(screen.getByRole('button', { name: payout_per_point_label }));
        expect(
            screen.getByText(
                'The amount you choose to receive at expiry for every point of change between the final price and the barrier.'
            )
        ).toBeInTheDocument();
    });

    it('sets the sheet title to Barrier when the barrier detail page is opened', async () => {
        mockPayoutPerPoint();

        await userEvent.click(screen.getByText(payout_per_point_label));
        // Only the wheel's Barrier control before navigating to its page.
        expect(screen.getAllByText('Barrier')).toHaveLength(1);

        await userEvent.click(screen.getByText('Barrier'));
        // The carousel title now reads Barrier too (control + title).
        expect(screen.getAllByText('Barrier')).toHaveLength(2);
    });

    it('does not render barrier information if barrier is not defined', async () => {
        default_mock_store.modules.trade.barrier_1 = undefined;
        mockPayoutPerPoint();

        await userEvent.click(screen.getByText(payout_per_point_label));

        expect(screen.getByText('Barrier')).toBeInTheDocument();
        expect(screen.queryByText('+1.80')).not.toBeInTheDocument();
    });

    it('applies specific className if innerHeight is <= 640px', async () => {
        const original_height = window.innerHeight;
        window.innerHeight = 640;
        mockPayoutPerPoint();

        await userEvent.click(screen.getByText(payout_per_point_label));

        expect(screen.getByTestId('dt_carousel')).toHaveClass('payout-per-point__carousel--small');
        window.innerHeight = original_height;
    });

    it('calls setPayoutPerPoint function if user saved new selected value', async () => {
        mockPayoutPerPoint();

        const new_selected_value = default_mock_store.modules.trade.payout_choices[1];
        await userEvent.click(screen.getByText(payout_per_point_label));
        await userEvent.click(screen.getByText(new_selected_value));
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(default_mock_store.modules.trade.setPayoutPerPoint).toBeCalled();
    });
});
