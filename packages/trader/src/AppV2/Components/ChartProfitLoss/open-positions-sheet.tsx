import React from 'react';

import { trackPositionCancelledFromPill, trackPositionClosedFromPill } from '@deriv/shared';
import { TPortfolioPosition } from '@deriv/stores/types';
import { ActionSheet, Text } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

import { getProfit } from 'AppV2/Utils/positions-utils';
import { TRootStore } from 'Types';

import ProfitAmount from '../ProfitAmount';

import OpenPositionRow from './open-position-row';

export type TOpenPositionsSheetProps = {
    currency?: string;
    isOpen: boolean;
    /** Display name of the market these positions belong to, for analytics. */
    marketName: string;
    onClickCancel: (contract_id: number) => void;
    onClickSell: (contract_id: number) => void;
    onClose: () => void;
    positions: TPortfolioPosition[];
    serverTime?: TRootStore['common']['server_time'];
    totalProfit: number;
};

const OpenPositionsSheet = ({
    currency,
    isOpen,
    marketName,
    onClickCancel,
    onClickSell,
    onClose,
    positions,
    serverTime,
    totalProfit,
}: TOpenPositionsSheetProps) => (
    <ActionSheet.Root isOpen={isOpen} onClose={onClose} position='left' expandable={false}>
        <ActionSheet.Portal shouldCloseOnDrag>
            <div className='open-positions-sheet__header'>
                <Text bold className='open-positions-sheet__title'>
                    {positions.length === 1 ? (
                        <Localize i18n_default_text='1 open position' />
                    ) : (
                        <Localize i18n_default_text='{{count}} open positions' values={{ count: positions.length }} />
                    )}
                </Text>
                <div className='open-positions-sheet__total'>
                    <Text size='sm' className='open-positions-sheet__total-label'>
                        <Localize i18n_default_text='Total P/L' />
                    </Text>
                    <Text bold className='open-positions-sheet__total-value'>
                        <ProfitAmount amount={totalProfit} currency={currency} />
                    </Text>
                </div>
            </div>
            <div className='open-positions-sheet__list' data-testid='dt_open_positions_sheet'>
                {positions.map(position => {
                    const { contract_id, date_start } = position.contract_info;
                    const profit = Number(getProfit(position.contract_info));
                    const pl_state = profit >= 0 ? 'profit' : 'loss';
                    const start_epoch = Number(date_start ?? 0);
                    const position_duration = serverTime && start_epoch ? serverTime.unix() - start_epoch : 0;
                    return (
                        <OpenPositionRow
                            key={contract_id}
                            contractInfo={position.contract_info}
                            currency={currency}
                            isSellRequested={position.is_sell_requested}
                            onCancel={() => {
                                if (!contract_id) return;
                                trackPositionCancelledFromPill({
                                    market_name: marketName,
                                    pl_value_at_cancel: profit,
                                    pl_state,
                                });
                                onClickCancel(contract_id);
                            }}
                            onClose={() => {
                                if (!contract_id) return;
                                trackPositionClosedFromPill({
                                    market_name: marketName,
                                    pl_value_at_close: profit,
                                    pl_state,
                                    position_duration,
                                    open_position_count_remaining: positions.length - 1,
                                });
                                onClickSell(contract_id);
                            }}
                            serverTime={serverTime}
                        />
                    );
                })}
            </div>
        </ActionSheet.Portal>
    </ActionSheet.Root>
);

export default OpenPositionsSheet;
