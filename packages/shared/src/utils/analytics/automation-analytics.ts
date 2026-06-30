import { trackAnalyticsEvent } from './analytics-utils';

/**
 * Analytics for the DTrader Automated Strategies feature ("DTrader Automated Strategies" brief).
 *
 * Per codebase convention every automation event fires under the single
 * `ce_automation_form_v2` name, discriminated by an `action` matching the brief's
 * event name (e.g. `automation_section_viewed`). `account_type`/`device_type` are
 * injected by `trackAnalyticsEvent`; `platform` (web/mobile) is passed explicitly
 * as it's part of the brief's spec and distinct from `device_type`.
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

/** Shared payload describing a strategy run — used by both the "Run pressed" and "Session started" events. */
export type TStrategyRunPayload = {
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
};

/** User presses Run to start a strategy session (funnel step 4 — "Run pressed"). */
export const trackStrategyRunClicked = (payload: TStrategyRunPayload) =>
    trackAnalyticsEvent(AUTOMATION_ANALYTICS_EVENT, { action: 'strategy_run_clicked', ...payload });

/** Fires once the run has actually started (auto_start succeeded) — funnel step 5. `session_id` joins it back to strategy_run_clicked. */
export const trackStrategySessionStarted = (payload: TStrategyRunPayload & { session_id: string }) =>
    trackAnalyticsEvent(AUTOMATION_ANALYTICS_EVENT, { action: 'strategy_session_started', ...payload });

/**
 * Fires when a session ends, for any reason (user stop, threshold hit, error). Carries the run's
 * start snapshot plus the outcome so completions can be sliced by `stop_reason` (brief §4.3).
 */
export const trackStrategySessionCompleted = (
    payload: TStrategyRunPayload & {
        session_id: string;
        trades_completed: number;
        cumulative_pnl: number;
        status: string;
        stop_reason?: string;
        stop_reason_code?: string;
    }
) => trackAnalyticsEvent(AUTOMATION_ANALYTICS_EVENT, { action: 'strategy_session_completed', ...payload });

/** User manually presses Stop while a strategy session is running. */
export const trackStrategyStopClicked = (payload: {
    session_id: string | null;
    trade_type: string;
    strategy_name: string;
    trades_completed: number;
    cumulative_pnl: number;
    platform: TAutomationPlatform;
}) => trackAnalyticsEvent(AUTOMATION_ANALYTICS_EVENT, { action: 'strategy_stop_clicked', ...payload });
