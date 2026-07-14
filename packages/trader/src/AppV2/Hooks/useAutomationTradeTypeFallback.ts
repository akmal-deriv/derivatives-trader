import { useEffect } from 'react';

import { TRADE_PANEL_TABS } from 'AppV2/Components/AutomationPanel/automation-config';
import { useTraderStore } from 'Stores/useTraderStores';

import useAutomationSupportedTradeTypes from './useAutomationSupportedTradeTypes';

/**
 * Resolves an automation-unsupported `contract_type` on the automation tab:
 * - URL landing (`url_trade_type`, set by the store's URL when-block together
 *   with `contract_type`): keep the requested type and switch to the manual
 *   Trade tab. Consumed one-shot; reloads count as URL landings since the app
 *   mirrors trade_type into the URL.
 * - Manual navigation: fall back to the first supported trade type, so the
 *   automation tab is always enterable from the panel tabs.
 *
 * Desktop-only in practice — the mobile /automate route uses the
 * `is_automation` prop, not `is_automation_tab`.
 */
const useAutomationTradeTypeFallback = () => {
    const { is_automation_tab, contract_type, onChange, setActiveTradePanelTab, url_trade_type, clearUrlTradeType } =
        useTraderStore();
    const supported = useAutomationSupportedTradeTypes();

    useEffect(() => {
        if (supported.size === 0) return;

        // Consume on the first decision after strategies load, whatever the tab.
        const is_url_landing = !!url_trade_type && url_trade_type === contract_type;
        if (url_trade_type) clearUrlTradeType();

        if (!is_automation_tab || supported.has(contract_type)) return;

        if (is_url_landing) {
            setActiveTradePanelTab(TRADE_PANEL_TABS.TRADE);
            return;
        }

        const [first] = supported;
        if (first) onChange({ target: { name: 'contract_type', value: first } });
    }, [
        is_automation_tab,
        contract_type,
        supported,
        url_trade_type,
        onChange,
        setActiveTradePanelTab,
        clearUrlTradeType,
    ]);
};

export default useAutomationTradeTypeFallback;
