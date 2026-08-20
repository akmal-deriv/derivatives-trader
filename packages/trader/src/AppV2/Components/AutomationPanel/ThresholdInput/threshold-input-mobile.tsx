import React from 'react';

import { getCurrencyDisplayCode, getDecimalPlaces } from '@deriv/shared';
import { ActionSheet, TextField } from '@deriv-com/quill-ui';
import { useTranslations } from '@deriv-com/translations';

import { ActionSheetHeaderTitle } from 'AppV2/Components/ActionSheetHeaderTooltip';
import { AutomationLockOverlay } from 'AppV2/Components/TradeParameters/Shared';
import { createDecimalInputGuard, getDecimalInputMaxLength } from 'AppV2/Utils/decimal-input';

type TThresholdInputMobileProps = {
    threshold_type: 'take_profit' | 'stop_loss';
    description?: string;
    currency: string;
    initialValue: number;
    disabled?: boolean;
    onSave: (value: number) => void;
};

const ThresholdInputMobile = ({
    threshold_type,
    description,
    currency,
    initialValue,
    disabled,
    onSave,
}: TThresholdInputMobileProps) => {
    const { localize } = useTranslations();
    const display_currency = getCurrencyDisplayCode(currency);
    const is_take_profit = threshold_type === 'take_profit';
    const [is_open, setIsOpen] = React.useState(false);
    const [value, setValue] = React.useState(String(initialValue));
    const [error, setError] = React.useState('');
    const decimals = getDecimalPlaces(currency);
    const onBeforeInput = createDecimalInputGuard(decimals);
    const label = is_take_profit ? localize('Profit threshold') : localize('Loss threshold');

    const onClose = React.useCallback(() => {
        setIsOpen(false);
        setValue(String(initialValue));
        setError('');
    }, [initialValue]);

    // Re-init the draft from the committed value whenever the sheet opens (dismiss = discard).
    React.useEffect(() => {
        if (is_open) {
            setValue(String(initialValue));
            setError('');
        }
    }, [is_open, initialValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
        setError('');
    };

    const handleSave = () => {
        const num = Number(value);
        if (!value || isNaN(num) || num <= 0) {
            setError(localize('Please enter a valid amount greater than 0'));
            return;
        }
        onSave(num);
        onClose();
    };

    const is_save_disabled = value === String(initialValue);

    return (
        <React.Fragment>
            <div className='trade-params__field-locked'>
                <TextField
                    variant='fill'
                    readOnly
                    disabled={disabled}
                    label={label}
                    value={`${initialValue} ${display_currency}`}
                    noStatusIcon
                    className='trade-params__option'
                    onClick={() => setIsOpen(true)}
                />
                {disabled && <AutomationLockOverlay />}
            </div>
            <ActionSheet.Root isOpen={is_open} onClose={onClose} position='left' expandable={false}>
                <ActionSheet.Portal showHandlebar={false} shouldDetectSwipingOnContainer shouldCloseOnDrag>
                    <ActionSheet.Header
                        title={<ActionSheetHeaderTitle title={label} description={description} label={label} />}
                        closeAction={{ ariaLabel: localize('Close') }}
                        saveAction={{ onAction: handleSave, ariaLabel: localize('Save') }}
                        isSaveActionDisabled={is_save_disabled}
                        shouldCloseOnSaveActionClick={false}
                    />
                    <ActionSheet.Content>
                        <div className='automation-popover__input-wrapper'>
                            <TextField
                                label={`${label} (${display_currency})`}
                                value={value}
                                onChange={handleChange}
                                onBeforeInput={onBeforeInput}
                                variant='fill'
                                inputMode='decimal'
                                customType='commaRemoval'
                                allowDecimals
                                decimals={decimals}
                                regex={/[^0-9.,]/g}
                                maxLength={getDecimalInputMaxLength(value, decimals)}
                                message={error || undefined}
                                status={error ? 'error' : 'neutral'}
                                noStatusIcon
                            />
                        </div>
                    </ActionSheet.Content>
                </ActionSheet.Portal>
            </ActionSheet.Root>
        </React.Fragment>
    );
};

export default ThresholdInputMobile;
