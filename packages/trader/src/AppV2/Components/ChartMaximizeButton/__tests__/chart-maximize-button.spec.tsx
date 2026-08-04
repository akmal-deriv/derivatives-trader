import { mockStore, StoreProvider } from '@deriv/stores';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ChartMaximizeButton from '../chart-maximize-button';

const mockUseDevice = jest.fn(() => ({ isMobile: true }));
jest.mock('@deriv-com/ui', () => ({
    ...jest.requireActual('@deriv-com/ui'),
    useDevice: () => mockUseDevice(),
}));

describe('ChartMaximizeButton', () => {
    beforeEach(() => {
        mockUseDevice.mockReturnValue({ isMobile: true });
    });

    const renderButton = (ui_overrides = {}) => {
        const store = mockStore({
            ui: { is_chart_maximized: false, toggleChartMaximized: jest.fn(), ...ui_overrides },
        });
        render(
            <StoreProvider store={store}>
                <ChartMaximizeButton />
            </StoreProvider>
        );
        return store;
    };

    it('renders the "Maximize chart" button when not maximized', () => {
        renderButton();
        expect(screen.getByRole('button', { name: 'Maximize chart' })).toBeInTheDocument();
    });

    it('renders the "Minimize chart" button when maximized', () => {
        renderButton({ is_chart_maximized: true });
        expect(screen.getByRole('button', { name: 'Minimize chart' })).toBeInTheDocument();
    });

    it('calls toggleChartMaximized on click', async () => {
        const toggleChartMaximized = jest.fn();
        renderButton({ toggleChartMaximized });
        await userEvent.click(screen.getByRole('button'));
        expect(toggleChartMaximized).toHaveBeenCalledTimes(1);
    });

    it('renders nothing on desktop', () => {
        mockUseDevice.mockReturnValue({ isMobile: false });
        const { container } = render(
            <StoreProvider store={mockStore({ ui: { is_chart_maximized: false, toggleChartMaximized: jest.fn() } })}>
                <ChartMaximizeButton />
            </StoreProvider>
        );
        expect(container).toBeEmptyDOMElement();
    });
});
