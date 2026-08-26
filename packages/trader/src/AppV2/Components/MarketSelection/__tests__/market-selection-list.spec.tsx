import { TActiveSymbolsResponse } from '@deriv/api';
import { act, render, screen } from '@testing-library/react';

import MarketSelectionList from '../market-selection-list';

type ActiveSymbols = NonNullable<TActiveSymbolsResponse['active_symbols']>;

jest.mock('@deriv-com/ui', () => ({ useDevice: () => ({ isMobile: false }) }));

// One unlabelled section with a single group holding all symbols, so the test controls row order.
jest.mock('AppV2/Utils/market-selection-utils', () => ({
    groupSymbolsForList: (symbols: ActiveSymbols) => [
        { subgroup: '', label: '', groups: [{ submarket: 'g', title: 'Group', items: symbols }] },
    ],
}));

jest.mock('../market-changes-dropdown', () => () => null);
jest.mock('../market-empty-state', () => () => null);

// Minimal row that attaches the list's observer ref to a queryable node.
jest.mock('../market-selection-row-desktop', () => {
    const Row = ({
        item,
        container_ref,
    }: {
        item: ActiveSymbols[number];
        container_ref?: React.Ref<HTMLDivElement>;
    }) => <div ref={container_ref} data-testid={`row-${item.underlying_symbol}`} />;
    return Row;
});
jest.mock('../market-selection-row-mobile', () => {
    const Row = () => null;
    return Row;
});

// Capture IntersectionObserver instances so tests can trigger a specific element into view.
const observers: { cb: (entries: { isIntersecting: boolean; target: Element }[]) => void; elements: Set<Element> }[] =
    [];
class MockIntersectionObserver {
    cb: (entries: { isIntersecting: boolean; target: Element }[]) => void;
    elements = new Set<Element>();
    constructor(cb: (entries: { isIntersecting: boolean; target: Element }[]) => void) {
        this.cb = cb;
        observers.push(this);
    }
    observe(el: Element) {
        this.elements.add(el);
    }
    unobserve(el: Element) {
        this.elements.delete(el);
    }
    disconnect() {
        this.elements.clear();
    }
}
const scrollIntoView = (el: Element) =>
    act(() => {
        observers.forEach(o => {
            if (o.elements.has(el)) o.cb([{ isIntersecting: true, target: el }]);
        });
    });

const makeSymbols = (...names: string[]): ActiveSymbols =>
    names.map((underlying_symbol, index) => ({
        underlying_symbol,
        market: 'forex',
        submarket: 'major_pairs',
        subgroup: 'major_pairs',
        exchange_is_open: 1,
        is_trading_suspended: 0,
        display_order: index,
    })) as ActiveSymbols;

describe('MarketSelectionList lazy tick fetching', () => {
    beforeEach(() => {
        observers.length = 0;
        (global as unknown as { IntersectionObserver: typeof MockIntersectionObserver }).IntersectionObserver =
            MockIntersectionObserver;
    });

    it('reports no symbols until a row scrolls into view', () => {
        const onRevealSymbols = jest.fn();
        render(
            <MarketSelectionList
                symbols={makeSymbols('frxEURUSD', 'frxGBPUSD')}
                is_loading={false}
                trade_type='Rise/Fall'
                onSelectSymbol={jest.fn()}
                onRevealSymbols={onRevealSymbols}
            />
        );
        // Nothing on screen has been observed as intersecting yet → nothing reported to fetch.
        expect(onRevealSymbols).not.toHaveBeenCalled();
    });

    it('reports each symbol (cumulatively) as its row scrolls into view', () => {
        const onRevealSymbols = jest.fn();
        render(
            <MarketSelectionList
                symbols={makeSymbols('frxEURUSD', 'frxGBPUSD')}
                is_loading={false}
                trade_type='Rise/Fall'
                onSelectSymbol={jest.fn()}
                onRevealSymbols={onRevealSymbols}
            />
        );
        scrollIntoView(screen.getByTestId('row-frxEURUSD'));
        expect(onRevealSymbols).toHaveBeenLastCalledWith(['frxEURUSD']);

        scrollIntoView(screen.getByTestId('row-frxGBPUSD'));
        expect(onRevealSymbols).toHaveBeenLastCalledWith(['frxEURUSD', 'frxGBPUSD']);
    });

    it('reveals immediately when IntersectionObserver is unavailable (fallback)', () => {
        (global as unknown as { IntersectionObserver?: unknown }).IntersectionObserver = undefined;
        const onRevealSymbols = jest.fn();
        render(
            <MarketSelectionList
                symbols={makeSymbols('frxEURUSD')}
                is_loading={false}
                trade_type='Rise/Fall'
                onSelectSymbol={jest.fn()}
                onRevealSymbols={onRevealSymbols}
            />
        );
        expect(onRevealSymbols).toHaveBeenLastCalledWith(['frxEURUSD']);
    });
});
