import clsx from 'clsx';

import { formatSignedAmountWithSymbol } from 'AppV2/Utils/currency-utils';

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

    return (
        <span
            data-testid={data_testid}
            className={clsx('chart-pl-amount', className, {
                positive: value > 0,
                negative: value < 0,
            })}
        >
            {formatSignedAmountWithSymbol(currency, value, true)}
        </span>
    );
};

export default ProfitAmount;
