import type { Dayjs } from 'dayjs';

import { localize } from '@deriv-com/translations';

type TTimes = { open?: string[]; close?: string[] };
type TEvent = { dates?: string; descrip?: string };
export type TSymbolTimes = { times?: TTimes; trading_days?: string[]; events?: TEvent[] };

export type TNextOpen = {
    /** 'today' | 'tomorrow' | a full weekday name ('Monday'). */
    when: string;
    /** "HH:MM" (GMT). */
    time: string;
};

export type TActiveSession = {
    /** "HH:MM" (GMT) the current session closes. */
    close: string;
    /** "HH:MM" (GMT) the next same-day session opens (the break), or null in the last session. */
    reopen: string | null;
};

export type TMarketAvailability = {
    /** True for an open market that trades a single 00:00–23:59:59 session (effectively 24 hours) —
     *  shown as "24 hours" rather than a countdown to a midnight "close". */
    is_all_day: boolean;
    /** Minutes until close for a single-session, non-all-day open market (its countdown); null else. */
    closes_in_minutes: number | null;
    /** Current session close + next-session reopen for a multi-session open market; null otherwise. */
    session: TActiveSession | null;
    /** When the market next opens (closed markets); null when open / not resolvable. */
    next_open: TNextOpen | null;
    /** Human summary of the weekly schedule (trading days, hours, break, early closes, holidays). */
    description: string;
};

const WEEKDAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Localized full weekday name for an abbreviation (each string is extractable for translation).
const weekdayLabel = (abbr: string): string => {
    switch (abbr) {
        case 'Sun':
            return localize('Sunday');
        case 'Mon':
            return localize('Monday');
        case 'Tue':
            return localize('Tuesday');
        case 'Wed':
            return localize('Wednesday');
        case 'Thu':
            return localize('Thursday');
        case 'Fri':
            return localize('Friday');
        case 'Sat':
            return localize('Saturday');
        default:
            return abbr;
    }
};

// A holiday event fully closes the market that day; an "early close" event still opens it.
const isFullClosure = (descrip?: string) => !!descrip && !/closes early/i.test(descrip);
// The `dates` field is a single date, a comma-separated list, or a recurring label ("Fridays").
const eventCoversDate = (dates: string | undefined, ymd: string) =>
    !!dates &&
    dates
        .split(',')
        .map(date => date.trim())
        .includes(ymd);

const isHoliday = (events: TEvent[] | undefined, day: Dayjs) => {
    const ymd = day.format('YYYY-MM-DD');
    return (events ?? []).some(event => isFullClosure(event.descrip) && eventCoversDate(event.dates, ymd));
};

const isTradingDay = (symbol_times: TSymbolTimes, day: Dayjs) =>
    !!symbol_times.trading_days?.includes(WEEKDAY_ABBR[day.day()]) && !isHoliday(symbol_times.events, day);

// Sets the "HH:MM:SS" time on `day` (kept in UTC, since trading times are GMT).
const atTime = (day: Dayjs, time?: string) => {
    const [hour = 0, minute = 0, second = 0] = (time ?? '00:00:00').split(':').map(Number);
    return day.hour(hour).minute(minute).second(second).millisecond(0);
};

const fmtTime = (time?: string) => (time ?? '').slice(0, 5);

// Minutes until the currently-active session closes, or null if `now` isn't inside any session.
const getClosesInMinutes = (times: TTimes | undefined, now: Dayjs): number | null => {
    const opens = times?.open ?? [];
    const closes = times?.close ?? [];
    for (let i = 0; i < closes.length; i++) {
        const open = atTime(now, opens[i]);
        const close = atTime(now, closes[i]);
        if (now.isSameOrAfter(open) && now.isBefore(close)) return Math.max(0, close.diff(now, 'minute'));
    }
    return null;
};

// The active session's close time + the next same-day session's open (the break reopen), for a
// multi-session market. `reopen` is null when `now` is inside the last session of the day.
const getActiveSession = (times: TTimes | undefined, now: Dayjs): TActiveSession | null => {
    const opens = times?.open ?? [];
    const closes = times?.close ?? [];
    for (let i = 0; i < closes.length; i++) {
        if (now.isSameOrAfter(atTime(now, opens[i])) && now.isBefore(atTime(now, closes[i]))) {
            return { close: fmtTime(closes[i]), reopen: opens[i + 1] ? fmtTime(opens[i + 1]) : null };
        }
    }
    return null;
};

// The next moment the market opens, scanning today + up to a week ahead (skipping non-trading days
// and holidays). Today counts only if `now` is before the day's first open.
const getNextOpen = (symbol_times: TSymbolTimes, now: Dayjs): TNextOpen | null => {
    const first_open = symbol_times.times?.open?.[0] ?? '00:00:00';
    for (let offset = 0; offset <= 7; offset++) {
        const day = now.add(offset, 'day');
        const not_yet_open = offset !== 0 || now.isBefore(atTime(day, first_open));
        if (isTradingDay(symbol_times, day) && not_yet_open) {
            // 'today' / 'tomorrow' are sentinels the component maps to their own localized templates;
            // a further-out day is a (localized) weekday name interpolated into the "Opens {{day}}…".
            let when = weekdayLabel(WEEKDAY_ABBR[day.day()]);
            if (offset === 0) when = 'today';
            else if (offset === 1) when = 'tomorrow';
            return { when, time: first_open.slice(0, 5) };
        }
    }
    return null;
};

// A generalised, localized summary of the weekly schedule — trading days + hours, any daily break,
// and generic early-close / public-holiday notes (no specific dates or holiday names). Each phrase is
// a `localize()` template so it's translatable; times/days are interpolated. Examples (English):
//   "Open Monday to Friday from 01:30–04:00 GMT and 05:00–08:00 GMT, with a daily break from
//    04:00–05:00 GMT. The market is closed on public holidays."
//   "Open Monday to Friday, 24 hours a day. The market closes early on some days and is closed on
//    public holidays."
//   "Open 24 hours a day, 7 days a week."
const buildDescription = (symbol_times: TSymbolTimes): string => {
    const days = symbol_times.trading_days ?? [];
    const { open = [], close = [] } = symbol_times.times ?? {};
    const events = symbol_times.events ?? [];
    if (!days.length) return '';

    const is_all_week = days.length === 7;
    const is_all_day = open.length === 1 && open[0] === '00:00:00' && close[0] === '23:59:59';
    if (is_all_week && is_all_day) return localize('Open 24 hours a day, 7 days a week.');

    const day_range = localize('{{first}} to {{last}}', {
        first: weekdayLabel(days[0]),
        last: weekdayLabel(days[days.length - 1]),
    });

    let hours;
    if (is_all_day) {
        hours = localize('Open {{days}}, 24 hours a day.', { days: day_range });
    } else if (open.length > 1 && close[0] && open[1]) {
        hours = localize(
            'Open {{days}} from {{first}} GMT and {{second}} GMT, with a daily break from {{break}} GMT.',
            {
                days: day_range,
                first: `${fmtTime(open[0])}–${fmtTime(close[0])}`,
                second: `${fmtTime(open[1])}–${fmtTime(close[1])}`,
                break: `${fmtTime(close[0])}–${fmtTime(open[1])}`,
            }
        );
    } else {
        hours = localize('Open {{days}} from {{range}} GMT.', {
            days: day_range,
            range: `${fmtTime(open[0])}–${fmtTime(close[0])}`,
        });
    }

    // Generic closure notes — no specific dates or holiday names.
    const has_early = events.some(event => /closes early/i.test(event.descrip ?? ''));
    const has_holiday = events.some(event => isFullClosure(event.descrip));
    let closure = '';
    if (has_early && has_holiday) {
        closure = localize('The market closes early on some days and is closed on public holidays.');
    } else if (has_early) {
        closure = localize('The market closes early on some days.');
    } else if (has_holiday) {
        closure = localize('The market is closed on public holidays.');
    }

    return closure ? `${hours} ${closure}` : hours;
};

/**
 * Derives the info screen's "Market availability" content for a symbol: a countdown to close or the
 * current session's close + reopen (multi-session) when open, the next open time when closed, and a
 * schedule summary. All time maths run in the passed `now` (a GMT/UTC dayjs) so it stays testable;
 * trading times from the API are GMT.
 */
export const getMarketAvailability = (
    symbol_times: TSymbolTimes | undefined,
    is_open: boolean,
    now: Dayjs
): TMarketAvailability => {
    if (!symbol_times) {
        return { is_all_day: false, closes_in_minutes: null, session: null, next_open: null, description: '' };
    }
    const times = symbol_times.times;
    const opens = times?.open ?? [];
    const is_all_day = opens.length === 1 && opens[0] === '00:00:00' && times?.close?.[0] === '23:59:59';
    const is_multi_session = opens.length > 1;
    return {
        is_all_day: is_open && is_all_day,
        // Countdown only for a bounded single session (not all-day, not multi-session).
        closes_in_minutes: is_open && !is_multi_session && !is_all_day ? getClosesInMinutes(times, now) : null,
        session: is_open && is_multi_session ? getActiveSession(times, now) : null,
        next_open: is_open ? null : getNextOpen(symbol_times, now),
        description: buildDescription(symbol_times),
    };
};
