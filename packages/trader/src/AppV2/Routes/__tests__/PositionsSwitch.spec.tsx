import React from 'react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';

import { mockStore, StoreProvider } from '@deriv/stores';
import { useDevice } from '@deriv-com/ui';
import { render, screen } from '@testing-library/react';

import PositionsSwitch from '../PositionsSwitch';

jest.mock('@deriv-com/ui', () => ({
    ...jest.requireActual('@deriv-com/ui'),
    useDevice: jest.fn(),
}));

jest.mock('AppV2/Containers/Positions', () => {
    const Positions = () => <div data-testid='positions-page'>Positions</div>;
    Positions.displayName = 'Positions';
    return { __esModule: true, default: Positions };
});

describe('PositionsSwitch', () => {
    const renderComponent = (isMobile: boolean, initialPath = '/positions') => {
        (useDevice as jest.Mock).mockReturnValue({ isMobile });
        const history = createMemoryHistory({ initialEntries: [initialPath] });
        const store = mockStore({
            ui: {
                setSidebarFlyout: jest.fn(),
            },
        });

        render(
            <StoreProvider store={store}>
                <Router history={history}>
                    <PositionsSwitch />
                </Router>
            </StoreProvider>
        );

        return { history, store };
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should render Positions page on mobile', async () => {
        renderComponent(true);
        expect(await screen.findByTestId('positions-page')).toBeInTheDocument();
    });

    it('should not render Positions page on desktop', () => {
        renderComponent(false);
        expect(screen.queryByTestId('positions-page')).not.toBeInTheDocument();
    });

    it('should redirect to index route on desktop', () => {
        const { history } = renderComponent(false);
        expect(history.location.pathname).toBe('/');
    });

    it('should open positions flyout on desktop', () => {
        const { store } = renderComponent(false);
        expect(store.ui.setSidebarFlyout).toHaveBeenCalledWith('positions');
    });
});
