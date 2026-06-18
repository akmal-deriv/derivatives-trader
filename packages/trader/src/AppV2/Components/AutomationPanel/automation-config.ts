/**
 * Identifiers for the two trade panel tabs. Lives in the automation-config
 * namespace because the `'automation'` tab is the only reason the
 * distinction exists at all and gives `TTradePanelTab` a single source of truth.
 */
export const TRADE_PANEL_TABS = {
    TRADE: 'trade',
    AUTOMATION: 'automation',
} as const;

export type TTradePanelTab = (typeof TRADE_PANEL_TABS)[keyof typeof TRADE_PANEL_TABS];

export type TStrategyOption = {
    value: string;
    label: string;
    description?: string;
};

export type TAutomationConfig = {
    /** Selected strategy ID (e.g. 'martingale'). */
    strategy: string;
    /** Dynamic key-value map of strategy parameter values, keyed by schema property names. */
    strategy_params: Record<string, string>;
};

export const MULTIPLIER_PRESETS = [2, 3, 4, 5, 6, 7];

export const MULTIPLIER_DECIMALS = 2;

export const MULTIPLIER_MAX = 10;

/**
 * Parameter keys from the server JSON Schema that map to specialised UI components.
 * Any parameter key NOT in this set will render as a generic text input.
 */
export const KNOWN_PARAM_KEYS = {
    TAKE_PROFIT: 'take_profit',
    STOP_LOSS: 'stop_loss',
    MULTIPLIER: 'multiplier',
    UNIT: 'unit',
    MAX_STAKE: 'max_stake',
    INITIAL_STAKE: 'initial_stake',
} as const;

export const DEFAULT_STRATEGY_PARAMS: Record<string, string> = {
    [KNOWN_PARAM_KEYS.INITIAL_STAKE]: '1',
    [KNOWN_PARAM_KEYS.MULTIPLIER]: '2',
    [KNOWN_PARAM_KEYS.UNIT]: '2',
    [KNOWN_PARAM_KEYS.TAKE_PROFIT]: '10',
    [KNOWN_PARAM_KEYS.STOP_LOSS]: '10',
    [KNOWN_PARAM_KEYS.MAX_STAKE]: '',
};

export const DEFAULT_AUTOMATION_CONFIG: TAutomationConfig = {
    strategy: 'martingale',
    strategy_params: { ...DEFAULT_STRATEGY_PARAMS },
};

/** Fallback display names for known strategy IDs when server data is unavailable. */
const STRATEGY_DISPLAY_NAMES: Record<string, string> = {
    martingale: 'Martingale',
    dalembert: "D'Alembert",
};

export const getStrategyLabel = (strategy: string, options: TStrategyOption[] = []) =>
    options.find(opt => opt.value === strategy)?.label ?? STRATEGY_DISPLAY_NAMES[strategy] ?? strategy;
