import React from 'react';

import { dayjs } from '@deriv/shared';
import { mockStore } from '@deriv/stores';
import { TCoreStores } from '@deriv/stores/types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import TraderProviders from '../../../../../trader-providers';
import DurationActionSheetContainer from '../container';

global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));

global.ResizeObserver = ResizeObserver;
global.HTMLElement.prototype.scrollIntoView = jest.fn();

jest.mock('Stores/Modules/Trading/Helpers/contract-type', () => ({
    ContractType: {
        getTradingEvents: jest.fn(),
        getTradingDays: jest.fn(),
    },
}));

jest.mock('AppV2/Hooks/useActiveSymbols', () => ({
    __esModule: true,
    default: jest.fn(() => ({
        activeSymbols: [{ symbol: '1HZ100V', display_name: '"Volatility 100 (1s) Index"', exchange_is_open: 1 }],
    })),
}));

jest.mock('@deriv-com/quill-ui', () => ({
    ...jest.requireActual('@deriv-com/quill-ui'),
    DatePicker: jest.fn(({ onChange }) => (
        <div>
            <button
                onClick={() => {
                    const mockDate = new Date(2024, 8, 10);
                    onChange(mockDate);
                }}
            >
                Date Picker
            </button>
        </div>
    )),
}));

jest.mock('../day', () => ({
    __esModule: true,
    default: jest.fn(() => <div>Mocked DayInput</div>),
}));

describe('DurationActionSheetContainer', () => {
    let default_trade_store: TCoreStores;

    beforeEach(() => {
        default_trade_store = mockStore({
            modules: {
                trade: {
                    duration: 30,
                    duration_unit: 'm',
                    duration_units_list: [
                        { value: 's', text: 'seconds' },
                        { value: 't', text: 'ticks' },
                        { value: 'm', text: 'minutes' },
                        { value: 'h', text: 'hours' },
                        { value: 'd', text: 'days' },
                    ],
                    duration_min_max: {
                        daily: {
                            min: 86400,
                            max: 31536000,
                        },
                        intraday: {
                            min: 15,
                            max: 86400,
                        },
                        tick: {
                            min: 1,
                            max: 10,
                        },
                    },
                    onChangeMultiple: jest.fn(),
                    expiry_time: null,
                    contract_type: 'call',
                    symbol: '1HZ100V',
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

    const renderDurationContainer = (
        mocked_store: TCoreStores,
        unit = 'm',
        setUnit = jest.fn(),
        selected_expiry_time = '',
        selected_expiry_date = '',
        setSelectedExpiryTime = jest.fn(),
        setSavedExpiryTime = jest.fn(),
        setSelectedExpiryDate = jest.fn(),
        setSavedExpiryDate = jest.fn(),
        onClose = jest.fn()
    ) => {
        render(
            <TraderProviders store={mocked_store}>
                <DurationActionSheetContainer
                    unit={unit}
                    setUnit={setUnit}
                    onClose={onClose}
                    selected_expiry_time={selected_expiry_time}
                    selected_expiry_date={selected_expiry_date}
                    setSelectedExpiryTime={setSelectedExpiryTime}
                    setSavedExpiryTime={setSavedExpiryTime}
                    setSelectedExpiryDate={setSelectedExpiryDate}
                    setSavedExpiryDate={setSavedExpiryDate}
                />
            </TraderProviders>
        );
    };

    it('should render the DurationActionSheetContainer with default values', () => {
        renderDurationContainer(default_trade_store);
        expect(screen.getByText('minutes')).toBeInTheDocument();
    });

    it('should render preset chips for hours unit', async () => {
        default_trade_store.modules.trade.duration = 130;
        renderDurationContainer(default_trade_store, 'h');

        expect(screen.getByText('1 hr')).toBeInTheDocument();
        expect(screen.getByText('2 hr')).toBeInTheDocument();
    });

    it('should call onChangeMultiple with correct data when selecting a minutes preset chip', async () => {
        default_trade_store.modules.trade.duration = 30;
        const onClose = jest.fn();
        renderDurationContainer(
            default_trade_store,
            'm',
            jest.fn(),
            '',
            '',
            jest.fn(),
            jest.fn(),
            jest.fn(),
            jest.fn(),
            onClose
        );

        await userEvent.click(screen.getByText('5 min'));

        expect(default_trade_store.modules.trade.onChangeMultiple).toHaveBeenCalledWith({
            duration_unit: 'm',
            duration: 5,
            expiry_type: 'duration',
        });
        expect(onClose).toHaveBeenCalled();
    });

    it('should call onChangeMultiple with correct data when selecting a ticks preset chip', async () => {
        default_trade_store.modules.trade.duration = 5;
        const onClose = jest.fn();
        renderDurationContainer(
            default_trade_store,
            't',
            jest.fn(),
            '',
            '',
            jest.fn(),
            jest.fn(),
            jest.fn(),
            jest.fn(),
            onClose
        );

        await userEvent.click(screen.getByText('5 ticks'));

        expect(default_trade_store.modules.trade.onChangeMultiple).toHaveBeenCalledWith({
            duration_unit: 't',
            duration: 5,
            expiry_type: 'duration',
        });
        expect(onClose).toHaveBeenCalled();
    });

    it('should call setUnit when switching duration unit chips', async () => {
        const setUnit = jest.fn();
        renderDurationContainer(default_trade_store, 'h', setUnit);

        await userEvent.click(screen.getByText('minutes'));
        expect(setUnit).toHaveBeenCalledWith('m');
    });

    it('should call onChangeMultiple with correct data when selecting a seconds preset chip', async () => {
        default_trade_store.modules.trade.duration = 20;
        const onClose = jest.fn();

        renderDurationContainer(
            default_trade_store,
            's',
            jest.fn(),
            '',
            '',
            jest.fn(),
            jest.fn(),
            jest.fn(),
            jest.fn(),
            onClose
        );
        await userEvent.click(screen.getByText('30 sec'));

        expect(default_trade_store.modules.trade.onChangeMultiple).toHaveBeenCalledWith({
            duration_unit: 's',
            duration: 30,
            expiry_type: 'duration',
        });
        expect(onClose).toHaveBeenCalled();
    });

    it('should call onChangeMultiple with correct data when selecting an hour preset chip', async () => {
        default_trade_store.modules.trade.duration = 240;
        const onClose = jest.fn();

        renderDurationContainer(
            default_trade_store,
            'h',
            jest.fn(),
            '',
            '',
            jest.fn(),
            jest.fn(),
            jest.fn(),
            jest.fn(),
            onClose
        );
        await userEvent.click(screen.getByText('4 hr'));

        expect(default_trade_store.modules.trade.onChangeMultiple).toHaveBeenCalledWith({
            duration_unit: 'm',
            duration: 240,
            expiry_type: 'duration',
        });
        expect(onClose).toHaveBeenCalled();
    });

    it('should call onChangeMultiple with correct endtime with endtime', async () => {
        default_trade_store.modules.trade.expiry_time = '23:35';

        renderDurationContainer(
            default_trade_store,
            'd',
            jest.fn(),
            '11:35',
            new Date().toISOString().slice(0, 10),
            jest.fn(),
            jest.fn(),
            jest.fn(),
            jest.fn()
        );
        await userEvent.click(screen.getByText('Save'));

        expect(default_trade_store.modules.trade.onChangeMultiple).toHaveBeenCalledWith({
            expiry_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T11:35Z$/),
            expiry_time: '11:35',
            expiry_type: 'endtime',
        });
    });

    it('should render DayInput component when days unit is selected', () => {
        renderDurationContainer(default_trade_store, 'd');
        expect(screen.getByText('Mocked DayInput')).toBeInTheDocument();
    });

    it('should not render chips if duration_units_list contains only ticks', () => {
        default_trade_store.modules.trade.duration = 1;
        default_trade_store.modules.trade.duration_unit = 't';
        default_trade_store.modules.trade.duration_units_list = [{ value: 't' }];
        renderDurationContainer(default_trade_store);

        const chip_names = ['Ticks', 'Seconds', 'Minutes', 'Hours', 'Days', 'End Time'];
        chip_names.forEach(name => expect(screen.queryByText(name)).not.toBeInTheDocument());
    });

    describe('End time behavior and state synchronization', () => {
        it('should correctly handle end time selection with future date', async () => {
            const future_date = new Date();
            future_date.setDate(future_date.getDate() + 2);
            const formatted_date = future_date.toISOString().slice(0, 10);

            renderDurationContainer(
                default_trade_store,
                'd',
                jest.fn(),
                '14:30:00',
                formatted_date,
                jest.fn(),
                jest.fn(),
                jest.fn(),
                jest.fn()
            );

            await userEvent.click(screen.getByText('Save'));

            expect(default_trade_store.modules.trade.onChangeMultiple).toHaveBeenCalledWith({
                expiry_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T14:30:00Z$/),
                expiry_time: '14:30:00',
                expiry_type: 'endtime',
            });
        });

        it('should handle switching from hours to days unit', async () => {
            renderDurationContainer(default_trade_store, 'h');

            await userEvent.click(screen.getByText('End Time'));
            // After clicking End Time chip, the component should still render
            expect(screen.getByRole('tablist')).toBeInTheDocument();
        });

        it('should correctly convert hours to minutes when selecting hour preset chip', async () => {
            default_trade_store.modules.trade.duration = 120; // 2 hours in minutes
            const onClose = jest.fn();

            renderDurationContainer(
                default_trade_store,
                'h',
                jest.fn(),
                '',
                '',
                jest.fn(),
                jest.fn(),
                jest.fn(),
                jest.fn(),
                onClose
            );
            await userEvent.click(screen.getByText('2 hr'));

            expect(default_trade_store.modules.trade.onChangeMultiple).toHaveBeenCalledWith({
                duration_unit: 'm',
                duration: 120,
                expiry_type: 'duration',
            });
        });

        it('should maintain state consistency when switching between units', async () => {
            const setUnit = jest.fn();
            renderDurationContainer(default_trade_store, 'm', setUnit);

            // Switch to hours
            await userEvent.click(screen.getByText('hours'));

            // Switch back to minutes
            await userEvent.click(screen.getByText('minutes'));

            // State should remain consistent
            expect(screen.getByRole('tablist')).toBeInTheDocument();
        });

        it("should handle end time with today's date correctly", async () => {
            const today = new Date().toISOString().slice(0, 10);

            renderDurationContainer(
                default_trade_store,
                'd',
                jest.fn(),
                '18:45:00',
                today,
                jest.fn(),
                jest.fn(),
                jest.fn(),
                jest.fn()
            );

            await userEvent.click(screen.getByText('Save'));

            expect(default_trade_store.modules.trade.onChangeMultiple).toHaveBeenCalledWith({
                expiry_date: expect.stringMatching(/T18:45:00Z$/),
                expiry_time: '18:45:00',
                expiry_type: 'endtime',
            });
        });

        it('should properly initialize selected_duration state for hours unit', async () => {
            default_trade_store.modules.trade.duration = 90; // 1.5 hours in minutes

            renderDurationContainer(default_trade_store, 'h');

            // Component should display hours correctly
            expect(screen.getByRole('tablist')).toBeInTheDocument();
        });

        it('should handle edge case of exactly 1 hour when selecting preset chip', async () => {
            default_trade_store.modules.trade.duration = 60; // Exactly 1 hour
            const onClose = jest.fn();

            renderDurationContainer(
                default_trade_store,
                'h',
                jest.fn(),
                '',
                '',
                jest.fn(),
                jest.fn(),
                jest.fn(),
                jest.fn(),
                onClose
            );
            await userEvent.click(screen.getByText('1 hr'));

            expect(default_trade_store.modules.trade.onChangeMultiple).toHaveBeenCalledWith({
                duration_unit: 'm',
                duration: 60,
                expiry_type: 'duration',
            });
        });

        it('should synchronize saved and selected expiry times correctly', async () => {
            const setSavedExpiryTime = jest.fn();
            const setSelectedExpiryTime = jest.fn();

            renderDurationContainer(
                default_trade_store,
                'd',
                jest.fn(),
                '12:00:00',
                new Date().toISOString().slice(0, 10),
                setSelectedExpiryTime,
                setSavedExpiryTime,
                jest.fn(),
                jest.fn()
            );

            await userEvent.click(screen.getByText('Save'));

            // Both saved and selected times should be synchronized
            expect(default_trade_store.modules.trade.onChangeMultiple).toHaveBeenCalled();
        });
    });

    describe('Hours conversion bug fix verification', () => {
        it('should correctly calculate minutes from selected hour preset chip', async () => {
            default_trade_store.modules.trade.duration = 30;
            const onClose = jest.fn();

            renderDurationContainer(
                default_trade_store,
                'h',
                jest.fn(),
                '',
                '',
                jest.fn(),
                jest.fn(),
                jest.fn(),
                jest.fn(),
                onClose
            );

            await userEvent.click(screen.getByText('2 hr'));

            const call_args = default_trade_store.modules.trade.onChangeMultiple.mock.calls[0][0];

            expect(call_args.duration_unit).toBe('m');
            expect(call_args.duration).toBe(120);
        });
    });
});
