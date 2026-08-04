import React, { useMemo } from 'react';

import { localize } from '@deriv-com/translations';

import { HorizontalTabSelector } from 'AppV2/Components/InputPopover';
import type { HorizontalTabItem } from 'AppV2/Components/InputPopover/horizontal-tab-selector';
import { DURATION_TAB, DURATION_UNIT, getTimeWheelVisibleUnits } from 'AppV2/Utils/trade-params-utils';

const DurationTabs = ({
    duration_units_list,
    onChangeTab,
    tab,
}: {
    duration_units_list: { text: string; value: string }[];
    onChangeTab: (arg: string) => void;
    tab: string;
}) => {
    const show_tabs = duration_units_list.length > 1;

    const items: HorizontalTabItem[] = useMemo(() => {
        const tabs: HorizontalTabItem[] = [];

        if (duration_units_list.some(({ value }) => value === DURATION_UNIT.TICKS)) {
            tabs.push({ value: DURATION_TAB.TICKS, label: localize('Ticks') });
        }
        if (getTimeWheelVisibleUnits(duration_units_list).length) {
            tabs.push({ value: DURATION_TAB.TIME, label: localize('Time') });
        }
        tabs.push({ value: DURATION_TAB.END_TIME, label: localize('End time') });

        return tabs;
    }, [duration_units_list]);

    if (!show_tabs) {
        return <></>;
    }

    return <HorizontalTabSelector items={items} selectedValue={tab} onSelect={onChangeTab} />;
};

export default DurationTabs;
