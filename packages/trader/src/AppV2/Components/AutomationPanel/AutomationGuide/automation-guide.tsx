import React from 'react';
import { observer } from 'mobx-react-lite';

import { ActionSheet, Heading, Modal } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

import { useAutomationStore } from 'Stores/useAutomationStore';
import { useTraderStore } from 'Stores/useTraderStores';

import {
    getAutomationStrategyInfo,
    getAutomationTradeTypeInfo,
    type TGuideStrategyInfo,
} from '../automation-guide-config';

import AutomationGuideContent from './automation-guide-content';
import AutomationGuideTrigger from './automation-guide-trigger';

import './automation-guide.scss';

const AutomationGuide = observer(() => {
    const { contract_type } = useTraderStore();
    const { available_strategies, config } = useAutomationStore();
    const { isMobile } = useDevice();

    const [is_open, setIsOpen] = React.useState(false);
    // Chip selection inside the modal is a *preview* — no store write. Reset
    // to the user's committed strategy each time the modal opens.
    const [browsing_strategy_id, setBrowsingStrategyId] = React.useState(config.strategy);

    React.useEffect(() => {
        if (is_open) setBrowsingStrategyId(config.strategy);
    }, [is_open, config.strategy]);

    const trade_type_info = getAutomationTradeTypeInfo(contract_type);
    if (!trade_type_info) return null;

    const visible_strategies = available_strategies
        .map(s => ({ id: s.strategy_id, info: getAutomationStrategyInfo(s.strategy_id) }))
        .filter((s): s is { id: string; info: TGuideStrategyInfo } => !!s.info);

    const onClose = () => setIsOpen(false);

    const content = (
        <AutomationGuideContent
            trade_type_info={trade_type_info}
            visible_strategies={visible_strategies}
            selected_strategy_id={browsing_strategy_id}
            onStrategyChipSelect={setBrowsingStrategyId}
        />
    );

    const modal_title = (
        <Localize i18n_default_text='Automate {{trade_type}}' values={{ trade_type: trade_type_info.title }} />
    );

    return (
        <>
            <AutomationGuideTrigger title={trade_type_info.title} onClick={() => setIsOpen(true)} />
            {isMobile ? (
                <ActionSheet.Root isOpen={is_open} onClose={onClose} expandable={false} position='left'>
                    <ActionSheet.Portal shouldCloseOnDrag>
                        <ActionSheet.Content className='automation-guide__sheet-content'>
                            <Heading.H4 className='automation-guide__title'>{modal_title}</Heading.H4>
                            {content}
                        </ActionSheet.Content>
                        <ActionSheet.Footer
                            alignment='vertical'
                            secondaryAction={{
                                content: <Localize i18n_default_text='Got it' />,
                                onAction: onClose,
                            }}
                        />
                    </ActionSheet.Portal>
                </ActionSheet.Root>
            ) : (
                <Modal
                    isOpened={is_open}
                    toggleModal={onClose}
                    primaryButtonLabel={<Localize i18n_default_text='Got it' />}
                    primaryButtonCallback={onClose}
                    buttonColor='coral'
                    showSecondaryButton={false}
                    showHandleBar={false}
                    isMobile={false}
                    className='automation-guide__modal'
                >
                    <div className='automation-guide__body'>
                        <Heading.H4 className='automation-guide__title'>{modal_title}</Heading.H4>
                        {content}
                    </div>
                </Modal>
            )}
        </>
    );
});

export default AutomationGuide;
