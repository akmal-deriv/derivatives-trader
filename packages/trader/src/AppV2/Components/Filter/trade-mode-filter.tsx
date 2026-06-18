import React from 'react';

import { ActionSheet, Chip, RadioGroup, Text } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

export const TRADE_MODE = {
    ALL: 'all',
    MANUAL: 'manual',
    AUTOMATION: 'automation',
} as const;

export type TTradeMode = (typeof TRADE_MODE)[keyof typeof TRADE_MODE];

type TTradeModeFilter = {
    tradeModeFilter?: string;
    setTradeModeFilter: (value?: string) => void;
};

const trade_mode_filter_list = [
    { value: TRADE_MODE.ALL, label: <Localize i18n_default_text='All' /> },
    { value: TRADE_MODE.MANUAL, label: <Localize i18n_default_text='Manual' /> },
    { value: TRADE_MODE.AUTOMATION, label: <Localize i18n_default_text='Automation' /> },
];

const TradeModeFilter = ({ tradeModeFilter, setTradeModeFilter }: TTradeModeFilter) => {
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

    const selectedRadioButtonValue = tradeModeFilter || TRADE_MODE.ALL;
    const isChipSelected = !!tradeModeFilter && tradeModeFilter !== TRADE_MODE.ALL;

    const onRadioButtonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setTradeModeFilter(value === TRADE_MODE.ALL ? '' : value);
        setIsDropdownOpen(false);
    };

    const onReset = () => {
        setTradeModeFilter('');
        setIsDropdownOpen(false);
    };

    const chip_label = isChipSelected ? (
        trade_mode_filter_list.find(item => item.value === selectedRadioButtonValue)?.label
    ) : (
        <Localize i18n_default_text='Trade modes' />
    );

    return (
        <React.Fragment>
            <Chip.Standard
                className='filter__chip'
                dropdown
                isDropdownOpen={isDropdownOpen}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                selected={isChipSelected}
                size='md'
            >
                <Text size='sm'>{chip_label}</Text>
            </Chip.Standard>
            <ActionSheet.Root
                isOpen={isDropdownOpen}
                onClose={() => setIsDropdownOpen(false)}
                position='left'
                expandable={false}
            >
                <ActionSheet.Portal shouldCloseOnDrag>
                    <ActionSheet.Header title={<Localize i18n_default_text='Filter by trade mode' />} />
                    <ActionSheet.Content className='filter__item__wrapper'>
                        <RadioGroup
                            className='filter__item--radio'
                            onToggle={onRadioButtonChange}
                            selected={selectedRadioButtonValue}
                            size='sm'
                        >
                            {trade_mode_filter_list.map(({ value, label }) => (
                                <RadioGroup.Item value={value} label={label} key={value} radioButtonPosition='right' />
                            ))}
                        </RadioGroup>
                    </ActionSheet.Content>
                    <ActionSheet.Footer
                        alignment='vertical'
                        secondaryAction={{
                            content: <Localize i18n_default_text='Reset' />,
                            onAction: onReset,
                        }}
                        shouldCloseOnSecondaryButtonClick={false}
                    />
                </ActionSheet.Portal>
            </ActionSheet.Root>
        </React.Fragment>
    );
};

export default TradeModeFilter;
