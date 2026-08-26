import { Localize } from '@deriv-com/translations';

const BarrierDescription = ({
    barrierSupport,
    is_turbos,
}: {
    barrierSupport: 'relative' | 'absolute';
    is_turbos?: boolean;
}) => {
    if (is_turbos) {
        return (
            <Localize i18n_default_text="This is the corresponding price level based on the payout per point you've selected. If this barrier is ever breached, your contract would be terminated." />
        );
    }

    if (barrierSupport === 'absolute') {
        return (
            <>
                <strong>
                    <Localize i18n_default_text='Fixed barrier:' />
                </strong>{' '}
                <Localize i18n_default_text='Barrier set at specific price.' />
            </>
        );
    }

    return (
        <>
            <strong>
                <Localize i18n_default_text='Above spot:' />
            </strong>{' '}
            <Localize i18n_default_text='Barrier set above spot price.' />
            <br />
            <strong>
                <Localize i18n_default_text='Below spot:' />
            </strong>{' '}
            <Localize i18n_default_text='Barrier set below spot price.' />
        </>
    );
};

export default BarrierDescription;
