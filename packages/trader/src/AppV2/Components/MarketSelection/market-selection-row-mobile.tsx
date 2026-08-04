import { Ref, useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import clsx from 'clsx';

import { TActiveSymbolsResponse } from '@deriv/api';
import {
    LabelPairedCircleInfoMdRegularIcon,
    StandaloneStarFillIcon,
    StandaloneStarRegularIcon,
} from '@deriv/quill-icons';
import { getSymbolDisplayName, trackMarketInfoViewed } from '@deriv/shared';
import { observer } from '@deriv/stores';
import { Tag, Text } from '@deriv-com/quill-ui';
import { Localize, localize } from '@deriv-com/translations';

import useFavouriteMarkets from 'AppV2/Hooks/useFavouriteMarkets';
import { formatChangePercentage } from 'AppV2/Utils/market-discovery-utils';

import SymbolIconsMapper from '../SymbolIconsMapper/symbol-icons-mapper';

const SWIPE_CONFIG = { trackMouse: true, preventScrollOnSwipe: true };

type TMarketSelectionRowMobile = {
    item: NonNullable<TActiveSymbolsResponse['active_symbols']>[0];
    /** Trade-type tab this row belongs to — the favourite is stored per {symbol, trade_type}. */
    trade_type: string;
    onSelect: (underlying_symbol: string) => void;
    /** Windowed % change for the row's pill; omitted when not computed (e.g. search results). */
    change_percentage?: number | null;
    /** Accepted for parity with the desktop row (the list renders a shared `<Row>`), but the mobile
     * list intentionally shows no worm sparkline — so this is not rendered here. */
    series?: number[];
    /** Opens the market info screen for the symbol under this row's trade type (from the swipe action). */
    onInfo?: (underlying_symbol: string, trade_type: string) => void;
    /** Ref on the row's root — lets the list observe when it scrolls into view (lazy tick fetch). */
    container_ref?: Ref<HTMLDivElement>;
};

/**
 * A market row: icon, display name, and a windowed % change pill (CLOSED tag when shut). Swiping left
 * reveals Info + Favourite actions rather than an overflow menu. Unlike desktop, the mobile row shows
 * no worm sparkline.
 */
const MarketSelectionRowMobile = observer(
    ({ item, trade_type, onSelect, change_percentage, onInfo, container_ref }: TMarketSelectionRowMobile) => {
        const underlying_symbol = item.underlying_symbol ?? '';
        const { isFavourite, toggleFavourite } = useFavouriteMarkets();
        const [show_actions, setShowActions] = useState(false);

        const is_favourite = isFavourite(underlying_symbol, trade_type);
        const is_positive = (change_percentage ?? 0) > 0;
        const is_negative = (change_percentage ?? 0) < 0;

        const swipe_handlers = useSwipeable({
            onSwipedLeft: () => setShowActions(true),
            onSwipedRight: () => setShowActions(false),
            ...SWIPE_CONFIG,
        });

        const handleSelect = () => onSelect(underlying_symbol);

        return (
            <div
                ref={container_ref}
                className={clsx('market-selection-row', { 'market-selection-row--show-actions': show_actions })}
            >
                <div className='market-selection-row__actions' aria-hidden={!show_actions}>
                    {onInfo && (
                        <button
                            type='button'
                            className='market-selection-row__action market-selection-row__action--info'
                            aria-label={localize('Info')}
                            tabIndex={show_actions ? 0 : -1}
                            onClick={() => {
                                setShowActions(false);
                                trackMarketInfoViewed({
                                    market_name: getSymbolDisplayName(underlying_symbol),
                                    source: 'market_list',
                                });
                                onInfo(underlying_symbol, trade_type);
                            }}
                        >
                            <LabelPairedCircleInfoMdRegularIcon fill='var(--core-color-solid-slate-50, #fff)' />
                        </button>
                    )}
                    <button
                        type='button'
                        className='market-selection-row__action market-selection-row__action--favourite'
                        aria-label={localize(is_favourite ? 'Unfavourite' : 'Favourite')}
                        tabIndex={show_actions ? 0 : -1}
                        onClick={() => toggleFavourite(underlying_symbol, trade_type, 'market_list')}
                    >
                        {is_favourite ? (
                            <StandaloneStarFillIcon fill='var(--core-color-solid-slate-50, #fff)' iconSize='sm' />
                        ) : (
                            <StandaloneStarRegularIcon fill='var(--core-color-solid-slate-50, #fff)' iconSize='sm' />
                        )}
                    </button>
                </div>

                <div
                    className='market-selection-row__content'
                    role='button'
                    tabIndex={0}
                    onClick={handleSelect}
                    onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleSelect();
                        }
                    }}
                    {...swipe_handlers}
                >
                    <SymbolIconsMapper symbol={underlying_symbol} />
                    <Text size='md' className='market-selection-row__name'>
                        {getSymbolDisplayName(underlying_symbol)}
                    </Text>
                    {item.exchange_is_open ? (
                        <>
                            {change_percentage != null && (
                                <span
                                    className={clsx('market-selection-row__change', {
                                        'market-selection-row__change--positive': is_positive,
                                        'market-selection-row__change--negative': is_negative,
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
                </div>
            </div>
        );
    }
);

export default MarketSelectionRowMobile;
