import React from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';

import { TooltipPortal } from '@deriv/components';
import { clickAndKeyEventHandler } from '@deriv/shared';
import { ActionSheet, Heading, Text, TextField, ToggleSwitch } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

import Carousel from 'AppV2/Components/Carousel';
import CarouselHeader from 'AppV2/Components/Carousel/carousel-header';
import TradeParamDefinition from 'AppV2/Components/TradeParamDefinition';
import { hasCallPutEqual, hasDurationForCallPutEqual } from 'Stores/Modules/Trading/Helpers/allow-equals';
import { useTraderStore } from 'Stores/useTraderStores';

import { TTradeParametersProps } from '../trade-parameters';

const AllowEquals = observer(({ is_minimized }: TTradeParametersProps) => {
    const { contract_types_list, duration_unit, expiry_type, is_equal, is_market_closed, onChange } = useTraderStore();
    const { isDesktop } = useDevice();

    const [is_open, setIsOpen] = React.useState(false);
    const [local_is_equal, setLocalIsEqual] = React.useState(!!is_equal);
    const [carousel_index, setCarouselIndex] = React.useState(0);

    const has_callputequal_duration = hasDurationForCallPutEqual(contract_types_list, duration_unit);
    const has_callputequal = hasCallPutEqual(contract_types_list);
    const has_allow_equals = (has_callputequal_duration || expiry_type === 'endtime') && has_callputequal;

    const onToggleSwitch = (is_enabled: boolean) => {
        onChange({ target: { name: 'is_equal', value: Number(is_enabled) } });
        if (!is_minimized) setIsOpen(false);
    };

    const openDescription = (e?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
        if (is_market_closed) return;
        if (isDesktop) return;
        clickAndKeyEventHandler(() => setIsOpen(true), e);
    };

    const closeSheet = () => {
        if (is_minimized) {
            setLocalIsEqual(!!is_equal);
            setCarouselIndex(0);
        }
        setIsOpen(false);
    };

    const onSave = () => {
        onChange({ target: { name: 'is_equal', value: Number(local_is_equal) } });
        setIsOpen(false);
    };

    if (!has_allow_equals) return null;

    if (is_minimized) {
        return (
            <React.Fragment>
                <TextField
                    variant='fill'
                    readOnly
                    disabled={is_market_closed}
                    label={<Localize i18n_default_text='Allow equals' key='allow-equals-minimized' />}
                    noStatusIcon
                    onClick={() => {
                        setLocalIsEqual(!!is_equal);
                        setCarouselIndex(0);
                        setIsOpen(true);
                    }}
                    value={is_equal ? 'Yes' : '-'}
                    className={clsx('trade-params__option', 'trade-params__option--minimized')}
                />
                <ActionSheet.Root isOpen={is_open} onClose={closeSheet} position='left' expandable={false}>
                    <ActionSheet.Portal shouldCloseOnDrag>
                        <Carousel
                            classname='allow-equals__carousel'
                            header={CarouselHeader}
                            current_index={carousel_index}
                            setCurrentIndex={setCarouselIndex}
                            pages={[
                                {
                                    id: 1,
                                    component: (
                                        <React.Fragment>
                                            <ActionSheet.Content className='allow-equals__sheet-content'>
                                                <div className='allow-equals__toggle-row'>
                                                    <Text>
                                                        <Localize i18n_default_text='Allow equals' />
                                                    </Text>
                                                    <ToggleSwitch
                                                        checked={local_is_equal}
                                                        onChange={setLocalIsEqual}
                                                        disabled={is_market_closed}
                                                    />
                                                </div>
                                            </ActionSheet.Content>
                                            <ActionSheet.Footer
                                                alignment='vertical'
                                                primaryAction={{
                                                    content: <Localize i18n_default_text='Save' />,
                                                    onAction: onSave,
                                                }}
                                                className='allow-equals__button'
                                            />
                                        </React.Fragment>
                                    ),
                                },
                                {
                                    id: 2,
                                    component: (
                                        <TradeParamDefinition
                                            description={
                                                <Localize i18n_default_text='Win a payout if the exit spot is equal to the entry spot.' />
                                            }
                                        />
                                    ),
                                },
                            ]}
                            title={<Localize i18n_default_text='Allow equals' />}
                        />
                    </ActionSheet.Portal>
                </ActionSheet.Root>
            </React.Fragment>
        );
    }

    const tooltipMessage = <Localize i18n_default_text='Win a payout if the exit spot is equal to the entry spot.' />;

    return (
        <React.Fragment>
            <div className='allow-equals__wrapper'>
                {isDesktop ? (
                    <TooltipPortal message={tooltipMessage} position='left' className='allow-equals__tooltip'>
                        <Text
                            size='sm'
                            className={clsx('allow-equals__title', is_market_closed && 'allow-equals__title--disabled')}
                        >
                            <Localize i18n_default_text='Allow equals' />
                        </Text>
                    </TooltipPortal>
                ) : (
                    <Text
                        size='sm'
                        className={clsx('allow-equals__title', is_market_closed && 'allow-equals__title--disabled')}
                        onClick={openDescription}
                        onKeyDown={openDescription}
                    >
                        <Localize i18n_default_text='Allow equals' />
                    </Text>
                )}
                <ToggleSwitch checked={!!is_equal} onChange={onToggleSwitch} disabled={is_market_closed} />
            </div>
            {!isDesktop && (
                <ActionSheet.Root isOpen={is_open} onClose={closeSheet} position='left' expandable={false}>
                    <ActionSheet.Portal shouldCloseOnDrag>
                        <ActionSheet.Content className='allow-equals__definition__wrapper'>
                            <Heading.H4 className='allow-equals__definition__title'>
                                <Localize i18n_default_text='Allow equals' />
                            </Heading.H4>
                            <Text as='div'>
                                <Localize i18n_default_text='Win a payout if the exit spot is equal to the entry spot.' />
                            </Text>
                        </ActionSheet.Content>
                        <ActionSheet.Footer
                            alignment='vertical'
                            primaryAction={{
                                content: <Localize i18n_default_text='Got it' />,
                                onAction: closeSheet,
                            }}
                            className='allow-equals__button'
                        />
                    </ActionSheet.Portal>
                </ActionSheet.Root>
            )}
        </React.Fragment>
    );
});

export default AllowEquals;
