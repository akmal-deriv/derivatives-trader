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

    describe('chevron cue', () => {
        it('shows the chevron on the trade-type row of the active tab', () => {
            render(<MarketTab market={market} is_active onSelect={jest.fn()} onRemove={jest.fn()} />);
            const chevron = screen.getByTestId('dt_market_tab_chevron');
            expect(chevron).toBeInTheDocument();
            // The cue belongs to the trade-type row, not the market-name line — a structural
            // requirement no role/text query can express.
            /* eslint-disable testing-library/no-node-access */
            const subtitle = chevron.closest('.market-tab__subtitle');
            expect(subtitle).toBeInTheDocument();
            // The row truncates as one text line, so the cue must trail the trade-type text: a
            // narrow tab then drops the cue and keeps the tab readable, rather than the reverse.
            // (The trade type is bare text on the row, hence the node check over an element query.)
            // eslint-disable-next-line jest-dom/prefer-to-have-text-content
            expect(subtitle?.firstChild?.textContent).toBe('Rise/Fall');
            expect(subtitle?.lastElementChild).toBe(chevron);
            /* eslint-enable testing-library/no-node-access */
        });

        it('shows no chevron on an inactive tab (its tap only activates it)', () => {
            render(<MarketTab market={market} is_active={false} onSelect={jest.fn()} onRemove={jest.fn()} />);
            expect(screen.getByText('Rise/Fall')).toBeInTheDocument();
            expect(screen.queryByTestId('dt_market_tab_chevron')).not.toBeInTheDocument();
        });

        it('shows no chevron on a disabled tab (its tap only surfaces the reason)', () => {
            render(
                <MarketTab
                    market={market}
                    is_active={false}
                    is_disabled
                    onSelect={jest.fn()}
                    onRemove={jest.fn()}
                    onDisabledClick={jest.fn()}
                />
            );
            expect(screen.queryByTestId('dt_market_tab_chevron')).not.toBeInTheDocument();
        });

        it('shows no chevron on an active tab whose tap does not open the selector', async () => {
            // e.g. the strip is locked by a running automation: the running tab stays active (and
            // keeps its highlight + live P/L) but its tap only surfaces the locked snackbar.
            const onSelect = jest.fn();
            render(
                <MarketTab market={market} is_active opens_selector={false} onSelect={onSelect} onRemove={jest.fn()} />
            );
            const tab = screen.getByTestId('dt_market_tab');
            expect(tab).toHaveClass('market-tab--active');
            expect(screen.getByText('Rise/Fall')).toBeInTheDocument();
            expect(screen.queryByTestId('dt_market_tab_chevron')).not.toBeInTheDocument();
            // …and no assistive-tech affordance either, so it isn't announced as opening a dialog.
            expect(tab).not.toHaveAttribute('aria-haspopup');
            expect(tab).not.toHaveAttribute('aria-label');
            // The tap still reaches the parent, which decides what to do with it (the snackbar).
            await userEvent.click(screen.getByTestId('symbol-icon'));
            expect(onSelect).toHaveBeenCalledWith(market);
        });

        it('shows no chevron when the trade type resolves to no display name (no subtitle row)', () => {
            render(
                <MarketTab
                    market={{ symbol: 'frxEURUSD', contract_type: 'not_a_contract_type' }}
                    is_active
                    onSelect={jest.fn()}
                    onRemove={jest.fn()}
                />
            );
            expect(screen.queryByTestId('dt_market_tab_chevron')).not.toBeInTheDocument();
        });

        it('fires onSelect once when the chevron itself is tapped (decorative, not its own control)', async () => {
            const onSelect = jest.fn();
            render(<MarketTab market={market} is_active onSelect={onSelect} onRemove={jest.fn()} />);
            await userEvent.click(screen.getByTestId('dt_market_tab_chevron'));
            expect(onSelect).toHaveBeenCalledTimes(1);
            expect(onSelect).toHaveBeenCalledWith(market);
        });

        it('hides the chevron from assistive tech and announces the action on the active tab', () => {
            render(<MarketTab market={market} is_active onSelect={jest.fn()} onRemove={jest.fn()} />);
            expect(screen.getByTestId('dt_market_tab_chevron')).toHaveAttribute('aria-hidden', 'true');
            const tab = screen.getByTestId('dt_market_tab');
            expect(tab).toHaveAttribute('aria-haspopup', 'dialog');
            // The label replaces the announced text content, so it must still carry both values.
            expect(tab).toHaveAccessibleName(expect.stringContaining(eur_name));
            expect(tab).toHaveAccessibleName(expect.stringContaining('Rise/Fall'));
        });

        it('adds no text content, so text-based tab locators keep matching', () => {
            // The E2E strip specs identify tabs by their rendered text (`toHaveText`/`hasText`), so
            // the cue must stay text-free — it is an icon, not a glyph in the label.
            const { rerender } = render(
                <MarketTab market={market} is_active={false} onSelect={jest.fn()} onRemove={jest.fn()} />
            );
            const without_cue = screen.getByTestId('dt_market_tab').textContent;
            rerender(<MarketTab market={market} is_active onSelect={jest.fn()} onRemove={jest.fn()} />);
            expect(screen.getByTestId('dt_market_tab')).toHaveTextContent(without_cue as string);
            // `toHaveTextContent` collapses whitespace and matches substrings, so it can't prove the
            // text is BYTE-identical — which is what the E2E `hasText` locators depend on. Assert that
            // directly.
            // eslint-disable-next-line jest-dom/prefer-to-have-text-content
            expect(screen.getByTestId('dt_market_tab').textContent).toBe(without_cue);
        });

        it('leaves a non-active tab without the popup/label affordance', () => {
            render(<MarketTab market={market} is_active={false} onSelect={jest.fn()} onRemove={jest.fn()} />);
            const tab = screen.getByTestId('dt_market_tab');
            expect(tab).not.toHaveAttribute('aria-haspopup');
            expect(tab).not.toHaveAttribute('aria-label');
        });
    });

    describe('P/L separator', () => {
        it('separates the chevron from the P/L with a divider rule, not a bullet glyph', () => {
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
            const separator = screen.getByTestId('dt_market_tab_profit_separator');
            // Per Figma it is a 1×12px vertical rule drawn in CSS — so it must contribute no text of
            // its own (the old `•` did), keeping the tab's text content free of decorative glyphs.
            // eslint-disable-next-line jest-dom/prefer-to-have-text-content
            expect(separator.textContent).toBe('');
            expect(separator).toHaveAttribute('aria-hidden', 'true');
            expect(screen.getByTestId('dt_market_tab')).not.toHaveTextContent('•');
        });

        it('places the divider after the chevron and before the P/L amount', () => {
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
            // The row must read `Rise/Fall ⌄ | +$412.98`; DOM order is what fixes that, since every
            // part of it is an inline flex item.
            const chevron = screen.getByTestId('dt_market_tab_chevron');
            const separator = screen.getByTestId('dt_market_tab_profit_separator');
            const amount = screen.getByText(/\+.*412\.98/);
            /* eslint-disable no-bitwise */
            expect(chevron.compareDocumentPosition(separator) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
            expect(separator.compareDocumentPosition(amount) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
            /* eslint-enable no-bitwise */
        });

        it('renders no divider when there are no open positions (no orphaned separator)', () => {
            render(<MarketTab market={market} is_active onSelect={jest.fn()} onRemove={jest.fn()} />);
            expect(screen.getByTestId('dt_market_tab_chevron')).toBeInTheDocument();
            expect(screen.queryByTestId('dt_market_tab_profit_separator')).not.toBeInTheDocument();
        });

        it('keeps the amount inside the trade-type row, which is what clips it to the tab', () => {
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
            // The row is the box that clips (see `market-tabs-layout.spec.ts`): the amount doesn't
            // shrink, so an amount rendered outside the row would spill over the neighbouring tab
            // once a crowded strip (>4 desktop tabs) shrinks the tab past the text's width.
            /* eslint-disable testing-library/no-node-access */
            expect(screen.getByText(/\+.*412\.98/).closest('.market-tab__subtitle')).toBeInTheDocument();
            expect(screen.getByTestId('dt_market_tab_profit_separator').closest('.market-tab__subtitle')).toBe(
                screen.getByTestId('dt_market_tab_chevron').closest('.market-tab__subtitle')
            );
            /* eslint-enable testing-library/no-node-access */
        });

        it('renders the divider for a loss too', () => {
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
            expect(screen.getByTestId('dt_market_tab_profit_separator')).toBeInTheDocument();
        });
    });
});
