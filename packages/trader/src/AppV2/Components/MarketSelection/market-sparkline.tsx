import { useId } from 'react';
import clsx from 'clsx';

type TMarketSparkline = {
    /** Price points in chronological order. Fewer than 2 points renders nothing. */
    data: number[];
    is_positive?: boolean;
    is_negative?: boolean;
    /** Draw a soft gradient area fill below the line — transparent at the line, fading to the panel
     *  surface colour at the baseline (used by the info-screen chart; cards are line-only). */
    with_area?: boolean;
    /** Stretch to fill the container width (for the large info-screen chart) with a crisp stroke. */
    responsive?: boolean;
    /** Coordinate-space size; also the rendered size for the inline (non-responsive) variant. */
    width?: number;
    height?: number;
    className?: string;
};

const DEFAULT_WIDTH = 64;
const DEFAULT_HEIGHT = 28;
const STROKE = 1;

/**
 * A "worm" sparkline drawn as a plain SVG polyline (no charting library). Points are normalised to
 * the viewBox and the line/area use `currentColor`, set by the direction modifier. Optional gradient
 * area fill. The inline variant renders at a fixed size; `responsive` stretches to the container
 * width (used by the larger info-screen chart) while keeping a crisp 1px stroke via non-scaling
 * stroke. Resolution is whatever the caller passes.
 */
const MarketSparkline = ({
    data,
    is_positive,
    is_negative,
    with_area,
    responsive,
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
    className,
}: TMarketSparkline) => {
    // `useId` must run before the early return to satisfy the rules of hooks. Strip the colons React
    // adds so the value is safe to reference from `fill="url(#…)"`.
    const gradient_id = `spark-${useId().replace(/:/g, '')}`;

    if (!data || data.length < 2) return null;

    // reduce (not Math.min/max(...data)) so a large series can't overflow the call stack.
    const min = data.reduce((acc, val) => (val < acc ? val : acc), data[0]);
    const max = data.reduce((acc, val) => (val > acc ? val : acc), data[0]);
    const range = max - min || 1; // flat series → a centred horizontal line
    const step = width / (data.length - 1);
    const pad = STROKE / 2; // keep the stroke inside the viewBox at the extremes

    const points = data
        .map((value, index) => {
            const x = index * step;
            const y = height - pad - ((value - min) / range) * (height - STROKE);
            return `${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(' ');

    return (
        <svg
            className={clsx(
                'market-sparkline',
                {
                    'market-sparkline--positive': is_positive,
                    'market-sparkline--negative': is_negative,
                },
                className
            )}
            data-testid='dt_market_sparkline'
            width={responsive ? '100%' : width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            // Stretch to fill the container; non-uniform scaling is fine because the stroke is drawn
            // non-scaling below, so the line stays crisp regardless of the container width.
            preserveAspectRatio={responsive ? 'none' : undefined}
            fill='none'
            aria-hidden='true'
        >
            {with_area && (
                <>
                    <defs>
                        {/* Per Figma: transparent at the line (top), fading down to the panel surface
                            colour at the baseline. The surface token is opaque, so — like the Figma
                            export — the whole fill is knocked back to 0.24 via `fill-opacity` on the
                            polygon (not baked into the token). The bottom stop is a CSS var set via
                            `style` because var() isn't reliably resolved in an SVG presentation attr. */}
                        <linearGradient id={gradient_id} x1='0' y1='0' x2='0' y2='1'>
                            <stop offset='0%' stopColor='currentColor' stopOpacity='0' />
                            <stop
                                offset='100%'
                                style={{ stopColor: 'var(--semantic-color-slate-solid-surface-frame-low)' }}
                            />
                        </linearGradient>
                    </defs>
                    <polygon
                        points={`${points} ${width},${height} 0,${height}`}
                        fill={`url(#${gradient_id})`}
                        fillOpacity={0.24}
                    />
                </>
            )}
            <polyline
                points={points}
                stroke='currentColor'
                strokeWidth={STROKE}
                strokeLinecap='round'
                strokeLinejoin='round'
                vectorEffect={responsive ? 'non-scaling-stroke' : undefined}
            />
        </svg>
    );
};

export default MarketSparkline;
