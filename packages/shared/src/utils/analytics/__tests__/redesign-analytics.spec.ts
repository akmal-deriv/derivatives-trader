import { Analytics } from '@deriv-com/analytics';

import {
    getRedesignPlatform,
    REDESIGN_ANALYTICS_EVENT,
    trackMarketCategoryTabClicked,
    trackMarketFavourited,
    trackMarketInfoTradeClicked,
    trackMarketInfoViewed,
    trackPlPillClicked,
    trackPositionCancelledFromPill,
    trackPositionClosedFromPill,
    trackTradeTabClosed,
    trackTradeTabLimitReached,
    trackTradeTabOpened,
    trackTradeTabSwitched,
} from '../redesign-analytics';

const trackEvent = Analytics.trackEvent as jest.Mock;

describe('redesign analytics', () => {
    beforeEach(() => {
        trackEvent.mockClear();
    });

    it('getRedesignPlatform maps isMobile to web/mobile', () => {
        expect(getRedesignPlatform(true)).toBe('mobile');
        expect(getRedesignPlatform(false)).toBe('web');
    });

    it('fires every redesign event under a single event name with an action discriminator', () => {
        trackTradeTabOpened({ tab_count_after_open: 2, platform: 'mobile' });
        trackTradeTabClosed({ tab_count_after_close: 1, platform: 'mobile' });
        trackTradeTabSwitched({ tab_count: 3, from_market: 'volatility_100', to_market: 'eur_usd' });
        trackTradeTabLimitReached({ limit: 4, platform: 'mobile' });
        trackMarketCategoryTabClicked({ tab_name: 'forex', previous_tab: 'featured' });
        trackMarketInfoViewed({ market_name: 'eur_usd', source: 'market_card' });
        trackMarketInfoTradeClicked({ market_name: 'eur_usd', trade_type: 'rise_fall', time_spent_on_info_page: 12 });
        trackMarketFavourited({ market_name: 'eur_usd', source: 'market_card', favourite_action: 'added' });
        trackPlPillClicked({
            market_name: 'eur_usd',
            open_position_count: 2,
            pl_value: 2.73,
            pl_state: 'profit',
            trade_type: 'rise_fall',
        });
        trackPositionClosedFromPill({
            market_name: 'eur_usd',
            pl_value_at_close: 2.73,
            pl_state: 'profit',
            position_duration: 120,
            open_position_count_remaining: 1,
        });
        trackPositionCancelledFromPill({ market_name: 'eur_usd', pl_value_at_cancel: -1.5, pl_state: 'loss' });

        expect(trackEvent).toHaveBeenCalledTimes(11);
        trackEvent.mock.calls.forEach(([event_name]) => expect(event_name).toBe(REDESIGN_ANALYTICS_EVENT));

        const actions = trackEvent.mock.calls.map(([, props]) => props.action);
        expect(actions).toEqual([
            'trade_tab_opened',
            'trade_tab_closed',
            'trade_tab_switched',
            'trade_tab_limit_reached',
            'market_category_tab_clicked',
            'market_info_viewed',
            'market_info_trade_clicked',
            'market_favourited',
            'pl_pill_clicked',
            'position_closed_from_pill',
            'position_cancelled_from_pill',
        ]);
    });

    it('forwards the brief properties for pl_pill_clicked', () => {
        trackPlPillClicked({
            market_name: 'eur_usd',
            open_position_count: 2,
            pl_value: 2.73,
            pl_state: 'profit',
            trade_type: 'rise_fall',
        });

        expect(trackEvent).toHaveBeenCalledWith(
            REDESIGN_ANALYTICS_EVENT,
            expect.objectContaining({
                action: 'pl_pill_clicked',
                market_name: 'eur_usd',
                open_position_count: 2,
                pl_value: 2.73,
                pl_state: 'profit',
                trade_type: 'rise_fall',
            })
        );
    });

    it('renames the brief `action` property to favourite_action on market_favourited', () => {
        trackMarketFavourited({ market_name: 'eur_usd', source: 'market_card', favourite_action: 'removed' });

        expect(trackEvent).toHaveBeenCalledWith(
            REDESIGN_ANALYTICS_EVENT,
            expect.objectContaining({
                action: 'market_favourited',
                favourite_action: 'removed',
                market_name: 'eur_usd',
                source: 'market_card',
            })
        );
    });
});
