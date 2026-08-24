import React from 'react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';

import { routes } from '@deriv/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import EmptyPositions, { TEmptyPositionsProps } from '../empty-positions';

describe('EmptyPositions', () => {
    const iconId = 'dt_empty_state_icon';
    const ctaLabel = 'Start trading';

    const renderWithRouter = (props: TEmptyPositionsProps = {}) => {
        const history = createMemoryHistory({ initialEntries: [routes.trader_positions] });
        const view = render(
            <Router history={history}>
                <EmptyPositions {...props} />
            </Router>
        );
        return { history, ...view };
    };

    it('renders the open-tab empty state with the new copy and a Start trading CTA', () => {
        renderWithRouter();
        expect(screen.getByText('No open positions')).toBeInTheDocument();
        expect(screen.getByText('Your active trades will appear here.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: ctaLabel })).toBeInTheDocument();
    });

    it('renders the closed-tab empty state without any CTA', () => {
        renderWithRouter({ isClosedTab: true });
        expect(screen.getByText('No closed positions')).toBeInTheDocument();
        expect(screen.getByText('Your closed positions will be shown here.')).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders the unchanged "No matches found" state without any CTA when noMatchesFound is true', () => {
        renderWithRouter({ noMatchesFound: true });
        expect(screen.getByText('No matches found')).toBeInTheDocument();
        expect(screen.getByText(/Try changing or removing filters/i)).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders an empty state icon regardless of props', () => {
        const history = createMemoryHistory();
        const { rerender } = render(
            <Router history={history}>
                <EmptyPositions />
            </Router>
        );
        expect(screen.getByTestId(iconId)).toBeInTheDocument();

        rerender(
            <Router history={history}>
                <EmptyPositions isClosedTab />
            </Router>
        );
        expect(screen.getByTestId(iconId)).toBeInTheDocument();

        rerender(
            <Router history={history}>
                <EmptyPositions noMatchesFound />
            </Router>
        );
        expect(screen.getByTestId(iconId)).toBeInTheDocument();
    });

    it('navigates to the Trade page when Start trading is clicked', async () => {
        const { history } = renderWithRouter();
        expect(history.location.pathname).toBe(routes.trader_positions);

        await userEvent.click(screen.getByRole('button', { name: ctaLabel }));

        expect(history.location.pathname).toBe(routes.index);
    });
});
