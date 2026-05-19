import { getUrlBase } from '@deriv/shared';
import { localize } from '@deriv-com/translations';

import type { TStepsConfigOptions } from './steps-config-desktop';

export type TMobileStepConfig = {
    title: string;
    description: string;
    image: string;
};

const getMobileSteps = ({ is_eu = false }: TStepsConfigOptions = {}): TMobileStepConfig[] => {
    const img = (name: string) => getUrlBase(`/public/images/common/${name}`);

    return [
        {
            title: localize('Welcome to new Deriv Trader'),
            description: localize('Everything you need, including the parameters and chart, is now on one screen.'),
            image: is_eu
                ? img('migration-onboarding-step-1-eu-mobile.png')
                : img('migration-onboarding-step-1-mobile.png'),
        },
        {
            title: is_eu ? localize('Options account now in EUR') : localize('Options account now in USD'),
            description: localize(
                'If you have funds, they are in your Wallet. Transfer them to your Options account to trade.'
            ),
            image: img('migration-onboarding-step-2-mobile.png'),
        },
        {
            title: localize('Intuitive contract buying'),
            description: localize('Choose your trade direction first, then tap the Buy button to place your trade.'),
            image: is_eu
                ? img('migration-onboarding-step-3-eu-mobile.png')
                : img('migration-onboarding-step-3-mobile.png'),
        },
        {
            title: localize('Quick parameter setup'),
            description: localize('Configure your trade parameters quickly using the new preset options.'),
            image: is_eu
                ? img('migration-onboarding-step-4-eu-mobile.png')
                : img('migration-onboarding-step-4-mobile.png'),
        },
        {
            title: localize('All new chart experience'),
            description: localize('Instantly see your active positions with new vibrant markers.'),
            image: img('migration-onboarding-step-5-mobile.png'),
        },
    ];
};

export default getMobileSteps;
