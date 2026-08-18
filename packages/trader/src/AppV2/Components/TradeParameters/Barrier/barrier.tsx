import React, { useMemo } from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';

import { isTurbosContract, mapErrorMessage } from '@deriv/shared';
import { ActionSheet, TextField, useSnackbar } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

import Carousel from 'AppV2/Components/Carousel';
import CarouselHeader from 'AppV2/Components/Carousel/carousel-header';
import { ERROR_SNACKBAR_DURATION } from 'AppV2/Utils/layout-utils';
import { useTraderStore } from 'Stores/useTraderStores';

import { TTradeParametersProps } from '../trade-parameters';

import BarrierDescription from './barrier-description';
import BarrierDesktop from './barrier-desktop';
import BarrierInput from './barrier-input';

const Barrier = observer(({ is_minimized }: TTradeParametersProps) => {
    const trade_store = useTraderStore();
    const { barrier_1, contract_type, is_market_closed, validation_errors, proposal_info, trade_type_tab, symbol } =
        trade_store;
    const is_turbos = isTurbosContract(contract_type);
    const { isMobile } = useDevice();
    const [is_open, setIsOpen] = React.useState(false);
    // Same per-expiry-type support that drives BarrierInput/BarrierDesktop, so the description
    // page always matches the options the input actually offers.
    const barrierSupport = trade_store.getSymbolBarrierSupport(symbol);

    const has_error =
        (validation_errors.barrier_1?.length ?? 0) > 0 ||
        (proposal_info?.[trade_type_tab]?.has_error && proposal_info?.[trade_type_tab]?.error_field === 'barrier');

    const { addSnackbar } = useSnackbar();
    const [barrier_error_shown, setBarrierErrorShown] = React.useState(false);

    const onClose = React.useCallback(() => {
        setIsOpen(false);
    }, []);

    // Show error snackbar when there's a barrier error
    React.useEffect(() => {
        const proposal_error = proposal_info?.[trade_type_tab];
        const has_error = proposal_error?.has_error;
        const error_field = proposal_error?.error_field;

        if (has_error && error_field === 'barrier' && !barrier_error_shown && !is_open && !is_minimized) {
            addSnackbar({
                message: mapErrorMessage(proposal_error),
                hasCloseButton: true,
                status: 'fail',
                delay: ERROR_SNACKBAR_DURATION,
                style: { marginBottom: '48px' },
            });
            setBarrierErrorShown(true);
        }
    }, [proposal_info, barrier_error_shown, is_open, is_minimized, trade_type_tab, addSnackbar]);

    // Reset error shown flag when modal opens
    React.useEffect(() => {
        if (is_open) {
            setBarrierErrorShown(false);
        }
    }, [is_open]);

    const barrier_carousel_pages = useMemo(
        () => [
            {
                id: 1,
                component: <BarrierInput onClose={onClose} is_open={is_open} />,
            },
            {
                id: 2,
                component: <BarrierDescription barrierSupport={barrierSupport} is_turbos={is_turbos} />,
            },
        ],
        [barrierSupport, is_turbos, onClose, is_open]
    );

    if (!isMobile) {
        return <BarrierDesktop is_minimized={is_minimized} />;
    }

    return (
        <>
            <TextField
                className={clsx('trade-params__option', is_minimized && 'trade-params__option--minimized')}
                disabled={is_market_closed}
                variant='fill'
                readOnly
                noStatusIcon
                label={<Localize i18n_default_text='Barrier' key={`barrier${is_minimized ? '-minimized' : ''}`} />}
                value={barrier_1}
                onClick={() => setIsOpen(true)}
                status={has_error && !is_open ? 'error' : undefined}
            />
            <ActionSheet.Root
                isOpen={is_open}
                onClose={onClose}
                position='left'
                expandable={false}
                shouldBlurOnClose={is_open}
            >
                <ActionSheet.Portal shouldCloseOnDrag>
                    <Carousel
                        header={CarouselHeader}
                        title={<Localize i18n_default_text='Barrier' />}
                        pages={barrier_carousel_pages}
                    />
                </ActionSheet.Portal>
            </ActionSheet.Root>
        </>
    );
});

export default Barrier;
