import React from 'react';
import { observer } from 'mobx-react-lite';

import { useSnackbar } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

import { ERROR_SNACKBAR_DURATION } from 'AppV2/Utils/layout-utils';
import { useAutomationStore } from 'Stores/useAutomationStore';

import { getAutomationStopMessage } from './automation-stop-message';

const STOP_REASON_MESSAGES: Record<string, React.ReactNode> = {
    TakeProfit: <Localize i18n_default_text='Profit threshold reached. Automation stopped.' />,
    StopLoss: <Localize i18n_default_text='Loss threshold reached. Automation stopped.' />,
    MaxContracts: <Localize i18n_default_text='Max contracts reached. Automation stopped.' />,
};

// Bridges the MobX `last_stop_event` to a snackbar. Must mount inside
// `SnackbarProvider`. Uses `addSnackbar` (not `setServicesError`) so the
// message shows on every route — the services-error snackbar/modal aren't
// mounted on the mobile `/automate` route.
const AutomationStopSnackbar = observer(() => {
    const { last_stop_event, acknowledgeStopEvent } = useAutomationStore();
    const { addSnackbar } = useSnackbar();
    const last_handled_run_id = React.useRef<string | null>(null);

    React.useEffect(() => {
        if (!last_stop_event || last_stop_event.run_id === last_handled_run_id.current) return;
        last_handled_run_id.current = last_stop_event.run_id;
        // Consume the event immediately: this component dies with the trader module
        // (a Reports round trip unmounts it) while the store outlives it, so the local
        // ref alone can't stop the same stop being re-announced on every return.
        // Clearing here rather than in `onSnackbarRemove` closes the window in which a
        // fast round trip could re-raise it before the snackbar auto-dismisses.
        acknowledgeStopEvent();

        if (last_stop_event.stop_reason === 'condition_triggered') {
            const message = STOP_REASON_MESSAGES[last_stop_event.code];
            if (message)
                addSnackbar({
                    message,
                    hasCloseButton: true,
                    delay: ERROR_SNACKBAR_DURATION,
                });
            return;
        }

        // auto_get's stop_reason_code is a compound `Code(Subcode)` string with
        // no `code_args`; `getAutomationStopMessage` parses it and returns a
        // clean, param-free automation message (see that helper for why the raw
        // shared mapper isn't enough here).
        addSnackbar({
            message: getAutomationStopMessage(last_stop_event.code),
            status: 'fail',
            hasCloseButton: true,
            hasFixedHeight: false,
            delay: ERROR_SNACKBAR_DURATION,
        });
    }, [last_stop_event, addSnackbar, acknowledgeStopEvent]);

    return null;
});

export default AutomationStopSnackbar;
