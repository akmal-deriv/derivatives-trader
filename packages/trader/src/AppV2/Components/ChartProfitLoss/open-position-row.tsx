import React from 'react';
import clsx from 'clsx';

import { Money, RemainingTime } from '@deriv/components';
import { LabelPairedArrowDownRightCaptionFillIcon, LabelPairedArrowUpRightCaptionFillIcon } from '@deriv/quill-icons';
import {
    type Dayjs,
    getCardLabels,
    getCurrentTick,
    isMultiplierContract,
    isValidToCancel,
    isValidToSell,
    TContractInfo,
} from '@deriv/shared';
import { TPortfolioPosition } from '@deriv/stores/types';
import { Button, Tag, Text } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

import { getProfit } from 'AppV2/Utils/positions-utils';
import { TRootStore } from 'Types';

import { getContractMarkerDirection, getContractMarkerLabel } from './contract-marker-utils';
import ProfitAmount from '../ProfitAmount';

export type TOpenPositionRowProps = {
    contractInfo: TPortfolioPosition['contract_info'];
    currency?: string;
    isSellRequested?: boolean;
    onCancel: () => void;
    onClose: () => void;
    serverTime?: TRootStore['common']['server_time'];
};

const OpenPositionRow = ({
    contractInfo,
    currency,
    isSellRequested,
    onCancel,
    onClose,
    serverTime,
}: TOpenPositionRowProps) => {
    const { buy_price, contract_type, date_expiry, limit_order, profit, tick_count } = contractInfo;
    const total_profit = getProfit(contractInfo);
    const valid_to_sell = isValidToSell(contractInfo as TContractInfo) && !isSellRequested;
    const valid_to_cancel = isValidToCancel(contractInfo as TContractInfo);

    // Marker matches the chart's entry-spot marker: an arrow for directional contracts, a short
    // label (E/O, predicted digit, T/NT) for digit and touch contracts. Colour (green up / red down)
    // and arrow direction reuse the chart logic; ring + content stay white in both themes.
    const is_up = getContractMarkerDirection(contract_type) === 'up';
    const marker_label = getContractMarkerLabel(contractInfo as TContractInfo);
    const DirectionIcon = is_up ? LabelPairedArrowUpRightCaptionFillIcon : LabelPairedArrowDownRightCaptionFillIcon;

    // Risk-management tags (same rule as the positions ContractCard): TP when a take-profit amount is
    // set, SL when a stop-loss amount is set, DC while deal cancellation is still valid.
    const { take_profit, stop_loss } = limit_order ?? {};
    const tags: string[] = [];
    if (take_profit?.order_amount) tags.push('TP');
    if (stop_loss?.order_amount) tags.push('SL');
    if (valid_to_cancel) tags.push('DC');

    // Duration value only (no "Duration:" prefix, no stopwatch icon), matching the open-positions
    // timer: live "current/total ticks" for tick contracts, otherwise the remaining-time countdown.
    // Multipliers have no fixed duration, so the line is hidden for them.
    // For tick contracts we use getCurrentTick directly (same value the chart's tick_counter_text
    // renders) so the sheet stays in lockstep with the chart instead of a wall-clock estimate that
    // runs one tick ahead.
    const is_multiplier = isMultiplierContract(contract_type);
    const is_tick_contract = !!tick_count;
    const current_tick = is_tick_contract ? getCurrentTick(contractInfo as TContractInfo) : 0;

    return (
        <div className='open-position-row' data-testid='dt_open_position_row'>
            <div className='open-position-row__info'>
                <span
                    className={clsx('open-position-row__marker', {
                        'open-position-row__marker--down': !is_up,
                        'open-position-row__marker--up': is_up,
                    })}
                >
                    {marker_label ? (
                        <span
                            className={clsx('open-position-row__marker-label', {
                                'open-position-row__marker-label--long': marker_label.length > 1,
                            })}
                        >
                            {marker_label}
                        </span>
                    ) : (
                        <DirectionIcon fill='var(--component-textIcon-static-prominentDark)' />
                    )}
                </span>
                <div className='open-position-row__details'>
                    <Text size='sm' bold className='open-position-row__pl'>
                        <span className='open-position-row__pl-label'>
                            <Localize i18n_default_text='P/L:' />{' '}
                        </span>
                        <ProfitAmount amount={total_profit} currency={currency} />
                    </Text>
                    <div className='open-position-row__meta'>
                        <Text size='sm' className='open-position-row__muted'>
                            <Money amount={buy_price} currency={currency} show_currency />
                        </Text>
                        {!!tags.length && <span className='open-position-row__separator' />}
                        {tags.map(label => (
                            <Tag
                                key={label}
                                className='open-position-row__tag'
                                label={label}
                                variant='custom'
                                size='sm'
                            />
                        ))}
                    </div>
                    {!is_multiplier && (
                        <Text size='sm' className='open-position-row__muted'>
                            {is_tick_contract ? (
                                <Localize
                                    i18n_default_text='{{current}}/{{total}} ticks'
                                    values={{ current: current_tick, total: tick_count }}
                                />
                            ) : (
                                <RemainingTime
                                    as='span'
                                    end_time={date_expiry}
                                    getCardLabels={getCardLabels}
                                    start_time={serverTime as Dayjs}
                                />
                            )}
                        </Text>
                    )}
                </div>
            </div>
            <div className='open-position-row__actions'>
                <Button
                    className='open-position-row__close'
                    color='black-white'
                    variant='secondary'
                    size='md'
                    disabled={!valid_to_sell}
                    label={getCardLabels().CLOSE}
                    onClick={onClose}
                />
                {valid_to_cancel && (
                    <Button
                        className='open-position-row__cancel'
                        color='black-white'
                        variant='tertiary'
                        size='md'
                        disabled={Number(profit) >= 0 || isSellRequested}
                        label={getCardLabels().CANCEL}
                        onClick={onCancel}
                    />
                )}
            </div>
        </div>
    );
};

export default OpenPositionRow;
