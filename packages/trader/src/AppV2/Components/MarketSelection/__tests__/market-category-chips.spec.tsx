import { render, screen } from '@testing-library/react';

import MarketCategoryChips from '../market-category-chips';

jest.mock('@deriv/shared', () => ({
    ...jest.requireActual('@deriv/shared'),
    trackMarketCategoryTabClicked: jest.fn(),
}));

// <Localize> renders its default text in tests; that's enough to assert the fixed category labels are
// rendered reactively (via <Localize>) rather than from the passed-in string.
jest.mock('@deriv-com/translations', () => ({
    Localize: ({ i18n_default_text }: { i18n_default_text: string }) => <span>{i18n_default_text}</span>,
}));

describe('MarketCategoryChips', () => {
    it('renders the fixed category labels via <Localize> (keyed by id, not the passed string)', () => {
        render(
            <MarketCategoryChips
                categories={[
                    // A deliberately wrong string label proves the label comes from the id → <Localize>
                    // map, not from `category.label`.
                    { id: 'featured', label: 'WRONG' },
                    { id: 'synthetic_index', label: 'WRONG' },
                    { id: 'indices', label: 'WRONG' },
                ]}
                selected_id='featured'
                onSelect={jest.fn()}
            />
        );

        expect(screen.getByText('Featured')).toBeInTheDocument();
        expect(screen.getByText('Derived')).toBeInTheDocument();
        expect(screen.getByText('Stocks & indices')).toBeInTheDocument();
        expect(screen.queryByText('WRONG')).not.toBeInTheDocument();
    });

    it('falls back to the string label for a category id with no fixed <Localize> entry', () => {
        render(
            <MarketCategoryChips
                categories={[{ id: 'some_new_market', label: 'New Market' }]}
                selected_id='some_new_market'
                onSelect={jest.fn()}
            />
        );

        expect(screen.getByText('New Market')).toBeInTheDocument();
    });
});
