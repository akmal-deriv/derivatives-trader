import React from 'react';

import { ActionSheet, Button, TextField } from '@deriv-com/quill-ui';
import { Localize, useTranslations } from '@deriv-com/translations';

import Carousel from 'AppV2/Components/Carousel';
import CarouselHeader from 'AppV2/Components/Carousel/carousel-header';
import { TabSelector } from 'AppV2/Components/InputPopover';
import TradeParamDefinition from 'AppV2/Components/TradeParamDefinition';
import { ChipsWithInputToggle } from 'AppV2/Components/TradeParameters/Shared';
import { createDecimalInputGuard, getDecimalInputMaxLength } from 'AppV2/Utils/decimal-input';

import { MULTIPLIER_DECIMALS, MULTIPLIER_MAX, MULTIPLIER_PRESETS, TAutomationConfig } from '../automation-config';

type TStakeMultiplierMobileProps = {
    strategy: TAutomationConfig['strategy'];
    selectedValue: number;
    description?: string;
    onSelect: (value: number) => void;
};

const StakeMultiplierMobile = ({ strategy, selectedValue, description, onSelect }: TStakeMultiplierMobileProps) => {
    const is_martingale = strategy === 'martingale';
    const { localize } = useTranslations();
    const [is_open, setIsOpen] = React.useState(false);
    const [carousel_index, setCarouselIndex] = React.useState(0);
    const [activeTab, setActiveTab] = React.useState<'chips' | 'input'>('chips');
    const [inputValue, setInputValue] = React.useState(String(selectedValue));
    const [error, setError] = React.useState('');
    const onBeforeInput = createDecimalInputGuard(MULTIPLIER_DECIMALS);

    const onClose = React.useCallback(() => {
        setIsOpen(false);
        setCarouselIndex(0);
        setActiveTab('chips');
        setInputValue(String(selectedValue));
        setError('');
    }, [selectedValue]);

    const handleChipSelect = React.useCallback(
        (value: number) => {
            onSelect(value);
            onClose();
        },
        [onSelect, onClose]
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        setError('');
    };

    const handleInputSave = () => {
        const num = Number(inputValue);
        if (!inputValue || isNaN(num) || num < 1) {
            setError(
                is_martingale ? localize('Multiplier must be at least 1') : localize('Increment must be at least 1')
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

    const inputComponent = (
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
                message={error || undefined}
                status={error ? 'error' : 'neutral'}
                noStatusIcon
                autoFocus
            />
            <Button
                fullWidth
                size='lg'
                variant='secondary'
                color='black-white'
                onClick={handleInputSave}
                disabled={!!error || !inputValue}
                className='automation-popover__save-button'
                label={localize('Save')}
            />
        </div>
    );

    return (
        <React.Fragment>
            <TextField
                variant='fill'
                readOnly
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
            <ActionSheet.Root isOpen={is_open} onClose={onClose} position='left' expandable={false}>
                <ActionSheet.Portal shouldCloseOnDrag>
                    <Carousel
                        header={CarouselHeader}
                        current_index={carousel_index}
                        setCurrentIndex={setCarouselIndex}
                        title={
                            is_martingale ? (
                                <Localize i18n_default_text='Stake multiplier' />
                            ) : (
                                <Localize i18n_default_text='Stake increment' />
                            )
                        }
                        pages={[
                            {
                                id: 1,
                                component: (
                                    <ActionSheet.Content>
                                        <div className='automation-popover__input-wrapper'>
                                            <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />
                                            <ChipsWithInputToggle
                                                activeTab={activeTab}
                                                chipValues={MULTIPLIER_PRESETS}
                                                selectedValue={selectedValue}
                                                onSelect={handleChipSelect}
                                                inputComponent={inputComponent}
                                            />
                                        </div>
                                    </ActionSheet.Content>
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

export default StakeMultiplierMobile;
