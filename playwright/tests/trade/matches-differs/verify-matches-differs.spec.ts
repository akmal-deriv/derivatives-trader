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
        // Create a fresh funded real USD trading account each run. The dedicated backup account uses a
        // custom password (not the shared TEST_PASSWORD), so pass it as `password` — that becomes the
        // password for both freshly created accounts and the backup account used on creation failure.
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
    test('VERIFY Buy "Matches" Contract', async ({ tradeMatchesDiffersPage }) => {
        await tradeMatchesDiffersPage.buyMatchesAndVerify({
            market: 'Volatility 10 Index',
            durationValue: '10 ticks',
            stake: '10.00',
            currency: 'USD',
            digit: '5',
        });
    });

    /**
     * Flow 5.2 — Matches/Differs: set last digit prediction → buy Differs → open the position's
     * contract details, wait for the tick contract to auto-expire in place, then verify the settled
     * contract details, balance, and Reports (Trade table + Statement).
     */
    test('VERIFY Buy "Differs" Contract', async ({ tradeMatchesDiffersPage }) => {
        await tradeMatchesDiffersPage.buyDiffersAndVerify({
            market: 'Volatility 10 Index',
            durationValue: '10 ticks',
            stake: '10.00',
            currency: 'USD',
            digit: '5',
        });
    });
});
