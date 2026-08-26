import { TActiveSymbolsResponse } from '@deriv/api';
import { getSymbolDisplayName } from '@deriv/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MarketSelectionRowMobile from '../market-selection-row-mobile';

const mockToggleFavourite = jest.fn();
let mockIsFavourite = false;
let mockLang = 'EN';

jest.mock('AppV2/Hooks/useFavouriteMarkets', () => ({
    __esModule: true,
    default: () => ({
        favourites: [],
        isFavourite: () => mockIsFavourite,
        toggleFavourite: mockToggleFavourite,
    }),
}));

jest.mock('@deriv-com/translations', () => ({
    Localize: ({ i18n_default_text }: { i18n_default_text: string }) => <span>{i18n_default_text}</span>,
    localize: (text: string) => text,
    // useIsRtl (from @deriv/api) resolves direction via the i18next instance's dir(), so stub it to
    // report RTL for Arabic — this exercises the real hook rather than a hardcoded language check.
    useTranslations: () => ({
        currentLang: mockLang,
        instance: { dir: (lang?: string) => (lang === 'ar' ? 'rtl' : 'ltr') },
    }),
}));

// Drive react-swipeable's mouse tracking (SWIPE_CONFIG enables trackMouse): press, drag past the
// threshold in one direction, release. Move/up fire on the document, where the library listens.
const swipe = (el: Element, direction: 'left' | 'right') => {
    const from = direction === 'left' ? 200 : 0;
    const to = direction === 'left' ? 0 : 200;
    fireEvent.mouseDown(el, { clientX: from, clientY: 0 });
    fireEvent.mouseMove(document, { clientX: (from + to) / 2, clientY: 0 });
    fireEvent.mouseMove(document, { clientX: to, clientY: 0 });
    fireEvent.mouseUp(document, { clientX: to, clientY: 0 });
};

jest.mock('../../SymbolIconsMapper/symbol-icons-mapper', () => {
    const SymbolIcon = () => <div data-testid='symbol-icon' />;
    return SymbolIcon;
});

type ActiveSymbols = NonNullable<TActiveSymbolsResponse['active_symbols']>;

const makeItem = (overrides: Partial<ActiveSymbols[number]> = {}): ActiveSymbols[number] =>
    ({
        underlying_symbol: 'frxEURUSD',
        market: 'forex',
        submarket: 'major_pairs',
        subgroup: 'major_pairs',
        exchange_is_open: 1,
        is_trading_suspended: 0,
        display_order: 0,
        ...overrides,
    }) as ActiveSymbols[number];

const eur_name = getSymbolDisplayName('frxEURUSD');

describe('MarketSelectionRowMobile', () => {
    beforeEach(() => {
        mockToggleFavourite.mockClear();
        mockIsFavourite = false;
        mockLang = 'EN';
    });

    it('renders the symbol display name', () => {
        render(<MarketSelectionRowMobile item={makeItem()} trade_type='Rise/Fall' onSelect={jest.fn()} />);
        expect(screen.getByText(eur_name)).toBeInTheDocument();
    });

    it('shows the % change pill when the market is open', () => {
        render(
            <MarketSelectionRowMobile
                item={makeItem()}
                trade_type='Rise/Fall'
                onSelect={jest.fn()}
                change_percentage={1.25}
            />
        );
        expect(screen.getByText('+1.25%')).toBeInTheDocument();
    });

    it('shows a CLOSED tag instead of the change when the market is shut', () => {
        render(
            <MarketSelectionRowMobile
                item={makeItem({ exchange_is_open: 0 })}
                trade_type='Rise/Fall'
                onSelect={jest.fn()}
                change_percentage={1.25}
            />
        );
        expect(screen.getByText('CLOSED')).toBeInTheDocument();
        expect(screen.queryByText('+1.25%')).not.toBeInTheDocument();
    });

    it('renders no stray "0" when the market is closed', () => {
        const { container } = render(
            <MarketSelectionRowMobile
                item={makeItem({ exchange_is_open: 0 })}
                trade_type='Rise/Fall'
                onSelect={jest.fn()}
            />
        );
        // Regression: `exchange_is_open` (0|1) must be compared, not truthy-tested — else `0` leaks in.
        expect(container).not.toHaveTextContent('0');
    });

    it('never renders a worm sparkline on mobile, even with a usable series', () => {
        // The mobile market list intentionally omits the sparkline (unlike desktop). The `series`
        // prop is still accepted for parity but must not render anything.
        render(
            <MarketSelectionRowMobile
                item={makeItem()}
                trade_type='Rise/Fall'
                onSelect={jest.fn()}
                series={[100, 101, 102]}
            />
        );
        expect(screen.queryByTestId('dt_market_sparkline')).not.toBeInTheDocument();
    });

    it('fires onSelect when the row content is clicked', async () => {
        const onSelect = jest.fn();
        render(<MarketSelectionRowMobile item={makeItem()} trade_type='Rise/Fall' onSelect={onSelect} />);
        await userEvent.click(screen.getByRole('button', { name: eur_name }));
        expect(onSelect).toHaveBeenCalledWith('frxEURUSD');
    });

    it('exposes Info + Favourite swipe actions and wires them', async () => {
        const onInfo = jest.fn();
        render(
            <MarketSelectionRowMobile item={makeItem()} trade_type='Rise/Fall' onSelect={jest.fn()} onInfo={onInfo} />
        );
        // Swipe actions are hidden from the a11y tree until the row is swiped open, so the default
        // (accessible-only) query can't see them.
        expect(screen.queryByRole('button', { name: 'Favourite' })).not.toBeInTheDocument();
        // They still exist in the DOM and stay wired — query with { hidden: true } to reach them.
        await userEvent.click(screen.getByRole('button', { name: 'Favourite', hidden: true }));
        expect(mockToggleFavourite).toHaveBeenCalledWith('frxEURUSD', 'Rise/Fall', 'market_list');
        await userEvent.click(screen.getByRole('button', { name: 'Info', hidden: true }));
        expect(onInfo).toHaveBeenCalledWith('frxEURUSD', 'Rise/Fall');
    });

    it('hides the Info action when no onInfo handler is provided', () => {
        render(<MarketSelectionRowMobile item={makeItem()} trade_type='Rise/Fall' onSelect={jest.fn()} />);
        expect(screen.queryByRole('button', { name: 'Info', hidden: true })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Favourite', hidden: true })).toBeInTheDocument();
    });

    // The actions become part of the a11y tree (aria-hidden flips off) only once revealed, so their
    // visibility to the default query is a proxy for "the swipe opened the row".
    it('LTR: a swipe left reveals the actions; a swipe right hides them again', () => {
        render(<MarketSelectionRowMobile item={makeItem()} trade_type='Rise/Fall' onSelect={jest.fn()} />);
        const content = screen.getByRole('button', { name: eur_name });

        expect(screen.queryByRole('button', { name: 'Favourite' })).not.toBeInTheDocument();
        swipe(content, 'left');
        expect(screen.getByRole('button', { name: 'Favourite' })).toBeInTheDocument();
        swipe(content, 'right');
        expect(screen.queryByRole('button', { name: 'Favourite' })).not.toBeInTheDocument();
    });

    it('RTL: the reveal gesture is flipped — a swipe right reveals, a swipe left does not', () => {
        mockLang = 'AR';
        render(<MarketSelectionRowMobile item={makeItem()} trade_type='Rise/Fall' onSelect={jest.fn()} />);
        const content = screen.getByRole('button', { name: eur_name });

        // A swipe left (the LTR reveal direction) must NOT open the row in RTL.
        swipe(content, 'left');
        expect(screen.queryByRole('button', { name: 'Favourite' })).not.toBeInTheDocument();
        // Swiping right reveals it.
        swipe(content, 'right');
        expect(screen.getByRole('button', { name: 'Favourite' })).toBeInTheDocument();
    });
});
