import React from 'react';

import { getCurrencyDisplayCode, getDecimalPlaces } from '@deriv/shared';
import { ActionSheet, Text, TextField, ToggleSwitch } from '@deriv-com/quill-ui';
import { Localize, useTranslations } from '@deriv-com/translations';

import Carousel from 'AppV2/Components/Carousel';
import CarouselHeader from 'AppV2/Components/Carousel/carousel-header';
import TradeParamDefinition from 'AppV2/Components/TradeParamDefinition';
import { AutomationLockOverlay } from 'AppV2/Components/TradeParameters/Shared';
import { createDecimalInputGuard, getDecimalInputMaxLength } from 'AppV2/Utils/decimal-input';

type TMaxTradeStakeMobileProps = {
    currency: string;
    initialValue: number | null;
    initialStake?: number;
    description?: string;
    disabled?: boolean;
    onSave: (value: number | null) => void;
};

const MaxTradeStakeMobile = ({
    currency,
    initialValue,
    initialStake,
    description,
    disabled,
    onSave,
}: TMaxTradeStakeMobileProps) => {
    const { localize } = useTranslations();
    const display_currency = getCurrencyDisplayCode(currency);
    const [is_open, setIsOpen] = React.useState(false);
    const [carousel_index, setCarouselIndex] = React.useState(0);
    const [is_enabled, setIsEnabled] = React.useState(initialValue !== null);
    const [value, setValue] = React.useState(initialValue ? String(initialValue) : '');
    const [error, setError] = React.useState('');
    const decimals = getDecimalPlaces(currency);
    const onBeforeInput = createDecimalInputGuard(decimals);

    const onClose = React.useCallback(() => {
        setIsOpen(false);
        setCarouselIndex(0);
        setIsEnabled(initialValue !== null);
        setValue(initialValue ? String(initialValue) : '');
        setError('');
    }, [initialValue]);

    const handleToggle = (enabled: boolean) => {
        setIsEnabled(enabled);
        if (!enabled) {
            setValue('');
            setError('');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
        setError('');
    };

    const handleSave = () => {
        if (!is_enabled) {
            onSave(null);
            setIsOpen(false);
            return;
        }
        const num = Number(value);
        if (!value || isNaN(num) || num <= 0) {
            setError(localize('Please enter a valid amount greater than 0'));
            return;
        }
        if (initialStake !== undefined && num < initialStake) {
            setError(
                localize('Max. stake must be equal or greater than {{stake}}', {
                    stake: initialStake,
                })
            );
            return;
        }
        onSave(num);
        setIsOpen(false);
    };

    return (
        <React.Fragment>
            <div className='trade-params__field-locked'>
                <TextField
                    variant='fill'
                    readOnly
                    disabled={disabled}
                    label={<Localize i18n_default_text='Max. stake' />}
                    value={initialValue ? `${initialValue} ${display_currency}` : '-'}
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
                        title={<Localize i18n_default_text='Max. stake' />}
                        pages={[
                            {
                                id: 1,
                                component: (
                                    <React.Fragment>
                                        <ActionSheet.Content>
                                            <div className='automation-popover__input-wrapper'>
                                                <div className='automation-popover__toggle-header'>
                                                    <Text size='sm'>
                                                        <Localize i18n_default_text='Max. stake' />
                                                    </Text>
                                                    <ToggleSwitch checked={is_enabled} onChange={handleToggle} />
                                                </div>
                                                <div className='automation-popover__toggle-content'>
                                                    <TextField
                                                        label={`${localize('Amount')} (${display_currency})`}
                                                        value={value}
                                                        onChange={handleChange}
                                                        onBeforeInput={onBeforeInput}
                                                        placeholder={localize('Amount')}
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
                                                        disabled={!is_enabled}
                                                    />
                                                    {!is_enabled && (
                                                        <div
                                                            className='automation-popover__toggle-overlay'
                                                            onClick={() => handleToggle(true)}
                                                        />
                                                    )}
                                                </div>
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

export default MaxTradeStakeMobile;
