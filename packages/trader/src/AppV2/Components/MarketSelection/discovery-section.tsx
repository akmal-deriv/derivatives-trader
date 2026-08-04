import React from 'react';
import clsx from 'clsx';

import { TActiveSymbolsResponse } from '@deriv/api';
import { StandaloneChevronLeftBoldIcon, StandaloneChevronRightBoldIcon } from '@deriv/quill-icons';
import { Skeleton, Text } from '@deriv-com/quill-ui';
import { localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

import { TDiscoveryWindow } from 'AppV2/Utils/market-discovery-utils';

import MarketCard from './market-card';

type TActiveSymbol = NonNullable<TActiveSymbolsResponse['active_symbols']>[0];

export type TDiscoveryCard = {
    item: TActiveSymbol;
    change_percentage: number | null;
    /** Price points for the card's worm sparkline. */
    series?: number[];
    /** Decimal places for the card's latest candle value. */
    pip_size?: number;
};

type TDiscoverySection = {
    title: React.ReactNode;
    cards: TDiscoveryCard[];
    discovery_window: TDiscoveryWindow;
    onSelectSymbol: (underlying_symbol: string) => void;
    onInfo?: (underlying_symbol: string) => void;
    is_loading?: boolean;
};

const SKELETON_CARD_COUNT = 3;

/**
 * One discovery section (Trending / Gainers / Losers): a titled, horizontally scrollable row of
 * market cards. While loading, the title stays and the cards row shows skeletons. Once loaded,
 * a section with no cards renders nothing so no stray heading is left behind.
 *
 * Mobile hints at the horizontal scroll with a right-edge gradient; desktop instead exposes
 * left/right chevron buttons that scroll the row (disabled at each end).
 */
const DiscoverySection = ({
    title,
    cards,
    discovery_window,
    onSelectSymbol,
    onInfo,
    is_loading,
}: TDiscoverySection) => {
    const { isMobile } = useDevice();
    const cards_ref = React.useRef<HTMLDivElement>(null);
    const [can_scroll_left, setCanScrollLeft] = React.useState(false);
    const [can_scroll_right, setCanScrollRight] = React.useState(false);

    const updateScrollState = React.useCallback(() => {
        const el = cards_ref.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 0);
        // -1 for sub-pixel rounding so the right control disables cleanly at the end.
        setCanScrollRight(Math.ceil(el.scrollLeft + el.clientWidth) < el.scrollWidth - 1);
    }, []);

    React.useEffect(() => {
        if (isMobile) return undefined;
        const el = cards_ref.current;
        updateScrollState();
        el?.addEventListener('scroll', updateScrollState, { passive: true });
        window.addEventListener('resize', updateScrollState);
        return () => {
            el?.removeEventListener('scroll', updateScrollState);
            window.removeEventListener('resize', updateScrollState);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMobile, is_loading, cards.length, updateScrollState]);

    const scrollByPage = (direction: 1 | -1) => {
        const el = cards_ref.current;
        if (!el) return;
        el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
    };

    if (!is_loading && cards.length === 0) return null;

    return (
        <section
            className={clsx('market-selection__discovery-section', {
                'market-selection__discovery-section--desktop': !isMobile,
            })}
        >
            <div className='market-selection__discovery-section-header'>
                <Text size='lg' bold className='market-selection__discovery-section-title'>
                    {title}
                </Text>
                {!isMobile && (
                    <div className='market-selection__discovery-section-nav'>
                        <button
                            type='button'
                            className='market-selection__discovery-section-nav-button'
                            aria-label={localize('Scroll left')}
                            disabled={!can_scroll_left}
                            onClick={() => scrollByPage(-1)}
                        >
                            <StandaloneChevronLeftBoldIcon
                                iconSize='xs'
                                fill='var(--component-textIcon-normal-subtle)'
                            />
                        </button>
                        <button
                            type='button'
                            className='market-selection__discovery-section-nav-button'
                            aria-label={localize('Scroll right')}
                            disabled={!can_scroll_right}
                            onClick={() => scrollByPage(1)}
                        >
                            <StandaloneChevronRightBoldIcon
                                iconSize='xs'
                                fill='var(--component-textIcon-normal-subtle)'
                            />
                        </button>
                    </div>
                )}
            </div>
            <div className='market-selection__discovery-section-cards' ref={cards_ref}>
                {is_loading
                    ? Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
                          <Skeleton.Square key={index} width={208} height={160} rounded />
                      ))
                    : cards.map(({ item, change_percentage, series, pip_size }) => (
                          <MarketCard
                              key={item.underlying_symbol}
                              item={item}
                              change_percentage={change_percentage}
                              discovery_window={discovery_window}
                              onSelect={onSelectSymbol}
                              onInfo={onInfo}
                              series={series}
                              pip_size={pip_size}
                          />
                      ))}
            </div>
        </section>
    );
};

export default DiscoverySection;
