import React from 'react';

import { CaptionText, Text, TimeWheelPickerContainer } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

import { useBlockSheetSwipe } from 'AppV2/Hooks/useBlockSheetSwipe';
import { WHEEL_PICKER_HEIGHT } from 'AppV2/Utils/trade-params-utils';

const EndTimePicker = ({
    end_time,
    setEndTime,
    current_gmt_time,
    adjusted_start_time,
}: {
    end_time: string;
    setEndTime: (arg: string) => void;
    current_gmt_time: string;
    adjusted_start_time: string;
}) => {
    const block_sheet_swipe = useBlockSheetSwipe();
    return (
        <div className='duration-container__time-picker' {...block_sheet_swipe}>
            <TimeWheelPickerContainer
                is12Hour={false}
                startTimeIn24Format={adjusted_start_time}
                minutesInterval={5}
                selectedTime={end_time}
                setSelectedValue={val => setEndTime(val as string)}
                containerHeight={WHEEL_PICKER_HEIGHT}
                hoursInterval={1}
            />
            <div className='duration-container__endtime'>
                <CaptionText color='quill-typography__color--subtle'>
                    <Localize i18n_default_text='Current time' />
                </CaptionText>
                <Text size='sm'>{`${current_gmt_time} GMT`}</Text>
            </div>
        </div>
    );
};

export default EndTimePicker;
