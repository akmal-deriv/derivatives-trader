import React from 'react';

import { render, screen } from '@testing-library/react';

import ProfitAmount from '../profit-amount';

describe('ProfitAmount', () => {
    it('prefixes a profit with a + sign and the account currency symbol', () => {
        render(<ProfitAmount amount={1.25} currency='USD' data-testid='amt' />);
        const el = screen.getByTestId('amt');
        expect(el).toHaveTextContent('+$1.25');
        expect(el).toHaveClass('positive');
    });

    it('prefixes a loss with a - sign and the currency symbol', () => {
        render(<ProfitAmount amount={-2} currency='USD' data-testid='amt' />);
        const el = screen.getByTestId('amt');
        expect(el).toHaveTextContent('-$2.00');
        expect(el).toHaveClass('negative');
    });

    it('uses the account currency symbol, not a hard-coded one', () => {
        render(<ProfitAmount amount={5} currency='EUR' data-testid='amt' />);
        expect(screen.getByTestId('amt')).toHaveTextContent('+€5.00');
    });
});
