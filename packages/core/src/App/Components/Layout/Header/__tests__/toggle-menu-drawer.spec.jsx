import React from 'react';
import { BrowserRouter } from 'react-router-dom';

import { APIProvider, useMobileBridge } from '@deriv/api';
import { mockStore, StoreProvider } from '@deriv/stores';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ToggleMenuDrawer from '../toggle-menu-drawer';

// Mock all the problematic imports
jest.mock('@deriv/components', () => {
    const MobileDrawer = jest.fn(({ children, is_open, toggle }) => (
        <div data-testid='mobile-drawer' style={{ display: is_open ? 'block' : 'none' }}>
            <button onClick={toggle} data-testid='close-drawer'>
                Close
            </button>
            {children}
        </div>
    ));
    MobileDrawer.SubMenu = jest.fn(({ children }) => <div data-testid='drawer-submenu'>{children}</div>);
    MobileDrawer.Item = jest.fn(({ children, onClick, className }) => (
        <div data-testid='drawer-item' onClick={onClick} className={className}>
            {children}
        </div>
    ));
    MobileDrawer.Body = jest.fn(({ children }) => <div data-testid='drawer-body'>{children}</div>);
    MobileDrawer.Footer = jest.fn(({ children }) => <div data-testid='drawer-footer'>{children}</div>);
    return {
        MobileDrawer,
        Text: jest.fn(({ children, className, size, weight }) => (
            <span className={className} data-size={size} data-weight={weight}>
                {children}
            </span>
        )),
        ToggleSwitch: jest.fn(({ handleToggle, is_enabled }) => (
            <div data-testid='toggle-switch' onClick={handleToggle}>
                {is_enabled ? 'ON' : 'OFF'}
            </div>
        )),
        Div100vhContainer: jest.fn(({ children }) => <div data-testid='div-100vh'>{children}</div>),
    };
});

jest.mock('@deriv/quill-icons', () => ({
    StandaloneChevronRightRegularIcon: () => <div data-testid='chevron-right-icon'>ChevronRight</div>,
    StandaloneClockThreeRegularIcon: () => <div data-testid='clock-icon'>Clock</div>,
    StandaloneFileChartColumnRegularIcon: () => <div data-testid='file-chart-icon'>FileChart</div>,
    StandaloneGlobeRegularIcon: () => <div data-testid='globe-icon'>Globe</div>,
    StandaloneLifeRingRegularIcon: () => <div data-testid='life-ring-icon'>LifeRing</div>,
    StandaloneMoonRegularIcon: () => <div data-testid='moon-icon'>Moon</div>,
    StandaloneRightFromBracketRegularIcon: () => <div data-testid='logout-icon'>Logout</div>,
    StandaloneSunBrightRegularIcon: () => <div data-testid='sun-icon'>Sun</div>,
}));

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useLocation: jest.fn(() => ({ pathname: '/appstore/traders-hub' })),
    useHistory: jest.fn(() => ({
        push: mockHistoryPush,
    })),
}));

jest.mock('@deriv/shared', () => ({
    routes: {
        index: '/',
        reports: '/reports',
        trader_positions: '/positions',
        profit: '/reports/profit',
        statement: '/reports/statement',
    },
    getBrandUrl: jest.fn(() => 'https://deriv.com'),
    getApiCoreBaseUrl: jest.fn(() => 'https://api.deriv.com'),
    getHelpCentreUrl: jest.fn(() => 'https://trade.deriv.com/help-centre'),
    useWS: jest.fn(() => ({})),
    getAccountType: jest.fn(() => 'demo'),
    toGMTFormat: jest.fn(() => 'GMT Time'),
    toLocalFormat: jest.fn(() => 'Local Time'),
    isMobile: jest.fn(() => false),
    isDesktop: jest.fn(() => true),
    formatMoney: jest.fn(amount => amount),
    getCurrencyDisplayCode: jest.fn(currency => currency),
    getDecimalPlaces: jest.fn(() => 2),
    addComma: jest.fn(num => num),
    isEmptyObject: jest.fn(obj => Object.keys(obj || {}).length === 0),
    cloneObject: jest.fn(obj => ({ ...obj })),
    getPropertyValue: jest.fn((obj, key) => obj?.[key]),
    LocalStore: {
        get: jest.fn(),
        set: jest.fn(),
        remove: jest.fn(),
    },
    SessionStore: {
        get: jest.fn(),
        set: jest.fn(),
        remove: jest.fn(),
    },
}));

const mockSendBridgeEvent = jest.fn().mockResolvedValue(true);

// Mock @deriv/api with both useMobileBridge and useRemoteConfig
jest.mock('@deriv/api', () => ({
    ...jest.requireActual('@deriv/api'),
    useMobileBridge: jest.fn(() => ({
        sendBridgeEvent: mockSendBridgeEvent,
        isBridgeAvailable: false,
        isDesktop: false,
    })),
    useRemoteConfig: jest.fn(() => ({
        data: {
            cs_chat_intercom: true,
            cs_chat_whatsapp: true,
        },
    })),
}));

// Mock the ToggleMenu components
jest.mock('../Components/ToggleMenu', () => ({
    MenuTitle: () => <div data-testid='menu-title'>Menu Title</div>,
    MobileLanguageMenu: () => <div data-testid='mobile-language-menu'>Language Menu</div>,
}));

// Mock MenuLink
jest.mock('../menu-link', () => {
    return jest.fn(({ text, onClickLink, icon }) => (
        <div data-testid='menu-link' onClick={onClickLink}>
            {icon}
            <span>{text}</span>
        </div>
    ));
});

// Mock LiveChat and WhatsApp components
jest.mock('App/Components/Elements/LiveChat', () => {
    return jest.fn(() => <div data-testid='live-chat'>LiveChat</div>);
});

jest.mock('App/Components/Elements/WhatsApp', () => {
    return jest.fn(({ onClick }) => (
        <div data-testid='whatsapp' onClick={onClick}>
            WhatsApp
        </div>
    ));
});

// Mock NetworkStatus
jest.mock('App/Components/Layout/Footer', () => {
    return jest.fn(() => <div data-testid='network-status'>Network Status</div>);
});

// Mock routes config
jest.mock('App/Constants/routes-config', () => {
    return jest.fn(() => [
        {
            path: '/reports',
            icon_component: <div>Reports Icon</div>,
            getTitle: () => 'Reports',
            routes: [
                {
                    path: '/reports/positions',
                    icon_component: <div>Positions Icon</div>,
                    getTitle: () => 'Positions',
                },
            ],
        },
    ]);
});

// Mock ServerTime
jest.mock('App/Containers/server-time.jsx', () => {
    return jest.fn(() => <div data-testid='server-time'>Server Time</div>);
});

describe('<ToggleMenuDrawer />', () => {
    const mockLogout = jest.fn().mockResolvedValue();

    const mockToggleMenuDrawer = (storeOverrides = {}) => {
        const defaultStore = {
            client: {
                is_logged_in: true,
                logout: mockLogout,
                ...storeOverrides.client,
            },
            modules: {
                cashier: {
                    payment_agent: {
                        is_payment_agent_visible: true,
                    },
                },
            },
            traders_hub: {
                show_eu_related_content: false,
            },
            ui: {
                is_mobile_drawer_open: true, // Drawer is open by default for tests
                setMobileDrawerOpen: jest.fn(),
                is_mobile_language_menu_open: false,
                setMobileLanguageMenuOpen: jest.fn(),
                is_dark_mode_on: false,
                setDarkMode: jest.fn(),
                disableApp: jest.fn(),
                enableApp: jest.fn(),
                ...storeOverrides.ui,
            },
            common: {
                current_language: 'EN',
                ...storeOverrides.common,
            },
            ...storeOverrides,
        };

        return (
            <BrowserRouter>
                <APIProvider>
                    <StoreProvider store={mockStore(defaultStore)}>
                        <ToggleMenuDrawer />
                    </StoreProvider>
                </APIProvider>
            </BrowserRouter>
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockHistoryPush.mockClear();
        // Reset useMobileBridge mock to default values
        mockSendBridgeEvent.mockClear().mockResolvedValue(true);
        useMobileBridge.mockReturnValue({
            sendBridgeEvent: mockSendBridgeEvent,
            isBridgeAvailable: false,
            isDesktop: false,
        });
    });

    it('should clear timeout after component was unmount', () => {
        jest.useFakeTimers();
        jest.spyOn(global, 'clearTimeout');
        const { unmount } = render(
            mockToggleMenuDrawer({
                ui: { is_mobile_drawer_open: false }, // Start closed
            })
        );

        unmount();

        expect(clearTimeout).toBeCalled();
    });

    it('should not show logout button when bridge is available', () => {
        // Mock bridge available
        mockSendBridgeEvent.mockResolvedValue(true);
        useMobileBridge.mockReturnValue({
            sendBridgeEvent: mockSendBridgeEvent,
            isBridgeAvailable: true,
        });

        render(mockToggleMenuDrawer());

        // Logout button should not be present when bridge is available
        const logoutItems = screen.queryAllByTestId('drawer-item');
        const logoutItem = logoutItems.find(item => item.textContent && item.textContent.includes('Log out'));

        expect(logoutItem).toBeUndefined();
    });

    it('should fallback to regular logout when bridge is not available', async () => {
        const user = userEvent.setup({ delay: null });
        // Mock bridge not available
        mockSendBridgeEvent.mockImplementation(async (_event, fallback) => {
            if (fallback) {
                await fallback(); // Execute fallback
            }
        });
        useMobileBridge.mockReturnValue({
            sendBridgeEvent: mockSendBridgeEvent,
            isBridgeAvailable: false,
        });

        render(mockToggleMenuDrawer());

        // Find logout menu item and click it
        const logoutItems = screen.getAllByTestId('drawer-item');
        const logoutItem = logoutItems.find(item => item.textContent && item.textContent.includes('Log out'));

        if (logoutItem) {
            await user.click(logoutItem);

            expect(mockSendBridgeEvent).toHaveBeenCalledWith('trading:back', expect.any(Function));
            expect(mockLogout).toHaveBeenCalledTimes(1);
        }
    });

    it('should show Reports section items', () => {
        render(mockToggleMenuDrawer());

        // Check for Reports section items
        expect(screen.getByText('Open positions')).toBeInTheDocument();
        expect(screen.getByText('Trade table')).toBeInTheDocument();
        expect(screen.getByText('Statement')).toBeInTheDocument();
    });

    it('should show "Log out" text when bridge is not available', () => {
        // Mock bridge not available
        useMobileBridge.mockReturnValue({
            sendBridgeEvent: mockSendBridgeEvent,
            isBridgeAvailable: false,
            isDesktop: false,
        });

        render(mockToggleMenuDrawer());

        // The component should show "Log out" when bridge is not available
        expect(screen.getByText('Log out')).toBeInTheDocument();
    });

    it('should show Settings section items', () => {
        render(mockToggleMenuDrawer());

        // Should show settings items
        expect(screen.getByText('Language')).toBeInTheDocument();
        expect(screen.getByText('Dark theme')).toBeInTheDocument();
    });

    it('should render drawer when open', () => {
        render(mockToggleMenuDrawer());

        // Should render the drawer
        const drawer = screen.getByTestId('mobile-drawer');
        expect(drawer).toHaveStyle('display: block');
    });

    it('should handle bridge errors gracefully', async () => {
        // Mock bridge error - test that fallback is called when bridge fails
        const user = userEvent.setup({ delay: null });
        mockSendBridgeEvent.mockImplementation(async (_event, fallback) => {
            if (fallback) {
                await fallback(); // Execute fallback on error
            }
        });
        useMobileBridge.mockReturnValue({
            sendBridgeEvent: mockSendBridgeEvent,
            isBridgeAvailable: false,
        });

        render(mockToggleMenuDrawer());

        // Wait for drawer items to appear and find logout menu item
        let logoutItem;
        await waitFor(() => {
            const logoutItems = screen.queryAllByTestId('drawer-item');
            logoutItem = logoutItems.find(item => item.textContent && item.textContent.includes('Log out'));
            expect(logoutItem).toBeTruthy();
        });

        await user.click(logoutItem);
        expect(mockSendBridgeEvent).toHaveBeenCalledWith('trading:back', expect.any(Function));
        expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    describe('Reports navigation', () => {
        it('should navigate to positions when Open positions is clicked', async () => {
            const user = userEvent.setup({ delay: null });
            render(mockToggleMenuDrawer());

            const positionsLink = screen.getByText('Open positions');
            await user.click(positionsLink);

            expect(mockHistoryPush).toHaveBeenCalledWith('/positions');
        });

        it('should navigate to profit when Trade table is clicked', async () => {
            const user = userEvent.setup({ delay: null });
            render(mockToggleMenuDrawer());

            const profitLink = screen.getByText('Trade table');
            await user.click(profitLink);

            expect(mockHistoryPush).toHaveBeenCalledWith('/reports/profit');
        });

        it('should navigate to statement when Statement is clicked', async () => {
            const user = userEvent.setup({ delay: null });
            render(mockToggleMenuDrawer());

            const statementLink = screen.getByText('Statement');
            await user.click(statementLink);

            expect(mockHistoryPush).toHaveBeenCalledWith('/reports/statement');
        });
    });

    describe('Help centre button', () => {
        it('should render Help centre button with correct icon and text', () => {
            render(mockToggleMenuDrawer());

            const helpCentreItems = screen.getAllByTestId('drawer-item');
            const helpCentreItem = helpCentreItems.find(item => item.textContent?.includes('Help centre'));
            expect(helpCentreItem).toBeInTheDocument();

            // Verify icon is present
            expect(screen.getByTestId('life-ring-icon')).toBeInTheDocument();
        });

        it('should open help centre in new tab when clicked', async () => {
            const user = userEvent.setup({ delay: null });
            const mockWindowOpen = jest.fn();
            window.open = mockWindowOpen;

            render(mockToggleMenuDrawer());

            const helpCentreItems = screen.getAllByTestId('drawer-item');
            const helpCentreItem = helpCentreItems.find(item => item.textContent?.includes('Help centre'));
            await user.click(helpCentreItem);

            expect(mockWindowOpen).toHaveBeenCalledWith(
                'https://trade.deriv.com/help-centre',
                '_blank',
                'noopener,noreferrer'
            );
        });

        it('should hide Help centre button when bridge is available', () => {
            useMobileBridge.mockReturnValue({
                sendBridgeEvent: mockSendBridgeEvent,
                isBridgeAvailable: true,
            });

            render(mockToggleMenuDrawer());

            const helpCentreItems = screen.queryAllByTestId('drawer-item');
            const helpCentreItem = helpCentreItems.find(item => item.textContent?.includes('Help centre'));
            expect(helpCentreItem).toBeUndefined();
        });

        it('should show Help centre button when bridge is not available', () => {
            useMobileBridge.mockReturnValue({
                sendBridgeEvent: mockSendBridgeEvent,
                isBridgeAvailable: false,
            });

            render(mockToggleMenuDrawer());

            const helpCentreItems = screen.getAllByTestId('drawer-item');
            const helpCentreItem = helpCentreItems.find(item => item.textContent?.includes('Help centre'));
            expect(helpCentreItem).toBeInTheDocument();
        });
    });
});
