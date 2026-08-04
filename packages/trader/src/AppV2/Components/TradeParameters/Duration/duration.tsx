import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';

import { getUnitMap, isMobile, mapErrorMessage, trackAnalyticsEvent } from '@deriv/shared';
import { useStore } from '@deriv/stores';
import { ActionSheet, TextField, useSnackbar } from '@deriv-com/quill-ui';
import { Localize, useTranslations } from '@deriv-com/translations';

import {
    clampTimeWheelSelection,
    DURATION_TAB,
    DURATION_UNIT,
    getDurationFromTimeWheelSelection,
    getDurationTab,
    getTickWheelRange,
    getTimeWheelSelectionFromDuration,
    getTimeWheelVisibleUnits,
    isValidPersistedDuration,
} from 'AppV2/Utils/trade-params-utils';
import { getDisplayedContractTypes } from 'AppV2/Utils/trade-types-utils';
import { useTraderStore } from 'Stores/useTraderStores';

import { AutomationLockOverlay, StepperButtons } from '../Shared';
import { TTradeParametersProps } from '../trade-parameters';

import DurationActionSheetContainer from './container';
import DurationDesktop from './duration-desktop';

const Duration = observer(({ is_minimized }: TTradeParametersProps) => {
    const is_mobile = isMobile();
    const {
        applyDefaultDuration,
        contract_type,
        duration_min_max,
        duration_unit,
        duration_units_list,
        duration,
        expiry_epoch,
        expiry_time,
        expiry_type,
        is_automation_params_locked,
        is_market_closed,
        onChangeMultiple,
        proposal_info,
        saved_expiry_date_v2: saved_expiry_date,
        setSavedExpiryDateV2: setSavedExpiryDate,
        setUnsavedExpiryDateV2: setSelectedExpiryDate,
        symbol,
        trade_type_tab,
        trade_types,
        unsaved_expiry_date_v2: selected_expiry_date,
        validation_errors,
    } = useTraderStore();
    const { addSnackbar } = useSnackbar();
    const { name_plural, name, name_singular } = getUnitMap()[duration_unit] ?? {};
    const duration_unit_text = (duration === 1 ? name_singular : name_plural) ?? name;
    const [is_open, setOpen] = useState(false);
    const [saved_expiry_time, setSavedExpiryTime] = useState<string>('');
    const [selected_expiry_time, setSelectedExpiryTime] = useState<string>('');
    const [tab, setTab] = useState<string>(getDurationTab(duration_unit, expiry_type === 'endtime'));
    const [selected_ticks, setSelectedTicks] = useState<number>(duration_unit === DURATION_UNIT.TICKS ? duration : 1);
    const [selected_time, setSelectedTime] = useState<number[]>(
        getTimeWheelSelectionFromDuration(duration, duration_unit)
    );
    const contract_type_object = getDisplayedContractTypes(trade_types, contract_type, trade_type_tab);
    const has_error =
        (proposal_info[contract_type_object[0]]?.has_error &&
            proposal_info[contract_type_object[0]]?.error_field === 'duration') ||
        (validation_errors.duration?.length ?? 0) > 0;
    const isInitialMount = useRef(true);
    const prevExpiryEpoch = useRef<string | number | null>(null);
    const { client } = useStore();
    const { is_logged_in } = client;
    const { localize } = useTranslations();

    // Initialize saved date/time from expiry_epoch or set defaults
    useEffect(() => {
        if (!expiry_epoch) return;

        // Only sync from expiry_epoch if it actually changed (not from our own update)
        if (prevExpiryEpoch.current === expiry_epoch) return;

        prevExpiryEpoch.current = expiry_epoch;

        const epoch_date = new Date((expiry_epoch as number) * 1000);
        const date_string = epoch_date.toISOString().split('T')[0];
        const time_string = epoch_date.toISOString().split('T')[1].substring(0, 8);

        // Only update if the date actually changed
        if (saved_expiry_date !== date_string) {
            setSavedExpiryDate(date_string);
            setSavedExpiryTime(time_string || '23:59:59');
        }
    }, [expiry_epoch]);

    // When switching to days unit, set tomorrow as default
    useEffect(() => {
        if (duration_unit === 'd' && !saved_expiry_date) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const formatted_date = tomorrow.toISOString().split('T')[0];

            setSavedExpiryDate(formatted_date);
            setSavedExpiryTime('23:59:59');

            onChangeMultiple({
                expiry_date: `${formatted_date}T23:59:59Z`,
                expiry_type: 'endtime',
            });
        }
    }, [duration_unit, saved_expiry_date]);

    useEffect(() => {
        if (isInitialMount.current) {
            const timer = setTimeout(() => {
                isInitialMount.current = false;
            }, 500);
            return () => clearTimeout(timer);
        }

        // Safety net: reset to the configured default when the persisted duration is invalid for the
        // current constraints. Trade-type switches themselves are handled in the store (onChange), so
        // this survives even if the component remounts on a switch.
        const isPersistedDurationValid = isValidPersistedDuration(
            duration,
            duration_unit,
            duration_min_max,
            duration_units_list
        );

        if (!isPersistedDurationValid) {
            const start_duration = setTimeout(() => applyDefaultDuration(), 10);
            return () => clearTimeout(start_duration);
        }
    }, [symbol, contract_type, duration_min_max, duration_units_list, duration, duration_unit]);

    // Wheel selections apply once, when the sheet closes (End time commits via its own Save button)
    const onClose = React.useCallback(() => {
        if (is_open && tab !== DURATION_TAB.END_TIME) {
            // The sheet can close inside the wheel's snap-back window, so clamp here as well
            const clamped_time = duration_min_max?.intraday
                ? clampTimeWheelSelection(
                      getTimeWheelVisibleUnits(duration_units_list),
                      duration_min_max.intraday,
                      selected_time
                  )
                : selected_time;
            const next =
                tab === DURATION_TAB.TICKS
                    ? { duration: selected_ticks, duration_unit: DURATION_UNIT.TICKS }
                    : getDurationFromTimeWheelSelection(clamped_time, duration_units_list);
            // Compare normalized selections, not raw unit/value: the wheel commits hours as
            // minutes, so e.g. a stored 2h must count as unchanged against a 120min selection
            const is_unchanged =
                expiry_type === 'duration' &&
                (tab === DURATION_TAB.TICKS
                    ? duration_unit === DURATION_UNIT.TICKS && duration === next.duration
                    : getTimeWheelSelectionFromDuration(duration, duration_unit).every(
                          (value, index) => value === clamped_time[index]
                      ));

            if (!is_unchanged && next.duration > 0) {
                setSavedExpiryDate(selected_expiry_date);
                setSavedExpiryTime(selected_expiry_time);
                setSelectedExpiryTime('');

                onChangeMultiple({ ...next, expiry_type: 'duration' });

                trackAnalyticsEvent('ce_trade_types_form_v2', {
                    action: 'customizing_trades',
                    input_method: 'custom',
                    parameter_type: 'duration',
                });
            }
        }
        setOpen(false);
    }, [
        is_open,
        tab,
        selected_ticks,
        selected_time,
        expiry_type,
        duration,
        duration_unit,
        duration_min_max,
        duration_units_list,
        selected_expiry_date,
        selected_expiry_time,
        onChangeMultiple,
        setSavedExpiryDate,
    ]);

    const getInputValues = () => {
        const formatted_date = saved_expiry_date
            ? new Date(saved_expiry_date).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
              })
            : '';

        // Check if selected date is today
        const formatted_current_date = new Date().toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
        const is_today = formatted_date === formatted_current_date;

        if (expiry_type == 'duration') {
            const is_time_unit = [DURATION_UNIT.SECONDS, DURATION_UNIT.MINUTES, DURATION_UNIT.HOURS].includes(
                duration_unit
            );
            if (is_time_unit) {
                const [hours, minutes, seconds] = getTimeWheelSelectionFromDuration(duration, duration_unit);
                // With an hour component the value reads as a clock (01:01:01); below an hour it
                // stays verbose (1 minute 1 second); single-unit values fall through ('30 sec')
                if (hours > 0) {
                    const pad = (value: number) => String(value).padStart(2, '0');
                    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
                }
                if (duration > 59) {
                    return [
                        minutes ? `${minutes} ${minutes > 1 ? localize('minutes') : localize('minute')}` : '',
                        seconds ? `${seconds} ${seconds > 1 ? localize('seconds') : localize('second')}` : '',
                    ]
                        .filter(Boolean)
                        .join(' ');
                }
            }
            if (duration_unit === 'd') {
                if (!formatted_date) {
                    return '';
                }
                // For today: show HH:mm, for future: show HH:mm:ss
                const time_display = is_today
                    ? saved_expiry_time.substring(0, 5) // HH:mm
                    : saved_expiry_time; // HH:mm:ss
                return `${localize('Ends on')} ${formatted_date}, ${time_display} GMT`;
            }
            return `${duration} ${duration_unit_text}`;
        }
        if (expiry_time) {
            // For today: show HH:mm, for future: show HH:mm:ss
            const time_display = is_today
                ? expiry_time.substring(0, 5) // HH:mm
                : `${expiry_time}`; // HH:mm:ss
            return `${localize('Ends on')} ${formatted_date}, ${time_display} GMT`;
        }
    };

    useEffect(() => {
        if (has_error && !is_minimized) {
            const error_obj = proposal_info[contract_type_object[0]] || validation_errors?.duration?.[0];
            if (error_obj?.error_field === 'duration') {
                addSnackbar({
                    message: mapErrorMessage(error_obj),
                    status: 'fail',
                    hasCloseButton: true,
                    hasFixedHeight: false,
                    style: {
                        marginBottom: is_logged_in ? '48px' : '-8px',
                        width: 'calc(100% - var(--core-spacing-800)',
                    },
                });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [has_error, contract_type_object[0]]);

    useEffect(() => {
        if (is_open) {
            // Initialize selected values from saved values when opening
            setSelectedExpiryDate(saved_expiry_date);
            setSelectedExpiryTime(saved_expiry_time);

            setTab(getDurationTab(duration_unit, !!expiry_time));

            // Clamp into the current contract's range up-front: the wheels reset out-of-range
            // values to their first option, which would lose the stored selection
            const { min: tick_min, max: tick_max } = getTickWheelRange(duration_min_max);
            setSelectedTicks(
                duration_unit === DURATION_UNIT.TICKS ? Math.min(tick_max, Math.max(tick_min, duration)) : tick_min
            );
            const time_selection = getTimeWheelSelectionFromDuration(duration, duration_unit);
            setSelectedTime(
                duration_min_max?.intraday
                    ? clampTimeWheelSelection(
                          getTimeWheelVisibleUnits(duration_units_list),
                          duration_min_max.intraday,
                          time_selection
                      )
                    : time_selection
            );
        }
    }, [is_open, saved_expiry_date, saved_expiry_time]);

    // Render desktop version for desktop devices
    if (!is_mobile) {
        return <DurationDesktop is_minimized={is_minimized} />;
    }

    // Inline steppers (expanded, non-endtime, non-days). Ticks step ±1 tick; time durations step by
    // the finest available unit (usually 1s) and roll across units — 59s → 1min → 1min 1sec.
    const is_tick_duration = duration_unit === DURATION_UNIT.TICKS;
    const tick_range = getTickWheelRange(duration_min_max);
    const intraday = duration_min_max?.intraday;
    const time_step_seconds = (() => {
        const visible = getTimeWheelVisibleUnits(duration_units_list);
        if (visible.includes(DURATION_UNIT.SECONDS)) return 1;
        if (visible.includes(DURATION_UNIT.MINUTES)) return 60;
        return 3600;
    })();
    const [step_h, step_m, step_s] = getTimeWheelSelectionFromDuration(duration, duration_unit);
    const total_seconds = step_h * 3600 + step_m * 60 + step_s;
    const show_steppers = !is_minimized && expiry_type !== 'endtime' && duration_unit !== DURATION_UNIT.DAYS;

    const stepDuration = (direction: 1 | -1) => {
        if (is_tick_duration) {
            const next = Math.min(tick_range.max, Math.max(tick_range.min, duration + direction));
            if (next !== duration) onChangeMultiple({ duration_unit, duration: next, expiry_type: 'duration' });
            return;
        }
        if (!intraday) return;
        const next_total = Math.min(
            intraday.max,
            Math.max(intraday.min, total_seconds + direction * time_step_seconds)
        );
        if (next_total === total_seconds) return;
        const next_hms = [Math.floor(next_total / 3600), Math.floor((next_total % 3600) / 60), next_total % 60];
        onChangeMultiple({
            ...getDurationFromTimeWheelSelection(next_hms, duration_units_list),
            expiry_type: 'duration',
        });
    };

    const decrement_disabled =
        is_market_closed ||
        is_automation_params_locked ||
        (is_tick_duration ? duration <= tick_range.min : total_seconds <= (intraday?.min ?? 0));
    const increment_disabled =
        is_market_closed ||
        is_automation_params_locked ||
        (is_tick_duration ? duration >= tick_range.max : total_seconds >= (intraday?.max ?? Number.MAX_SAFE_INTEGER));

    // Render mobile version (ActionSheet) for mobile devices
    return (
        <>
            <div className='trade-params__field-locked'>
                <TextField
                    variant='fill'
                    readOnly
                    label={
                        <Localize i18n_default_text='Duration' key={`duration${is_minimized ? '-minimized' : ''}`} />
                    }
                    value={getInputValues()}
                    noStatusIcon
                    disabled={is_market_closed || is_automation_params_locked}
                    className={clsx('trade-params__option', is_minimized && 'trade-params__option--minimized')}
                    onClick={() => setOpen(true)}
                    status={has_error ? 'error' : 'neutral'}
                    rightIcon={
                        show_steppers ? (
                            <StepperButtons
                                onDecrement={() => stepDuration(-1)}
                                onIncrement={() => stepDuration(1)}
                                decrement_disabled={decrement_disabled}
                                increment_disabled={increment_disabled}
                            />
                        ) : undefined
                    }
                />
                {is_automation_params_locked && <AutomationLockOverlay />}
            </div>
            <ActionSheet.Root
                isOpen={is_open}
                onClose={onClose}
                position='left'
                expandable={false}
                shouldBlurOnClose={is_open}
            >
                <ActionSheet.Portal shouldCloseOnDrag>
                    <DurationActionSheetContainer
                        tab={tab}
                        setTab={setTab}
                        selected_ticks={selected_ticks}
                        setSelectedTicks={setSelectedTicks}
                        selected_time={selected_time}
                        setSelectedTime={setSelectedTime}
                        selected_expiry_time={selected_expiry_time}
                        selected_expiry_date={selected_expiry_date}
                        setSelectedExpiryTime={setSelectedExpiryTime}
                        setSavedExpiryTime={setSavedExpiryTime}
                        setSelectedExpiryDate={setSelectedExpiryDate}
                        setSavedExpiryDate={setSavedExpiryDate}
                    />
                </ActionSheet.Portal>
            </ActionSheet.Root>
        </>
    );
});

export default Duration;
