import { useSnackbar } from '@deriv-com/quill-ui';
import { useTranslations } from '@deriv-com/translations';

/**
 * Returns a handler that surfaces a "locked until automation is stopped" snackbar —
 * shown when the user clicks something disabled because an automation run is active.
 * Defaults to the trade-params wording; pass `message` for a context-specific one.
 */
const useAutomationLockedSnackbar = (message?: string) => {
    const { addSnackbar } = useSnackbar();
    const { localize } = useTranslations();

    return () =>
        addSnackbar({
            message: message ?? localize('Parameters are locked until automation is stopped.'),
            hasCloseButton: true,
            hasFixedHeight: false,
        });
};

export default useAutomationLockedSnackbar;
