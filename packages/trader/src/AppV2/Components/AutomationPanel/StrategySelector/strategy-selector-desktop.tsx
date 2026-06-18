import React from 'react';

import { Text } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

import { SelectionListPopover, TradeParameterPopover } from 'AppV2/Components/TradeParameters/Shared';

import { getStrategyLabel, TStrategyOption } from '../automation-config';

type TStrategySelectorDesktopProps = {
    options: TStrategyOption[];
    selectedValue: string;
    description?: string;
    onSelect: (value: string) => void;
};

const StrategySelectorDesktop = ({ options, selectedValue, description, onSelect }: TStrategySelectorDesktopProps) => (
    <TradeParameterPopover
        label={<Localize i18n_default_text='Strategy' />}
        value={getStrategyLabel(selectedValue, options)}
        popover_classname='automation-popover'
        description={description ? <Text size='sm'>{description}</Text> : undefined}
    >
        <SelectionListPopover
            options={options}
            selectedValue={selectedValue}
            onSelect={(value: string | number) => onSelect(value as string)}
            className='automation-popover'
        />
    </TradeParameterPopover>
);

export default StrategySelectorDesktop;
