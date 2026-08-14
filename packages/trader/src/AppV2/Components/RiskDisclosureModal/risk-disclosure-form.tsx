import React from 'react';

import { Button, Text, TextArea, useSnackbar } from '@deriv-com/quill-ui';
import { Localize, useTranslations } from '@deriv-com/translations';

import { ERROR_SNACKBAR_DURATION } from 'AppV2/Utils/layout-utils';
import { normaliseDisclaimerText } from 'AppV2/Utils/risk-disclosure-constants';

type TDisclosureFormProps = {
    disclaimer_text: string;
    is_loading: boolean;
    error: Error | null;
    onAccept: () => Promise<void>;
    onClose: () => void;
};

const DisclosureForm = ({ disclaimer_text, is_loading, error, onAccept, onClose }: TDisclosureFormProps) => {
    const { localize } = useTranslations();
    const { addSnackbar } = useSnackbar();
    const [typed_text, setTypedText] = React.useState('');

    const addSnackbarRef = React.useRef(addSnackbar);
    addSnackbarRef.current = addSnackbar;

    React.useEffect(() => {
        if (error) {
            addSnackbarRef.current({
                message: <Localize i18n_default_text='Something went wrong. Please try again.' />,
                status: 'fail',
                hasCloseButton: true,
                delay: ERROR_SNACKBAR_DURATION,
            });
        }
    }, [error]);

    const can_agree = normaliseDisclaimerText(typed_text) === normaliseDisclaimerText(disclaimer_text);

    const handleAgree = () => {
        if (!can_agree || is_loading) return;
        onAccept();
    };

    return (
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
            <div className='risk-disclosure-modal__actions'>
                <Button
                    variant='primary'
                    color='coral'
                    size='lg'
                    fullWidth
                    label={localize('Continue')}
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
                    onClick={onClose}
                />
            </div>
        </>
    );
};

export default DisclosureForm;
