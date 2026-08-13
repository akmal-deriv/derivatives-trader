import React, { useState } from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';

import { isMobile } from '@deriv/shared';
import { ActionSheet, Skeleton, TextField } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

import Carousel from 'AppV2/Components/Carousel';
import CarouselHeader from 'AppV2/Components/Carousel/carousel-header';
import TradeParamDefinition from 'AppV2/Components/TradeParamDefinition';
import { useTraderStore } from 'Stores/useTraderStores';

import { TTradeParametersProps } from '../trade-parameters';

import MultiplierDesktop from './multiplier-desktop';
import MultiplierWheelPicker from './multiplier-wheel-picker';

const Multiplier = observer(({ is_minimized }: TTradeParametersProps) => {
    const { multiplier, multiplier_range_list, is_market_closed, onChange } = useTraderStore();

    const [isOpen, setIsOpen] = useState(false);
    const [carousel_index, setCarouselIndex] = useState(0);
    const is_mobile = isMobile();
    const classname = clsx('trade-params__option', is_minimized && 'trade-params__option--minimized');

    const handleMultiplierChange = (multiplier: number) => {
        onChange({ target: { name: 'multiplier', value: multiplier } });
    };

    const onClose = React.useCallback(() => {
        setCarouselIndex(0);
        setIsOpen(false);
    }, []);

    const action_sheet_content = [
        {
            id: 1,
            component: (
                <MultiplierWheelPicker
                    multiplier={multiplier}
                    multiplier_range_list={multiplier_range_list}
                    setMultiplier={handleMultiplierChange}
                />
            ),
        },
        {
            id: 2,
            component: (
                <TradeParamDefinition
                    description={
                        <Localize i18n_default_text='Multipliers amplify your potential profit if the market moves in your favour, with losses limited to your initial capital.' />
                    }
                />
            ),
        },
    ];

    if (!multiplier)
        return (
            <div className={classname}>
                <Skeleton.Square />
            </div>
        );

    // Render desktop version with InputPopover for non-mobile devices
    if (!is_mobile) {
        return <MultiplierDesktop is_minimized={is_minimized} />;
    }

    // Render mobile version with ActionSheet (unchanged)
    return (
        <React.Fragment>
            <TextField
                className={classname}
                disabled={is_market_closed}
                variant='fill'
                readOnly
                label={
                    <Localize i18n_default_text='Multiplier' key={`multiplier${is_minimized ? '-minimized' : ''}`} />
                }
                value={`x${multiplier}`}
                onClick={() => setIsOpen(true)}
            />
            <ActionSheet.Root
                expandable={false}
                isOpen={isOpen}
                position='left'
                onClose={onClose}
                shouldBlurOnClose={isOpen}
            >
                <ActionSheet.Portal shouldCloseOnDrag>
                    <Carousel
                        classname='multiplier__carousel'
                        header={CarouselHeader}
                        current_index={carousel_index}
                        setCurrentIndex={setCarouselIndex}
                        onPreviousButtonClick={() => setCarouselIndex(0)}
                        pages={action_sheet_content}
                        title={<Localize i18n_default_text='Multiplier' />}
                    />
                </ActionSheet.Portal>
            </ActionSheet.Root>
        </React.Fragment>
    );
});

export default Multiplier;
