import { useInvalidateQuery, useMutation } from '@deriv/api';

/**
 * Provides stop, pause, and resume actions for an automated trading run.
 */
const useAutoRunActions = () => {
    const invalidate = useInvalidateQuery();

    const {
        mutateAsync: stopAsync,
        isLoading: isStopping,
        error: stopError,
    } = useMutation('auto_stop', {
        onSuccess: () => {
            invalidate('auto_list');
        },
    });

    const { mutateAsync: pauseAsync, isLoading: isPausing, error: pauseError } = useMutation('auto_pause');

    const { mutateAsync: resumeAsync, isLoading: isResuming, error: resumeError } = useMutation('auto_resume');

    const stop = (run_id: string) => stopAsync({ payload: { run_id } });
    const pause = (run_id: string) => pauseAsync({ payload: { run_id } });
    const resume = (run_id: string) => resumeAsync({ payload: { run_id } });

    return {
        stop,
        pause,
        resume,
        isLoading: isStopping || isPausing || isResuming,
        error: stopError || pauseError || resumeError,
    };
};

export default useAutoRunActions;
