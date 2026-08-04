import { Step } from 'react-joyride';

import { Localize } from '@deriv-com/translations';

import { TRADE_PANEL_TABS, type TTradePanelTab } from 'AppV2/Components/AutomationPanel/automation-config';

/** Store actions the tour drives between steps so each anchor is on-screen for the breakpoint. */
export type TTourActions = {
    setMarketSelectorOpen: (open: boolean) => void;
    setActiveTradePanelTab: (tab: TTradePanelTab) => void;
};

export type TOnboardingStep = Step & {
    /** Runs BEFORE the step is shown, to CREATE its anchor (e.g. open the market selector). The
     * tour waits for the anchor to mount before advancing. */
    prepare?: (actions: TTourActions) => void;
    /** Runs AFTER joyride re-anchors (from the step-index effect) — for side effects that must not
     * share the advance tick, e.g. closing the selector or switching the panel tab. */
    enter?: (actions: TTourActions) => void;
    /** Desktop: lift the trade-panel switcher above the tour overlay so both items stay bright next
     * to the spotlighted card — matches the design. */
    spotlight_switcher?: boolean;
};

/**
 * Unified trade-page tour. Copy is shared across breakpoints; anchors and the per-step hooks differ
 * — desktop is a single screen with a side panel, mobile navigates via the bottom nav.
 */
const getOnboardingSteps = (isMobile: boolean): TOnboardingStep[] => [
    {
        title: <Localize i18n_default_text='Multiple tabs' />,
        content: <Localize i18n_default_text='Trade multiple markets side by side. Give every trade its own tab.' />,
        // The whole strip — the add (+) button and the open market tab(s) — so the spotlight frames
        // both, per the design (not just the + icon).
        target: '.market-tabs',
        placement: 'bottom-start',
        disableScrollParentFix: true,
    },
    {
        title: <Localize i18n_default_text='Trade types and markets' />,
        content: <Localize i18n_default_text="Find trade types, markets, and today's top movers all in one place." />,
        target: isMobile ? '.market-selection' : '.market-selection-desktop',
        // Mobile: the selector is a full-height page, so a top/bottom anchor lands off-screen. A
        // 'center' step repinned to the bottom (below) reads as a bottom-sheet callout, always visible.
        placement: isMobile ? 'center' : 'right',
        prepare: ({ setMarketSelectorOpen }) => setMarketSelectorOpen(true),
        ...(isMobile && {
            // Full brightness (per design): the callout floats over the selector with no dim. Leaving
            // it interactive is fine for this "here's where you browse" step.
            disableOverlay: true,
            floaterProps: {
                styles: {
                    floaterCentered: { top: 'auto', bottom: 'var(--core-spacing-800)', transform: 'translateX(-50%)' },
                },
            },
        }),
    },
    {
        title: <Localize i18n_default_text='Manual trading' />,
        content: (
            <Localize i18n_default_text="Stay in control of every trade. Configure your trade and buy when you're ready." />
        ),
        target: isMobile ? '.bottom-nav-item--trade' : '.trade-params__content',
        placement: isMobile ? 'top' : 'left',
        spotlight_switcher: !isMobile,
        enter: ({ setMarketSelectorOpen, setActiveTradePanelTab }) => {
            setMarketSelectorOpen(false);
            if (!isMobile) setActiveTradePanelTab(TRADE_PANEL_TABS.TRADE);
        },
    },
    {
        title: <Localize i18n_default_text='Automated trading' />,
        content: (
            <Localize i18n_default_text='Let your strategy do the work. Configure your strategy, then tap Run to start automated trading.' />
        ),
        target: isMobile ? '.bottom-nav-item--automate' : '.trade-params__content',
        placement: isMobile ? 'top' : 'left',
        spotlight_switcher: !isMobile,
        enter: ({ setActiveTradePanelTab }) => {
            if (!isMobile) setActiveTradePanelTab(TRADE_PANEL_TABS.AUTOMATION);
        },
    },
    {
        title: <Localize i18n_default_text='Track your trades' />,
        content: (
            <Localize i18n_default_text='See all your open positions and monitor their performance in one place.' />
        ),
        target: isMobile ? '.bottom-nav-item--positions' : '[data-testid="dt_sidebar_positions"]',
        placement: isMobile ? 'top' : 'right',
        enter: ({ setActiveTradePanelTab }) => {
            if (!isMobile) setActiveTradePanelTab(TRADE_PANEL_TABS.TRADE);
        },
    },
];

export default getOnboardingSteps;
