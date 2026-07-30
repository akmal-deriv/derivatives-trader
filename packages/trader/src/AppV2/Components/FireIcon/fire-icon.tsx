import React from 'react';

import { getUrlBase } from '@deriv/shared';

import LottieAnimation from 'AppV2/Components/LottieAnimation';

import './fire-icon.scss';

const FireIcon = () => {
    const lottie_src = React.useMemo(() => getUrlBase('/public/videos/fire.lottie'), []);

    return (
        <span className='fire-icon'>
            <LottieAnimation autoplay src={lottie_src} loop className='fire-icon__animation' />
        </span>
    );
};

export default FireIcon;
