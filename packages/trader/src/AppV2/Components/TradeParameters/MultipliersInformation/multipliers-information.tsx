import React from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';

import { Money, Skeleton, TooltipPortal } from '@deriv/components';
import { clickAndKeyEventHandler, CONTRACT_TYPES } from '@deriv/shared';
import { ActionSheet, Heading, Text } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

import { useTraderStore } from 'Stores/useTraderStores';

import './multipliers-information.scss';

const STOP_OUT_TOOLTIP = (
    <Localize i18n_default_text='Your contract will be closed automatically when your loss reaches 100% of your stake.' />
);

const MultipliersInformation = observer(() => {
    const { currency, is_market_closed, proposal_info } = useTraderStore();
    const { isDesktop } = useDevice();
    const [is_stop_out_open, setIsStopOutOpen] = React.useState(false);

    const up_commission = proposal_info?.[CONTRACT_TYPES.MULTIPLIER.UP]?.commission;
    const down_commission = proposal_info?.[CONTRACT_TYPES.MULTIPLIER.DOWN]?.commission;
    const up_stop_out = proposal_info?.[CONTRACT_TYPES.MULTIPLIER.UP]?.limit_order?.stop_out?.order_amount;
    const down_stop_out = proposal_info?.[CONTRACT_TYPES.MULTIPLIER.DOWN]?.limit_order?.stop_out?.order_amount;

    // Use UP values, fallback to DOWN if UP is not available
    const commission = up_commission ?? down_commission;
    const stop_out = up_stop_out ?? down_stop_out;

    const has_error =
        proposal_info?.[CONTRACT_TYPES.MULTIPLIER.UP]?.has_error ||
        proposal_info?.[CONTRACT_TYPES.MULTIPLIER.DOWN]?.has_error;

    const openStopOutDescription = (e?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
        if (is_market_closed || isDesktop) return;
        clickAndKeyEventHandler(() => setIsStopOutOpen(true), e);
    };

    if (has_error) return null;

    return (
        <div className='multipliers-information__container'>
            {/* Stop out - Always visible */}
            <div className='multipliers-information__row'>
                {isDesktop ? (
                    <TooltipPortal
                        message={STOP_OUT_TOOLTIP}
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
                            <Text as='div'>{STOP_OUT_TOOLTIP}</Text>
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
                <Text size='sm' className={clsx(is_market_closed && 'trade-params__text--disabled')}>
                    <Localize i18n_default_text='Commission' />
                </Text>
                {commission !== undefined && commission !== null ? (
                    <Text size='sm' className={clsx(is_market_closed && 'trade-params__text--disabled')}>
                        <Money amount={commission} show_currency currency={currency} />
                    </Text>
                ) : (
                    <Skeleton width={100} height={14} />
                )}
            </div>
        </div>
    );
});

export default MultipliersInformation;
