import { useState } from 'react';

import { TActiveSymbolsResponse } from '@deriv/api';
import { SearchField, Text } from '@deriv-com/quill-ui';
import { Localize, useTranslations } from '@deriv-com/translations';

import MarketSearchResults from './market-search-results';

type ActiveSymbols = NonNullable<TActiveSymbolsResponse['active_symbols']>;

type TMarketSearchPage = {
    /** Trade-type-id → its tradeable symbols (from useAllTradeTypeSymbols). */
    symbols_by_trade_type: Map<string, ActiveSymbols>;
    is_loading?: boolean;
    /** Commits the symbol under the trade type of the group it was selected from. */
    onSelectSymbol: (underlying_symbol: string, trade_type: string) => void;
    onInfo?: (underlying_symbol: string, trade_type: string) => void;
    onBack: () => void;
    supported_trade_types?: Set<string>;
};

/**
 * The dedicated search page: a back control + search field, with results grouped by trade type — a
 * matching symbol appears under every trade type it's tradeable for. Reached from the header's
 * Search icon.
 */
const MarketSearchPage = ({
    symbols_by_trade_type,
    is_loading,
    onSelectSymbol,
    onInfo,
    onBack,
    supported_trade_types,
}: TMarketSearchPage) => {
    const { localize } = useTranslations();
    const [search_value, setSearchValue] = useState('');

    return (
        <div className='market-selection market-search'>
            <div className='market-search__header'>
                <SearchField
                    autoFocus
                    inputSize='sm'
                    variant='fill'
                    placeholder={localize('Search markets')}
                    value={search_value}
                    onChange={event => setSearchValue(event.target.value)}
                />
                <button type='button' className='market-search__cancel' onClick={onBack}>
                    <Text size='sm' bold>
                        <Localize i18n_default_text='Cancel' />
                    </Text>
                </button>
            </div>
            {search_value.trim() ? (
                <MarketSearchResults
                    search_value={search_value}
                    symbols_by_trade_type={symbols_by_trade_type}
                    is_loading={is_loading}
                    onSelect={onSelectSymbol}
                    onInfo={onInfo}
                    supported_trade_types={supported_trade_types}
                />
            ) : (
                <div className='market-search__prompt'>
                    <Text size='sm' color='quill-typography__color--subtle'>
                        <Localize i18n_default_text='Search for a market by name.' />
                    </Text>
                </div>
            )}
        </div>
    );
};

export default MarketSearchPage;
