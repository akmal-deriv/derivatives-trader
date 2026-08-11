/**
 * @name     Multiple trade tabs — core mechanics
 * @id       flow-14
 * @flow     playwright/flows/market-selection/flow.md#flow-14--switch-between-existing-tabs
 * @coverage playwright/flows/market-selection/coverage.md
 */
import { test, expect } from '../../fixtures/fixtures';
import { TradeBasePage } from '../../pages/TradeBasePage';

test.describe('Market Selection', { tag: ['@desktop', '@mobile', '@market-selection'] }, () => {
    test.beforeAll(async () => {
        if (!process.env.BASE_URL) throw new Error('BASE_URL is not set in playwright/.env');
    });

    test.beforeEach(async ({ page, tradeParametersPage }) => {
        await TradeBasePage.seedLocalStorageOnOrigin(page);
        await tradeParametersPage.gotoTradePage();
    });

    test('VERIFY selecting markets manages tabs correctly — switch, dedupe, and independent trade types', async ({
        tradeParametersPage,
        marketSelectionPage,
    }) => {
        // Volatility 100 Index (not the default tab's "(1s)" variant) supports every trade type,
        // including Accumulators — Bull Market Index does not (it's a "Daily reset index", limited
        // to directional/digit trade types), so Part 3 below needs this market, not Bull Market Index.

        // Part 1 — switching between existing tabs preserves each tab.
        const firstTabText = (await tradeParametersPage.activeMarketTab.textContent()) ?? '';

        await tradeParametersPage.selectMarketAndTradeType('Volatility 100 Index', 'Rise/Fall', { openInNewTab: true });
        await expect(marketSelectionPage.marketTabs, 'A second tab should be open').toHaveCount(2);
        await expect(tradeParametersPage.activeMarketTab, 'New tab should be active').toContainText(
            'Volatility 100 Index'
        );

        // Switch away first — clicking the ALREADY-active tab has special "replace" semantics
        // (it opens the market-selection picker), so switchToMarketTab must only ever target a
        // tab that's genuinely inactive at the time.
        const firstTab = marketSelectionPage.marketTabs.first();
        await firstTab.click();
        await expect(tradeParametersPage.activeMarketTab, 'Switching to the first tab should activate it').toHaveText(
            firstTabText
        );

        await marketSelectionPage.switchToMarketTab('Volatility 100 Index', 'Rise/Fall');
        await expect(
            tradeParametersPage.activeMarketTab,
            'Switching back should restore Volatility 100 Index'
        ).toContainText('Volatility 100 Index');

        // Part 2 — re-selecting an already-open pair focuses the existing tab, no duplicate.
        await tradeParametersPage.selectMarketAndTradeType('Volatility 100 Index', 'Rise/Fall', { openInNewTab: true });
        await expect(
            marketSelectionPage.marketTabs,
            'Re-selecting the same pair should not create a duplicate tab'
        ).toHaveCount(2);
        await expect(tradeParametersPage.activeMarketTab, 'The existing tab should be active').toContainText(
            'Volatility 100 Index'
        );

        // Part 3 — same market under a different trade type is an independent tab.
        await tradeParametersPage.selectMarketAndTradeType('Volatility 100 Index', 'Accumulators', {
            openInNewTab: true,
        });
        await expect(
            marketSelectionPage.marketTabs,
            'A third, independent tab should be created for the same market under a different trade type'
        ).toHaveCount(3);

        await marketSelectionPage.switchToMarketTab('Volatility 100 Index', 'Rise/Fall');
        await expect(
            tradeParametersPage.activeMarketTab,
            'The Rise/Fall tab should still be independently selectable'
        ).toContainText('Rise/Fall');

        await marketSelectionPage.switchToMarketTab('Volatility 100 Index', 'Accumulators');
        await expect(
            tradeParametersPage.activeMarketTab,
            'The Accumulators tab should still be independently selectable'
        ).toContainText('Accumulators');
    });

    test('VERIFY tab removal mechanics — non-active, active, and last-tab blocked', async ({
        tradeParametersPage,
        marketSelectionPage,
    }) => {
        // Part 1 — removing a non-active tab leaves other tabs unaffected.
        await tradeParametersPage.selectMarketAndTradeType('Bull Market Index', 'Rise/Fall', { openInNewTab: true });
        await tradeParametersPage.selectMarketAndTradeType('Jump 75 Index', 'Rise/Fall', { openInNewTab: true });
        await expect(marketSelectionPage.marketTabs, 'Three tabs should be open').toHaveCount(3);

        await marketSelectionPage.removeMarketTab('Bull Market Index', 'Rise/Fall');

        await expect(marketSelectionPage.marketTabs, 'One tab should have been removed').toHaveCount(2);
        await expect(
            marketSelectionPage.marketTab('Bull Market Index', 'Rise/Fall'),
            'The removed tab should no longer exist'
        ).toHaveCount(0);
        await expect(
            tradeParametersPage.activeMarketTab,
            'The active tab (Jump 75 Index) should be unaffected by removing a different tab'
        ).toContainText('Jump 75 Index');

        // Part 2 — removing the active tab falls back to an adjacent tab.
        await marketSelectionPage.removeMarketTab('Jump 75 Index', 'Rise/Fall');

        await expect(marketSelectionPage.marketTabs, 'One tab should remain').toHaveCount(1);
        await expect(
            tradeParametersPage.activeMarketTab,
            'Removing the active tab should fall back to the only remaining tab'
        ).not.toContainText('Jump 75 Index');

        // Part 3 — removing the last remaining tab is blocked.
        await expect(
            tradeParametersPage.activeMarketTab.getByRole('button', { name: 'Remove market' }),
            'No close control should render when only one tab is open'
        ).not.toBeVisible();
    });

    test('VERIFY tab strip visuals — distinct icons and scroll/expand behavior', async ({
        tradeParametersPage,
        marketSelectionPage,
    }) => {
        // Part 1 — each tab icon reflects its own market.
        await tradeParametersPage.selectMarketAndTradeType('Jump 75 Index', 'Rise/Fall', { openInNewTab: true });
        await tradeParametersPage.selectMarketAndTradeType('EUR/USD', 'Rise/Fall', { openInNewTab: true });
        await expect(marketSelectionPage.marketTabs, 'Three tabs should be open').toHaveCount(3);

        const iconHtmls = await marketSelectionPage.marketTabs.evaluateAll(tabs =>
            tabs.map(tab => tab.querySelector('svg')?.outerHTML ?? '')
        );

        expect(iconHtmls, 'Every tab should render its own icon markup').toHaveLength(3);
        expect(
            iconHtmls.every(html => html.length > 0),
            'Every tab icon should be non-empty'
        ).toBe(true);
        expect(new Set(iconHtmls).size, 'All three tabs should show visually distinct icons').toBe(3);

        // Part 2 — tab strip scrolls and only the active tab expands. Open up to the platform's
        // cap (not just one more tab) — desktop's viewport is wide enough that a handful of tabs
        // sits right at the overflow boundary (confirmed live: scrollWidth/clientWidth came back
        // equal at just 3-4 tabs), making a single extra tab an unreliable way to guarantee
        // overflow. Asserting canScroll afterward (instead of silently returning if it's false)
        // means a real regression here fails loudly instead of quietly skipping the rest of the test.
        const additionalMarkets = [
            'Bull Market Index',
            'Volatility 10 Index',
            'Volatility 25 Index',
            'Volatility 50 Index',
        ];
        const tabsNeeded = marketSelectionPage.maxOpenMarkets - (await marketSelectionPage.marketTabs.count());
        for (const market of additionalMarkets.slice(0, tabsNeeded)) {
            await tradeParametersPage.selectMarketAndTradeType(market, 'Rise/Fall', { openInNewTab: true });
        }

        const listSelector = '[data-testid="dt_market_tabs_list"]';
        const canScroll = await tradeParametersPage.page
            .locator(listSelector)
            .evaluate(el => el.scrollWidth > el.clientWidth);
        expect(canScroll, 'Tab strip should overflow and require scrolling once the platform cap is reached').toBe(
            true
        );

        const firstTab = marketSelectionPage.marketTabs.first();
        await firstTab.scrollIntoViewIfNeeded();
        await expect(firstTab, 'Scrolling should bring an earlier tab back into view').toBeInViewport();

        await expect(
            tradeParametersPage.activeMarketTab,
            'The active tab should expand to show its trade-type subtitle'
        ).toContainText('Rise/Fall');
    });
});
