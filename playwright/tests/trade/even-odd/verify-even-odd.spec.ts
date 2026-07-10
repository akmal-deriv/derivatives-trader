/**
 * @name     Even/Odd — Buy Even → Verify + Buy Odd → Verify
 * @id       flow-7.1, flow-7.2
 * @flow     playwright/flows/trade/flow.md#evenodd
 * @coverage playwright/flows/trade/coverage.md
 */
import { test } from '../../../fixtures/fixtures';
import { TradeBasePage } from '../../../pages/TradeBasePage';
import { createAccountV2viaJS } from '../../../utils';

let accountEmail: string = undefined!;
let accountPassword: string = undefined!;

test.describe('Trade — Even/Odd', { tag: ['@desktop', '@mobile', '@trade'] }, () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(async ({}, testInfo) => {
        const isMobile = testInfo.project.name.includes('mobile');
        const backupEmailVar = isMobile ? 'TEST_EMAIL_EVEN_ODD_MOBILE' : 'TEST_EMAIL_EVEN_ODD';
        // No `password` field: this suite creates a fresh account each run and (if provisioned) the
        // backup account uses the shared TEST_PASSWORD — unlike Matches/Differs, whose dedicated backup
        // account uses a custom password and therefore passes `password` explicitly.
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
     * Flow 7.1 — Even/Odd: buy Even → open the position's contract details, wait for the tick contract
     * to auto-expire in place, then verify the settled contract details, balance, and Reports.
     */
    test('VERIFY Buy "Even" Contract', async ({ tradeEvenOddPage }) => {
        await tradeEvenOddPage.buyEvenAndVerify({
            market: 'Volatility 10 Index',
            durationValue: '10 ticks',
            stake: '10.00',
            currency: 'USD',
        });
    });

    /**
     * Flow 7.2 — Even/Odd: buy Odd → open the position's contract details, wait for the tick contract
     * to auto-expire in place, then verify the settled contract details, balance, and Reports.
     */
    test('VERIFY Buy "Odd" Contract', async ({ tradeEvenOddPage }) => {
        await tradeEvenOddPage.buyOddAndVerify({
            market: 'Volatility 10 Index',
            durationValue: '10 ticks',
            stake: '10.00',
            currency: 'USD',
        });
    });
});
