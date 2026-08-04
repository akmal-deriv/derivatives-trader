import React from 'react';

import { Button, Text, TextField } from '@deriv-com/quill-ui';
import { Localize, useTranslations } from '@deriv-com/translations';

import { TabSelector } from 'AppV2/Components/InputPopover';
import {
    ChipsWithInputToggle,
    TradeParameterPopover,
    useTradeParameterPopover,
} from 'AppV2/Components/TradeParameters/Shared';
import { createDecimalInputGuard, getDecimalInputMaxLength } from 'AppV2/Utils/decimal-input';

import { MULTIPLIER_DECIMALS, MULTIPLIER_MAX, MULTIPLIER_PRESETS, TAutomationConfig } from '../automation-config';

type TStakeMultiplierDesktopProps = {
    strategy: TAutomationConfig['strategy'];
    selectedValue: number;
    description?: string;
    disabled?: boolean;
    onSelect: (value: number) => void;
};

const StakeMultiplierContent = ({ strategy, selectedValue, onSelect }: TStakeMultiplierDesktopProps) => {
    const is_martingale = strategy === 'martingale';
    const { closePopover } = useTradeParameterPopover();
    const { localize } = useTranslations();
    const [activeTab, setActiveTab] = React.useState<'chips' | 'input'>('chips');
    const [inputValue, setInputValue] = React.useState(String(selectedValue));
    const [error, setError] = React.useState('');
    const onBeforeInput = createDecimalInputGuard(MULTIPLIER_DECIMALS);

    const handleChipSelectAndClose = React.useCallback(
        (value: number) => {
            onSelect(value);
            closePopover();
        },
        [onSelect, closePopover]
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
        closePopover();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !error) handleInputSave();
    };

    const inputComponent = (
        <div className='automation-popover__input-wrapper'>
            <TextField
                label={is_martingale ? localize('Stake multiplier') : localize('Stake increment')}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
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
                variant='primary'
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
            <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />
            <ChipsWithInputToggle
                activeTab={activeTab}
                chipValues={MULTIPLIER_PRESETS}
                selectedValue={selectedValue}
                onSelect={handleChipSelectAndClose}
                inputComponent={inputComponent}
            />
        </React.Fragment>
    );
};

const StakeMultiplierDesktop = ({
    strategy,
    selectedValue,
    description,
    disabled,
    onSelect,
}: TStakeMultiplierDesktopProps) => {
    const { localize } = useTranslations();
    const is_martingale = strategy === 'martingale';

    const fallback_description = is_martingale ? (
        <Localize i18n_default_text='Multiplier applied to the stake after each losing trade.' />
    ) : (
        <Localize i18n_default_text='Amount added to the stake after each losing trade.' />
    );

    return (
        <TradeParameterPopover
            label={
                is_martingale ? (
                    <Localize i18n_default_text='Stake multiplier' />
                ) : (
                    <Localize i18n_default_text='Stake increment' />
                )
            }
            value={is_martingale ? `x${selectedValue}` : `${selectedValue} ${localize('unit')}`}
            popover_classname='automation-popover'
            popoverWidth={376}
            is_locked={disabled}
            description={<Text size='sm'>{description || fallback_description}</Text>}
        >
            <StakeMultiplierContent strategy={strategy} selectedValue={selectedValue} onSelect={onSelect} />
        </TradeParameterPopover>
    );
};

export default StakeMultiplierDesktop;
