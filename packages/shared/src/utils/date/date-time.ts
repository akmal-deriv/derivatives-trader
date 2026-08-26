import { localize } from '@deriv-com/translations';

import dayjs, { type ConfigType, type Dayjs, type Duration, type ManipulateType, setLocale } from './dayJs-config';

/**
 * @deprecated Prefer `setLocale` from `@deriv/shared` directly. Kept as an alias for legacy callers.
 */
export const initMoment = setLocale;

/**
 * Convert epoch (seconds) to a UTC Dayjs object.
 */
export const epochToMoment = (epoch: number): Dayjs => dayjs.unix(epoch).utc();

/**
 * Convert any date input (epoch, ISO string, "DD MMM YYYY" string, or existing Dayjs) to a UTC Dayjs object.
 */
export const toMoment = (value?: ConfigType): Dayjs => {
    if (!value) return dayjs().utc();
    if (dayjs.isDayjs(value)) {
        if (value.isValid() && value.isUTC()) return value;
    }
    if (typeof value === 'number') return epochToMoment(value);

    // Strings matching "28 May 2026" pattern must be parsed with the format hint
    // so the day is interpreted as UTC, not via native Date() (which treats them as local).
    if (typeof value === 'string' && /^\d{1,2}\s[A-Za-z]{3,}\s\d{4}$/.test(value)) {
        return dayjs.utc(value, 'DD MMM YYYY');
    }

    // Try standard utc parse first
    const parsed = dayjs.utc(value);
    if (parsed.isValid()) return parsed;

    // Last-resort: format hint
    return dayjs.utc(value as string, 'DD MMM YYYY');
};

export const toLocalFormat = (time: ConfigType) => toMoment(time).local().format('YYYY-MM-DD HH:mm:ss Z');

/**
 * Set a 24-hour time string ("HH:mm" or "HH:mm:ss") on a Dayjs object. Returns a new Dayjs.
 */
export const setTime = (moment_obj: Dayjs, time: string | null): Dayjs => {
    const [hour, minute, second] = time ? time.split(':') : [0, 0, 0];
    return moment_obj
        .hour(+hour)
        .minute(+minute || 0)
        .second(+second || 0);
};

/**
 * Return the unix value (seconds) of provided epoch + time.
 */
export const convertToUnix = (epoch: number | string, time: string) => setTime(toMoment(epoch), time).unix();

export const toGMTFormat = (time?: ConfigType) =>
    dayjs(time || undefined)
        .utc()
        .format('YYYY-MM-DD HH:mm:ss [GMT]');

export const formatDate = (date?: ConfigType, date_format = 'YYYY-MM-DD', should_format_null = true) =>
    !should_format_null && date === null ? undefined : toMoment(date).format(date_format);

export const formatTime = (epoch: number | string, time_format = 'HH:mm:ss [GMT]') =>
    toMoment(epoch).format(time_format);

/**
 * Number of days from today to date specified.
 */
export const daysFromTodayTo = (date?: ConfigType) => {
    const diff = toMoment(date).startOf('day').diff(toMoment().startOf('day'), 'day');
    return !date || diff < 0 ? '' : diff;
};

/**
 * Number of months between two specified dates.
 */
export const diffInMonths = (now: ConfigType, then: Dayjs) => then.diff(toMoment(now), 'month');

/**
 * Duration between two epochs (seconds).
 */
export const getDiffDuration = (start_time: number, end_time: number): Duration =>
    dayjs.duration(dayjs.unix(end_time).diff(dayjs.unix(start_time)));

/** Returns the formatted date `days` from today using `unit` and `format`. */
export const getDateFromNow = (days: string | number, unit?: ManipulateType, format?: string) =>
    dayjs()
        .add(Number(days), unit ?? 'day')
        .format(format);

/**
 * Format a duration like `2 days 01:23:59`.
 */
export const formatDuration = (duration: Duration, format?: string) => {
    const d = Math.floor(duration.asDays());
    const h = duration.hours();
    const m = duration.minutes();
    const s = duration.seconds();
    const formatted_str = dayjs(0)
        .hour(h)
        .minute(m)
        .second(s)
        .format(format || 'HH:mm:ss');

    return {
        days: d,
        timestamp: formatted_str,
    };
};

/**
 * Validate a "HH:MM" or "HH:MM:SS" time string.
 */
export const isTimeValid = (time_str: string) =>
    /^([0-9]|[0-1][0-9]|2[0-3]):([0-9]|[0-5][0-9])(:([0-9]|[0-5][0-9]))?$/.test(time_str);

/**
 * Validate that the time string's hour is in 0..23.
 */
export const isHourValid = (time_str: string) =>
    isTimeValid(time_str) && /^([01][0-9]|2[0-3])$/.test(time_str.split(':')[0]);

/**
 * Validate that the time string's minute is in 0..59.
 */
export const isMinuteValid = (time_str: string) => isTimeValid(time_str) && /^[0-5][0-9]$/.test(time_str.split(':')[1]);

export const addDays = (date: ConfigType, num_of_days: number): Dayjs => toMoment(date).add(num_of_days, 'day');

export const addMonths = (date: ConfigType, num_of_months: number): Dayjs => toMoment(date).add(num_of_months, 'month');

export const addYears = (date: ConfigType, num_of_years: number): Dayjs => toMoment(date).add(num_of_years, 'year');

export const subDays = (date: ConfigType, num_of_days: number): Dayjs => toMoment(date).subtract(num_of_days, 'day');

export const subMonths = (date: ConfigType, num_of_months: number): Dayjs =>
    toMoment(date).subtract(num_of_months, 'month');

export const subYears = (date: ConfigType, num_of_years: number): Dayjs =>
    toMoment(date).subtract(num_of_years, 'year');

/**
 * Returns the earlier of two dates.
 */
export const minDate = (date_1: ConfigType, date_2: ConfigType): Dayjs => {
    const d1 = toMoment(date_1);
    const d2 = toMoment(date_2);
    return d1.isBefore(d2) ? d1 : d2;
};

export const getStartOfMonth = (date: ConfigType) => toMoment(date).startOf('month').format('YYYY-MM-DD');

/**
 * Format milliseconds with a given format string. Defaults to UTC.
 *
 * Important: numeric input is interpreted as **milliseconds** (matching the original moment
 * semantics and the function name). Do NOT route through `toMoment()` — its numeric branch
 * goes via `epochToMoment` which calls `dayjs.unix()` and would treat the value as seconds.
 */
export const formatMilliseconds = (miliseconds: ConfigType, str_format: string, is_local_time = false) => {
    if (is_local_time) return dayjs(miliseconds).format(str_format);
    return dayjs.utc(miliseconds).format(str_format);
};

/**
 * Reformat a date from one format string to another.
 */
export const convertDateFormat = (date: ConfigType, from_date_format: string, to_date_format: string) =>
    dayjs(date, from_date_format).format(to_date_format);

/**
 * Convert "HH:mm" 24-hour time to "h:mm am/pm" 12-hour time.
 */
export const convertTimeFormat = (time: string) => {
    const t = dayjs(time, 'HH:mm');
    const time_hour = t.format('HH');
    const time_min = t.format('mm');
    const formatted_time = `${Number(time_hour) % 12 || 12}:${time_min}`;
    const time_suffix = `${Number(time_hour) >= 12 ? 'pm' : 'am'}`;
    return `${formatted_time} ${time_suffix}`;
};

/**
 * Get a localized "time since" string.
 */
export const getTimeSince = (timestamp: number) => {
    if (!timestamp) return '';
    const seconds_passed = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds_passed < 60) {
        return localize('{{seconds_passed}}s ago', { seconds_passed });
    }
    if (seconds_passed < 3600) {
        return localize('{{minutes_passed}}m ago', { minutes_passed: Math.floor(seconds_passed / 60) });
    }
    if (seconds_passed < 86400) {
        return localize('{{hours_passed}}h ago', { hours_passed: Math.floor(seconds_passed / 3600) });
    }
    return localize('{{days_passed}}d ago', { days_passed: Math.floor(seconds_passed / (3600 * 24)) });
};

/**
 * Get tomorrow's date in YYYY-MM-DD format.
 */
export const getTomorrowDate = (server_time: ConfigType): string =>
    toMoment(server_time).add(1, 'day').format('YYYY-MM-DD');
