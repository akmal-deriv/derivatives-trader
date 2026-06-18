import { useEffect } from 'react';

import { useTraderStore } from 'Stores/useTraderStores';

import useAutomationSupportedTradeTypes from './useAutomationSupportedTradeTypes';

/**
 * On the automation tab, if the trade store's current `contract_type` isn't
 * supported by any automation strategy (e.g. the user was on Higher/Lower in
 * manual trading), switch to the first supported trade type.
 */
const useAutomationTradeTypeFallback = () => {
    const { is_automation_tab, contract_type, onChange } = useTraderStore();
    const supported = useAutomationSupportedTradeTypes();

    useEffect(() => {
        if (!is_automation_tab || supported.size === 0) return;
        if (supported.has(contract_type)) return;
        const [first] = supported;
        if (first) onChange({ target: { name: 'contract_type', value: first } });
    }, [is_automation_tab, contract_type, supported, onChange]);
};

export default useAutomationTradeTypeFallback;
