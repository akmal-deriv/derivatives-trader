import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';

import { isMobile } from '@deriv/shared';
import { ActionSheet, Skeleton, TextField } from '@deriv-com/quill-ui';
import { Localize, useTranslations } from '@deriv-com/translations';

import { ActionSheetHeaderTitle } from 'AppV2/Components/ActionSheetHeaderTooltip';
import { useTraderStore } from 'Stores/useTraderStores';

import { TTradeParametersProps } from '../trade-parameters';

import MultiplierDescription from './multiplier-description';
import MultiplierDesktop from './multiplier-desktop';
import MultiplierWheelPicker from './multiplier-wheel-picker';

const Multiplier = observer(({ is_minimized }: TTradeParametersProps) => {
    const { multiplier, multiplier_range_list, is_market_closed, onChange } = useTraderStore();
    const { localize } = useTranslations();

    const [isOpen, setIsOpen] = useState(false);
    // Draft kept in state (not a ref) so the header check reacts to wheel changes.
    const [selected_multiplier, setSelectedMultiplier] = useState(multiplier);
    const is_mobile = isMobile();
    const classname = clsx('trade-params__option', is_minimized && 'trade-params__option--minimized');

    // Re-initialise the draft from the committed value on open — this is what makes dismiss = discard.
    useEffect(() => {
        if (isOpen) {
            setSelectedMultiplier(multiplier);
        }
    }, [isOpen, multiplier]);

    const onClose = React.useCallback(() => {
        setIsOpen(false);
    }, []);

    const handleSave = () => {
        onChange({ target: { name: 'multiplier', value: selected_multiplier } });
        setIsOpen(false);
    };

    const is_save_disabled = selected_multiplier === multiplier;

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

    // Render mobile version with ActionSheet
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
                <ActionSheet.Portal showHandlebar={false} shouldDetectSwipingOnContainer shouldCloseOnDrag>
                    <ActionSheet.Header
                        title={
                            <ActionSheetHeaderTitle
                                title={<Localize i18n_default_text='Multiplier' />}
                                description={<MultiplierDescription />}
                                label={localize('Multiplier')}
                            />
                        }
                        closeAction={{ ariaLabel: localize('Close') }}
                        saveAction={{ onAction: handleSave, ariaLabel: localize('Save') }}
                        isSaveActionDisabled={is_save_disabled}
                        shouldCloseOnSaveActionClick
                    />
                    <MultiplierWheelPicker
                        multiplier_range_list={multiplier_range_list}
                        selected_multiplier={selected_multiplier}
                        setSelectedMultiplier={setSelectedMultiplier}
                    />
                </ActionSheet.Portal>
            </ActionSheet.Root>
        </React.Fragment>
    );
});

export default Multiplier;
