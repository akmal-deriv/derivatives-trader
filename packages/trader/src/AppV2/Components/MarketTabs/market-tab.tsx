import { useEffect, useRef } from 'react';
import clsx from 'clsx';

import { LabelPairedChevronDownCaptionRegularIcon, StandaloneCircleXmarkFillIcon } from '@deriv/quill-icons';
import { getContractTypesConfig, getSymbolDisplayName } from '@deriv/shared';
import { CaptionText, Text } from '@deriv-com/quill-ui';
import { localize } from '@deriv-com/translations';

import { getTradeTypeForContractType } from 'AppV2/Utils/market-selection-utils';
import { TOpenMarket } from 'AppV2/Utils/open-markets-utils';

import ProfitAmount from '../ProfitAmount';
import SymbolIconsMapper from '../SymbolIconsMapper/symbol-icons-mapper';

type TMarketTab = {
    market: TOpenMarket;
    is_active: boolean;
    /** Whether this tab can be removed — hidden when it's the only open market. */
    is_removable?: boolean;
    /** Whether this tab's trade type is unavailable in the current mode — greyed out, not selectable. */
    is_disabled?: boolean;
    /** Whether tapping this tab actually opens the market selector — the fact the chevron cue and the
     * `aria-haspopup` affordance advertise. Being active is necessary but not sufficient: the parent
     * can intercept the active tab's tap instead (e.g. the strip is locked by a running automation,
     * where it only surfaces a snackbar). Defaults to `is_active`; pass `false` when intercepted. */
    opens_selector?: boolean;
    /** Live P/L of the open positions for this market + trade type; `null` when none are open. */
    profit?: number | null;
    currency?: string;
    onSelect: (market: TOpenMarket) => void;
    onRemove: (market: TOpenMarket) => void;
    /** Called when a disabled tab is clicked — used to explain why (e.g. locked during automation). */
    onDisabledClick?: (market: TOpenMarket) => void;
};

/**
 * One market tab on the Trade strip: the active tab expands (icon + name + trade type + remove ✕),
 * inactive tabs are compact (mobile: icon only). Tapping an inactive tab activates it; tapping the
 * active tab opens the selector to replace it (handled by the parent).
 */
const MarketTab = ({
    market,
    is_active,
    is_removable = true,
    is_disabled = false,
    opens_selector = is_active,
    profit,
    currency,
    onSelect,
    onRemove,
    onDisabledClick,
}: TMarketTab) => {
    // Prefer the AppV2 trade-type name (e.g. Vanillas) over the config title, which for Vanilla is
    // the "Call/Put" sub-type pair; fall back to the config title otherwise.
    const trade_type_title =
        getTradeTypeForContractType(market.contract_type)?.tradeType ??
        getContractTypesConfig()[market.contract_type]?.title;
    const has_profit = typeof profit === 'number';
    const market_display_name = getSymbolDisplayName(market.symbol);
    const tab_ref = useRef<HTMLDivElement>(null);

    // Only a tab whose tap opens the selector names that action. An `aria-label` replaces the tab's
    // announced text content, so it has to carry the market + trade type too.
    let selector_tab_label: string | undefined;
    if (opens_selector) {
        selector_tab_label = trade_type_title
            ? localize('Change market and trade type: {{market}}, {{trade_type}}', {
                  market: market_display_name,
                  trade_type: trade_type_title,
              })
            : localize('Change market: {{market}}', { market: market_display_name });
    }

    // After the label expands, glide the tab fully into view (an overflow strip won't follow a tab
    // that grew past its edge). Native smooth-scroll isn't tunable, so we drive it: an instant
    // scrollIntoView finds the target (RTL/scroll-padding-safe), then we tween scrollLeft to it.
    useEffect(() => {
        const el = tab_ref.current;
        const list = el?.closest<HTMLElement>('.market-tabs__list');
        if (!is_active || !el || !list || !el.scrollIntoView) return undefined;

        let raf = 0;
        const glideIntoView = () => {
            cancelAnimationFrame(raf); // label + ✕ reveals both fire this — never run two tweens
            const from = list.scrollLeft;
            el.scrollIntoView({ inline: 'nearest', block: 'nearest' }); // instant: snaps to target
            const to = list.scrollLeft;
            const reduce_motion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
            if (to === from || reduce_motion) return; // already in view, or motion off — leave snapped

            list.scrollLeft = from; // rewind (same frame — not painted) and ease in
            const start = performance.now();
            const ease_out = (t: number) => 1 - (1 - t) ** 3;
            const step = (now: number) => {
                const t = Math.min((now - start) / 450, 1);
                list.scrollLeft = from + (to - from) * ease_out(t);
                if (t < 1) raf = requestAnimationFrame(step);
            };
            raf = requestAnimationFrame(step);
        };

        // The reveal's grid track finishing its transition bubbles up from the label to this tab.
        const onExpandEnd = (event: TransitionEvent) => {
            if (event.propertyName === 'grid-template-columns') glideIntoView();
        };
        el.addEventListener('transitionend', onExpandEnd);
        return () => {
            el.removeEventListener('transitionend', onExpandEnd);
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
            // The selector opens as a full-screen modal (mobile) / popover (desktop).
            aria-haspopup={opens_selector ? 'dialog' : undefined}
            aria-label={selector_tab_label}
            onClick={handleSelect}
            onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSelect();
                }
            }}
        >
            <SymbolIconsMapper symbol={market.symbol} />
            {/* Label + ✕ each sit in a grid reveal (mobile): track grows 0fr→content width; the
                inner clip hides content while collapsed. */}
            <div className='market-tab__reveal'>
                <div className='market-tab__clip'>
                    <div className='market-tab__text'>
                        <Text size='sm' bold>
                            {market_display_name}
                        </Text>
                        {trade_type_title && (
                            <CaptionText className='market-tab__subtitle' size='sm'>
                                {/* The row is one truncating text line, so DOM order is what decides
                                    which part survives a shrinking tab: the trade type reads first and
                                    keeps its width, the cue and the amount drop off the end. */}
                                {trade_type_title}
                                {/* Marks the tab as the control that changes market + trade type — so it
                                    shows only where the tap really opens the selector. Decorative only —
                                    the whole tab stays the tap target, so no stopPropagation here. */}
                                {opens_selector && (
                                    <span
                                        className='market-tab__chevron'
                                        data-testid='dt_market_tab_chevron'
                                        aria-hidden='true'
                                    >
                                        <LabelPairedChevronDownCaptionRegularIcon fill='var(--component-textIcon-normal-default)' />
                                    </span>
                                )}
                                {has_profit && (
                                    // Kept whole as one inline box, so a tab too narrow for it drops the
                                    // amount rather than cutting it mid-number.
                                    <span className='market-tab__profit'>
                                        {/* Figma's 1×12px vertical rule dividing the cue from the amount.
                                            Drawn in CSS, not as a glyph, so it adds no text content — the
                                            E2E strip locators match tabs on their text. */}
                                        <span
                                            className='market-tab__profit-separator'
                                            data-testid='dt_market_tab_profit_separator'
                                            aria-hidden='true'
                                        />
                                        <ProfitAmount amount={profit as number} currency={currency} />
                                    </span>
                                )}
                            </CaptionText>
                        )}
                    </div>
                </div>
            </div>
            {is_removable && (
                <div className='market-tab__reveal'>
                    <div className='market-tab__clip'>
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
                            <StandaloneCircleXmarkFillIcon
                                iconSize='sm'
                                fill='var(--component-textIcon-normal-subtle)'
                            />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarketTab;
