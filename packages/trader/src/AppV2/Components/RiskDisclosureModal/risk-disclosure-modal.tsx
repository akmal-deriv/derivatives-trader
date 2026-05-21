import React from 'react';

import { StandaloneCopyRegularIcon } from '@deriv/quill-icons';
import { Button, Modal, Text, TextArea, useSnackbar } from '@deriv-com/quill-ui';
import { Localize, useTranslations } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

import { useRiskDisclosure } from 'AppV2/Hooks/useRiskDisclosure';
import { normaliseDisclaimerText } from 'AppV2/Utils/risk-disclosure-constants';

import './risk-disclosure-modal.scss';

const RiskDisclosureModal = () => {
    const { isMobile } = useDevice();
    const { localize } = useTranslations();
    const { addSnackbar } = useSnackbar();
    const { is_open, is_loading, is_fully_accepted, error, close, accept } = useRiskDisclosure();

    const disclaimer_text = localize(
        'The products offered are difficult to understand. CNMV considers that, in general, it is not appropriate for retail investors.'
    );
    const regulator_notice = localize(
        'This notice is required by CNMV (Comision Nacional del Mercado de Valores), the Spanish securities regulator.'
    );

    const [typed_text, setTypedText] = React.useState('');

    React.useEffect(() => {
        if (!is_open) setTypedText('');
    }, [is_open]);

    React.useEffect(() => {
        if (error) {
            addSnackbar({
                message: <Localize i18n_default_text='Something went wrong. Please try again.' />,
                status: 'fail',
                hasCloseButton: true,
            });
        }
    }, [error, addSnackbar]);

    const can_agree =
        !is_fully_accepted && normaliseDisclaimerText(typed_text) === normaliseDisclaimerText(disclaimer_text);

    const handleCopy = React.useCallback(async () => {
        try {
            await navigator.clipboard.writeText(disclaimer_text);
            addSnackbar({
                message: <Localize i18n_default_text='Copied to clipboard' />,
                hasCloseButton: false,
            });
        } catch {
            addSnackbar({
                message: <Localize i18n_default_text="Couldn't copy to clipboard" />,
                status: 'fail',
                hasCloseButton: true,
            });
        }
    }, [disclaimer_text, addSnackbar]);

    const handleAgree = React.useCallback(() => {
        if (!can_agree || is_loading) return;
        accept();
    }, [can_agree, is_loading, accept]);

    return (
        <Modal
            isOpened={is_open}
            isMobile={isMobile}
            showHandleBar={isMobile}
            showCrossIcon={!isMobile}
            showPrimaryButton={false}
            showSecondaryButton={false}
            hasFooter={false}
            toggleModal={close}
            className='risk-disclosure-modal'
        >
            <Modal.Header title={<Localize i18n_default_text='Risk disclosure' />} />
            <Modal.Body className='risk-disclosure-modal__body'>
                <div className='risk-disclosure-modal__quote'>
                    <Text size='sm' as='p' className='risk-disclosure-modal__quote-text'>
                        {disclaimer_text}
                    </Text>
                    <button
                        type='button'
                        className='risk-disclosure-modal__copy'
                        aria-label={localize('Copy disclaimer')}
                        onClick={handleCopy}
                    >
                        <StandaloneCopyRegularIcon fill='var(--component-field-label-color-default)' iconSize='sm' />
                    </button>
                </div>

                {!is_fully_accepted && (
                    <>
                        <Text size='sm' as='p' className='risk-disclosure-modal__instruction'>
                            <Localize i18n_default_text='To continue, type the message below:' />
                        </Text>
                        <TextArea
                            value={typed_text}
                            onChange={e => setTypedText(e.target.value)}
                            placeholder={disclaimer_text}
                            size='sm'
                            status='neutral'
                            resizable={false}
                            show_counter={false}
                            rows={3}
                            wrapperClassName='risk-disclosure-modal__textarea'
                        />
                    </>
                )}

                <div className='risk-disclosure-modal__actions'>
                    {is_fully_accepted ? (
                        <Button
                            variant='secondary'
                            color='black-white'
                            size='lg'
                            fullWidth
                            label={localize('Close')}
                            onClick={close}
                        />
                    ) : (
                        <>
                            <Button
                                variant='primary'
                                color='coral'
                                size='lg'
                                fullWidth
                                label={localize('Agree')}
                                disabled={!can_agree || is_loading}
                                isLoading={is_loading}
                                onClick={handleAgree}
                            />
                            <Button
                                variant='secondary'
                                color='black-white'
                                size='lg'
                                fullWidth
                                label={localize('Cancel')}
                                onClick={close}
                            />
                        </>
                    )}
                </div>

                <Text size='sm' as='p' className='risk-disclosure-modal__notice'>
                    {regulator_notice}
                </Text>
            </Modal.Body>
        </Modal>
    );
};

export default RiskDisclosureModal;
