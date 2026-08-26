import React from 'react';

import { mockStore } from '@deriv/stores';
import { TCoreStores } from '@deriv/stores/types';
import { render, screen } from '@testing-library/react';

import { ContractType } from 'Stores/Modules/Trading/Helpers/contract-type';

import TraderProviders from '../../../../../trader-providers';
import DaysDatepicker from '../datepicker';

jest.spyOn(ContractType, 'getTradingEvents').mockResolvedValue([]);
jest.spyOn(ContractType, 'getTradingDays').mockResolvedValue(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

const START_DATE = new Date('2026-08-17T00:00:00Z');

const renderDatepicker = (end_date: Date) => {
    const store = mockStore({ modules: { trade: { symbol: 'frxXAUUSD' } } }) as TCoreStores;

    return render(
        <TraderProviders store={store}>
            <DaysDatepicker start_date={START_DATE} end_date={end_date} setEndDate={jest.fn()} />
        </TraderProviders>
    );
};

describe('DaysDatepicker', () => {
    // The calendar opens on the month of the date it is given, so the navigation label reports
    // which date it settled on without reaching into the DOM for the selected tile.
    it('opens on the month of the given end date', () => {
        renderDatepicker(new Date('2026-09-20T00:00:00Z'));

        expect(screen.getByRole('button', { name: /Sep 2026/ })).toBeInTheDocument();
    });

    it('falls back to the earliest selectable date instead of throwing on an unparseable end date', () => {
        // The end-time date is only ever filled from a proposal response, so it is empty whenever
        // the proposal errored — `new Date('')` reaches this component as an Invalid Date. The
        // underlying react-calendar throws on that ("Invalid date: Invalid Date") from inside
        // render, which took the whole app down rather than degrading.
        expect(() => renderDatepicker(new Date(''))).not.toThrow();

        expect(screen.getByRole('button', { name: /Aug 2026/ })).toBeInTheDocument();
    });
});
