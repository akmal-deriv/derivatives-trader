import React from 'react';

import { useLocalStorageData } from '@deriv/api';
import { Modal } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

import GuideContainer from './guide-container';
import OnboardingVideo from './onboarding-video';

type TGuidePage = 'trade_page' | 'positions_page';

type TOnboardingGuideProps = {
    callback?: () => void;
    type?: TGuidePage;
};

/**
 * Unified onboarding for both breakpoints.
 * - `trade_page`: intro modal → a device-aware react-joyride spotlight tour (see steps-config).
 * - `positions_page`: mobile-only video modal (no tour).
 * A single `guide_dtrader_v2` flag per page means the trade-page tour shows once total across devices.
 */
const OnboardingGuide = ({ type = 'trade_page', callback }: TOnboardingGuideProps) => {
    const { isMobile } = useDevice();
    const [is_modal_open, setIsModalOpen] = React.useState(false);
    const [should_run_guide, setShouldRunGuide] = React.useState(false);
    const guide_timeout_ref = React.useRef<ReturnType<typeof setTimeout>>();
    // The quill Modal fires `toggleModal` when the primary button closes it, so guard the dismiss
    // path — otherwise clicking "Show me around" would immediately finish the tour it just started.
    const is_start_clicked_ref = React.useRef(false);

    const [guide_dtrader_v2, setGuideDtraderV2] = useLocalStorageData<Record<string, boolean>>('guide_dtrader_v2', {
        trade_page: false,
        positions_page: false,
    });

    const is_trade_page = type === 'trade_page';
    const markSeen = React.useCallback(
        () => setGuideDtraderV2(prev => ({ ...prev, [type]: true })),
        [setGuideDtraderV2, type]
    );

    const onFinishGuide = React.useCallback(() => {
        setShouldRunGuide(false);
        markSeen();
        callback?.();
    }, [markSeen, callback]);

    // "Show me around" — mark seen up front so a mid-tour refresh doesn't re-show the intro.
    const onGuideStart = () => {
        is_start_clicked_ref.current = true;
        setIsModalOpen(false);
        markSeen();
        setShouldRunGuide(true);
    };

    // "Got it" (positions) / close (×) / overlay — dismiss without running a tour. No-op if the
    // start button already fired (the Modal closes itself, which would otherwise re-trigger this).
    const onGuideDismiss = () => {
        if (is_start_clicked_ref.current) return;
        setIsModalOpen(false);
        onFinishGuide();
    };

    React.useEffect(() => {
        clearTimeout(guide_timeout_ref.current);
        if (!guide_dtrader_v2?.[type]) {
            guide_timeout_ref.current = setTimeout(() => setIsModalOpen(true), 800);
        }
        return () => clearTimeout(guide_timeout_ref.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [guide_dtrader_v2?.[type]]);

    // Positions guide: mobile-only video modal, no tour.
    if (!is_trade_page) {
        if (!isMobile) return null;
        return (
            <Modal
                isOpened={is_modal_open}
                isNonExpandable
                isMobile
                showHandleBar
                shouldCloseModalOnSwipeDown
                toggleModal={onGuideDismiss}
                primaryButtonLabel={<Localize i18n_default_text='Got it' />}
                primaryButtonCallback={onGuideDismiss}
            >
                <Modal.Header
                    image={<OnboardingVideo page_type='positions_page' />}
                    title={<Localize i18n_default_text='View your positions' />}
                />
                <Modal.Body>
                    <Localize i18n_default_text='You can view your open and closed positions here. Tap an item for more details.' />
                </Modal.Body>
            </Modal>
        );
    }

    // Trade-page tour: intro modal (bottom sheet on mobile, centered on desktop) + joyride tour.
    return (
        <React.Fragment>
            <Modal
                isOpened={is_modal_open}
                toggleModal={onGuideDismiss}
                isMobile={isMobile}
                isNonExpandable={isMobile}
                showHandleBar={isMobile}
                shouldCloseModalOnSwipeDown={isMobile}
                showCrossIcon={!isMobile}
                primaryButtonLabel={<Localize i18n_default_text='Show me around' />}
                primaryButtonCallback={onGuideStart}
                buttonColor='black-white'
                className='onboarding-guide__intro'
            >
                <Modal.Body className='onboarding-guide__intro-body'>
                    <h2 className='onboarding-guide__intro-title'>
                        <Localize i18n_default_text='Designed for better trading' />
                    </h2>
                    <p className='onboarding-guide__intro-description'>
                        <Localize i18n_default_text='Take a quick look at the features that make your trading smoother.' />
                    </p>
                </Modal.Body>
            </Modal>
            <GuideContainer should_run={should_run_guide} onFinishGuide={onFinishGuide} />
        </React.Fragment>
    );
};

export default React.memo(OnboardingGuide);
