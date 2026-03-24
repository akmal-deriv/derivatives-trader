import React, { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { toMoment } from '@deriv/shared';
import { useDevice } from '@deriv-com/ui';

import './early-close-dot.scss';

export type TMarketEvent = {
    dates: string[];
    descrip: string;
};

const days_of_the_week: Record<string, number> = {
    Sundays: 0,
    Mondays: 1,
    Tuesdays: 2,
    Wednesdays: 3,
    Thursdays: 4,
    Fridays: 5,
    Saturdays: 6,
};

const isDateMatch = (event_date: string, tile_date: Date): boolean => {
    const day_index = days_of_the_week[event_date];
    if (day_index !== undefined) {
        return tile_date.getDay() === day_index;
    }
    const parsed = toMoment(event_date);
    return parsed.isValid() && parsed.isSame(toMoment(tile_date), 'day');
};

const EarlyCloseDot = ({ message }: { message: string }) => {
    const { isDesktop } = useDevice();
    const display_message = message.includes('GMT') ? message : `${message} GMT`;
    const [is_visible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const dot_ref = useRef<HTMLSpanElement>(null);

    const handleMouseEnter = useCallback(() => {
        if (!dot_ref.current) return;
        const rect = dot_ref.current.getBoundingClientRect();
        setPosition({
            top: rect.top,
            left: rect.left + rect.width / 2,
        });
        setIsVisible(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsVisible(false);
    }, []);

    return (
        <span className='early-close-dot'>
            <span
                ref={dot_ref}
                className='early-close-dot__circle'
                role='img'
                aria-label={display_message}
                onMouseEnter={isDesktop ? handleMouseEnter : undefined}
                onMouseLeave={isDesktop ? handleMouseLeave : undefined}
            />
            {isDesktop &&
                is_visible &&
                createPortal(
                    <div
                        className='early-close-dot__tooltip'
                        style={{
                            top: position.top,
                            left: position.left,
                        }}
                    >
                        <div className='early-close-dot__tooltip-content'>{display_message}</div>
                        <div className='early-close-dot__tooltip-arrow' />
                    </div>,
                    document.body
                )}
        </span>
    );
};

export const getEarlyCloseTileContent = (market_events: TMarketEvent[]) => {
    if (!market_events.length) return undefined;

    const EarlyCloseTileContent = ({ date, view }: { date: Date; view: string }): React.ReactNode => {
        if (view !== 'month') return null;

        for (let i = 0; i < market_events.length; i++) {
            const event = market_events[i];
            if (event.descrip.match(/Closes early|Opens late/)) {
                for (let j = 0; j < event.dates.length; j++) {
                    if (isDateMatch(event.dates[j], date)) {
                        return <EarlyCloseDot message={event.descrip} />;
                    }
                }
            }
        }

        return null;
    };

    return EarlyCloseTileContent;
};

export default EarlyCloseDot;
