import React from 'react';

import { TPortfolioPosition } from '@deriv/stores/types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import OpenPositionsSheet from '../open-positions-sheet';

jest.mock('@deriv/shared', () => ({
    ...jest.requireActual('@deriv/shared'),
    getCurrentTick: jest.fn(() => 5),
    isValidToSell: jest.fn(() => true),
}));

const makePosition = (contract_id: number): TPortfolioPosition =>
    ({
        contract_info: {
            contract_id,
            contract_type: 'CALL',
            buy_price: 10,
            profit: 1.15,
            bid_price: 11.15,
            tick_count: 10,
            date_start: 1700000000,
            underlying_symbol: 'R_100',
            currency: 'USD',
        },
    }) as unknown as TPortfolioPosition;

const baseProps = {
    currency: 'USD',
    marketName: 'Volatility 100 Index',
    onClickCancel: jest.fn(),
    onClickSell: jest.fn(),
    onClose: jest.fn(),
    serverTime: undefined,
    totalProfit: 2.3,
};

describe('OpenPositionsSheet', () => {
    it('does not render its content when closed', () => {
        render(<OpenPositionsSheet {...baseProps} isOpen={false} positions={[makePosition(1)]} />);
        expect(screen.queryByText('1 open positions')).not.toBeInTheDocument();
    });

    it('renders the count title, total P/L and one row per position when open', () => {
        render(<OpenPositionsSheet {...baseProps} isOpen positions={[makePosition(1), makePosition(2)]} />);
        expect(screen.getByText('2 open positions')).toBeInTheDocument();
        expect(screen.getByText('Total P/L')).toBeInTheDocument();
        expect(screen.getByText('+$2.30')).toBeInTheDocument();
        expect(screen.getAllByTestId('dt_open_position_row')).toHaveLength(2);
    });

    it('uses the singular title when there is exactly one open position', () => {
        render(<OpenPositionsSheet {...baseProps} isOpen positions={[makePosition(1)]} />);
        expect(screen.getByText('1 open position')).toBeInTheDocument();
        expect(screen.queryByText('1 open positions')).not.toBeInTheDocument();
    });

    it('sells the right contract when a row Close button is tapped', async () => {
        const onClickSell = jest.fn();
        render(<OpenPositionsSheet {...baseProps} isOpen onClickSell={onClickSell} positions={[makePosition(42)]} />);
        await userEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(onClickSell).toHaveBeenCalledWith(42);
    });
});
