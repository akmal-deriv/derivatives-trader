import React, { useCallback } from 'react';
import { observer } from 'mobx-react-lite';

import { getCurrencyDisplayCode, trackAnalyticsEvent } from '@deriv/shared';
import { Localize } from '@deriv-com/translations';

import { TabSelector } from 'AppV2/Components/InputPopover';
import {
    ChipsWithInputToggle,
    TradeParameterPopover,
    useTradeParameterPopover,
} from 'AppV2/Components/TradeParameters/Shared';
import { getCurrencySymbol } from 'AppV2/Utils/currency-utils';
import { getStakePresets } from 'AppV2/Config/trade-parameter-presets';
import useTradeError from 'AppV2/Hooks/useTradeError';
import { mapContractTypeToStakePresetKey } from 'AppV2/Utils/trade-params-preset-utils';
import { getDisplayedContractTypes } from 'AppV2/Utils/trade-types-utils';
import { AutomationStoreContext } from 'Stores/useAutomationStore';
import { useTraderStore } from 'Stores/useTraderStores';

import { TTradeParametersProps } from '../trade-parameters';

import StakeInputDesktop from './stake-input-desktop';

const StakePopoverContent: React.FC<{
    active_tab: 'chips' | 'input';
    amount: number;
    currency: string;
    is_open: boolean;
    contract_type: string;
    symbol: string;
    onChipSelect: (amount: number) => void;
}> = ({ active_tab, amount, currency, is_open, contract_type, symbol, onChipSelect }) => {
    const { closePopover } = useTradeParameterPopover();

    const handleChipSelectAndClose = useCallback(
        (chip_amount: number) => {
            onChipSelect(chip_amount);
            trackAnalyticsEvent('ce_trade_types_form_v2', {
                action: 'customizing_trades',
                input_method: 'preset',
                parameter_type: 'stake',
                preset_value: chip_amount,
            });
            closePopover();
        },
        [onChipSelect, closePopover]
    );

    // Map contract_type to the preset key and get the appropriate stake presets
    const presetKey = mapContractTypeToStakePresetKey(contract_type);
    const chipValues = presetKey ? getStakePresets(presetKey, symbol) : undefined;

    // Fallback to a default set if no presets found (backward compatibility)
    const defaultChipValues = [1, 5, 10, 20, 50, 100];

    return (
        <ChipsWithInputToggle
            activeTab={active_tab}
            chipValues={chipValues || defaultChipValues}
            selectedValue={amount}
            onSelect={handleChipSelectAndClose}
            formatValue={(val: number) => `${val} ${getCurrencyDisplayCode(currency)}`}
            inputComponent={<StakeInputDesktop onClose={closePopover} is_open={is_open} />}
        />
    );
};

const Stake = observer(({ is_minimized, is_automation }: TTradeParametersProps) => {
    const {
        amount,
        currency,
        contract_type,
        symbol,
        has_open_accu_contract,
        is_automation_params_locked,
        is_market_closed,
        is_multiplier,
        trade_types,
        trade_type_tab,
        proposal_info,
        onChange,
        is_automation_tab,
    } = useTraderStore();
    const automation_store = React.useContext(AutomationStoreContext);
    const { is_error_matching_field: has_error } = useTradeError({ error_fields: ['stake', 'amount'] });

    // Keep initial_stake in sync with the stake field in automation context.
    // `is_automation_tab` only flips on desktop (the panel-tab switcher); the
    // mobile /automate route relies on the `is_automation` prop instead.
    React.useEffect(() => {
        if ((is_automation_tab || is_automation) && amount && automation_store) {
            automation_store.setStrategyParam('initial_stake', String(amount));
        }
    }, [amount, is_automation_tab, is_automation, automation_store]);

    const [is_open, setIsOpen] = React.useState(false);
    const [active_tab, setActiveTab] = React.useState<'chips' | 'input'>('chips');

    const contract_types = getDisplayedContractTypes(trade_types, contract_type, trade_type_tab);
    const is_all_types_with_errors = contract_types.every(item => proposal_info?.[item]?.has_error);

    // Showing snackbar for all cases, except when it is Rise/Fall or Digits and only one subtype has error
    const should_show_snackbar = contract_types.length === 1 || is_multiplier || is_all_types_with_errors;

    const handleTabChange = (tab: 'chips' | 'input') => {
        setActiveTab(tab);
    };

    const onClose = React.useCallback(() => {
        setIsOpen(false);
        setActiveTab('chips');
    }, []);

    const handleChipSelect = React.useCallback(
        (chip_amount: number) => {
            onChange({ target: { name: 'amount', value: chip_amount } });
        },
        [onChange]
    );

    return (
        <TradeParameterPopover
            label={
                <Localize
                    i18n_default_text={is_automation_tab ? 'Initial stake' : 'Stake'}
                    key={`stake${is_minimized ? '-minimized' : ''}`}
                />
            }
            value={`${getCurrencySymbol(currency)}${amount}`}
            is_minimized={is_minimized}
            disabled={has_open_accu_contract || is_market_closed}
            is_locked={is_automation_params_locked}
            has_error={has_error && should_show_snackbar}
            popover_classname='stake-popover'
            popoverWidth={376}
            header={<TabSelector activeTab={active_tab} onTabChange={handleTabChange} />}
            onOpen={() => setIsOpen(true)}
            onClose={onClose}
        >
            <StakePopoverContent
                active_tab={active_tab}
                amount={amount}
                currency={currency}
                is_open={is_open}
                contract_type={contract_type}
                symbol={symbol}
                onChipSelect={handleChipSelect}
            />
        </TradeParameterPopover>
    );
});

export default Stake;
