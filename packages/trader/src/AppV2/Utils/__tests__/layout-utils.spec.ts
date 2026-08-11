import { TRADE_TYPES } from '@deriv/shared';

import { checkIsServiceModalError, getChartHeight, isTradeParamVisible } from '../layout-utils';

describe('isTradeParamVisible', () => {
    it('should return correct value for expiration component key', () => {
        const common_args = {
            component_key: 'expiration',
            contract_type: TRADE_TYPES.MULTIPLIER,
            has_cancellation: false,
            symbol: 'cryBTCUSD',
        };
        expect(
            isTradeParamVisible({
                ...common_args,
            })
        ).toEqual(true);
        expect(
            isTradeParamVisible({
                ...common_args,
                symbol: '1HZ100V',
            })
        ).toEqual(false);
        expect(
            isTradeParamVisible({
                ...common_args,
                contract_type: TRADE_TYPES.ACCUMULATOR,
            })
        ).toEqual(false);
    });

    it('should return correct value for mult_info_display component key', () => {
        const common_args = {
            component_key: 'mult_info_display',
            contract_type: TRADE_TYPES.MULTIPLIER,
            has_cancellation: true,
            symbol: '1HZ100V',
        };
        expect(
            isTradeParamVisible({
                ...common_args,
            })
        ).toEqual(true);
        expect(
            isTradeParamVisible({
                ...common_args,
                has_cancellation: false,
            })
        ).toEqual(false);
    });
    it('should return false if there is no such contract type or component_key', () => {
        const common_args = {
            component_key: 'barrier',
            contract_type: TRADE_TYPES.HIGH_LOW,
            has_cancellation: false,
            symbol: '1HZ150V',
        };
        expect(
            isTradeParamVisible({
                ...common_args,
                component_key: 'mock_component_key',
            })
        ).toEqual(false);
        expect(
            isTradeParamVisible({
                ...common_args,
                contract_type: 'mock_contract_type',
            })
        ).toEqual(false);
    });
});

describe('getChartHeight', () => {
    const original_height = window.innerHeight;

    beforeAll(() => (window.innerHeight = 740));
    afterAll(() => (window.innerHeight = original_height));

    it('should return correct chart height', () => {
        const common_args = {
            contract_type: TRADE_TYPES.MATCH_DIFF,
            has_cancellation: false,
            is_accumulator: false,
            symbol: '1HZ100V',
        };
        // window.innerHeight (740) - HEADER (56) - MARKET_SELECTOR (72) - TRADE_PARAM_SHEET (174) - BOTTOM_NAV (56) = 386
        // MATCH_DIFF is a digit type, so subtract DIGIT_INFO (56): 386 - 56 = 330
        // MATCH_DIFF has trade_type_tabs, so subtract TRADE_TYPE_TAB (48): 330 - 48 = 282
        const default_chart_height = 288;
        // base (386) - CHART_STATS (44) = 342 (ACCUMULATOR has no trade_type_tabs)
        const accumulators_chart_height = 338;
        // base (386) - TRADE_TYPE_TAB (48) = 338. The below-params info rows are dropped on
        // responsive, so they no longer reduce the chart height.
        const chart_height_with_trade_type_tabs = 334;

        expect(
            getChartHeight({
                ...common_args,
            })
        ).toEqual(default_chart_height);
        expect(
            getChartHeight({
                ...common_args,
                contract_type: TRADE_TYPES.ACCUMULATOR,
                is_accumulator: true,
            })
        ).toEqual(accumulators_chart_height);
        expect(
            getChartHeight({
                ...common_args,
                contract_type: TRADE_TYPES.MULTIPLIER,
                has_cancellation: true,
            })
        ).toEqual(chart_height_with_trade_type_tabs);
        expect(
            getChartHeight({
                ...common_args,
                contract_type: TRADE_TYPES.MULTIPLIER,
                symbol: 'cryBTCUSD',
            })
        ).toEqual(chart_height_with_trade_type_tabs);
        expect(
            getChartHeight({
                ...common_args,
                contract_type: TRADE_TYPES.VANILLA.CALL,
            })
        ).toEqual(chart_height_with_trade_type_tabs);
        expect(
            getChartHeight({
                ...common_args,
                contract_type: TRADE_TYPES.RISE_FALL,
            })
        ).toEqual(chart_height_with_trade_type_tabs);
        expect(
            getChartHeight({
                ...common_args,
                contract_type: TRADE_TYPES.HIGH_LOW,
            })
        ).toEqual(chart_height_with_trade_type_tabs);
    });

    it('reclaims the market-selector and bottom-nav space when maximized', () => {
        const common_args = {
            contract_type: TRADE_TYPES.RISE_FALL,
            has_cancellation: false,
            is_accumulator: false,
            symbol: '1HZ100V',
        };
        // Non-maximized RISE_FALL: base (386) - TRADE_TYPE_TAB (48) = 338
        const default_height = getChartHeight(common_args);
        // Maximized reclaims MARKET_SELECTOR (72) + BOTTOM_NAV (56) = +128
        expect(getChartHeight({ ...common_args, is_maximized: true })).toEqual(default_height + 72 + 56);
    });
});

describe('checkIsServiceModalError', () => {
    it('returns false if services_error is empty object', () => {
        expect(checkIsServiceModalError({ services_error: {} })).toBe(false);
    });
    it('returns true if services_error has appropriate code', () => {
        expect(checkIsServiceModalError({ services_error: { code: 'InsufficientBalance' } })).toBe(true);
    });
    it('returns true if services_error code is AuthorizationRequired and type is buy', () => {
        expect(checkIsServiceModalError({ services_error: { code: 'AuthorizationRequired', type: 'buy' } })).toBe(true);
    });
});
