import React from 'react';
import debounce from 'lodash.debounce';

import { Skeleton } from '@deriv/components';
import { clickAndKeyEventHandler } from '@deriv/shared';
import { ActionSheet, Text, WheelPicker } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

import { useBlockSheetSwipe } from 'AppV2/Hooks/useBlockSheetSwipe';
import { WHEEL_PICKER_HEIGHT } from 'AppV2/Utils/trade-params-utils';

// Carousel page index of the payout-per-point explanation (see Strike's action_sheet_content). The
// strike definition moved to the header tooltip, so this is now the only remaining detail page.
const PAYOUT_PER_POINT_PAGE = 1;

type TStrikeWheelProps = {
    currency: string;
    onStrikePriceSelect: (new_value: string | number) => void;
    payout_per_point?: string | number;
    strike_price_list: {
        value: string;
    }[];
    /** Drafted strike; owned by the sheet so the header check can react to it. */
    value: string | number;
    setValue: (new_value: string | number) => void;
    /** Opens the payout-per-point explanation as a page within the strike sheet. */
    onDetailClick?: (page_index: number) => void;
};

const onWheelPickerScrollDebounced = debounce(
    (new_value: string | number, callback: TStrikeWheelProps['onStrikePriceSelect']) => callback(new_value),
    200
);

const StrikeWheel = ({
    currency,
    onStrikePriceSelect,
    payout_per_point,
    strike_price_list,
    value,
    setValue,
    onDetailClick,
}: TStrikeWheelProps) => {
    const block_sheet_swipe = useBlockSheetSwipe();
    // The wheel registers its scroll listener once and keeps calling the callback captured then, so the
    // guard below reads the live draft through a ref; against the closed-over prop, scrolling back to it
    // is a no-op and the draft stays on the value you scrolled away from.
    const value_ref = React.useRef(value);
    value_ref.current = value;

    const openPayoutPerPointInfo = (e?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) =>
        clickAndKeyEventHandler(() => onDetailClick?.(PAYOUT_PER_POINT_PAGE), e);

    React.useEffect(() => () => onWheelPickerScrollDebounced.cancel(), []);

    return (
        <ActionSheet.Content className='strike__wrapper' data-testid='dt_strike_wrapper'>
            <div className='strike__wheel-picker' {...block_sheet_swipe}>
                <WheelPicker
                    containerHeight={WHEEL_PICKER_HEIGHT}
                    data={strike_price_list}
                    selectedValue={value}
                    setSelectedValue={(new_value: string | number) => {
                        if (new_value === value_ref.current) return;
                        setValue(new_value);
                        // Commit live so the payout-per-point row below refreshes as the wheel moves; the
                        // sheet reverts to its opening value on dismiss.
                        onWheelPickerScrollDebounced(new_value, onStrikePriceSelect);
                    }}
                />
            </div>
            <div
                className='strike__payout'
                role='button'
                tabIndex={0}
                onClick={openPayoutPerPointInfo}
                onKeyDown={openPayoutPerPointInfo}
            >
                <Text color='quill-typography__color--subtle' size='sm' className='strike__payout__label'>
                    <Localize i18n_default_text='Payout per point' />
                </Text>
                <Text size='sm' as='div' className='strike__payout__content'>
                    {payout_per_point ? (
                        <React.Fragment>
                            {payout_per_point} {currency}
                        </React.Fragment>
                    ) : (
                        <Skeleton width={90} height={14} />
                    )}
                </Text>
            </div>
        </ActionSheet.Content>
    );
};

export default StrikeWheel;
