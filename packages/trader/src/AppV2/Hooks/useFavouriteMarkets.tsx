import { useCallback } from 'react';

import { StandaloneStarFillIcon, StandaloneStarRegularIcon } from '@deriv/quill-icons';
import { getSymbolDisplayName, trackMarketFavourited } from '@deriv/shared';
import { useSnackbar } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

import { useModulesStore } from 'Stores/useModulesStores';

/** A favourite is a market + trade-type-tab combo (e.g. frxEURUSD under "Rise/Fall"). */
export type TFavouriteMarket = {
    symbol: string;
    /** Trade-type tab id (AVAILABLE_CONTRACTS.id), e.g. "Rise/Fall", "Accumulators". */
    trade_type: string;
};

/**
 * Market-selection favourites, stored per {symbol, trade-type tab} combo in the MobX markets-store
 * (persisted separately from the chart's symbol favourites). So a symbol favourited on the Rise/Fall
 * tab shows as favourite there but not on, say, Accumulators. Components rendering favourite state
 * must be wrapped in `observer()` to react to changes.
 */
const useFavouriteMarkets = () => {
    const { markets } = useModulesStore();
    const { favouriteMarkets, setFavouriteMarkets } = markets;
    const { addSnackbar } = useSnackbar();

    const isFavourite = useCallback(
        (symbol: string, trade_type: string) =>
            favouriteMarkets.some(favourite => favourite.symbol === symbol && favourite.trade_type === trade_type),
        [favouriteMarkets]
    );

    const toggleFavourite = useCallback(
        (symbol: string, trade_type: string, source: string) => {
            if (!symbol || !trade_type) return;
            const exists = favouriteMarkets.some(
                favourite => favourite.symbol === symbol && favourite.trade_type === trade_type
            );

            trackMarketFavourited({
                market_name: getSymbolDisplayName(symbol),
                source,
                favourite_action: exists ? 'removed' : 'added',
            });

            if (exists) {
                setFavouriteMarkets(
                    favouriteMarkets.filter(
                        favourite => !(favourite.symbol === symbol && favourite.trade_type === trade_type)
                    )
                );
                addSnackbar({
                    icon: <StandaloneStarRegularIcon fill='var(--component-snackbar-icon-neutral)' iconSize='sm' />,
                    message: <Localize i18n_default_text='Removed from favourites' />,
                    hasCloseButton: false,
                });
            } else {
                setFavouriteMarkets([...favouriteMarkets, { symbol, trade_type }]);
                addSnackbar({
                    icon: <StandaloneStarFillIcon fill='var(--core-color-solid-mustard-700)' iconSize='sm' />,
                    message: <Localize i18n_default_text='Added to favourites' />,
                    hasCloseButton: false,
                });
            }
        },
        [favouriteMarkets, setFavouriteMarkets, addSnackbar]
    );

    return { favourites: favouriteMarkets, isFavourite, toggleFavourite };
};

export default useFavouriteMarkets;
