import React from 'react';
import { useHistory } from 'react-router-dom';

import { useLocalStorageData } from '@deriv/api';
import { getIsMigratedUser, routes } from '@deriv/shared';
import { useStore } from '@deriv/stores';
import { Modal } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

import { TRADE_PANEL_TABS } from 'AppV2/Components/AutomationPanel/automation-config';
import StreamIframe from 'AppV2/Components/StreamIframe';
import { getAutomationOnboardingVideoId } from 'AppV2/Utils/video-config';
import { useTraderStore } from 'Stores/useTraderStores';

import { INTRO_ONBOARDING_COMPLETE_EVENT } from '../intro-onboarding-event';

import './automation-onboarding.scss';

const AUTOMATION_ONBOARDING_COMPLETED_KEY = 'automation_onboarding_completed';

/**
 * One-time intro to the automation feature. Shown on the trade page once the
 * user has finished their initial trade-page onboarding (migrated users via
 * `migration_onboarding_completed`, new users via the desktop/mobile
 * `trade_page` guide) so two onboardings don't stack. The "Explore automation"
 * CTA takes the user to the automate tab (desktop) / route (mobile).
 *
 * Flags are read from localStorage at mount (see `useLocalStorageData`), so this
 * surfaces on the user's next trade-page visit after the intro onboarding — not
 * mid-session immediately after it closes.
 */
const AutomationOnboarding = () => {
    const { isMobile } = useDevice();
    const history = useHistory();
    const { setActiveTradePanelTab } = useTraderStore();
    const {
        ui: { is_dark_mode_on },
    } = useStore();

    const [is_open, setIsOpen] = React.useState(false);
    const guide_timeout_ref = React.useRef<ReturnType<typeof setTimeout>>();

    const [guide_completed, setGuideCompleted] = useLocalStorageData<boolean>(
        AUTOMATION_ONBOARDING_COMPLETED_KEY,
        false
    );
    const [migration_completed] = useLocalStorageData<boolean>('migration_onboarding_completed', false);
    const [guide_dtrader_v2] = useLocalStorageData<Record<string, boolean>>('guide_dtrader_v2', {
        trade_types_selection: false,
        trade_page: false,
        positions_page: false,
    });
    const [guide_dtrader_v2_desktop] = useLocalStorageData<Record<string, boolean>>('guide_dtrader_v2_desktop', {
        trade_page: false,
        positions_page: false,
    });

    const is_migrated_user = getIsMigratedUser();
    const is_intro_onboarding_done = is_migrated_user
        ? Boolean(migration_completed)
        : Boolean(guide_dtrader_v2_desktop?.trade_page || guide_dtrader_v2?.trade_page);

    React.useEffect(() => {
        if (!guide_completed && is_intro_onboarding_done) {
            guide_timeout_ref.current = setTimeout(() => setIsOpen(true), 800);
        }
        return () => clearTimeout(guide_timeout_ref.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [guide_completed, is_intro_onboarding_done]);

    React.useEffect(() => {
        // Chain straight after the intro onboarding closes in the same session.
        // `is_intro_onboarding_done` is read from a different `useLocalStorageData`
        // instance and stays stale until remount, so listen for the broadcast
        // instead of waiting for a refresh.
        const onIntroComplete = () => {
            if (!guide_completed) guide_timeout_ref.current = setTimeout(() => setIsOpen(true), 800);
        };
        window.addEventListener(INTRO_ONBOARDING_COMPLETE_EVENT, onIntroComplete);
        return () => window.removeEventListener(INTRO_ONBOARDING_COMPLETE_EVENT, onIntroComplete);
    }, [guide_completed]);

    const onClose = React.useCallback(() => {
        setIsOpen(false);
        setGuideCompleted(true);
    }, [setGuideCompleted]);

    const onExplore = React.useCallback(() => {
        setIsOpen(false);
        setGuideCompleted(true);
        if (isMobile) {
            localStorage.setItem(AUTOMATION_ONBOARDING_COMPLETED_KEY, JSON.stringify(true));
            history.push(routes.trader_automate);
        } else {
            setActiveTradePanelTab(TRADE_PANEL_TABS.AUTOMATION);
        }
    }, [isMobile, history, setActiveTradePanelTab, setGuideCompleted]);

    if (!is_open) return null;

    // Streamed from Cloudflare like every other video in the app (local mp4s
    // aren't bundled — see video-config.ts). Empty id ⇒ no video rendered.
    const video_id = getAutomationOnboardingVideoId(isMobile ? 'mobile' : 'desktop', is_dark_mode_on);

    // Quill Modal for both breakpoints (mobile renders as a bottom sheet via
    // isMobile) — same Modal.Header (video + title) + Modal.Body shape as the
    // onboarding guide, but without the handle bar.
    return (
        <Modal
            isOpened={is_open}
            toggleModal={onClose}
            isMobile={isMobile}
            isNonExpandable={isMobile}
            showHandleBar={false}
            shouldCloseModalOnSwipeDown={isMobile}
            showCrossIcon={!isMobile}
            primaryButtonLabel={<Localize i18n_default_text='Explore automation' />}
            primaryButtonCallback={onExplore}
            buttonColor='coral'
            showSecondaryButton={false}
            className='automation-onboarding__modal'
        >
            <Modal.Header
                image={
                    video_id ? (
                        <StreamIframe src={video_id} title='automation_onboarding' autoplay loop muted />
                    ) : undefined
                }
                title={
                    isMobile ? (
                        <Localize i18n_default_text='Introducing automated trading' />
                    ) : (
                        <Localize i18n_default_text='Put your trades on autopilot' />
                    )
                }
            />
            <Modal.Body>
                <Localize i18n_default_text='Automated trading, made easy. Start instantly with a quick strategy.' />
            </Modal.Body>
        </Modal>
    );
};

export default React.memo(AutomationOnboarding);
