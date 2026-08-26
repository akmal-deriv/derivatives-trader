import React from 'react';
import clsx from 'clsx';

import { Skeleton, TooltipPortal } from '@deriv/components';
import { clickAndKeyEventHandler } from '@deriv/shared';
import { observer } from '@deriv/stores';
import { ActionSheet, Heading, Text } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

import { useTraderStore } from 'Stores/useTraderStores';

const BARRIER_TOOLTIP = (
    <Localize i18n_default_text="This is the corresponding price level based on the payout per point you've selected. If this barrier is ever breached, your contract would be terminated." />
);

const BarrierInfo = observer(() => {
    const { barrier_1, contract_type, is_market_closed, proposal_info } = useTraderStore();
    const { isDesktop } = useDevice();
    const [is_open, setIsOpen] = React.useState(false);
    const contract_key = contract_type.toUpperCase();
    const has_error = proposal_info[contract_key]?.has_error;

    const openDescription = (e?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
        if (is_market_closed || isDesktop) return;
        clickAndKeyEventHandler(() => setIsOpen(true), e);
    };

    const closeDescription = () => setIsOpen(false);

    if (has_error) return null;
    return (
        <React.Fragment>
            <div className='barrier-info__container'>
                {isDesktop ? (
                    <TooltipPortal message={BARRIER_TOOLTIP} position='left'>
                        <Text
                            size='sm'
                            className={clsx(
                                'barrier-info__label--underlined',
                                is_market_closed && 'trade-params__text--disabled'
                            )}
                        >
                            <Localize i18n_default_text='Barrier' />
                        </Text>
                    </TooltipPortal>
                ) : (
                    <Text
                        size='sm'
                        className={clsx(
                            'barrier-info__label--underlined',
                            is_market_closed && 'trade-params__text--disabled'
                        )}
                        onClick={openDescription}
                        onKeyDown={openDescription}
                    >
                        <Localize i18n_default_text='Barrier' />
                    </Text>
                )}
                {barrier_1 ? (
                    <Text size='sm' className={clsx(is_market_closed && 'trade-params__text--disabled')}>
                        {barrier_1}
                    </Text>
                ) : (
                    <Skeleton width={50} height={14} />
                )}
            </div>
            {!isDesktop && (
                <ActionSheet.Root isOpen={is_open} onClose={closeDescription} position='left' expandable={false}>
                    <ActionSheet.Portal shouldCloseOnDrag>
                        <ActionSheet.Content className='barrier-info__definition__wrapper'>
                            <Heading.H4 className='barrier-info__definition__title'>
                                <Localize i18n_default_text='Barrier' />
                            </Heading.H4>
                            <Text as='div'>{BARRIER_TOOLTIP}</Text>
                        </ActionSheet.Content>
                        <ActionSheet.Footer
                            alignment='vertical'
                            primaryAction={{
                                content: <Localize i18n_default_text='Got it' />,
                                onAction: closeDescription,
                            }}
                        />
                    </ActionSheet.Portal>
                </ActionSheet.Root>
            )}
        </React.Fragment>
    );
});

export default BarrierInfo;
