import { trackAnalyticsEvent } from './analytics-utils';

/**
 * Analytics for the DTrader Redesign feature ("Dtrader Flutter Tracking Events" brief).
 *
 * Mirrors the automation convention in `automation-analytics.ts`: every redesign event fires
 * under the single `ce_dtrader_redesign_form_v2` name, discriminated by an `action` matching
 * the brief's event name (e.g. `pl_pill_clicked`). `account_type`/`device_type` are injected
 * by `trackAnalyticsEvent`; `platform` (web/mobile) is passed explicitly where the brief
 * specifies it, as it's part of the spec and distinct from `device_type`.
 *
 * Brief sections 3 (Chart minimise/maximise) and 4 (Indicators) are deferred — their controls
 * aren't in this repo yet (indicators live in the chart package) — so those helpers are not added
 * here. Their full event/property specs are kept in docs/dtrader-redesign-analytics-wiring-plan.md.
 */
export const REDESIGN_ANALYTICS_EVENT = 'ce_dtrader_redesign_form_v2';

export type TRedesignPlatform = 'web' | 'mobile';

/** Live P/L direction, shared by the pill and position events. */
export type TPlState = 'profit' | 'loss';

/** Maps the `useDevice().isMobile` flag to the brief's `platform` value. */
export const getRedesignPlatform = (is_mobile: boolean): TRedesignPlatform => (is_mobile ? 'mobile' : 'web');

/* 1. Multi-Tab Trading */

/** User taps the + button to open a new trade tab. */
export const trackTradeTabOpened = (payload: { tab_count_after_open: number; platform: TRedesignPlatform }) =>
    trackAnalyticsEvent(REDESIGN_ANALYTICS_EVENT, { action: 'trade_tab_opened', ...payload });

/** User taps × to close a trade tab. */
export const trackTradeTabClosed = (payload: { tab_count_after_close: number; platform: TRedesignPlatform }) =>
    trackAnalyticsEvent(REDESIGN_ANALYTICS_EVENT, { action: 'trade_tab_closed', ...payload });

/** User taps a different tab to make it active. */
export const trackTradeTabSwitched = (payload: { tab_count: number; from_market: string; to_market: string }) =>
    trackAnalyticsEvent(REDESIGN_ANALYTICS_EVENT, { action: 'trade_tab_switched', ...payload });

/** Fires when the open-tab count reaches the device limit (4 mobile / 7 web). */
export const trackTradeTabLimitReached = (payload: { limit: number; platform: TRedesignPlatform }) =>
    trackAnalyticsEvent(REDESIGN_ANALYTICS_EVENT, { action: 'trade_tab_limit_reached', ...payload });

/* 2. Market Selection */

/** User taps a market category tab (Featured, Derived, Forex, Stocks & Indices, etc.). */
export const trackMarketCategoryTabClicked = (payload: { tab_name: string; previous_tab: string }) =>
    trackAnalyticsEvent(REDESIGN_ANALYTICS_EVENT, { action: 'market_category_tab_clicked', ...payload });

/** User taps the ⓘ icon on a market card to open the market info page. */
export const trackMarketInfoViewed = (payload: { market_name: string; source: string }) =>
    trackAnalyticsEvent(REDESIGN_ANALYTICS_EVENT, { action: 'market_info_viewed', ...payload });

/** User taps the 'Trade [type]' button on the market info page. */
export const trackMarketInfoTradeClicked = (payload: {
    market_name: string;
    trade_type: string;
    time_spent_on_info_page: number;
}) => trackAnalyticsEvent(REDESIGN_ANALYTICS_EVENT, { action: 'market_info_trade_clicked', ...payload });

/** User taps the star icon on a market. `favourite_action` renames the brief's `action` field to avoid colliding with the event discriminator. */
export const trackMarketFavourited = (payload: {
    market_name: string;
    source: string;
    favourite_action: 'added' | 'removed';
}) => trackAnalyticsEvent(REDESIGN_ANALYTICS_EVENT, { action: 'market_favourited', ...payload });

/* Sections 3 (Chart minimise/maximise) and 4 (Indicators) are deferred — see the module doc above. */

/* 5. Live P/L Pill & Open Positions */

/** User taps the live P/L pill above the chart. */
export const trackPlPillClicked = (payload: {
    market_name: string;
    open_position_count: number;
    pl_value: number;
    pl_state: TPlState;
    trade_type: string;
}) => trackAnalyticsEvent(REDESIGN_ANALYTICS_EVENT, { action: 'pl_pill_clicked', ...payload });

/** User taps 'Close' on a position inside the P/L panel. */
export const trackPositionClosedFromPill = (payload: {
    market_name: string;
    pl_value_at_close: number;
    pl_state: TPlState;
    position_duration: number;
    open_position_count_remaining: number;
}) => trackAnalyticsEvent(REDESIGN_ANALYTICS_EVENT, { action: 'position_closed_from_pill', ...payload });

/** User taps 'Cancel' on a position inside the P/L panel. */
export const trackPositionCancelledFromPill = (payload: {
    market_name: string;
    pl_value_at_cancel: number;
    pl_state: TPlState;
}) => trackAnalyticsEvent(REDESIGN_ANALYTICS_EVENT, { action: 'position_cancelled_from_pill', ...payload });
