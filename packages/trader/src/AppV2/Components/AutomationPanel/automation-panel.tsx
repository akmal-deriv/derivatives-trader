import { observer } from 'mobx-react-lite';

import { Text } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

import useAutomationConfig from 'AppV2/Hooks/useAutomationConfig';
import { useAutomationStore } from 'Stores/useAutomationStore';
import { useTraderStore } from 'Stores/useTraderStores';

import MaxTradeStake from './MaxTradeStake/max-trade-stake';
import StakeMultiplier from './StakeMultiplier/stake-multiplier';
import ThresholdInput from './ThresholdInput/threshold-input';
import { KNOWN_PARAM_KEYS } from './automation-config';
import StrategySelector from './StrategySelector';

import './automation-panel.scss';

/**
 * Renders the strategy + risk-management configuration for automation.
 * Status display + Run/Pause/Stop controls live in `AutomationActions` so
 * they can be rendered in the non-scrollable bottom strip of `.trade-params`.
 */
const AutomationPanel = observer(() => {
    const trade_store = useTraderStore();
    const { amount, currency } = trade_store;
    const automation_store = useAutomationStore();
    const { config } = automation_store;

    const {
        strategy_options,
        strategy_description,
        schema_keys,
        getSchemaDescription,
        getParamNumber,
        getParamNumberOrNull,
        setParamFromNumber,
        setParamFromNumberOrNull,
    } = useAutomationConfig();

    const display_currency = currency || 'USD';

    return (
        <div className='automation-panel'>
            <div className='automation-panel__section'>
                <Text size='sm' bold className='automation-panel__header'>
                    <Localize i18n_default_text='Strategy parameters' />
                </Text>

                <div className='automation-panel__fields'>
                    <StrategySelector
                        options={strategy_options}
                        selectedValue={config.strategy}
                        description={strategy_description}
                        onSelect={value => automation_store.setConfig('strategy', value)}
                    />

                    {schema_keys.has(KNOWN_PARAM_KEYS.MULTIPLIER) && (
                        <StakeMultiplier
                            strategy={config.strategy}
                            selectedValue={getParamNumber(KNOWN_PARAM_KEYS.MULTIPLIER)}
                            description={getSchemaDescription(KNOWN_PARAM_KEYS.MULTIPLIER)}
                            onSelect={value => setParamFromNumber(KNOWN_PARAM_KEYS.MULTIPLIER, value)}
                        />
                    )}

                    {schema_keys.has(KNOWN_PARAM_KEYS.UNIT) && (
                        <StakeMultiplier
                            strategy={config.strategy}
                            selectedValue={getParamNumber(KNOWN_PARAM_KEYS.UNIT)}
                            description={getSchemaDescription(KNOWN_PARAM_KEYS.UNIT)}
                            onSelect={value => setParamFromNumber(KNOWN_PARAM_KEYS.UNIT, value)}
                        />
                    )}

                    {schema_keys.has(KNOWN_PARAM_KEYS.MAX_STAKE) && (
                        <MaxTradeStake
                            currency={display_currency}
                            initialValue={getParamNumberOrNull(KNOWN_PARAM_KEYS.MAX_STAKE)}
                            initialStake={Number(amount) || undefined}
                            description={getSchemaDescription(KNOWN_PARAM_KEYS.MAX_STAKE)}
                            onSave={value => setParamFromNumberOrNull(KNOWN_PARAM_KEYS.MAX_STAKE, value)}
                        />
                    )}
                </div>
            </div>

            <div className='automation-panel__section'>
                <Text size='sm' bold className='automation-panel__header'>
                    <Localize i18n_default_text='Risk management' />
                </Text>

                <div className='automation-panel__fields'>
                    {schema_keys.has(KNOWN_PARAM_KEYS.TAKE_PROFIT) && (
                        <ThresholdInput
                            threshold_type='take_profit'
                            description={getSchemaDescription(KNOWN_PARAM_KEYS.TAKE_PROFIT)}
                            currency={display_currency}
                            initialValue={getParamNumber(KNOWN_PARAM_KEYS.TAKE_PROFIT)}
                            onSave={value => setParamFromNumber(KNOWN_PARAM_KEYS.TAKE_PROFIT, value)}
                        />
                    )}

                    {schema_keys.has(KNOWN_PARAM_KEYS.STOP_LOSS) && (
                        <ThresholdInput
                            threshold_type='stop_loss'
                            description={getSchemaDescription(KNOWN_PARAM_KEYS.STOP_LOSS)}
                            currency={display_currency}
                            initialValue={getParamNumber(KNOWN_PARAM_KEYS.STOP_LOSS)}
                            onSave={value => setParamFromNumber(KNOWN_PARAM_KEYS.STOP_LOSS, value)}
                        />
                    )}
                </div>
            </div>
        </div>
    );
});

export default AutomationPanel;
