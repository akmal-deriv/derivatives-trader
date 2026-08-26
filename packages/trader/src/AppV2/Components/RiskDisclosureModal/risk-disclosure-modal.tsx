import React from 'react';

import { Button, Modal, Text } from '@deriv-com/quill-ui';
import { Localize, useTranslations } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

import DisclosureForm from './risk-disclosure-form';
import DisclosureQuote from './risk-disclosure-quote';

import './risk-disclosure-modal.scss';

type TRiskDisclosureModalProps = {
    is_open: boolean;
    is_loading: boolean;
    is_fully_accepted: boolean;
    error: Error | null;
    onClose: () => void;
    onAccept: () => Promise<void>;
};

const RiskDisclosureModal = ({
    is_open,
    is_loading,
    is_fully_accepted,
    error,
    onClose,
    onAccept,
}: TRiskDisclosureModalProps) => {
    const { isMobile } = useDevice();
    const { localize } = useTranslations();

    const disclaimer_text = localize(
        'The products offered are difficult to understand. CNMV considers that, in general, it is not appropriate for retail investors.'
    );
    const regulator_notice = localize(
        'This notice is required by CNMV (Comision Nacional del Mercado de Valores), the Spanish securities regulator.'
    );

    return (
        <Modal
            isOpened={is_open}
            isMobile={isMobile}
            showHandleBar={isMobile}
            showCrossIcon={!isMobile}
            showPrimaryButton={false}
            showSecondaryButton={false}
            hasFooter={false}
            shouldCloseModalOnSwipeDown
            toggleModal={onClose}
            className='risk-disclosure-modal'
        >
            <Modal.Header title={<Localize i18n_default_text='Risk disclosure' />} />
            <Modal.Body className='risk-disclosure-modal__body'>
                <DisclosureQuote disclaimer_text={disclaimer_text} />
                {is_fully_accepted ? (
                    <div className='risk-disclosure-modal__actions'>
                        <Button
                            variant='secondary'
                            color='black-white'
                            size='lg'
                            fullWidth
                            label={localize('Close')}
                            onClick={onClose}
                        />
                    </div>
                ) : (
                    <DisclosureForm
                        disclaimer_text={disclaimer_text}
                        is_loading={is_loading}
                        error={error}
                        onAccept={onAccept}
                        onClose={onClose}
                    />
                )}
                <Text size='sm' as='p' className='risk-disclosure-modal__notice'>
                    {regulator_notice}
                </Text>
            </Modal.Body>
        </Modal>
    );
};

export default React.memo(RiskDisclosureModal);
