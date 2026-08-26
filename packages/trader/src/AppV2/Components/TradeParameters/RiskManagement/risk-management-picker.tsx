import React from 'react';

import { ActionSheet, SegmentedControlSingleChoice } from '@deriv-com/quill-ui';
import { Localize, useTranslations } from '@deriv-com/translations';

import DealCancellation from './deal-cancellation';
import RiskManagementInfo from './risk-management-info';
import TakeProfitAndStopLossContainer from './take-profit-and-stop-loss-container';

type TRiskManagementActions = { onSave: () => void; is_save_disabled: boolean };

type TRiskManagementPickerProps = {
    closeActionSheet: () => void;
    initial_tab_index?: number;
    should_show_deal_cancellation?: boolean;
};

// Header owner for the Risk management sheet. Both tabs (TP & SL / Deal cancellation) share the one
// ActionSheet.Header check: the active tab lifts its commit handler + state-backed dirty gate here,
// and the header wires the active tab's action. Dismissal (X / overlay / drag) never commits.
const RiskManagementPicker = ({
    closeActionSheet,
    initial_tab_index = 0,
    should_show_deal_cancellation,
}: TRiskManagementPickerProps) => {
    const { localize } = useTranslations();
    const [tab_index, setTabIndex] = React.useState(initial_tab_index);
    const [tp_sl_actions, setTPSLActions] = React.useState<TRiskManagementActions>();
    const [dc_actions, setDCActions] = React.useState<TRiskManagementActions>();

    const active_actions = tab_index ? dc_actions : tp_sl_actions;

    return (
        <React.Fragment>
            <ActionSheet.Header
                title={<Localize i18n_default_text='Risk management' />}
                closeAction={{ ariaLabel: localize('Close') }}
                saveAction={{ onAction: () => active_actions?.onSave(), ariaLabel: localize('Save') }}
                isSaveActionDisabled={active_actions?.is_save_disabled ?? true}
                shouldCloseOnSaveActionClick={false}
            />
            <ActionSheet.Content className='risk-management__picker'>
                <RiskManagementInfo />
                {should_show_deal_cancellation && (
                    <SegmentedControlSingleChoice
                        hasContainerWidth
                        onChange={setTabIndex}
                        options={[
                            { label: <Localize i18n_default_text='TP & SL' /> },
                            { label: <Localize i18n_default_text='Deal cancellation' /> },
                        ]}
                        size='sm'
                        selectedItemIndex={tab_index}
                    />
                )}
                {tab_index ? (
                    <DealCancellation closeActionSheet={closeActionSheet} onActionsChange={setDCActions} />
                ) : (
                    <TakeProfitAndStopLossContainer
                        closeActionSheet={closeActionSheet}
                        onActionsChange={setTPSLActions}
                    />
                )}
            </ActionSheet.Content>
        </React.Fragment>
    );
};

export default RiskManagementPicker;
