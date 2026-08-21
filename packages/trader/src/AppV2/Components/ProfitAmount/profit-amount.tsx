import clsx from 'clsx';

import { formatMoney } from '@deriv/shared';

import { getCurrencySymbol } from 'AppV2/Utils/currency-utils';

import './profit-amount.scss';

export type TProfitAmountProps = {
    amount: number | string;
    className?: string;
    currency?: string;
    'data-testid'?: string;
};

/**
 * Renders a signed profit/loss with the account currency symbol BEFORE the value (e.g. `+$1.25`),
 * coloured green for a profit and red for a loss. Shared by the chart pill, the sheet's total P/L
 * and each open-position row so they stay consistent.
 */
const ProfitAmount = ({ amount, className, currency, 'data-testid': data_testid }: TProfitAmountProps) => {
    const value = Number(amount);
    const formatted = formatMoney(currency ?? '', Math.abs(value), true);
    let sign = '';
    if (value > 0) sign = '+';
    else if (value < 0) sign = '-';

    return (
        <span
            data-testid={data_testid}
            className={clsx('chart-pl-amount', className, {
                positive: value > 0,
                negative: value < 0,
            })}
        >
            {`${sign}${getCurrencySymbol(currency)}${formatted}`}
        </span>
    );
};

export default ProfitAmount;
