import React, { useMemo } from 'react';

import { localize } from '@deriv-com/translations';

import { HorizontalTabSelector } from 'AppV2/Components/InputPopover';
import type { HorizontalTabItem } from 'AppV2/Components/InputPopover/horizontal-tab-selector';

const DurationChips = ({
    duration_units_list,
    onChangeUnit,
    unit,
}: {
    duration_units_list: { text: string; value: string }[];
    onChangeUnit: (arg: string) => void;
    unit: string;
}) => {
    const show_end_time = duration_units_list.length > 1;

    const items: HorizontalTabItem[] = useMemo(() => {
        const tabs = duration_units_list
            .filter(item => item.value !== 'd')
            .map(item => ({
                value: item.value,
                label: item.text,
            }));

        if (show_end_time) {
            tabs.push({ value: 'd', label: localize('End Time') });
        }

        return tabs;
    }, [duration_units_list, show_end_time]);

    if (!show_end_time) {
        return <></>;
    }

    return <HorizontalTabSelector items={items} selectedValue={unit} onSelect={onChangeUnit} />;
};

export default DurationChips;
