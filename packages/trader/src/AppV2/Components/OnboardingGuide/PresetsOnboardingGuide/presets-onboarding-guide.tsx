import React from 'react';

import { useLocalStorageData } from '@deriv/api';
import { ActionSheet, Text } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

import { getUrlBase } from '@deriv/shared';
import { observer, useStore } from '@deriv/stores';

const getPresetsOnboardingSteps = (is_dark: boolean) => {
    const suffix = is_dark ? '-dark' : '';
    return [
        {
            image: getUrlBase(`/public/images/common/presets-onboarding/img-contract-switcher${suffix}.png`),
            title: <Localize i18n_default_text='Intuitive contract switcher' />,
            description: (
                <Localize i18n_default_text='Set your trade direction first for a more intuitive experience.' />
            ),
            button_label: <Localize i18n_default_text='Next' />,
        },
        {
            image: getUrlBase(`/public/images/common/presets-onboarding/img-one-tap-durations${suffix}.png`),
            title: <Localize i18n_default_text='One-Tap durations' />,
            description: (
                <Localize i18n_default_text="Tap a preset to lock in your trade's timeframe without manual entry." />
            ),
            button_label: <Localize i18n_default_text='Next' />,
        },
        {
            image: getUrlBase(`/public/images/common/presets-onboarding/img-quick-stake-amounts${suffix}.png`),
            title: <Localize i18n_default_text='Quick stake amounts' />,
            description: (
                <Localize i18n_default_text='Select your preferred stake value with a single tap to trade even faster.' />
            ),
            button_label: <Localize i18n_default_text='Got it' />,
        },
    ];
};

const PresetsOnboardingGuide = observer(() => {
    const { isMobile } = useDevice();
    const {
        ui: { is_dark_mode_on },
    } = useStore();
    const [is_open, setIsOpen] = React.useState(false);
    const [current_step, setCurrentStep] = React.useState(0);
    const timeout_ref = React.useRef<ReturnType<typeof setTimeout>>();

    const steps = React.useMemo(() => getPresetsOnboardingSteps(is_dark_mode_on), [is_dark_mode_on]);

    const [guide_dtrader_v2] = useLocalStorageData<Record<string, boolean>>('guide_dtrader_v2', {
        trade_types_selection: false,
        trade_page: false,
        positions_page: false,
    });
    const [presets_guide_seen, setPresetsGuideSeen] = useLocalStorageData<boolean>('presets_onboarding_guide', false);

    const has_seen_any_mobile_onboarding = Object.values(guide_dtrader_v2 || {}).some(value => value === true);
    const should_show = isMobile && has_seen_any_mobile_onboarding && !presets_guide_seen;

    React.useEffect(() => {
        if (!should_show) return;
        let cancelled = false;
        const preload_promises = steps.map(
            step =>
                new Promise<void>(resolve => {
                    const img = new Image();
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                    img.src = step.image;
                })
        );
        Promise.all(preload_promises).then(() => {
            if (!cancelled) {
                timeout_ref.current = setTimeout(() => setIsOpen(true), 800);
            }
        });
        return () => {
            cancelled = true;
            clearTimeout(timeout_ref.current);
        };
    }, [should_show, steps]);

    const onClose = React.useCallback(() => {
        setIsOpen(false);
        setPresetsGuideSeen(true);
    }, [setPresetsGuideSeen]);

    const onButtonClick = React.useCallback(() => {
        if (current_step < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            onClose();
        }
    }, [current_step, steps.length, onClose]);

    if (!should_show || !is_open) return null;

    const step = steps[current_step];

    return (
        <ActionSheet.Root isOpen onClose={onClose} position='left' expandable={false}>
            <ActionSheet.Portal showHandlebar shouldCloseOnDrag handleBarPosition='absolute'>
                <div className='presets-onboarding'>
                    <img className='presets-onboarding__image' src={step.image} alt='' />
                    <div className='presets-onboarding__content'>
                        <Text size='xl' bold color='quill-typography__color--prominent'>
                            {step.title}
                        </Text>
                        <Text>{step.description}</Text>
                    </div>
                </div>
                <ActionSheet.Footer
                    alignment='vertical'
                    shouldCloseOnPrimaryButtonClick={false}
                    primaryAction={{
                        content: step.button_label,
                        onAction: onButtonClick,
                    }}
                />
            </ActionSheet.Portal>
        </ActionSheet.Root>
    );
});

export default PresetsOnboardingGuide;
