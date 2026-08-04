import { getCurrencyDisplayCode } from '@deriv/shared';

/**
 * Currency-symbol map ported from `packages/core/src/Stores/Helpers/chart-markers.js`
 * (the same symbols the chart uses to prefix a contract's P/L). Ported rather than imported
 * because `@deriv/core` depends on `@deriv/trader`, so importing it here would be circular.
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
