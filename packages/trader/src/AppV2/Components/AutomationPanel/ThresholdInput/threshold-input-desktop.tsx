import React from 'react';

import { getCurrencyDisplayCode, getDecimalPlaces } from '@deriv/shared';
import { Button, Text, TextField } from '@deriv-com/quill-ui';
import { useTranslations } from '@deriv-com/translations';

import { TradeParameterPopover, useTradeParameterPopover } from 'AppV2/Components/TradeParameters/Shared';
import { createDecimalInputGuard, getDecimalInputMaxLength } from 'AppV2/Utils/decimal-input';

type TThresholdInputDesktopProps = {
    threshold_type: 'take_profit' | 'stop_loss';
    description?: string;
    currency: string;
    initialValue: number;
    onSave: (value: number) => void;
};

const ThresholdInputContent = ({
    threshold_type,
    currency,
    initialValue,
    onSave,
}: Omit<TThresholdInputDesktopProps, 'description'>) => {
    const { closePopover } = useTradeParameterPopover();
    const { localize } = useTranslations();
    const is_take_profit = threshold_type === 'take_profit';
    const label = is_take_profit ? localize('Profit threshold') : localize('Loss threshold');
    const [value, setValue] = React.useState(String(initialValue));
    const [error, setError] = React.useState('');
    const decimals = getDecimalPlaces(currency);
    const onBeforeInput = createDecimalInputGuard(decimals);

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
        closePopover();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !error) handleSave();
    };

    return (
        <div className='automation-popover__input-wrapper'>
            <TextField
                label={`${label} (${getCurrencyDisplayCode(currency)})`}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
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
                autoFocus
            />
            <Button
                fullWidth
                size='lg'
                variant='secondary'
                color='black-white'
                onClick={handleSave}
                disabled={!!error || !value}
                className='automation-popover__save-button'
                label={localize('Save')}
            />
        </div>
    );
};

const ThresholdInputDesktop = ({
    threshold_type,
    description,
    currency,
    initialValue,
    onSave,
}: TThresholdInputDesktopProps) => {
    const { localize } = useTranslations();
    const display_currency = getCurrencyDisplayCode(currency);
    const label = threshold_type === 'take_profit' ? localize('Profit threshold') : localize('Loss threshold');

    return (
        <TradeParameterPopover
            label={label}
            value={`${initialValue} ${display_currency}`}
            popover_classname='automation-popover'
            description={description ? <Text size='sm'>{description}</Text> : undefined}
        >
            <ThresholdInputContent
                threshold_type={threshold_type}
                currency={currency}
                initialValue={initialValue}
                onSave={onSave}
            />
        </TradeParameterPopover>
    );
};

export default ThresholdInputDesktop;
