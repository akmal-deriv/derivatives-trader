import React from 'react';

import { useQuery } from '@deriv/api';

import { useAutomationStore } from 'Stores/useAutomationStore';

const STRATEGIES_CACHE_CONFIG = {
    CACHE_TIME: 30 * 60 * 1000, // 30 minutes
    STALE_TIME: 10 * 60 * 1000, // 10 minutes
} as const;

/**
 * Fetches available automated trading strategies and syncs the result into
 * `automation_store.available_strategies` so MobX actions
 * (`validateContractTypeSupport` etc.) can read them synchronously.
 *
 * Must be called inside the `StoreProvider` tree.
 */
const useAutoStrategies = () => {
    const automation_store = useAutomationStore();
    const {
        data: response,
        isLoading,
        error,
    } = useQuery('auto_list_strategies', {
        options: {
            cacheTime: STRATEGIES_CACHE_CONFIG.CACHE_TIME,
            staleTime: STRATEGIES_CACHE_CONFIG.STALE_TIME,
        },
    });

    const strategies = React.useMemo(
        () => response?.auto_list_strategies?.strategies ?? [],
        [response?.auto_list_strategies?.strategies]
    );

    React.useEffect(() => {
        if (strategies.length > 0) {
            automation_store.setStrategies(strategies);
        }
    }, [strategies, automation_store]);

    return {
        strategies,
        isLoading,
        error,
    };
};

export default useAutoStrategies;
