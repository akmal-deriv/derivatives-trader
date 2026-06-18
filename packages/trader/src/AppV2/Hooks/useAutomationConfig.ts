import React from 'react';

import { KNOWN_PARAM_KEYS, TStrategyOption } from 'AppV2/Components/AutomationPanel/automation-config';
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

    const strategy_options: TStrategyOption[] = React.useMemo(
        () =>
            server_strategies.map(s => ({
                value: s.strategy_id,
                label: s.display_name,
                description: s.description,
            })),
        [server_strategies]
    );

    const selected_strategy = React.useMemo(
        () => server_strategies.find(s => s.strategy_id === config.strategy),
        [server_strategies, config.strategy]
    );

    const schema_keys = React.useMemo(() => {
        if (selected_strategy) {
            return new Set(Object.keys(selected_strategy.parameters.properties ?? {}));
        }
        // Fallback to default param keys when server strategies haven't loaded yet
        return new Set(Object.values(KNOWN_PARAM_KEYS) as string[]);
    }, [selected_strategy]);

    const getSchemaDescription = (key: string) => selected_strategy?.parameters.properties[key]?.description;

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
        schema_keys,
        getSchemaDescription,
        getParamNumber,
        getParamNumberOrNull,
        setParamFromNumber,
        setParamFromNumberOrNull,
    };
};

export default useAutomationConfig;
