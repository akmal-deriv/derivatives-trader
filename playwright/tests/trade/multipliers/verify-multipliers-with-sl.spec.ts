/**
 * @name     Multipliers with Stop Loss — Buy Up → Verify + Buy Down → Verify
 * @id       flow-9.5, flow-9.6
 * @flow     playwright/flows/trade/flow.md#flow-95--multipliers-with-stop-loss-buy-up--close-contract
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
        const backupEmailVar = isMobile ? 'TEST_EMAIL_MULTIPLIERS_SL_MOBILE' : 'TEST_EMAIL_MULTIPLIERS_SL';
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
     * Flow 9.5 — Multipliers with SL: configure Stop Loss → buy Up → verify positions,
     * reports, contract details (SL amount visible), balance, and closed contract.
     */
    test('VERIFY Buy "Up" Multipliers Contract With Stop Loss and Close', async ({ tradeMultipliersPage }) => {
        await tradeMultipliersPage.buyUpAndVerify({
            market: 'Volatility 50 (1s) Index',
            multiplier: 'x200',
            stake: '25.05',
            currency: 'USD',
            riskManagement: { stopLoss: '21.10' },
        });
    });

    /**
     * Flow 9.6 — Multipliers with SL: configure Stop Loss → buy Down → verify positions,
     * reports, contract details (SL amount visible), balance, and closed contract.
     */
    test('VERIFY Buy "Down" Multipliers Contract With Stop Loss and Close', async ({ tradeMultipliersPage }) => {
        await tradeMultipliersPage.buyDownAndVerify({
            market: 'Volatility 50 (1s) Index',
            multiplier: 'x600',
            stake: '25.00',
            currency: 'USD',
            riskManagement: { stopLoss: '23.01' },
        });
    });
});
