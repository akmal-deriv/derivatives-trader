import { TActiveSymbolsResponse } from '@deriv/api';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MarketCard from '../market-card';

jest.mock('../../SymbolIconsMapper/symbol-icons-mapper', () => {
    const SymbolIcon = () => <div data-testid='symbol-icon' />;
    return SymbolIcon;
});

type ActiveSymbols = NonNullable<TActiveSymbolsResponse['active_symbols']>;

const makeItem = (overrides: Partial<ActiveSymbols[number]> = {}): ActiveSymbols[number] =>
    ({
        underlying_symbol: 'frxEURUSD',
        market: 'forex',
        submarket: 'major_pairs',
        subgroup: 'major_pairs',
        exchange_is_open: 1,
        is_trading_suspended: 0,
        display_order: 0,
        ...overrides,
    }) as ActiveSymbols[number];

describe('MarketCard', () => {
    it('renders the windowed change for an open market', () => {
        render(<MarketCard item={makeItem()} change_percentage={1.25} discovery_window='5m' onSelect={jest.fn()} />);
        expect(screen.getByText(/\+1\.25%/)).toBeInTheDocument();
        expect(screen.getByText('(5m)')).toBeInTheDocument();
    });

    it('shows CLOSED instead of a change for a closed market', () => {
        render(
            <MarketCard
                item={makeItem({ exchange_is_open: 0 })}
                change_percentage={1.25}
                discovery_window='5m'
                onSelect={jest.fn()}
            />
        );
        expect(screen.getByText('CLOSED')).toBeInTheDocument();
        expect(screen.queryByText(/\+1\.25%/)).not.toBeInTheDocument();
    });

    it('fires onSelect when the card is tapped', async () => {
        const onSelect = jest.fn();
        render(<MarketCard item={makeItem()} change_percentage={0} discovery_window='1h' onSelect={onSelect} />);
        await userEvent.click(screen.getByTestId('symbol-icon'));
        expect(onSelect).toHaveBeenCalledWith('frxEURUSD');
    });

    it('opens info via the chevron without selecting the market', async () => {
        const onSelect = jest.fn();
        const onInfo = jest.fn();
        render(
            <MarketCard
                item={makeItem()}
                change_percentage={0}
                discovery_window='5m'
                onSelect={onSelect}
                onInfo={onInfo}
            />
        );
        await userEvent.click(screen.getByRole('button', { name: 'Info' }));
        expect(onInfo).toHaveBeenCalledWith('frxEURUSD');
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('does not render the info chevron when no onInfo handler is provided', () => {
        render(<MarketCard item={makeItem()} change_percentage={0} discovery_window='5m' onSelect={jest.fn()} />);
        expect(screen.queryByRole('button', { name: 'Info' })).not.toBeInTheDocument();
    });
});
