/**
 * @name     Multipliers with Take Profit — Buy Up → Verify + Buy Down → Verify
 * @id       flow-9.3, flow-9.4
 * @flow     playwright/flows/trade/flow.md#flow-93--multipliers-with-take-profit-buy-up--close-contract
 * @coverage playwright/flows/trade/coverage.md
 */
import { test } from '../../../fixtures/fixtures';
import { TradeBasePage } from '../../../pages/TradeBasePage';
import { createAccountV2viaJS } from '../../../utils';

let accountEmail: string = undefined!;
let accountPassword: string = undefined!;

test.describe('Trade — Multipliers', { tag: ['@desktop', '@mobile', '@trade'] }, () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(async ({}, testInfo) => {
        const isMobile = testInfo.project.name.includes('mobile');
        const backupEmailVar = isMobile ? 'TEST_EMAIL_MULTIPLIERS_TP_MOBILE' : 'TEST_EMAIL_MULTIPLIERS_TP';
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
     * Flow 9.3 — Multipliers with TP: configure Take Profit → buy Up → verify positions,
     * reports, contract details (TP amount visible), balance, and closed contract.
     */
    test('VERIFY Buy "Up" Multipliers Contract With Take Profit and Close', async ({ tradeMultipliersPage }) => {
        await tradeMultipliersPage.buyUpAndVerify({
            market: 'Volatility 25 (1s) Index',
            multiplier: 'x160',
            stake: '10.00',
            currency: 'USD',
            riskManagement: { takeProfit: '30.01' },
        });
    });

    /**
     * Flow 9.4 — Multipliers with TP: configure Take Profit → buy Down → verify positions,
     * reports, contract details (TP amount visible), balance, and closed contract.
     */
    test('VERIFY Buy "Down" Multipliers Contract With Take Profit and Close', async ({ tradeMultipliersPage }) => {
        await tradeMultipliersPage.buyDownAndVerify({
            market: 'Volatility 25 (1s) Index',
            multiplier: 'x400',
            stake: '11.11',
            currency: 'USD',
            riskManagement: { takeProfit: '21.32' },
        });
    });
});
