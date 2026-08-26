import React from 'react';

import { type Dayjs, dayjs, toMoment } from '@deriv/shared';
import { ActionSheet, DatePicker } from '@deriv-com/quill-ui';
import { Localize, useTranslations } from '@deriv-com/translations';

import { DEFAULT_DATE_FORMATTING_CONFIG } from 'AppV2/Utils/positions-utils';

type TDateRangePicker = {
    applyHandler: () => void;
    handleDateChange: (
        values: { to?: Dayjs; from?: Dayjs; is_batch?: boolean },
        otherParams?: {
            date_range?: Record<string, string | number>;
            shouldFilterContractTypes?: boolean;
        }
    ) => void;
    onClose: () => void;
    isOpen?: boolean;
    setCustomTimeRangeFilter: (newCustomTimeFilter?: string | undefined) => void;
};
const DateRangePicker = ({
    applyHandler,
    handleDateChange,
    onClose,
    isOpen,
    setCustomTimeRangeFilter,
}: TDateRangePicker) => {
    const [chosenRangeString, setChosenRangeString] = React.useState<string>();
    const [chosenRange, setChosenRange] = React.useState<(string | null | Date)[] | null | Date>([]);
    const { localize } = useTranslations();

    // Header save stays disabled until a range is actually chosen (the previous footer gate).
    const is_save_disabled = !chosenRangeString || !(Array.isArray(chosenRange) && chosenRange.length);

    const onApply = () => {
        setCustomTimeRangeFilter(chosenRangeString);
        if (Array.isArray(chosenRange) && chosenRange.length) {
            handleDateChange(
                {
                    from: toMoment(chosenRange[0]),
                    to: chosenRange[1] ? toMoment(chosenRange[1]) : dayjs(chosenRange[0] as Date | string).endOf('day'),
                },
                { shouldFilterContractTypes: true }
            );
        }
        applyHandler();
    };

    const onFormattedDate = (value: string) => {
        const trimmedValue = value.trim();
        const partialRange = trimmedValue.endsWith('-');
        setChosenRangeString(partialRange ? trimmedValue.substring(0, trimmedValue.length - 1) : trimmedValue);
    };

    return (
        <ActionSheet.Root isOpen={isOpen} onClose={onClose} position='left' expandable={false}>
            <ActionSheet.Portal showHandlebar={false} shouldDetectSwipingOnContainer shouldCloseOnDrag>
                <ActionSheet.Header
                    title={<Localize i18n_default_text='Choose a date range' />}
                    closeAction={{ ariaLabel: localize('Close') }}
                    saveAction={{ onAction: onApply, ariaLabel: localize('Save') }}
                    isSaveActionDisabled={is_save_disabled}
                    shouldCloseOnSaveActionClick
                />
                <ActionSheet.Content>
                    <DatePicker
                        allowPartialRange
                        className='date-picker__action-sheet'
                        locale='en-GB'
                        selectRange
                        onFormattedDate={onFormattedDate}
                        onChange={setChosenRange}
                        optionsConfig={DEFAULT_DATE_FORMATTING_CONFIG}
                        tileDisabled={({ date }) => Date.parse(date.toDateString()) > Date.parse(toMoment().toString())}
                        maxDate={new Date()}
                    />
                </ActionSheet.Content>
            </ActionSheet.Portal>
        </ActionSheet.Root>
    );
};

export default DateRangePicker;
