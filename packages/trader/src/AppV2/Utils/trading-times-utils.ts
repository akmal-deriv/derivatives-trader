type TTimes = { open?: string[]; close?: string[] };

/** Formats a symbol's session times into a range like "00:00:00 - 23:59:59". */
export const formatTradingTimeRange = (times?: TTimes): string => {
    const open = times?.open?.[0];
    const close = times?.close?.[0];
    return open && close ? `${open} - ${close}` : '';
};

/**
 * Formats a trading session into a day+time line like "Sun 00:00:00 - Sat 23:59:59 GMT", combining
 * the first/last trading days with the given open/close times. Returns '' if anything's missing.
 */
export const formatTradingSession = (trading_days?: string[], open?: string, close?: string): string => {
    if (!trading_days?.length || !open || !close) return '';
    const first = trading_days[0];
    const last = trading_days[trading_days.length - 1];
    return `${first} ${open} - ${last} ${close} GMT`;
};

/**
 * Open session ("Open") + any mid-week break ("Break") for the info screen. A break exists only when
 * the symbol trades in multiple sessions per day — its window is the gap between the first close and
 * the second open. 24/7 symbols have no break, so `break_session` is ''.
 */
export const getTradingSessions = (trading_days?: string[], times?: TTimes) => {
    const open_session = formatTradingSession(trading_days, times?.open?.[0], times?.close?.[0]);
    const break_session =
        times?.open && times.open.length > 1
            ? formatTradingSession(trading_days, times.close?.[0], times.open?.[1])
            : '';
    return { open_session, break_session };
};
