import { render, screen } from '@testing-library/react';

import {
    FavouriteSubgroupTitle,
    getMarketLabel,
    getSubgroupLabel,
    getSubmarketLabel,
    showsSubgroupPrefix,
} from '../market-selection-labels';
import { getTradeTypeLabel } from '../trade-types-utils';

// <Localize> renders its default text and localize() returns its argument, so the labels render as the
// English defaults — enough to assert each key maps to the right text (and unknown keys fall through).
jest.mock('@deriv-com/translations', () => ({
    Localize: ({ i18n_default_text }: { i18n_default_text: string }) => <span>{i18n_default_text}</span>,
    localize: (text: string) => text,
    useTranslations: () => ({ localize: (text: string) => text }),
}));

const text = (node: React.ReactNode) => {
    render(<>{node}</>);
};

describe('market-selection-labels', () => {
    describe('getMarketLabel', () => {
        it('maps a known market to its localized label', () => {
            text(getMarketLabel('synthetic_index'));
            expect(screen.getByText('Derived')).toBeInTheDocument();
        });

        it('falls back to the raw key for an unknown market', () => {
            text(getMarketLabel('brand_new_market'));
            expect(screen.getByText('brand_new_market')).toBeInTheDocument();
        });
    });

    describe('getSubgroupLabel', () => {
        it('maps a known subgroup to its localized label', () => {
            text(getSubgroupLabel('synthetics', 'synthetic_index'));
            expect(screen.getByText('Synthetics')).toBeInTheDocument();
        });

        it("uses the market label for the 'none' subgroup", () => {
            text(getSubgroupLabel('none', 'forex'));
            expect(screen.getByText('Forex')).toBeInTheDocument();
        });

        it('falls back to the raw subgroup key when unmapped', () => {
            text(getSubgroupLabel('brand_new_subgroup', 'forex'));
            expect(screen.getByText('brand_new_subgroup')).toBeInTheDocument();
        });
    });

    describe('getSubmarketLabel', () => {
        it('maps a known submarket to its localized label', () => {
            text(getSubmarketLabel('random_index'));
            expect(screen.getByText('Volatility indices')).toBeInTheDocument();
        });

        it('falls back to the raw key for an unknown submarket', () => {
            text(getSubmarketLabel('brand_new_submarket'));
            expect(screen.getByText('brand_new_submarket')).toBeInTheDocument();
        });
    });

    describe('showsSubgroupPrefix', () => {
        it('is true when the subgroup name differs from the submarket name', () => {
            expect(showsSubgroupPrefix('synthetics', 'random_index', 'synthetic_index')).toBe(true);
        });

        it('is false when the subgroup and submarket resolve to the same name', () => {
            expect(showsSubgroupPrefix('major_pairs', 'major_pairs', 'forex')).toBe(false);
        });
    });

    describe('FavouriteSubgroupTitle', () => {
        it('renders "Subgroup (Submarket)" when the two names differ', () => {
            render(<FavouriteSubgroupTitle subgroup='synthetics' submarket='random_index' market='synthetic_index' />);
            expect(screen.getByText(/Synthetics/)).toBeInTheDocument();
            expect(screen.getByText(/Volatility indices/)).toBeInTheDocument();
        });

        it('renders the submarket alone when the subgroup adds nothing', () => {
            render(<FavouriteSubgroupTitle subgroup='major_pairs' submarket='major_pairs' market='forex' />);
            expect(screen.getByText('Major pairs')).toBeInTheDocument();
        });
    });

    describe('getTradeTypeLabel', () => {
        it('maps a known trade type to its localized label', () => {
            text(getTradeTypeLabel('Rise/Fall'));
            expect(screen.getByText('Rise/Fall')).toBeInTheDocument();
        });

        it('falls back to the raw id for an unknown trade type', () => {
            text(getTradeTypeLabel('SomeNewTradeType'));
            expect(screen.getByText('SomeNewTradeType')).toBeInTheDocument();
        });
    });
});
