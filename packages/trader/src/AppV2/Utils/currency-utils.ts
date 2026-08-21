import { getCurrencyDisplayCode } from '@deriv/shared';

/**
 * Currency-symbol map ported from `packages/core/src/Stores/Helpers/chart-markers.js`
 * (the same symbols the chart uses to prefix a contract's P/L). Ported rather than imported
 * because `@deriv/core` depends on `@deriv/trader`, so importing it here would be circular.
 *
 * Shared by `ProfitAmount` (chart pill, P/L, position rows) and the minimized trade-param chips,
 * which both render the symbol before the value (`$2`) rather than the code after it (`2 USD`).
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
    AUD: 'A$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    USD: '$',
    BTC: '₿',
    ETH: 'E',
    LTC: 'Ł',
    UST: '₮',
};

/** Returns the currency's display symbol (e.g. `$`), falling back to its code for unlisted currencies. */
export const getCurrencySymbol = (currency = ''): string =>
    CURRENCY_SYMBOLS[currency] || getCurrencyDisplayCode(currency);
