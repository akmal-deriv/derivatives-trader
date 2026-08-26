import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import duration from 'dayjs/plugin/duration';
import isBetween from 'dayjs/plugin/isBetween';
import isoWeek from 'dayjs/plugin/isoWeek';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import utc from 'dayjs/plugin/utc';
import weekOfYear from 'dayjs/plugin/weekOfYear';

// Extend dayjs with the plugins required by the codebase's date utilities.
// These mirror the moment.js APIs used across packages.
dayjs.extend(utc);
dayjs.extend(duration);
dayjs.extend(customParseFormat);
dayjs.extend(localizedFormat);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(isBetween);
dayjs.extend(weekOfYear);
dayjs.extend(quarterOfYear);
dayjs.extend(isoWeek);

// Locales whose default formatting uses non-Latin numerals (e.g. '২০২৪-০৫-০৭').
// The codebase requires numeric dates everywhere, so these fall back to en-gb.
const NON_NUMERIC_LOCALES = ['EN', 'AR', 'BN', 'SI', 'KM'];

// Localize dayjs instance — async because dayjs locale files are dynamic imports.
// This is the single source of truth for locale loading; `initMoment` aliases this for
// backwards compatibility with existing call sites.
export const setLocale = async (lang: string): Promise<void> => {
    if (!lang) return;
    let locale = lang.toLowerCase().replace('_', '-');
    if (NON_NUMERIC_LOCALES.includes(lang)) locale = 'en-gb';
    try {
        const localeModule = await import(`dayjs/locale/${locale}.js`);
        dayjs.locale(localeModule.default);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Locale could not be loaded:', { locale, error });
    }
};

// Re-export commonly used dayjs types so callers can import them via `@deriv/shared`
// without taking a direct dependency on the dayjs package.
export type { ConfigType, Dayjs, ManipulateType, OpUnitType, QUnitType, UnitType } from 'dayjs';
export type { Duration } from 'dayjs/plugin/duration';

export { dayjs };
export default dayjs;
