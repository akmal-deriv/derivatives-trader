/**
 * @name     Multipliers no TP/SL — Buy Up → Verify + Buy Down → Verify
 * @id       flow-9.1, flow-9.2
 * @flow     playwright/flows/trade/flow.md#flow-91--multipliers-no-tpsl-buy-up--close-contract
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
        const backupEmailVar = isMobile ? 'TEST_EMAIL_MULTIPLIERS_MOBILE' : 'TEST_EMAIL_MULTIPLIERS';
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
     * Flow 9.1 — Multipliers no TP/SL: verify Multiplier + Risk Management params (no Duration),
     * buy Up → verify positions, reports, contract details, balance, and closed contract.
     */
    test('VERIFY Buy "Up" Multipliers Contract and Close (without TP/SL) (Demo Account)', async ({
        tradeMultipliersPage,
    }) => {
        await tradeMultipliersPage.buyUpAndVerify({
            accountType: 'demo',
            market: 'Volatility 100 (1s) Index',
            multiplier: 'x200',
            stake: '5.40',
            currency: 'USD',
        });
    });

    test('VERIFY Buy "Up" Multipliers Contract and Close (without TP/SL) (Real Account)', async ({
        tradeMultipliersPage,
    }) => {
        await tradeMultipliersPage.buyUpAndVerify({
            accountType: 'real',
            market: 'Volatility 100 (1s) Index',
            multiplier: 'x200',
            stake: '5.40',
            currency: 'USD',
        });
    });

    /**
     * Flow 9.2 — Multipliers no TP/SL: buy Down → verify positions, reports, contract details,
     * balance, and closed contract.
     */
    test('VERIFY Buy "Down" Multipliers Contract and Close (without TP/SL) (Demo Account)', async ({
        tradeMultipliersPage,
    }) => {
        await tradeMultipliersPage.buyDownAndVerify({
            accountType: 'demo',
            market: 'Volatility 100 (1s) Index',
            multiplier: 'x300',
            stake: '5.88',
            currency: 'USD',
        });
    });

    test('VERIFY Buy "Down" Multipliers Contract and Close (without TP/SL) (Real Account)', async ({
        tradeMultipliersPage,
    }) => {
        await tradeMultipliersPage.buyDownAndVerify({
            accountType: 'real',
            market: 'Volatility 100 (1s) Index',
            multiplier: 'x300',
            stake: '5.88',
            currency: 'USD',
        });
    });
});
