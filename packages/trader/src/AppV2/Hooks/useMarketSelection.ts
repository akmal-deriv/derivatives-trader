import { useCallback, useMemo, useState } from 'react';

import useActiveSymbols from 'AppV2/Hooks/useActiveSymbols';
import useAllTradeTypeSymbols from 'AppV2/Hooks/useAllTradeTypeSymbols';
import useFavouriteMarkets from 'AppV2/Hooks/useFavouriteMarkets';
import useMarketDiscovery from 'AppV2/Hooks/useMarketDiscovery';
import useTradeTypeSymbols from 'AppV2/Hooks/useTradeTypeSymbols';
import { DEFAULT_DISCOVERY_WINDOW, TDiscoveryWindow } from 'AppV2/Utils/market-discovery-utils';
import {
    filterSymbolsByCategory,
    getContractTypeForTradeType,
    getMarketCategories,
    getTradeTypeForContractType,
    groupFavourites,
    SPECIAL_CATEGORIES,
} from 'AppV2/Utils/market-selection-utils';
import { AVAILABLE_CONTRACTS, getOrderedAvailableContracts, TAvailableContract } from 'AppV2/Utils/trade-types-utils';
import { useTraderStore } from 'Stores/useTraderStores';

type TUseMarketSelection = {
    /** Called after a market is committed (or the shell otherwise wants to close). */
    onClose: () => void;
};

/**
 * Headless orchestration for the market-selection experience: owns the browse state (trade type,
 * category, favourites tab, search, info symbol, change window), derives the visible symbol sets +
 * windowed % changes, and exposes the commit/close handlers. Rendered by the device-specific shells
 * (the mobile full-screen modal and the desktop anchored popover), so the logic stays in one place.
 *
 * Consumers must be wrapped in `observer()` — this reads MobX observables from the trader store.
 */
const useMarketSelection = ({ onClose }: TUseMarketSelection) => {
    const { contract_type, selectMarketAndTradeType } = useTraderStore();

    const [selected_trade_type, setSelectedTradeType] = useState<TAvailableContract | undefined>(
        () => getTradeTypeForContractType(contract_type) ?? AVAILABLE_CONTRACTS[0]
    );
    const [selected_category, setSelectedCategory] = useState<string>(SPECIAL_CATEGORIES.FEATURED);
    const [is_favourites_tab, setIsFavouritesTab] = useState(false);
    const [is_searching, setIsSearching] = useState(false);
    const [info_symbol, setInfoSymbol] = useState<string | null>(null);
    // The trade type the info screen was opened from, so its Favourite button can default to it.
    const [info_trade_type, setInfoTradeType] = useState('');
    const [list_window, setListWindow] = useState<TDiscoveryWindow>(DEFAULT_DISCOVERY_WINDOW);

    const { symbols, isLoading } = useTradeTypeSymbols(selected_trade_type);
    const { favourites } = useFavouriteMarkets();
    const { activeSymbols } = useActiveSymbols();

    const current_trade_type = selected_trade_type?.id ?? '';

    const categories = useMemo(() => getMarketCategories(symbols), [symbols]);
    const favourite_groups = useMemo(() => groupFavourites(favourites, activeSymbols), [favourites, activeSymbols]);

    const visible_symbols = useMemo(
        () => filterSymbolsByCategory(symbols, selected_category),
        [symbols, selected_category]
    );

    // The symbols shown in a *list* (favourites tab or a non-Featured category); discovery uses its own
    // fixed window. Compute their windowed % change for the row pills + Changes dropdown. We pass the
    // FULL list so any symbol the Featured view already cached (same 5m window) shows its change
    // immediately. A category list can be long, though, so uncached rows are fetched LAZILY: the list
    // reports which rows have scrolled into view (`revealed_list_symbols`) and only those are ENABLED
    // (fetched) — disabled rows still show cached data but don't hit the network, so no request storm.
    // Favourites is small, so all of it fetches eagerly.
    const [revealed_list_symbols, setRevealedListSymbols] = useState<string[]>([]);

    // Switching the change window re-lazy-loads the list: clear the enabled set so the new-window
    // render starts empty (no burst re-fetch of everything already revealed), and the list re-observes
    // its on-screen rows to fetch just those for the new window (the rest wait until scrolled to).
    const selectListWindow = useCallback((next: TDiscoveryWindow) => {
        setRevealedListSymbols([]);
        setListWindow(next);
    }, []);

    const is_list_view = is_favourites_tab || selected_category !== SPECIAL_CATEGORIES.FEATURED;
    const list_underlying = useMemo(() => {
        if (!is_list_view) return [];
        if (is_favourites_tab) return Array.from(new Set(favourites.map(favourite => favourite.symbol)));
        return visible_symbols.map(item => item.underlying_symbol ?? '').filter(Boolean);
    }, [is_list_view, is_favourites_tab, favourites, visible_symbols]);
    const list_enabled_symbols = useMemo(
        () => (is_favourites_tab ? undefined : new Set(revealed_list_symbols)),
        [is_favourites_tab, revealed_list_symbols]
    );
    const { change_by_symbol, series_by_symbol } = useMarketDiscovery(list_underlying, list_window, {
        enabled_symbols: list_enabled_symbols,
    });

    // Symbols available for every trade type — powers the search view's per-trade-type grouping, the
    // ONLY view that needs the full set. Deferred until the user actually starts searching (not on
    // open) so opening the selector fires just one active_symbols call for the selected trade type;
    // the results still share React Query's cache with per-tab browsing (identical query keys).
    const all_trade_types = useMemo(() => getOrderedAvailableContracts(), []);
    const { symbols_by_trade_type, isLoading: is_all_symbols_loading } = useAllTradeTypeSymbols(
        all_trade_types,
        is_searching
    );

    // Open the info screen for a symbol, remembering the trade type it was opened from (the browsed
    // tab, favourite group, or search group) so the info screen's Favourite button can default to it.
    const showInfo = (underlying_symbol: string, trade_type = '') => {
        setInfoSymbol(underlying_symbol);
        setInfoTradeType(trade_type);
    };

    const handleClose = () => {
        setInfoSymbol(null);
        setIsSearching(false);
        onClose();
    };

    // Commit a (symbol, trade type) pair and close. The commit can reject (network/API error); on
    // failure we keep the selector open so it stays dismissable and the user can retry — never leave
    // the full-screen modal stuck (mirrors MarketInfoScreen.handleTrade).
    const commitAndClose = async (underlying_symbol: string, trade_type: string) => {
        const contract_type = getContractTypeForTradeType(trade_type);
        // Unknown/empty trade type resolves to a blank contract type — never commit it, or the store
        // would record a (symbol, '') tab in open_markets before its guard runs.
        if (!contract_type) return;
        try {
            await selectMarketAndTradeType(underlying_symbol, contract_type);
            handleClose();
        } catch {
            // Commit failed — stay open so the user can retry or close manually.
        }
    };

    // Commit both the symbol and the trade type chosen in the tabs; selecting a market from
    // discovery/list/search must switch the trade page to the active trade type, not just the
    // symbol. `selectMarketAndTradeType` records the tab from this explicit pair up-front.
    const handleSelectSymbol = (underlying_symbol: string) => commitAndClose(underlying_symbol, current_trade_type);

    const handleSelectFavourite = (underlying_symbol: string, trade_type: string) =>
        commitAndClose(underlying_symbol, trade_type);

    // Search results are grouped by trade type, so selecting one adopts THAT trade type (not the
    // currently-browsed tab) alongside the symbol.
    const handleSelectSymbolForTradeType = (underlying_symbol: string, trade_type: string) =>
        commitAndClose(underlying_symbol, trade_type);

    const handleSelectTradeType = (contract: TAvailableContract) => {
        setSelectedTradeType(contract);
        setSelectedCategory(SPECIAL_CATEGORIES.FEATURED);
        setIsFavouritesTab(false);
    };

    // Featured shows the discovery sections; every other chip shows the flat list.
    const show_discovery = selected_category === SPECIAL_CATEGORIES.FEATURED;
    // Prefer the current trade-type list, but fall back to the full active-symbols set so the info
    // screen is reachable for favourites that belong to a different trade type.
    const info_item = info_symbol
        ? (symbols.find(item => item.underlying_symbol === info_symbol) ??
          activeSymbols.find(item => item.underlying_symbol === info_symbol))
        : undefined;

    return {
        // browse state
        current_trade_type,
        selected_category,
        setSelectedCategory,
        is_favourites_tab,
        setIsFavouritesTab,
        is_searching,
        setIsSearching,
        info_symbol,
        setInfoSymbol,
        info_trade_type,
        showInfo,
        list_window,
        setListWindow: selectListWindow,
        // derived data
        symbols,
        isLoading,
        favourites,
        categories,
        favourite_groups,
        visible_symbols,
        change_by_symbol,
        series_by_symbol,
        // Category list reports its scrolled-into-view symbols here to drive lazy tick fetching.
        revealListSymbols: setRevealedListSymbols,
        show_discovery,
        info_item,
        // search (grouped by trade type)
        symbols_by_trade_type,
        is_all_symbols_loading,
        // handlers
        handleClose,
        handleSelectSymbol,
        handleSelectFavourite,
        handleSelectSymbolForTradeType,
        handleSelectTradeType,
        handleSelectTradeTypeById: (id: string) => {
            const contract = AVAILABLE_CONTRACTS.find(c => c.id === id);
            if (contract) handleSelectTradeType(contract);
        },
    };
};

export type TMarketSelectionState = ReturnType<typeof useMarketSelection>;

export default useMarketSelection;
