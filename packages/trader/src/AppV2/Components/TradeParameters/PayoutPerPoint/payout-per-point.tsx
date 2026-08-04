import React from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';

import { Skeleton } from '@deriv/components';
import { getCurrencyDisplayCode, isMobile } from '@deriv/shared';
import { ActionSheet, TextField } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

import Carousel from 'AppV2/Components/Carousel';
import CarouselHeader from 'AppV2/Components/Carousel/carousel-header';
import TradeParamDefinition from 'AppV2/Components/TradeParamDefinition';
import { isSmallScreen } from 'AppV2/Utils/trade-params-utils';
import { useTraderStore } from 'Stores/useTraderStores';

import { TTradeParametersProps } from '../trade-parameters';

import PayoutPerPointDesktop from './payout-per-point-desktop';
import PayoutPerPointWheel from './payout-per-point-wheel';

const PayoutPerPoint = observer(({ is_minimized }: TTradeParametersProps) => {
    const [is_open, setIsOpen] = React.useState(false);
    const [carousel_index, setCarouselIndex] = React.useState(0);
    const { barrier_1, currency, is_market_closed, payout_choices, payout_per_point, setPayoutPerPoint } =
        useTraderStore();
    const is_mobile = isMobile();
    const is_small_screen = isSmallScreen();
    const currency_display_code = getCurrencyDisplayCode(currency);
    const payout_per_point_list = [...payout_choices]
        .sort((a, b) => Number(a) - Number(b))
        .map((payout_per_point: string) => ({
            value: payout_per_point,
            label: `${payout_per_point} ${currency_display_code}`,
        }));

    const onClose = React.useCallback(() => {
        setIsOpen(false);
        setCarouselIndex(0);
    }, []);

    const action_sheet_content = [
        {
            id: 1,
            component: (
                <PayoutPerPointWheel
                    barrier={barrier_1}
                    current_payout_per_point={payout_per_point}
                    is_open={is_open}
                    onDetailClick={setCarouselIndex}
                    onPayoutPerPointSelect={
                        setPayoutPerPoint as React.ComponentProps<typeof PayoutPerPointWheel>['onPayoutPerPointSelect']
                    }
                    onClose={onClose}
                    payout_per_point_list={payout_per_point_list}
                />
            ),
        },
        {
            id: 2,
            component: (
                <TradeParamDefinition
                    description={
                        <Localize i18n_default_text='The amount you choose to receive at expiry for every point of change between the final price and the barrier.' />
                    }
                />
            ),
        },
        {
            id: 3,
            component: (
                <TradeParamDefinition
                    description={
                        <Localize i18n_default_text="This is the corresponding price level based on the payout per point you've selected. If this barrier is ever breached, your contract would be terminated." />
                    }
                />
            ),
        },
    ];
    const classname = clsx('trade-params__option', is_minimized && 'trade-params__option--minimized');

    if (!payout_per_point)
        return (
            <div className={classname}>
                <Skeleton />
            </div>
        );

    // Render desktop version with InputPopover for non-mobile devices
    if (!is_mobile) {
        return <PayoutPerPointDesktop is_minimized={is_minimized} />;
    }

    // Render mobile version with ActionSheet (unchanged)
    return (
        <React.Fragment>
            <TextField
                disabled={is_market_closed}
                className={classname}
                label={
                    <Localize
                        i18n_default_text='Payout per point'
                        key={`payout-per-point${is_minimized ? '-minimized' : ''}`}
                    />
                }
                onClick={() => setIsOpen(true)}
                readOnly
                variant='fill'
                value={`${payout_per_point} ${currency_display_code}`}
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
                        classname={clsx(
                            'payout-per-point__carousel',
                            is_small_screen && 'payout-per-point__carousel--small'
                        )}
                        header={CarouselHeader}
                        current_index={carousel_index}
                        setCurrentIndex={setCarouselIndex}
                        onPreviousButtonClick={() => setCarouselIndex(0)}
                        pages={action_sheet_content}
                        title={
                            // The barrier explanation is the 3rd page (index 2); title it accordingly.
                            carousel_index === 2 ? (
                                <Localize i18n_default_text='Barrier' />
                            ) : (
                                <Localize i18n_default_text='Payout per point' />
                            )
                        }
                    />
                </ActionSheet.Portal>
            </ActionSheet.Root>
        </React.Fragment>
    );
});

export default PayoutPerPoint;
