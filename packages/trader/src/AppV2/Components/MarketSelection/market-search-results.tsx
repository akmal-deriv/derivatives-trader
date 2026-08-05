import { useCallback, useMemo, useRef, useState } from 'react';

import { TActiveSymbolsResponse } from '@deriv/api';
import { Skeleton, Text } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

import useMarketDiscovery from 'AppV2/Hooks/useMarketDiscovery';
import { DEFAULT_DISCOVERY_WINDOW } from 'AppV2/Utils/market-discovery-utils';
import { getSubmarketLabel } from 'AppV2/Utils/market-selection-labels';
import { filterSymbolsBySearch, groupSymbolsBySubmarket } from 'AppV2/Utils/market-selection-utils';
import { getOrderedAvailableContracts, getTradeTypeLabel } from 'AppV2/Utils/trade-types-utils';

import MarketEmptyState from './market-empty-state';
import { LazyRow } from './market-selection-list';
import MarketSelectionRowDesktop from './market-selection-row-desktop';
import MarketSelectionRowMobile from './market-selection-row-mobile';

type ActiveSymbols = NonNullable<TActiveSymbolsResponse['active_symbols']>;

type TMarketSearchResults = {
    /** The raw search query. Trimmed/empty queries render nothing (the caller shows a prompt). */
    search_value: string;
    /** Trade-type-id → its tradeable symbols (from useAllTradeTypeSymbols). */
    symbols_by_trade_type: Map<string, ActiveSymbols>;
    /** Whether the underlying per-trade-type fetch is still resolving. */
    is_loading?: boolean;
    /** Commits the symbol under the trade type of the group it was selected from. */
    onSelect: (underlying_symbol: string, trade_type: string) => void;
    onInfo?: (underlying_symbol: string, trade_type: string) => void;
    /** Restrict to a supported set (e.g. Automate); absent/empty means all trade types. */
    supported_trade_types?: Set<string>;
};

const SKELETON_ROW_COUNT = 6;

/**
 * Search results grouped like the Favourites tab: for the query, each trade type that has matching
 * tradeable symbols gets a header, split into "Submarket" subgroups listing the matches in the
 * market-selection display order. A symbol appears under every trade type it's available for, and
 * selecting it adopts that trade type.
 */
const MarketSearchResults = ({
    search_value,
    symbols_by_trade_type,
    is_loading,
    onSelect,
    onInfo,
    supported_trade_types,
}: TMarketSearchResults) => {
    const { isMobile } = useDevice();
    const Row = !isMobile ? MarketSelectionRowDesktop : MarketSelectionRowMobile;

    const groups = useMemo(() => {
        if (!search_value.trim()) return [];
        return getOrderedAvailableContracts(supported_trade_types)
            .map(contract => ({
                trade_type: contract.id,
                subgroups: groupSymbolsBySubmarket(
                    filterSymbolsBySearch(symbols_by_trade_type.get(contract.id) ?? [], search_value)
                ),
            }))
            .filter(group => group.subgroups.length > 0);
    }, [search_value, symbols_by_trade_type, supported_trade_types]);

    // Every unique symbol across all result groups (a symbol repeats across trade types, so dedupe) —
    // the set whose worm sparkline + % change we source, on a fixed window like the discovery view.
    const all_underlying = useMemo(
        () =>
            Array.from(
                new Set(
                    groups.flatMap(group =>
                        group.subgroups.flatMap(subgroup => subgroup.items.map(item => item.underlying_symbol ?? ''))
                    )
                )
            ).filter(Boolean),
        [groups]
    );

    // A row shows its worm/% from cache when the symbol was already fetched elsewhere (browse list,
    // discovery, favourites — same window), but the initial trade type may cover only a subset, so
    // uncached symbols would otherwise show nothing. Fetch those lazily: only rows scrolled into view
    // are ENABLED, so a broad query doesn't fire a request per match, and React Query's staleTime means
    // already-cached symbols are reused (no refetch) — only genuinely-missing ticks hit the network.
    const revealed_ref = useRef<Set<string>>(new Set());
    const prev_search_ref = useRef(search_value);
    const [enabled_symbols, setEnabledSymbols] = useState<Set<string>>(new Set());
    if (prev_search_ref.current !== search_value) {
        prev_search_ref.current = search_value;
        revealed_ref.current = new Set();
        setEnabledSymbols(new Set());
    }
    const handleReveal = useCallback((underlying_symbol: string) => {
        if (!underlying_symbol || revealed_ref.current.has(underlying_symbol)) return;
        revealed_ref.current.add(underlying_symbol);
        setEnabledSymbols(new Set(revealed_ref.current));
    }, []);

    const { change_by_symbol, series_by_symbol } = useMarketDiscovery(all_underlying, DEFAULT_DISCOVERY_WINDOW, {
        enabled_symbols,
    });

    if (!search_value.trim()) return null;

    if (groups.length === 0) {
        if (is_loading) {
            return (
                <div className='market-selection-list market-selection-list--loading'>
                    {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
                        <Skeleton.Square key={index} height={40} rounded />
                    ))}
                </div>
            );
        }
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
        <div className='market-selection-list market-search-results'>
            {groups.map(group => (
                <div className='market-search-results__group' key={group.trade_type}>
                    <Text size='lg' bold className='market-search-results__trade-type'>
                        {getTradeTypeLabel(group.trade_type)}
                    </Text>
                    {group.subgroups.map(subgroup => (
                        <div className='market-selection-list__group' key={subgroup.submarket}>
                            <div className='market-selection-list__group-header'>
                                <Text bold size='sm' className='market-selection-list__group-title'>
                                    {getSubmarketLabel(subgroup.submarket)}
                                </Text>
                            </div>
                            {subgroup.items.map(item => (
                                <LazyRow
                                    key={item.underlying_symbol}
                                    Row={Row}
                                    item={item}
                                    trade_type={group.trade_type}
                                    onSelect={underlying_symbol => onSelect(underlying_symbol, group.trade_type)}
                                    change_percentage={change_by_symbol.get(item.underlying_symbol ?? '') ?? null}
                                    series={series_by_symbol.get(item.underlying_symbol ?? '')}
                                    onInfo={onInfo}
                                    onReveal={handleReveal}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default MarketSearchResults;
