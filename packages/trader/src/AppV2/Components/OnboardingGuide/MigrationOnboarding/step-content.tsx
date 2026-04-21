import React from 'react';

import { TDesktopStepConfig } from './steps-config-desktop';
import { TMobileStepConfig } from './steps-config-mobile';

type TStepContentProps = {
    step: TMobileStepConfig | TDesktopStepConfig;
    is_dark_mode_on?: boolean;
};

const getImageSrc = (step: TMobileStepConfig | TDesktopStepConfig, is_dark_mode_on?: boolean): string => {
    if ('image' in step) return step.image;
    return is_dark_mode_on ? step.image_dark : step.image_light;
};

const StepContent = ({ step, is_dark_mode_on }: TStepContentProps) => (
    <div className='migration-onboarding__content'>
        <h2 className='migration-onboarding__title'>{step.title}</h2>
        <p className='migration-onboarding__description'>{step.description}</p>
        <div className='migration-onboarding__image-wrapper'>
            <img className='migration-onboarding__image' src={getImageSrc(step, is_dark_mode_on)} alt='' />
        </div>
    </div>
);

export default React.memo(StepContent);
