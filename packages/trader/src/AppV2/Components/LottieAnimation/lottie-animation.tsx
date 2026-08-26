import React from 'react';

import { DotLottieReact } from '@lottiefiles/dotlottie-react';

type TLottieAnimationProps = React.ComponentProps<typeof DotLottieReact>;

/**
 * Wrapper around DotLottieReact that defers mounting the animation until its
 * container has non-zero dimensions.
 *
 * DotLottieReact autoplays into a <canvas> whose backing-store size is derived
 * from the container's bounding rect. When it mounts inside a hidden or
 * not-yet-laid-out container (e.g. a collapsed action sheet, a closed modal, or
 * an off-screen list) the canvas width is 0 and the underlying renderer throws
 * `IndexSizeError: Failed to construct 'ImageData': The source width is zero or
 * not a number` on its first draw.
 *
 * Gating the mount on a measured non-zero size guarantees the animation never
 * draws at zero size. The container renders eagerly so it can be measured, but
 * the animation stays unmounted until the ResizeObserver confirms a non-zero
 * size — starting hidden avoids a race where DotLottieReact mounts and draws
 * (synchronously, on load) before the first observer callback can hide it.
 */
const LottieAnimation = ({ className, ...props }: TLottieAnimationProps) => {
    const container_ref = React.useRef<HTMLDivElement>(null);
    const [is_visible, setIsVisible] = React.useState(false);

    React.useEffect(() => {
        const container = container_ref.current;
        if (!container) return undefined;

        // Without ResizeObserver (e.g. very old browsers) the size can't be
        // observed, so render the animation unconditionally rather than never.
        if (typeof ResizeObserver === 'undefined') {
            setIsVisible(true);
            return undefined;
        }

        const observer = new ResizeObserver(entries => {
            const { width, height } = entries[0]?.contentRect ?? container.getBoundingClientRect();
            setIsVisible(width > 0 && height > 0);
        });
        observer.observe(container);

        return () => observer.disconnect();
    }, []);

    return (
        // When a className is passed it carries the sizing, mirroring how
        // DotLottieReact applies a className to its own container. Otherwise fall
        // back to filling the parent, matching DotLottieReact's default container.
        <div
            ref={container_ref}
            className={className}
            style={className ? undefined : { width: '100%', height: '100%', lineHeight: 0 }}
        >
            {is_visible && <DotLottieReact {...props} />}
        </div>
    );
};

export default LottieAnimation;
