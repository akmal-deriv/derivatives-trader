import React from 'react';

import { getCurrencyDisplayCode, getDecimalPlaces } from '@deriv/shared';
import { ActionSheet, TextField } from '@deriv-com/quill-ui';
import { Localize, useTranslations } from '@deriv-com/translations';

import Carousel from 'AppV2/Components/Carousel';
import CarouselHeader from 'AppV2/Components/Carousel/carousel-header';
import TradeParamDefinition from 'AppV2/Components/TradeParamDefinition';
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
    const [carousel_index, setCarouselIndex] = React.useState(0);
    const [value, setValue] = React.useState(String(initialValue));
    const [error, setError] = React.useState('');
    const decimals = getDecimalPlaces(currency);
    const onBeforeInput = createDecimalInputGuard(decimals);
    const label = is_take_profit ? localize('Profit threshold') : localize('Loss threshold');

    const onClose = React.useCallback(() => {
        setIsOpen(false);
        setCarouselIndex(0);
        setValue(String(initialValue));
        setError('');
    }, [initialValue]);

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
                <ActionSheet.Portal shouldCloseOnDrag>
                    <Carousel
                        header={CarouselHeader}
                        current_index={carousel_index}
                        setCurrentIndex={setCarouselIndex}
                        title={label}
                        pages={[
                            {
                                id: 1,
                                component: (
                                    <React.Fragment>
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
                                        <ActionSheet.Footer
                                            alignment='vertical'
                                            shouldCloseOnPrimaryButtonClick={false}
                                            primaryAction={{
                                                content: <Localize i18n_default_text='Save' />,
                                                onAction: handleSave,
                                            }}
                                        />
                                    </React.Fragment>
                                ),
                            },
                            {
                                id: 2,
                                component: <TradeParamDefinition description={description} />,
                            },
                        ]}
                    />
                </ActionSheet.Portal>
            </ActionSheet.Root>
        </React.Fragment>
    );
};

export default ThresholdInputMobile;
