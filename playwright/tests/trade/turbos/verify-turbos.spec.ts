/**
 * @name     Turbos — Buy Up → verify + Buy Down → verify (no Take Profit)
 * @id       flow-10.1, flow-10.2
 * @flow     playwright/flows/trade/flow.md#turbos
 * @coverage playwright/flows/trade/coverage.md
 */
import { test } from '../../../fixtures/fixtures';
import { TradeBasePage } from '../../../pages/TradeBasePage';
import { createAccountV2viaJS } from '../../../utils';

// Populated in beforeAll before any test runs — safe non-null assertion.
let accountEmail: string = undefined!;
let accountPassword: string = undefined!;

test.describe('Trade — Turbos', { tag: ['@desktop', '@mobile', '@trade'] }, () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(async ({}, testInfo) => {
        const isMobile = testInfo.project.name.includes('mobile');
        const backupEmailVar = isMobile ? 'TEST_EMAIL_TURBOS_MOBILE' : 'TEST_EMAIL_TURBOS';
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
     * Flow 10.1 — Turbos: buy Up → verify open position → close early → verify settled contract
     * (Positions Closed tab, balance, Reports).
     */
    test('VERIFY Buy "Up" Turbos Contract (Demo Account)', async ({ tradeTurbosPage }) => {
        await tradeTurbosPage.buyTurbosAndVerify({
            accountType: 'demo',
            market: 'Volatility 100 (1s) Index',
            direction: 'Up',
            stake: '10.50',
            currency: 'USD',
        });
    });

    test('VERIFY Buy "Up" Turbos Contract (Real Account)', async ({ tradeTurbosPage }) => {
        await tradeTurbosPage.buyTurbosAndVerify({
            accountType: 'real',
            market: 'Volatility 100 (1s) Index',
            direction: 'Up',
            stake: '10.50',
            currency: 'USD',
        });
    });

    /**
     * Flow 10.2 — Turbos: buy Down → verify open position → close early → verify settled contract.
     */
    test('VERIFY Buy "Down" Turbos Contract (Demo Account)', async ({ tradeTurbosPage }) => {
        await tradeTurbosPage.buyTurbosAndVerify({
            accountType: 'demo',
            market: 'Volatility 100 (1s) Index',
            direction: 'Down',
            stake: '10.50',
            currency: 'USD',
        });
    });

    test('VERIFY Buy "Down" Turbos Contract (Real Account)', async ({ tradeTurbosPage }) => {
        await tradeTurbosPage.buyTurbosAndVerify({
            accountType: 'real',
            market: 'Volatility 100 (1s) Index',
            direction: 'Down',
            stake: '10.50',
            currency: 'USD',
        });
    });
});
