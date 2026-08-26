import { useQuery } from '@deriv/api';

const RUNS_CACHE_CONFIG = {
    STALE_TIME: 30 * 1000, // 30 seconds — runs change frequently
} as const;

/**
 * Fetches all automated trading runs for the current account.
 */
const useAutoRuns = () => {
    const {
        data: response,
        isLoading,
        error,
        refetch,
    } = useQuery('auto_list', {
        options: {
            staleTime: RUNS_CACHE_CONFIG.STALE_TIME,
        },
    });

    return {
        runs: response?.auto_list?.runs ?? [],
        isLoading,
        error,
        refetch,
    };
};

export default useAutoRuns;
