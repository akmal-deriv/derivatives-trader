import React from 'react';

import { LabelPairedMinusMdRegularIcon, LabelPairedPlusMdRegularIcon } from '@deriv/quill-icons';
import { IconButton } from '@deriv-com/quill-ui';

type TStepperButtonsProps = {
    onDecrement: () => void;
    onIncrement: () => void;
    decrement_disabled?: boolean;
    increment_disabled?: boolean;
};

// − / + steppers rendered inside a trade-param field's rightIcon slot. Clicks stop propagation
// so they adjust the value without also opening the field's action sheet.
const StepperButtons = ({ onDecrement, onIncrement, decrement_disabled, increment_disabled }: TStepperButtonsProps) => {
    const handle = (fn: () => void) => (event: React.MouseEvent) => {
        event.stopPropagation();
        fn();
    };

    return (
        <div className='trade-params__steppers'>
            <IconButton
                variant='tertiary'
                color='black-white'
                size='md'
                icon={<LabelPairedMinusMdRegularIcon />}
                disabled={decrement_disabled}
                onClick={handle(onDecrement)}
                data-testid='dt_stepper_decrement'
            />
            <IconButton
                variant='tertiary'
                color='black-white'
                size='md'
                icon={<LabelPairedPlusMdRegularIcon />}
                disabled={increment_disabled}
                onClick={handle(onIncrement)}
                data-testid='dt_stepper_increment'
            />
        </div>
    );
};

export default StepperButtons;
