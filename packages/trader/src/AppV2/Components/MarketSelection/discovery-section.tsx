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
    // Controls are logical (start/end), not physical (left/right): in an RTL layout the row scrolls the
    // other way, so we key everything off the row's *actual* rendered direction rather than the language
    // (the desktop popover is deliberately LTR even in Arabic, so language alone would mis-flip it).
    const [is_rtl, setIsRtl] = React.useState(false);
    const [can_scroll_start, setCanScrollStart] = React.useState(false);
    const [can_scroll_end, setCanScrollEnd] = React.useState(false);

    const updateScrollState = React.useCallback(() => {
        const el = cards_ref.current;
        if (!el) return;
        // Distance scrolled from the inline start: LTR reports 0..max (positive), RTL reports 0..-max
        // (negative in modern browsers), so abs() gives the from-start distance in both directions.
        const scrolled = Math.abs(el.scrollLeft);
        setCanScrollStart(scrolled > 0);
        // -1 for sub-pixel rounding so the end control disables cleanly at the end.
        setCanScrollEnd(Math.ceil(scrolled + el.clientWidth) < el.scrollWidth - 1);
    }, []);

    React.useEffect(() => {
        if (isMobile) return undefined;
        const el = cards_ref.current;
        if (el) setIsRtl(getComputedStyle(el).direction === 'rtl');
        updateScrollState();
        el?.addEventListener('scroll', updateScrollState, { passive: true });
        window.addEventListener('resize', updateScrollState);
        return () => {
            el?.removeEventListener('scroll', updateScrollState);
            window.removeEventListener('resize', updateScrollState);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMobile, is_loading, cards.length, updateScrollState]);

    const scrollByPage = (toward: 'start' | 'end') => {
        const el = cards_ref.current;
        if (!el) return;
        const magnitude = el.clientWidth * 0.8;
        // scrollBy({ left }) is physical (+ scrolls right). Toward the list end is physically right in
        // LTR and physically left in RTL; toward the start is the reverse.
        const toward_physical_right = toward === 'end' ? !is_rtl : is_rtl;
        el.scrollBy({ left: toward_physical_right ? magnitude : -magnitude, behavior: 'smooth' });
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
                        {/* "Start" button: scrolls toward the beginning of the row. Its chevron points the
                            way it scrolls — left in LTR, right in RTL — so it stays consistent in Arabic. */}
                        <button
                            type='button'
                            className='market-selection__discovery-section-nav-button'
                            aria-label={localize('Scroll to start')}
                            disabled={!can_scroll_start}
                            onClick={() => scrollByPage('start')}
                        >
                            {is_rtl ? (
                                <StandaloneChevronRightBoldIcon
                                    iconSize='xs'
                                    fill='var(--component-textIcon-normal-subtle)'
                                />
                            ) : (
                                <StandaloneChevronLeftBoldIcon
                                    iconSize='xs'
                                    fill='var(--component-textIcon-normal-subtle)'
                                />
                            )}
                        </button>
                        <button
                            type='button'
                            className='market-selection__discovery-section-nav-button'
                            aria-label={localize('Scroll to end')}
                            disabled={!can_scroll_end}
                            onClick={() => scrollByPage('end')}
                        >
                            {is_rtl ? (
                                <StandaloneChevronLeftBoldIcon
                                    iconSize='xs'
                                    fill='var(--component-textIcon-normal-subtle)'
                                />
                            ) : (
                                <StandaloneChevronRightBoldIcon
                                    iconSize='xs'
                                    fill='var(--component-textIcon-normal-subtle)'
                                />
                            )}
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
