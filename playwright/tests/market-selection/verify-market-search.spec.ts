/**
 * @name     Market selection — search by name and empty results
 * @id       flow-8
 * @flow     playwright/flows/market-selection/flow.md#flow-8--search-by-market-name
 * @coverage playwright/flows/market-selection/coverage.md
 */
import { test, expect } from '../../fixtures/fixtures';
import { TradeBasePage } from '../../pages/TradeBasePage';

test.describe('Market Selection', { tag: ['@desktop', '@mobile', '@market-selection'] }, () => {
    test.beforeAll(async () => {
        if (!process.env.BASE_URL) throw new Error('BASE_URL is not set in playwright/.env');
    });

    test.beforeEach(async ({ page, tradeParametersPage, marketSelectionPage }) => {
        await TradeBasePage.seedLocalStorageOnOrigin(page);
        await tradeParametersPage.gotoTradePage();
        await marketSelectionPage.addMarketButton.click();
        await expect(marketSelectionPage.marketSelectionPanel, 'Market-selection picker should be open').toBeVisible();
    });

    test('VERIFY search by market name groups results by trade type', async ({
        tradeParametersPage,
        marketSelectionPage,
    }) => {
        await marketSelectionPage.openMarketSearch();
        await marketSelectionPage.marketSearchInput.fill('Volatility 100 Index');

        const riseFallResult = marketSelectionPage.marketSearchResultRow('Volatility 100 Index', 'Rise/Fall');
        await expect(riseFallResult, 'Volatility 100 Index should appear under the Rise/Fall group').toBeVisible();

        const accumulatorsResult = marketSelectionPage.marketSearchResultRow('Volatility 100 Index', 'Accumulators');
        await expect(
            accumulatorsResult,
            'The same symbol should also appear under the Accumulators group'
        ).toBeVisible();

        await riseFallResult.click();
        await expect(
            marketSelectionPage.marketSelectionPanel,
            'Picker should close after selecting a search result'
        ).not.toBeAttached();
        await expect(
            tradeParametersPage.activeMarketTab,
            'Active tab should reflect the selected market and trade type'
        ).toContainText('Volatility 100 Index');
        await expect(tradeParametersPage.activeMarketTab, 'Active tab should reflect Rise/Fall').toContainText(
            'Rise/Fall'
        );
    });

    test('VERIFY search with no matches shows the empty-results state', async ({ marketSelectionPage }) => {
        await marketSelectionPage.openMarketSearch();
        await marketSelectionPage.marketSearchInput.fill('zzznotreal');

        await expect(
            marketSelectionPage.marketEmptyStateTitle,
            'Empty-results title should read "No result found"'
        ).toHaveText('No result found');
        await expect(
            marketSelectionPage.marketEmptyStateDescription,
            'Empty-results description should guide the user to retry'
        ).toHaveText('Check your spelling or try searching for a different market.');
    });
});
