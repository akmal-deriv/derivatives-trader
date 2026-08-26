import { useEffect, useRef } from 'react';

import { getSymbolDisplayName } from '@deriv/shared';
import { useSnackbar } from '@deriv-com/quill-ui';
import { localize } from '@deriv-com/translations';

import { isMultiplierOnlySymbol } from 'AppV2/Utils/symbol-categories-utils';
import { useTraderStore } from 'Stores/useTraderStores';

/**
 * A few markets (Cryptocurrencies, Crash/Boom) offer an automatable trade type yet can't be traded by
 * automation. When one becomes the active symbol on the automation view we KEEP the user on the tab —
 * Run and the trade params are disabled elsewhere (`is_symbol_automatable` / `is_automation_params_locked`) —
 * and surface a one-time snackbar explaining why.
 *
 * We intentionally do NOT revert the symbol: the previous revert fought the market strip's tab logic
 * (which pins the active market to its open tab) and drove an infinite render loop.
 */
const useNonAutomatableSymbolSnackbar = () => {
    const { is_automation_mode, active_symbols, symbol } = useTraderStore();
    const { addSnackbar } = useSnackbar();
    // The symbol we last surfaced the notice for, so it fires once per non-automatable symbol (and
    // again if the user returns to it after moving away).
    const notified_symbol = useRef<string | null>(null);

    useEffect(() => {
        if (!is_automation_mode || active_symbols.length === 0) return;
        const current = active_symbols.find(s => s.underlying_symbol === symbol);
        // Wait until the selected symbol is present in the loaded list.
        if (!current) return;
        if (!isMultiplierOnlySymbol(current)) {
            notified_symbol.current = null;
            return;
        }
        if (notified_symbol.current === symbol) return;
        notified_symbol.current = symbol;
        addSnackbar({
            message: localize('{{symbol}} isn’t available for automated trading.', {
                symbol: getSymbolDisplayName(symbol),
            }),
            status: 'neutral',
            hasCloseButton: true,
            hasFixedHeight: false,
        });
    }, [is_automation_mode, active_symbols, symbol, addSnackbar]);
};

export default useNonAutomatableSymbolSnackbar;
