import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

import { toMoment } from '../moment';

dayjs.extend(isSameOrBefore);

describe('toMoment', () => {
    it('should return the current UTC moment if no value is provided', () => {
        const instance = toMoment();
        expect(dayjs.isDayjs(instance)).toBe(true);
        expect(instance.isSameOrBefore(dayjs())).toBe(true);
    });

    it('should return the same instance if a UTC dayjs is already provided', () => {
        const existing = dayjs.utc();
        const instance = toMoment(existing);
        expect(instance).toBe(existing);
    });

    it('should convert a numerical epoch (seconds) to ms', () => {
        const epochValue = 1609459200;
        const instance = toMoment(epochValue);
        expect(dayjs.isDayjs(instance)).toBe(true);
        expect(instance.valueOf()).toBe(epochValue * 1000);
    });

    it('should round-trip a "DD MMM YYYY" string', () => {
        const dateString = '15 Jan 2022';
        const instance = toMoment(dateString);
        expect(dayjs.isDayjs(instance)).toBe(true);
        expect(instance.format('DD MMM YYYY')).toBe(dateString);
    });

    it('should handle non-existent dates without throwing', () => {
        // 31 Feb is invalid in the strict sense; dayjs normalizes it (rolls forward).
        const invalidDateString = '31 Feb 2022';
        const instance = toMoment(invalidDateString);
        expect(dayjs.isDayjs(instance)).toBe(true);
    });
});
