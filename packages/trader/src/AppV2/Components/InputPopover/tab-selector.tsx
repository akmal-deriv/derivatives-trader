import React from 'react';

import { SegmentedControlSingleChoice } from '@deriv-com/quill-ui';
import { localize } from '@deriv-com/translations';

type TTabSelectorProps = {
    activeTab: 'chips' | 'input';
    onTabChange: (tab: 'chips' | 'input') => void;
};

export const TabSelector: React.FC<TTabSelectorProps> = ({ activeTab, onTabChange }) => {
    const bold_style = { fontWeight: 'var(--core-fontWeight-bold)' };
    const tab_options = [
        {
            label: <span style={activeTab === 'chips' ? bold_style : undefined}>{localize('Quick picks')}</span>,
            value: 'chips',
        },
        {
            label: <span style={activeTab === 'input' ? bold_style : undefined}>{localize('Custom')}</span>,
            value: 'input',
        },
    ];

    const handleTabChange = (index: number) => {
        onTabChange(index === 0 ? 'chips' : 'input');
    };

    return (
        <SegmentedControlSingleChoice
            hasContainerWidth
            onChange={handleTabChange}
            options={tab_options}
            selectedItemIndex={activeTab === 'chips' ? 0 : 1}
            size='sm'
        />
    );
};
