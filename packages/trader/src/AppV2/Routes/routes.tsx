import { lazy } from 'react';

import { routes } from '@deriv/shared';

import { TRouteConfig } from 'Types';

import ContractDetailsSwitch from './ContractDetailsSwitch';
import PositionsSwitch from './PositionsSwitch';

// Lazy load route components for better code splitting
const Trade = lazy(() => import(/* webpackChunkName: "trader-trade" */ 'AppV2/Containers/Trade'));

type TRouteConfigExtended = Omit<TRouteConfig, 'routes'> & {
    path: string;
    component: React.ComponentType;
    default: boolean;
};

const traderRoutes: TRouteConfigExtended[] = [
    {
        path: routes.index,
        component: Trade,
        exact: true,
        default: false,
    },
    {
        path: routes.trader_positions,
        component: PositionsSwitch,
        is_authenticated: true,
        default: false,
    },
    {
        path: routes.contract,
        component: ContractDetailsSwitch,
        is_authenticated: true,
        default: false,
    },
    {
        // default route
        path: '/*',
        component: lazy(() => import('Modules/Page404')),
        default: false,
    },
];

export default traderRoutes;
