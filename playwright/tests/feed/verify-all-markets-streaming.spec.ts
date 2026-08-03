/**
 * @name     All markets — live price feed or closed-market state correct for every market
 * @id       flow-1
 * @flow     playwright/flows/feed/flow.md#flow-1--all-markets-feed-active-or-closed-state-correct-for-every-market-in-the-dialog--feedverify-all-markets-streamingspects
 * @coverage playwright/flows/feed/coverage.md
 */
import { test, expect } from '../../fixtures/fixtures';
import { FeedPage } from '../../pages/FeedPage';
import { TradeBasePage } from '../../pages/TradeBasePage';

test.describe('Feed', { tag: ['@desktop', '@mobile', '@feed', '@smoke', '@production'] }, () => {
    test.beforeAll(async () => {
        if (!process.env.BASE_URL) throw new Error('BASE_URL is not set in playwright/.env');
    });

    test('VERIFY all markets show live price feed or closed-market state', async ({
        page,
        tradeParametersPage,
        feedPage,
    }) => {
        await TradeBasePage.seedLocalStorageOnOrigin(page);
        await tradeParametersPage.gotoTradePage();
        await tradeParametersPage.selectTradeType('Multipliers');

        for (const market of FeedPage.MARKETS) {
            await expect
                .soft(async () => {
                    await tradeParametersPage.selectMarket(feedPage.resolveLabel(market));

                    if (market.status === 'open') {
                        await feedPage.verifySpotPriceVisible();

                        const initialPrice = await feedPage.getCurrentSpotPrice();
                        expect(initialPrice, `[${market.label}] Initial spot price should not be empty`).not.toBe('');

                        await feedPage.waitForPriceChange(initialPrice);

                        const updatedPrice = await feedPage.getCurrentSpotPrice();
                        expect(
                            updatedPrice,
                            `[${market.label}] Spot price should have changed — WebSocket feed is live`
                        ).not.toBe(initialPrice);
                    } else {
                        await feedPage.verifyMarketClosedState(market.label);
                    }
                }, `[${market.label}] market check`)
                .toPass({ timeout: 30_000 });
        }
    });
});
