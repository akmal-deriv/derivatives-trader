import React from 'react';
import { observer } from 'mobx-react-lite';

import { useNotifications } from '@deriv-com/quill-ui';
import { useTranslations } from '@deriv-com/translations';

import { useAutomationStore } from 'Stores/useAutomationStore';
import { useTraderStore } from 'Stores/useTraderStores';

/**
 * Mobile-only headless component that surfaces automation errors via the
 * shared quill notification banner system (the same `quill-notification__banner--mobile`
 * surface the rest of the mobile app uses).
 *
 * Mounting it once anywhere inside the `NotificationsProvider` tree is
 * enough — banners render via the global `<Notifications />` in `app.tsx`.
 *
 * Also clears any stale error when the user switches trade type or sub-tab,
 * so an "X does not support this trade type" banner doesn't reappear after
 * they moved to a supported one.
 */
const AutomationErrorBanner = observer(() => {
    const automation_store = useAutomationStore();
    const { last_error } = automation_store;
    const { contract_type, trade_type_tab } = useTraderStore();
    const { addBanner } = useNotifications();
    const { localize } = useTranslations();

    React.useEffect(() => {
        if (last_error) {
            addBanner({
                title: localize('Error'),
                message: last_error.message,
                type: 'error',
            });
        }
        // Fire only when `last_error` changes. `addBanner`/`localize` are
        // intentionally omitted — their identities change on every banner-list
        // update, so including them would re-run this effect and queue duplicate
        // error notifications for the same error.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [last_error]);

    React.useEffect(() => {
        automation_store.resetError();
    }, [contract_type, trade_type_tab, automation_store]);

    return null;
});

export default AutomationErrorBanner;
