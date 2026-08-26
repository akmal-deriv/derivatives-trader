/**
 * @name     Market selection — favourite toggle and persistence across reload
 * @id       flow-10, flow-11
 * @flow     playwright/flows/market-selection/flow.md#flow-10--favourite-toggle-from-the-browse-list
 * @coverage playwright/flows/market-selection/coverage.md
 */
import { test, expect } from '../../fixtures/fixtures';
import { NavigationUtils } from '../../utils';
import { TradeBasePage } from '../../pages/TradeBasePage';

test.describe('Market Selection', { tag: ['@desktop', '@mobile', '@market-selection'] }, () => {
    test.beforeAll(async () => {
        if (!process.env.BASE_URL) throw new Error('BASE_URL is not set in playwright/.env');
    });

    test.beforeEach(async ({ page, tradeParametersPage, marketSelectionPage }) => {
        await TradeBasePage.seedLocalStorageOnOrigin(page);
        await tradeParametersPage.gotoTradePage();
        await marketSelectionPage.addMarketButton.click();
        await expect(marketSelectionPage.marketSelectionPanel, 'Picker should be open').toBeVisible();
    });

    test('VERIFY favouriting a market shows it under the Favourite tab and count updates', async ({
        marketSelectionPage,
    }) => {
        await marketSelectionPage.openMarketSearch();
        await marketSelectionPage.marketSearchInput.fill('Volatility 100 Index');
        await expect(
            marketSelectionPage.marketSearchResultRow('Volatility 100 Index', 'Rise/Fall'),
            'Search should locate the market under Rise/Fall'
        ).toBeVisible();

        await marketSelectionPage.toggleFavourite('Volatility 100 Index');
        await expect(
            marketSelectionPage.favouriteButton('Volatility 100 Index'),
            'Favourite button should flip to Unfavourite'
        ).toHaveAttribute('aria-label', 'Unfavourite');

        // The trade-type tablist (including favouritesTab) is unreachable while a search query
        // is active — on mobile it's a dedicated page that replaces the tablist entirely (exit
        // via Cancel); on desktop the search-results pane persists over it until cleared.
        await marketSelectionPage.marketSearchInput.fill('');
        await marketSelectionPage.exitMarketSearch();

        await expect(
            marketSelectionPage.favouritesTab,
            'Favourite tab should show a count of at least 1'
        ).toContainText(/Favourite \([1-9]\d*\)/);

        await marketSelectionPage.favouritesTab.click();
        await expect(
            marketSelectionPage.favouriteMarketRow('Volatility 100 Index'),
            'Favourited market should appear in the Favourite tab, grouped by trade type'
        ).toBeVisible();

        await marketSelectionPage.toggleFavourite('Volatility 100 Index');
        await expect(
            marketSelectionPage.favouriteMarketRow('Volatility 100 Index'),
            'Unfavouriting should remove the market from the Favourite tab'
        ).not.toBeVisible();
    });

    test('VERIFY favourites persist across a page reload', async ({ page, marketSelectionPage }) => {
        await marketSelectionPage.openMarketSearch();
        await marketSelectionPage.marketSearchInput.fill('Volatility 100 Index');
        await marketSelectionPage.toggleFavourite('Volatility 100 Index');
        await expect(
            marketSelectionPage.favouriteButton('Volatility 100 Index'),
            'Market should be favourited before reload'
        ).toHaveAttribute('aria-label', 'Unfavourite');

        await page.reload();
        await NavigationUtils.waitForDerivApiSettled(page);

        await marketSelectionPage.addMarketButton.click();
        await expect(marketSelectionPage.marketSelectionPanel, 'Picker should reopen after reload').toBeVisible();
        await marketSelectionPage.favouritesTab.click();
        await expect(
            marketSelectionPage.favouriteMarketRow('Volatility 100 Index'),
            'The favourited market should still be present after reload'
        ).toBeVisible();
    });
});
