import React from 'react';

import { Skeleton } from '@deriv-com/quill-ui';

import { getVideoMp4Url } from 'AppV2/Utils/video-config';

type TStreamIframeProps = Pick<React.ComponentProps<'video'>, 'height' | 'width' | 'onLoad'> & {
    autoplay?: boolean;
    controls?: boolean;
    loop?: boolean;
    muted?: boolean;
    src: string;
    test_id?: string;
    title?: string;
};

const StreamIframe = ({
    autoplay = true,
    controls = false,
    loop = true,
    muted = true,
    src,
    test_id,
    title,
    height,
    width,
    ...props
}: TStreamIframeProps) => {
    const [is_loading, setIsLoading] = React.useState(true);

    return (
        <div className='stream__wrapper'>
            {/* Fills the responsive 16:9 wrapper instead of sizing to the
                viewport — a viewport-sized skeleton ballooned the height in
                constrained containers (e.g. a desktop modal). */}
            {is_loading && <Skeleton.Square className='stream__skeleton' fullWidth height='100%' />}
            <video
                className='stream__iframe'
                width={width ?? '100%'}
                height={height ?? '100%'}
                src={getVideoMp4Url(src)}
                data-testid={test_id}
                title={title}
                autoPlay={autoplay}
                controls={controls}
                loop={loop}
                muted={muted}
                playsInline
                preload='auto'
                onLoadedData={() => setIsLoading(false)}
                {...props}
            />
        </div>
    );
};

export default StreamIframe;
