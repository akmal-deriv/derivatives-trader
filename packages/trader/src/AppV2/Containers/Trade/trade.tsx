import React from 'react';

import { useDevice } from '@deriv-com/ui';

import RiskDisclosureModal from 'AppV2/Components/RiskDisclosureModal';
import ServiceErrorSheet from 'AppV2/Components/ServiceErrorSheet';
import { RiskDisclosureProvider } from 'AppV2/Hooks/useRiskDisclosure';

import TradeDesktop from './trade-desktop';
import TradeMobile from './trade-mobile';

const Trade = () => {
    const { isMobile } = useDevice();

    return (
        <RiskDisclosureProvider>
            <React.Fragment>
                {isMobile ? <TradeMobile /> : <TradeDesktop />}
                <ServiceErrorSheet />
                <RiskDisclosureModal />
            </React.Fragment>
        </RiskDisclosureProvider>
    );
};

export default Trade;
