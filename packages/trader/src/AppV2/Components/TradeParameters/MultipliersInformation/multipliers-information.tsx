import React from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';

import { Money, Skeleton, TooltipPortal } from '@deriv/components';
import { clickAndKeyEventHandler, CONTRACT_TYPES } from '@deriv/shared';
import { ActionSheet, Heading, Text } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

import { getDisplayedContractTypes } from 'AppV2/Utils/trade-types-utils';
import { useTraderStore } from 'Stores/useTraderStores';

import './multipliers-information.scss';

type TDescriptionKey = 'stop_out' | 'stop_out_level';

const MultipliersInformation = observer(() => {
    const { contract_type, currency, is_market_closed, proposal_info, trade_types, trade_type_tab } = useTraderStore();
    const { isDesktop } = useDevice();
    // Which explanation the mobile ActionSheet is showing (null = closed).
    const [open_description, setOpenDescription] = React.useState<TDescriptionKey | null>(null);

    // The Up/Down side the user is on — resolved the same way the Buy button and the stake sheet do.
    const [displayed_contract_type] = getDisplayedContractTypes(trade_types, contract_type, trade_type_tab);
    const displayed_proposal = proposal_info?.[displayed_contract_type];
    // Loss amount and stake are the same for Up and Down, so either side will do while the selected
    // one is still loading.
    const any_proposal =
        displayed_proposal ??
        proposal_info?.[CONTRACT_TYPES.MULTIPLIER.UP] ??
        proposal_info?.[CONTRACT_TYPES.MULTIPLIER.DOWN];

    const stop_out = any_proposal?.limit_order?.stop_out?.order_amount;
    // The pip-sized price the contract stops out at — the same value the chart barrier shows on Buy
    // hover. Direction-specific (Up stops out below the spot, Down above it), so it must come from the
    // selected side only: falling back to the other one would show a price from the wrong direction.
    const stop_out_level = displayed_proposal?.limit_order?.stop_out?.value;

    // The stop out level is configured per asset/multiplier on the backend and is not sent as a
    // percentage. Derive it from the stop out loss amount (order_amount) relative to the stake
    // (ask_price), both taken from the same proposal, so the tooltip reflects the real level
    // (e.g. 90% for CRASH1000) instead of a hardcoded 100%.
    const stake = Number(any_proposal?.stake);
    const stop_out_percentage =
        stop_out != null && stake > 0 ? Math.round((Math.abs(stop_out) / stake) * 100) : undefined;

    const descriptions: Record<TDescriptionKey, { title: React.ReactNode; message: React.ReactNode }> = {
        stop_out: {
            title: <Localize i18n_default_text='Stop out' />,
            message:
                stop_out_percentage != null ? (
                    <Localize
                        i18n_default_text='Your contract will be closed automatically when your loss reaches {{stop_out_percentage}}% of your stake.'
                        values={{ stop_out_percentage }}
                    />
                ) : (
                    <Localize i18n_default_text='Your contract will be closed automatically when your loss reaches a certain percentage of your stake.' />
                ),
        },
        stop_out_level: {
            title: <Localize i18n_default_text='Stop out level' />,
            message: (
                <Localize i18n_default_text='The price at which your position closes automatically, capping your loss at your stake.' />
            ),
        },
    };

    const has_error =
        proposal_info?.[CONTRACT_TYPES.MULTIPLIER.UP]?.has_error ||
        proposal_info?.[CONTRACT_TYPES.MULTIPLIER.DOWN]?.has_error;

    // Desktop shows the explanation as a hover tooltip; mobile opens it in an ActionSheet.
    const renderLabel = (key: TDescriptionKey) => {
        const { title, message } = descriptions[key];
        const class_name = clsx(
            'multipliers-information__label--underlined',
            is_market_closed && 'trade-params__text--disabled'
        );

        if (isDesktop) {
            return (
                <TooltipPortal message={message} position='left' className='multipliers-information__tooltip'>
                    <Text size='sm' className={class_name}>
                        {title}
                    </Text>
                </TooltipPortal>
            );
        }

        const openDescription = (e?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
            if (is_market_closed) return;
            clickAndKeyEventHandler(() => setOpenDescription(key), e);
        };

        return (
            <Text size='sm' className={class_name} onClick={openDescription} onKeyDown={openDescription}>
                {title}
            </Text>
        );
    };

    if (has_error) return null;

    return (
        <div className='multipliers-information__container'>
            {/* Stop out - the loss amount */}
            <div className='multipliers-information__row'>
                {renderLabel('stop_out')}
                {stop_out !== undefined && stop_out !== null ? (
                    <Text size='sm' className={clsx(is_market_closed && 'trade-params__text--disabled')}>
                        <Money amount={Math.abs(stop_out)} show_currency currency={currency} />
                    </Text>
                ) : (
                    <Skeleton width={100} height={14} />
                )}
            </div>

            {/* Stop out level - a price, not an amount, so no currency code */}
            <div className='multipliers-information__row'>
                {renderLabel('stop_out_level')}
                {stop_out_level ? (
                    <Text size='sm' className={clsx(is_market_closed && 'trade-params__text--disabled')}>
                        {stop_out_level}
                    </Text>
                ) : (
                    <Skeleton width={100} height={14} />
                )}
            </div>
            {!isDesktop && (
                <ActionSheet.Root
                    isOpen={!!open_description}
                    onClose={() => setOpenDescription(null)}
                    position='left'
                    expandable={false}
                >
                    <ActionSheet.Portal shouldCloseOnDrag>
                        <ActionSheet.Content className='multipliers-information__definition__wrapper'>
                            <Heading.H4 className='multipliers-information__definition__title'>
                                {open_description && descriptions[open_description].title}
                            </Heading.H4>
                            <Text as='div'>{open_description && descriptions[open_description].message}</Text>
                        </ActionSheet.Content>
                        <ActionSheet.Footer
                            alignment='vertical'
                            primaryAction={{
                                content: <Localize i18n_default_text='Got it' />,
                                onAction: () => setOpenDescription(null),
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
