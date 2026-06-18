import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';

import { getIsAutomationEnabled } from '@deriv/shared';
import { mockStore, StoreProvider } from '@deriv/stores';
import { useDevice } from '@deriv-com/ui';
import { render, screen } from '@testing-library/react';

import { TRADE_PANEL_TABS } from 'AppV2/Components/AutomationPanel/automation-config';

import AutomateSwitch from '../AutomateSwitch';

const mockSetActiveTradePanelTab = jest.fn();

jest.mock('@deriv/shared', () => ({
    ...jest.requireActual('@deriv/shared'),
    getIsAutomationEnabled: jest.fn(),
}));

jest.mock('@deriv-com/ui', () => ({
    ...jest.requireActual('@deriv-com/ui'),
    useDevice: jest.fn(),
}));

jest.mock('Stores/useTraderStores', () => ({
    useTraderStore: () => ({ setActiveTradePanelTab: mockSetActiveTradePanelTab }),
}));

jest.mock('AppV2/Containers/Automate', () => {
    const Automate = () => <div data-testid='automate-page'>Automate</div>;
    Automate.displayName = 'Automate';
    return { __esModule: true, default: Automate };
});

describe('AutomateSwitch', () => {
    const renderComponent = (isMobile: boolean, initialPath = '/automate') => {
        (useDevice as jest.Mock).mockReturnValue({ isMobile });
        const history = createMemoryHistory({ initialEntries: [initialPath] });
        const store = mockStore({});

        render(
            <StoreProvider store={store}>
                <Router history={history}>
                    <AutomateSwitch />
                </Router>
            </StoreProvider>
        );

        return { history, store };
    };

    beforeEach(() => {
        // Default: feature enabled for this user/country.
        (getIsAutomationEnabled as jest.Mock).mockReturnValue(true);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should render Automate page on mobile when enabled', async () => {
        renderComponent(true);
        expect(await screen.findByTestId('automate-page')).toBeInTheDocument();
    });

    it('should not render Automate page on desktop', () => {
        renderComponent(false);
        expect(screen.queryByTestId('automate-page')).not.toBeInTheDocument();
    });

    it('should redirect to index route on desktop', () => {
        const { history } = renderComponent(false);
        expect(history.location.pathname).toBe('/');
    });

    it('should select the automation panel tab on desktop', () => {
        renderComponent(false);
        expect(mockSetActiveTradePanelTab).toHaveBeenCalledWith(TRADE_PANEL_TABS.AUTOMATION);
    });

    it('should redirect to index and not render the page when the feature is disabled (even on mobile)', () => {
        (getIsAutomationEnabled as jest.Mock).mockReturnValue(false);
        const { history } = renderComponent(true);
        expect(screen.queryByTestId('automate-page')).not.toBeInTheDocument();
        expect(history.location.pathname).toBe('/');
    });
});
