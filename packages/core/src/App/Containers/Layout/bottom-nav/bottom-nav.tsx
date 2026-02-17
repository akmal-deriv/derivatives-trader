import React from 'react';
import { useHistory, useLocation } from 'react-router';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';

import { useMobileBridge } from '@deriv/api';
import {
    StandaloneBarsRegularIcon,
    StandaloneChartAreaFillIcon,
    StandaloneChartAreaRegularIcon,
    StandaloneClockThreeFillIcon,
    StandaloneClockThreeRegularIcon,
    StandaloneHouseBlankFillIcon,
    StandaloneHouseBlankRegularIcon,
} from '@deriv/quill-icons';
import { getBrandUrl, routes } from '@deriv/shared';
import { useStore } from '@deriv/stores';
import { Badge, Navigation } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

type BottomNavProps = {
    className?: string;
};

const BottomNav = observer(({ className }: BottomNavProps) => {
    const history = useHistory();
    const location = useLocation();
    const { client, portfolio, ui, common } = useStore();
    const { active_positions_count } = portfolio;
    const { is_logged_in, currency } = client;
    const { current_language } = common;
    const { sendBridgeEvent, isBridgeAvailable } = useMobileBridge();

    const bottomNavItems = React.useMemo(
        () => [
            {
                icon: <StandaloneHouseBlankRegularIcon iconSize='sm' fill='var(--color-text-primary)' />,
                activeIcon: <StandaloneHouseBlankFillIcon iconSize='sm' />,
                label: <Localize i18n_default_text='Home' />,
                path: null,
                action: 'home' as const,
            },
            {
                icon: <StandaloneChartAreaRegularIcon iconSize='sm' fill='var(--color-text-primary)' />,
                activeIcon: <StandaloneChartAreaFillIcon iconSize='sm' />,
                label: <Localize i18n_default_text='Trade' />,
                path: routes.index,
            },
            {
                icon:
                    active_positions_count > 0 ? (
                        <Badge
                            variant='notification'
                            position='top-right'
                            label={active_positions_count.toString()}
                            color='danger'
                            size='sm'
                            contentSize='sm'
                            className='bottom-nav-item__position-badge'
                        >
                            <StandaloneClockThreeRegularIcon iconSize='sm' fill='var(--color-text-primary)' />
                        </Badge>
                    ) : (
                        <StandaloneClockThreeRegularIcon iconSize='sm' fill='var(--color-text-primary)' />
                    ),
                activeIcon:
                    active_positions_count > 0 ? (
                        <Badge
                            variant='notification'
                            position='top-right'
                            label={active_positions_count.toString()}
                            color='danger'
                            size='sm'
                            contentSize='sm'
                            className='bottom-nav-item__position-badge'
                        >
                            <StandaloneClockThreeFillIcon iconSize='sm' fill='var(--color-text-primary)' />
                        </Badge>
                    ) : (
                        <StandaloneClockThreeFillIcon iconSize='sm' />
                    ),
                label: (
                    <React.Fragment>
                        <span className='user-guide__anchor' />
                        <Localize i18n_default_text='Positions' />
                    </React.Fragment>
                ),
                path: routes.trader_positions,
            },
            {
                icon: <StandaloneBarsRegularIcon iconSize='sm' fill='var(--color-text-primary)' />,
                activeIcon: <StandaloneBarsRegularIcon iconSize='sm' />,
                label: <Localize i18n_default_text='Menu' />,
                path: null,
                action: 'menu' as const,
            },
        ],
        [active_positions_count]
    );

    const navIndex = bottomNavItems.findIndex(item => item.path === location.pathname);
    const [selectedIndex, setSelectedIndex] = React.useState(navIndex > -1 ? navIndex : 1); // Default to Trade (index 1)

    // Sync selectedIndex with route changes (e.g., when navigating from drawer)
    React.useEffect(() => {
        const currentNavIndex = bottomNavItems.findIndex(item => item.path === location.pathname);
        if (currentNavIndex > -1) {
            setSelectedIndex(currentNavIndex);
        } else if (location.pathname === routes.profit || location.pathname === routes.statement) {
            // No icon should be highlighted for these routes (accessed via drawer)
            setSelectedIndex(-1);
        }
    }, [location.pathname, bottomNavItems]);

    const handleSelect = (index: number) => {
        const item = bottomNavItems[index];

        if (item.action === 'home') {
            sendBridgeEvent('trading:home', () => {
                const brandUrl = getBrandUrl();
                const lang_param = current_language ? `&lang=${encodeURIComponent(current_language)}` : '';
                const curr = encodeURIComponent(currency || '');
                window.location.href = `${brandUrl}/home?source=options&acc=options&curr=${curr}${lang_param}`;
            });
            return;
        }

        if (item.action === 'menu') {
            ui.setMobileDrawerOpen(true);
            return;
        }

        if (item.path) {
            setSelectedIndex(index);
            history.push(item.path);
        }
    };

    if (!is_logged_in) return null;

    return (
        <Navigation.Bottom
            className={classNames('bottom-nav-container', className)}
            onChange={(_, index) => handleSelect(index)}
        >
            {bottomNavItems.map((item, index) => (
                <Navigation.BottomAction
                    key={index}
                    index={index}
                    activeIcon={<></>}
                    icon={index === selectedIndex ? item.activeIcon : item.icon}
                    label={item.label}
                    selected={index === selectedIndex}
                    showLabel
                    className={classNames(
                        'bottom-nav-item',
                        index === selectedIndex && 'bottom-nav-item--active',
                        item.path === routes.trader_positions && 'bottom-nav-item--positions'
                    )}
                />
            ))}
        </Navigation.Bottom>
    );
});

export default BottomNav;
