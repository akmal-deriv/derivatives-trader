import dayjs, { type ConfigType, type Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(customParseFormat);

/**
 * Convert epoch (seconds) to a UTC Dayjs object.
 */
const epochToMoment = (epoch: number): Dayjs => dayjs.unix(epoch).utc();

/**
 * Convert a primitive (epoch, ISO, or "DD MMM YYYY" string) to a UTC Dayjs object.
 * Public API kept as `toMoment` because it's already used across the codebase.
 */
export const toMoment = (value?: ConfigType): Dayjs => {
    if (!value) return dayjs().utc();
    if (dayjs.isDayjs(value)) {
        if (value.isValid() && value.isUTC()) return value;
    }
    if (typeof value === 'number') return epochToMoment(value);

    // Strings matching "28 May 2026" pattern need the format hint to parse as UTC.
    if (typeof value === 'string' && /^\d{1,2}\s[A-Za-z]{3,}\s\d{4}$/.test(value)) {
        return dayjs.utc(value, 'DD MMM YYYY');
    }

    const parsed = dayjs.utc(value);
    if (parsed.isValid()) return parsed;

    return dayjs.utc(value as string, 'DD MMM YYYY');
};
