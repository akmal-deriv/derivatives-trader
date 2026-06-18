import React from 'react';

import { observer } from '@deriv/stores';
import { Tab } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

import { PositionsDrawerContent, PositionsDrawerFooter } from './positions-drawer-content';
import { PositionsDrawerClosedContent, PositionsDrawerClosedFooter } from './positions-drawer-closed-content';

import './positions-drawer.scss';

/**
 * PositionsDrawerTabs - Tabbed positions component for the desktop flyout.
 * Renders Open and Closed tabs with their respective content and footers.
 * The flyout header ("Positions" + close button) is handled by the parent Flyout component.
 */
const PositionsDrawerTabs = observer(() => {
    const [activeTab, setActiveTab] = React.useState(0);

    return (
        <div className='positions-drawer-tabs'>
            <div className='positions-drawer-tabs__tab-bar'>
                <Tab.Container
                    contentStyle='fill'
                    className='positions-drawer-tabs__tab-container'
                    size='md'
                    selectedTabIndex={activeTab}
                    onChangeTab={setActiveTab}
                >
                    <Tab.List>
                        <Tab.Trigger>
                            <Localize i18n_default_text='Open' />
                        </Tab.Trigger>
                        <Tab.Trigger>
                            <Localize i18n_default_text='Closed' />
                        </Tab.Trigger>
                    </Tab.List>
                </Tab.Container>
            </div>
            <div className='positions-drawer-tabs__body'>
                {activeTab === 0 ? <PositionsDrawerContent /> : <PositionsDrawerClosedContent />}
            </div>
            <div className='positions-drawer-tabs__footer'>
                {activeTab === 0 ? <PositionsDrawerFooter /> : <PositionsDrawerClosedFooter />}
            </div>
        </div>
    );
});

export default PositionsDrawerTabs;
