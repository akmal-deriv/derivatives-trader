import type { TAutoContractTemplate } from '@deriv/api';
import { useInvalidateQuery, useMutation } from '@deriv/api';

/**
 * Starts a new automated trading run.
 * Invalidates the auto_list cache on success so the runs list stays current.
 */
const useAutoStart = () => {
    const invalidate = useInvalidateQuery();
    const { mutateAsync, isLoading, isError, error, data } = useMutation('auto_start', {
        onSuccess: () => {
            invalidate('auto_list');
        },
    });

    const startRun = (
        strategy_id: string,
        strategy_parameters: Record<string, unknown>,
        contract_template: TAutoContractTemplate
    ) => {
        return mutateAsync({
            payload: {
                strategy_id,
                strategy_parameters,
                contract_template,
            },
        });
    };

    return {
        startRun,
        isStarting: isLoading,
        isError,
        error,
        run: data?.auto_start ?? null,
    };
};

export default useAutoStart;
