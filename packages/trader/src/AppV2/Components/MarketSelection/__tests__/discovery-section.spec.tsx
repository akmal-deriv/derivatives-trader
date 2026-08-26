import { TActiveSymbolsResponse } from '@deriv/api';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import DiscoverySection from '../discovery-section';

type ActiveSymbols = NonNullable<TActiveSymbolsResponse['active_symbols']>;

jest.mock('@deriv-com/ui', () => ({ useDevice: () => ({ isMobile: false }) }));
jest.mock('../market-card', () => {
    const MarketCard = () => <div data-testid='market-card' />;
    return MarketCard;
});

// getComputedStyle drives the row's layout direction. Force it per test, delegating everything else to
// the real implementation so quill-ui rendering is unaffected.
let mock_direction: 'ltr' | 'rtl' = 'ltr';
const real_get_computed_style = window.getComputedStyle.bind(window);
beforeAll(() => {
    jest.spyOn(window, 'getComputedStyle').mockImplementation((el: Element, pseudo?: string | null) => {
        const style = real_get_computed_style(el, pseudo ?? undefined);
        return new Proxy(style, {
            get(target, prop) {
                if (prop === 'direction') return mock_direction;
                const value = target[prop as keyof CSSStyleDeclaration];
                return typeof value === 'function' ? (value as () => unknown).bind(target) : value;
            },
        });
    });
});
afterAll(() => jest.restoreAllMocks());

const makeCard = (underlying_symbol: string) => ({
    item: { underlying_symbol, exchange_is_open: 1 } as ActiveSymbols[number],
    change_percentage: 1.2,
});

const renderSection = () =>
    render(
        <DiscoverySection
            title='Trending'
            cards={[makeCard('R_100'), makeCard('R_50')]}
            discovery_window='5m'
            onSelectSymbol={jest.fn()}
        />
    );

// Give the scrollable row real metrics so the controls enable, then let the resize listener recompute.
const primeScroll = (container: HTMLElement, { scrollLeft }: { scrollLeft: number }) => {
    // The scrollable row is a plain div with no role/label, so target it by class to stub scroll metrics.
    // eslint-disable-next-line testing-library/no-node-access
    const el = container.querySelector('.market-selection__discovery-section-cards') as HTMLElement;
    Object.defineProperty(el, 'clientWidth', { configurable: true, value: 100 });
    Object.defineProperty(el, 'scrollWidth', { configurable: true, value: 500 });
    Object.defineProperty(el, 'scrollLeft', { configurable: true, writable: true, value: scrollLeft });
    const scrollBy = jest.fn();
    el.scrollBy = scrollBy;
    fireEvent(window, new Event('resize'));
    return scrollBy;
};

describe('DiscoverySection navigation (direction-aware)', () => {
    afterEach(() => {
        mock_direction = 'ltr';
    });

    it('LTR: "end" scrolls physically right, "start" scrolls physically left', async () => {
        mock_direction = 'ltr';
        const { container } = renderSection();
        const scrollBy = primeScroll(container, { scrollLeft: 50 });

        await userEvent.click(screen.getByRole('button', { name: 'Scroll to end' }));
        expect(scrollBy).toHaveBeenLastCalledWith({ left: 80, behavior: 'smooth' });

        await userEvent.click(screen.getByRole('button', { name: 'Scroll to start' }));
        expect(scrollBy).toHaveBeenLastCalledWith({ left: -80, behavior: 'smooth' });
    });

    it('RTL: "end" scrolls physically left, "start" scrolls physically right', async () => {
        mock_direction = 'rtl';
        const { container } = renderSection();
        // In RTL the from-start distance is |scrollLeft|, so a negative scrollLeft means "scrolled".
        const scrollBy = primeScroll(container, { scrollLeft: -50 });

        await userEvent.click(screen.getByRole('button', { name: 'Scroll to end' }));
        expect(scrollBy).toHaveBeenLastCalledWith({ left: -80, behavior: 'smooth' });

        await userEvent.click(screen.getByRole('button', { name: 'Scroll to start' }));
        expect(scrollBy).toHaveBeenLastCalledWith({ left: 80, behavior: 'smooth' });
    });

    it('disables "start" at the beginning and keeps "end" available when more content follows', () => {
        mock_direction = 'ltr';
        const { container } = renderSection();
        primeScroll(container, { scrollLeft: 0 });

        expect(screen.getByRole('button', { name: 'Scroll to start' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Scroll to end' })).toBeEnabled();
    });
});
