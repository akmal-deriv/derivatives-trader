import React from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';

import { Skeleton } from '@deriv/components';
import { getCurrencyDisplayCode, isMobile } from '@deriv/shared';
import { ActionSheet, TextField } from '@deriv-com/quill-ui';
import { Localize, useTranslations } from '@deriv-com/translations';

import { ActionSheetHeaderTitle } from 'AppV2/Components/ActionSheetHeaderTooltip';
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
    const { localize } = useTranslations();
    const is_mobile = isMobile();
    const is_small_screen = isSmallScreen();
    const currency_display_code = getCurrencyDisplayCode(currency);
    // Draft kept in state (not a ref) so the header check reacts to wheel changes.
    const [value, setValue] = React.useState<string | number>(payout_per_point);
    // Guards saving before the barrier proposal response arrives (shared with the wheel).
    const is_api_response_received_ref = React.useRef(false);
    // Memoised: a new array identity makes quill's wheel reset its list, re-centre itself and write a
    // value back to the parent — mid-scroll that fights the user and can commit a stale value.
    const payout_per_point_list = React.useMemo(
        () =>
            [...payout_choices]
                .sort((a, b) => Number(a) - Number(b))
                .map((payout_per_point: string) => ({
                    value: payout_per_point,
                    label: `${payout_per_point} ${currency_display_code}`,
                })),
        [payout_choices, currency_display_code]
    );

    const onClose = React.useCallback(() => {
        setIsOpen(false);
        setCarouselIndex(0);
    }, []);

    // Re-initialise the draft from the committed value on open — this is what makes dismiss = discard.
    React.useEffect(() => {
        if (is_open) {
            setValue(payout_per_point);
            is_api_response_received_ref.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [is_open]);

    const handleSave = () => {
        // Prevent from saving if user clicks before BE validation
        if (!is_api_response_received_ref.current) return;
        setPayoutPerPoint(String(value));
        onClose();
    };

    const is_save_disabled = String(value) === String(payout_per_point);

    const action_sheet_content = [
        {
            id: 1,
            component: (
                <PayoutPerPointWheel
                    barrier={barrier_1}
                    is_open={is_open}
                    is_api_response_received_ref={is_api_response_received_ref}
                    onDetailClick={setCarouselIndex}
                    value={value}
                    setValue={setValue}
                    payout_per_point_list={payout_per_point_list}
                />
            ),
        },
        {
            id: 2,
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

    // Render mobile version with ActionSheet
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
                <ActionSheet.Portal showHandlebar={false} shouldDetectSwipingOnContainer shouldCloseOnDrag>
                    {carousel_index === 0 ? (
                        // Picker page: header owns the close/save actions and the description tooltip.
                        <ActionSheet.Header
                            title={
                                <ActionSheetHeaderTitle
                                    title={<Localize i18n_default_text='Payout per point' />}
                                    description={
                                        <Localize i18n_default_text='The amount you choose to receive at expiry for every point of change between the final price and the barrier.' />
                                    }
                                    label={localize('Payout per point')}
                                />
                            }
                            closeAction={{ ariaLabel: localize('Close') }}
                            saveAction={{ onAction: handleSave, ariaLabel: localize('Save') }}
                            isSaveActionDisabled={is_save_disabled}
                            shouldCloseOnSaveActionClick={false}
                        />
                    ) : (
                        // Barrier content-row detail page: plain title + back arrow, no save/close actions.
                        <CarouselHeader
                            current_index={carousel_index}
                            onNextClick={() => setCarouselIndex(0)}
                            onPrevClick={() => setCarouselIndex(0)}
                            title={<Localize i18n_default_text='Barrier' />}
                        />
                    )}
                    <Carousel
                        classname={clsx(
                            'payout-per-point__carousel',
                            is_small_screen && 'payout-per-point__carousel--small'
                        )}
                        current_index={carousel_index}
                        setCurrentIndex={setCarouselIndex}
                        onPreviousButtonClick={() => setCarouselIndex(0)}
                        pages={action_sheet_content}
                    />
                </ActionSheet.Portal>
            </ActionSheet.Root>
        </React.Fragment>
    );
});

export default PayoutPerPoint;
