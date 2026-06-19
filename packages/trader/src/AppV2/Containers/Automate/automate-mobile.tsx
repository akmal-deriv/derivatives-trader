import React from 'react';
import { observer } from 'mobx-react-lite';

import { Loading } from '@deriv/components';
import {
    LabelPairedChevronDownMdRegularIcon,
    StandalonePauseFillIcon,
    StandalonePlayFillIcon,
    StandaloneSquareFillIcon,
} from '@deriv/quill-icons';
import { getSymbolDisplayName, trackAnalyticsEvent } from '@deriv/shared';
import { useStore } from '@deriv/stores';
import { Button, Tag, Text, TextField } from '@deriv-com/quill-ui';
import { Localize, useTranslations } from '@deriv-com/translations';

import ActiveSymbolsList from 'AppV2/Components/ActiveSymbolsList';
import { KNOWN_PARAM_KEYS } from 'AppV2/Components/AutomationPanel/automation-config';
import AutomationErrorBanner from 'AppV2/Components/AutomationPanel/automation-error-banner';
import AutomationGuide from 'AppV2/Components/AutomationPanel/AutomationGuide';
import MaxTradeStake from 'AppV2/Components/AutomationPanel/MaxTradeStake/max-trade-stake';
import StakeMultiplier from 'AppV2/Components/AutomationPanel/StakeMultiplier/stake-multiplier';
import StrategySelector from 'AppV2/Components/AutomationPanel/StrategySelector';
import ThresholdInput from 'AppV2/Components/AutomationPanel/ThresholdInput/threshold-input';
import CurrentSpot from 'AppV2/Components/CurrentSpot';
import ServiceErrorSheet from 'AppV2/Components/ServiceErrorSheet';
import SymbolIconsMapper from 'AppV2/Components/SymbolIconsMapper/symbol-icons-mapper';
import TradeErrorSnackbar from 'AppV2/Components/TradeErrorSnackbar';
import { TradeParameters } from 'AppV2/Components/TradeParameters';
import useAutomationConfig from 'AppV2/Hooks/useAutomationConfig';
import useAutomationSupportedTradeTypes from 'AppV2/Hooks/useAutomationSupportedTradeTypes';
import useAutomationSymbolFallback from 'AppV2/Hooks/useAutomationSymbolFallback';
import useAutomationTicks from 'AppV2/Hooks/useAutomationTicks';
import useAutomationTradeTypeFallback from 'AppV2/Hooks/useAutomationTradeTypeFallback';
import useContractsFor from 'AppV2/Hooks/useContractsFor';
import useDefaultSymbol from 'AppV2/Hooks/useDefaultSymbol';
import useRunControls from 'AppV2/Hooks/useRunControls';
import { isDigitTradeType } from 'AppV2/Utils/digits';
import { getTradeTypeTabsList } from 'AppV2/Utils/trade-params-utils';
import { useAutomationStore } from 'Stores/useAutomationStore';
import { useTraderStore } from 'Stores/useTraderStores';

import TradeTypes from '../Trade/trade-types';

import 'AppV2/Components/AutomationPanel/automation-actions.scss';
import 'AppV2/Components/AutomationPanel/automation-panel.scss';
import 'AppV2/Components/TradeParameters/trade-parameters.scss';
import './automate-mobile.scss';

const AutomateMobile = observer(() => {
    const {
        common: { current_language, network_status },
        ui: { setIsChartLoading, is_dark_mode_on },
    } = useStore();
    const trade_store = useTraderStore();
    const { amount, contract_type, currency, is_market_closed, onChange, onMount, onUnmount, symbol, trade_type_tab } =
        trade_store;
    const [is_market_open, setIsMarketOpen] = React.useState(false);
    const automation_store = useAutomationStore();
    const { config, run_status, is_running, is_paused } = automation_store;
    const { trade_types } = useContractsFor();
    const supported_automation_trade_types = useAutomationSupportedTradeTypes();
    const { localize } = useTranslations();
    useDefaultSymbol();
    useAutomationTradeTypeFallback();
    useAutomationSymbolFallback();
    useAutomationTicks();

    // Filter trade types to those the BE's automation strategies actually
    // support — mirrors `trade-desktop`'s filtering.
    const displayed_trade_types = React.useMemo(
        () => trade_types.filter(({ value }) => supported_automation_trade_types.has(value)),
        [trade_types, supported_automation_trade_types]
    );

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

    const {
        handleRunClick,
        handleStopClick,
        handlePauseClick,
        handleResumeClick,
        isStarting,
        is_busy,
        is_run_disabled,
    } = useRunControls();

    const display_currency = currency || 'USD';
    const tab_index = getTradeTypeTabsList(contract_type).findIndex(tab => tab.contract_type === trade_type_tab);
    const run_button_color = tab_index > 0 ? 'sell' : 'purchase';

    // Mirrors trade-mobile's `onTradeTypeSelect`: matches the clicked chip
    // label back to a trade type and forwards the new contract_type to the
    // trade store.
    const onTradeTypeSelect = React.useCallback(
        (e: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
            const selected = trade_types.find(({ text }) => text === (e.target as HTMLButtonElement).textContent);
            if (!selected) return;
            onChange({ target: { name: 'contract_type', value: selected.value } });
            trackAnalyticsEvent('ce_trade_types_form_v2', {
                action: 'select_trade_type',
                trade_type_name: selected.text || '',
            });
        },
        [trade_types, onChange]
    );

    React.useEffect(() => {
        onMount();
        setIsChartLoading(false);
        return onUnmount;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current_language, network_status.class]);

    if (!trade_types.length) {
        return <Loading.DTraderV2 />;
    }

    return (
        <div className='automate-mobile'>
            <AutomationErrorBanner />
            <div className='automate-mobile__main'>
                <AutomationGuide />
                <TradeTypes
                    contract_type={contract_type}
                    onTradeTypeSelect={onTradeTypeSelect}
                    trade_types={displayed_trade_types}
                    is_dark_mode_on={is_dark_mode_on}
                />
                <div className='automate-mobile__content'>
                    <div
                        className='automate-mobile__market-field'
                        role='button'
                        tabIndex={0}
                        onClick={() => setIsMarketOpen(true)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setIsMarketOpen(true);
                            }
                        }}
                    >
                        <TextField
                            variant='fill'
                            readOnly
                            label={<Localize i18n_default_text='Market' />}
                            value={getSymbolDisplayName(symbol)}
                            leftIcon={<SymbolIconsMapper symbol={symbol} />}
                            rightIcon={
                                <div className='automate-mobile__market-indicators'>
                                    {is_market_closed && (
                                        <Tag
                                            label={<Localize key='exchange-closed' i18n_default_text='CLOSED' />}
                                            color='error'
                                            variant='fill'
                                            showIcon={false}
                                        />
                                    )}
                                    <LabelPairedChevronDownMdRegularIcon fill='var(--component-textIcon-normal-default)' />
                                </div>
                            }
                            noStatusIcon
                            className='trade-params__option automate-mobile__selector-field'
                        />
                    </div>
                    <ActiveSymbolsList isOpen={is_market_open} setIsOpen={setIsMarketOpen} />

                    {/* Live spot + last digit for digit trade types (no chart here). */}
                    {isDigitTradeType(contract_type) && <CurrentSpot />}

                    {/* Trade Configuration */}
                    <div className='automate-mobile__trade-config'>
                        <TradeParameters is_automation />
                    </div>

                    {/* Strategy parameters */}
                    <div className='automate-mobile__automation-config'>
                        <Text size='sm' bold className='automate-mobile__section-header'>
                            <Localize i18n_default_text='Strategy parameters' />
                        </Text>
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

                    <div className='automate-mobile__automation-config'>
                        <Text size='sm' bold className='automate-mobile__section-header'>
                            <Localize i18n_default_text='Risk management' />
                        </Text>

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

            {/* Sticky bottom buttons — hidden when market is closed (matches manual). */}
            {!is_market_closed && (
                <div className='automate-mobile__run-button'>
                    {(is_running || is_paused) && (
                        <div className='automation-actions__status'>
                            <Text size='sm' bold>
                                <Localize
                                    i18n_default_text='Status: {{status}}'
                                    values={{ status: is_paused ? localize('Paused') : localize('Running') }}
                                />
                            </Text>
                            <Text size='sm'>
                                <Localize
                                    i18n_default_text='Contracts: {{count}} | P/L: {{profit}} {{currency}}'
                                    values={{
                                        count: automation_store.contracts_count,
                                        profit: automation_store.net_profit.toFixed(2),
                                        currency: display_currency,
                                    }}
                                />
                            </Text>
                        </div>
                    )}
                    {is_running || is_paused || run_status === 'stopping' ? (
                        <div className='automation-actions__run-actions'>
                            <Button
                                color='black-white'
                                size='lg'
                                fullWidth
                                variant='secondary'
                                label={is_paused ? localize('Resume') : localize('Pause')}
                                onClick={is_paused ? handleResumeClick : handlePauseClick}
                                disabled={is_busy}
                                icon={
                                    is_paused ? (
                                        <StandalonePlayFillIcon iconSize='sm' fill='currentColor' />
                                    ) : (
                                        <StandalonePauseFillIcon iconSize='sm' fill='currentColor' />
                                    )
                                }
                            />
                            <Button
                                size='lg'
                                fullWidth
                                label={localize('Stop')}
                                onClick={handleStopClick}
                                disabled={run_status === 'stopping' || is_busy}
                                icon={<StandaloneSquareFillIcon iconSize='sm' fill='currentColor' />}
                                className='automation-actions__run-stop'
                            />
                        </div>
                    ) : (
                        <Button
                            color={run_button_color}
                            size='lg'
                            fullWidth
                            label={isStarting || run_status === 'starting' ? localize('Starting...') : localize('Run')}
                            onClick={handleRunClick}
                            disabled={is_run_disabled}
                            icon={<StandalonePlayFillIcon iconSize='sm' fill='currentColor' />}
                            className='automate-mobile__run-button-inner'
                        />
                    )}
                </div>
            )}
            <ServiceErrorSheet />
            <TradeErrorSnackbar error_fields={['stake', 'amount']} should_show_snackbar />
        </div>
    );
});

export default AutomateMobile;
