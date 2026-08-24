import React from 'react';

import { render, screen } from '@testing-library/react';

import { getInsufficientBalanceMessage } from '../insufficient-balance-utils';

const FALLBACK = <div>fallback message</div>;

describe('getInsufficientBalanceMessage', () => {
    it('returns the empty-balance copy when balance is 0', () => {
        render(
            <div>{getInsufficientBalanceMessage({ balance: 0, stake: 10, currency: 'USD', fallback: FALLBACK })}</div>
        );

        expect(screen.getByText('Balance is empty. Deposit funds to buy this contract.')).toBeInTheDocument();
        expect(screen.queryByText('fallback message')).not.toBeInTheDocument();
    });

    it('returns the empty-balance copy when balance is "0.00"', () => {
        render(
            <div>
                {getInsufficientBalanceMessage({ balance: '0.00', stake: 10, currency: 'USD', fallback: FALLBACK })}
            </div>
        );

        expect(screen.getByText('Balance is empty. Deposit funds to buy this contract.')).toBeInTheDocument();
    });

    it('returns the balance-aware copy when balance is below the stake', () => {
        render(
            <div>{getInsufficientBalanceMessage({ balance: 4, stake: 10, currency: 'USD', fallback: FALLBACK })}</div>
        );

        expect(screen.getByText('You only have 4.00 USD left. Try a lower stake.')).toBeInTheDocument();
    });

    it('returns the fallback when balance equals the stake', () => {
        render(
            <div>{getInsufficientBalanceMessage({ balance: 10, stake: 10, currency: 'USD', fallback: FALLBACK })}</div>
        );

        expect(screen.getByText('fallback message')).toBeInTheDocument();
    });

    it('returns the fallback when balance is above the stake', () => {
        render(
            <div>{getInsufficientBalanceMessage({ balance: 20, stake: 10, currency: 'USD', fallback: FALLBACK })}</div>
        );

        expect(screen.getByText('fallback message')).toBeInTheDocument();
    });

    it.each([undefined, null, '', 'abc'])('returns the fallback and never a formatted 0.00 for balance %p', balance => {
        render(
            <div>
                {getInsufficientBalanceMessage({
                    balance: balance as unknown as string,
                    stake: 10,
                    currency: 'USD',
                    fallback: FALLBACK,
                })}
            </div>
        );

        expect(screen.getByText('fallback message')).toBeInTheDocument();
        expect(screen.queryByText(/0\.00/)).not.toBeInTheDocument();
    });

    it.each([undefined, '', 0])('returns the fallback when the balance is funded but stake is %p', stake => {
        render(
            <div>
                {getInsufficientBalanceMessage({
                    balance: 5,
                    stake: stake as unknown as string,
                    currency: 'USD',
                    fallback: FALLBACK,
                })}
            </div>
        );

        expect(screen.getByText('fallback message')).toBeInTheDocument();
    });

    it('returns the empty-balance copy when balance is 0 and stake is undefined (order check)', () => {
        render(
            <div>
                {getInsufficientBalanceMessage({
                    balance: 0,
                    stake: undefined,
                    currency: 'USD',
                    fallback: FALLBACK,
                })}
            </div>
        );

        expect(screen.getByText('Balance is empty. Deposit funds to buy this contract.')).toBeInTheDocument();
    });

    it('returns the empty-balance copy for a negative balance (the <= 0 boundary)', () => {
        render(
            <div>{getInsufficientBalanceMessage({ balance: -1, stake: 10, currency: 'USD', fallback: FALLBACK })}</div>
        );

        expect(screen.getByText('Balance is empty. Deposit funds to buy this contract.')).toBeInTheDocument();
    });

    it('strips thousands separators from a comma-grouped balance', () => {
        render(
            <div>
                {getInsufficientBalanceMessage({
                    balance: '10,000.00',
                    stake: 20000,
                    currency: 'USD',
                    fallback: FALLBACK,
                })}
            </div>
        );

        expect(screen.getByText('You only have 10,000.00 USD left. Try a lower stake.')).toBeInTheDocument();
    });

    it('renders a crypto balance at its own decimal precision', () => {
        render(
            <div>
                {getInsufficientBalanceMessage({
                    balance: 0.00012345,
                    stake: 0.001,
                    currency: 'BTC',
                    fallback: FALLBACK,
                })}
            </div>
        );

        expect(screen.getByText('You only have 0.00012345 BTC left. Try a lower stake.')).toBeInTheDocument();
    });
});
