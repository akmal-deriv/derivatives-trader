import React from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

import GuideTooltip from './guide-tooltip';
import STEPS from './steps-config';

type TGuideContainerProps = {
    should_run: boolean;
    onFinishGuide: () => void;
    custom_steps?: Step[]; // If provided, use these steps instead of the default mobile STEPS
};

type TFinishedStatuses = CallBackProps['status'][];

const GuideContainer = ({ should_run, onFinishGuide, custom_steps }: TGuideContainerProps) => {
    const [step_index, setStepIndex] = React.useState(0);
    const all_steps = custom_steps ?? STEPS;

    // Drop steps whose target selector isn't in the DOM. Without this, Joyride
    // silently fails to start when the first step's target is absent — e.g. the
    // trade-types selector is hidden for clients in restricted account groups.
    const steps = React.useMemo(() => {
        if (!should_run) return all_steps;
        return all_steps.filter(step =>
            typeof step.target === 'string' ? !!document.querySelector(step.target) : true
        );
    }, [should_run, all_steps]);

    React.useEffect(() => {
        if (should_run && steps.length === 0) onFinishGuide();
    }, [should_run, steps.length, onFinishGuide]);

    const callbackHandle = (data: CallBackProps) => {
        const { status, step, index } = data;
        if (index === 0) {
            step.disableBeacon = true;
        }
        const finished_statuses: TFinishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finished_statuses.includes(status)) onFinishGuide();
    };

    return (
        <Joyride
            continuous
            callback={callbackHandle}
            disableCloseOnEsc
            disableOverlayClose
            disableScrolling
            floaterProps={{
                styles: {
                    arrow: {
                        length: 4,
                        spread: 8,
                    },
                },
            }}
            run={should_run && steps.length > 0}
            showSkipButton
            steps={steps}
            spotlightPadding={0}
            scrollToFirstStep
            styles={{
                options: {
                    arrowColor: 'var(--component-textIcon-normal-prominent)',
                    overlayColor: 'var(--core-color-opacity-black-600)',
                },
                spotlight: {
                    borderRadius: 'unset',
                },
            }}
            stepIndex={step_index}
            tooltipComponent={props => <GuideTooltip {...props} setStepIndex={setStepIndex} />}
        />
    );
};

export default React.memo(GuideContainer);
