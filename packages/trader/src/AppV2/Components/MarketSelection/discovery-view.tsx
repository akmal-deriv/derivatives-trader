import { useCallback, useMemo } from 'react';

import { TActiveSymbolsResponse } from '@deriv/api';
import { Text } from '@deriv-com/quill-ui';
import { Localize } from '@deriv-com/translations';

import useMarketDiscovery from 'AppV2/Hooks/useMarketDiscovery';
import { DEFAULT_DISCOVERY_WINDOW, getTrendingSymbols, TSymbolChange } from 'AppV2/Utils/market-discovery-utils';

import DiscoverySection, { TDiscoveryCard } from './discovery-section';

type TDiscoveryView = {
    symbols: NonNullable<TActiveSymbolsResponse['active_symbols']>;
    onSelectSymbol: (underlying_symbol: string) => void;
    onInfo?: (underlying_symbol: string) => void;
    /** Whether the parent is still loading the symbol list (avoids an empty-state flash). */
    is_loading?: boolean;
};

// The design uses a fixed 5-minute window for now; `useMarketDiscovery` still accepts a window, so a
// time filter can be reintroduced later without touching the sections.
const DISCOVERY_WINDOW = DEFAULT_DISCOVERY_WINDOW;

/**
 * The Featured surface: Trending / Gainers / Losers sections. Movement is computed from the
 * passed (already curated ∩ available-for-trade-type) symbols by `useMarketDiscovery`, refreshed
 * periodically.
 */
const DiscoveryView = ({ symbols, onSelectSymbol, onInfo, is_loading }: TDiscoveryView) => {
    const underlying_symbols = useMemo(
        () => symbols.map(symbol => symbol.underlying_symbol ?? '').filter(Boolean),
        [symbols]
    );

    const { sections, change_by_symbol, series_by_symbol, pip_size_by_symbol, isLoading } = useMarketDiscovery(
        underlying_symbols,
        DISCOVERY_WINDOW
    );

    const symbol_map = useMemo(
        () => new Map(symbols.map(symbol => [symbol.underlying_symbol ?? '', symbol])),
        [symbols]
    );

    const toCards = useCallback(
        (entries: TSymbolChange[]): TDiscoveryCard[] =>
            entries.reduce<TDiscoveryCard[]>((cards, { underlying_symbol, change_percentage }) => {
                const item = symbol_map.get(underlying_symbol);
                if (item)
                    cards.push({
                        item,
                        change_percentage,
                        series: series_by_symbol.get(underlying_symbol),
                        pip_size: pip_size_by_symbol.get(underlying_symbol),
                    });
                return cards;
            }, []),
        [symbol_map, series_by_symbol, pip_size_by_symbol]
    );

    // Trending is ranked by trade volume (active_symbols `trade_count`), not price movement; its cards
    // still borrow the windowed change + sparkline computed for every symbol above. Memoised so the
    // sort + reduce passes don't re-run on unrelated parent re-renders (MobX observable churn).
    const trending = useMemo(
        () =>
            toCards(
                getTrendingSymbols(symbols).map(underlying_symbol => ({
                    underlying_symbol,
                    change_percentage: change_by_symbol.get(underlying_symbol) ?? null,
                }))
            ),
        [toCards, symbols, change_by_symbol]
    );
    const gainers = useMemo(() => toCards(sections.gainers), [toCards, sections.gainers]);
    const losers = useMemo(() => toCards(sections.losers), [toCards, sections.losers]);
    const has_any = trending.length > 0 || gainers.length > 0 || losers.length > 0;

    // Keep the loader up until symbols have loaded AND every candle calculation has resolved, so the
    // sections appear ranked in one go rather than popping/re-sorting as each request lands.
    const show_loader = is_loading || isLoading;

    return (
        <div className='market-selection__discovery'>
            <DiscoverySection
                title={<Localize i18n_default_text='Trending' />}
                cards={trending}
                discovery_window={DISCOVERY_WINDOW}
                onSelectSymbol={onSelectSymbol}
                onInfo={onInfo}
                is_loading={show_loader}
            />
            <DiscoverySection
                title={<Localize i18n_default_text='Gainers' />}
                cards={gainers}
                discovery_window={DISCOVERY_WINDOW}
                onSelectSymbol={onSelectSymbol}
                onInfo={onInfo}
                is_loading={show_loader}
            />
            <DiscoverySection
                title={<Localize i18n_default_text='Losers' />}
                cards={losers}
                discovery_window={DISCOVERY_WINDOW}
                onSelectSymbol={onSelectSymbol}
                onInfo={onInfo}
                is_loading={show_loader}
            />
            {!show_loader && !has_any && (
                <div className='market-selection__discovery-empty'>
                    <Text size='sm' color='quill-typography__color--subtle'>
                        <Localize i18n_default_text='No market movement to show right now.' />
                    </Text>
                </div>
            )}
        </div>
    );
};

export default DiscoveryView;
