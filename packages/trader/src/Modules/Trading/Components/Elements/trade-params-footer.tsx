import React from 'react';

import NetworkStatus from '@deriv/core/src/App/Components/Layout/Footer/network-status';
import { ToggleFullScreen } from './toggle-fullscreen';

import DateTime from './date-time';

const TradeParamsFooter: React.FC = () => {
    return (
        <div className='trade-params-v1-footer'>
            <NetworkStatus />
            <DateTime />
            <ToggleFullScreen showPopover={true} />
        </div>
    );
};

TradeParamsFooter.displayName = 'TradeParamsFooter';

export default TradeParamsFooter;
