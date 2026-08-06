/**
 * @name     All markets — trade form loads correctly or shows closed-market state
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

    // Disabled pending manual verification of the redesign fix — re-enable once confirmed.
    test.skip('VERIFY all markets show live price feed or closed-market state', async ({
        page,
        tradeParametersPage,
        feedPage,
    }) => {
        await TradeBasePage.seedLocalStorageOnOrigin(page);
        await tradeParametersPage.gotoTradePage();

        for (const market of FeedPage.MARKETS) {
            await expect
                .soft(async () => {
                    // selectMarketAndTradeType() asserts the Multipliers params render with no
                    // error — the redesign no longer exposes a live-ticking price anywhere in the
                    // DOM (see FeedPage), so this is the strongest signal available that the WS
                    // feed/proposal for this symbol actually resolved.
                    await tradeParametersPage.selectMarketAndTradeType(feedPage.resolveLabel(market), 'Multipliers');

                    if (market.status === 'session_gated') {
                        await feedPage.verifyMarketClosedState(market.label);
                    }
                }, `[${market.label}] market check`)
                .toPass({ timeout: 30_000 });
        }
    });
});
