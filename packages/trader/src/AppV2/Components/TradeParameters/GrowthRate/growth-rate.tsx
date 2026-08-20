import React from 'react';
import clsx from 'clsx';
import debounce from 'lodash.debounce';
import { observer } from 'mobx-react-lite';

import { Skeleton } from '@deriv/components';
import { CONTRACT_TYPES, getGrowthRatePercentage, isEmptyObject, isMobile } from '@deriv/shared';
import { ActionSheet, TextField } from '@deriv-com/quill-ui';
import { Localize, useTranslations } from '@deriv-com/translations';

import { ActionSheetHeaderTitle } from 'AppV2/Components/ActionSheetHeaderTooltip';
import Carousel from 'AppV2/Components/Carousel';
import CarouselHeader from 'AppV2/Components/Carousel/carousel-header';
import TradeParamDefinition from 'AppV2/Components/TradeParamDefinition';
import { isSmallScreen } from 'AppV2/Utils/trade-params-utils';
import { useTraderStore } from 'Stores/useTraderStores';

import { AutomationLockOverlay } from '../Shared';
import { TTradeParametersProps } from '../trade-parameters';

import GrowthRateDesktop from './growth-rate-desktop';
import GrowthRatePicker from './growth-rate-picker';

// Carousel page indices after dropping the sheet-level definition page (now a title tooltip):
// only the content-row detail pages remain.
const BARRIER_PAGE = 1;
const MAX_DURATION_PAGE = 2;

const debouncedSetGrowthRate = debounce((setGrowthRate, growth_rate) => {
    setGrowthRate(growth_rate);
}, 200);

const GrowthRate = observer(({ is_minimized }: TTradeParametersProps) => {
    const {
        accumulator_range_list,
        growth_rate,
        is_purchase_enabled,
        is_trade_enabled,
        is_market_closed,
        is_automation_params_locked,
        has_open_accu_contract,
        maximum_ticks,
        onChange,
        proposal_info,
        setV2ParamsInitialValues,
        tick_size_barrier_percentage,
        v2_params_initial_values,
    } = useTraderStore();
    const { localize } = useTranslations();

    const [is_open, setIsOpen] = React.useState(false);
    const [carousel_index, setCarouselIndex] = React.useState(0);
    // Draft kept in state (not a ref) so the header check reacts to wheel changes.
    const [selected_growth_rate, setSelectedGrowthRate] = React.useState(growth_rate);
    // Mirror of the draft for the unmount/close cleanup, which would otherwise close over a stale value.
    const selected_growth_rate_ref = React.useRef(selected_growth_rate);
    selected_growth_rate_ref.current = selected_growth_rate;
    // Baseline the sheet reverts to on dismiss (discard); updated only on save.
    const initial_growth_rate = React.useRef<number>();
    const is_mobile = isMobile();
    const is_small_screen = isSmallScreen();
    const info = proposal_info?.[CONTRACT_TYPES.ACCUMULATOR] || {};
    const is_proposal_data_available =
        is_trade_enabled && !isEmptyObject(proposal_info) && !!info.id && is_purchase_enabled;
    const classname = clsx('trade-params__option', is_minimized && 'trade-params__option--minimized');

    const handleGrowthRateChange = (rate: number) => {
        onChange({ target: { name: 'growth_rate', value: rate } });
    };

    // The wheel commits live to the store (so barrier/max-duration proposal values refresh) and mirrors
    // the value into the reactive draft that drives the header check.
    const handleWheelChange = (new_value: number) => {
        if (new_value === selected_growth_rate) return;
        setSelectedGrowthRate(new_value);
        debouncedSetGrowthRate(handleGrowthRateChange, new_value);
    };

    const onActionSheetClose = React.useCallback(() => {
        setIsOpen(false);
        setCarouselIndex(0);
    }, []);

    // Re-initialise the draft from the committed value on open — this is what makes dismiss = discard.
    React.useEffect(() => {
        if (is_open) {
            setSelectedGrowthRate(growth_rate);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [is_open]);

    // Track the baseline the sheet opened with; revert to it on dismiss (unless saved).
    React.useEffect(() => {
        if (is_open && growth_rate) {
            initial_growth_rate.current = growth_rate;
            setV2ParamsInitialValues({ value: growth_rate, name: 'growth_rate' });
        }
        return () => {
            if (initial_growth_rate.current && initial_growth_rate.current !== selected_growth_rate_ref.current) {
                handleGrowthRateChange(initial_growth_rate.current);
            }
            debouncedSetGrowthRate.cancel();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [is_open]);

    const handleSave = () => {
        debouncedSetGrowthRate.cancel();
        initial_growth_rate.current = selected_growth_rate;
        handleGrowthRateChange(selected_growth_rate);
        setV2ParamsInitialValues({ value: selected_growth_rate, name: 'growth_rate' });
        onActionSheetClose();
    };

    // Dirty against the rate the sheet opened with, not the live store value: the wheel commits to the
    // store as it moves (so the barrier / max duration rows refresh), which would otherwise make the
    // draft equal the store again and grey the check out moments after each change. Falls back to the
    // store for the first render, before the on-open effect has recorded the baseline.
    const is_save_disabled = selected_growth_rate === (initial_growth_rate.current ?? growth_rate);

    const action_sheet_content = [
        {
            id: 1,
            component: (
                <GrowthRatePicker
                    accumulator_range_list={accumulator_range_list}
                    maximum_ticks={maximum_ticks}
                    selected_growth_rate={selected_growth_rate}
                    onDetailClick={setCarouselIndex}
                    onWheelChange={handleWheelChange}
                    should_show_details={is_proposal_data_available}
                    tick_size_barrier_percentage={tick_size_barrier_percentage}
                />
            ),
        },
        {
            id: 2,
            component: (
                <TradeParamDefinition
                    description={
                        <Localize i18n_default_text='The price range within which the spot price must remain at each tick for your payout to keep growing. If the price moves outside this range, your contract is terminated.' />
                    }
                />
            ),
        },
        {
            id: 3,
            component: (
                <TradeParamDefinition
                    description={
                        <Localize i18n_default_text='Your contract will be automatically closed upon reaching this number of ticks.' />
                    }
                />
            ),
        },
    ];

    // The barrier / max-duration content-row explanations retitle the sheet accordingly.
    const getSheetTitle = () => {
        if (carousel_index === BARRIER_PAGE) return <Localize i18n_default_text='Barrier' />;
        if (carousel_index === MAX_DURATION_PAGE) return <Localize i18n_default_text='Max duration' />;
        return <Localize i18n_default_text='Growth rate' />;
    };

    // Restore the last-saved growth rate on (re)mount, e.g. after switching trade type.
    React.useEffect(() => {
        const initial_value = v2_params_initial_values?.growth_rate;
        if (initial_value && growth_rate !== initial_value) handleGrowthRateChange(initial_value);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!growth_rate)
        return (
            <div className={classname}>
                <Skeleton />
            </div>
        );
    // Render desktop version with InputPopover for non-mobile devices
    if (!is_mobile) {
        return <GrowthRateDesktop is_minimized={is_minimized} />;
    }

    // Render mobile version with ActionSheet
    return (
        <>
            <div className='trade-params__field-locked'>
                <TextField
                    className={classname}
                    disabled={has_open_accu_contract || is_market_closed || is_automation_params_locked}
                    label={
                        <Localize
                            i18n_default_text='Growth rate'
                            key={`growth-rate${is_minimized ? '-minimized' : ''}`}
                        />
                    }
                    onClick={() => setIsOpen(true)}
                    readOnly
                    value={`${getGrowthRatePercentage(growth_rate)}%`}
                    variant='fill'
                />
                {is_automation_params_locked && <AutomationLockOverlay />}
            </div>
            <ActionSheet.Root
                isOpen={is_open}
                onClose={onActionSheetClose}
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
                                    title={<Localize i18n_default_text='Growth rate' />}
                                    description={
                                        <Localize i18n_default_text='The growth rate determines the rate at which your stake will grow with each successful tick.' />
                                    }
                                    label={localize('Growth rate')}
                                />
                            }
                            closeAction={{ ariaLabel: localize('Close') }}
                            saveAction={{ onAction: handleSave, ariaLabel: localize('Save') }}
                            isSaveActionDisabled={is_save_disabled}
                            shouldCloseOnSaveActionClick
                        />
                    ) : (
                        // Content-row detail page: plain title + back arrow, no save/close actions.
                        <CarouselHeader
                            current_index={carousel_index}
                            onNextClick={() => setCarouselIndex(0)}
                            onPrevClick={() => setCarouselIndex(0)}
                            title={getSheetTitle()}
                        />
                    )}
                    <Carousel
                        classname={clsx('growth-rate__carousel', is_small_screen && 'growth-rate__carousel--small')}
                        current_index={carousel_index}
                        setCurrentIndex={setCarouselIndex}
                        onPreviousButtonClick={() => setCarouselIndex(0)}
                        pages={action_sheet_content}
                    />
                </ActionSheet.Portal>
            </ActionSheet.Root>
        </>
    );
});

export default GrowthRate;
