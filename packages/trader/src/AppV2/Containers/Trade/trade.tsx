import React from 'react';

import { useDevice } from '@deriv-com/ui';

import ServiceErrorSheet from 'AppV2/Components/ServiceErrorSheet';
import useProposalReconnectReset from 'AppV2/Hooks/useProposalReconnectReset';

import TradeDesktop from './trade-desktop';
import TradeMobile from './trade-mobile';

const Trade = () => {
    const { isMobile } = useDevice();

    // Re-issue the one-shot proposal query on reconnect so the stake Save button recovers after idle.
    useProposalReconnectReset();

    return (
        <React.Fragment>
            {isMobile ? <TradeMobile /> : <TradeDesktop />}
            <ServiceErrorSheet />
        </React.Fragment>
    );
};

export default Trade;
