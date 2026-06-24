import React from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';

import { Money, Skeleton, TooltipPortal } from '@deriv/components';
import { clickAndKeyEventHandler, CONTRACT_TYPES } from '@deriv/shared';
import { ActionSheet, Heading, Text } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

import { useTraderStore } from 'Stores/useTraderStores';

import CommissionFormula, { getCommissionPercentage } from '../Multiplier/commission-formula';

import './multipliers-information.scss';

const MultipliersInformation = observer(() => {
    const { amount, currency, is_market_closed, multiplier, proposal_info } = useTraderStore();
    const { isDesktop } = useDevice();
    const [is_stop_out_open, setIsStopOutOpen] = React.useState(false);
    const [is_commission_open, setIsCommissionOpen] = React.useState(false);

    const up_commission = proposal_info?.[CONTRACT_TYPES.MULTIPLIER.UP]?.commission;
    const down_commission = proposal_info?.[CONTRACT_TYPES.MULTIPLIER.DOWN]?.commission;
    const up_stop_out = proposal_info?.[CONTRACT_TYPES.MULTIPLIER.UP]?.limit_order?.stop_out?.order_amount;
    const down_stop_out = proposal_info?.[CONTRACT_TYPES.MULTIPLIER.DOWN]?.limit_order?.stop_out?.order_amount;
    const up_stake = proposal_info?.[CONTRACT_TYPES.MULTIPLIER.UP]?.stake;
    const down_stake = proposal_info?.[CONTRACT_TYPES.MULTIPLIER.DOWN]?.stake;

    // Use UP values, fallback to DOWN if UP is not available
    const commission = up_commission ?? down_commission;
    const stop_out = up_stop_out ?? down_stop_out;

    // The stop out level is configured per asset/multiplier on the backend and is not sent as a
    // percentage. Derive it from the stop out loss amount (order_amount) relative to the stake
    // (ask_price), both taken from the same proposal, so the tooltip reflects the real level
    // (e.g. 90% for CRASH1000) instead of a hardcoded 100%.
    const stake = Number(up_stake ?? down_stake);
    const stop_out_percentage =
        stop_out != null && stake > 0 ? Math.round((Math.abs(stop_out) / stake) * 100) : undefined;

    const stop_out_tooltip =
        stop_out_percentage != null ? (
            <Localize
                i18n_default_text='Your contract will be closed automatically when your loss reaches {{stop_out_percentage}}% of your stake.'
                values={{ stop_out_percentage }}
            />
        ) : (
            <Localize i18n_default_text='Your contract will be closed automatically when your loss reaches a certain percentage of your stake.' />
        );

    const has_error =
        proposal_info?.[CONTRACT_TYPES.MULTIPLIER.UP]?.has_error ||
        proposal_info?.[CONTRACT_TYPES.MULTIPLIER.DOWN]?.has_error;

    // Dynamic commission formula tooltip (V1 parity) — shared with the multiplier wheel-picker.
    const commission_percentage = getCommissionPercentage(commission, multiplier, amount);

    // Reset the open state whenever the commission ActionSheet stops being rendered (desktop, or no derivable
    // percentage). Otherwise the controlled `isOpen` survives the conditional unmount and the sheet would pop
    // back open on its own once the trigger reappears (e.g. after the stake is cleared and re-entered).
    React.useEffect(() => {
        if (isDesktop || commission_percentage === null) setIsCommissionOpen(false);
    }, [isDesktop, commission_percentage]);

    const COMMISSION_TOOLTIP = (
        <CommissionFormula commission={commission} multiplier={multiplier} amount={amount} currency={currency} />
    );

    const openStopOutDescription = (e?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
        if (is_market_closed || isDesktop) return;
        clickAndKeyEventHandler(() => setIsStopOutOpen(true), e);
    };

    const openCommissionDescription = (e?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
        if (is_market_closed || isDesktop) return;
        clickAndKeyEventHandler(() => setIsCommissionOpen(true), e);
    };

    const commission_label = <Localize i18n_default_text='Commission' />;
    let commission_label_node = (
        <Text size='sm' className={clsx(is_market_closed && 'trade-params__text--disabled')}>
            {commission_label}
        </Text>
    );
    if (commission_percentage !== null) {
        const interactive_label_class = clsx(
            'multipliers-information__label--underlined',
            is_market_closed && 'trade-params__text--disabled'
        );
        commission_label_node = isDesktop ? (
            <TooltipPortal message={COMMISSION_TOOLTIP} position='left' className='multipliers-information__tooltip'>
                <Text size='sm' className={interactive_label_class}>
                    {commission_label}
                </Text>
            </TooltipPortal>
        ) : (
            <Text
                size='sm'
                className={interactive_label_class}
                onClick={openCommissionDescription}
                onKeyDown={openCommissionDescription}
            >
                {commission_label}
            </Text>
        );
    }

    if (has_error) return null;

    return (
        <div className='multipliers-information__container'>
            {/* Stop out - Always visible */}
            <div className='multipliers-information__row'>
                {isDesktop ? (
                    <TooltipPortal
                        message={stop_out_tooltip}
                        position='left'
                        className='multipliers-information__tooltip'
                    >
                        <Text
                            size='sm'
                            className={clsx(
                                'multipliers-information__label--underlined',
                                is_market_closed && 'trade-params__text--disabled'
                            )}
                        >
                            <Localize i18n_default_text='Stop out' />
                        </Text>
                    </TooltipPortal>
                ) : (
                    <Text
                        size='sm'
                        className={clsx(
                            'multipliers-information__label--underlined',
                            is_market_closed && 'trade-params__text--disabled'
                        )}
                        onClick={openStopOutDescription}
                        onKeyDown={openStopOutDescription}
                    >
                        <Localize i18n_default_text='Stop out' />
                    </Text>
                )}
                {stop_out !== undefined && stop_out !== null ? (
                    <Text size='sm' className={clsx(is_market_closed && 'trade-params__text--disabled')}>
                        <Money amount={Math.abs(stop_out)} show_currency currency={currency} />
                    </Text>
                ) : (
                    <Skeleton width={100} height={14} />
                )}
            </div>
            {!isDesktop && (
                <ActionSheet.Root
                    isOpen={is_stop_out_open}
                    onClose={() => setIsStopOutOpen(false)}
                    position='left'
                    expandable={false}
                >
                    <ActionSheet.Portal shouldCloseOnDrag>
                        <ActionSheet.Content className='multipliers-information__definition__wrapper'>
                            <Heading.H4 className='multipliers-information__definition__title'>
                                <Localize i18n_default_text='Stop out' />
                            </Heading.H4>
                            <Text as='div'>{stop_out_tooltip}</Text>
                        </ActionSheet.Content>
                        <ActionSheet.Footer
                            alignment='vertical'
                            primaryAction={{
                                content: <Localize i18n_default_text='Got it' />,
                                onAction: () => setIsStopOutOpen(false),
                            }}
                            className='multipliers-information__button'
                        />
                    </ActionSheet.Portal>
                </ActionSheet.Root>
            )}

            {/* Commission - Hidden in collapsed mode on mobile */}
            <div className='multipliers-information__row multipliers-information__row--collapsible'>
                {commission_label_node}
                {commission !== undefined && commission !== null ? (
                    <Text size='sm' className={clsx(is_market_closed && 'trade-params__text--disabled')}>
                        <Money amount={commission} show_currency currency={currency} />
                    </Text>
                ) : (
                    <Skeleton width={100} height={14} />
                )}
            </div>
            {!isDesktop && commission_percentage !== null && (
                <ActionSheet.Root
                    isOpen={is_commission_open}
                    onClose={() => setIsCommissionOpen(false)}
                    position='left'
                    expandable={false}
                >
                    <ActionSheet.Portal shouldCloseOnDrag>
                        <ActionSheet.Content className='multipliers-information__definition__wrapper'>
                            <Heading.H4 className='multipliers-information__definition__title'>
                                <Localize i18n_default_text='Commission' />
                            </Heading.H4>
                            <Text as='div'>{COMMISSION_TOOLTIP}</Text>
                        </ActionSheet.Content>
                        <ActionSheet.Footer
                            alignment='vertical'
                            primaryAction={{
                                content: <Localize i18n_default_text='Got it' />,
                                onAction: () => setIsCommissionOpen(false),
                            }}
                            className='multipliers-information__button'
                        />
                    </ActionSheet.Portal>
                </ActionSheet.Root>
            )}
        </div>
    );
});

export default MultipliersInformation;
