import React from 'react';
import clsx from 'clsx';

import { observer } from '@deriv/stores';
import { WheelPickerContainer } from '@deriv-com/quill-ui';

import {
    clampTimeWheelSelection,
    getTicksWheelOptions,
    getTimeWheelColumnOptions,
    getTimeWheelColumnRange,
    getTimeWheelVisibleUnits,
    TIME_WHEEL_UNITS,
} from 'AppV2/Utils/trade-params-utils';
import { useTraderStore } from 'Stores/useTraderStores';

const getWheelPickerHeight = (is_single_unit: boolean) => (is_single_unit ? '230px' : '268px');

const WheelContainer = ({ is_single_unit, children }: { is_single_unit: boolean; children: React.ReactNode }) => (
    <div
        className={clsx('duration-container__wheel-picker-container', {
            'duration-container__wheel-picker-container__single': is_single_unit,
        })}
    >
        {children}
    </div>
);

export const DurationTicksWheel = observer(
    ({
        selected_ticks,
        setSelectedTicks,
        onRequestClose,
    }: {
        selected_ticks: number;
        setSelectedTicks: (arg: number) => void;
        onRequestClose: () => void;
    }) => {
        const { duration_min_max, duration_units_list } = useTraderStore();
        const options = React.useMemo(() => getTicksWheelOptions(duration_min_max), [duration_min_max]);
        const is_single_unit = duration_units_list.length === 1;

        // Tapping an item selects it and dismisses the sheet: pick the tapped option by its position in
        // the column, apply it, then ask the sheet to commit + close.
        const handleItemClick = (event: React.MouseEvent<HTMLDivElement>) => {
            const item = (event.target as HTMLElement).closest('.quill-wheel-picker__data-item');
            const list = item?.closest('.quill-wheel-picker__data-items');
            if (!item || !list) return;
            const index = Array.from(list.querySelectorAll('.quill-wheel-picker__data-item')).indexOf(item);
            const value = options[index]?.value;
            if (value == null) return;
            setSelectedTicks(Number(value));
            onRequestClose();
        };

        return (
            <WheelContainer is_single_unit={is_single_unit}>
                <div onClick={handleItemClick}>
                    <WheelPickerContainer
                        data={[options]}
                        containerHeight={getWheelPickerHeight(is_single_unit)}
                        inputValues={[selected_ticks]}
                        setInputValues={(_, value) => setSelectedTicks(Number(value))}
                    />
                </div>
            </WheelContainer>
        );
    }
);

// How long after the last wheel movement an invalid combination snaps back into range
const SNAP_BACK_DELAY_MS = 300;

export const DurationTimeWheel = observer(
    ({
        selected_time,
        setSelectedTime,
        onRequestClose,
    }: {
        selected_time: number[];
        setSelectedTime: (arg: number[]) => void;
        onRequestClose: () => void;
    }) => {
        const { duration_min_max, duration_units_list } = useTraderStore();
        const intraday = duration_min_max?.intraday;
        const visible_units = React.useMemo(() => getTimeWheelVisibleUnits(duration_units_list), [duration_units_list]);
        const is_single_unit = duration_units_list.length === 1;

        const wheel_ref = React.useRef<HTMLDivElement>(null);

        // The quill wheel attaches its scroll listener once per data identity and keeps calling
        // the setInputValues callback captured back then. With static columns that callback would
        // read a stale selection (e.g. scrolling seconds would wipe a minutes change), so wheel
        // events always read and write the latest selection through this ref.
        const selected_time_ref = React.useRef(selected_time);
        React.useEffect(() => {
            selected_time_ref.current = selected_time;
        }, [selected_time]);
        const updateSelectedTime = (next: number[]) => {
            selected_time_ref.current = next;
            setSelectedTime(next);
        };

        // Column ranges are static (a value shows if it is valid in at least one combination), so
        // scrolling one column never rebuilds another and the wheels keep their scroll positions
        const data = React.useMemo(
            () => (intraday ? visible_units.map(unit => getTimeWheelColumnOptions(unit, visible_units, intraday)) : []),
            [visible_units, intraday]
        );

        // The quill wheel does not re-center on its selected value, so drive its list to the
        // target item with the same smooth motion it uses when an item is tapped
        const scrollColumnToValue = React.useCallback(
            (column_index: number, value: number) => {
                const list = wheel_ref.current?.querySelectorAll('.quill-wheel-picker__data-items')[column_index];
                const item_index = data[column_index]?.findIndex(option => option.value === value);
                if (!list || item_index === undefined || item_index < 0) return;
                list.querySelectorAll('.quill-wheel-picker__data-item')[item_index]?.scrollIntoView({
                    block: 'center',
                    behavior: 'smooth',
                    inline: 'nearest',
                });
            },
            [data]
        );

        // Let the user scroll through invalid combinations (e.g. 13 sec on a 15s-minimum
        // contract), then scroll back to the closest valid one once the wheel settles
        React.useEffect(() => {
            if (!intraday) return;
            const timer = setTimeout(() => {
                const clamped = clampTimeWheelSelection(visible_units, intraday, selected_time);
                if (clamped.every((value, index) => value === selected_time[index])) return;

                updateSelectedTime(clamped);
                visible_units.forEach((unit, column_index) => {
                    const unit_index = TIME_WHEEL_UNITS.indexOf(unit);
                    if (clamped[unit_index] !== selected_time[unit_index]) {
                        scrollColumnToValue(column_index, clamped[unit_index]);
                    }
                });
            }, SNAP_BACK_DELAY_MS);
            return () => clearTimeout(timer);
        }, [visible_units, intraday, selected_time, setSelectedTime, scrollColumnToValue]);

        if (!intraday) return null;

        const onWheelChange = (column_index: number, value: string | number) => {
            const unit = visible_units[column_index];
            const prev = selected_time_ref.current;
            const next = [...prev];
            next[TIME_WHEEL_UNITS.indexOf(unit)] = Number(value);

            // A finer column sitting at its forced minimum follows that minimum when a coarser
            // change relaxes it (0 min 15 sec → scrolling minutes to 1 gives 1 min 0 sec)
            visible_units.slice(column_index + 1).forEach((finer_unit, offset) => {
                const finer_index = TIME_WHEEL_UNITS.indexOf(finer_unit);
                const old_min = getTimeWheelColumnRange(finer_unit, visible_units, intraday, prev).min;
                const new_min = getTimeWheelColumnRange(finer_unit, visible_units, intraday, next).min;
                if (prev[finer_index] === old_min && new_min < old_min) {
                    next[finer_index] = new_min;
                    scrollColumnToValue(column_index + 1 + offset, new_min);
                }
            });

            updateSelectedTime(next);
        };

        // Tapping an item selects it and dismisses the sheet: resolve which column + option was tapped,
        // apply it through the same change handler (so finer units follow), then commit + close.
        const handleItemClick = (event: React.MouseEvent<HTMLDivElement>) => {
            const item = (event.target as HTMLElement).closest('.quill-wheel-picker__data-item');
            const list = item?.closest('.quill-wheel-picker__data-items');
            if (!item || !list || !wheel_ref.current) return;
            const column_index = Array.from(
                wheel_ref.current.querySelectorAll('.quill-wheel-picker__data-items')
            ).indexOf(list);
            const item_index = Array.from(list.querySelectorAll('.quill-wheel-picker__data-item')).indexOf(item);
            const value = data[column_index]?.[item_index]?.value;
            if (column_index < 0 || value == null) return;
            onWheelChange(column_index, value);
            onRequestClose();
        };

        return (
            <WheelContainer is_single_unit={is_single_unit}>
                <div ref={wheel_ref} onClick={handleItemClick}>
                    <WheelPickerContainer
                        data={data}
                        containerHeight={getWheelPickerHeight(is_single_unit)}
                        inputValues={visible_units.map(unit => selected_time[TIME_WHEEL_UNITS.indexOf(unit)])}
                        setInputValues={onWheelChange}
                    />
                </div>
            </WheelContainer>
        );
    }
);
