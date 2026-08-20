import React from 'react';

import { ActionSheet, Skeleton, WheelPicker } from '@deriv-com/quill-ui';

import { useBlockSheetSwipe } from 'AppV2/Hooks/useBlockSheetSwipe';
import { WHEEL_PICKER_HEIGHT } from 'AppV2/Utils/trade-params-utils';
import { useTraderStore } from 'Stores/useTraderStores';

type TMultiplierWheelPickerProps = {
    multiplier_range_list: ReturnType<typeof useTraderStore>['multiplier_range_list'];
    selected_multiplier: number;
    setSelectedMultiplier: (multiplier: number) => void;
};

const MultiplierWheelPicker = ({
    multiplier_range_list = [],
    selected_multiplier,
    setSelectedMultiplier,
}: TMultiplierWheelPickerProps) => {
    // Memoised: a new array identity makes quill's wheel reset its list, re-centre itself and write a
    // value back to the parent — mid-scroll that fights the user and can commit a stale value.
    const multiplier_array = React.useMemo(
        () => multiplier_range_list.map(item => ({ value: item.text })),
        [multiplier_range_list]
    );
    const block_sheet_swipe = useBlockSheetSwipe();

    const handlePickerValuesChange = (value: string | number) => {
        const new_value = Number((value as string).slice(1));
        if (new_value === selected_multiplier) return;
        setSelectedMultiplier(new_value);
    };

    return (
        <ActionSheet.Content className='multiplier__picker'>
            <div className='multiplier__wheel-picker' {...block_sheet_swipe}>
                {multiplier_array.length ? (
                    <WheelPicker
                        data={multiplier_array}
                        selectedValue={`x${selected_multiplier}`}
                        setSelectedValue={handlePickerValuesChange}
                        containerHeight={WHEEL_PICKER_HEIGHT}
                    />
                ) : (
                    <Skeleton.Square />
                )}
            </div>
        </ActionSheet.Content>
    );
};

export default MultiplierWheelPicker;
