import React from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';

import { LabelPairedArrowLeftMdRegularIcon } from '@deriv/quill-icons';
import {
    CONTRACT_TYPES,
    getCurrencyDisplayCode,
    getDecimalPlaces,
    getMinPayout,
    isCryptocurrency,
} from '@deriv/shared';
import { ActionSheet, TextField } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

import Carousel from 'AppV2/Components/Carousel';
import CarouselHeader from 'AppV2/Components/Carousel/carousel-header';
import TradeParamDefinition from 'AppV2/Components/TradeParamDefinition';
import useTradeError from 'AppV2/Hooks/useTradeError';
import { getDisplayedContractTypes } from 'AppV2/Utils/trade-types-utils';
import { AutomationStoreContext } from 'Stores/useAutomationStore';
import { useTraderStore } from 'Stores/useTraderStores';

import CommissionDescription from '../Multiplier/commission-description';
import { AutomationLockOverlay, StepperButtons } from '../Shared';
import { TTradeParametersProps } from '../trade-parameters';

import StakeInput from './stake-input';

// Page order within the stake sheet carousel.
const STAKE_PAGE = 0;
const STOP_OUT_PAGE = 1;
const COMMISSION_PAGE = 2;

// Carousel header for the stake sheet: a back arrow on the definition pages, no icon on the stake
// input page (unlike the default CarouselHeader, which shows a general info icon on the first page).
const StakeSheetHeader = ({ current_index, onPrevClick, title }: React.ComponentProps<typeof CarouselHeader>) => (
    <ActionSheet.Header
        title={title}
        icon={current_index ? <LabelPairedArrowLeftMdRegularIcon onClick={onPrevClick} /> : undefined}
        iconPosition={current_index ? 'left' : undefined}
    />
);

const Stake = observer(({ is_minimized, is_automation }: TTradeParametersProps) => {
    const {
        amount,
        currency,
        contract_type,
        has_open_accu_contract,
        is_automation_params_locked,
        is_market_closed,
        is_multiplier,
        multiplier,
        onChange,
        trade_types,
        trade_type_tab,
        proposal_info,
        validation_params,
        is_automation_tab,
    } = useTraderStore();
    const automation_store = React.useContext(AutomationStoreContext);
    const { is_error_matching_field: has_error } = useTradeError({ error_fields: ['stake', 'amount'] });

    const [is_open, setIsOpen] = React.useState(false);
    const [carousel_index, setCarouselIndex] = React.useState(STAKE_PAGE);

    const contract_types = getDisplayedContractTypes(trade_types, contract_type, trade_type_tab);
    const is_all_types_with_errors = contract_types.every(item => proposal_info?.[item]?.has_error);

    // Showing snackbar for all cases, except when it is Rise/Fall or Digits and only one subtype has error
    const should_show_snackbar = contract_types.length === 1 || is_multiplier || is_all_types_with_errors;

    const onClose = React.useCallback(() => {
        setCarouselIndex(STAKE_PAGE);
        setIsOpen(false);
    }, []);

    // The Stop out / Commission explanation pages shown within the stake sheet (multipliers only).
    // Stop out is derived as a % of the stake (both from the same proposal) so it reflects the real
    // level (e.g. 90% for CRASH1000) — mirrors MultipliersInformation.
    const stop_out_amount =
        proposal_info?.[CONTRACT_TYPES.MULTIPLIER.UP]?.limit_order?.stop_out?.order_amount ??
        proposal_info?.[CONTRACT_TYPES.MULTIPLIER.DOWN]?.limit_order?.stop_out?.order_amount;
    const stake_amount = Number(
        proposal_info?.[CONTRACT_TYPES.MULTIPLIER.UP]?.stake ?? proposal_info?.[CONTRACT_TYPES.MULTIPLIER.DOWN]?.stake
    );
    const stop_out_percentage =
        stop_out_amount != null && stake_amount > 0
            ? Math.round((Math.abs(stop_out_amount) / stake_amount) * 100)
            : undefined;
    const stop_out_description =
        stop_out_percentage != null ? (
            <Localize
                i18n_default_text='Your contract will be closed automatically when your loss reaches {{stop_out_percentage}}% of your stake.'
                values={{ stop_out_percentage }}
            />
        ) : (
            <Localize i18n_default_text='Your contract will be closed automatically when your loss reaches a certain percentage of your stake.' />
        );
    const commission =
        proposal_info?.[CONTRACT_TYPES.MULTIPLIER.UP]?.commission ??
        proposal_info?.[CONTRACT_TYPES.MULTIPLIER.DOWN]?.commission;

    const getSheetTitle = () => {
        if (carousel_index === STOP_OUT_PAGE) return <Localize i18n_default_text='Stop out' />;
        if (carousel_index === COMMISSION_PAGE) return <Localize i18n_default_text='Commission' />;
        return <Localize i18n_default_text='Stake' />;
    };

    const pages = [
        {
            id: STAKE_PAGE,
            component: (
                <StakeInput
                    onClose={onClose}
                    is_open={is_open}
                    onOpenStopOut={() => setCarouselIndex(STOP_OUT_PAGE)}
                    onOpenCommission={() => setCarouselIndex(COMMISSION_PAGE)}
                />
            ),
        },
    ];
    if (is_multiplier) {
        pages.push(
            { id: STOP_OUT_PAGE, component: <TradeParamDefinition description={stop_out_description} /> },
            {
                id: COMMISSION_PAGE,
                component: (
                    <TradeParamDefinition
                        is_custom_description
                        description={
                            <CommissionDescription
                                commission={commission}
                                multiplier={multiplier}
                                amount={amount}
                                currency={currency}
                            />
                        }
                    />
                ),
            }
        );
    }

    // Inline ±1 steppers (expanded view only). Step is 1 for fiat; for crypto the currency minimum
    // is the smallest meaningful increment. validation_params.stake is only present for some contract
    // types (e.g. multipliers), so limits are optional: clamp when known, otherwise let the proposal
    // validate — never gate the whole stepper on limits being loaded.
    const { stake } = (validation_params[contract_types[0]] || validation_params[contract_types[1]]) ?? {};
    const min_stake = Number(stake?.min);
    const max_stake = Number(stake?.max);
    const has_min = min_stake > 0;
    const has_max = max_stake > 0;
    const current = Number(amount);
    const step = Number(isCryptocurrency(currency) ? getMinPayout(currency) : 1) || 1;
    const show_steppers = !is_minimized;
    const stepStake = (direction: 1 | -1) => {
        let next = Number((current + direction * step).toFixed(getDecimalPlaces(currency)));
        if (has_min) next = Math.max(min_stake, next);
        if (has_max) next = Math.min(max_stake, next);
        if (next > 0 && next !== current) onChange({ target: { name: 'amount', value: next } });
    };
    const steppers_disabled = has_open_accu_contract || is_market_closed || is_automation_params_locked;
    const decrement_disabled = steppers_disabled || current - step <= 0 || (has_min && current <= min_stake);
    const increment_disabled = steppers_disabled || (has_max && current >= max_stake);

    // Keep initial_stake in sync with the stake field in automation context.
    // `is_automation_tab` only flips on desktop (the panel-tab switcher); the
    // mobile /automate route relies on the `is_automation` prop instead.
    React.useEffect(() => {
        if ((is_automation_tab || is_automation) && amount && automation_store) {
            automation_store.setStrategyParam('initial_stake', String(amount));
        }
    }, [amount, is_automation_tab, is_automation, automation_store]);

    return (
        <React.Fragment>
            <div className='trade-params__field-locked'>
                <TextField
                    disabled={steppers_disabled}
                    variant='fill'
                    readOnly
                    label={
                        <Localize
                            i18n_default_text={is_automation_tab ? 'Initial stake' : 'Stake'}
                            key={`stake${is_minimized ? '-minimized' : ''}`}
                        />
                    }
                    noStatusIcon
                    onClick={() => setIsOpen(true)}
                    value={`${amount} ${getCurrencyDisplayCode(currency)}`}
                    className={clsx('trade-params__option', is_minimized && 'trade-params__option--minimized')}
                    status={has_error && should_show_snackbar ? 'error' : 'neutral'}
                    rightIcon={
                        show_steppers ? (
                            <StepperButtons
                                onDecrement={() => stepStake(-1)}
                                onIncrement={() => stepStake(1)}
                                decrement_disabled={decrement_disabled}
                                increment_disabled={increment_disabled}
                            />
                        ) : undefined
                    }
                />
                {is_automation_params_locked && <AutomationLockOverlay />}
            </div>
            <ActionSheet.Root
                isOpen={is_open}
                onClose={onClose}
                position='left'
                expandable={false}
                shouldBlurOnClose={is_open}
            >
                <ActionSheet.Portal shouldCloseOnDrag>
                    <div className='stake-container'>
                        <Carousel
                            classname='stake__carousel'
                            header={StakeSheetHeader}
                            title={getSheetTitle()}
                            current_index={carousel_index}
                            setCurrentIndex={setCarouselIndex}
                            onPreviousButtonClick={() => setCarouselIndex(STAKE_PAGE)}
                            pages={pages}
                        />
                    </div>
                </ActionSheet.Portal>
            </ActionSheet.Root>
        </React.Fragment>
    );
});

export default Stake;
