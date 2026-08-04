import React from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';

import { Skeleton } from '@deriv/components';
import { getCurrencyDisplayCode, isEmptyObject, isMobile, TRADE_TYPES } from '@deriv/shared';
import { ActionSheet, TextField } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

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
    const strike_price_list = strike_price_choices.map((strike_price: string) => ({ value: strike_price }));
    const payout_per_point: string | number = isEmptyObject(proposal_info)
        ? ''
        : proposal_info[contract_type.toUpperCase()]?.obj_contract_basis?.value;

    const handleStrikeChange = (new_value: number | string) =>
        onChange({ target: { name: 'barrier_1', value: new_value } });
    const onClose = React.useCallback(() => {
        setCarouselIndex(0);
        setIsOpen(false);
    }, []);

    const action_sheet_content = [
        {
            id: 1,
            component: (
                <StrikeWheel
                    current_strike={barrier_1}
                    currency={getCurrencyDisplayCode(currency)}
                    onStrikePriceSelect={handleStrikeChange}
                    payout_per_point={payout_per_point}
                    strike_price_list={strike_price_list}
                    setV2ParamsInitialValues={setV2ParamsInitialValues}
                    onDetailClick={setCarouselIndex}
                />
            ),
        },
        {
            id: 2,
            component: (
                <TradeParamDefinition
                    description={
                        contract_type === TRADE_TYPES.VANILLA.CALL ? (
                            <Localize i18n_default_text='If you buy a "Call" option, you receive a payout at expiry if the final price is above the strike price. Otherwise, your "Call" option will expire worthless.' />
                        ) : (
                            <Localize i18n_default_text='If you buy a "Put" option, you receive a payout at expiry if the final price is below the strike price. Otherwise, your "Put" option will expire worthless.' />
                        )
                    }
                />
            ),
        },
        {
            id: 3,
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
                <ActionSheet.Portal shouldCloseOnDrag>
                    <Carousel
                        classname={clsx('strike__carousel', is_small_screen && 'strike__carousel--small')}
                        header={CarouselHeader}
                        current_index={carousel_index}
                        setCurrentIndex={setCarouselIndex}
                        onPreviousButtonClick={() => setCarouselIndex(0)}
                        pages={action_sheet_content}
                        title={
                            // The payout-per-point explanation is the 3rd page (index 2).
                            carousel_index === 2 ? (
                                <Localize i18n_default_text='Payout per point' />
                            ) : (
                                <Localize i18n_default_text='Strike price' />
                            )
                        }
                    />
                </ActionSheet.Portal>
            </ActionSheet.Root>
        </React.Fragment>
    );
});

export default Strike;
