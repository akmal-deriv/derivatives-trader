import React from 'react';

import { LabelPairedChevronDownCaptionRegularIcon } from '@deriv/quill-icons';
import { CaptionText } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

import ProfitAmount from '../ProfitAmount';

export type TProfitLossPillProps = {
    count: number;
    currency?: string;
    onClick: () => void;
    totalProfit: number;
};

const ProfitLossPill = ({ count, currency, onClick, totalProfit }: TProfitLossPillProps) => (
    <button type='button' className='chart-profit-loss__pill' onClick={onClick} data-testid='dt_chart_profit_loss_pill'>
        <span className='chart-profit-loss__count'>{count}</span>
        <span className='chart-profit-loss__return'>
            <CaptionText bold className='chart-profit-loss__label'>
                <Localize i18n_default_text='P/L' />
            </CaptionText>
            <ProfitAmount
                amount={totalProfit}
                currency={currency}
                className='chart-profit-loss__amount'
                data-testid='dt_chart_profit_loss_amount'
            />
            <LabelPairedChevronDownCaptionRegularIcon fill='var(--component-textIcon-normal-prominent)' />
        </span>
    </button>
);

export default ProfitLossPill;
