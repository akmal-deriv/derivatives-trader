/**
 * @name     Accumulators — Buy without TP → Close + Buy with TP → Close
 * @id       flow-8.1, flow-8.2
 * @flow     playwright/flows/trade/flow.md#accumulators
 * @coverage playwright/flows/trade/coverage.md
 */
import { test } from '../../../fixtures/fixtures';
import { TradeBasePage } from '../../../pages/TradeBasePage';
import { createAccountV2viaJS } from '../../../utils';

let accountEmail: string = undefined!;
let accountPassword: string = undefined!;

test.describe('Trade — Accumulators', { tag: ['@desktop', '@mobile', '@trade', '@smoke'] }, () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(async ({}, testInfo) => {
        const isMobile = testInfo.project.name.includes('mobile');
        const backupEmailVar = isMobile ? 'TEST_EMAIL_ACCUMULATORS_MOBILE' : 'TEST_EMAIL_ACCUMULATORS';
        // No `password` field: fresh account each run and (if provisioned) the backup account uses the
        // shared TEST_PASSWORD — consistent with the over-under / even-odd suites.
        const account = await createAccountV2viaJS('real', {
            currency: 'USD',
            trading: true,
            backupAccount: process.env[backupEmailVar],
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
    test('VERIFY Buy Accumulators Contract Without Take Profit and Close', async ({ tradeAccumulatorsPage }) => {
        await tradeAccumulatorsPage.buyAccumulatorAndVerify({
            market: 'Volatility 100 Index',
            growthRate: '5%',
            stake: '10.00',
            currency: 'USD',
        });
    });

    /**
     * Flow 8.2 — Accumulators with Take Profit: set growth rate 5% + take profit 4.00 → buy → let the
     * contract auto-settle (take profit / barrier), with a manual-close fallback → verify the settled
     * contract in Positions, contract details, balance, and Reports.
     */
    test('VERIFY Buy Accumulators Contract With Take Profit and Close', async ({ tradeAccumulatorsPage }) => {
        await tradeAccumulatorsPage.buyAccumulatorAndVerify({
            market: 'Volatility 100 Index',
            growthRate: '5%',
            stake: '10.00',
            currency: 'USD',
            takeProfit: '4.00',
        });
    });
});
