import React from 'react';
import clsx from 'clsx';

import { LabelPairedCircleInfoMdRegularIcon } from '@deriv/quill-icons';
import { Tooltip } from '@deriv-com/quill-ui';
import { useTranslations } from '@deriv-com/translations';

type TActionSheetHeaderTooltipProps = {
    className?: string;
    'data-testid'?: string;
    description?: string | JSX.Element;
    label?: string;
    tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
};

// Info-icon tooltip that replaces a former Carousel description page. The trailing save action now
// owns the header edge slot, so a parameter's description is surfaced here instead — composed inline
// into the ActionSheet.Header `title` (or, for multi-description sheets, next to each item label).
const ActionSheetHeaderTooltip = ({
    className,
    description,
    label,
    tooltipPosition = 'bottom',
    ...rest
}: TActionSheetHeaderTooltipProps) => {
    const { localize } = useTranslations();

    if (!description) return null;

    return (
        <Tooltip
            as='button'
            type='button'
            aria-label={label ?? localize('More info')}
            className={clsx('action-sheet-header-tooltip', className)}
            tooltipContent={description}
            tooltipPosition={tooltipPosition}
            variant='base'
            hasArrow
            {...rest}
        >
            <LabelPairedCircleInfoMdRegularIcon />
        </Tooltip>
    );
};

export default ActionSheetHeaderTooltip;
