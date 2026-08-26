/**
 * @name     Matches/Differs — Buy Matches → Verify + Buy Differs → Verify
 * @id       flow-5.1, flow-5.2
 * @flow     playwright/flows/trade/flow.md#matchesdiffers
 * @coverage playwright/flows/trade/coverage.md
 */
import { test } from '../../../fixtures/fixtures';
import { TradeBasePage } from '../../../pages/TradeBasePage';
import { createAccountV2viaJS } from '../../../utils';

let accountEmail: string = undefined!;
let accountPassword: string = undefined!;

test.describe('Trade — Matches/Differs', { tag: ['@desktop', '@mobile', '@trade', '@smoke'] }, () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(async () => {
        const account = await createAccountV2viaJS('real', {
            currency: 'USD',
            trading: true,
            password: process.env.TEST_PASSWORD_MATCHES_DIFFERS,
            backupAccount: process.env.TEST_EMAIL_MATCHES_DIFFERS,
        });
        accountEmail = account.email;
        accountPassword = account.password;
    });

    test.beforeEach(async ({ page, loginPage }) => {
        await TradeBasePage.seedLocalStorageOnOrigin(page);
        await loginPage.login(accountEmail, accountPassword);
    });

    /**
     * Flow 5.1 — Matches/Differs: set last digit prediction → buy Matches → open the position's
     * contract details, wait for the tick contract to auto-expire in place, then verify the settled
     * contract details, balance, and Reports (Trade table + Statement).
     */
    test('VERIFY Buy "Matches" Contract (Demo Account)', async ({ tradeMatchesDiffersPage }) => {
        await tradeMatchesDiffersPage.buyMatchesAndVerify({
            accountType: 'demo',
            market: 'Volatility 10 Index',
            durationValue: '10 ticks',
            stake: '10.00',
            currency: 'USD',
            digit: '2',
        });
    });

    test('VERIFY Buy "Matches" Contract (Real Account)', async ({ tradeMatchesDiffersPage }) => {
        await tradeMatchesDiffersPage.buyMatchesAndVerify({
            accountType: 'real',
            market: 'Volatility 10 Index',
            durationValue: '10 ticks',
            stake: '10.00',
            currency: 'USD',
            digit: '4',
        });
    });

    /**
     * Flow 5.2 — Matches/Differs: set last digit prediction → buy Differs → open the position's
     * contract details, wait for the tick contract to auto-expire in place, then verify the settled
     * contract details, balance, and Reports (Trade table + Statement).
     */
    test('VERIFY Buy "Differs" Contract (Demo Account)', async ({ tradeMatchesDiffersPage }) => {
        await tradeMatchesDiffersPage.buyDiffersAndVerify({
            accountType: 'demo',
            market: 'Volatility 10 Index',
            durationValue: '10 ticks',
            stake: '10.00',
            currency: 'USD',
            digit: '6',
        });
    });

    test('VERIFY Buy "Differs" Contract (Real Account)', async ({ tradeMatchesDiffersPage }) => {
        await tradeMatchesDiffersPage.buyDiffersAndVerify({
            accountType: 'real',
            market: 'Volatility 10 Index',
            durationValue: '10 ticks',
            stake: '10.00',
            currency: 'USD',
            digit: '8',
        });
    });
});
