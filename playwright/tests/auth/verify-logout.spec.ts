/**
 * @name     Logout
 * @id       flow-3
 * @flow     playwright/flows/auth/flow.md#flow-3
 * @coverage playwright/flows/auth/coverage.md
 * @env TEST_EMAIL
 * @env TEST_PASSWORD
 */
import { test } from '../../fixtures/fixtures';
import { TradeBasePage } from '../../pages/TradeBasePage';

/**
 * Flow 3 — Logout → success modal → session cleared
 *
 * Desktop: sidebar account button → Log out
 * Mobile:  bottom nav Menu tab → Log out
 */
test.describe('Logout', { tag: ['@auth', '@smoke', '@desktop', '@mobile', '@production'] }, () => {
    test.beforeAll(async () => {
        if (!process.env.TEST_EMAIL || !process.env.TEST_PASSWORD) {
            throw new Error('Missing required env vars: TEST_EMAIL and TEST_PASSWORD must be set in playwright/.env');
        }
    });

    test('VERIFY logout and re-login', async ({ page, loginPage, tradeBasePage }) => {
        // Seed onboarding-suppression flags so the desktop "Welcome to the new Deriv Trader"
        // modal (onboarding-guide-desktop.tsx) does not open ~800ms after load and intercept
        // pointer events on the sidebar account button during logout.
        await TradeBasePage.seedLocalStorageOnOrigin(page);

        // Step 1 — Login with valid credentials
        await loginPage.login();
        await tradeBasePage.verifySuccessfulLogin();

        // Step 2 — Trigger logout
        await tradeBasePage.logout();

        // Step 3 — Verify session is cleared
        await tradeBasePage.verifyLoggedOut();
    });
});
