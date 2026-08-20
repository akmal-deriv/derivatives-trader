import React from 'react';
import { observer } from 'mobx-react-lite';

import { Skeleton } from '@deriv/components';
import { ActionSheet, Text, WheelPicker } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

import { useBlockSheetSwipe } from 'AppV2/Hooks/useBlockSheetSwipe';
import { useProposal } from 'AppV2/Hooks/useProposal';
import { WHEEL_PICKER_HEIGHT } from 'AppV2/Utils/trade-params-utils';
import { useTraderStore } from 'Stores/useTraderStores';

// Carousel page index of the barrier detail page (after the sheet-level definition became a tooltip).
const BARRIER_PAGE = 1;

type TPayoutPerPointWheelProps = {
    barrier?: string | number;
    is_open?: boolean;
    is_api_response_received_ref: React.MutableRefObject<boolean>;
    onDetailClick?: (page_index: number) => void;
    value: string | number;
    setValue: (new_value: string | number) => void;
    payout_per_point_list: {
        value: string;
    }[];
};

const PayoutPerPointWheel = observer(
    ({
        barrier,
        is_open,
        is_api_response_received_ref,
        onDetailClick,
        value,
        setValue,
        payout_per_point_list,
    }: TPayoutPerPointWheelProps) => {
        const trade_store = useTraderStore();
        const { trade_types } = trade_store;

        const [displayed_barrier_value, setDisplayedBarrierValue] = React.useState(barrier);
        const block_sheet_swipe = useBlockSheetSwipe();

        const new_values = { payout_per_point: String(value) };

        // Sending proposal without subscription to get a new barrier value
        const {
            data: response,
            error,
            isFetching,
        } = useProposal({
            trade_store,
            proposal_request_values: new_values,
            contract_type: Object.keys(trade_types)[0],
            is_enabled: is_open,
        });

        const onChange = (new_value: string | number) => {
            // If a new value is equal to previous one, then we won't send API request
            const is_equal = value === new_value;
            is_api_response_received_ref.current = is_equal;
            if (is_equal) return;

            setValue(new_value);
        };

        React.useEffect(() => {
            if (response) {
                const { proposal } = response;
                const { barrier_spot_distance } = proposal?.contract_details ?? {};
                // Currently we are not handling errors
                if (barrier_spot_distance) setDisplayedBarrierValue(barrier_spot_distance);

                is_api_response_received_ref.current = true;
            }
        }, [response, is_api_response_received_ref]);

        return (
            <ActionSheet.Content className='payout-per-point__wrapper' data-testid='dt_payout-per-point_wrapper'>
                <div className='payout-per-point__wheel-picker' {...block_sheet_swipe}>
                    <WheelPicker
                        containerHeight={WHEEL_PICKER_HEIGHT}
                        data={payout_per_point_list}
                        selectedValue={value}
                        setSelectedValue={onChange}
                    />
                </div>
                <div
                    className='payout-per-point__barrier'
                    role='button'
                    tabIndex={0}
                    onClick={() => onDetailClick?.(BARRIER_PAGE)}
                    onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onDetailClick?.(BARRIER_PAGE);
                        }
                    }}
                >
                    <Text
                        color='quill-typography__color--subtle'
                        size='sm'
                        className='payout-per-point__barrier__label'
                    >
                        <Localize i18n_default_text='Barrier' />
                    </Text>
                    <Text
                        color='quill-typography__color--subtle'
                        size='sm'
                        as='div'
                        className='payout-per-point__barrier__content'
                    >
                        {!displayed_barrier_value || error || isFetching ? (
                            <Skeleton width={90} height={14} />
                        ) : (
                            displayed_barrier_value
                        )}
                    </Text>
                </div>
            </ActionSheet.Content>
        );
    }
);

export default PayoutPerPointWheel;
