import React from 'react';

import ActionSheetHeaderTooltip from './action-sheet-header-tooltip';

type TActionSheetHeaderTitleProps = {
    description?: string | JSX.Element;
    label?: string;
    'data-testid'?: string;
    title: React.ReactNode;
};

// Composes an ActionSheet.Header title with a trailing info-icon tooltip for the sheet-level
// description (the page a Carousel used to host). Pass as the header `title` prop.
const ActionSheetHeaderTitle = ({ description, label, title, ...rest }: TActionSheetHeaderTitleProps) => (
    <span className='action-sheet-header-title'>
        {title}
        <ActionSheetHeaderTooltip description={description} label={label} {...rest} />
    </span>
);

export default ActionSheetHeaderTitle;
