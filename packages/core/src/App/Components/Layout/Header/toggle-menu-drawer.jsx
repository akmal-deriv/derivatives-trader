import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import classNames from 'classnames';

import { useMobileBridge } from '@deriv/api';
import { Div100vhContainer, MobileDrawer, Text, ToggleSwitch } from '@deriv/components';
import {
    StandaloneChevronRightRegularIcon,
    StandaloneClockThreeRegularIcon,
    StandaloneFileChartColumnRegularIcon,
    StandaloneGlobeRegularIcon,
    StandaloneLifeRingRegularIcon,
    StandaloneMoonRegularIcon,
    StandaloneRightFromBracketRegularIcon,
    StandaloneSunBrightRegularIcon,
} from '@deriv/quill-icons';
import { getHelpCentreUrl, routes } from '@deriv/shared';
import { observer, useStore } from '@deriv/stores';
import { useTranslations } from '@deriv-com/translations';

import NetworkStatus from 'App/Components/Layout/Footer';
import ServerTime from 'App/Containers/server-time.jsx';

import { MenuTitle, MobileLanguageMenu } from './Components/ToggleMenu';
import MenuLink from './menu-link';

const ToggleMenuDrawer = observer(() => {
    const { localize } = useTranslations();
    const { sendBridgeEvent, isBridgeAvailable } = useMobileBridge();
    const { ui, client } = useStore();
    const {
        disableApp,
        enableApp,
        is_mobile_language_menu_open,
        is_dark_mode_on: is_dark_mode,
        setDarkMode: toggleTheme,
        setMobileLanguageMenuOpen,
        is_mobile_drawer_open,
        setMobileDrawerOpen,
    } = ui;
    const { is_logged_in, logout: logoutClient } = client;

    const { pathname: route } = useLocation();
    const history = useHistory();

    const [transitionExit, setTransitionExit] = React.useState(false);
    const [, setIsSubmenuExpanded] = React.useState(false);

    const timeout = React.useRef();

    // Cleanup timeout on unmount or route change
    React.useEffect(() => {
        return () => {
            if (timeout.current) {
                clearTimeout(timeout.current);
                setTransitionExit(false);
                setMobileDrawerOpen(false);
            }
        };
    }, [route, setMobileDrawerOpen]);

    const toggleDrawer = React.useCallback(() => {
        if (is_mobile_language_menu_open) setMobileLanguageMenuOpen(false);
        if (!is_mobile_drawer_open) {
            setMobileDrawerOpen(true);
        } else {
            setTransitionExit(true);
            timeout.current = setTimeout(() => {
                setMobileDrawerOpen(false);
                setTransitionExit(false);
            }, 400);
        }
        setIsSubmenuExpanded(false);
    }, [
        setIsSubmenuExpanded,
        is_mobile_drawer_open,
        is_mobile_language_menu_open,
        setMobileLanguageMenuOpen,
        setMobileDrawerOpen,
    ]);

    // Simple logout handler that closes drawer and calls logout
    const handleLogout = React.useCallback(async () => {
        toggleDrawer();
        await sendBridgeEvent('trading:back', async () => {
            await logoutClient();
        });
    }, [logoutClient, toggleDrawer, sendBridgeEvent]);

    const handleHelpCentreClick = React.useCallback(() => {
        toggleDrawer();
        window.open(getHelpCentreUrl(), '_blank', 'noopener,noreferrer');
    }, [toggleDrawer]);

    return (
        <React.Fragment>
            <MobileDrawer
                alignment='left'
                icon_class='header__menu-toggle'
                is_open={is_mobile_drawer_open}
                transitionExit={transitionExit}
                toggle={toggleDrawer}
                id='dt_mobile_drawer'
                enableApp={enableApp}
                disableApp={disableApp}
                title={<MenuTitle />}
                height='100vh'
                width='100vw'
            >
                <Div100vhContainer height_offset='40px'>
                    <div className='header__menu-mobile-body-wrapper'>
                        <React.Fragment>
                            <MobileDrawer.Body>
                                {/* Reports Section */}
                                <div className='header__menu-section-header'>
                                    <Text className='header__menu-section-title' size='xsm' weight='bold'>
                                        {localize('Reports')}
                                    </Text>
                                </div>
                                <MobileDrawer.Item
                                    onClick={e => {
                                        e.preventDefault();
                                        toggleDrawer();
                                        history.push(routes.trader_positions);
                                    }}
                                >
                                    <MenuLink
                                        icon={<StandaloneClockThreeRegularIcon iconSize='sm' />}
                                        text={localize('Open positions')}
                                        suffix_icon={<StandaloneChevronRightRegularIcon iconSize='sm' />}
                                    />
                                </MobileDrawer.Item>
                                <MobileDrawer.Item
                                    onClick={e => {
                                        e.preventDefault();
                                        toggleDrawer();
                                        history.push(routes.profit);
                                    }}
                                >
                                    <MenuLink
                                        icon={<StandaloneFileChartColumnRegularIcon iconSize='sm' />}
                                        text={localize('Trade table')}
                                        suffix_icon={<StandaloneChevronRightRegularIcon iconSize='sm' />}
                                    />
                                </MobileDrawer.Item>
                                <MobileDrawer.Item
                                    onClick={e => {
                                        e.preventDefault();
                                        toggleDrawer();
                                        history.push(routes.statement);
                                    }}
                                >
                                    <MenuLink
                                        icon={<StandaloneFileChartColumnRegularIcon iconSize='sm' />}
                                        text={localize('Statement')}
                                        suffix_icon={<StandaloneChevronRightRegularIcon iconSize='sm' />}
                                    />
                                </MobileDrawer.Item>

                                {/* Settings Section */}
                                <div className='header__menu-section-header'>
                                    <Text className='header__menu-section-title' size='xsm' weight='bold'>
                                        {localize('Settings')}
                                    </Text>
                                </div>
                                <MobileDrawer.Item
                                    onClick={e => {
                                        e.preventDefault();
                                        setMobileLanguageMenuOpen(true);
                                    }}
                                >
                                    <MenuLink
                                        icon={<StandaloneGlobeRegularIcon iconSize='sm' />}
                                        text={localize('Language')}
                                        suffix_icon={<StandaloneChevronRightRegularIcon iconSize='sm' />}
                                    />
                                </MobileDrawer.Item>
                                <MobileDrawer.Item
                                    onClick={e => {
                                        e.preventDefault();
                                        toggleTheme(!is_dark_mode);
                                    }}
                                >
                                    <div className={classNames('header__menu-mobile-link')}>
                                        {is_dark_mode ? (
                                            <StandaloneMoonRegularIcon
                                                className='header__menu-mobile-link-icon'
                                                iconSize='sm'
                                                fill='var(--color-text-primary)'
                                            />
                                        ) : (
                                            <StandaloneSunBrightRegularIcon
                                                className='header__menu-mobile-link-icon'
                                                iconSize='sm'
                                                fill='var(--color-text-primary)'
                                            />
                                        )}
                                        <div className='header__menu-mobile-link-text'>
                                            <Text size='s'>{localize('Dark theme')}</Text>
                                            <ToggleSwitch
                                                id='dt_mobile_drawer_theme_toggler'
                                                handleToggle={() => toggleTheme(!is_dark_mode)}
                                                is_enabled={is_dark_mode}
                                            />
                                        </div>
                                    </div>
                                </MobileDrawer.Item>

                                {/* Support Section */}
                                {!isBridgeAvailable && (
                                    <>
                                        <div className='header__menu-section-header'>
                                            <Text className='header__menu-section-title' size='xsm' weight='bold'>
                                                {localize('Support')}
                                            </Text>
                                        </div>
                                        <MobileDrawer.Item onClick={handleHelpCentreClick}>
                                            <MenuLink
                                                icon={<StandaloneLifeRingRegularIcon iconSize='sm' />}
                                                text={localize('Help centre')}
                                                suffix_icon={<StandaloneChevronRightRegularIcon iconSize='sm' />}
                                            />
                                        </MobileDrawer.Item>
                                    </>
                                )}

                                {/* Log out - separated from Settings, red color */}
                                {is_logged_in && !isBridgeAvailable && (
                                    <MobileDrawer.Item
                                        className='header__menu-logout'
                                        onClick={async e => {
                                            e.preventDefault();
                                            await handleLogout();
                                        }}
                                    >
                                        <MenuLink
                                            icon={
                                                <StandaloneRightFromBracketRegularIcon
                                                    iconSize='sm'
                                                    fill='var(--color-text-danger)'
                                                />
                                            }
                                            text={localize('Log out')}
                                        />
                                    </MobileDrawer.Item>
                                )}
                            </MobileDrawer.Body>
                            <MobileDrawer.Footer className={is_logged_in ? 'dc-mobile-drawer__footer--servertime' : ''}>
                                <ServerTime is_mobile />
                                <NetworkStatus is_mobile />
                            </MobileDrawer.Footer>
                            {is_mobile_language_menu_open && (
                                <MobileDrawer.SubMenu
                                    is_expanded={is_mobile_language_menu_open}
                                    has_subheader
                                    submenu_title={localize('Language')}
                                    onToggle={is_expanded => {
                                        setIsSubmenuExpanded(is_expanded);
                                        setMobileLanguageMenuOpen(false);
                                    }}
                                    submenu_toggle_class='dc-mobile-drawer__submenu-toggle--hidden'
                                >
                                    <MobileLanguageMenu toggleDrawer={toggleDrawer} />
                                </MobileDrawer.SubMenu>
                            )}
                        </React.Fragment>
                    </div>
                </Div100vhContainer>
            </MobileDrawer>
        </React.Fragment>
    );
});

ToggleMenuDrawer.displayName = 'ToggleMenuDrawer';

export default ToggleMenuDrawer;
