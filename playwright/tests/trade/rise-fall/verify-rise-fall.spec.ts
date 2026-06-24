/**
 * @name     Rise/Fall — Buy Rise → Close + Buy Fall → Close
 * @id       flow-2.1, flow-2.2
 * @flow     playwright/flows/trade/flow.md#flow-21--risefall-buy-rise--close-contract
 * @coverage playwright/flows/trade/coverage.md
 */
import { test } from '../../../fixtures/fixtures';
import { TradeBasePage } from '../../../pages/TradeBasePage';
import { createAccountV2viaJS } from '../../../utils';

let accountEmail: string;
let accountPassword: string;

test.describe('Trade — Rise/Fall', { tag: ['@trade', '@smoke', '@desktop', '@mobile'] }, () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(async ({}, testInfo) => {
        const isMobile = testInfo.project.name.includes('mobile');
        const backupEmailVar = isMobile ? 'TEST_EMAIL_RISE_FALL_MOBILE' : 'TEST_EMAIL_RISE_FALL';

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
     * Flow 2.1 — Rise/Fall: buy Rise → navigate to positions → open contract → close
     */
    test('VERIFY Buy "Rise" Contract and Close', async ({ tradeRiseFallPage }) => {
        await tradeRiseFallPage.buyRiseAndVerify({
            market: 'Volatility 100 Index',
            durationUnit: 'Minutes',
            durationValue: '15 min',
            stake: '10.50',
            currency: 'USD',
        });
    });

    /**
     * Flow 2.2 — Rise/Fall: buy Fall → navigate to positions → open contract → close
     */
    test('VERIFY Buy "Fall" Contract and Close', async ({ tradeRiseFallPage }) => {
        await tradeRiseFallPage.buyFallAndVerify({
            market: 'Volatility 100 Index',
            durationUnit: 'Minutes',
            durationValue: '18 min',
            stake: '20.50',
            currency: 'USD',
        });
    });
});
