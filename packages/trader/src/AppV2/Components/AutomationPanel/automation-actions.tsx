import React from 'react';
import { observer } from 'mobx-react-lite';

import { StandalonePauseFillIcon, StandalonePlayFillIcon, StandaloneSquareFillIcon } from '@deriv/quill-icons';
import { useStore } from '@deriv/stores';
import { Button, Text } from '@deriv-com/quill-ui';
import { Localize, useTranslations } from '@deriv-com/translations';

import useRunControls from 'AppV2/Hooks/useRunControls';
import { getTradeTypeTabsList } from 'AppV2/Utils/trade-params-utils';
import { useAutomationStore } from 'Stores/useAutomationStore';
import { useTraderStore } from 'Stores/useTraderStores';

import './automation-actions.scss';

/**
 * Renders the automation run status + Run/Pause/Stop controls.
 *
 * Split out from `AutomationPanel` so it can live in the non-scrollable bottom
 * strip of `.trade-params` (alongside the date/time `TradeParamsFooter`) while
 * the automation fields stay in the scrollable area above.
 */
const AutomationActions = observer(() => {
    const { contract_type, currency, trade_type_tab } = useTraderStore();
    const {
        ui: { setSidebarFlyout },
    } = useStore();
    const automation_store = useAutomationStore();
    const { run_status, is_running, is_paused, last_error } = automation_store;
    const { localize } = useTranslations();

    const {
        handleRunClick,
        handleStopClick,
        handlePauseClick,
        handleResumeClick,
        isStarting,
        is_busy,
        is_run_disabled,
    } = useRunControls({
        onRunStarted: () => setSidebarFlyout('positions'),
    });

    // Clear any previous validation/start error when the user switches the
    // trade type or sub-tab — otherwise a stale "Martingale does not support
    // this trade type" message would persist after they moved to a supported
    // type. The error will be re-set on the next Run click if it still applies.
    React.useEffect(() => {
        automation_store.resetError();
    }, [contract_type, trade_type_tab, automation_store]);

    const display_currency = currency || 'USD';
    const tab_index = getTradeTypeTabsList(contract_type).findIndex(tab => tab.contract_type === trade_type_tab);
    const is_starting = isStarting || run_status === 'starting';
    const run_button_color = tab_index > 0 ? 'sell' : 'purchase';

    return (
        <div className='automation-actions'>
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

            {last_error && !(is_running || is_paused) && (
                <div className='automation-actions__error' role='alert'>
                    <Text size='sm'>{last_error.message}</Text>
                </div>
            )}

            <div className='automation-actions__run'>
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
                        className='automation-actions__run-button'
                        label={is_starting ? localize('Starting...') : localize('Run')}
                        onClick={is_starting ? undefined : handleRunClick}
                        disabled={is_starting || is_run_disabled}
                        icon={<StandalonePlayFillIcon iconSize='sm' fill='currentColor' />}
                    />
                )}
            </div>
        </div>
    );
});

export default AutomationActions;
