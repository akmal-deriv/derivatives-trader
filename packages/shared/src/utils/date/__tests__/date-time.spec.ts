import * as DateTime from '../date-time';
import dayjs from '../dayJs-config';

describe('toMoment', () => {
    it('return utc epoch value date based on client epoch value passed', () => {
        const epoch = 1544756041;

        expect(DateTime.toMoment(epoch).unix()).toEqual(epoch);
    });
    it('return correct date when plain string date passed', () => {
        const format = 'DD MMM YYYY';
        const date = dayjs().format(format);

        expect(DateTime.toMoment(date).format(format)).toBe(date);
    });
});

describe('convertToUnix', () => {
    it('return correct unix value when date and time passed', () => {
        const date_epoch = 1544745600;
        const time = '12:30';
        const [hour, minute] = time.split(':');
        const expected = dayjs.unix(date_epoch).utc().hour(+hour).minute(+minute).second(0).unix();

        expect(DateTime.convertToUnix(date_epoch, time)).toEqual(expected);
    });
});

describe('toGMTFormat', () => {
    it('return correct GMT value when no argument passed', () => {
        expect(DateTime.toGMTFormat()).toEqual(dayjs().utc().format('YYYY-MM-DD HH:mm:ss [GMT]'));
    });

    it('return correct GMT value when argument passed', () => {
        const time_epoch = 1544757884620;
        expect(DateTime.toGMTFormat(time_epoch)).toEqual(dayjs(time_epoch).utc().format('YYYY-MM-DD HH:mm:ss [GMT]'));
    });
});

describe('formatDate', () => {
    const date_format = 'YYYY-MM-DD';
    it('return correct response when no argument passed', () => {
        expect(DateTime.formatDate()).toEqual(dayjs().utc().format(date_format));
    });

    it('return correct date value when argument passed', () => {
        const date = dayjs().utc();
        expect(DateTime.formatDate(date as any, date_format)).toEqual(date.format(date_format));
    });

    it('returns undefined when date is null and should_format_null is false', () => {
        expect(DateTime.formatDate(null, date_format, false)).toBeUndefined();
    });

    it('returns formatted date when date is null and should_format_null is true', () => {
        expect(DateTime.formatDate(null, date_format, true)).toEqual(dayjs().utc().format(date_format));
    });

    it('returns formatted date when date is not null and should_format_null is true', () => {
        const date = dayjs('2023-09-20').utc();
        expect(DateTime.formatDate(date as any, date_format, true)).toEqual(date.format(date_format));
    });

    it('returns formatted date when date is not null and should_format_null is false', () => {
        const date = dayjs('2023-09-20').utc();
        expect(DateTime.formatDate(date as any, date_format, false)).toEqual(date.format(date_format));
    });
});

/* eslint-disable no-unused-expressions */
describe('daysFromTodayTo', () => {
    it('return empty string when there is no argument passed', () => {
        expect(DateTime.daysFromTodayTo()).toHaveLength(0);
    });

    it('return empty string if the user selected previous day', () => {
        const date = dayjs().utc().startOf('day').subtract(1, 'day').format('YYYY-MM-DD');
        expect(DateTime.daysFromTodayTo(date)).toHaveLength(0);
    });

    it('return difference value between selected date and today', () => {
        const date = dayjs().utc().startOf('day').add(3, 'day').format('YYYY-MM-DD');
        expect(DateTime.daysFromTodayTo(date)).toEqual(3);
    });
});

describe('convertDuration', () => {
    const start_time = dayjs().unix();
    const end_time = dayjs.unix(start_time).add(3, 'minute').unix();

    describe('getDiffDuration', () => {
        it('return correct value when argument passed', () => {
            // 3 minutes = 180000 ms
            expect((DateTime.getDiffDuration(start_time, end_time) as any).asMilliseconds()).toEqual(180000);
        });
    });

    describe('formatDuration', () => {
        it('return correct value when argument passed', () => {
            const dur = dayjs.duration(dayjs.unix(end_time).diff(dayjs.unix(start_time))); // three minutes
            expect(DateTime.formatDuration(dur as any).timestamp).toEqual('00:03:00');
        });
    });
});

describe('getTimeSince', () => {
    it('should return correct time since timestamp for each time unit', () => {
        const now = Date.now();
        const fifteen_sec_ago = Date.now() - 15000;
        const ninety_sec_ago = Date.now() - 90000;
        const four_thousand_sec_ago = Date.now() - 4000000;
        const hundred_thousand_sec_ago = Date.now() - 100000000;
        expect(DateTime.getTimeSince(now)).toEqual('0s ago');
        expect(DateTime.getTimeSince(fifteen_sec_ago)).toEqual('15s ago');
        expect(DateTime.getTimeSince(ninety_sec_ago)).toEqual('1m ago');
        expect(DateTime.getTimeSince(four_thousand_sec_ago)).toEqual('1h ago');
        expect(DateTime.getTimeSince(hundred_thousand_sec_ago)).toEqual('1d ago');
    });
    it('should return an empty string when called with 0', () => {
        expect(DateTime.getTimeSince(0)).toEqual('');
    });
});

describe('getTomorrowDate', () => {
    it("should return tomorrow's date in YYYY-MM-DD format", () => {
        const server_time = '2025-04-08 09:28:52';
        const expected_tomorrow = '2025-04-09';

        expect(DateTime.getTomorrowDate(server_time)).toBe(expected_tomorrow);
    });

    it('should handle different input formats', () => {
        const date_object = new Date('2025-04-08T09:28:52');
        const expected_tomorrow = '2025-04-09';

        expect(DateTime.getTomorrowDate(date_object)).toBe(expected_tomorrow);
    });

    it('should handle month rollover', () => {
        const server_time = '2025-04-30 09:28:52';
        const expected_tomorrow = '2025-05-01';

        expect(DateTime.getTomorrowDate(server_time)).toBe(expected_tomorrow);
    });
});
