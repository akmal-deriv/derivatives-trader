import React from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';

import { Skeleton } from '@deriv/components';
import { getCurrencyDisplayCode, isEmptyObject, isMobile, TRADE_TYPES } from '@deriv/shared';
import { ActionSheet, TextField } from '@deriv-com/quill-ui';
import { Localize, useTranslations } from '@deriv-com/translations';

import { ActionSheetHeaderTitle } from 'AppV2/Components/ActionSheetHeaderTooltip';
import Carousel from 'AppV2/Components/Carousel';
import CarouselHeader from 'AppV2/Components/Carousel/carousel-header';
import TradeParamDefinition from 'AppV2/Components/TradeParamDefinition';
import { isSmallScreen } from 'AppV2/Utils/trade-params-utils';
import { useTraderStore } from 'Stores/useTraderStores';

import { TTradeParametersProps } from '../trade-parameters';

import StrikeDesktop from './strike-desktop';
import StrikeWheel from './strike-wheel';

const Strike = observer(({ is_minimized }: TTradeParametersProps) => {
    const [is_open, setIsOpen] = React.useState(false);
    const [carousel_index, setCarouselIndex] = React.useState(0);
    const {
        barrier_1,
        barrier_choices: strike_price_choices,
        contract_type,
        currency,
        is_market_closed,
        onChange,
        proposal_info,
        setV2ParamsInitialValues,
        v2_params_initial_values,
    } = useTraderStore();

    const is_small_screen = isSmallScreen();
    // Memoised: a new array identity makes quill's wheel reset its list, re-centre itself and write a
    // value back to the parent — mid-scroll that fights the user and can commit a stale value.
    const strike_price_list = React.useMemo(
        () => strike_price_choices.map((strike_price: string) => ({ value: strike_price })),
        [strike_price_choices]
    );
    const payout_per_point: string | number = isEmptyObject(proposal_info)
        ? ''
        : proposal_info[contract_type.toUpperCase()]?.obj_contract_basis?.value;

    const { localize } = useTranslations();

    const handleStrikeChange = (new_value: number | string) =>
        onChange({ target: { name: 'barrier_1', value: new_value } });
    const onClose = React.useCallback(() => {
        setCarouselIndex(0);
        setIsOpen(false);
    }, []);

    // Drafted strike lives here (not in the wheel) so the header check can react to it. The wheel also
    // commits live, so dirtiness is measured against the value the sheet opened with, not the store.
    const [selected_strike, setSelectedStrike] = React.useState<string | number>(barrier_1);
    const initial_strike_ref = React.useRef<string | number>();
    const selected_strike_ref = React.useRef(selected_strike);
    selected_strike_ref.current = selected_strike;

    React.useEffect(() => {
        if (is_open) {
            setSelectedStrike(barrier_1);
            initial_strike_ref.current = barrier_1;
            setV2ParamsInitialValues({ value: barrier_1, name: 'strike' });
        }
        return () => {
            // Dismiss discards: put the opening value back if the wheel already committed a different one.
            if (initial_strike_ref.current && initial_strike_ref.current !== selected_strike_ref.current) {
                handleStrikeChange(initial_strike_ref.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [is_open]);

    const handleSave = () => {
        initial_strike_ref.current = selected_strike;
        handleStrikeChange(selected_strike);
        setV2ParamsInitialValues({ value: selected_strike, name: 'strike' });
        onClose();
    };

    const is_save_disabled = selected_strike === (initial_strike_ref.current ?? barrier_1);

    const strike_description =
        contract_type === TRADE_TYPES.VANILLA.CALL ? (
            <Localize i18n_default_text='If you buy a "Call" option, you receive a payout at expiry if the final price is above the strike price. Otherwise, your "Call" option will expire worthless.' />
        ) : (
            <Localize i18n_default_text='If you buy a "Put" option, you receive a payout at expiry if the final price is below the strike price. Otherwise, your "Put" option will expire worthless.' />
        );

    const action_sheet_content = [
        {
            id: 1,
            component: (
                <StrikeWheel
                    currency={getCurrencyDisplayCode(currency)}
                    onStrikePriceSelect={handleStrikeChange}
                    payout_per_point={payout_per_point}
                    strike_price_list={strike_price_list}
                    value={selected_strike}
                    setValue={setSelectedStrike}
                    onDetailClick={setCarouselIndex}
                />
            ),
        },
        {
            id: 2,
            component: (
                <TradeParamDefinition
                    description={
                        <Localize i18n_default_text="The money you earn or lose for every one-point change in an asset's price." />
                    }
                />
            ),
        },
    ];
    const classname = clsx('trade-params__option', is_minimized && 'trade-params__option--minimized');

    React.useEffect(() => {
        const initial_strike = v2_params_initial_values?.strike;
        if (initial_strike && barrier_1 !== initial_strike) {
            handleStrikeChange(initial_strike);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!barrier_1)
        return (
            <div className={classname}>
                <Skeleton />
            </div>
        );

    if (!isMobile()) {
        return <StrikeDesktop is_minimized={is_minimized} />;
    }

    return (
        <React.Fragment>
            <TextField
                className={classname}
                disabled={is_market_closed}
                label={<Localize i18n_default_text='Strike price' key={`strike${is_minimized ? '-minimized' : ''}`} />}
                onClick={() => setIsOpen(true)}
                readOnly
                variant='fill'
                value={barrier_1}
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
                        // Picker page: header owns the close/save actions and the definition tooltip.
                        <ActionSheet.Header
                            title={
                                <ActionSheetHeaderTitle
                                    title={<Localize i18n_default_text='Strike price' />}
                                    description={strike_description}
                                    label={localize('Strike price')}
                                />
                            }
                            closeAction={{ ariaLabel: localize('Close') }}
                            saveAction={{ onAction: handleSave, ariaLabel: localize('Save') }}
                            isSaveActionDisabled={is_save_disabled}
                            shouldCloseOnSaveActionClick={false}
                        />
                    ) : (
                        // Payout-per-point detail page: plain title + back arrow, no save/close actions.
                        <CarouselHeader
                            current_index={carousel_index}
                            onNextClick={() => setCarouselIndex(0)}
                            onPrevClick={() => setCarouselIndex(0)}
                            title={<Localize i18n_default_text='Payout per point' />}
                        />
                    )}
                    <Carousel
                        classname={clsx('strike__carousel', is_small_screen && 'strike__carousel--small')}
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

export default Strike;
