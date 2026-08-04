import React, { useEffect } from 'react';
import clsx from 'clsx';
import debounce from 'lodash.debounce';

import { clickAndKeyEventHandler, formatMoney } from '@deriv/shared';
import { ActionSheet, Skeleton, Text, WheelPicker } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

import { useTraderStore } from 'Stores/useTraderStores';

import { getCommissionPercentage } from './commission-formula';

// Carousel page index of the commission explanation (see Multiplier's action_sheet_content).
const COMMISSION_PAGE = 2;

type TMultiplierWheelPickerProps = {
    amount: ReturnType<typeof useTraderStore>['amount'];
    multiplier: ReturnType<typeof useTraderStore>['multiplier'];
    multiplier_range_list: ReturnType<typeof useTraderStore>['multiplier_range_list'];
    currency: ReturnType<typeof useTraderStore>['currency'];
    commission: ReturnType<typeof useTraderStore>['commission'];
    setMultiplier: (multiplier: number) => void;
    /** Opens the commission explanation as a page within the multiplier sheet. */
    onDetailClick?: (page_index: number) => void;
};

const debouncedSetMultiplier = debounce((setMultiplier, multiplier) => {
    setMultiplier(multiplier);
}, 200);

const MultiplierWheelPicker = ({
    amount,
    multiplier,
    multiplier_range_list = [],
    currency,
    commission,
    setMultiplier,
    onDetailClick,
}: TMultiplierWheelPickerProps) => {
    // Commission is interactive only when its formula can be derived (matches the trade-params row).
    const has_commission_info = getCommissionPercentage(commission, multiplier, amount) !== null;
    const openCommissionInfo = (e?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
        if (has_commission_info) clickAndKeyEventHandler(() => onDetailClick?.(COMMISSION_PAGE), e);
    };
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
                        />
                    ) : (
                        <Skeleton.Square />
                    )}
                </div>
                <div
                    className='multiplier__commission'
                    {...(has_commission_info
                        ? { role: 'button', tabIndex: 0, onClick: openCommissionInfo, onKeyDown: openCommissionInfo }
                        : {})}
                >
                    <Text
                        color='quill-typography__color--subtle'
                        size='sm'
                        className={clsx(has_commission_info && 'multiplier__commission-label')}
                    >
                        <Localize i18n_default_text='Commission' />
                    </Text>
                    <Text
                        color='quill-typography__color--subtle'
                        size='sm'
                        as='div'
                        className='multiplier__commission-value'
                    >
                        {commission ? (
                            <React.Fragment>
                                {formatMoney(currency, commission, true)} {currency}
                            </React.Fragment>
                        ) : (
                            <Skeleton.Square width={60} height={14} />
                        )}
                    </Text>
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
