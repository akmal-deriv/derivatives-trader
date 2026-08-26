import React from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import OpenPositionRow from '../open-position-row';

jest.mock('@deriv/shared', () => ({
    ...jest.requireActual('@deriv/shared'),
    getCurrentTick: jest.fn(() => 5),
    isValidToSell: jest.fn(() => true),
}));

const contract_info = {
    contract_id: 123,
    contract_type: 'CALL',
    buy_price: 10,
    profit: 1.15,
    bid_price: 11.15,
    tick_count: 10,
    date_start: 1700000000,
    underlying_symbol: 'R_100',
    currency: 'USD',
} as any;

const baseProps = { currency: 'USD', onCancel: jest.fn(), onClose: jest.fn() };

describe('OpenPositionRow', () => {
    it('renders P/L with a currency symbol prefix, the stake and the tick duration', () => {
        render(<OpenPositionRow contractInfo={contract_info} {...baseProps} />);

        expect(screen.getByText('P/L:')).toBeInTheDocument();
        expect(screen.getByText('+$1.15')).toBeInTheDocument();
        expect(screen.getByText(/10\.00 USD|10 USD/)).toBeInTheDocument();
        expect(screen.getByText(/5\/10 ticks/)).toBeInTheDocument();
    });

    it('calls onClose when the Close button is tapped', async () => {
        const onClose = jest.fn();
        render(<OpenPositionRow contractInfo={contract_info} {...baseProps} onClose={onClose} />);

        await userEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('disables the Close button when the contract is not valid to sell', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const shared = jest.requireMock('@deriv/shared');
        shared.isValidToSell.mockReturnValueOnce(false);

        render(<OpenPositionRow contractInfo={contract_info} {...baseProps} />);
        expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
    });

    it('renders the digit-prediction label for Over/Under instead of an arrow', () => {
        render(
            <OpenPositionRow
                contractInfo={{ ...contract_info, contract_type: 'DIGITUNDER', barrier: '7' }}
                {...baseProps}
            />
        );
        expect(screen.getByText('7')).toBeInTheDocument();
    });

    it('renders TP and SL tags when take profit and stop loss are set', () => {
        render(
            <OpenPositionRow
                contractInfo={{
                    ...contract_info,
                    limit_order: { take_profit: { order_amount: 5 }, stop_loss: { order_amount: 3 } },
                }}
                {...baseProps}
            />
        );
        expect(screen.getByText('TP')).toBeInTheDocument();
        expect(screen.getByText('SL')).toBeInTheDocument();
    });

    it('renders a DC tag and a Cancel button for a cancellable multiplier', () => {
        render(
            <OpenPositionRow
                contractInfo={{
                    ...contract_info,
                    contract_type: 'MULTUP',
                    tick_count: undefined,
                    profit: -1,
                    is_valid_to_cancel: 1,
                }}
                {...baseProps}
            />
        );
        expect(screen.getByText('DC')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('does not render a Cancel button when the contract is not cancellable', () => {
        render(<OpenPositionRow contractInfo={contract_info} {...baseProps} />);
        expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    });

    it('does not render a duration for multipliers', () => {
        render(<OpenPositionRow contractInfo={{ ...contract_info, contract_type: 'MULTUP' }} {...baseProps} />);
        // A non-multiplier tick contract would show "5/10 ticks"; multipliers show no duration.
        expect(screen.queryByText(/ticks/)).not.toBeInTheDocument();
    });
});
