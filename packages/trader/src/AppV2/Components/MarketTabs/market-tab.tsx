import { useEffect, useRef } from 'react';
import clsx from 'clsx';

import { StandaloneCircleXmarkFillIcon } from '@deriv/quill-icons';
import { getContractTypesConfig, getSymbolDisplayName } from '@deriv/shared';
import { CaptionText, Text } from '@deriv-com/quill-ui';

import { getTradeTypeForContractType } from 'AppV2/Utils/market-selection-utils';
import { TOpenMarket } from 'AppV2/Utils/open-markets-utils';

import ProfitAmount from '../ProfitAmount';
import SymbolIconsMapper from '../SymbolIconsMapper/symbol-icons-mapper';

// Width (px) of the market-tabs edge-fade overlays; the active-tab reveal insets the visible edge by
// this much so it clears the fade.
const FADE = 32;

type TMarketTab = {
    market: TOpenMarket;
    is_active: boolean;
    /** Whether this tab can be removed — hidden when it's the only open market. */
    is_removable?: boolean;
    /** Whether this tab's trade type is unavailable in the current mode — greyed out, not selectable. */
    is_disabled?: boolean;
    /** Live P/L of the open positions for this market + trade type; `null` when none are open. */
    profit?: number | null;
    currency?: string;
    onSelect: (market: TOpenMarket) => void;
    onRemove: (market: TOpenMarket) => void;
    /** Called when a disabled tab is clicked — used to explain why (e.g. locked during automation). */
    onDisabledClick?: (market: TOpenMarket) => void;
};

/**
 * One market tab on the Trade page strip. The active tab is expanded (icon + market name + trade
 * type + a remove ✕); inactive tabs are compact (mobile: icon only). The ✕ is always rendered but
 * hidden by CSS — shown on the active tab, and on hover on desktop. Tapping an inactive tab activates
 * it; tapping the already-active tab opens the selector to replace it (handled by the parent).
 */
const MarketTab = ({
    market,
    is_active,
    is_removable = true,
    is_disabled = false,
    profit,
    currency,
    onSelect,
    onRemove,
    onDisabledClick,
}: TMarketTab) => {
    // Prefer the AppV2 trade-type name (e.g. Vanillas) over the contract config title, which for
    // Vanilla is the sub-type pair "Call/Put"; fall back to the config title for anything not in the
    // AppV2 trade-type list. (For every other trade type the two already match.)
    const trade_type_title =
        getTradeTypeForContractType(market.contract_type)?.tradeType ??
        getContractTypesConfig()[market.contract_type]?.title;
    const has_profit = typeof profit === 'number';
    const tab_ref = useRef<HTMLDivElement>(null);

    // When a tab becomes active it expands (its label appears) while the previously-active tab
    // collapses — both over ~0.3s. We poll each animation frame and scroll the strip directly (all
    // maths screen-physical, so `scrollBy` and the rects behave the same LTR/RTL) to keep the tab in
    // view as it grows. The anchor is chosen ONCE from where the tab sits on screen: a tab before the
    // strip's midpoint keeps its natural left-anchored, rightward growth; a tab past the midpoint has
    // its RIGHT edge pinned where it began so the label grows toward the centre instead of overrunning
    // the end and yanking the whole tab back into view. The 32px insets keep the visible edge clear of
    // the edge-fade overlays (skipped for the first tab, which sits flush at the start).
    useEffect(() => {
        const el = tab_ref.current;
        if (!is_active || !el) return undefined;
        const scroller = el.parentElement;
        let anchor_right: number | null = null; // pinned right-edge x for a right-of-centre tab
        const reveal = () => {
            if (!scroller) {
                el.scrollIntoView?.({ inline: 'nearest', block: 'nearest' });
                return;
            }
            const tab = el.getBoundingClientRect();
            const view = scroller.getBoundingClientRect();
            const lead_inset = el.previousElementSibling ? FADE : 0;
            // Decide the growth direction from the tab's position at activation.
            if (anchor_right === null) {
                const past_mid = (tab.left + tab.right) / 2 > (view.left + view.right) / 2;
                // Pin the right edge where it starts (clamped inside the end fade); NaN sentinel means
                // "left-anchored" so we fall through to the natural rightward-growth branch below.
                anchor_right = past_mid ? Math.min(tab.right, view.right - FADE) : NaN;
            }
            let delta = 0;
            if (!Number.isNaN(anchor_right)) {
                // Right-of-centre: hold the right edge steady so the label spills toward the start…
                delta = tab.right - anchor_right;
                // …but never bury the leading edge under the start fade (caps growth for a wide tab).
                delta = Math.min(delta, tab.left - (view.left + lead_inset));
            } else {
                const lead_room = tab.left - view.left;
                const right_over = tab.right - view.right;
                if (lead_room < lead_inset - 1) {
                    // Reveal the leading edge just past the fade (priority — even if the ✕ clips).
                    delta = lead_room - lead_inset;
                } else if (right_over > 1) {
                    // Reveal the trailing edge without pushing the leading edge back under the fade.
                    delta = Math.min(right_over, Math.max(0, lead_room - lead_inset));
                }
            }
            if (Math.abs(delta) > 0.5) scroller.scrollBy({ left: delta });
        };
        // Poll for the length of the activate/collapse transition (~0.3s) plus a small tail.
        let raf = 0;
        const loop = () => {
            reveal();
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        const stop = setTimeout(() => cancelAnimationFrame(raf), 400);
        return () => {
            clearTimeout(stop);
            cancelAnimationFrame(raf);
        };
    }, [is_active]);

    const handleSelect = () => {
        if (is_disabled) onDisabledClick?.(market);
        else onSelect(market);
    };

    return (
        <div
            ref={tab_ref}
            className={clsx('market-tab', {
                'market-tab--active': is_active,
                'market-tab--disabled': is_disabled,
                'market-tab--disabled-interactive': is_disabled && !!onDisabledClick,
                // Drives the desktop P/L number colour and the mobile P/L glow.
                'market-tab--profit-positive': has_profit && (profit as number) > 0,
                'market-tab--profit-negative': has_profit && (profit as number) < 0,
            })}
            data-testid='dt_market_tab'
            role='button'
            tabIndex={is_disabled ? -1 : 0}
            aria-current={is_active}
            aria-disabled={is_disabled}
            onClick={handleSelect}
            onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSelect();
                }
            }}
        >
            <SymbolIconsMapper symbol={market.symbol} />
            <div className='market-tab__text'>
                <Text size='sm' bold>
                    {getSymbolDisplayName(market.symbol)}
                </Text>
                {trade_type_title && (
                    <CaptionText className='market-tab__subtitle' size='sm'>
                        {trade_type_title}
                        {has_profit && (
                            <span className='market-tab__profit'>
                                <span className='market-tab__profit-dot'>•</span>
                                <ProfitAmount amount={profit as number} currency={currency} />
                            </span>
                        )}
                    </CaptionText>
                )}
            </div>
            {is_removable && (
                <button
                    type='button'
                    className='market-tab__close'
                    aria-label='Remove market'
                    tabIndex={is_active ? 0 : -1}
                    onClick={event => {
                        event.stopPropagation();
                        onRemove(market);
                    }}
                >
                    <StandaloneCircleXmarkFillIcon iconSize='sm' fill='var(--component-textIcon-normal-subtle)' />
                </button>
            )}
        </div>
    );
};

export default MarketTab;
