import React from 'react';
import clsx from 'clsx';

import {
    clickAndKeyEventHandler,
    formatMoney,
    getCurrencyDisplayCode,
    getTradeTypeName,
    TRADE_TYPES,
} from '@deriv/shared';
import { Text } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

import { useTraderStore } from 'Stores/useTraderStores';
import { TTradeStore } from 'Types';

import { getCommissionPercentage } from '../Multiplier/commission-formula';
import CommissionTooltip from '../Multiplier/commission-tooltip';

type TStakeDetailsProps = Pick<TTradeStore, 'contract_type' | 'currency' | 'has_stop_loss' | 'is_multiplier'> & {
    contract_types: string[];
    details: {
        commission?: string | number;
        error_1?: string;
        error_2?: string;
        first_contract_payout: number;
        is_first_payout_exceeded?: boolean;
        is_second_payout_exceeded?: boolean;
        max_payout: string | number;
        max_stake: string | number;
        min_stake: string | number;
        second_contract_payout: number;
        stop_out?: number | string;
    };
    is_loading_proposal: boolean;
    is_empty?: boolean;
    should_show_payout_details: boolean;
    /** Mobile only: open the Stop out / Commission explanation as a page within the stake sheet. When
     * omitted (desktop), Commission falls back to a hover tooltip and Stop out to a plain label. */
    onOpenStopOut?: () => void;
    onOpenCommission?: () => void;
};

const StakeDetails = ({
    contract_type,
    contract_types,
    currency,
    details,
    has_stop_loss,
    is_loading_proposal,
    is_multiplier,
    is_empty,
    should_show_payout_details,
    onOpenStopOut,
    onOpenCommission,
}: TStakeDetailsProps) => {
    const { amount, multiplier, root_store } = useTraderStore();
    const is_mobile = root_store?.ui?.is_mobile;

    // Commission is interactive only when its formula can be derived (matches the trade-params row).
    const commission_percentage = getCommissionPercentage(details.commission, multiplier, amount);

    const [displayed_values, setDisplayedValues] = React.useState({
        is_first_payout_exceeded: false,
        is_second_payout_exceeded: false,
        commission: '',
        first_contract_payout: '',
        max_payout: '',
        second_contract_payout: '',
        stop_out: '',
    });

    React.useEffect(() => {
        const getDisplayedValue = (new_value?: number | string, current_value?: string) => {
            return (current_value === '-' && is_loading_proposal) || !new_value || is_empty
                ? '-'
                : formatMoney(currency, Number(new_value), true);
        };

        const {
            commission: commission_value,
            first_contract_payout,
            is_first_payout_exceeded,
            is_second_payout_exceeded,
            second_contract_payout,
            stop_out: stop_out_value,
            max_payout,
        } = displayed_values;
        const new_commission = getDisplayedValue(Math.abs(Number(details.commission)), commission_value);
        const new_payout_1 = getDisplayedValue(details.first_contract_payout, first_contract_payout);
        const new_payout_2 = getDisplayedValue(details.second_contract_payout, second_contract_payout);
        const new_stop_out = getDisplayedValue(Math.abs(Number(details.stop_out)), stop_out_value);
        const new_max_payout = getDisplayedValue(details.max_payout, max_payout);

        if (
            commission_value !== new_commission ||
            first_contract_payout !== new_payout_1 ||
            displayed_values.is_first_payout_exceeded !== is_first_payout_exceeded ||
            displayed_values.is_second_payout_exceeded !== is_second_payout_exceeded ||
            second_contract_payout !== new_payout_2 ||
            stop_out_value !== new_stop_out ||
            max_payout !== new_max_payout
        ) {
            setDisplayedValues({
                commission: new_commission,
                first_contract_payout: new_payout_1,
                is_first_payout_exceeded,
                is_second_payout_exceeded,
                second_contract_payout: new_payout_2,
                stop_out: new_stop_out,
                max_payout: new_max_payout,
            });
        }
    }, [currency, details, displayed_values, is_loading_proposal, is_empty]);

    const payout_title = <Localize i18n_default_text='Payout' />;
    const content = [
        {
            is_displayed: !has_stop_loss && is_multiplier && !should_show_payout_details,
            is_stop_out: true,
            label: <Localize i18n_default_text='Stop out' />,
            value: displayed_values.stop_out,
        },
        {
            is_displayed: is_multiplier && !should_show_payout_details,
            is_commission: true,
            label: <Localize i18n_default_text='Commission' />,
            value: displayed_values.commission,
        },
        {
            is_displayed: !!details.max_payout && should_show_payout_details,
            label: <Localize i18n_default_text='Max payout' />,
            value: formatMoney(currency, +details.max_payout, true),
        },
        {
            contract_type: getTradeTypeName(contract_types[0], {
                isHighLow: contract_type === TRADE_TYPES.HIGH_LOW,
            }),
            is_displayed: !!contract_types.length && should_show_payout_details,
            label: payout_title,
            has_error: details.is_first_payout_exceeded,
            value: displayed_values.first_contract_payout,
        },
        {
            contract_type: getTradeTypeName(contract_types[1], {
                isHighLow: contract_type === TRADE_TYPES.HIGH_LOW,
            }),
            is_displayed: contract_types.length > 1 && should_show_payout_details,
            label: payout_title,
            has_error: details.is_second_payout_exceeded,
            value: displayed_values.second_contract_payout,
        },
    ];

    // A tappable label that opens its explanation as a page within the stake sheet (mobile).
    const renderClickableLabel = (label: React.ReactNode, onOpen: () => void) => (
        <Text
            size='sm'
            className='stake-content__info-label'
            role='button'
            tabIndex={0}
            onClick={(e: React.MouseEvent<HTMLElement>) => clickAndKeyEventHandler(onOpen, e)}
            onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => clickAndKeyEventHandler(onOpen, e)}
        >
            {label}
        </Text>
    );

    // Stop out / Commission open an explanation page within the stake sheet on mobile; on desktop
    // Commission keeps its hover tooltip and Stop out is a plain label. Kept as if/else (no nested
    // ternaries).
    const renderLabel = ({
        contract_type: row_contract_type,
        is_commission,
        is_stop_out,
        label,
    }: (typeof content)[number]) => {
        if (is_stop_out && onOpenStopOut) return renderClickableLabel(label, onOpenStopOut);
        if (is_commission && onOpenCommission && commission_percentage !== null)
            return renderClickableLabel(label, onOpenCommission);
        if (is_commission)
            return (
                <Text size='sm'>
                    <CommissionTooltip
                        commission={details.commission}
                        multiplier={multiplier}
                        amount={amount}
                        currency={currency}
                        align='start'
                    >
                        {label}
                    </CommissionTooltip>
                </Text>
            );
        return (
            <Text size='sm'>
                {label}
                {is_mobile && row_contract_type && ` (${row_contract_type})`}
            </Text>
        );
    };

    return (
        <div className='stake-content__details'>
            {content.map(
                (row, idx) =>
                    row.is_displayed && (
                        <div
                            key={`${idx}_${row.value}`}
                            className={clsx('stake-content__details-row', row.has_error && 'error')}
                        >
                            {renderLabel(row)}
                            <Text size='sm'>
                                {row.value} {getCurrencyDisplayCode(currency)}
                            </Text>
                        </div>
                    )
            )}
        </div>
    );
};

export default StakeDetails;
