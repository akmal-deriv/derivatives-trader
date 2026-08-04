import {
    CONTRACT_TYPES,
    getSupportedContracts,
    getTotalProfit,
    isContractSupportedAndStarted,
    isHighLow,
    isMultiplierContract,
    isTurbosContract,
    isVanillaContract,
    TRADE_TYPES,
} from '@deriv/shared';
import { TPortfolioPosition } from '@deriv/stores/types';

import { TRADE_MODE } from 'AppV2/Components/Filter/trade-mode-filter';
import { TClosedPosition } from 'AppV2/Containers/Positions/positions-content';
import { filterByContractType } from 'Modules/Contract/Components/ContractAudit/positions-helper';

import { CONTRACT_LIST } from './trade-types-utils';

export const DEFAULT_DATE_FORMATTING_CONFIG = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
} as Record<string, string>;

export const TAB_NAME = {
    OPEN: 'Open',
    CLOSED: 'Closed',
};

export const filterPositions = (positions: (TPortfolioPosition | TClosedPosition)[], filter: string[]) => {
    if (!filter.length) return positions;
    // Split contract type names with '/' (e.g. Rise/Fall)
    const splittedFilter = filter.map(option => (option.includes('/') ? option.split('/') : option)).flat();

    return positions.filter(({ contract_info }) => {
        const config = getSupportedContracts(isHighLow({ shortcode: contract_info.shortcode }))[
            contract_info.contract_type as keyof ReturnType<typeof getSupportedContracts>
        ];
        if (!config) return false;
        return splittedFilter.includes('main_title' in config ? config.main_title : config.name);
    });
};

/**
 * Filters closed positions by trade mode (manual vs. automation). The BE sets
 * `auto_run_id` on contracts opened via an automation run; manual trades omit
 * the field entirely. Empty/falsy filter or any unrecognised value returns
 * the positions untouched.
 */
export const filterByTradeMode = <T extends { contract_info: { auto_run_id?: string } }>(
    positions: T[],
    tradeModeFilter: string
): T[] => {
    if (tradeModeFilter !== TRADE_MODE.AUTOMATION && tradeModeFilter !== TRADE_MODE.MANUAL) {
        return positions;
    }
    const is_automation_mode = tradeModeFilter === TRADE_MODE.AUTOMATION;
    return positions.filter(({ contract_info }) => !!contract_info.auto_run_id === is_automation_mode);
};
const contractTypesConfig = {
    [CONTRACT_LIST.ACCUMULATORS]: [CONTRACT_TYPES.ACCUMULATOR],
    [CONTRACT_LIST.VANILLAS]: [CONTRACT_TYPES.VANILLA.CALL, CONTRACT_TYPES.VANILLA.PUT],
    [CONTRACT_LIST.TURBOS]: [CONTRACT_TYPES.TURBOS.LONG, CONTRACT_TYPES.TURBOS.SHORT],
    [CONTRACT_LIST.MULTIPLIERS]: [CONTRACT_TYPES.MULTIPLIER.DOWN, CONTRACT_TYPES.MULTIPLIER.UP],
    [CONTRACT_LIST.RISE_FALL]: [CONTRACT_TYPES.CALL, CONTRACT_TYPES.PUT, CONTRACT_TYPES.CALLE, CONTRACT_TYPES.PUTE],
    [CONTRACT_LIST.HIGHER_LOWER]: [CONTRACT_TYPES.CALL, CONTRACT_TYPES.PUT],
    [CONTRACT_LIST.TOUCH_NO_TOUCH]: [CONTRACT_TYPES.TOUCH.NO_TOUCH, CONTRACT_TYPES.TOUCH.ONE_TOUCH],
    [CONTRACT_LIST.MATCHES_DIFFERS]: [CONTRACT_TYPES.MATCH_DIFF.DIFF, CONTRACT_TYPES.MATCH_DIFF.MATCH],
    [CONTRACT_LIST.EVEN_ODD]: [CONTRACT_TYPES.EVEN_ODD.EVEN, CONTRACT_TYPES.EVEN_ODD.ODD],
    [CONTRACT_LIST.OVER_UNDER]: [CONTRACT_TYPES.OVER_UNDER.OVER, CONTRACT_TYPES.OVER_UNDER.UNDER],
};

export const getFilteredContractTypes = (filter: string[] = []) => {
    if (!filter.length) return [];
    const filteredContractTypes = filter
        .map(option => contractTypesConfig[option as keyof typeof contractTypesConfig] ?? [])
        .flat();
    return [...new Set(filteredContractTypes)];
};

export const getProfit = (
    contract_info: TPortfolioPosition['contract_info'] | TClosedPosition['contract_info']
): string | number => {
    return (
        (contract_info as TClosedPosition['contract_info']).profit_loss?.replaceAll(',', '') ??
        (isMultiplierContract(contract_info.contract_type)
            ? getTotalProfit(contract_info as TPortfolioPosition['contract_info'])
            : (contract_info as TPortfolioPosition['contract_info']).profit)
    );
};

export const getTotalPositionsProfit = (positions: (TPortfolioPosition | TClosedPosition)[]) => {
    return positions.reduce((sum, { contract_info }) => sum + Number(getProfit(contract_info)), 0);
};

/**
 * Filters positions down to the ones belonging to the currently selected market (`symbol`) and
 * trade type (`contract_type`). This mirrors the exact predicate the trade chart uses to decide
 * which contracts to draw as markers, so the chart, the P/L pill and the open-positions sheet all
 * agree on the same set. Turbos and Vanilla trade types map to two directional contract types, so
 * both directions are matched for those.
 */
export const filterPositionsBySymbolAndTradeType = (
    positions: TPortfolioPosition[],
    symbol: string,
    contract_type: string
) =>
    positions.filter(
        p =>
            isContractSupportedAndStarted(symbol, p.contract_info) &&
            (isTurbosContract(contract_type) || isVanillaContract(contract_type)
                ? filterByContractType(
                      p.contract_info,
                      isTurbosContract(contract_type) ? TRADE_TYPES.TURBOS.SHORT : TRADE_TYPES.VANILLA.CALL
                  ) ||
                  filterByContractType(
                      p.contract_info,
                      isTurbosContract(contract_type) ? TRADE_TYPES.TURBOS.LONG : TRADE_TYPES.VANILLA.PUT
                  )
                : filterByContractType(p.contract_info, contract_type))
    );

export const setPositionURLParams = (tab_name: string) => {
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('tab_name', tab_name);
    if (searchParams.toString()) {
        const newQuery = `${window.location.pathname}?${searchParams.toString()}`;
        window.history.replaceState({}, document.title, newQuery);
    }
};
