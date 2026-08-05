import React from 'react';
import Joyride, { CallBackProps, STATUS } from 'react-joyride';

import { useDevice } from '@deriv-com/ui';

import { useTraderStore } from 'Stores/useTraderStores';

import GuideTooltip from './guide-tooltip';
import getOnboardingSteps, { SPOTLIGHT_RADIUS, TOnboardingStep, TTourActions } from './steps-config';

type TGuideContainerProps = {
    should_run: boolean;
    onFinishGuide: () => void;
};

// A `prepare` step opens its own anchor — poll (bounded) for it to mount before advancing, so
// joyride measures a present target and places the tooltip correctly.
const TARGET_POLL_MS = 30;
const TARGET_POLL_MAX = 20;

// Toggled on <body> during a `spotlight_switcher` step so CSS can lift the trade-panel switcher
// above the tour overlay (see trade-panel-tabs.scss).
const SWITCHER_SPOTLIGHT_CLASS = 'dtrader-tour--panel-switcher';

// A step is anchored once its target is in the DOM (non-string targets — refs — count as present).
const isTargetPresent = (target: TOnboardingStep['target']) =>
    typeof target !== 'string' || !!document.querySelector(target);

const GuideContainer = ({ should_run, onFinishGuide }: TGuideContainerProps) => {
    const { isMobile } = useDevice();
    const { setMarketSelectorOpen, setActiveTradePanelTab } = useTraderStore();
    const [step_index, setStepIndex] = React.useState(0);
    const advance_timeout_ref = React.useRef<ReturnType<typeof setTimeout>>();

    const actions: TTourActions = React.useMemo(
        () => ({ setMarketSelectorOpen, setActiveTradePanelTab }),
        [setMarketSelectorOpen, setActiveTradePanelTab]
    );

    // Keep steps that create their own anchor (`prepare`) or whose target is already in the DOM.
    const steps = React.useMemo(() => {
        const all_steps = getOnboardingSteps(isMobile);
        const filtered = should_run
            ? all_steps.filter(step => step.prepare || isTargetPresent(step.target))
            : all_steps;
        return filtered.map(step => ({ ...step, disableBeacon: true }));
    }, [should_run, isMobile]);

    const finish = React.useCallback(() => {
        clearTimeout(advance_timeout_ref.current);
        document.body.classList.remove(SWITCHER_SPOTLIGHT_CLASS);
        setMarketSelectorOpen(false); // never leave the selector open once the tour ends
        setStepIndex(0); // reset so a later re-run starts from the first step
        onFinishGuide();
    }, [onFinishGuide, setMarketSelectorOpen]);

    // Advance via the `stepIndex` prop only — also calling joyride's next() would double-drive the
    // transition. A `prepare` step creates its anchor first (poll until it mounts); other anchors
    // already exist, so advance at once. Side effects run from the effect below, never in this tick.
    const advance = React.useCallback(
        (current_index: number) => {
            const next = steps[current_index + 1];
            if (!next) return finish();
            clearTimeout(advance_timeout_ref.current);

            const go = () => setStepIndex(current_index + 1);
            if (!next.prepare) return go();

            next.prepare(actions);
            let tries = 0;
            const poll = () => {
                tries += 1;
                if (isTargetPresent(next.target) || tries > TARGET_POLL_MAX) go();
                else advance_timeout_ref.current = setTimeout(poll, TARGET_POLL_MS);
            };
            advance_timeout_ref.current = setTimeout(poll, TARGET_POLL_MS);
        },
        [steps, actions, finish]
    );

    // Run the step's `enter` side effects (close selector, switch panel tab) AFTER joyride re-anchors;
    // doing it in the advance tick would unmount the previous anchor mid-transition and re-show it.
    // Also flag whether this step should poke the panel switcher through the overlay.
    React.useEffect(() => {
        if (!should_run) return;
        const step = steps[step_index];
        step?.enter?.(actions);
        document.body.classList.toggle(SWITCHER_SPOTLIGHT_CLASS, !!step?.spotlight_switcher);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step_index, should_run]);

    React.useEffect(() => {
        if (should_run && steps.length === 0) finish();
    }, [should_run, steps.length, finish]);

    React.useEffect(
        () => () => {
            clearTimeout(advance_timeout_ref.current);
            document.body.classList.remove(SWITCHER_SPOTLIGHT_CLASS);
        },
        []
    );

    const callbackHandle = (data: CallBackProps) => {
        const { status } = data;
        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) finish();
    };

    return (
        <Joyride
            continuous
            callback={callbackHandle}
            disableCloseOnEsc
            disableOverlayClose
            disableScrolling
            floaterProps={{ styles: { arrow: { length: 4, spread: 8 } } }}
            run={should_run && steps.length > 0}
            steps={steps}
            spotlightPadding={0}
            scrollToFirstStep
            styles={{
                options: {
                    arrowColor: 'var(--component-textIcon-normal-prominent)',
                    overlayColor: 'var(--core-color-opacity-black-600)',
                    // Above the market selector's InputPopover stack (max z 1100) so a "Next" click
                    // hits the tooltip, not the selector's click-to-close backdrop. Tooltip = zIndex + 100.
                    zIndex: 1200,
                },
                spotlight: { borderRadius: SPOTLIGHT_RADIUS },
            }}
            stepIndex={step_index}
            tooltipComponent={props => <GuideTooltip {...props} onNext={advance} onClose={finish} />}
        />
    );
};

export default React.memo(GuideContainer);
