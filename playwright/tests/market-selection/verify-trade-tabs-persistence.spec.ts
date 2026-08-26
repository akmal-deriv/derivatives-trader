/**
 * @name     Multiple trade tabs — tabs persist across a page reload
 * @id       flow-21
 * @flow     playwright/flows/market-selection/flow.md#flow-21--tabs-persist-across-page-reload
 * @coverage playwright/flows/market-selection/coverage.md
 */
import { test, expect } from '../../fixtures/fixtures';
import { NavigationUtils } from '../../utils';
import { TradeBasePage } from '../../pages/TradeBasePage';

test.describe('Market Selection', { tag: ['@desktop', '@mobile', '@market-selection'] }, () => {
    test.beforeAll(async () => {
        if (!process.env.BASE_URL) throw new Error('BASE_URL is not set in playwright/.env');
    });

    test.beforeEach(async ({ page, tradeParametersPage }) => {
        await TradeBasePage.seedLocalStorageOnOrigin(page);
        await tradeParametersPage.gotoTradePage();
    });

    test('VERIFY open tabs and the active tab survive a page reload', async ({
        page,
        tradeParametersPage,
        marketSelectionPage,
    }) => {
        await tradeParametersPage.selectMarketAndTradeType('Bull Market Index', 'Rise/Fall', {
            openInNewTab: true,
        });
        await expect(marketSelectionPage.marketTabs, 'Two tabs should be open before reload').toHaveCount(2);
        const activeTabTextBefore = (await tradeParametersPage.activeMarketTab.textContent()) ?? '';

        await page.reload();
        await NavigationUtils.waitForDerivApiSettled(page);

        await expect(marketSelectionPage.marketTabs, 'Both tabs should be restored after reload').toHaveCount(2);
        await expect(
            marketSelectionPage.marketTab('Bull Market Index', 'Rise/Fall'),
            'Bull Market Index tab should still be present'
        ).toBeVisible();
        await expect(
            tradeParametersPage.activeMarketTab,
            'The same tab that was active before reload should still be active'
        ).toHaveText(activeTabTextBefore);
    });
});
