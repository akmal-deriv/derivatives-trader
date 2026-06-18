import React from 'react';

import { useTranslations } from '@deriv-com/translations';

import {
    getParamDescription,
    getStrategyDescription,
    getStrategyOrderIndex,
    KNOWN_PARAM_KEYS,
    TStrategyOption,
} from 'AppV2/Components/AutomationPanel/automation-config';
import { useAutomationStore } from 'Stores/useAutomationStore';

import useAutoStrategies from './useAutoStrategies';

/**
 * Shared hook for automation configuration logic used by both
 * desktop (AutomationPanel) and mobile (AutomateMobile) views.
 */
const useAutomationConfig = () => {
    const automation_store = useAutomationStore();
    const { config } = automation_store;
    const { strategies: server_strategies } = useAutoStrategies();
    // Subscribe to the active language so consumers re-render on a language
    // switch — our `localize()`-derived descriptions are plain strings and won't
    // refresh otherwise (they'd be stale until a page reload).
    const { currentLang } = useTranslations();

    const strategy_options: TStrategyOption[] = React.useMemo(
        () =>
            // Sort to a stable preferred order (Martingale first); BE order isn't reliable.
            [...server_strategies]
                .sort((a, b) => getStrategyOrderIndex(a.strategy_id) - getStrategyOrderIndex(b.strategy_id))
                .map(s => ({
                    value: s.strategy_id,
                    label: s.display_name,
                    // Prefer our localized copy; fall back to the (English-only) BE text.
                    description: getStrategyDescription(s.strategy_id) ?? s.description,
                })),
        // `currentLang` isn't read in the body but recomputes the localized
        // descriptions when the language switches.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [server_strategies, currentLang]
    );

    const selected_strategy = React.useMemo(
        () => server_strategies.find(s => s.strategy_id === config.strategy),
        [server_strategies, config.strategy]
    );

    const strategy_description = getStrategyDescription(config.strategy) ?? selected_strategy?.description;

    const schema_keys = React.useMemo(() => {
        if (selected_strategy) {
            return new Set(Object.keys(selected_strategy.parameters.properties ?? {}));
        }
        // Fallback to default param keys when server strategies haven't loaded yet
        return new Set(Object.values(KNOWN_PARAM_KEYS) as string[]);
    }, [selected_strategy]);

    // Prefer our own localized copy; fall back to the (English-only) BE schema
    // description for any param we don't map.
    const getSchemaDescription = (key: string) =>
        getParamDescription(config.strategy, key) ?? selected_strategy?.parameters.properties[key]?.description;

    const getParamNumber = (key: string): number => Number(config.strategy_params[key]) || 0;

    const getParamNumberOrNull = (key: string): number | null => {
        const val = config.strategy_params[key];
        return val ? Number(val) : null;
    };

    const setParamFromNumber = (key: string, value: number) => automation_store.setStrategyParam(key, String(value));

    const setParamFromNumberOrNull = (key: string, value: number | null) =>
        automation_store.setStrategyParam(key, value !== null ? String(value) : '');

    return {
        strategy_options,
        selected_strategy,
        strategy_description,
        schema_keys,
        getSchemaDescription,
        getParamNumber,
        getParamNumberOrNull,
        setParamFromNumber,
        setParamFromNumberOrNull,
    };
};

export default useAutomationConfig;
