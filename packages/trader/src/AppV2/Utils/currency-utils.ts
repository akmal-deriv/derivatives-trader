import { formatMoney, getCurrencyDisplayCode } from '@deriv/shared';

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

/**
 * Formats an amount the way every trade-params surface shows it: the currency's symbol prefixed to
 * the value (`$10.00`) rather than the code trailing it (`10.00 USD`). Returns a plain string so the
 * symbol and the value stay one text node — `<Money show_currency />` splits them across elements,
 * which breaks selection, copy and text queries.
 *
 * `should_format` mirrors `Money`'s prop: off for values the API already formatted (turbos/vanilla).
 */
export const formatAmountWithSymbol = (currency = '', amount: number | string, should_format = true): string =>
    `${getCurrencySymbol(currency)}${should_format ? formatMoney(currency, amount, true, 0, 0) : amount}`;

/**
 * Formats a signed profit/loss: the sign, then the symbol, then the absolute value (`-$1.25`) — the
 * symbol must never sit between the sign and the digits (`$-1.25`).
 *
 * `should_show_plus` mirrors `Money`'s `has_sign`: off by default, so only losses carry a sign.
 */
export const formatSignedAmountWithSymbol = (
    currency = '',
    amount: number | string,
    should_show_plus = false
): string => {
    const value = Number(amount);
    let sign = '';
    if (value < 0) sign = '-';
    else if (value > 0 && should_show_plus) sign = '+';

    return `${sign}${formatAmountWithSymbol(currency, Math.abs(value))}`;
};
