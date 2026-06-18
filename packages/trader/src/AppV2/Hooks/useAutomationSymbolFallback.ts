import { useEffect, useRef } from 'react';

import { getSymbolDisplayName } from '@deriv/shared';
import { useSnackbar } from '@deriv-com/quill-ui';
import { localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

import { isMultiplierOnlySymbol } from 'AppV2/Utils/symbol-categories-utils';
import { useTraderStore } from 'Stores/useTraderStores';

/**
 * On the automation tab the desktop chart's native market dropdown can't be
 * filtered, so it still lists Multiplier-only markets (e.g. Crash/Boom,
 * Cryptocurrencies) that automation can't trade. If one is selected, revert to
 * the previously selected supported market — or the first supported market when
 * there's no valid one to fall back to (e.g. entering the tab with a
 * carried-over symbol).
 *
 * A snackbar is shown on desktop only — mobile hides these markets from its
 * list entirely, so there a revert only happens silently for a carried-over
 * symbol.
 */
const useAutomationSymbolFallback = () => {
    const { is_automation_tab, active_symbols, symbol, onChange } = useTraderStore();
    const { isMobile } = useDevice();
    const { addSnackbar } = useSnackbar();
    const last_supported_symbol = useRef<string>(symbol);

    useEffect(() => {
        if (!is_automation_tab || active_symbols.length === 0) return;

        const current = active_symbols.find(s => s.underlying_symbol === symbol);
        // Wait until the selected symbol is present in the loaded list.
        if (!current) return;

        if (!isMultiplierOnlySymbol(current)) {
            last_supported_symbol.current = symbol;
            return;
        }

        const previous_is_valid = active_symbols.some(
            s => s.underlying_symbol === last_supported_symbol.current && !isMultiplierOnlySymbol(s)
        );
        const fallback_symbol = previous_is_valid
            ? last_supported_symbol.current
            : (
                  active_symbols.find(s => !isMultiplierOnlySymbol(s) && s.exchange_is_open === 1) ??
                  active_symbols.find(s => !isMultiplierOnlySymbol(s))
              )?.underlying_symbol;

        if (fallback_symbol && fallback_symbol !== symbol) {
            onChange({ target: { name: 'symbol', value: fallback_symbol } });
            if (!isMobile) {
                addSnackbar({
                    message: localize('{{symbol}} is currently unavailable for automation.', {
                        symbol: getSymbolDisplayName(symbol),
                    }),
                    status: 'neutral',
                    hasCloseButton: true,
                    hasFixedHeight: false,
                });
            }
        }
    }, [is_automation_tab, active_symbols, symbol, onChange, isMobile, addSnackbar]);
};

export default useAutomationSymbolFallback;
