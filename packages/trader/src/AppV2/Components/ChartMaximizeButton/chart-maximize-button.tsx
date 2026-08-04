import { observer, useStore } from '@deriv/stores';
import { localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

// Custom expand/compress glyphs — two diagonal arrows spread to opposite corners with an empty
// centre — copied verbatim from the native mobile app's `ic_chart_expand.svg` / `ic_chart_compress.svg`.
// No equivalent glyph exists in @deriv/quill-icons (its Expand/Compress are four-corner brackets).
// Authored with stroke='currentColor' so the button drives the colour.
import ChartCompressIcon from 'Assets/SvgComponents/ic-chart-compress.svg';
import ChartExpandIcon from 'Assets/SvgComponents/ic-chart-expand.svg';

import './chart-maximize-button.scss';

/**
 * Bottom-right chart overlay button that toggles the mobile "maximized" chart mode
 * (hides the header, market strip and bottom-nav so the chart grows; trade params stay).
 * Mirrors the Flutter `ChartMaximizeButton`, including its custom corner-spread arrow glyphs.
 * Frosted circular button, mobile only.
 */
const ChartMaximizeButton = observer(() => {
    const { isMobile } = useDevice();
    const {
        ui: { is_chart_maximized, toggleChartMaximized },
    } = useStore();

    if (!isMobile) return null;

    return (
        <button
            type='button'
            className='chart-maximize-button'
            aria-label={is_chart_maximized ? localize('Minimize chart') : localize('Maximize chart')}
            onClick={toggleChartMaximized}
        >
            {is_chart_maximized ? (
                <ChartCompressIcon width={20} height={20} />
            ) : (
                <ChartExpandIcon width={20} height={20} />
            )}
        </button>
    );
});

export default ChartMaximizeButton;
