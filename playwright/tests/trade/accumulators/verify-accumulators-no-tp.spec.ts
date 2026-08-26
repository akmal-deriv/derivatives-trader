/**
 * @name     Accumulators without Take Profit — Buy → Close
 * @id       flow-8.1
 * @flow     playwright/flows/trade/flow.md#accumulators
 * @coverage playwright/flows/trade/coverage.md
 */
import { test } from '../../../fixtures/fixtures';
import { TradeBasePage } from '../../../pages/TradeBasePage';
import { createAccountV2viaJS } from '../../../utils';

let accountEmail: string = undefined!;
let accountPassword: string = undefined!;

test.describe('Trade — Accumulators', { tag: ['@desktop', '@mobile', '@trade'] }, () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(async ({}, testInfo) => {
        const isMobile = testInfo.project.name.includes('mobile');
        const emailVar = isMobile ? 'TEST_EMAIL_ACCUMULATORS_MOBILE' : 'TEST_EMAIL_ACCUMULATORS';

        const account = await createAccountV2viaJS('real', {
            currency: 'USD',
            trading: true,
            backupAccount: process.env[emailVar],
        });
        accountEmail = account.email;
        accountPassword = account.password;
    });

    test.beforeEach(async ({ page, loginPage }) => {
        await TradeBasePage.seedLocalStorageOnOrigin(page);
        await loginPage.login(accountEmail, accountPassword);
    });

    /**
     * Flow 8.1 — Accumulators without Take Profit: set growth rate 5% → buy → close manually from the
     * trade page → verify the settled contract in Positions, contract details, balance, and Reports.
     */
    test('VERIFY Buy Accumulators Contract Without Take Profit and Close (Demo Account)', async ({
        tradeAccumulatorsPage,
    }) => {
        await tradeAccumulatorsPage.buyAccumulatorAndVerify({
            accountType: 'demo',
            market: 'Volatility 100 Index',
            growthRate: '5%',
            stake: '10.00',
            currency: 'USD',
        });
    });

    test('VERIFY Buy Accumulators Contract Without Take Profit and Close (Real Account)', async ({
        tradeAccumulatorsPage,
    }) => {
        await tradeAccumulatorsPage.buyAccumulatorAndVerify({
            accountType: 'real',
            market: 'Volatility 100 Index',
            growthRate: '5%',
            stake: '10.00',
            currency: 'USD',
        });
    });
});
