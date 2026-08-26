import React from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';

import { Skeleton, TooltipPortal } from '@deriv/components';
import { clickAndKeyEventHandler, CONTRACT_TYPES } from '@deriv/shared';
import { ActionSheet, Heading, Text } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

import { formatAmountWithSymbol } from 'AppV2/Utils/currency-utils';
import { useTraderStore } from 'Stores/useTraderStores';

type TInfoRow = {
    label: React.ReactNode;
    tooltip_title: React.ReactNode;
    tooltip_description: React.ReactNode;
    value: React.ReactNode;
    is_market_closed?: boolean;
};

const InfoRow = ({ label, tooltip_title, tooltip_description, value, is_market_closed }: TInfoRow) => {
    const { isDesktop } = useDevice();
    const [is_open, setIsOpen] = React.useState(false);

    const openDescription = (e?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
        if (is_market_closed) return;
        if (isDesktop) return;
        clickAndKeyEventHandler(() => setIsOpen(true), e);
    };

    const closeDescription = () => setIsOpen(false);

    return (
        <>
            <div className='accumulators-info__row'>
                {isDesktop ? (
                    <TooltipPortal message={tooltip_description} position='left' className='accumulators-info__tooltip'>
                        <Text
                            size='sm'
                            className={clsx(
                                'accumulators-info__label--underlined',
                                is_market_closed && 'accumulators-info__label--disabled'
                            )}
                        >
                            {label}
                        </Text>
                    </TooltipPortal>
                ) : (
                    <Text
                        size='sm'
                        className={clsx(
                            'accumulators-info__label--underlined',
                            is_market_closed && 'accumulators-info__label--disabled'
                        )}
                        onClick={openDescription}
                        onKeyDown={openDescription}
                    >
                        {label}
                    </Text>
                )}
                {value}
            </div>
            {!isDesktop && (
                <ActionSheet.Root isOpen={is_open} onClose={closeDescription} position='left' expandable={false}>
                    <ActionSheet.Portal shouldCloseOnDrag>
                        <ActionSheet.Content className='accumulators-info__definition__wrapper'>
                            <Heading.H4 className='accumulators-info__definition__title'>{tooltip_title}</Heading.H4>
                            <Text as='div'>{tooltip_description}</Text>
                        </ActionSheet.Content>
                        <ActionSheet.Footer
                            alignment='vertical'
                            primaryAction={{
                                content: <Localize i18n_default_text='Got it' />,
                                onAction: closeDescription,
                            }}
                            className='accumulators-info__button'
                        />
                    </ActionSheet.Portal>
                </ActionSheet.Root>
            )}
        </>
    );
};

const AccumulatorsInformation = observer(() => {
    const { currency, is_market_closed, maximum_payout, maximum_ticks, proposal_info, tick_size_barrier_percentage } =
        useTraderStore();
    const { isDesktop } = useDevice();
    const has_error = proposal_info[CONTRACT_TYPES.ACCUMULATOR]?.has_error;

    if (has_error) return null;

    const barrier_value = tick_size_barrier_percentage ? `± ${tick_size_barrier_percentage}` : null;
    const duration_value = maximum_ticks ? `${maximum_ticks} ticks` : null;

    return (
        <div className='accumulators-info__wrapper'>
            <InfoRow
                label={<Localize i18n_default_text='Max. payout' />}
                tooltip_title={<Localize i18n_default_text='Max. payout' />}
                tooltip_description={
                    <Localize i18n_default_text='Your contract will be automatically closed when your payout reaches this amount.' />
                }
                is_market_closed={is_market_closed}
                value={
                    maximum_payout ? (
                        <Text size='sm' className={clsx(is_market_closed && 'trade-params__text--disabled')}>
                            {formatAmountWithSymbol(currency, maximum_payout)}
                        </Text>
                    ) : (
                        <Skeleton width={100} height={14} />
                    )
                }
            />
            {isDesktop && (
                <>
                    <InfoRow
                        label={<Localize i18n_default_text='Barrier' />}
                        tooltip_title={<Localize i18n_default_text='Barrier' />}
                        tooltip_description={
                            <Localize i18n_default_text='The price range within which the spot price must remain at each tick for your payout to keep growing. If the price moves outside this range, your contract is terminated.' />
                        }
                        is_market_closed={is_market_closed}
                        value={
                            barrier_value ? (
                                <Text size='sm' className={clsx(is_market_closed && 'trade-params__text--disabled')}>
                                    {barrier_value}
                                </Text>
                            ) : (
                                <Skeleton width={100} height={14} />
                            )
                        }
                    />
                    <InfoRow
                        label={<Localize i18n_default_text='Max. duration' />}
                        tooltip_title={<Localize i18n_default_text='Max. duration' />}
                        tooltip_description={
                            <Localize i18n_default_text='Your contract will be automatically closed upon reaching this number of ticks.' />
                        }
                        is_market_closed={is_market_closed}
                        value={
                            duration_value ? (
                                <Text size='sm' className={clsx(is_market_closed && 'trade-params__text--disabled')}>
                                    {duration_value}
                                </Text>
                            ) : (
                                <Skeleton width={100} height={14} />
                            )
                        }
                    />
                </>
            )}
        </div>
    );
});

export default AccumulatorsInformation;
