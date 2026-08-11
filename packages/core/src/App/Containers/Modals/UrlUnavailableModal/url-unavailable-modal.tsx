import React from 'react';

import { observer, useStore } from '@deriv/stores';
import { ActionSheet, Modal, Text } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';
import './url-unavailable-modal.scss';

const UrlUnavailableModal = observer(() => {
    const { ui } = useStore();
    const { isUrlUnavailableModalVisible, toggleUrlUnavailableModal, is_mobile, urlUnavailableModalReason } = ui;

    const onClose = () => toggleUrlUnavailableModal(false);

    if (!isUrlUnavailableModalVisible) return null;

    // The modal is shared between an invalid trade type and an invalid symbol/market in the URL, and
    // covers the link where both are invalid. Tailor the copy to whichever value(s) were actually
    // invalid so the title and the fallback match what the app already did (reset to the default
    // trade type, the default market, or both).
    const copy_by_reason = {
        trade_type: {
            title: <Localize i18n_default_text='Unsupported trade type' />,
            message: (
                <Localize i18n_default_text='The trade type in this link is unavailable. You can continue with the default trade type instead.' />
            ),
        },
        symbol: {
            title: <Localize i18n_default_text='Unsupported market' />,
            message: (
                <Localize i18n_default_text='The market in this link is unavailable. You can continue with the default market instead.' />
            ),
        },
        both: {
            title: <Localize i18n_default_text='Unsupported link' />,
            message: (
                <Localize i18n_default_text='The trade type and market in this link are unavailable. You can continue with the default trade type and market instead.' />
            ),
        },
    } as const;
    const sharedContent = {
        ...(copy_by_reason[urlUnavailableModalReason] ?? copy_by_reason.trade_type),
        buttonText: <Localize i18n_default_text='Got it' />,
    };

    // Mobile Action Sheet
    if (is_mobile) {
        return (
            <ActionSheet.Root
                className='url-unavailable-modal'
                isOpen={isUrlUnavailableModalVisible}
                onClose={onClose}
                expandable={false}
                position='left'
            >
                <ActionSheet.Portal showHandlebar shouldCloseOnDrag>
                    <ActionSheet.Content>
                        <Text className='url-unavailable-modal__title' size='lg' bold>
                            {sharedContent.title}
                        </Text>
                        <Text className='url-unavailable-modal__desc' size='sm'>
                            {sharedContent.message}
                        </Text>
                    </ActionSheet.Content>
                    <ActionSheet.Footer
                        alignment='vertical'
                        primaryButtonColor='coral'
                        primaryAction={{
                            content: sharedContent.buttonText,
                            onAction: onClose,
                        }}
                    />
                </ActionSheet.Portal>
            </ActionSheet.Root>
        );
    }

    // Desktop Modal
    // The design has no close (X) button, so opt out of quill-ui's default one (showCrossIcon
    // defaults to true). "Got it" stays the dismissal affordance: shouldCloseOnPrimaryButtonClick
    // routes it through toggleModal, which is still needed here (it also backs the overlay click).
    return (
        <Modal
            className='url-unavailable-modal'
            isOpened={isUrlUnavailableModalVisible}
            toggleModal={onClose}
            showCrossIcon={false}
            primaryButtonLabel={sharedContent.buttonText}
            shouldCloseOnPrimaryButtonClick
            buttonColor='coral'
        >
            <Modal.Header title={sharedContent.title} />
            <Modal.Body>
                <Text className='url-unavailable-modal__desc' size='sm'>
                    {sharedContent.message}
                </Text>
            </Modal.Body>
        </Modal>
    );
});

export default UrlUnavailableModal;
