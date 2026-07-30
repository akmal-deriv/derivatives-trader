import React from 'react';

import { Localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

import { Skeleton } from '../../skeleton';
import Toast from '../../toast';

const TAP_FEEDBACK_TIMEOUT = 4000;

const TradeLoader = () => {
    const { isMobile } = useDevice();
    const [is_toast_open, setIsToastOpen] = React.useState(false);

    // Taps while the toast is visible are no-ops — its open state is the throttle window,
    // so rage-tapping the skeleton produces a single acknowledgement at a time.
    const showTapFeedback = () => setIsToastOpen(true);

    // The live region stays mounted so screen readers announce the toast when it appears
    const tap_feedback = (
        <div className='loading-dtrader-v2__toast' role='status' aria-live='polite'>
            {is_toast_open && (
                <Toast is_open type='notification' timeout={TAP_FEEDBACK_TIMEOUT} onClose={() => setIsToastOpen(false)}>
                    <Localize i18n_default_text='Loading the trade page. This may take a few seconds.' />
                </Toast>
            )}
        </div>
    );

    if (isMobile) {
        return (
            <div className='loading-dtrader-v2__trade' data-testid='dt_trade_loader' onClick={showTapFeedback}>
                <div className='skeleton-box__trade-types'>
                    {[...new Array(4)].map((_, idx) => (
                        <Skeleton key={idx} width={88} height={32} borderRadius={16} />
                    ))}
                </div>
                <div className='skeleton-box__market'>
                    <Skeleton height={42} />
                </div>
                <div className='skeleton-box__chart'>
                    <Skeleton />
                </div>
                <div className='skeleton-box__trade-params'>
                    <Skeleton height={220} />
                </div>
                {tap_feedback}
            </div>
        );
    }
    return (
        <div className='loading-dtrader-v2__trade' data-testid='dt_trade_loader' onClick={showTapFeedback}>
            <div className='skeleton-box skeleton-box__header'>
                <div className='skeleton-box__header-trade-types'>
                    {[...new Array(6)].map((_, idx) => (
                        <Skeleton key={idx} width={88} height={32} borderRadius={16} />
                    ))}
                </div>
                <Skeleton width={72} height={32} borderRadius={16} />
            </div>
            <div className='skeleton-box'>
                <div className='skeleton-box__chart'>
                    <Skeleton />
                </div>
                <div className='skeleton-box__trade-params'>
                    <div className='skeleton-box__trade-params-row'>
                        <Skeleton width={192} height={24} />
                    </div>
                    <div className='skeleton-box__trade-params-column'>
                        {[...new Array(3)].map((_, idx) => (
                            <Skeleton key={idx} height={56} />
                        ))}
                    </div>
                    <div className='skeleton-box__trade-params-row'>
                        <Skeleton width={76} height={24} />
                        <Skeleton width={100} height={24} />
                    </div>
                    <div className='skeleton-box__trade-params-row'>
                        <Skeleton height={56} borderRadius={28} />
                    </div>
                </div>
            </div>
            {tap_feedback}
        </div>
    );
};

export default TradeLoader;
