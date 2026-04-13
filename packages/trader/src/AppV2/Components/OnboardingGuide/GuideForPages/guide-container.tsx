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
    const steps = custom_steps ?? STEPS;

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
            run={should_run}
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
