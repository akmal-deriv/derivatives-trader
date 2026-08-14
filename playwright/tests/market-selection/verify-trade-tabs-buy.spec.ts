/**
 * @name     Multiple trade tabs — Buy always targets the active tab
 * @id       flow-22
 * @flow     playwright/flows/market-selection/flow.md#flow-22--buy-always-targets-the-active-tabs-pair
 * @coverage playwright/flows/market-selection/coverage.md
 */
import { test } from '../../fixtures/fixtures';
import { TradeBasePage } from '../../pages/TradeBasePage';

let accountEmail: string = undefined!;

test.describe(
    'Market Selection',
    { tag: ['@desktop', '@mobile', '@market-selection', '@trade', '@regression'] },
    () => {
        test.describe.configure({ mode: 'serial' });

        test.beforeAll(async ({}, testInfo) => {
            const isMobile = testInfo.project.name.includes('mobile');
            const emailVar = isMobile ? 'TEST_EMAIL_TRADE_TABS_MOBILE' : 'TEST_EMAIL_TRADE_TABS';
            const email = process.env[emailVar];

            if (!email) throw new Error(`${emailVar} is not set in playwright/.env`);

            accountEmail = email;
        });

        test.beforeEach(async ({ page, loginPage }) => {
            await TradeBasePage.seedLocalStorageOnOrigin(page);
            await loginPage.login(accountEmail);
        });

        test('VERIFY Buy purchases the active tab, not another open tab (Demo Account)', async ({
            tradeAccumulatorsPage,
        }) => {
            await tradeAccumulatorsPage.buyAccumulatorOnActiveTabAndVerify({
                accountType: 'demo',
                market: 'Volatility 100 Index',
                growthRate: '5%',
                stake: '5.00',
                currency: 'USD',
            });
        });

        test('VERIFY Buy purchases the active tab, not another open tab (Real Account)', async ({
            tradeAccumulatorsPage,
        }) => {
            await tradeAccumulatorsPage.buyAccumulatorOnActiveTabAndVerify({
                accountType: 'real',
                market: 'Volatility 100 Index',
                growthRate: '5%',
                stake: '5.00',
                currency: 'USD',
            });
        });
    }
);
