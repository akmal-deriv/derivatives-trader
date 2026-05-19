import React from 'react';

import { useLocalStorageData } from '@deriv/api';
import { LabelPairedXmarkSmBoldIcon } from '@deriv/quill-icons';
import { Button } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

import useIsEuAccount from 'AppV2/Hooks/useIsEuAccount';

import StepContent from './step-content';
import StepProgressBar from './step-progress-bar';
import getDesktopSteps from './steps-config-desktop';
import getMobileSteps from './steps-config-mobile';

import './migration-onboarding.scss';

type TMigrationOnboardingProps = {
    is_dark_mode_on?: boolean;
};

const MigrationOnboarding = ({ is_dark_mode_on }: TMigrationOnboardingProps) => {
    const { isMobile } = useDevice();
    const { is_eu, is_ready } = useIsEuAccount();
    const [current_step, setCurrentStep] = React.useState(0);
    const [is_open, setIsOpen] = React.useState(false);
    const guide_timeout_ref = React.useRef<ReturnType<typeof setTimeout>>();

    const [guide_completed, setGuideCompleted] = useLocalStorageData<boolean>('migration_onboarding_completed', false);

    const steps = React.useMemo(
        () => (isMobile ? getMobileSteps({ is_eu }) : getDesktopSteps({ is_eu })),
        [isMobile, is_eu]
    );
    const total_steps = steps.length;
    const is_last_step = current_step === total_steps - 1;
    const is_first_step = current_step === 0;

    const onComplete = React.useCallback(() => {
        setIsOpen(false);
        setGuideCompleted(true);
    }, [setGuideCompleted]);

    const onNext = () => {
        if (is_last_step) {
            onComplete();
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    const onBack = () => {
        if (!is_first_step) {
            setCurrentStep(prev => prev - 1);
        }
    };

    React.useEffect(() => {
        // Wait for the account API before opening so EU users don't see the
        // non-EU (USD) variant flash first while account data is still loading.
        if (!guide_completed && is_ready) {
            guide_timeout_ref.current = setTimeout(() => setIsOpen(true), 800);
        }

        return () => clearTimeout(guide_timeout_ref.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [guide_completed, is_ready]);

    if (!is_open) return null;

    return (
        <div className='migration-onboarding__overlay'>
            <div className='migration-onboarding__modal'>
                <div className='migration-onboarding__close-wrapper'>
                    <div className='migration-onboarding__close' onClick={onComplete} role='button' tabIndex={0}>
                        <LabelPairedXmarkSmBoldIcon fill='var(--component-textIcon-normal-prominent)' />
                    </div>
                </div>
                <div className='migration-onboarding__header'>
                    <StepProgressBar total_steps={total_steps} current_step={current_step} />
                </div>
                <StepContent step={steps[current_step]} is_dark_mode_on={is_dark_mode_on} />
                <div
                    className={`migration-onboarding__footer${is_first_step ? ' migration-onboarding__footer--single' : ''}`}
                >
                    {!is_first_step && (
                        <Button
                            onClick={onBack}
                            className='migration-onboarding__back-button'
                            color='black-white'
                            variant='secondary'
                            size='lg'
                            label={<Localize i18n_default_text='Back' />}
                        />
                    )}
                    <Button
                        onClick={onNext}
                        className='migration-onboarding__next-button'
                        color='coral'
                        size='lg'
                        label={
                            is_last_step ? (
                                <Localize i18n_default_text='Got it' />
                            ) : (
                                <Localize i18n_default_text='Next' />
                            )
                        }
                    />
                </div>
            </div>
        </div>
    );
};

export default React.memo(MigrationOnboarding);
