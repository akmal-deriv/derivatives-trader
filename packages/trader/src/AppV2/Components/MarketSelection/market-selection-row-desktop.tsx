import { Ref } from 'react';
import clsx from 'clsx';

import { TActiveSymbolsResponse } from '@deriv/api';
import { StandaloneCircleInfoBoldIcon, StandaloneStarFillIcon, StandaloneStarRegularIcon } from '@deriv/quill-icons';
import { getSymbolDisplayName, trackMarketInfoViewed } from '@deriv/shared';
import { observer } from '@deriv/stores';
import { Tag, Text } from '@deriv-com/quill-ui';
import { Localize, localize } from '@deriv-com/translations';

import useFavouriteMarkets from 'AppV2/Hooks/useFavouriteMarkets';
import { formatChangePercentage } from 'AppV2/Utils/market-discovery-utils';

import SymbolIconsMapper from '../SymbolIconsMapper/symbol-icons-mapper';

import MarketSparkline from './market-sparkline';

type TMarketSelectionRowDesktop = {
    item: NonNullable<TActiveSymbolsResponse['active_symbols']>[0];
    /** Trade-type tab this row belongs to — the favourite is stored per {symbol, trade_type}. */
    trade_type: string;
    onSelect: (underlying_symbol: string) => void;
    /** Windowed % change for the row's pill; omitted when not computed (e.g. search results). */
    change_percentage?: number | null;
    /** Price points for the row worm sparkline; a short series just renders nothing. */
    series?: number[];
    /** Opens the market info screen for the symbol under this row's trade type. */
    onInfo?: (underlying_symbol: string, trade_type: string) => void;
    /** Ref on the row's root — lets the list observe when it scrolls into view (lazy tick fetch). */
    container_ref?: Ref<HTMLDivElement>;
};

/**
 * Desktop market row: icon, display name, a windowed % change pill (CLOSED tag when shut), and
 * always-visible Info + Favourite actions (no swipe — desktop reveals them inline on the row, which
 * lift on hover). Clicking the row body selects the market; the action buttons stop propagation.
 */
const MarketSelectionRowDesktop = observer(
    ({ item, trade_type, onSelect, change_percentage, series, onInfo, container_ref }: TMarketSelectionRowDesktop) => {
        const underlying_symbol = item.underlying_symbol ?? '';
        const { isFavourite, toggleFavourite } = useFavouriteMarkets();

        const is_favourite = isFavourite(underlying_symbol, trade_type);
        const is_positive = (change_percentage ?? 0) > 0;
        const is_negative = (change_percentage ?? 0) < 0;

        return (
            <div
                ref={container_ref}
                className='market-row-desktop'
                role='button'
                tabIndex={0}
                onClick={() => onSelect(underlying_symbol)}
                onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelect(underlying_symbol);
                    }
                }}
            >
                <SymbolIconsMapper symbol={underlying_symbol} />
                <Text size='md' className='market-row-desktop__name'>
                    {getSymbolDisplayName(underlying_symbol)}
                </Text>
                <div className='market-row-desktop__meta'>
                    {item.exchange_is_open ? (
                        <>
                            {series && series.length > 1 && (
                                <MarketSparkline
                                    data={series}
                                    is_positive={is_positive}
                                    is_negative={is_negative}
                                    width={102}
                                    with_area
                                />
                            )}
                            {change_percentage != null && (
                                <span
                                    className={clsx('market-row-desktop__change', {
                                        'market-row-desktop__change--positive': is_positive,
                                        'market-row-desktop__change--negative': is_negative,
                                    })}
                                >
                                    <Text size='sm'>{formatChangePercentage(change_percentage)}</Text>
                                </span>
                            )}
                        </>
                    ) : (
                        <Tag
                            label={<Localize key='closed' i18n_default_text='CLOSED' />}
                            color='error'
                            variant='fill'
                            showIcon={false}
                            size='sm'
                        />
                    )}
                    {onInfo && (
                        <button
                            type='button'
                            className='market-row-desktop__action'
                            aria-label={localize('Info')}
                            onClick={event => {
                                event.stopPropagation();
                                trackMarketInfoViewed({
                                    market_name: getSymbolDisplayName(underlying_symbol),
                                    source: 'market_list',
                                });
                                onInfo(underlying_symbol, trade_type);
                            }}
                        >
                            <StandaloneCircleInfoBoldIcon fill='var(--component-textIcon-normal-subtle)' />
                        </button>
                    )}
                    <button
                        type='button'
                        className='market-row-desktop__action'
                        aria-label={localize(is_favourite ? 'Unfavourite' : 'Favourite')}
                        onClick={event => {
                            event.stopPropagation();
                            toggleFavourite(underlying_symbol, trade_type, 'market_list');
                        }}
                    >
                        {is_favourite ? (
                            <StandaloneStarFillIcon fill='var(--core-color-solid-mustard-700)' iconSize='sm' />
                        ) : (
                            <StandaloneStarRegularIcon fill='var(--component-textIcon-normal-subtle)' iconSize='sm' />
                        )}
                    </button>
                </div>
            </div>
        );
    }
);

export default MarketSelectionRowDesktop;
