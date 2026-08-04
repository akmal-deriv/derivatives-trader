import { useEffect, useState } from 'react';

import { observer } from '@deriv/stores';
import { SearchField } from '@deriv-com/quill-ui';
import { Localize, useTranslations } from '@deriv-com/translations';

import useMarketSelection from 'AppV2/Hooks/useMarketSelection';

import { InputPopover } from '../InputPopover';

import DiscoveryView from './discovery-view';
import MarketCategoryChips from './market-category-chips';
import MarketEmptyState from './market-empty-state';
import MarketFavouritesView from './market-favourites-view';
import MarketInfoScreen from './market-info-screen';
import MarketSearchResults from './market-search-results';
import MarketSelectionList from './market-selection-list';
import MarketSelectionSidebar from './market-selection-sidebar';

import './market-selection.scss';

type TMarketSelectionDesktop = {
    isOpen: boolean;
    setIsOpen: (input: boolean) => void;
    /** The element the panel/info card anchors to (the market-tabs "add" button). */
    triggerRef: React.RefObject<HTMLElement>;
    /** When set (e.g. in Automate), restrict the trade-types sidebar to these trade-type values. */
    supported_trade_types?: Set<string>;
};

// Fixed 900×808 popover (design spec). The info card reuses the exact same footprint so switching
// between the browse panel and the info screen only swaps the content, never resizes. (Height is set
// on the panel in market-selection.scss.)
const POPOVER_WIDTH = 900;

/**
 * Desktop market-selection experience: an anchored popover (via InputPopover) dropped below the
 * market-tabs strip. Left column is the trade-types sidebar; the right column has an inline search
 * field, category chips, and the discovery/list content. Opening a market's info replaces the panel
 * with a narrower info card. All browse state + commit logic is shared with the mobile modal via
 * `useMarketSelection`.
 */
const MarketSelectionDesktop = observer(
    ({ isOpen, setIsOpen, triggerRef, supported_trade_types }: TMarketSelectionDesktop) => {
        const { localize } = useTranslations();
        const [search_value, setSearchValue] = useState('');

        const {
            current_trade_type,
            selected_category,
            setSelectedCategory,
            is_favourites_tab,
            setIsFavouritesTab,
            setIsSearching,
            setInfoSymbol,
            info_trade_type,
            showInfo,
            list_window,
            setListWindow,
            symbols,
            isLoading,
            favourites,
            categories,
            favourite_groups,
            visible_symbols,
            change_by_symbol,
            series_by_symbol,
            revealListSymbols,
            show_discovery,
            info_item,
            symbols_by_trade_type,
            is_all_symbols_loading,
            handleClose,
            handleSelectSymbol,
            handleSelectFavourite,
            handleSelectSymbolForTradeType,
            handleSelectTradeType,
        } = useMarketSelection({ onClose: () => setIsOpen(false) });

        // Clear the local search when the panel closes so it reopens clean (and drop out of search
        // mode so the all-trade-type symbol fetch is disabled again).
        useEffect(() => {
            if (!isOpen) {
                setSearchValue('');
                setIsSearching(false);
            }
        }, [isOpen, setIsSearching]);

        let results;
        // Search takes precedence over the current tab — typing a query while on Favourites (or any
        // category) shows the cross-trade-type results, not the tab's own list.
        if (search_value) {
            results = (
                <MarketSearchResults
                    search_value={search_value}
                    symbols_by_trade_type={symbols_by_trade_type}
                    is_loading={is_all_symbols_loading}
                    onSelect={handleSelectSymbolForTradeType}
                    onInfo={showInfo}
                    supported_trade_types={supported_trade_types}
                />
            );
        } else if (is_favourites_tab) {
            results =
                favourites.length === 0 ? (
                    <MarketEmptyState
                        title={<Localize i18n_default_text='No favourites yet' />}
                        description={
                            <Localize i18n_default_text='Markets you add to your favourites will appear here.' />
                        }
                    />
                ) : (
                    <MarketFavouritesView
                        groups={favourite_groups}
                        change_by_symbol={change_by_symbol}
                        series_by_symbol={series_by_symbol}
                        onSelectFavourite={handleSelectFavourite}
                        onInfo={showInfo}
                    />
                );
        } else if (show_discovery) {
            results = (
                <DiscoveryView
                    symbols={symbols}
                    onSelectSymbol={handleSelectSymbol}
                    onInfo={underlying_symbol => showInfo(underlying_symbol, current_trade_type)}
                    is_loading={isLoading}
                />
            );
        } else {
            results = (
                <MarketSelectionList
                    symbols={visible_symbols}
                    is_loading={isLoading}
                    trade_type={current_trade_type}
                    onSelectSymbol={handleSelectSymbol}
                    onInfo={showInfo}
                    change_by_symbol={change_by_symbol}
                    series_by_symbol={series_by_symbol}
                    window={list_window}
                    onSelectWindow={setListWindow}
                    onRevealSymbols={revealListSymbols}
                />
            );
        }

        return (
            <InputPopover
                isOpen={isOpen}
                onClose={handleClose}
                triggerRef={triggerRef}
                placement='bottom'
                spacing={8}
                popoverWidth={POPOVER_WIDTH}
                className='market-selection-desktop'
            >
                {info_item ? (
                    <div className='market-selection-desktop__info'>
                        <MarketInfoScreen
                            item={info_item}
                            onBack={() => setInfoSymbol(null)}
                            onTraded={handleClose}
                            default_trade_type={info_trade_type}
                        />
                    </div>
                ) : (
                    <div className='market-selection-desktop__panel'>
                        <MarketSelectionSidebar
                            selected_trade_type_id={current_trade_type}
                            is_favourites_selected={is_favourites_tab}
                            favourites_count={favourites.length}
                            onSelectTradeType={handleSelectTradeType}
                            onSelectFavourites={() => setIsFavouritesTab(true)}
                            supported_trade_types={supported_trade_types}
                        />
                        <div className='market-selection-desktop__content'>
                            <div className='market-selection-desktop__search'>
                                <SearchField
                                    inputSize='sm'
                                    variant='fill'
                                    placeholder={localize('Search by market name')}
                                    value={search_value}
                                    onChange={event => {
                                        const value = event.target.value;
                                        setSearchValue(value);
                                        // Enable the all-trade-type symbol fetch only once the user
                                        // starts searching (this is the only view that needs it).
                                        setIsSearching(Boolean(value));
                                    }}
                                />
                            </div>
                            {!is_favourites_tab && !search_value && (
                                <MarketCategoryChips
                                    categories={categories}
                                    selected_id={selected_category}
                                    onSelect={setSelectedCategory}
                                />
                            )}
                            <div className='market-selection-desktop__results'>{results}</div>
                        </div>
                    </div>
                )}
            </InputPopover>
        );
    }
);

export default MarketSelectionDesktop;
