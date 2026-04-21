import { getUrlBase } from '@deriv/shared';
import { localize } from '@deriv-com/translations';

export type TDesktopStepConfig = {
    title: string;
    description: string;
    image_light: string;
    image_dark: string;
};

const getDesktopSteps = (): TDesktopStepConfig[] => {
    const img = (name: string) => getUrlBase(`/public/images/common/${name}`);

    return [
        {
            title: localize('Welcome to new Deriv Trader'),
            description: localize('A faster, more intuitive trading experience.'),
            image_light: img('migration-onboarding-step-1-light.png'),
            image_dark: img('migration-onboarding-step-1-dark.png'),
        },
        {
            title: localize('Options account now in USD'),
            description: localize(
                'If you have funds, they are in your Wallet. Transfer them to your Options account to trade.'
            ),
            image_light: img('migration-onboarding-step-2-light.png'),
            image_dark: img('migration-onboarding-step-2-dark.png'),
        },
        {
            title: localize('Intuitive contract buying'),
            description: localize('Choose your trade direction first, then tap the Buy button to place your trade.'),
            image_light: img('migration-onboarding-step-3-light.png'),
            image_dark: img('migration-onboarding-step-3-dark.png'),
        },
        {
            title: localize('Quick parameter setup'),
            description: localize('Configure your trade parameters quickly using the new preset options.'),
            image_light: img('migration-onboarding-step-4-light.png'),
            image_dark: img('migration-onboarding-step-4-dark.png'),
        },
        {
            title: localize('All new chart experience'),
            description: localize('Instantly see your active positions with new vibrant markers.'),
            image_light: img('migration-onboarding-step-5-light.png'),
            image_dark: img('migration-onboarding-step-5-dark.png'),
        },
        {
            title: localize('Draw smarter'),
            description: localize('Add lines with quick, intuitive controls.'),
            image_light: img('migration-onboarding-step-6-light.png'),
            image_dark: img('migration-onboarding-step-6-dark.png'),
        },
    ];
};

export default getDesktopSteps;
