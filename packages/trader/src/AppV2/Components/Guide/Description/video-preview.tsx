import { useState } from 'react';

import { VideoPlayer } from '@deriv/components';
import { LabelPairedPlayMdFillIcon } from '@deriv/quill-icons';
import { CaptionText } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

import { getVideoMp4Url, getVideoThumbnailUrl } from 'AppV2/Utils/video-config';

type TVideoPreview = {
    contract_type: string;
    toggleVideoPlayer?: () => void;
    video_src: string;
};

const VideoPreview = ({ contract_type, toggleVideoPlayer, video_src }: TVideoPreview) => {
    const { isMobile } = useDevice();
    const [is_started, setIsStarted] = useState(false);

    if (!isMobile) {
        if (is_started) {
            return (
                <div className='guide-video__wrapper'>
                    <div className='guide-video__player' data-testid='dt_video_player'>
                        <VideoPlayer
                            src={getVideoMp4Url(video_src)}
                            is_mobile={false}
                            should_show_controls
                            autoplay
                            height='252px'
                        />
                    </div>
                </div>
            );
        }

        return (
            <div className='guide-video__wrapper'>
                <div
                    className='guide-video__preview'
                    data-testid='dt_video_preview'
                    role='button'
                    tabIndex={0}
                    onClick={() => setIsStarted(true)}
                    onKeyDown={e => e.key === 'Enter' && setIsStarted(true)}
                >
                    <img
                        src={getVideoThumbnailUrl(video_src)}
                        alt='video thumbnail'
                        className='guide-video__preview__thumbnail'
                    />
                    <div className='guide-video__preview__icon__wrapper'>
                        <LabelPairedPlayMdFillIcon className='guide-video__preview__icon' />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className='guide-video__wrapper'>
            <div
                className='guide-video__preview'
                data-testid='dt_video_preview'
                onClick={toggleVideoPlayer}
                onKeyDown={toggleVideoPlayer}
            >
                <img
                    src={getVideoThumbnailUrl(video_src)}
                    alt='video thumbnail'
                    width='112'
                    height='73'
                    className='guide-video__preview__thumbnail'
                />
                <div className='guide-video__preview__icon__wrapper'>
                    <LabelPairedPlayMdFillIcon className='guide-video__preview__icon' />
                </div>
            </div>
            <div className='guide-video__description'>
                <CaptionText bold>
                    <Localize i18n_default_text='How to trade {{contract_type}}?' values={{ contract_type }} />
                </CaptionText>
                <CaptionText>
                    <Localize i18n_default_text='Watch this video to learn about this trade type.' />
                </CaptionText>
            </div>
        </div>
    );
};

export default VideoPreview;
