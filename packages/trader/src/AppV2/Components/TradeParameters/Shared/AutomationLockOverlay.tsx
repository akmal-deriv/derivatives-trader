import React from 'react';
import { observer } from 'mobx-react-lite';

import { getSymbolDisplayName } from '@deriv/shared';
import { useTranslations } from '@deriv-com/translations';

import useAutomationLockedSnackbar from 'AppV2/Hooks/useAutomationLockedSnackbar';
import { useTraderStore } from 'Stores/useTraderStores';

/**
 * Transparent click-catcher placed over a field that's locked on the automation view. The disabled
 * field swallows clicks, so this sits on top and surfaces a snackbar explaining why. Drop it inside a
 * `position: relative` wrapper (`trade-params__field-locked`).
 *
 * The lock has two causes and the message matches: an active run ("stop automation first"), or an
 * active symbol that can't be automated. A run takes precedence — you can't edit during one regardless.
 */
const AutomationLockOverlay = observer(() => {
    const { is_automation_market_locked, is_symbol_automatable, symbol } = useTraderStore();
    const { localize } = useTranslations();

    const message =
        !is_automation_market_locked && !is_symbol_automatable
            ? localize('{{symbol}} isn’t available for automated trading.', {
                  symbol: getSymbolDisplayName(symbol),
              })
            : undefined;
    const showLockedSnackbar = useAutomationLockedSnackbar(message);

    return <div className='trade-params__lock-overlay' onClick={showLockedSnackbar} role='presentation' />;
});

export default AutomationLockOverlay;
