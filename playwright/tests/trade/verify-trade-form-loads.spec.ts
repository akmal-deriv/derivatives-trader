/**
 * @name     Trade Form Loads
 * @id       flow-1
 * @flow     playwright/flows/trade/flow.md#flow-1--trade-form-loads-with-default-state-visible
 * @coverage playwright/flows/trade/coverage.md
 */
import { test } from '../../fixtures/fixtures';
import { TradeBasePage } from '../../pages/TradeBasePage';

test.describe('Trade', { tag: ['@trade', '@smoke', '@desktop', '@mobile'] }, () => {
    let testEmail: string = undefined!;

    test.beforeAll(async ({}, testInfo) => {
        const isMobile = testInfo.project.name.includes('mobile');
        const emailVar = isMobile ? 'TEST_EMAIL_MOBILE' : 'TEST_EMAIL';
        const email = process.env[emailVar];

        if (!email) throw new Error(`${emailVar} is not set in playwright/.env.staging`);

        testEmail = email;
    });

    test('VERIFY trade form default state when logged out', async ({ tradeParametersPage }) => {
        await tradeParametersPage.gotoTradePage();
        await tradeParametersPage.verifyDTraderLandingPageLoggedOut();
    });

    test('VERIFY trade form default state when logged in', async ({ page, loginPage, tradeParametersPage }) => {
        await TradeBasePage.seedLocalStorageOnOrigin(page);
        await loginPage.login(testEmail);
        await tradeParametersPage.verifyDTraderLandingPage();
    });
});
