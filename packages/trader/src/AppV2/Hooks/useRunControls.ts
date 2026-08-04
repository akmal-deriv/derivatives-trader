import React from 'react';

import {
    getAutomationPlatform,
    isAccumulatorContract,
    isOpen,
    trackStrategyRunClicked,
    trackStrategySessionStarted,
    trackStrategyStopClicked,
} from '@deriv/shared';
import { useStore } from '@deriv/stores';
import { useSnackbar } from '@deriv-com/quill-ui';
import { localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

import { formatAutomationErrorMessage } from 'AppV2/Components/AutomationPanel/format-automation-error';
import { SERVICE_ERROR } from 'AppV2/Utils/layout-utils';
import { getDisplayedContractTypes } from 'AppV2/Utils/trade-types-utils';
import { buildAndValidateContractTemplate, getApiContractType } from 'Stores/Modules/Trading/Helpers/contract-template';
import { useAutomationStore, useAutomationSubscription } from 'Stores/useAutomationStore';
import { useTraderStore } from 'Stores/useTraderStores';

import useAutoRunActions from './useAutoRunActions';
import useAutoStart from './useAutoStart';

type TUseRunControlsOptions = {
    /**
     * Called after a successful `startRun` once the new run has been
     * subscribed to. Desktop uses this to open the positions flyout; mobile
     * doesn't pass anything.
     */
    onRunStarted?: () => void;
};

/**
 * Shared run-control handlers (Run / Stop / Pause / Resume) consumed by
 * both `AutomationActions` (desktop) and `AutomateMobile`. Centralises:
 *   - the API contract-type derivation
 *   - strategy / contract-type / template validation
 *   - error surfacing (with field-aware message formatting)
 *   - run-status transitions
 *
 * Anything platform-specific (e.g. opening the positions sidebar) is
 * injected via `onRunStarted`.
 */
const useRunControls = ({ onRunStarted }: TUseRunControlsOptions = {}) => {
    const trade_store = useTraderStore();
    const {
        client: { balance, is_logged_in },
        common: { setServicesError },
        portfolio: { all_positions },
        ui: { is_switching_account },
    } = useStore();
    const automation_store = useAutomationStore();
    const { config, is_active, is_recovering } = automation_store;
    const { isMobile } = useDevice();

    const { startRun, isStarting, error: start_error } = useAutoStart();
    const { stop, pause, resume, isLoading: is_action_loading } = useAutoRunActions();
    const { subscribeToRun, unsubscribe: unsubscribeFromRun, resync } = useAutomationSubscription();
    const { addSnackbar } = useSnackbar();

    // Mirror manual buy: forward errors to `setServicesError`. Keep
    // field-tagged validation errors inline so the field context survives.
    React.useEffect(() => {
        if (!start_error) return;
        const error_field = (start_error as { details?: { field?: string } }).details?.field;
        if (error_field) {
            automation_store.setError({
                code: start_error.code ?? 'UnknownError',
                message: formatAutomationErrorMessage(start_error),
            });
        } else {
            setServicesError(
                {
                    code: start_error.code ?? 'UnknownError',
                    subcode: start_error.subcode,
                    message: start_error.message ?? '',
                    type: 'buy',
                },
                true
            );
        }
        automation_store.setRunStatus('idle');
    }, [start_error, automation_store, setServicesError]);

    const handleRunClick = async () => {
        if (trade_store.is_automation_params_locked) return;
        if (!is_logged_in) {
            setServicesError({ code: 'AuthorizationRequired', message: '', type: 'buy' }, false);
            return;
        }

        if (Number(balance) <= 0) {
            setServicesError(
                {
                    code: SERVICE_ERROR.INSUFFICIENT_BALANCE,
                    subcode: SERVICE_ERROR.INSUFFICIENT_BALANCE,
                    message: '',
                    type: 'buy',
                },
                true
            );
            return;
        }

        if (is_active) return;

        // Snapshot the run config at click time so the same payload backs both the
        // "Run pressed" event and the later "Session started" event (fired after the
        // async startRun, where these store values could otherwise have drifted).
        const { strategy_params } = config;
        const run_payload = {
            trade_type: trade_store.contract_type,
            strategy_name: config.strategy,
            initial_stake: trade_store.amount,
            stake_multiplier: strategy_params.multiplier || undefined,
            stake_increment: strategy_params.unit || undefined,
            profit_threshold: strategy_params.take_profit || undefined,
            loss_threshold: strategy_params.stop_loss || undefined,
            max_stake_set: !!strategy_params.max_stake,
            purchase_condition: getApiContractType(trade_store),
            duration: `${trade_store.duration} ${trade_store.duration_unit}`,
            platform: getAutomationPlatform(isMobile),
        };

        // Another device may have started a run for this account while this
        // screen was parked (auto_list isn't subscribable, so we can be stale).
        // Re-sync first and adopt the existing run instead of starting a
        // duplicate — `resync` slides the UI into the Pause/Stop state.
        const existing_run = await resync();
        if (existing_run) {
            addSnackbar({
                message: localize('Automation is already running for this account.'),
                hasCloseButton: true,
                hasFixedHeight: false,
            });
            return;
        }

        // Track the press only once we know it's a genuine new-run attempt — i.e.
        // not the "adopt an already-running session" path above. Validation/template
        // failures below still count: they're the real funnel drop-off before start.
        trackStrategyRunClicked(run_payload);

        // Same derivation as the template builder — keeps validation and
        // the buy template aligned.
        const actual_contract_type = getApiContractType(trade_store);
        const type_error = automation_store.validateContractTypeSupport(actual_contract_type);
        if (type_error) {
            automation_store.setError({ code: 'UnsupportedContractType', message: type_error });
            return;
        }

        const param_error = automation_store.validateStrategyParams();
        if (param_error) {
            automation_store.setError({ code: 'ValidationError', message: param_error });
            return;
        }

        const { template, error } = buildAndValidateContractTemplate(trade_store);
        if (error) {
            automation_store.setError({ code: 'ValidationError', message: error });
            return;
        }

        automation_store.resetError();
        automation_store.setRunStatus('starting');

        try {
            const response = await startRun(config.strategy, automation_store.buildStrategyParameters(), template);
            if (response?.auto_start) {
                // Confirmed start — funnel step 5. Fires only on a real session so it
                // gives the clean "actual runs" count distinct from the Run press above.
                trackStrategySessionStarted({ ...run_payload, session_id: response.auto_start.run_id });
                // Stash the same snapshot so the store can replay it on completion.
                automation_store.setActiveRunAnalytics(run_payload);
                automation_store.onRunStarted(response.auto_start);
                subscribeToRun(response.auto_start.run_id);
                onRunStarted?.();
            }
        } catch {
            automation_store.setRunStatus('idle');
        }
    };

    const handleStopClick = async () => {
        if (!automation_store.active_run_id) return;
        trackStrategyStopClicked({
            session_id: automation_store.active_run_id,
            trade_type: trade_store.contract_type,
            strategy_name: config.strategy,
            trades_completed: automation_store.contracts_count,
            cumulative_pnl: automation_store.net_profit,
            platform: getAutomationPlatform(isMobile),
        });
        automation_store.setRunStatus('stopping');
        try {
            await stop(automation_store.active_run_id);
            unsubscribeFromRun();
            automation_store.onRunStopped();
        } catch {
            automation_store.setRunStatus('running');
        }
    };

    const handlePauseClick = async () => {
        if (!automation_store.active_run_id) return;
        try {
            await pause(automation_store.active_run_id);
            automation_store.setRunStatus('paused');
        } catch {
            // pause failed — stay in running state
        }
    };

    const handleResumeClick = async () => {
        if (!automation_store.active_run_id) return;
        try {
            await resume(automation_store.active_run_id);
            automation_store.setRunStatus('running');
        } catch {
            // resume failed — stay in paused state
        }
    };

    // Stay disabled through account-switch + recovery — avoids a Run flash
    // before the new account's state lands.
    const is_busy = isStarting || is_action_loading || is_switching_account || is_recovering;

    // Mirror the manual Buy button: block Run on a proposal error (e.g. stake
    // out of range), except insufficient balance (surfaced via the error modal
    // on click) and MarketIsClosed (Run is already hidden then).
    const displayed_contract_types = getDisplayedContractTypes(
        trade_store.trade_types,
        trade_store.contract_type,
        trade_store.trade_type_tab
    );
    const has_blocking_proposal_error = displayed_contract_types.some(type => {
        const info = trade_store.proposal_info?.[type];
        return (
            !!info?.has_error &&
            info.error_code !== SERVICE_ERROR.INSUFFICIENT_BALANCE &&
            info.error_code !== 'MarketIsClosed'
        );
    });

    // Accumulators allow only one open contract per symbol — the BE rejects a
    // second buy. If one is already open on the current symbol (e.g. bought in
    // manual trading), block Run, mirroring manual swapping Buy for Close.
    const has_open_accu_contract =
        trade_store.is_accumulator &&
        all_positions.some(
            ({ contract_info, type }) =>
                isAccumulatorContract(type) &&
                contract_info.underlying_symbol === trade_store.symbol &&
                isOpen(contract_info)
        );

    const { is_automation_params_locked } = trade_store;

    return {
        handleRunClick,
        handleStopClick,
        handlePauseClick,
        handleResumeClick,
        isStarting,
        is_busy,
        is_run_disabled:
            is_automation_params_locked ||
            (is_logged_in && (is_busy || has_blocking_proposal_error || has_open_accu_contract)),
    };
};

export default useRunControls;
