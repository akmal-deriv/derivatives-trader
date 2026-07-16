import { useEffect } from 'react';

import { TRADE_PANEL_TABS } from 'AppV2/Components/AutomationPanel/automation-config';
import { useTraderStore } from 'Stores/useTraderStores';

import useAutomationSupportedTradeTypes from './useAutomationSupportedTradeTypes';

/**
 * On an automation-unsupported `contract_type`, falls back to the first supported type.
 * Desktop uses `is_automation_tab`; the mobile /automate route passes `is_on_automation_route`.
 * Desktop-only exception: a URL landing keeps the requested type and drops to the manual tab.
 */
const useAutomationTradeTypeFallback = (is_on_automation_route = false) => {
    const { is_automation_tab, contract_type, onChange, setActiveTradePanelTab, url_trade_type, clearUrlTradeType } =
        useTraderStore();
    const supported = useAutomationSupportedTradeTypes();

    useEffect(() => {
        if (supported.size === 0) return;

        // Consume on the first decision after strategies load, whatever the tab.
        const is_url_landing = !!url_trade_type && url_trade_type === contract_type;
        if (url_trade_type) clearUrlTradeType();

        const is_automation_context = is_automation_tab || is_on_automation_route;
        if (!is_automation_context || supported.has(contract_type)) return;

        // Mobile has no manual tab to drop to, so it falls back instead.
        if (is_url_landing && !is_on_automation_route) {
            setActiveTradePanelTab(TRADE_PANEL_TABS.TRADE);
            return;
        }

        const [first] = supported;
        if (first) onChange({ target: { name: 'contract_type', value: first } });
    }, [
        is_automation_tab,
        is_on_automation_route,
        contract_type,
        supported,
        url_trade_type,
        onChange,
        setActiveTradePanelTab,
        clearUrlTradeType,
    ]);
};

export default useAutomationTradeTypeFallback;
