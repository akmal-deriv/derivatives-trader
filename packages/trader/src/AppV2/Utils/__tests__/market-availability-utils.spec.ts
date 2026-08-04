import { dayjs } from '@deriv/shared';

import { getMarketAvailability, TSymbolTimes } from '../market-availability-utils';

// Reference weekdays: 2026-01-01 = Thursday, 02 = Friday, 03 = Saturday, 04 = Sunday, 05 = Monday.
const at = (iso: string) => dayjs.utc(iso);

const FOREX: TSymbolTimes = {
    times: { open: ['00:00:00'], close: ['23:59:59'] },
    trading_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    events: [
        { dates: 'Fridays', descrip: 'Closes early (at 20:55)' },
        { dates: '2026-12-25', descrip: 'Christmas Day' },
        { dates: '2027-01-01', descrip: "New Year's Day" },
    ],
};

const INDEX_0600: TSymbolTimes = {
    times: { open: ['06:00:00'], close: ['20:00:00'] },
    trading_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    events: [],
};

const SYNTHETIC: TSymbolTimes = {
    times: { open: ['00:00:00'], close: ['23:59:59'] },
    trading_days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    events: [],
};

const MULTI_SESSION: TSymbolTimes = {
    times: { open: ['00:00:00', '07:30:00'], close: ['06:30:00', '20:00:00'] },
    trading_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    events: [],
};

// Metals: recurring Friday early close + dated (US-holiday) early close + full holidays.
const METALS: TSymbolTimes = {
    times: { open: ['00:00:00', '22:00:00'], close: ['21:00:00', '23:59:59'] },
    trading_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    events: [
        { dates: 'Fridays', descrip: 'Closes early (at 20:55)' },
        { dates: '2026-11-26, 2027-01-18', descrip: 'Closes early (at 16:30)' },
        { dates: '2026-12-25', descrip: 'Christmas Day' },
    ],
};

describe('getMarketAvailability', () => {
    it('counts minutes to close for a bounded single-session open market', () => {
        // Thursday 17:46 → 20:00 close is 2h 14m (134 min).
        const result = getMarketAvailability(INDEX_0600, true, at('2026-01-01T17:46:00Z'));
        expect(result.closes_in_minutes).toBe(134);
        expect(result.is_all_day).toBe(false);
        expect(result.next_open).toBeNull();
    });

    it('marks an all-day (00:00–23:59:59) open market as 24 hours, not a countdown', () => {
        const result = getMarketAvailability(FOREX, true, at('2026-01-01T21:45:59Z'));
        expect(result.is_all_day).toBe(true);
        expect(result.closes_in_minutes).toBeNull();
    });

    it('resolves the next open across the weekend for a closed market', () => {
        // Saturday → skip Sat/Sun → opens Monday 00:00.
        const result = getMarketAvailability(FOREX, false, at('2026-01-03T10:00:00Z'));
        expect(result.next_open).toEqual({ when: 'Monday', time: '00:00' });
        expect(result.closes_in_minutes).toBeNull();
    });

    it('says "today" when a closed market reopens later the same day', () => {
        // Thursday 03:00, before the 06:00 open.
        const result = getMarketAvailability(INDEX_0600, false, at('2026-01-01T03:00:00Z'));
        expect(result.next_open).toEqual({ when: 'today', time: '06:00' });
    });

    it('says "tomorrow" when a closed market has passed today\'s open', () => {
        // Thursday 21:00, after the 20:00 close → Friday 06:00.
        const result = getMarketAvailability(INDEX_0600, false, at('2026-01-01T21:00:00Z'));
        expect(result.next_open).toEqual({ when: 'tomorrow', time: '06:00' });
    });

    it('skips a holiday when resolving the next open', () => {
        // Monday 2026-01-05 is a holiday → next open is Tuesday.
        const with_holiday: TSymbolTimes = { ...FOREX, events: [{ dates: '2026-01-05', descrip: 'Holiday' }] };
        const result = getMarketAvailability(with_holiday, false, at('2026-01-03T10:00:00Z'));
        expect(result.next_open).toEqual({ when: 'Tuesday', time: '00:00' });
    });

    it('describes an all-day weekday market generically (early close + public holidays)', () => {
        const result = getMarketAvailability(FOREX, true, at('2026-01-01T10:00:00Z'));
        expect(result.description).toBe(
            'Open Monday to Friday, 24 hours a day. The market closes early on some days and is closed on public holidays.'
        );
    });

    it('describes a multi-session market with hours, break and generic notes', () => {
        const result = getMarketAvailability(METALS, true, at('2026-01-01T10:00:00Z'));
        expect(result.description).toBe(
            'Open Monday to Friday from 00:00–21:00 GMT and 22:00–23:59 GMT, with a daily break from 21:00–22:00 GMT. ' +
                'The market closes early on some days and is closed on public holidays.'
        );
    });

    it('describes a 24/7 synthetic', () => {
        const result = getMarketAvailability(SYNTHETIC, true, at('2026-01-03T10:00:00Z'));
        expect(result.description).toBe('Open 24 hours a day, 7 days a week.');
    });

    it('returns the active session close + reopen for a multi-session open market', () => {
        const result = getMarketAvailability(MULTI_SESSION, true, at('2026-01-01T03:00:00Z'));
        expect(result.description).toBe(
            'Open Monday to Friday from 00:00–06:30 GMT and 07:30–20:00 GMT, with a daily break from 06:30–07:30 GMT.'
        );
        // 03:00 sits in the first session (00:00–06:30) → closes 06:30, reopens 07:30. No countdown.
        expect(result.session).toEqual({ close: '06:30', reopen: '07:30' });
        expect(result.closes_in_minutes).toBeNull();
    });
});
