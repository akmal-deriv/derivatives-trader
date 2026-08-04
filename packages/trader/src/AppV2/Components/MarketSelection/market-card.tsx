import clsx from 'clsx';

import { TActiveSymbolsResponse } from '@deriv/api';
import { StandaloneCircleInfoBoldIcon } from '@deriv/quill-icons';
import { getSymbolDisplayName, trackMarketInfoViewed } from '@deriv/shared';
import { Tag, Text } from '@deriv-com/quill-ui';
import { Localize, localize } from '@deriv-com/translations';

import { formatChangePercentage, TDiscoveryWindow } from 'AppV2/Utils/market-discovery-utils';

import SymbolIconsMapper from '../SymbolIconsMapper/symbol-icons-mapper';

import MarketSparkline from './market-sparkline';

type TMarketCard = {
    item: NonNullable<TActiveSymbolsResponse['active_symbols']>[0];
    change_percentage: number | null;
    discovery_window: TDiscoveryWindow;
    onSelect: (underlying_symbol: string) => void;
    /** Opens the market info screen. The chevron next to the change is the trigger. */
    onInfo?: (underlying_symbol: string) => void;
    /** Price points for the worm sparkline; a short series just renders nothing. */
    series?: number[];
    /** Decimal places for the latest candle value (from the candle response). */
    pip_size?: number;
};

/**
 * A discovery card (Trending / Gainers / Losers): icon, display name, and the windowed % change
 * coloured by direction (CLOSED tag when shut. Tapping the card selects the market; the
 * chevron next to the change opens the market info screen (favouriting lives there now).
 */
const MarketCard = ({ item, change_percentage, discovery_window, onSelect, onInfo, series, pip_size }: TMarketCard) => {
    const underlying_symbol = item.underlying_symbol ?? '';
    const is_positive = (change_percentage ?? 0) > 0;
    const is_negative = (change_percentage ?? 0) < 0;

    // Latest candle close from the sparkline series, formatted to the symbol's pip precision.
    const candle_value = series && series.length ? series[series.length - 1] : null;

    return (
        <div
            className='market-card'
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
            <div className='market-card__top'>
                <SymbolIconsMapper symbol={underlying_symbol} />
                {series && series.length > 1 && (
                    <MarketSparkline data={series} is_positive={is_positive} is_negative={is_negative} />
                )}
            </div>
            <div className='market-card__body'>
                <Text size='md' className='market-card__name'>
                    {getSymbolDisplayName(underlying_symbol)}
                </Text>
                {candle_value !== null && (
                    <Text size='lg' bold className='market-card__value'>
                        {candle_value.toFixed(pip_size ?? 2)}
                    </Text>
                )}
                <div className='market-card__change-row'>
                    {item.exchange_is_open ? (
                        <Text
                            size='sm'
                            className={clsx('market-card__change', {
                                'market-card__change--positive': is_positive,
                                'market-card__change--negative': is_negative,
                            })}
                        >
                            {formatChangePercentage(change_percentage)}{' '}
                            <span className='market-card__window'>({discovery_window})</span>
                        </Text>
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
                            className='market-card__info'
                            aria-label={localize('Info')}
                            onClick={event => {
                                event.stopPropagation();
                                trackMarketInfoViewed({
                                    market_name: getSymbolDisplayName(underlying_symbol),
                                    source: 'market_card',
                                });
                                onInfo(underlying_symbol);
                            }}
                        >
                            <StandaloneCircleInfoBoldIcon
                                iconSize='sm'
                                fill='var(--component-textIcon-normal-subtle)'
                            />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MarketCard;
