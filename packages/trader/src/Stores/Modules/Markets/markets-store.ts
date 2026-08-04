import { action, makeObservable, observable } from 'mobx';

import BaseStore from 'Stores/base-store';
import { TRootStore } from 'Types';

/** A market-selection favourite: a {symbol, trade-type-tab} combo (e.g. frxEURUSD under Rise/Fall). */
export type TFavouriteMarket = {
    symbol: string;
    trade_type: string;
};

// Separate from `cq-favorites` (the chart's symbol favourites) so the two don't interfere.
const FAVOURITE_MARKETS_KEY = 'favourite_markets_v2';

export default class MarketsStore extends BaseStore {
    // favorites
    favoriteIndicators: string[] = [];
    favoriteSymbols: string[] = [];
    // AppV2 market-selection favourites, stored per {symbol, trade-type tab} combo.
    favouriteMarkets: TFavouriteMarket[] = [];

    constructor({ root_store }: { root_store: TRootStore }) {
        super({ root_store });

        makeObservable(this, {
            favoriteSymbols: observable,
            favoriteIndicators: observable,
            favouriteMarkets: observable,
            setFavoriteSymbols: action.bound,
            setFavoriteIndicators: action.bound,
            setFavouriteMarkets: action.bound,
            removeFavoriteSymbol: action.bound,
            removeFavoriteIndicator: action.bound,
        });

        // Initialize localStorage if it doesn't exist
        const existingFavorites = localStorage.getItem('cq-favorites');
        if (!existingFavorites) {
            const initialData = {
                indicators: [],
                'chartTitle&Comparison': [],
            };
            localStorage.setItem('cq-favorites', JSON.stringify(initialData));
        } else {
            const indicators = JSON.parse(existingFavorites).indicators;
            const favoriteSymbols = JSON.parse(existingFavorites)['chartTitle&Comparison'];
            this.favoriteIndicators = indicators;
            this.favoriteSymbols = favoriteSymbols;
        }

        try {
            const stored_markets = JSON.parse(localStorage.getItem(FAVOURITE_MARKETS_KEY) ?? '[]');
            if (Array.isArray(stored_markets)) {
                this.favouriteMarkets = stored_markets.filter(item => item?.symbol && item?.trade_type);
            }
        } catch {
            this.favouriteMarkets = [];
        }
    }

    setFavouriteMarkets(markets: TFavouriteMarket[]) {
        this.favouriteMarkets = markets;
        localStorage.setItem(FAVOURITE_MARKETS_KEY, JSON.stringify(markets));
    }

    setFavoriteIndicators(indicators: string[]) {
        this.favoriteIndicators = indicators;
        this.syncLocalStorage();
    }

    setFavoriteSymbols(symbols: string[]) {
        this.favoriteSymbols = symbols;
        this.syncLocalStorage();
    }

    removeFavoriteIndicator(indicator: string) {
        this.favoriteIndicators = this.favoriteIndicators.filter(favIndicator => favIndicator !== indicator);
        this.syncLocalStorage();
    }

    removeFavoriteSymbol(symbol: string) {
        this.favoriteSymbols = this.favoriteSymbols.filter(favSymbol => favSymbol !== symbol);
        this.syncLocalStorage();
    }

    syncLocalStorage() {
        const favorites = {
            indicators: this.favoriteIndicators,
            'chartTitle&Comparison': this.favoriteSymbols,
        };
        localStorage.setItem('cq-favorites', JSON.stringify(favorites));
    }
}
