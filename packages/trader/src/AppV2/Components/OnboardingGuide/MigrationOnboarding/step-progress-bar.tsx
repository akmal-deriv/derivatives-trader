import React from 'react';

type TStepProgressBarProps = {
    total_steps: number;
    current_step: number;
};

const StepProgressBar = ({ total_steps, current_step }: TStepProgressBarProps) => (
    <div className='migration-onboarding__progress'>
        {Array.from({ length: total_steps }, (_, index) => (
            <div
                key={index}
                data-testid={`progress-segment-${index}`}
                className={`migration-onboarding__progress-segment${index <= current_step ? ' migration-onboarding__progress-segment--active' : ''}`}
            />
        ))}
    </div>
);

export default React.memo(StepProgressBar);
