import { formatTradingTimeRange } from '../trading-times-utils';

describe('trading-times-utils', () => {
    describe('formatTradingTimeRange', () => {
        it('joins the first open and close times', () => {
            expect(formatTradingTimeRange({ open: ['00:00:00'], close: ['23:59:59'] })).toBe('00:00:00 - 23:59:59');
        });

        it('returns an empty string when times are missing', () => {
            expect(formatTradingTimeRange({})).toBe('');
            expect(formatTradingTimeRange(undefined)).toBe('');
        });
    });
});
