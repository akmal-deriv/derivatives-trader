import React from 'react';
import clsx from 'clsx';

import { Skeleton } from '@deriv-com/quill-ui';

import { ASPECT_RATIO } from 'AppV2/Utils/layout-utils';
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
    const skeleton_height = height ? String(height) : `calc(100vw * ${ASPECT_RATIO})`;

    return (
        <div className={clsx('stream__wrapper', is_loading && 'stream__wrapper--is-loading')}>
            {is_loading && <Skeleton.Square height={skeleton_height} />}
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
