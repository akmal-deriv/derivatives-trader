import React from 'react';

import { StandaloneCopyRegularIcon } from '@deriv/quill-icons';
import { Text, useSnackbar } from '@deriv-com/quill-ui';
import { Localize, useTranslations } from '@deriv-com/translations';

import { ERROR_SNACKBAR_DURATION } from 'AppV2/Utils/layout-utils';

type TDisclosureQuoteProps = {
    disclaimer_text: string;
};

const DisclosureQuote = ({ disclaimer_text }: TDisclosureQuoteProps) => {
    const { localize } = useTranslations();
    const { addSnackbar } = useSnackbar();

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(disclaimer_text);
            addSnackbar({
                message: <Localize i18n_default_text='Copied to clipboard' />,
                status: 'neutral',
                hasCloseButton: false,
            });
        } catch {
            addSnackbar({
                message: <Localize i18n_default_text="Couldn't copy to clipboard" />,
                status: 'fail',
                hasCloseButton: true,
                delay: ERROR_SNACKBAR_DURATION,
            });
        }
    };

    return (
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
    );
};

export default DisclosureQuote;
