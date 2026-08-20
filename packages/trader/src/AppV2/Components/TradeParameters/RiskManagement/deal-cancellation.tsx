import React from 'react';
import { observer } from 'mobx-react-lite';

import { Money } from '@deriv/components';
import { Skeleton, Text, ToggleSwitch, useSnackbar, WheelPicker } from '@deriv-com/quill-ui';
import { Localize, useTranslations } from '@deriv-com/translations';

import ActionSheetHeaderTooltip from 'AppV2/Components/ActionSheetHeaderTooltip';
import { useBlockSheetSwipe } from 'AppV2/Hooks/useBlockSheetSwipe';
import { useProposal } from 'AppV2/Hooks/useProposal';
import { addUnit, getSnackBarText, WHEEL_PICKER_HEIGHT } from 'AppV2/Utils/trade-params-utils';
import { useTraderStore } from 'Stores/useTraderStores';

type TDealCancellationProps = {
    closeActionSheet: () => void;
    // Lifts the commit handler + state-backed dirty gate to the header owner (the picker).
    onActionsChange?: (actions: { onSave: () => void; is_save_disabled: boolean }) => void;
};

const DealCancellation = observer(({ closeActionSheet, onActionsChange }: TDealCancellationProps) => {
    const trade_store = useTraderStore();
    const { localize } = useTranslations();
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
    const block_sheet_swipe = useBlockSheetSwipe();

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

    // Memoised: a new array identity makes quill's wheel reset its list, re-centre itself and write a
    // value back to the parent — mid-scroll that fights the user and can commit a stale value.
    const data = React.useMemo(
        () => cancellation_range_list.map(({ text, value }) => ({ label: addUnit({ value: text }), value })),
        [cancellation_range_list]
    );

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

    // Header check stays disabled until the toggle or the selected duration differs from committed.
    const is_save_disabled = has_cancellation === is_enabled && selected_value === cancellation_duration;

    React.useEffect(() => {
        onActionsChange?.({ onSave, is_save_disabled });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [is_save_disabled, is_enabled, selected_value, deal_cancellation_fee]);

    return (
        <React.Fragment>
            <div className='deal-cancellation__container'>
                <div className='deal-cancellation__toggle'>
                    <span className='deal-cancellation__label'>
                        <Text>
                            <Localize i18n_default_text='Deal cancellation' />
                        </Text>
                        <ActionSheetHeaderTooltip
                            description={
                                <Localize i18n_default_text='When this is active, you can cancel your trade within the chosen time frame. Your stake will be returned without loss.' />
                            }
                            label={localize('Deal cancellation')}
                        />
                    </span>
                    <ToggleSwitch checked={is_enabled} onChange={setIsEnabled} />
                </div>
                <div className='deal-cancellation__wheel-picker' {...block_sheet_swipe}>
                    {cancellation_range_list.length ? (
                        <WheelPicker
                            containerHeight={WHEEL_PICKER_HEIGHT}
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
        </React.Fragment>
    );
});

export default DealCancellation;
