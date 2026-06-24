import { trackAnalyticsEvent } from './analytics-utils';

/**
 * Analytics for the DTrader Automated Strategies feature.
 *
 * Implements the events from the "DTrader Automated Strategies" analytics brief.
 * Per the codebase convention every automation event is fired under the single
 * `ce_automation_form_v2` event name and discriminated by an `action` matching
 * the brief's event name (e.g. `automation_section_viewed`). `account_type` and
 * `device_type` are injected automatically by `trackAnalyticsEvent`; `platform`
 * (web/mobile) is passed explicitly because it is part of the brief's spec and
 * is not the same as `device_type`.
 */
export const AUTOMATION_ANALYTICS_EVENT = 'ce_automation_form_v2';

export type TAutomationPlatform = 'web' | 'mobile';

/** Maps the `useDevice().isMobile` flag to the brief's `platform` value. */
export const getAutomationPlatform = (is_mobile: boolean): TAutomationPlatform => (is_mobile ? 'mobile' : 'web');

/** Fires on automation panel/screen init (web: right panel loads, mobile: Automate tab opens). */
export const trackAutomationSectionViewed = (payload: { trade_type: string; platform: TAutomationPlatform }) =>
    trackAnalyticsEvent(AUTOMATION_ANALYTICS_EVENT, { action: 'automation_section_viewed', ...payload });

/** Mobile only — user taps the Automate icon in the bottom navigation bar. */
export const trackAutomateTabTapped = (payload: { previous_tab: string }) =>
    trackAnalyticsEvent(AUTOMATION_ANALYTICS_EVENT, { action: 'automate_tab_tapped', ...payload });

/** User switches trade type while the automation panel is visible. */
export const trackTradeTypeSwitched = (payload: {
    from_trade_type: string;
    to_trade_type: string;
    platform: TAutomationPlatform;
}) => trackAnalyticsEvent(AUTOMATION_ANALYTICS_EVENT, { action: 'trade_type_switched', ...payload });

/** User clicks/taps the guide link at the top of the automation panel. */
export const trackAutomationGuideClicked = (payload: {
    trade_type: string;
    strategy_selected?: string;
    platform: TAutomationPlatform;
}) => trackAnalyticsEvent(AUTOMATION_ANALYTICS_EVENT, { action: 'automation_guide_clicked', ...payload });

/** User selects a strategy (e.g. Martingale / D'Alembert) from the dropdown. */
export const trackStrategySelected = (payload: {
    strategy_name: string;
    trade_type: string;
    platform: TAutomationPlatform;
}) => trackAnalyticsEvent(AUTOMATION_ANALYTICS_EVENT, { action: 'strategy_selected', ...payload });

/** User changes a parameter field in the strategy or risk-management section. */
export const trackStrategyParameterChanged = (payload: {
    parameter_name: string;
    new_value: string | number | null;
    trade_type: string;
    strategy_name: string;
    platform: TAutomationPlatform;
}) => trackAnalyticsEvent(AUTOMATION_ANALYTICS_EVENT, { action: 'strategy_parameter_changed', ...payload });

/** User presses Run to start a strategy session. */
export const trackStrategyRunClicked = (payload: {
    trade_type: string;
    strategy_name: string;
    initial_stake?: number | string;
    stake_multiplier?: number | string;
    stake_increment?: number | string;
    profit_threshold?: number | string;
    loss_threshold?: number | string;
    max_stake_set: boolean;
    purchase_condition?: string;
    duration?: string;
    platform: TAutomationPlatform;
}) => trackAnalyticsEvent(AUTOMATION_ANALYTICS_EVENT, { action: 'strategy_run_clicked', ...payload });

/** User manually presses Stop while a strategy session is running. */
export const trackStrategyStopClicked = (payload: {
    session_id: string | null;
    trade_type: string;
    strategy_name: string;
    trades_completed: number;
    cumulative_pnl: number;
    platform: TAutomationPlatform;
}) => trackAnalyticsEvent(AUTOMATION_ANALYTICS_EVENT, { action: 'strategy_stop_clicked', ...payload });
