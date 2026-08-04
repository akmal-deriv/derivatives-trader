import { dayjs } from '@deriv/shared';
import { mockStore } from '@deriv/stores';
import { TCoreStores } from '@deriv/stores/types';
import { useSnackbar } from '@deriv-com/quill-ui';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import TraderProviders from '../../../../../trader-providers';
import Duration from '../index';

global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));

global.ResizeObserver = ResizeObserver;

jest.mock('@deriv-com/quill-ui', () => ({
    ...jest.requireActual('@deriv-com/quill-ui'),
    useSnackbar: jest.fn(),
}));

jest.mock('AppV2/Hooks/useActiveSymbols', () => ({
    __esModule: true,
    default: jest.fn(() => ({
        activeSymbols: [
            { symbol: 'EURUSD', display_name: 'EUR/USD', exchange_is_open: 1 },
            { symbol: 'GBPUSD', display_name: 'GBP/USD', exchange_is_open: 0 },
            { symbol: 'CADAUD', display_name: 'CAD/AUD', exchange_is_open: 0 },
        ],
    })),
}));

jest.mock('@deriv/shared', () => ({
    ...jest.requireActual('@deriv/shared'),
    toMoment: jest.fn(() => ({
        clone: jest.fn(),
        isSame: jest.fn(() => true),
    })),
    isMobile: jest.fn(() => false), // Default to desktop mode
}));

jest.mock('../day', () => ({
    __esModule: true,
    default: jest.fn(() => <div>Mocked DayInput</div>),
}));

describe('Duration', () => {
    let default_trade_store: TCoreStores, mockOnChangeMultiple: jest.Mock;

    beforeEach(() => {
        mockOnChangeMultiple = jest.fn();
        default_trade_store = mockStore({
            modules: {
                trade: {
                    onChange: jest.fn(),
                    validation_errors: { duration: [] },
                    duration: 30,
                    duration_unit: 'm',
                    expiry_type: 'duration',
                    expiry_time: '',
                    proposal_info: {},
                    onChangeMultiple: mockOnChangeMultiple,
                    duration_min_max: {
                        tick: { min: 1, max: 10 },
                        intraday: { min: 60, max: 3600 },
                        daily: { min: 86400, max: 172800 },
                    },
                    start_time: null,
                    symbol: 'EURUSD',
                    saved_expiry_date_v2: '',
                    setSavedExpiryDateV2: jest.fn(),
                    setUnsavedExpiryDateV2: jest.fn(),
                    unsaved_expiry_date_v2: '',
                },
            },
            common: {
                server_time: dayjs('2024-10-10T11:23:10.895Z'),
            },
        });
    });

    const mockAddSnackbar = jest.fn();

    beforeAll(() => {
        (useSnackbar as jest.Mock).mockReturnValue({ addSnackbar: mockAddSnackbar });
    });
    const mockDuration = () => {
        render(
            <TraderProviders store={default_trade_store}>
                <Duration />
            </TraderProviders>
        );
    };

    it('should render the Duration component with default values', () => {
        mockDuration();
        expect(screen.getByLabelText('Duration')).toBeInTheDocument();
        expect(screen.getByDisplayValue('30 min')).toBeInTheDocument();
    });

    it('should render the correct value for duration in hours and minutes', () => {
        default_trade_store.modules.trade.duration = 125;
        mockDuration();
        expect(screen.getByLabelText('Duration')).toBeInTheDocument();
        expect(screen.getByDisplayValue('2 hours 5 minutes')).toBeInTheDocument();
    });

    it('should open the popover when the text field is clicked (desktop)', async () => {
        default_trade_store.modules.trade.expiry_time = '12:30';
        mockDuration();
        const textField = screen.getByLabelText('Duration');
        expect(textField).toBeInTheDocument();
        await userEvent.click(textField);

        // Desktop uses popover, not ActionSheet dialog
        expect(screen.getByText('Ticks')).toBeInTheDocument();
        expect(screen.getByText('Seconds')).toBeInTheDocument();
        expect(screen.getByText('Minutes')).toBeInTheDocument();
        expect(screen.getByText('Hours')).toBeInTheDocument();
    });

    it('should not crash when validation_errors does not contain duration key', () => {
        default_trade_store.modules.trade.validation_errors = {};
        expect(() => mockDuration()).not.toThrow();
        expect(screen.getByLabelText('Duration')).toBeInTheDocument();
    });

    it('should display a validation error message if there is a duration error', () => {
        default_trade_store.modules.trade.validation_errors.duration = [
            { message: 'Invalid duration', error_field: 'duration' },
        ];
        mockDuration();
        expect(mockAddSnackbar).toHaveBeenCalled();
    });

    it('should display the market closed message when the market is closed', () => {
        default_trade_store.modules.trade.is_market_closed = true;
        mockDuration();
        expect(screen.getByText(/duration/i)).toBeInTheDocument();
        expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should calculate the correct duration based on the smallest unit from the store', () => {
        mockDuration();
        const smallest_duration = screen.getByDisplayValue('30 min');
        expect(smallest_duration).toBeInTheDocument();
    });

    it('should display duration in seconds if provided', () => {
        default_trade_store.modules.trade.duration = 45;
        default_trade_store.modules.trade.duration_unit = 's';
        mockDuration();
        expect(screen.getByDisplayValue('45 sec')).toBeInTheDocument();
    });

    it('should display correct duration in ticks when tick duration is selected', () => {
        default_trade_store.modules.trade.duration = 5;
        default_trade_store.modules.trade.duration_unit = 't';
        mockDuration();
        expect(screen.getByDisplayValue('5 ticks')).toBeInTheDocument();
    });

    it('should update the selected hour and unit when the component is opened', async () => {
        default_trade_store.modules.trade.duration_unit = 'm';
        default_trade_store.modules.trade.duration = 125;
        mockDuration();

        const textField = screen.getByLabelText('Duration');
        await userEvent.click(textField);

        expect(screen.getByDisplayValue('2 hours 5 minutes')).toBeInTheDocument();
    });

    it('should update saved_expiry_date when expiry_epoch changes to a different date', () => {
        // Initial state with next year's date (simulating Accumulator contract)
        const next_year_epoch = 1792108799; // Oct 15, 2026
        default_trade_store.modules.trade.expiry_epoch = next_year_epoch;
        default_trade_store.modules.trade.saved_expiry_date_v2 = ''; // Start with empty

        render(
            <TraderProviders store={default_trade_store}>
                <Duration />
            </TraderProviders>
        );

        // Verify initial date is set from expiry_epoch
        expect(default_trade_store.modules.trade.setSavedExpiryDateV2).toHaveBeenCalledWith('2026-10-15');
    });

    it('should not update saved_expiry_date when expiry_epoch changes but date remains the same', () => {
        const mockSetSavedExpiryDateV2 = jest.fn();

        // Initial state with today's date
        const initial_epoch = 1760507040; // Oct 15, 2025 00:00:00
        default_trade_store.modules.trade.expiry_epoch = initial_epoch;
        default_trade_store.modules.trade.saved_expiry_date_v2 = '2025-10-15';
        default_trade_store.modules.trade.setSavedExpiryDateV2 = mockSetSavedExpiryDateV2;

        const { rerender } = render(
            <TraderProviders store={default_trade_store}>
                <Duration />
            </TraderProviders>
        );

        mockSetSavedExpiryDateV2.mockClear();

        // Simulate streaming proposal update with same date but different time
        const updated_epoch = 1760507041; // Oct 15, 2025 00:00:01 (1 second later)
        default_trade_store.modules.trade.expiry_epoch = updated_epoch;

        rerender(
            <TraderProviders store={default_trade_store}>
                <Duration />
            </TraderProviders>
        );

        // Verify that setSavedExpiryDateV2 is NOT called since the date hasn't changed
        expect(mockSetSavedExpiryDateV2).not.toHaveBeenCalled();
    });

    it('should handle expiry_epoch updates correctly when switching between contract types', () => {
        // Start with Accumulator (no duration) - next year's date
        const accumulator_epoch = 1792108799; // Oct 15, 2026
        default_trade_store.modules.trade.expiry_epoch = accumulator_epoch;
        default_trade_store.modules.trade.saved_expiry_date_v2 = ''; // Start with empty
        default_trade_store.modules.trade.contract_type = 'accumulator';

        render(
            <TraderProviders store={default_trade_store}>
                <Duration />
            </TraderProviders>
        );

        // Verify Accumulator's date is set
        expect(default_trade_store.modules.trade.setSavedExpiryDateV2).toHaveBeenCalledWith('2026-10-15');
    });
});

describe('Duration - Mobile', () => {
    let default_trade_store: TCoreStores, mockOnChangeMultiple: jest.Mock;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { isMobile } = require('@deriv/shared');
    const mockAddSnackbar = jest.fn();

    beforeAll(() => {
        (useSnackbar as jest.Mock).mockReturnValue({ addSnackbar: mockAddSnackbar });
    });

    beforeEach(() => {
        // Mock isMobile to return true for mobile tests
        (isMobile as jest.Mock).mockReturnValue(true);

        mockOnChangeMultiple = jest.fn();
        default_trade_store = mockStore({
            modules: {
                trade: {
                    onChange: jest.fn(),
                    validation_errors: { duration: [] },
                    duration: 30,
                    duration_unit: 'm',
                    expiry_type: 'duration',
                    expiry_time: '',
                    proposal_info: {},
                    onChangeMultiple: mockOnChangeMultiple,
                    duration_min_max: {
                        tick: { min: 1, max: 10 },
                        intraday: { min: 60, max: 3600 },
                        daily: { min: 86400, max: 172800 },
                    },
                    duration_units_list: [
                        { value: 't', text: 'ticks' },
                        { value: 's', text: 'seconds' },
                        { value: 'm', text: 'minutes' },
                        { value: 'h', text: 'hours' },
                        { value: 'd', text: 'days' },
                    ],
                    start_time: null,
                    symbol: 'EURUSD',
                    saved_expiry_date_v2: '',
                    setSavedExpiryDateV2: jest.fn(),
                    setUnsavedExpiryDateV2: jest.fn(),
                    unsaved_expiry_date_v2: '',
                },
            },
            common: {
                server_time: dayjs('2024-10-10T11:23:10.895Z'),
            },
        });
    });

    afterEach(() => {
        // Reset mock after each test
        (isMobile as jest.Mock).mockReturnValue(false);
    });

    const mockDurationMobile = () => {
        render(
            <TraderProviders store={default_trade_store}>
                <Duration />
            </TraderProviders>
        );
    };

    it('should render durations with an hour component in clock format (mobile)', () => {
        default_trade_store.modules.trade.duration = 125;
        mockDurationMobile();
        expect(screen.getByLabelText('Duration')).toBeInTheDocument();
        expect(screen.getByDisplayValue('02:05:00')).toBeInTheDocument();
    });

    it('should open the ActionSheet when the text field is clicked (mobile)', async () => {
        default_trade_store.modules.trade.expiry_time = '12:30';
        mockDurationMobile();
        const textField = screen.getByLabelText('Duration');
        expect(textField).toBeInTheDocument();
        await userEvent.click(textField);

        // Mobile uses ActionSheet with dialog role
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should update the selected hour and unit when the component is opened (mobile)', async () => {
        default_trade_store.modules.trade.duration_unit = 'm';
        default_trade_store.modules.trade.duration = 125;
        mockDurationMobile();

        const textField = screen.getByLabelText('Duration');
        await userEvent.click(textField);

        expect(screen.getByDisplayValue('02:05:00')).toBeInTheDocument();
    });

    it('should render second-based durations with an hour component in clock format (mobile)', () => {
        default_trade_store.modules.trade.duration_unit = 's';
        default_trade_store.modules.trade.duration = 5445;
        mockDurationMobile();

        expect(screen.getByDisplayValue('01:30:45')).toBeInTheDocument();
    });

    it('should render legacy hour-unit durations in clock format (mobile)', () => {
        default_trade_store.modules.trade.duration_unit = 'h';
        default_trade_store.modules.trade.duration = 2;
        mockDurationMobile();

        expect(screen.getByDisplayValue('02:00:00')).toBeInTheDocument();
    });

    it('should not commit when closing on a selection equivalent to the stored duration (mobile)', async () => {
        // 120 seconds and the wheel's [0, 2, 0] are the same duration in different units
        default_trade_store.modules.trade.duration_unit = 's';
        default_trade_store.modules.trade.duration = 120;
        mockDurationMobile();

        await userEvent.click(screen.getByLabelText('Duration'));
        await userEvent.click(screen.getByTestId('dt-actionsheet-overlay'));

        expect(mockOnChangeMultiple).not.toHaveBeenCalled();
    });

    it('should render sub-hour combined durations verbosely (mobile)', () => {
        default_trade_store.modules.trade.duration_unit = 's';
        default_trade_store.modules.trade.duration = 75;
        mockDurationMobile();

        expect(screen.getByDisplayValue('1 minute 15 seconds')).toBeInTheDocument();
    });

    it('should not commit a duration when the sheet is closed without changes (mobile)', async () => {
        mockDurationMobile();

        await userEvent.click(screen.getByLabelText('Duration'));
        await userEvent.click(screen.getByTestId('dt-actionsheet-overlay'));

        expect(mockOnChangeMultiple).not.toHaveBeenCalled();
    });

    it('should commit the clamped time wheel selection when the sheet is closed (mobile)', async () => {
        // 2 hours exceeds the 3600s intraday max, so the wheel clamps to 1 hour and commits it as minutes
        default_trade_store.modules.trade.duration_unit = 'h';
        default_trade_store.modules.trade.duration = 2;
        mockDurationMobile();

        await userEvent.click(screen.getByLabelText('Duration'));
        await userEvent.click(screen.getByTestId('dt-actionsheet-overlay'));

        expect(mockOnChangeMultiple).toHaveBeenCalledWith({
            duration_unit: 'm',
            duration: 60,
            expiry_type: 'duration',
        });
    });

    it('should step the duration by one second and roll seconds into minutes (mobile)', async () => {
        default_trade_store.modules.trade.duration_min_max.intraday = { min: 15, max: 86400 };
        default_trade_store.modules.trade.duration_unit = 's';
        default_trade_store.modules.trade.duration = 59;
        mockDurationMobile();

        // 59s + 1s = 60s → commits as 1 minute
        await userEvent.click(screen.getByTestId('dt_stepper_increment'));
        expect(mockOnChangeMultiple).toHaveBeenCalledWith({
            duration_unit: 'm',
            duration: 1,
            expiry_type: 'duration',
        });
    });

    it('should step one second past a whole minute into a seconds duration (mobile)', async () => {
        default_trade_store.modules.trade.duration_min_max.intraday = { min: 15, max: 86400 };
        // 1 minute (stored as minutes) + 1s = 61s → 1 min 1 sec, committed as seconds
        default_trade_store.modules.trade.duration_unit = 'm';
        default_trade_store.modules.trade.duration = 1;
        mockDurationMobile();

        await userEvent.click(screen.getByTestId('dt_stepper_increment'));
        expect(mockOnChangeMultiple).toHaveBeenCalledWith({
            duration_unit: 's',
            duration: 61,
            expiry_type: 'duration',
        });
    });

    it('should step ticks by 1 tick (mobile)', async () => {
        default_trade_store.modules.trade.duration_unit = 't';
        default_trade_store.modules.trade.duration = 5;
        mockDurationMobile();

        await userEvent.click(screen.getByTestId('dt_stepper_increment'));
        expect(mockOnChangeMultiple).toHaveBeenCalledWith({
            duration_unit: 't',
            duration: 6,
            expiry_type: 'duration',
        });
    });

    it('should disable the decrement stepper at the intraday minimum (mobile)', () => {
        default_trade_store.modules.trade.duration_min_max.intraday = { min: 15, max: 86400 };
        default_trade_store.modules.trade.duration_unit = 's';
        default_trade_store.modules.trade.duration = 15;
        mockDurationMobile();

        expect(screen.getByTestId('dt_stepper_decrement')).toBeDisabled();
        expect(screen.getByTestId('dt_stepper_increment')).toBeEnabled();
    });

    it('should not render the steppers in End time mode (mobile)', () => {
        default_trade_store.modules.trade.expiry_type = 'endtime';
        default_trade_store.modules.trade.expiry_time = '12:30';
        mockDurationMobile();

        expect(screen.queryByTestId('dt_stepper_increment')).not.toBeInTheDocument();
        expect(screen.queryByTestId('dt_stepper_decrement')).not.toBeInTheDocument();
    });
});

describe('Duration default on trade-type switch', () => {
    const mockApplyDefaultDuration = jest.fn();

    const buildStore = (trade_overrides: Record<string, unknown> = {}) =>
        mockStore({
            modules: {
                trade: {
                    onChange: jest.fn(),
                    validation_errors: { duration: [] },
                    duration: 30,
                    duration_unit: 'm',
                    expiry_type: 'duration',
                    expiry_time: '',
                    proposal_info: {},
                    onChangeMultiple: jest.fn(),
                    applyDefaultDuration: mockApplyDefaultDuration,
                    duration_min_max: {
                        tick: { min: 1, max: 10 },
                        intraday: { min: 60, max: 3600 },
                        daily: { min: 86400, max: 172800 },
                    },
                    duration_units_list: [
                        { value: 't', text: 'Ticks' },
                        { value: 'm', text: 'Minutes' },
                        { value: 'h', text: 'Hours' },
                        { value: 'd', text: 'Days' },
                    ],
                    start_time: null,
                    symbol: 'EURUSD',
                    contract_type: 'rise_fall',
                    saved_expiry_date_v2: '',
                    setSavedExpiryDateV2: jest.fn(),
                    setUnsavedExpiryDateV2: jest.fn(),
                    unsaved_expiry_date_v2: '',
                    ...trade_overrides,
                },
            },
            common: { server_time: dayjs('2024-10-10T11:23:10.895Z') },
        });

    const renderWith = (store: TCoreStores) =>
        render(
            <TraderProviders store={store}>
                <Duration />
            </TraderProviders>
        );

    beforeAll(() => {
        (useSnackbar as jest.Mock).mockReturnValue({ addSnackbar: jest.fn() });
    });

    beforeEach(() => {
        mockApplyDefaultDuration.mockClear();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    it('applies the configured default when the persisted duration is invalid for the constraints', () => {
        const { rerender } = renderWith(buildStore({ contract_type: 'rise_fall' }));

        // Clear the 500ms initial-mount guard so subsequent runs act on changes.
        act(() => jest.advanceTimersByTime(500));

        // 999 ticks is out of range for tick max 10 -> invalid persisted duration.
        rerender(
            <TraderProviders store={buildStore({ contract_type: 'rise_fall', duration: 999, duration_unit: 't' })}>
                <Duration />
            </TraderProviders>
        );

        act(() => jest.advanceTimersByTime(10)); // flush the reset timer

        expect(mockApplyDefaultDuration).toHaveBeenCalled();
    });

    it('does not reset when the persisted duration is still valid', () => {
        const { rerender } = renderWith(buildStore({ contract_type: 'rise_fall' }));

        act(() => jest.advanceTimersByTime(500));

        // Still a valid duration for the same constraints -> no reset.
        rerender(
            <TraderProviders store={buildStore({ contract_type: 'rise_fall', duration: 20 })}>
                <Duration />
            </TraderProviders>
        );

        act(() => jest.advanceTimersByTime(10));

        expect(mockApplyDefaultDuration).not.toHaveBeenCalled();
    });
});
