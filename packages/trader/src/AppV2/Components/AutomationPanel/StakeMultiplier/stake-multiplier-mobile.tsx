import React from 'react';

import { ActionSheet, TextField } from '@deriv-com/quill-ui';
import { Localize, useTranslations } from '@deriv-com/translations';

import { ActionSheetHeaderTitle } from 'AppV2/Components/ActionSheetHeaderTooltip';
import { ValueChips } from 'AppV2/Components/InputPopover';
import { AutomationLockOverlay } from 'AppV2/Components/TradeParameters/Shared';
import { createDecimalInputGuard, getDecimalInputMaxLength } from 'AppV2/Utils/decimal-input';

import {
    MULTIPLIER_DECIMALS,
    MULTIPLIER_MAX,
    MULTIPLIER_MIN,
    MULTIPLIER_PRESETS,
    TAutomationConfig,
} from '../automation-config';

type TStakeMultiplierMobileProps = {
    strategy: TAutomationConfig['strategy'];
    selectedValue: number;
    description?: string;
    disabled?: boolean;
    onSelect: (value: number) => void;
};

const StakeMultiplierMobile = ({
    strategy,
    selectedValue,
    description,
    disabled,
    onSelect,
}: TStakeMultiplierMobileProps) => {
    const is_martingale = strategy === 'martingale';
    const { localize } = useTranslations();
    const [is_open, setIsOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState(String(selectedValue));
    const [error, setError] = React.useState('');
    const onBeforeInput = createDecimalInputGuard(MULTIPLIER_DECIMALS);
    const label = is_martingale ? localize('Stake multiplier') : localize('Stake increment');

    const range_message = is_martingale ? (
        <Localize i18n_default_text='Range {{min}} - {{max}}' values={{ min: MULTIPLIER_MIN, max: MULTIPLIER_MAX }} />
    ) : (
        <Localize i18n_default_text='Minimum 1' />
    );

    const onClose = React.useCallback(() => {
        setIsOpen(false);
        setInputValue(String(selectedValue));
        setError('');
    }, [selectedValue]);

    // Re-init the draft from the committed value whenever the sheet opens (dismiss = discard).
    React.useEffect(() => {
        if (is_open) {
            setInputValue(String(selectedValue));
            setError('');
        }
    }, [is_open, selectedValue]);

    // Presets fill the input rather than committing, matching the mobile Stake sheet — Save commits.
    const handlePresetSelect = React.useCallback((value: number) => {
        setInputValue(String(value));
        setError('');
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        setError('');
    };

    const handleInputSave = () => {
        const num = Number(inputValue);
        if (!inputValue || isNaN(num) || (is_martingale ? num < MULTIPLIER_MIN : num < 1)) {
            setError(
                is_martingale
                    ? localize('Multiplier must be at least {{min}}', { min: MULTIPLIER_MIN })
                    : localize('Increment must be at least 1')
            );
            return;
        }
        if (is_martingale && num > MULTIPLIER_MAX) {
            setError(localize('Multiplier cannot exceed {{max}}', { max: MULTIPLIER_MAX }));
            return;
        }
        onSelect(num);
        setIsOpen(false);
    };

    const is_save_disabled = !inputValue || !!error || inputValue === String(selectedValue);

    return (
        <React.Fragment>
            <div className='trade-params__field-locked'>
                <TextField
                    variant='fill'
                    readOnly
                    disabled={disabled}
                    label={
                        is_martingale ? (
                            <Localize i18n_default_text='Stake multiplier' />
                        ) : (
                            <Localize i18n_default_text='Stake increment' />
                        )
                    }
                    value={is_martingale ? `x${selectedValue}` : `${selectedValue} ${localize('unit')}`}
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
                        saveAction={{ onAction: handleInputSave, ariaLabel: localize('Save') }}
                        isSaveActionDisabled={is_save_disabled}
                        shouldCloseOnSaveActionClick={false}
                    />
                    <ActionSheet.Content>
                        <div className='automation-popover__input-wrapper'>
                            <TextField
                                label={is_martingale ? localize('Stake multiplier') : localize('Stake increment')}
                                value={inputValue}
                                onChange={handleInputChange}
                                onBeforeInput={onBeforeInput}
                                variant='fill'
                                inputMode='decimal'
                                customType='commaRemoval'
                                allowDecimals
                                decimals={MULTIPLIER_DECIMALS}
                                regex={/[^0-9.,]/g}
                                maxLength={getDecimalInputMaxLength(inputValue, MULTIPLIER_DECIMALS)}
                                message={error || range_message}
                                status={error ? 'error' : 'neutral'}
                                textAlignment='left'
                                noStatusIcon
                            />
                            <ValueChips
                                className='value-chips--pills'
                                values={MULTIPLIER_PRESETS}
                                selectedValue={Number(inputValue)}
                                onSelect={handlePresetSelect}
                            />
                        </div>
                    </ActionSheet.Content>
                </ActionSheet.Portal>
            </ActionSheet.Root>
        </React.Fragment>
    );
};

export default StakeMultiplierMobile;
