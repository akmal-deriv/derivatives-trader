import { type Dayjs, dayjs } from '@deriv/shared';
import { useStore } from '@deriv/stores';

import { TTradeStore } from 'Types';

type TTime = {
    server_time: NonNullable<ReturnType<typeof useStore>['common']['server_time']>;
    selected_time: Dayjs;
    market_open_times: TTradeStore['market_open_times'];
    market_close_times: TTradeStore['market_close_times'];
};

const getClosestTime = (time: Dayjs | string, interval: number): Dayjs => {
    const moment_time = dayjs(time);
    return moment_time.minute(Math.ceil(moment_time.minute() / interval) * interval);
};

export const getSelectedTime = (
    server_time: TTime['server_time'],
    selected_time: TTime['selected_time'],
    market_open_times: Dayjs[],
    market_close_times: Dayjs[]
) => {
    for (let i = 0; i < market_open_times.length; i++) {
        if (selected_time.isAfter(market_open_times[i]) && selected_time.isBefore(market_close_times[i])) {
            return getClosestTime(selected_time, 5).format('HH:mm');
        }
    }

    for (let i = 0; i < market_open_times.length; i++) {
        const moment_market_open_time = dayjs(market_open_times[i]);
        if (moment_market_open_time.isAfter(server_time)) {
            return getClosestTime(moment_market_open_time, 5).format('HH:mm');
        }
    }

    return getClosestTime(server_time, 5).format('HH:mm');
};

export const getBoundaries = (
    server_time: TTime['server_time'],
    market_open_times: Dayjs[],
    market_close_times: Dayjs[]
) => {
    const boundaries = {
        start: market_open_times.map(open_time => (server_time.isBefore(open_time) ? dayjs(open_time) : server_time)),
        end: market_close_times,
    };

    if (boundaries.start.length > 0) {
        boundaries.start[0] = getClosestTime(boundaries.start[0], 5);
    }

    return boundaries;
};
