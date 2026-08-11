/**
 * @name     Multiple trade tabs — Buy always targets the active tab
 * @id       flow-22
 * @flow     playwright/flows/market-selection/flow.md#flow-22--buy-always-targets-the-active-tabs-pair
 * @coverage playwright/flows/market-selection/coverage.md
 */
import { test } from '../../fixtures/fixtures';
import { TradeBasePage } from '../../pages/TradeBasePage';
import { createAccountV2viaJS } from '../../utils';

let accountEmail: string = undefined!;
let accountPassword: string = undefined!;

// Skipped for now — revisit later.
test.describe.skip('Market Selection', { tag: ['@desktop', '@mobile', '@market-selection'] }, () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(async ({}, testInfo) => {
        const isMobile = testInfo.project.name.includes('mobile');
        const emailVar = isMobile ? 'TEST_EMAIL_TRADE_TABS_MOBILE' : 'TEST_EMAIL_TRADE_TABS';

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

    test('VERIFY Buy purchases the active tab, not another open tab (Demo Account)', async ({
        tradeParametersPage,
    }) => {
        await tradeParametersPage.buyOnActiveTabAndVerify({ accountType: 'demo', stake: '5.00', currency: 'USD' });
    });

    test('VERIFY Buy purchases the active tab, not another open tab (Real Account)', async ({
        tradeParametersPage,
    }) => {
        await tradeParametersPage.buyOnActiveTabAndVerify({ accountType: 'real', stake: '5.00', currency: 'USD' });
    });
});
