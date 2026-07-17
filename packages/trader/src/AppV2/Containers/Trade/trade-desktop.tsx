import React from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';

import { useLocalStorageData } from '@deriv/api';
import { Loading } from '@deriv/components';
import { getIsMigratedUser, getSymbolDisplayName, getViewMarketsFromURL, trackAnalyticsEvent } from '@deriv/shared';
import { useStore } from '@deriv/stores';
import { Loader } from '@deriv-com/ui';

import AccountHeader from 'AppV2/Components/AccountHeader';
import AccumulatorStats from 'AppV2/Components/AccumulatorStats';
import AutomationActions from 'AppV2/Components/AutomationPanel/automation-actions';
import { TRADE_PANEL_TABS } from 'AppV2/Components/AutomationPanel/automation-config';
import AutomationPanel from 'AppV2/Components/AutomationPanel/automation-panel';
import AutomationGuide from 'AppV2/Components/AutomationPanel/AutomationGuide';
import ClosedMarketMessage from 'AppV2/Components/ClosedMarketMessage';
import Guide from 'AppV2/Components/Guide';
import { AutomationOnboarding } from 'AppV2/Components/OnboardingGuide/AutomationOnboarding';
import OnboardingGuide, { OnboardingGuideDesktop } from 'AppV2/Components/OnboardingGuide/GuideForPages';
import { MigrationOnboarding } from 'AppV2/Components/OnboardingGuide/MigrationOnboarding';
import PurchaseButton from 'AppV2/Components/PurchaseButton';
import TradeErrorSnackbar from 'AppV2/Components/TradeErrorSnackbar';
import TradePanelTabs from 'AppV2/Components/TradePanelTabs/trade-panel-tabs';
import { TradeParameters } from 'AppV2/Components/TradeParameters';
import TradeParamsFooter from 'AppV2/Components/TradeParamsFooter';
import useAutomationSupportedTradeTypes from 'AppV2/Hooks/useAutomationSupportedTradeTypes';
import useAutomationSymbolFallback from 'AppV2/Hooks/useAutomationSymbolFallback';
import useAutomationTradeTypeFallback from 'AppV2/Hooks/useAutomationTradeTypeFallback';
import useChartMarketSelectorOpen from 'AppV2/Hooks/useChartMarketSelectorOpen';
// Commented out to use chart's native market selector instead
// import MarketSelector from 'AppV2/Components/MarketSelector';
import useContractsFor from 'AppV2/Hooks/useContractsFor';
import useDefaultSymbol from 'AppV2/Hooks/useDefaultSymbol';
import useIsAutomationEnabled from 'AppV2/Hooks/useIsAutomationEnabled';
import useTabletLandscape from 'AppV2/Hooks/useTabletLandscape';
import { getDisplayedContractTypes } from 'AppV2/Utils/trade-types-utils';
import { useTraderStore } from 'Stores/useTraderStores';

import { TradeChart } from '../Chart';

import TradeTypes from './trade-types';

const TradeDesktop = observer(() => {
    const chart_ref = React.useRef<HTMLDivElement>(null);
    const {
        client,
        common: { current_language, network_status },
        ui: { is_dark_mode_on, active_sidebar_flyout },
    } = useStore();
    const { is_logged_in } = client;
    const {
        active_symbols,
        contract_type,
        is_accumulator,
        is_automation_tab,
        is_multiplier,
        is_chart_loading,
        is_market_closed,
        onChange,
        onMount,
        onUnmount,
        proposal_info,
        setActiveTradePanelTab,
        should_show_active_symbols_loading,
        trade_types: trade_types_store,
        trade_type_tab,
        is_reconciling_url_trade_type,
    } = useTraderStore();

    const { trade_types } = useContractsFor();
    const supported_automation_trade_types = useAutomationSupportedTradeTypes();
    const { is_enabled: is_automation_enabled, is_ready: is_automation_ready } = useIsAutomationEnabled();

    // When automation is off (EU), clear a stale persisted automation tab so the
    // fallback hooks don't act on it. Gate on readiness so a non-EU user's saved
    // tab isn't wiped mid-lookup.
    React.useEffect(() => {
        if (is_automation_ready && !is_automation_enabled && is_automation_tab) {
            setActiveTradePanelTab(TRADE_PANEL_TABS.TRADE);
        }
    }, [is_automation_ready, is_automation_enabled, is_automation_tab, setActiveTradePanelTab]);

    const is_automation_active = is_automation_enabled && is_automation_tab;
    const should_render_automation_panel = is_automation_active && supported_automation_trade_types.has(contract_type);

    const displayed_trade_types = React.useMemo(
        () =>
            is_automation_active
                ? trade_types.filter(({ value }) => supported_automation_trade_types.has(value))
                : trade_types,
        [is_automation_active, trade_types, supported_automation_trade_types]
    );
    useDefaultSymbol(); // This will initialize and set the default symbol
    useAutomationTradeTypeFallback();
    useAutomationSymbolFallback();
    const { should_show_portrait_loader } = useTabletLandscape({
        is_chart_loading,
        should_show_active_symbols_loading,
    });
    const [guide_dtrader_v2] = useLocalStorageData<Record<string, boolean>>('guide_dtrader_v2', {
        trade_types_selection: false,
        trade_page: false,
        positions_page: false,
    });

    const is_migrated_user = getIsMigratedUser();

    // On a `view_markets=true` landing the chart's native selector opens on load; defer onboarding until it's
    // closed so they don't overlap. Read the param on first render (before TradeChart clears it); the hook then
    // tracks the selector's open/close. Not persisted — a normal visit shows onboarding as usual.
    const [is_market_selector_opened_on_load] = React.useState(() => getViewMarketsFromURL());
    const is_market_selector_open = useChartMarketSelectorOpen(is_market_selector_opened_on_load);
    const should_defer_onboarding = is_market_selector_opened_on_load && is_market_selector_open;

    // For handling edge cases of snackbar:
    const contract_types = getDisplayedContractTypes(trade_types_store, contract_type, trade_type_tab);
    const is_all_types_with_errors = contract_types.every(item => proposal_info?.[item]?.has_error);
    const is_any_type_with_errors = contract_types.some(item => proposal_info?.[item]?.has_error);
    const is_high_low = /^high_low$/.test(contract_type.toLowerCase());

    // Showing snackbar for all cases, except when it is Rise/Fall or Digits and only one subtype has error
    const should_show_snackbar =
        contract_types.length === 1 ||
        is_multiplier ||
        is_all_types_with_errors ||
        (is_high_low && is_any_type_with_errors);

    const symbols = React.useMemo(
        () =>
            active_symbols.map(({ underlying_symbol: underlying }) => ({
                text: getSymbolDisplayName(underlying || ''),
                value: underlying || '',
            })),
        [active_symbols]
    );

    const onTradeTypeSelect = React.useCallback(
        (
            e: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>,
            source?: string,
            _trade_type_count?: number,
            tab?: 'all' | 'most_traded'
        ) => {
            const selected_trade_type = trade_types.find(
                ({ text }) => text === (e.target as HTMLButtonElement).textContent
            );
            onChange({
                target: {
                    name: 'contract_type',
                    value: selected_trade_type?.value,
                },
            });
            trackAnalyticsEvent('ce_trade_types_form_v2', {
                action: 'select_trade_type',
                trade_type_name: selected_trade_type?.text || '',
                source: source === 'trade_types_selector' ? 'trade_types_menu' : 'chip_bar',
                ...(tab && { tab }),
            });
        },
        [trade_types, onChange]
    );

    React.useEffect(() => {
        onMount();
        return onUnmount;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current_language, network_status.class]);

    return (
        <>
            {should_show_portrait_loader && <Loader isFullScreen color='var(--brand-primary)' />}
            {symbols.length && trade_types.length && !is_reconciling_url_trade_type ? (
                <div
                    className={clsx('trade', {
                        trade__logout: !is_logged_in,
                        'trade--flyout-open': active_sidebar_flyout !== null,
                    })}
                >
                    <div className='trade__header'>
                        <TradeTypes
                            contract_type={contract_type}
                            onTradeTypeSelect={onTradeTypeSelect}
                            trade_types={displayed_trade_types}
                            is_dark_mode_on={is_dark_mode_on}
                        />
                        <AccountHeader />
                    </div>
                    {/* Commented out to use chart's native market selector instead */}
                    {/* <MarketSelector /> */}
                    <div className='trade__grid'>
                        <div className='trade__chart-tooltip'>
                            <section
                                className={clsx('trade__chart', {
                                    'trade__chart--with-borderRadius': !is_accumulator,
                                })}
                                style={{
                                    height: '100%',
                                }}
                                ref={chart_ref}
                            >
                                <TradeChart />
                            </section>
                            {is_accumulator && <AccumulatorStats />}
                        </div>
                        <div className='trade-params'>
                            <div className='trade-params__scrollable'>
                                {should_render_automation_panel ? (
                                    <AutomationGuide />
                                ) : (
                                    <Guide show_guide_for_selected_contract />
                                )}
                                <TradeParameters />
                                <ClosedMarketMessage />
                                {should_render_automation_panel && <AutomationPanel />}
                            </div>
                            {!should_render_automation_panel && !is_market_closed && <PurchaseButton />}
                            {should_render_automation_panel && !is_market_closed && <AutomationActions />}
                            <TradeParamsFooter />
                        </div>
                        {is_automation_enabled && <TradePanelTabs />}
                    </div>
                    {/* Deferred while the selector is open on load; shows once closed. */}
                    {/* Existing onboarding for non-migrated users */}
                    {!is_migrated_user && !guide_dtrader_v2?.trade_page && is_logged_in && !should_defer_onboarding && (
                        <OnboardingGuide type='trade_page' />
                    )}
                    {!is_migrated_user && is_logged_in && !should_defer_onboarding && (
                        <OnboardingGuideDesktop type='trade_page' />
                    )}
                    {/* New onboarding for migrated users */}
                    {is_migrated_user && is_logged_in && !should_defer_onboarding && (
                        <MigrationOnboarding is_dark_mode_on={is_dark_mode_on} />
                    )}
                    {/* Automation intro — self-gates on the intro onboarding being done */}
                    {is_logged_in && is_automation_enabled && !should_defer_onboarding && <AutomationOnboarding />}
                </div>
            ) : (
                <Loading.DTraderV2 />
            )}
            <TradeErrorSnackbar
                error_fields={['stop_loss', 'take_profit', 'date_start', 'stake', 'amount']}
                should_show_snackbar={should_show_snackbar}
            />
        </>
    );
});

export default TradeDesktop;
