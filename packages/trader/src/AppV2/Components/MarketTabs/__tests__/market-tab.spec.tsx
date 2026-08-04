import { getSymbolDisplayName, TRADE_TYPES } from '@deriv/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MarketTab from '../market-tab';

jest.mock('../../SymbolIconsMapper/symbol-icons-mapper', () => {
    const SymbolIcon = () => <div data-testid='symbol-icon' />;
    return SymbolIcon;
});

const market = { symbol: 'frxEURUSD', contract_type: 'rise_fall' };
const eur_name = getSymbolDisplayName('frxEURUSD');

describe('MarketTab', () => {
    it('renders the name + remove control when active', () => {
        render(<MarketTab market={market} is_active onSelect={jest.fn()} onRemove={jest.fn()} />);
        expect(screen.getByText(eur_name)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Remove market' })).toBeInTheDocument();
    });

    it('shows the Vanilla trade-type name (not Call/Put) in the subtitle', () => {
        render(
            <MarketTab
                market={{ symbol: 'frxEURUSD', contract_type: TRADE_TYPES.VANILLA.CALL }}
                is_active
                onSelect={jest.fn()}
                onRemove={jest.fn()}
            />
        );
        expect(screen.getByText('Vanillas')).toBeInTheDocument();
        expect(screen.queryByText('Call/Put')).not.toBeInTheDocument();
    });

    it('is not marked active + its remove control is non-tabbable when inactive', () => {
        render(<MarketTab market={market} is_active={false} onSelect={jest.fn()} onRemove={jest.fn()} />);
        expect(screen.getByTestId('dt_market_tab')).not.toHaveClass('market-tab--active');
        // The ✕ stays in the DOM (revealed by CSS on hover/active) but isn't keyboard-reachable.
        expect(screen.getByRole('button', { name: 'Remove market' })).toHaveAttribute('tabindex', '-1');
    });

    it('fires onSelect when the tab is tapped', async () => {
        const onSelect = jest.fn();
        render(<MarketTab market={market} is_active={false} onSelect={onSelect} onRemove={jest.fn()} />);
        await userEvent.click(screen.getByTestId('symbol-icon'));
        expect(onSelect).toHaveBeenCalledWith(market);
    });

    it('fires onRemove (without selecting) when ✕ is tapped', async () => {
        const onSelect = jest.fn();
        const onRemove = jest.fn();
        render(<MarketTab market={market} is_active onSelect={onSelect} onRemove={onRemove} />);
        await userEvent.click(screen.getByRole('button', { name: 'Remove market' }));
        expect(onRemove).toHaveBeenCalledWith(market);
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('hides the remove control when it is the only tab (not removable)', () => {
        render(<MarketTab market={market} is_active is_removable={false} onSelect={jest.fn()} onRemove={jest.fn()} />);
        expect(screen.queryByRole('button', { name: 'Remove market' })).not.toBeInTheDocument();
    });

    it('shows a positive P/L amount and marks the tab profit-positive', () => {
        render(
            <MarketTab
                market={market}
                is_active
                profit={412.98}
                currency='USD'
                onSelect={jest.fn()}
                onRemove={jest.fn()}
            />
        );
        expect(screen.getByTestId('dt_market_tab')).toHaveClass('market-tab--profit-positive');
        expect(screen.getByText(/\+.*412\.98/)).toBeInTheDocument();
    });

    it('marks the tab profit-negative for a loss', () => {
        render(
            <MarketTab
                market={market}
                is_active
                profit={-112.04}
                currency='USD'
                onSelect={jest.fn()}
                onRemove={jest.fn()}
            />
        );
        expect(screen.getByTestId('dt_market_tab')).toHaveClass('market-tab--profit-negative');
        expect(screen.getByText(/-.*112\.04/)).toBeInTheDocument();
    });

    it('shows no P/L (nor profit modifier) when there are no open positions', () => {
        render(<MarketTab market={market} is_active onSelect={jest.fn()} onRemove={jest.fn()} />);
        const tab = screen.getByTestId('dt_market_tab');
        expect(tab).not.toHaveClass('market-tab--profit-positive');
        expect(tab).not.toHaveClass('market-tab--profit-negative');
    });

    it('is greyed out and does not fire onSelect when disabled', async () => {
        const onSelect = jest.fn();
        render(<MarketTab market={market} is_active={false} is_disabled onSelect={onSelect} onRemove={jest.fn()} />);
        const tab = screen.getByTestId('dt_market_tab');
        expect(tab).toHaveClass('market-tab--disabled');
        expect(tab).toHaveAttribute('aria-disabled', 'true');
        expect(tab).toHaveAttribute('tabindex', '-1');
        await userEvent.click(screen.getByTestId('symbol-icon'));
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('fires onDisabledClick (not onSelect) when a disabled tab is clicked', async () => {
        const onSelect = jest.fn();
        const onDisabledClick = jest.fn();
        render(
            <MarketTab
                market={market}
                is_active={false}
                is_disabled
                onSelect={onSelect}
                onRemove={jest.fn()}
                onDisabledClick={onDisabledClick}
            />
        );
        await userEvent.click(screen.getByTestId('symbol-icon'));
        expect(onDisabledClick).toHaveBeenCalledWith(market);
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('marks a disabled tab interactive only when onDisabledClick is provided (so the tap isn’t swallowed)', () => {
        // Without a handler the disabled tab stays inert (CSS pointer-events: none).
        const { rerender } = render(
            <MarketTab market={market} is_active={false} is_disabled onSelect={jest.fn()} onRemove={jest.fn()} />
        );
        expect(screen.getByTestId('dt_market_tab')).not.toHaveClass('market-tab--disabled-interactive');
        // With a handler (e.g. locked during a run) it re-enables clicks so the snackbar can fire.
        rerender(
            <MarketTab
                market={market}
                is_active={false}
                is_disabled
                onSelect={jest.fn()}
                onRemove={jest.fn()}
                onDisabledClick={jest.fn()}
            />
        );
        expect(screen.getByTestId('dt_market_tab')).toHaveClass('market-tab--disabled-interactive');
    });

    it('fires onSelect once per tap (active tab → parent opens the replace selector)', async () => {
        const onSelect = jest.fn();
        render(<MarketTab market={market} is_active onSelect={onSelect} onRemove={jest.fn()} />);
        await userEvent.click(screen.getByTestId('symbol-icon'));
        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onSelect).toHaveBeenCalledWith(market);
    });
});
