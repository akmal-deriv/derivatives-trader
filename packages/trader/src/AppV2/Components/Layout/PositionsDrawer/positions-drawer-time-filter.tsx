import React from 'react';

import { TReportsStore } from '@deriv/reports/src/Stores/useReportsStores';
import { type Dayjs, toMoment } from '@deriv/shared';
import { observer } from '@deriv/stores';
import { useTranslations } from '@deriv-com/translations';

import useTimeFilter from 'AppV2/Hooks/useTimeFilter';

import PositionsDrawerDropdownFilter from './positions-drawer-dropdown-filter';

type TPositionsDrawerTimeFilterProps = {
    handleDateChange: TReportsStore['profit_table']['handleDateChange'];
};

const ALL_TIME = '0';

/**
 * Desktop equivalent of the mobile `<TimeFilter>` chip + bottom-sheet.
 * Owns the time-range options + applies the selection to the profit_table
 * store; rendering is delegated to the shared `PositionsDrawerDropdownFilter`.
 */
const PositionsDrawerTimeFilter = observer(({ handleDateChange }: TPositionsDrawerTimeFilterProps) => {
    const { localize } = useTranslations();
    const { timeFilter, setTimeFilter, customTimeRangeFilter, setCustomTimeRangeFilter } = useTimeFilter();

    const selected_value = customTimeRangeFilter || timeFilter || ALL_TIME;
    const is_active = !!(customTimeRangeFilter || timeFilter);

    const options = React.useMemo(
        () => [
            { value: ALL_TIME, label: localize('All time') },
            { value: 'Today', label: localize('Today') },
            { value: 'Yesterday', label: localize('Yesterday') },
            { value: '7', label: localize('Last 7 days') },
            { value: '30', label: localize('Last 30 days') },
            { value: '60', label: localize('Last 60 days') },
            { value: '90', label: localize('Last 90 days') },
        ],
        [localize]
    );

    const applyTimeFilter = (value: string) => {
        if (value === ALL_TIME) {
            setTimeFilter('');
            setCustomTimeRangeFilter('');
            handleDateChange({ to: toMoment().endOf('day'), is_batch: true }, { shouldFilterContractTypes: true });
            return;
        }

        const ranges: Record<string, { from: Dayjs; to: Dayjs }> = {
            Today: { from: toMoment().startOf('day'), to: toMoment().endOf('day') },
            Yesterday: {
                from: toMoment().subtract(1, 'days').startOf('day'),
                to: toMoment().subtract(1, 'days').endOf('day'),
            },
        };
        const default_range = {
            from: toMoment().startOf('day').subtract(Number(value), 'day').add(1, 's'),
            to: toMoment().endOf('day'),
        };

        setTimeFilter(value);
        setCustomTimeRangeFilter('');
        handleDateChange({ ...(ranges[value] ?? default_range), is_batch: true }, { shouldFilterContractTypes: true });
    };

    return (
        <PositionsDrawerDropdownFilter
            name='positions-drawer-time-filter'
            options={options}
            value={selected_value}
            isActive={is_active}
            onChange={applyTimeFilter}
        />
    );
});

export default PositionsDrawerTimeFilter;
