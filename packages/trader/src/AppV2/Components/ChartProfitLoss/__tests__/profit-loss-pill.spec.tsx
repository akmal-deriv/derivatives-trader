import React from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ProfitLossPill from '../profit-loss-pill';

describe('ProfitLossPill', () => {
    it('shows the running-contract count, the P/L label and the amount', () => {
        render(<ProfitLossPill count={4} currency='USD' totalProfit={1.15} onClick={jest.fn()} />);

        expect(screen.getByText('4')).toBeInTheDocument();
        expect(screen.getByText('P/L')).toBeInTheDocument();
        expect(screen.getByTestId('dt_chart_profit_loss_pill')).toHaveTextContent('1.15');
    });

    it('applies the positive class for a profit', () => {
        render(<ProfitLossPill count={1} currency='USD' totalProfit={2} onClick={jest.fn()} />);
        expect(screen.getByTestId('dt_chart_profit_loss_amount')).toHaveClass('positive');
    });

    it('applies the negative class for a loss', () => {
        render(<ProfitLossPill count={1} currency='USD' totalProfit={-2} onClick={jest.fn()} />);
        expect(screen.getByTestId('dt_chart_profit_loss_amount')).toHaveClass('negative');
    });

    it('calls onClick when tapped', async () => {
        const onClick = jest.fn();
        render(<ProfitLossPill count={1} currency='USD' totalProfit={1} onClick={onClick} />);

        await userEvent.click(screen.getByTestId('dt_chart_profit_loss_pill'));
        expect(onClick).toHaveBeenCalledTimes(1);
    });
});
