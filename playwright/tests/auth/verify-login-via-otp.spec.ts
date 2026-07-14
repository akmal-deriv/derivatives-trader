/**
 * @name     OTP Login
 * @id       flow-2
 * @flow     playwright/flows/auth/flow.md#flow-2
 * @coverage playwright/flows/auth/coverage.md
 */
import { test, expect } from '../../fixtures/fixtures';
import { MailiskUtils } from '../../utils';

/**
 * Flow 2 — OTP Login → lands back on dtrader
 *
 * Desktop and mobile use dedicated accounts to avoid OTP conflicts in parallel.
 * Tests run serially to prevent OTP inbox conflicts between test cases.
 */
test.describe('Login - One-Time Code', { tag: ['@auth', '@smoke', '@desktop', '@mobile', '@production'] }, () => {
    let testEmail: string = undefined!;

    test.beforeAll(async ({}, testInfo) => {
        const isMobile = testInfo.project.name.includes('mobile');
        const emailVar = isMobile ? 'TEST_EMAIL_MOBILE' : 'TEST_EMAIL';
        const email = process.env[emailVar];

        if (!email) throw new Error(`${emailVar} is not set in playwright/.env`);
        testEmail = email;
    });

    test('VERIFY user can log in using a one-time code sent to email', async ({
        loginPage,
        passwordPage,
        tradeBasePage,
    }) => {
        // ── Step 1: Navigate to app and click Login button ────────────────────
        await tradeBasePage.gotoTradePage();
        await tradeBasePage.loginButton.click();

        // ── Step 2: Verify login page elements and enter email ────────────────
        await loginPage.verifyLoginPageElements();
        await loginPage.enterEmail(testEmail);
        await loginPage.clickLogInButton();

        // ── Step 3: Verify "Try another verification method" button is visible ─
        await expect(
            passwordPage.tryAnotherMethodButton,
            '"Try another verification method" button should be visible on the enter-password page'
        ).toBeVisible();

        // ── Step 4: Capture timestamp BEFORE clicking OTP button ──────────────
        // This ensures we only retrieve the OTP email triggered by THIS test run
        const fromTimestamp = Math.floor(Date.now() / 1000);

        // ── Step 5: Click "Get a one-time code" → navigate to /login-otp ──────
        await passwordPage.clickGetOtp();

        // ── Step 6: Retrieve OTP from Mailisk inbox ───────────────────────────
        const toAddrPrefix = testEmail.split('@')[0];
        const { otp } = await MailiskUtils.extractOtp(
            'webapps',
            {
                to_addr_prefix: toAddrPrefix,
                subject_includes: 'Your one-time code for your account',
                from_timestamp: fromTimestamp,
                wait: true,
            },
            { timeout: 180_000 }
        );

        // ── Step 7: Verify OTP was successfully retrieved ─────────────────────
        expect(otp, 'OTP retrieved from Mailisk inbox should be a non-empty string').toBeTruthy();

        // ── Step 8: Enter OTP and verify successful login ─────────────────────
        await loginPage.enterOTP(otp);
        await tradeBasePage.verifySuccessfulLogin();
    });
});
