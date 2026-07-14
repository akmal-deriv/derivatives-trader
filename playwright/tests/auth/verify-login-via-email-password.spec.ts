/**
 * @name     Email + Password Login
 * @id       flow-1
 * @flow     playwright/flows/auth/flow.md#flow-1
 * @coverage playwright/flows/auth/coverage.md
 */
import { test } from '../../fixtures/fixtures';

test.describe('Login - Email and Password', { tag: ['@auth', '@smoke', '@desktop', '@mobile', '@production'] }, () => {
    test.beforeAll(async () => {
        if (!process.env.TEST_EMAIL || !process.env.TEST_PASSWORD) {
            throw new Error('Missing required env vars: TEST_EMAIL and TEST_PASSWORD must be set in playwright/.env');
        }
    });

    test('VERIFY email and password login redirects back to DTrader successfully', async ({
        loginPage,
        passwordPage,
        tradeBasePage,
    }) => {
        // Step 1: Navigate to app and click Login button
        await tradeBasePage.gotoTradePage();
        await tradeBasePage.loginButton.click();

        // Step 2: Verify login page and submit email
        await loginPage.verifyLoginPageElements();
        await loginPage.enterEmail(process.env.TEST_EMAIL!);
        await loginPage.clickLogInButton();

        // Step 3: Verify enter-password page and submit password
        await passwordPage.verifyEnterPasswordPageElements();
        await passwordPage.enterPassword(process.env.TEST_PASSWORD!);
        await passwordPage.clickLogInButton();

        // Step 4: Assert successful login
        await tradeBasePage.verifySuccessfulLogin();
    });
});
