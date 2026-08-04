import { observer } from 'mobx-react-lite';

import { type TAutoRun, type TAutoStrategyDescriptor } from '@deriv/api';
import { TooltipPortal } from '@deriv/components';
import { LabelPairedCircleInfoMdRegularIcon } from '@deriv/quill-icons';
import { getContractTypeDisplay, getSymbolDisplayName } from '@deriv/shared';
import { Localize, useTranslations } from '@deriv-com/translations';

import { useAutomationStore } from 'Stores/useAutomationStore';

import './automation-status-info.scss';

/**
 * Resolves the human-readable summary of a live run from the auto_get payload
 * (`active_run`): strategy name, contract direction, and market. Returns null if
 * any part can't be resolved, so the caller can hide the affordance instead of
 * showing a half-empty sentence.
 */
export const getAutomationRunSummary = (
    active_run: TAutoRun | null,
    available_strategies: TAutoStrategyDescriptor[]
): { strategy: string; contract: string; market: string } | null => {
    if (!active_run?.contract_template) return null;
    const strategy = available_strategies.find(s => s.strategy_id === active_run.strategy_id)?.display_name;
    // `getContractTypeDisplay` is typed `ReactNode` (config names allow markup); for
    // automation's trade types it's always the plain label string.
    const contract_display = getContractTypeDisplay(active_run.contract_template.contract_type);
    const contract = typeof contract_display === 'string' ? contract_display : '';
    const market = getSymbolDisplayName(active_run.contract_template.underlying_symbol);
    if (!strategy || !contract || !market) return null;
    return { strategy, contract, market };
};

/**
 * Info affordance shown next to "Status: Running/Paused" — hover (desktop) / tap
 * (mobile) reveals what's running, sourced from the auto_get run payload.
 */
const AutomationStatusInfo = observer(() => {
    const { active_run, available_strategies, is_running, is_paused } = useAutomationStore();
    // Re-render on language switch so the localized contract label refreshes.
    useTranslations();

    if (!is_running && !is_paused) return null;

    const summary = getAutomationRunSummary(active_run, available_strategies);
    if (!summary) return null;

    const message = is_paused ? (
        <Localize
            i18n_default_text='A {{strategy}} strategy automation is paused for {{contract}} contract in {{market}} market.'
            values={summary}
        />
    ) : (
        <Localize
            i18n_default_text='A {{strategy}} strategy automation is running for {{contract}} contract in {{market}} market.'
            values={summary}
        />
    );

    return (
        <TooltipPortal message={message} position='left' className='automation-status-info__tooltip'>
            <LabelPairedCircleInfoMdRegularIcon className='automation-status-info__icon' />
        </TooltipPortal>
    );
});

export default AutomationStatusInfo;
