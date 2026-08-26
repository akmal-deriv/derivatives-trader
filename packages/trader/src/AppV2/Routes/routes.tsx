import { lazy } from 'react';

import { routes } from '@deriv/shared';
import { localize } from '@deriv-com/translations';

import { TRouteConfig } from 'Types';

// Lazy load route components for better code splitting
const Trade = lazy(() => import(/* webpackChunkName: "trader-trade" */ 'AppV2/Containers/Trade'));
const AutomateSwitch = lazy(() => import(/* webpackChunkName: "trader-automate-switch" */ './AutomateSwitch'));
const PositionsSwitch = lazy(() => import(/* webpackChunkName: "trader-positions-switch" */ './PositionsSwitch'));
const ContractDetailsSwitch = lazy(
    () => import(/* webpackChunkName: "trader-contract-details-switch" */ './ContractDetailsSwitch')
);

type TRouteConfigExtended = Omit<TRouteConfig, 'routes'> & {
    path: string;
    component: React.ComponentType;
    default: boolean;
};

const traderRoutes: TRouteConfigExtended[] = [
    {
        path: routes.index,
        component: Trade,
        getTitle: () => localize('Trade'),
        exact: true,
        default: false,
    },
    {
        path: routes.trader_automate,
        component: AutomateSwitch,
        getTitle: () => localize('Automate'),
        default: false,
    },
    {
        path: routes.trader_positions,
        component: PositionsSwitch,
        getTitle: () => localize('Positions'),
        is_authenticated: true,
        default: false,
    },
    {
        path: routes.contract,
        component: ContractDetailsSwitch,
        getTitle: () => localize('Contract Details'),
        is_authenticated: true,
        default: false,
    },
    {
        // default route
        path: '/*',
        component: lazy(() => import('Modules/Page404')),
        getTitle: () => localize('Error 404'),
        default: false,
    },
];

export default traderRoutes;
