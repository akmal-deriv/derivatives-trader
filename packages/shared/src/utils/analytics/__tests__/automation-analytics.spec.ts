import { Analytics } from '@deriv-com/analytics';

import {
    AUTOMATION_ANALYTICS_EVENT,
    getAutomationPlatform,
    trackAutomateTabTapped,
    trackAutomationGuideClicked,
    trackAutomationSectionViewed,
    trackStrategyParameterChanged,
    trackStrategyRunClicked,
    trackStrategySelected,
    trackStrategySessionStarted,
    trackStrategyStopClicked,
    trackTradeTypeSwitched,
} from '../automation-analytics';

const trackEvent = Analytics.trackEvent as jest.Mock;

describe('automation analytics', () => {
    beforeEach(() => {
        trackEvent.mockClear();
    });

    it('getAutomationPlatform maps isMobile to web/mobile', () => {
        expect(getAutomationPlatform(true)).toBe('mobile');
        expect(getAutomationPlatform(false)).toBe('web');
    });

    it('fires every automation event under a single event name with an action discriminator', () => {
        trackAutomationSectionViewed({ trade_type: 'rise_fall', platform: 'web' });
        trackAutomateTabTapped({ previous_tab: 'trade' });
        trackTradeTypeSwitched({ from_trade_type: 'rise_fall', to_trade_type: 'accumulator', platform: 'mobile' });
        trackAutomationGuideClicked({ trade_type: 'rise_fall', strategy_selected: 'martingale', platform: 'web' });
        trackStrategySelected({ strategy_name: 'dalembert', trade_type: 'rise_fall', platform: 'mobile' });
        trackStrategyParameterChanged({
            parameter_name: 'multiplier',
            new_value: 3,
            trade_type: 'rise_fall',
            strategy_name: 'martingale',
            platform: 'web',
        });
        trackStrategyStopClicked({
            session_id: 'run-1',
            trade_type: 'rise_fall',
            strategy_name: 'martingale',
            trades_completed: 4,
            cumulative_pnl: -2.5,
            platform: 'mobile',
        });

        expect(trackEvent).toHaveBeenCalledTimes(7);
        trackEvent.mock.calls.forEach(([event_name]) => expect(event_name).toBe(AUTOMATION_ANALYTICS_EVENT));

        const actions = trackEvent.mock.calls.map(([, props]) => props.action);
        expect(actions).toEqual([
            'automation_section_viewed',
            'automate_tab_tapped',
            'trade_type_switched',
            'automation_guide_clicked',
            'strategy_selected',
            'strategy_parameter_changed',
            'strategy_stop_clicked',
        ]);
    });

    it('forwards the brief properties for strategy_run_clicked', () => {
        trackStrategyRunClicked({
            trade_type: 'rise_fall',
            strategy_name: 'martingale',
            initial_stake: 10,
            stake_multiplier: 2,
            profit_threshold: 50,
            loss_threshold: 50,
            max_stake_set: true,
            purchase_condition: 'CALL',
            duration: '5 t',
            platform: 'web',
        });

        expect(trackEvent).toHaveBeenCalledWith(
            AUTOMATION_ANALYTICS_EVENT,
            expect.objectContaining({
                action: 'strategy_run_clicked',
                trade_type: 'rise_fall',
                strategy_name: 'martingale',
                initial_stake: 10,
                stake_multiplier: 2,
                max_stake_set: true,
                purchase_condition: 'CALL',
                duration: '5 t',
                platform: 'web',
            })
        );
    });

    it('tags strategy_session_started with the confirmed session_id', () => {
        trackStrategySessionStarted({
            session_id: 'run-42',
            trade_type: 'rise_fall',
            strategy_name: 'martingale',
            max_stake_set: false,
            platform: 'mobile',
        });

        expect(trackEvent).toHaveBeenCalledWith(
            AUTOMATION_ANALYTICS_EVENT,
            expect.objectContaining({
                action: 'strategy_session_started',
                session_id: 'run-42',
                trade_type: 'rise_fall',
                strategy_name: 'martingale',
                platform: 'mobile',
            })
        );
    });
});
