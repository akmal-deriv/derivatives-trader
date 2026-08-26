import { observer } from 'mobx-react-lite';

import { SegmentedControlSingleChoice, Tooltip } from '@deriv-com/quill-ui';
import { useTranslations } from '@deriv-com/translations';

import { TRADE_PANEL_TABS } from 'AppV2/Components/AutomationPanel/automation-config';
import IcAutomationTrading from 'Assets/SvgComponents/settings/ic-automation-trading.svg';
import IcManualTrading from 'Assets/SvgComponents/settings/ic-manual-trading.svg';
import { useTraderStore } from 'Stores/useTraderStores';

import './trade-panel-tabs.scss';

const TradePanelTabs = observer(() => {
    const { localize } = useTranslations();
    const { is_automation_tab, setActiveTradePanelTab } = useTraderStore();

    const tab_index = is_automation_tab ? 1 : 0;

    const handleTabChange = (selected_index: number) => {
        setActiveTradePanelTab(selected_index === 0 ? TRADE_PANEL_TABS.TRADE : TRADE_PANEL_TABS.AUTOMATION);
    };

    return (
        <div className='trade-panel-tabs'>
            <SegmentedControlSingleChoice
                className='trade-panel-tabs__toggle'
                onChange={handleTabChange}
                options={[
                    {
                        icon: (
                            <Tooltip
                                as='div'
                                className='trade-panel-tabs__tooltip'
                                tooltipContent={localize('Manual trading')}
                                tooltipPosition='left'
                            >
                                <IcManualTrading width={14} height={14} />
                            </Tooltip>
                        ),
                    },
                    {
                        icon: (
                            <Tooltip
                                as='div'
                                className='trade-panel-tabs__tooltip'
                                tooltipContent={localize('Automated trading')}
                                tooltipPosition='left'
                            >
                                <IcAutomationTrading width={20} height={16} />
                            </Tooltip>
                        ),
                    },
                ]}
                selectedItemIndex={tab_index}
                size='sm'
            />
        </div>
    );
});

export default TradePanelTabs;
