import React from 'react';

// SmartCharts has no close callback — its state event only fires on open — so we read the selector's
// open state from the DOM: it toggles `stxMenuActive` on `.cq-chart-title`. TODO: replace with a
// SmartCharts close/toggle callback if one is added upstream.
const CHART_TITLE_SELECTOR = '.cq-chart-title';
const ACTIVE_CLASS = 'stxMenuActive';
// Fail-safe: if the selector never opens (chart didn't render, or SmartCharts changed its DOM), stop
// deferring after this grace period so onboarding isn't stuck for the session.
const OPEN_DETECTION_TIMEOUT_MS = 4000;
const POLL_INTERVAL_MS = 100;

/**
 * Tracks whether the desktop chart-title market selector is open.
 *
 * @param enabled - observe only when we opened it on load (e.g. via `view_markets`); else always `false`.
 * @returns `true` while open, `false` once closed (or if it never opens within the grace period).
 */
const useChartMarketSelectorOpen = (enabled: boolean) => {
    const [is_open, setIsOpen] = React.useState(enabled);

    React.useEffect(() => {
        if (!enabled) return undefined;

        let observer: MutationObserver | undefined;
        let poll_id = 0;
        let deadline_id = 0;
        let has_opened = false;

        // One-shot: deferral only covers the initial open→close, so tear everything down once resolved.
        // Otherwise a later manual open would re-trigger and re-hide onboarding.
        const stop = () => {
            if (poll_id) window.clearInterval(poll_id);
            if (deadline_id) window.clearTimeout(deadline_id);
            observer?.disconnect();
            poll_id = 0;
            deadline_id = 0;
            observer = undefined;
        };

        const sync = (el: Element) => {
            if (el.classList.contains(ACTIVE_CLASS)) {
                has_opened = true;
                setIsOpen(true);
            } else if (has_opened) {
                // First close after opening — the deferral cycle is done.
                setIsOpen(false);
                stop();
            }
        };

        poll_id = window.setInterval(() => {
            const el = document.querySelector(CHART_TITLE_SELECTOR);
            if (!el) return;
            window.clearInterval(poll_id);
            poll_id = 0;
            sync(el);
            observer = new MutationObserver(() => sync(el));
            observer.observe(el, { attributes: true, attributeFilter: ['class'] });
        }, POLL_INTERVAL_MS);

        deadline_id = window.setTimeout(() => {
            // Fail-safe gave up waiting: show onboarding and stop, so a late open can't re-hide it.
            if (!has_opened) {
                setIsOpen(false);
                stop();
            }
        }, OPEN_DETECTION_TIMEOUT_MS);

        return stop;
    }, [enabled]);

    return is_open;
};

export default useChartMarketSelectorOpen;
