import { useCallback, useEffect, useMemo, useRef } from 'react';

import { TActiveSymbolsResponse } from '@deriv/api';
import { Skeleton, Text } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

import { TDiscoveryWindow } from 'AppV2/Utils/market-discovery-utils';
import { getSubgroupLabel, getSubmarketLabel } from 'AppV2/Utils/market-selection-labels';
import { groupSymbolsForList } from 'AppV2/Utils/market-selection-utils';

import MarketChangesDropdown from './market-changes-dropdown';
import MarketEmptyState from './market-empty-state';
import MarketSelectionRowDesktop from './market-selection-row-desktop';
import MarketSelectionRowMobile from './market-selection-row-mobile';

type TActiveSymbol = NonNullable<TActiveSymbolsResponse['active_symbols']>[0];

type TMarketSelectionList = {
    symbols: NonNullable<TActiveSymbolsResponse['active_symbols']>;
    is_loading: boolean;
    /** Trade-type tab this list belongs to — favourites are stored per {symbol, trade_type}. */
    trade_type: string;
    onSelectSymbol: (underlying_symbol: string) => void;
    onInfo?: (underlying_symbol: string, trade_type: string) => void;
    /** Per-symbol windowed % change; when provided, rows show the change pill + the window dropdown. */
    change_by_symbol?: Map<string, number | null>;
    /** Per-symbol price points for the row worm sparkline. */
    series_by_symbol?: Map<string, number[]>;
    window?: TDiscoveryWindow;
    onSelectWindow?: (window: TDiscoveryWindow) => void;
    /** Reports the cumulative set of symbols scrolled into view, so the parent fetches ticks only for
     * those (lazy loading). When omitted, rows aren't observed and no lazy reporting happens. */
    onRevealSymbols?: (underlying_symbols: string[]) => void;
};

// Fetch each row's ticks a little before it reaches the viewport, so the % / sparkline are usually
// ready by the time it's on screen.
const REVEAL_ROOT_MARGIN = '300px';

type TLazyRowProps = {
    Row: typeof MarketSelectionRowDesktop | typeof MarketSelectionRowMobile;
    item: TActiveSymbol;
    trade_type: string;
    onSelect: (underlying_symbol: string) => void;
    change_percentage: number | null;
    series?: number[];
    onInfo?: (underlying_symbol: string, trade_type: string) => void;
    /** Called once, the first time the row scrolls into view. */
    onReveal: (underlying_symbol: string) => void;
    /** Changing this re-arms the observer (e.g. on a window switch) so an on-screen row re-reveals
     *  itself for the new window instead of relying on a stale earlier reveal. */
    reveal_token?: TDiscoveryWindow;
};

/**
 * A market row that reveals its symbol (to trigger the lazy tick fetch) the first time it enters the
 * viewport. The row renders immediately (icon + name); its % / sparkline appear once the ticks land.
 * Falls back to revealing immediately where IntersectionObserver is unavailable (e.g. jsdom).
 */
export const LazyRow = ({ Row, item, onReveal, reveal_token, ...row_props }: TLazyRowProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const underlying_symbol = item.underlying_symbol ?? '';

    useEffect(() => {
        const el = ref.current;
        if (!el || typeof IntersectionObserver === 'undefined') {
            onReveal(underlying_symbol);
            return undefined;
        }
        const observer = new IntersectionObserver(
            entries => {
                if (entries.some(entry => entry.isIntersecting)) {
                    onReveal(underlying_symbol);
                    observer.disconnect();
                }
            },
            { rootMargin: REVEAL_ROOT_MARGIN }
        );
        observer.observe(el);
        return () => observer.disconnect();
        // `reveal_token` (the window) re-arms the observer on a window switch.
    }, [underlying_symbol, onReveal, reveal_token]);

    return <Row container_ref={ref} item={item} {...row_props} />;
};

/**
 * The list view: markets grouped into submarket sections with titles (e.g. "Continuous indices"),
 * a "Changes ({window})" dropdown in the first section header, per-row % change, and swipe actions.
 * Rows render immediately; each row's ticks are fetched lazily when it scrolls into view (reported via
 * `onRevealSymbols`). Shows a loading skeleton while the symbol list resolves and an empty state when
 * nothing matches.
 */
const MarketSelectionList = ({
    symbols,
    is_loading,
    trade_type,
    onSelectSymbol,
    onInfo,
    change_by_symbol,
    series_by_symbol,
    window,
    onSelectWindow,
    onRevealSymbols,
}: TMarketSelectionList) => {
    const { isMobile } = useDevice();
    const sections = useMemo(() => groupSymbolsForList(symbols), [symbols]);
    const show_changes_dropdown = !!window && !!onSelectWindow;
    const Row = !isMobile ? MarketSelectionRowDesktop : MarketSelectionRowMobile;

    // Cumulative set of revealed symbols. Reset when the symbol list changes (category switch /
    // search) so reveals start fresh — done during render (before the rows' observers fire) so a
    // same-commit reveal isn't clobbered by a post-render reset. The next reveal replaces the parent's
    // reported set, so no explicit empty report is needed on reset.
    const revealed_ref = useRef<Set<string>>(new Set());
    const prev_symbols_ref = useRef(symbols);
    const prev_window_ref = useRef(window);
    // Reset reveals when the symbol list changes (category switch / search) OR the window changes.
    // On a window switch the same rows are shown but their prior reveal was for the OLD window, so we
    // re-lazy-load: clearing here (paired with the parent clearing its enabled set) means only rows
    // currently on screen re-reveal + fetch the new window — the rest wait until scrolled into view.
    if (prev_symbols_ref.current !== symbols || prev_window_ref.current !== window) {
        prev_symbols_ref.current = symbols;
        prev_window_ref.current = window;
        revealed_ref.current = new Set();
    }

    const handleReveal = useCallback(
        (underlying_symbol: string) => {
            if (!underlying_symbol || revealed_ref.current.has(underlying_symbol)) return;
            revealed_ref.current.add(underlying_symbol);
            onRevealSymbols?.(Array.from(revealed_ref.current));
        },
        [onRevealSymbols]
    );

    if (is_loading) {
        return (
            <div className='market-selection-list market-selection-list--loading'>
                {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton.Square key={index} height={40} rounded />
                ))}
            </div>
        );
    }

    if (symbols.length === 0) {
        return (
            <div className='market-selection-list market-selection-list--empty'>
                <MarketEmptyState
                    title={<Localize i18n_default_text='No result found' />}
                    description={
                        <Localize i18n_default_text='Check your spelling or try searching for a different market.' />
                    }
                />
            </div>
        );
    }

    return (
        <div className='market-selection-list'>
            {sections.map((section, section_index) => (
                <div className='market-selection-list__section' key={section.subgroup || 'all'}>
                    {section.subgroup && (
                        <Text size='sm' className='market-selection-list__section-title'>
                            {getSubgroupLabel(section.subgroup, section.market)}
                        </Text>
                    )}
                    {section.groups.map((group, group_index) => (
                        <div className='market-selection-list__group' key={group.submarket}>
                            <div className='market-selection-list__group-header'>
                                <Text bold size='sm' className='market-selection-list__group-title'>
                                    {getSubmarketLabel(group.submarket)}
                                </Text>
                                {section_index === 0 && group_index === 0 && show_changes_dropdown && (
                                    <MarketChangesDropdown selected_window={window} onSelect={onSelectWindow} />
                                )}
                            </div>
                            {group.items.map(item => (
                                <LazyRow
                                    key={item.underlying_symbol}
                                    Row={Row}
                                    item={item}
                                    trade_type={trade_type}
                                    onSelect={onSelectSymbol}
                                    change_percentage={change_by_symbol?.get(item.underlying_symbol ?? '') ?? null}
                                    series={series_by_symbol?.get(item.underlying_symbol ?? '')}
                                    onInfo={onInfo}
                                    onReveal={handleReveal}
                                    reveal_token={window}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default MarketSelectionList;
