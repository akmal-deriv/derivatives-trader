import React from 'react';

import { RemainingTime } from '@deriv/components';
import { LabelPairedStopwatchCaptionRegularIcon } from '@deriv/quill-icons';
import { type Dayjs, getCardLabels, symbols_2s } from '@deriv/shared';
import { TPortfolioPosition } from '@deriv/stores/types';
import { Tag } from '@deriv-com/quill-ui';

import { TRootStore } from 'Types';

export type TContractCardStatusTimerProps = Pick<
    TPortfolioPosition['contract_info'],
    'date_expiry' | 'date_start' | 'tick_count' | 'underlying_symbol'
> & {
    currentTick?: number | null;
    isSold?: boolean;
    serverTime?: TRootStore['common']['server_time'];
};

export const ContractCardStatusTimer = ({
    currentTick,
    date_expiry,
    date_start,
    isSold,
    serverTime,
    tick_count,
    underlying_symbol,
}: TContractCardStatusTimerProps) => {
    // BE sets `tick_count` on contracts whose duration is in ticks,
    // independent of whether any tick has arrived yet. Without an upfront
    // check, the timer would render the `date_expiry` countdown
    // ("00:00:09") for the first 1-2s after purchase and then flicker to
    // "1 ticks" once the first tick-stream message lands. To stay seamless
    // we extrapolate the tick count locally from `date_start` at the
    // symbol's known cadence (2s for `R_*`, 1s for everything else per
    // `symbols_2s` in @deriv/shared), then take the max of that and the
    // BE-confirmed `currentTick` so the count advances immediately and
    // snaps up whenever the BE confirms a higher value.
    const is_tick_contract = !!tick_count;
    const tick_interval_seconds = underlying_symbol && symbols_2s.includes(underlying_symbol) ? 2 : 1;
    const estimated_tick =
        is_tick_contract && serverTime && date_start
            ? Math.max(
                  0,
                  Math.min(
                      tick_count ?? 0,
                      Math.floor(((serverTime as Dayjs).unix() - Number(date_start)) / tick_interval_seconds)
                  )
              )
            : 0;
    const display_tick = Math.max(estimated_tick, currentTick ?? 0);
    const getDisplayedDuration = () => {
        if (is_tick_contract) {
            return `${display_tick} ${getCardLabels().TICKS.toLowerCase()}`;
        }
        if (date_expiry && serverTime) {
            return (
                <RemainingTime
                    as='span'
                    end_time={date_expiry}
                    getCardLabels={getCardLabels}
                    start_time={serverTime as Dayjs}
                    key='remaining-time'
                />
            );
        }
        return null;
    };
    const displayedDuration = getDisplayedDuration();

    if (!date_expiry || (serverTime as Dayjs)?.unix() > +date_expiry || isSold) {
        return <Tag className='status' label={getCardLabels().CLOSED} variant='custom' color='custom' size='sm' />;
    }
    return displayedDuration ? (
        <Tag
            className='timer'
            icon={
                <LabelPairedStopwatchCaptionRegularIcon
                    key='open-contract-card'
                    fill='var(--component-tag-label-color-default)'
                />
            }
            label={displayedDuration}
            variant='custom'
            size='sm'
        />
    ) : null;
};
