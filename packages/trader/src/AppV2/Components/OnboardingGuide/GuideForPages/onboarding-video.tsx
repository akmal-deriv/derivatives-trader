import { useStore } from '@deriv/stores';

import StreamIframe from 'AppV2/Components/StreamIframe';
import { getOnboardingVideoId } from 'AppV2/Utils/video-config';

type TOnboardingVideoProps = {
    page_type: 'trade_page' | 'positions_page';
};

const OnboardingVideo = ({ page_type }: TOnboardingVideoProps) => {
    const {
        ui: { is_dark_mode_on },
    } = useStore();

    return (
        <StreamIframe
            src={getOnboardingVideoId(page_type, is_dark_mode_on)}
            title={`onboarding_${page_type}`}
            autoplay
            loop
            muted
            data-testid='dt_onboarding_guide_video'
        />
    );
};

export default OnboardingVideo;
