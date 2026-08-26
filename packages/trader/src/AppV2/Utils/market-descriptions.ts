import { localize } from '@deriv-com/translations';

/**
 * Per-symbol descriptions for the market info screen, keyed by `underlying_symbol`. Copy is sourced
 * from the approved symbol/description sheet; only the symbols this app offers are included. A symbol
 * without an entry simply renders no description, so partial coverage is safe. Kept as an
 * `underlying_symbol` → localized-string map so swapping in a remote source later stays mechanical.
 */
const MARKET_DESCRIPTIONS: Record<string, () => string> = {
    // ---- Forex: Major Pairs ----
    frxAUDJPY: () => localize('Australian Dollar vs Japanese Yen'),
    frxAUDUSD: () => localize('Australian Dollar vs US Dollar'),
    frxEURAUD: () => localize('Euro vs Australian Dollar'),
    frxEURCAD: () => localize('Euro vs Canadian Dollar'),
    frxEURCHF: () => localize('Euro vs Swiss Franc'),
    frxEURGBP: () => localize('Euro vs Great British Pound'),
    frxEURJPY: () => localize('Euro vs Japanese Yen'),
    frxEURUSD: () => localize('Euro vs US Dollar'),
    frxGBPAUD: () => localize('Great British Pound vs Australian Dollar'),
    frxGBPJPY: () => localize('Great British Pound vs Japanese Yen'),
    frxGBPUSD: () => localize('Great British Pound vs US Dollar'),
    frxUSDCAD: () => localize('US Dollar vs Canadian Dollar'),
    frxUSDCHF: () => localize('US Dollar vs Swiss Franc'),
    frxUSDJPY: () => localize('US Dollar vs Japanese Yen'),

    // ---- Forex: Minor Pairs ----
    frxAUDCAD: () => localize('Australian Dollar vs Canadian Dollar'),
    frxAUDCHF: () => localize('Australian Dollar vs Swiss Franc'),
    frxAUDNZD: () => localize('Australian Dollar vs New Zealand Dollar'),
    frxEURNZD: () => localize('Euro vs New Zealand Dollar'),
    frxGBPCAD: () => localize('Great British Pound vs Canadian Dollar'),
    frxGBPCHF: () => localize('Great British Pound vs Swiss Franc'),
    frxGBPNZD: () => localize('Great British Pound vs New Zealand Dollar'),
    frxNZDJPY: () => localize('New Zealand Dollar vs Japanese Yen'),
    frxNZDUSD: () => localize('New Zealand Dollar vs US Dollar'),
    frxUSDMXN: () => localize('US Dollar vs Mexican Peso'),
    frxUSDPLN: () => localize('US Dollar vs Polish Zloty'),

    // ---- Commodities: Metals ----
    frxXAUUSD: () => localize('Gold vs US Dollar'),
    frxXAGUSD: () => localize('Silver vs US Dollar'),
    frxXPDUSD: () => localize('Palladium vs US Dollar'),
    frxXPTUSD: () => localize('Platinum vs US Dollar'),

    // ---- Cryptocurrencies ----
    cryBTCUSD: () => localize('Bitcoin vs US Dollar'),
    cryETHUSD: () => localize('Ethereum vs US Dollar'),

    // ---- Derived: Continuous Indices (2s tick) ----
    R_10: () => localize('Constant Volatility of 10% with a tick every 2 seconds'),
    R_25: () => localize('Constant Volatility of 25% with a tick every 2 seconds'),
    R_50: () => localize('Constant Volatility of 50% with a tick every 2 seconds'),
    R_75: () => localize('Constant Volatility of 75% with a tick every 2 seconds'),
    R_100: () => localize('Constant Volatility of 100% with a tick every 2 seconds'),

    // ---- Derived: Continuous Indices (1s tick) ----
    '1HZ10V': () => localize('Constant Volatility of 10% with a tick every 1 second'),
    '1HZ15V': () => localize('Constant Volatility of 15% with a tick every 1 second'),
    '1HZ25V': () => localize('Constant Volatility of 25% with a tick every 1 second'),
    '1HZ30V': () => localize('Constant Volatility of 30% with a tick every 1 second'),
    '1HZ50V': () => localize('Constant Volatility of 50% with a tick every 1 second'),
    '1HZ75V': () => localize('Constant Volatility of 75% with a tick every 1 second'),
    '1HZ90V': () => localize('Constant Volatility of 90% with a tick every 1 second'),
    '1HZ100V': () => localize('Constant Volatility of 100% with a tick every 1 second'),

    // ---- Derived: Step Indices ----
    stpRNG: () => localize('Equal probability of up/down with fixed step size of 0.1'),
    stpRNG2: () => localize('Equal probability of up/down with fixed step size of 0.2'),
    stpRNG3: () => localize('Equal probability of up/down with fixed step size of 0.3'),
    stpRNG4: () => localize('Equal probability of up/down with fixed step size of 0.4'),
    stpRNG5: () => localize('Equal probability of up/down with fixed step size of 0.5'),

    // ---- Derived: Crash/Boom Indices ----
    BOOM50: () => localize('On average 1 spike occurs in the price series every 50 ticks'),
    BOOM300N: () => localize('On average 1 spike occurs in the price series every 300 ticks'),
    BOOM500: () => localize('On average 1 spike occurs in the price series every 500 ticks'),
    BOOM600: () => localize('On average 1 spike occurs in the price series every 600 ticks'),
    BOOM900: () => localize('On average 1 spike occurs in the price series every 900 ticks'),
    BOOM1000: () => localize('On average 1 spike occurs in the price series every 1000 ticks'),
    CRASH50: () => localize('On average 1 drop occurs in the price series every 50 ticks'),
    CRASH300N: () => localize('On average 1 drop occurs in the price series every 300 ticks'),
    CRASH500: () => localize('On average 1 drop occurs in the price series every 500 ticks'),
    CRASH600: () => localize('On average 1 drop occurs in the price series every 600 ticks'),
    CRASH900: () => localize('On average 1 drop occurs in the price series every 900 ticks'),
    CRASH1000: () => localize('On average 1 drop occurs in the price series every 1000 ticks'),

    // ---- Derived: Range Break Indices ----
    RB100: () => localize('Index that breaks the range once every 100 attempts on average'),
    RB200: () => localize('Index that breaks the range once every 200 attempts on average'),

    // ---- Derived: Jump Indices ----
    JD10: () => localize('An index with 10% volatility and 3 jumps per hour on average'),
    JD25: () => localize('An index with 25% volatility and 3 jumps per hour on average'),
    JD50: () => localize('An index with 50% volatility and 3 jumps per hour on average'),
    JD75: () => localize('An index with 75% volatility and 3 jumps per hour on average'),
    JD100: () => localize('An index with 100% volatility and 3 jumps per hour on average'),

    // ---- Derived: Bull/Bear Market Index ----
    RDBULL: () => localize('Positive drift and constant volatility with a tick every 2 seconds'),
    RDBEAR: () => localize('Negative drift and constant volatility with a tick every 2 seconds'),

    // ---- Derived: Forex & Commodities Baskets ----
    WLDAUD: () => localize('AUD vs equally weighted basket of USD, EUR, GBP, JPY, CAD'),
    WLDEUR: () => localize('EUR vs equally weighted basket of USD, AUD, GBP, JPY, CAD'),
    WLDGBP: () => localize('GBP vs equally weighted basket of USD, EUR, AUD, JPY, CAD'),
    WLDUSD: () => localize('USD vs equally weighted basket of AUD, EUR, GBP, JPY, CAD'),
    WLDXAU: () => localize('XAU vs equally weighted basket of USD, EUR, GBP, JPY, AUD'),
};

/** Returns the description for a symbol, or an empty string when none is defined. */
export const getMarketDescription = (underlying_symbol: string): string =>
    MARKET_DESCRIPTIONS[underlying_symbol]?.() ?? '';
