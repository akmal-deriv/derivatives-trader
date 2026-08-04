import React from 'react';
import { observer } from 'mobx-react-lite';

import { Money } from '@deriv/components';
import { Button, Skeleton, Text, ToggleSwitch, useSnackbar, WheelPicker } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

import { useProposal } from 'AppV2/Hooks/useProposal';
import { addUnit, getSnackBarText } from 'AppV2/Utils/trade-params-utils';
import { useTraderStore } from 'Stores/useTraderStores';

type TDealCancellationProps = {
    closeActionSheet: () => void;
};

const DealCancellation = observer(({ closeActionSheet }: TDealCancellationProps) => {
    const trade_store = useTraderStore();
    const {
        currency,
        has_cancellation,
        has_take_profit,
        has_stop_loss,
        cancellation_range_list,
        cancellation_duration,
        onChangeMultiple,
        trade_types,
    } = trade_store;
    const { addSnackbar } = useSnackbar();

    const [is_enabled, setIsEnabled] = React.useState(has_cancellation);
    const [selected_value, setSelectedValue] = React.useState(cancellation_duration);

    // Fetch the deal cancellation fee for the currently-selected (uncommitted) duration, without a
    // subscription — so it updates live as the wheel moves, not only after Save (mirrors the Turbos
    // payout-per-point wheel). Only requested while deal cancellation is enabled.
    const { data: proposal_response } = useProposal({
        trade_store,
        proposal_request_values: { has_cancellation: is_enabled, cancellation_duration: selected_value },
        contract_type: Object.keys(trade_types)[0],
        is_enabled: is_enabled && !!selected_value,
    });
    const deal_cancellation_fee = proposal_response?.proposal?.cancellation?.ask_price;

    const data = cancellation_range_list.map(({ text, value }) => ({ label: addUnit({ value: text }), value }));

    const onSave = () => {
        if (has_cancellation === is_enabled && selected_value === cancellation_duration) {
            closeActionSheet();
            return;
        }

        if (is_enabled && (has_take_profit || has_stop_loss)) {
            addSnackbar({
                message: getSnackBarText({
                    has_cancellation: is_enabled,
                    has_stop_loss,
                    has_take_profit,
                    switching_cancellation: true,
                }),
                hasCloseButton: true,
            });
        }
        // We should switch off TP and SL if DC is on and vice versa
        onChangeMultiple({
            has_cancellation: is_enabled,
            ...(is_enabled ? { has_take_profit: false, has_stop_loss: false } : {}),
            cancellation_duration: selected_value,
        });
        closeActionSheet();
    };

    return (
        <React.Fragment>
            <div className='deal-cancellation__container'>
                <div className='deal-cancellation__toggle'>
                    <Text>
                        <Localize i18n_default_text='Deal cancellation' />
                    </Text>
                    <ToggleSwitch checked={is_enabled} onChange={setIsEnabled} />
                </div>
                <div className='deal-cancellation__wheel-picker'>
                    {cancellation_range_list.length ? (
                        <WheelPicker
                            data={data}
                            disabled={!is_enabled}
                            selectedValue={selected_value}
                            setSelectedValue={
                                setSelectedValue as React.ComponentProps<typeof WheelPicker>['setSelectedValue']
                            }
                        />
                    ) : (
                        <Skeleton.Square />
                    )}
                </div>
            </div>
            {/* Always render the fee band (its height is reserved in the container calc) so enabling
                deal cancellation doesn't shift the Save button up/down; only fill it when enabled. */}
            <div className='deal-cancellation__fee'>
                {is_enabled && (
                    <React.Fragment>
                        <Text color='quill-typography__color--subtle' size='sm'>
                            <Localize i18n_default_text='Deal cancellation fee' />
                        </Text>
                        {deal_cancellation_fee ? (
                            <Text color='quill-typography__color--subtle' size='sm' as='div'>
                                <Money amount={deal_cancellation_fee} show_currency currency={currency} />
                            </Text>
                        ) : (
                            <Skeleton.Square width={65} height={18} rounded />
                        )}
                    </React.Fragment>
                )}
            </div>
            <Button
                variant='primary'
                color='black-white'
                size='lg'
                label={<Localize i18n_default_text='Save' />}
                fullWidth
                className='risk-management__save-button'
                onClick={onSave}
            />
        </React.Fragment>
    );
});

export default DealCancellation;
