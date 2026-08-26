import React from 'react';
import classNames from 'classnames';

import { Dropdown } from '@deriv/components';
import { RadioButton } from '@deriv-com/quill-ui';

export type TDropdownFilterOption = {
    value: string;
    label: string;
    trigger_label?: string;
};

type TPositionsDrawerDropdownFilterProps = {
    name: string;
    options: TDropdownFilterOption[];
    value: string;
    isActive: boolean;
    onChange: (value: string) => void;
};

/**
 * Shared desktop drawer filter UI: a `@deriv/components` Dropdown styled as a chip-pill with each row rendered as a labeled RadioButton.
 * Used by both the time filter and the trade-mode filter so the two stay visually aligned and any chip/popover
 */
const PositionsDrawerDropdownFilter = ({
    name,
    options,
    value,
    isActive,
    onChange,
}: TPositionsDrawerDropdownFilterProps) => {
    // Each Dropdown item renders a radio row; a plain-text fallback handles
    // the trigger display since the RadioButton is hidden there via SCSS.
    const list = React.useMemo(
        () =>
            options.map(option => ({
                value: option.value,
                text: (
                    <span className='positions-drawer-dropdown-filter__radio-option'>
                        <span className='positions-drawer-dropdown-filter__radio-button-wrapper'>
                            <RadioButton
                                defaultChecked={value === option.value}
                                value={option.value}
                                name={name}
                                onChange={() => {}}
                                radioButtonPosition='left'
                                size='sm'
                                tabIndex={-1}
                            >
                                {option.label}
                            </RadioButton>
                        </span>
                        <span className='positions-drawer-dropdown-filter__radio-label-fallback'>
                            {option.trigger_label ?? option.label}
                        </span>
                    </span>
                ) as unknown as string,
            })),
        [options, value, name]
    );

    return (
        <div className='positions-drawer-dropdown-filter'>
            <div className='positions-drawer-dropdown-filter__dropdown-wrapper'>
                <Dropdown
                    className={classNames('positions-drawer-dropdown-filter__dropdown', {
                        'positions-drawer-dropdown-filter__dropdown--selected': isActive,
                    })}
                    classNameDisplay='positions-drawer-dropdown-filter__dropdown-display'
                    list={list}
                    value={value}
                    onChange={(e: { target: { value: string } }) => onChange(e.target.value)}
                />
            </div>
        </div>
    );
};

export default PositionsDrawerDropdownFilter;
