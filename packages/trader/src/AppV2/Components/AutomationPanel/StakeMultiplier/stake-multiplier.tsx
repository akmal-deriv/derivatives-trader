import React from 'react';

import { useDevice } from '@deriv-com/ui';

import { TAutomationConfig } from '../automation-config';

import StakeMultiplierDesktop from './stake-multiplier-desktop';
import StakeMultiplierMobile from './stake-multiplier-mobile';

type TStakeMultiplierProps = {
    strategy: TAutomationConfig['strategy'];
    selectedValue: number;
    description?: string;
    onSelect: (value: number) => void;
};

const StakeMultiplier = (props: TStakeMultiplierProps) => {
    const { isMobile } = useDevice();
    return isMobile ? <StakeMultiplierMobile {...props} /> : <StakeMultiplierDesktop {...props} />;
};

export default StakeMultiplier;
