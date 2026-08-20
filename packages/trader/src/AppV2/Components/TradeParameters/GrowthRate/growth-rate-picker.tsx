import React from 'react';

import { Skeleton } from '@deriv/components';
import { getGrowthRatePercentage } from '@deriv/shared';
import { ActionSheet, Text, WheelPicker } from '@deriv-com/quill-ui';
import { Localize, useTranslations } from '@deriv-com/translations';

import { useBlockSheetSwipe } from 'AppV2/Hooks/useBlockSheetSwipe';
import { WHEEL_PICKER_HEIGHT } from 'AppV2/Utils/trade-params-utils';

type TGrowthRatePickerProps = {
    accumulator_range_list?: number[];
    maximum_ticks: number;
    onDetailClick?: (page_index: number) => void;
    onWheelChange: (growth_rate: number) => void;
    selected_growth_rate: number;
    should_show_details?: boolean;
    tick_size_barrier_percentage: string;
};

const GrowthRatePicker = ({
    accumulator_range_list = [],
    maximum_ticks,
    onDetailClick,
    onWheelChange,
    selected_growth_rate,
    should_show_details,
    tick_size_barrier_percentage,
}: TGrowthRatePickerProps) => {
    const block_sheet_swipe = useBlockSheetSwipe();
    const { localize } = useTranslations();
    // Memoised: a new array identity makes quill's wheel reset its list, re-centre itself and write a
    // value back to the parent — mid-scroll that fights the user and can commit a stale value.
    const data = React.useMemo(
        () => accumulator_range_list.map(rate => ({ value: `${getGrowthRatePercentage(rate)}%` })),
        [accumulator_range_list]
    );
    // Page indices in the host carousel (definition page dropped for a title tooltip).
    const details_content = [
        {
            key: 'barrier',
            label: <Localize i18n_default_text='Barrier' />,
            value: `±${tick_size_barrier_percentage}`,
            page_index: 1,
        },
        {
            key: 'max_duration',
            label: <Localize i18n_default_text='Max duration' />,
            value: `${maximum_ticks || 0} ${maximum_ticks === 1 ? localize('tick') : localize('ticks')}`,
            page_index: 2,
        },
    ];

    const handlePickerValuesChange = (value: string | number) => {
        const new_value = Number((value as string).slice(0, -1)) / 100;
        onWheelChange(new_value);
    };

    return (
        <ActionSheet.Content className='growth-rate__picker'>
            <div className='growth-rate__wheel-picker' {...block_sheet_swipe}>
                {accumulator_range_list.length ? (
                    <WheelPicker
                        containerHeight={WHEEL_PICKER_HEIGHT}
                        data={data}
                        selectedValue={`${getGrowthRatePercentage(selected_growth_rate)}%`}
                        setSelectedValue={handlePickerValuesChange}
                    />
                ) : (
                    <Skeleton />
                )}
            </div>
            <div className='growth-rate__details'>
                {details_content.map(({ key, label, value, page_index }) => (
                    <span
                        key={key}
                        className='growth-rate__details-item'
                        role='button'
                        tabIndex={0}
                        onClick={() => onDetailClick?.(page_index)}
                        onKeyDown={(e: React.KeyboardEvent) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onDetailClick?.(page_index);
                            }
                        }}
                    >
                        <Text
                            color='quill-typography__color--subtle'
                            size='sm'
                            className='growth-rate__details-item-label'
                        >
                            {label}
                        </Text>
                        <div className='growth-rate__details-item-value'>
                            {should_show_details ? (
                                <Text color='quill-typography__color--subtle' size='sm'>
                                    {value}
                                </Text>
                            ) : (
                                <Skeleton height={14} width={75} />
                            )}
                        </div>
                    </span>
                ))}
            </div>
        </ActionSheet.Content>
    );
};

export default GrowthRatePicker;
