import React from 'react';

import { dayjs } from '@deriv/shared';
import { mockStore } from '@deriv/stores';
import { TCoreStores } from '@deriv/stores/types';
import { useSnackbar } from '@deriv-com/quill-ui';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import TraderProviders from '../../../../../trader-providers';
import DayInput from '../day';

jest.mock('@deriv-com/quill-ui', () => ({
    ...jest.requireActual('@deriv-com/quill-ui'),
    useSnackbar: jest.fn(),
}));

jest.mock('AppV2/Hooks/useProposal', () => ({
    useProposal: jest.fn(() => ({ data: undefined, error: undefined })),
}));

jest.mock('@deriv/quill-icons', () => ({
    ...jest.requireActual('@deriv/quill-icons'),
    LabelPairedChevronDownMdRegularIcon: (props: Record<string, unknown>) => (
        <svg data-testid='chevron-down-icon' {...props} />
    ),
    LabelPairedCalendarSmRegularIcon: (props: Record<string, unknown>) => (
        <svg data-testid='calendar-icon' {...props} />
    ),
    LabelPairedClockThreeSmRegularIcon: (props: Record<string, unknown>) => <svg data-testid='clock-icon' {...props} />,
}));

// The pickers' own data-fetching behaviour is out of scope here; only that DayInput opens them.
jest.mock('../datepicker', () => ({
    __esModule: true,
    default: () => <div>Mocked DaysDatepicker</div>,
}));

jest.mock('../timepicker', () => ({
    __esModule: true,
    default: () => <div>Mocked EndTimePicker</div>,
}));

describe('DayInput', () => {
    let default_trade_store: TCoreStores;

    beforeEach(() => {
        default_trade_store = mockStore({
            modules: {
                trade: {
                    amount: 10,
                    barrier_1: '',
                    contract_type: 'rise_fall',
                    duration_min_max: {
                        intraday: { min: 60, max: 3600 },
                        daily: { min: 86400, max: 172800 },
                    },
                    duration_unit: 'd',
                    duration_units_list: [
                        { value: 'd', text: 'days' },
                        { value: 'm', text: 'minutes' },
                    ],
                    duration: 1,
                    expiry_type: 'endtime',
                    is_turbos: false,
                    market_close_times: [],
                    market_open_times: [],
                    start_date: 1,
                    start_time: null,
                    symbol: 'EURUSD',
                    trade_types: { rise_fall: 'Rise/Fall' },
                },
            },
            common: {
                server_time: dayjs('2024-10-10T11:23:10.895Z'),
            },
        });
    });

    beforeAll(() => {
        (useSnackbar as jest.Mock).mockReturnValue({ addSnackbar: jest.fn() });
    });

    const mockDayInput = () =>
        render(
            <TraderProviders store={default_trade_store}>
                <DayInput
                    selected_expiry_date='2025-10-15'
                    selected_expiry_time='23:59:59'
                    setSelectedExpiryDate={jest.fn()}
                    setSelectedExpiryTime={jest.fn()}
                />
            </TraderProviders>
        );

    it('does not render a chevron icon on the Date or Time field', () => {
        mockDayInput();

        expect(screen.queryAllByTestId('chevron-down-icon')).toHaveLength(0);
    });

    it('still renders the leading calendar and clock icons', () => {
        mockDayInput();

        expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
        expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    });

    it('opens the date picker when the Date field is tapped', async () => {
        mockDayInput();

        await userEvent.click(screen.getByTestId('dt_date_input'));

        expect(screen.getByText('Pick an end date')).toBeInTheDocument();
    });

    it('opens the time picker when the Time field is tapped', async () => {
        mockDayInput();

        await userEvent.click(screen.getByDisplayValue('23:59:59 GMT'));

        expect(screen.getByText('Pick an end time')).toBeInTheDocument();
    });
});
