import React from 'react';
import { observer } from 'mobx-react-lite';

import { Skeleton } from '@deriv/components';
import { getUrlBase } from '@deriv/shared';
import { useStore } from '@deriv/stores';
import type { DotLottieReact } from '@lottiefiles/dotlottie-react';

import LottieAnimation from 'AppV2/Components/LottieAnimation';
import { getContractDescriptionAnimationSrc } from 'AppV2/Utils/video-config';

type TVideoFragment = {
    contract_type: string;
};

const VideoFragment = observer(({ contract_type }: TVideoFragment) => {
    const [is_loading, setIsLoading] = React.useState(true);
    const [dotLottie, setDotLottie] = React.useState<EventTarget | null>(null);

    const {
        ui: { is_dark_mode_on },
    } = useStore();

    // memoize file paths for videos and open the modal only after we get them
    // Using mobile videos for both desktop and mobile as desktop-specific videos don't exist yet.
    // Select the light/dark asset by theme and recompute the src when the theme toggles.
    const lottie_src = React.useMemo(
        () => getUrlBase(getContractDescriptionAnimationSrc(contract_type, is_dark_mode_on)),
        [contract_type, is_dark_mode_on]
    );

    React.useEffect(() => {
        const onLoad = () => setIsLoading(false);

        if (dotLottie) dotLottie.addEventListener('load', onLoad);

        return () => {
            if (dotLottie) dotLottie.removeEventListener('load', onLoad);
        };
    }, [dotLottie]);

    return (
        <div className='video-fragment__wrapper'>
            {is_loading && <Skeleton width={320} height={208} className='skeleton-video-loader' />}
            <LottieAnimation
                autoplay
                dotLottieRefCallback={
                    ((dotLottie: EventTarget | null) => setDotLottie(dotLottie)) as React.ComponentProps<
                        typeof DotLottieReact
                    >['dotLottieRefCallback']
                }
                src={lottie_src}
                loop
            />
        </div>
    );
});

export default VideoFragment;
