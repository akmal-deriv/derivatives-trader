import { createPortal } from 'react-dom';

import { observer } from '@deriv/stores';
import { Localize, localize } from '@deriv-com/translations';

import useMarketSelection from 'AppV2/Hooks/useMarketSelection';

import DiscoveryView from './discovery-view';
import MarketCategoryChips from './market-category-chips';
import MarketEmptyState from './market-empty-state';
import MarketFavouritesView from './market-favourites-view';
import MarketInfoScreen from './market-info-screen';
import MarketSearchPage from './market-search-page';
import MarketSelectionHeader from './market-selection-header';
import MarketSelectionList from './market-selection-list';
import TradeTypeTabs from './trade-type-tabs';

import './market-selection.scss';

type TMarketSelectionMobile = {
    isOpen: boolean;
    setIsOpen: (input: boolean) => void;
    /** When set (e.g. in Automate), restrict the trade-type tabs to these trade-type values. */
    supported_trade_types?: Set<string>;
};

/**
 * Mobile market-selection experience: a full-screen modal to browse markets by trade type, discover
 * Trending/Gainers/Losers, search, and open a market info screen. Rendered through a portal as a
 * fixed full-viewport overlay (not an ActionSheet), matching the design. All browse state + commit
 * logic lives in `useMarketSelection`, shared with the desktop shell.
 */
const MarketSelectionMobile = observer(({ isOpen, setIsOpen, supported_trade_types }: TMarketSelectionMobile) => {
    const {
        current_trade_type,
        selected_category,
        setSelectedCategory,
        is_favourites_tab,
        setIsFavouritesTab,
        is_searching,
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
    } = useMarketSelection({ is_open: isOpen, onClose: () => setIsOpen(false) });

    if (!isOpen) return null;

    const favourites_content =
        favourites.length === 0 ? (
            <MarketEmptyState
                title={<Localize i18n_default_text='No favourites yet' />}
                description={<Localize i18n_default_text='Markets you add to your favourites will appear here.' />}
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

    let content;
    if (info_item) {
        content = (
            <MarketInfoScreen
                item={info_item}
                onBack={() => setInfoSymbol(null)}
                onTraded={handleClose}
                default_trade_type={info_trade_type}
            />
        );
    } else if (is_searching) {
        content = (
            <MarketSearchPage
                symbols_by_trade_type={symbols_by_trade_type}
                is_loading={is_all_symbols_loading}
                onSelectSymbol={handleSelectSymbolForTradeType}
                onInfo={showInfo}
                onBack={() => setIsSearching(false)}
                supported_trade_types={supported_trade_types}
            />
        );
    } else {
        content = (
            <div className='market-selection'>
                <MarketSelectionHeader
                    onClose={handleClose}
                    onSearch={() => setIsSearching(true)}
                    selected_trade_type={current_trade_type}
                />
                <TradeTypeTabs
                    selected_id={current_trade_type}
                    onSelect={handleSelectTradeType}
                    is_favourites_selected={is_favourites_tab}
                    favourites_count={favourites.length}
                    onSelectFavourites={() => setIsFavouritesTab(true)}
                    supported_trade_types={supported_trade_types}
                />
                {is_favourites_tab ? (
                    favourites_content
                ) : (
                    <>
                        <MarketCategoryChips
                            categories={categories}
                            selected_id={selected_category}
                            onSelect={setSelectedCategory}
                        />
                        {show_discovery ? (
                            <DiscoveryView
                                symbols={symbols}
                                onSelectSymbol={handleSelectSymbol}
                                onInfo={underlying_symbol => showInfo(underlying_symbol, current_trade_type)}
                                is_loading={isLoading}
                            />
                        ) : (
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
                        )}
                    </>
                )}
            </div>
        );
    }

    return createPortal(
        <div
            className='market-selection__modal'
            role='dialog'
            aria-modal='true'
            aria-label={localize('Market selection')}
        >
            {content}
        </div>,
        document.body
    );
});

export default MarketSelectionMobile;
