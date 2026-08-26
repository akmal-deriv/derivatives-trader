import useIsEuAccount from './useIsEuAccount';

type TUseIsAutomationEnabled = {
    /** On for everyone except EU (DIEL) accounts; `false` until `is_ready`. */
    is_enabled: boolean;
    /** `true` once EU status is known. Gate redirects/tab resets on this. */
    is_ready: boolean;
};

/** Automation availability. Thin wrapper over `useIsEuAccount`. */
const useIsAutomationEnabled = (): TUseIsAutomationEnabled => {
    const { is_eu, is_ready } = useIsEuAccount();

    return { is_enabled: is_ready && !is_eu, is_ready };
};

export default useIsAutomationEnabled;
