import React from 'react';
import clsx from 'clsx';

import { ActionSheet, Chip, Text, TextField } from '@deriv-com/quill-ui';
import { Localize, useTranslations } from '@deriv-com/translations';

import Carousel from 'AppV2/Components/Carousel';
import CarouselHeader from 'AppV2/Components/Carousel/carousel-header';
import { AutomationLockOverlay } from 'AppV2/Components/TradeParameters/Shared';

import { getStrategyLabel, TStrategyOption } from '../automation-config';

type TStrategySelectorMobileProps = {
    options: TStrategyOption[];
    selectedValue: string;
    description?: string;
    disabled?: boolean;
    onSelect: (value: string) => void;
};

const StrategySelectorMobile = ({ options, selectedValue, disabled, onSelect }: TStrategySelectorMobileProps) => {
    const { localize } = useTranslations();
    const [is_open, setIsOpen] = React.useState(false);
    const [carousel_index, setCarouselIndex] = React.useState(0);
    const [preview_value, setPreviewValue] = React.useState(selectedValue);

    const onClose = React.useCallback(() => {
        setIsOpen(false);
        setCarouselIndex(0);
        setPreviewValue(selectedValue);
    }, [selectedValue]);

    const handleSelect = React.useCallback(
        (value: string) => {
            onSelect(value);
            onClose();
        },
        [onSelect, onClose]
    );

    const preview_option = options.find(o => o.value === preview_value) ?? options[0];

    return (
        <React.Fragment>
            <div className='trade-params__field-locked'>
                <TextField
                    variant='fill'
                    readOnly
                    disabled={disabled}
                    label={<Localize i18n_default_text='Strategy' />}
                    value={getStrategyLabel(selectedValue, options)}
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
                        title={<Localize i18n_default_text='Strategy' />}
                        pages={[
                            {
                                id: 1,
                                component: (
                                    <ActionSheet.Content>
                                        <div className='automation-popover__content'>
                                            {options.map(({ value, label }) => (
                                                <button
                                                    key={value}
                                                    type='button'
                                                    className={clsx('automation-popover__option', {
                                                        'automation-popover__option--selected': value === selectedValue,
                                                    })}
                                                    onClick={() => handleSelect(value)}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </ActionSheet.Content>
                                ),
                            },
                            {
                                id: 2,
                                component: (
                                    <React.Fragment>
                                        <ActionSheet.Content>
                                            <div className='strategy-selector__info'>
                                                <div className='strategy-selector__info-chips'>
                                                    {options.map(({ value, label }) => (
                                                        <Chip.Selectable
                                                            key={value}
                                                            selected={value === preview_value}
                                                            onClick={() => setPreviewValue(value)}
                                                        >
                                                            <Text size='sm'>{label}</Text>
                                                        </Chip.Selectable>
                                                    ))}
                                                </div>
                                                {preview_option?.description && (
                                                    <Text className='strategy-selector__info-description'>
                                                        {preview_option.description}
                                                    </Text>
                                                )}
                                            </div>
                                        </ActionSheet.Content>
                                        <ActionSheet.Footer
                                            alignment='vertical'
                                            shouldCloseOnPrimaryButtonClick={false}
                                            primaryAction={{
                                                content: (
                                                    <Localize
                                                        i18n_default_text='Select {{label}}'
                                                        values={{
                                                            label: preview_option?.label ?? localize('strategy'),
                                                        }}
                                                    />
                                                ),
                                                onAction: () => handleSelect(preview_option.value),
                                            }}
                                        />
                                    </React.Fragment>
                                ),
                            },
                        ]}
                    />
                </ActionSheet.Portal>
            </ActionSheet.Root>
        </React.Fragment>
    );
};

export default StrategySelectorMobile;
