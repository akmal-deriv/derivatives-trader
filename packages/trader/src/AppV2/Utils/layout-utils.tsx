import { TCommonStoreServicesError } from '@deriv/stores/types';

import { isDigitTradeType } from 'AppV2/Utils/digits';

import { getTradeParams } from './trade-params-utils';

export const HEIGHT = {
    HEADER: 56,
    TRADE_TYPE_TAB: 48,
    MARKET_SELECTOR: 72,
    CHART_STATS: 44,
    TRADE_PARAM_SHEET: 170,
    DIGIT_INFO: 56,
    BOTTOM_NAV: 56,
};

// Duration (ms) of the mobile chart maximize/minimize transition. The JS timer that disarms the
// chart-height transition (see trade-mobile.tsx) MUST match the `0.3s` CSS transitions on the
// collapsing chrome (trade.scss `.trade__chart--maximize-animating`, compact-header/header/bottom-nav);
// if they drift, the chart snaps mid-animation.
export const CHART_MAXIMIZE_ANIMATION_MS = 300;

export const ASPECT_RATIO = 0.5625;

export const isTradeParamVisible = ({
    component_key,
    contract_type,
    has_cancellation,
    symbol,
}: {
    component_key: string;
    contract_type: string;
    has_cancellation: boolean;
    symbol: string;
}) => {
    const params = getTradeParams(symbol, has_cancellation)?.[contract_type] ?? {};
    return component_key in params;
};

export const getChartHeight = ({
    contract_type,
    has_cancellation,
    is_accumulator,
    is_maximized = false,
    symbol,
}: {
    contract_type: string;
    has_cancellation: boolean;
    is_accumulator: boolean;
    /** Mobile chart-maximize mode: the market strip and bottom-nav collapse, so the chart
     * reclaims their height. The header stays (swapped for the equal-height compact header). */
    is_maximized?: boolean;
    symbol: string;
}) => {
    let height =
        window.innerHeight - HEIGHT.HEADER - HEIGHT.MARKET_SELECTOR - HEIGHT.TRADE_PARAM_SHEET - HEIGHT.BOTTOM_NAV;

    // Reclaim the collapsed market strip + bottom-nav space when maximized.
    if (is_maximized) {
        height += HEIGHT.MARKET_SELECTOR + HEIGHT.BOTTOM_NAV;
    }

    const isVisible = (component_key: string) =>
        isTradeParamVisible({ component_key, symbol, has_cancellation, contract_type });

    if (is_accumulator) {
        height -= HEIGHT.CHART_STATS;
    }

    if (isDigitTradeType(contract_type)) {
        height -= HEIGHT.DIGIT_INFO;
    }

    if (isVisible('trade_type_tabs')) {
        height -= HEIGHT.TRADE_TYPE_TAB;
    }

    return height;
};

export const SERVICE_ERROR = {
    INSUFFICIENT_BALANCE: 'InsufficientBalance',
    INVALID_CONTRACT_PROPOSAL: 'InvalidContractProposal',
    AUTHORIZATION_REQUIRED: 'AuthorizationRequired',
    COMPANY_WIDE_LIMIT_EXCEEDED: 'CompanyWideLimitExceeded',
};

export const checkIsServiceModalError = ({ services_error }: { services_error: TCommonStoreServicesError }) => {
    const { code, type } = services_error || {};
    // Error modal is shown only for next four types. For the rest - snackbar.
    const is_insufficient_balance = code === SERVICE_ERROR.INSUFFICIENT_BALANCE;
    const is_authorization_required = code === SERVICE_ERROR.AUTHORIZATION_REQUIRED && type === 'buy';
    return is_insufficient_balance || is_authorization_required;
};
