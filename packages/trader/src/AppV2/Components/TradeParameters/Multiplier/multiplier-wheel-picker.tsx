import React, { useEffect } from 'react';
import debounce from 'lodash.debounce';

import { ActionSheet, Skeleton, WheelPicker } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

import { useTraderStore } from 'Stores/useTraderStores';

type TMultiplierWheelPickerProps = {
    multiplier: ReturnType<typeof useTraderStore>['multiplier'];
    multiplier_range_list: ReturnType<typeof useTraderStore>['multiplier_range_list'];
    setMultiplier: (multiplier: number) => void;
};

// Same window as the Duration ticks wheel: 5 rows, so 2 values show above and below the selection.
const WHEEL_PICKER_HEIGHT = '230px';

const debouncedSetMultiplier = debounce((setMultiplier, multiplier) => {
    setMultiplier(multiplier);
}, 200);

const MultiplierWheelPicker = ({
    multiplier,
    multiplier_range_list = [],
    setMultiplier,
}: TMultiplierWheelPickerProps) => {
    const multiplier_array = multiplier_range_list.map(item => ({ value: item.text }));
    const initial_multiplier = React.useRef<number>(multiplier);
    const selected_multiplier = React.useRef<number>(multiplier);

    useEffect(() => {
        return () => {
            if (initial_multiplier.current && initial_multiplier.current !== selected_multiplier.current) {
                setMultiplier(initial_multiplier.current);
            }
            debouncedSetMultiplier.cancel();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handlePickerValuesChange = (value: string | number) => {
        const new_value = Number((value as string).slice(1));
        if (new_value === selected_multiplier.current) return;
        debouncedSetMultiplier(setMultiplier, new_value);
        selected_multiplier.current = Number(new_value);
    };

    const handleSave = () => {
        initial_multiplier.current = selected_multiplier.current;
    };
    return (
        <React.Fragment>
            <ActionSheet.Content className='multiplier__picker'>
                <div className='multiplier__wheel-picker'>
                    {multiplier_array.length ? (
                        <WheelPicker
                            data={multiplier_array}
                            selectedValue={`x${selected_multiplier.current}`}
                            setSelectedValue={handlePickerValuesChange}
                            containerHeight={WHEEL_PICKER_HEIGHT}
                        />
                    ) : (
                        <Skeleton.Square />
                    )}
                </div>
            </ActionSheet.Content>
            <ActionSheet.Footer
                isPrimaryButtonDisabled={false}
                shouldCloseOnPrimaryButtonClick
                primaryAction={{
                    content: <Localize i18n_default_text='Save' />,
                    onAction: handleSave,
                }}
            />
        </React.Fragment>
    );
};

export default MultiplierWheelPicker;
