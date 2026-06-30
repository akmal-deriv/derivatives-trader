import { useEffect } from 'react';

import useIsEuAccount from './useIsEuAccount';

type TUseIsAutomationEnabled = {
    /** On for everyone except EU (DIEL) accounts; `false` until `is_ready`. */
    is_enabled: boolean;
    /** `true` once EU status is known. Gate redirects/tab resets on this. */
    is_ready: boolean;
};

/**
 * Automation availability. Wraps `useIsEuAccount` and toggles the
 * `automation-enabled` root class (for SCSS) once the status is known.
 */
const useIsAutomationEnabled = (): TUseIsAutomationEnabled => {
    const { is_eu, is_ready } = useIsEuAccount();
    const is_enabled = is_ready && !is_eu;

    useEffect(() => {
        if (is_ready) document.body.classList.toggle('automation-enabled', is_enabled);
    }, [is_enabled, is_ready]);

    return { is_enabled, is_ready };
};

export default useIsAutomationEnabled;
