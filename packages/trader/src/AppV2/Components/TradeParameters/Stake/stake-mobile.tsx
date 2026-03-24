import React from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';

import { getCurrencyDisplayCode, trackAnalyticsEvent } from '@deriv/shared';
import { ActionSheet, TextField } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

import { TabSelector } from 'AppV2/Components/InputPopover';
import { getStakePresets } from 'AppV2/Config/trade-parameter-presets';
import useTradeError from 'AppV2/Hooks/useTradeError';
import { mapContractTypeToStakePresetKey } from 'AppV2/Utils/trade-params-preset-utils';
import { getDisplayedContractTypes } from 'AppV2/Utils/trade-types-utils';
import { useTraderStore } from 'Stores/useTraderStores';

import { ChipsWithInputToggle } from '../Shared';
import { TTradeParametersProps } from '../trade-parameters';

import StakeInput from './stake-input';

const DEFAULT_CHIP_VALUES = [1, 5, 10, 20, 50, 100];

const Stake = observer(({ is_minimized }: TTradeParametersProps) => {
    const {
        amount,
        currency,
        contract_type,
        has_open_accu_contract,
        is_market_closed,
        is_multiplier,
        trade_types,
        trade_type_tab,
        proposal_info,
        onChange,
    } = useTraderStore();
    const { is_error_matching_field: has_error } = useTradeError({ error_fields: ['stake', 'amount'] });

    const [is_open, setIsOpen] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<'chips' | 'input'>('chips');

    const contract_types = getDisplayedContractTypes(trade_types, contract_type, trade_type_tab);
    const is_all_types_with_errors = contract_types.every(item => proposal_info?.[item]?.has_error);

    // Showing snackbar for all cases, except when it is Rise/Fall or Digits and only one subtype has error
    const should_show_snackbar = contract_types.length === 1 || is_multiplier || is_all_types_with_errors;

    const onClose = React.useCallback(() => {
        setIsOpen(false);
        setActiveTab('chips');
    }, []);

    const presetKey = mapContractTypeToStakePresetKey(contract_type);
    const chipValues = presetKey ? getStakePresets(presetKey) : undefined;

    const handleChipSelect = React.useCallback(
        (chip_amount: number) => {
            onChange({ target: { name: 'amount', value: chip_amount } });
            trackAnalyticsEvent('ce_trade_types_form_v2', {
                action: 'customizing_trades',
                input_method: 'preset',
                parameter_type: 'stake',
                preset_value: chip_amount,
            });
            onClose();
        },
        [onChange, onClose]
    );

    const formatChipValue = React.useCallback(
        (val: number) => `${val} ${getCurrencyDisplayCode(currency)}`,
        [currency]
    );

    return (
        <React.Fragment>
            <TextField
                disabled={has_open_accu_contract || is_market_closed}
                variant='fill'
                readOnly
                label={<Localize i18n_default_text='Stake' key={`stake${is_minimized ? '-minimized' : ''}`} />}
                noStatusIcon
                onClick={() => setIsOpen(true)}
                value={`${amount} ${getCurrencyDisplayCode(currency)}`}
                className={clsx('trade-params__option', is_minimized && 'trade-params__option--minimized')}
                status={has_error && should_show_snackbar ? 'error' : 'neutral'}
            />
            <ActionSheet.Root
                isOpen={is_open}
                onClose={onClose}
                position='left'
                expandable={false}
                shouldBlurOnClose={is_open}
            >
                <ActionSheet.Portal shouldCloseOnDrag>
                    <div className='stake-container'>
                        <div className='stake-container__tab-selector'>
                            <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />
                        </div>
                        <ChipsWithInputToggle
                            activeTab={activeTab}
                            chipValues={chipValues || DEFAULT_CHIP_VALUES}
                            selectedValue={amount}
                            onSelect={handleChipSelect}
                            formatValue={formatChipValue}
                            inputComponent={<StakeInput onClose={onClose} is_open={is_open} />}
                        />
                    </div>
                </ActionSheet.Portal>
            </ActionSheet.Root>
        </React.Fragment>
    );
});

export default Stake;
