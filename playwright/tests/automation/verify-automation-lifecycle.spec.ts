/**
 * @name     Automation — start strategy → Running → Stop
 * @id       flow-1
 * @flow     playwright/flows/automation/flow.md#flow-1--automation-lifecycle-start-strategy--running--stop
 * @coverage playwright/flows/automation/coverage.md
 */
import { test } from '../../fixtures/fixtures';
import { TradeBasePage } from '../../pages/TradeBasePage';
import { createAccountV2viaJS } from '../../utils';

let accountEmail: string;
let accountPassword: string;

test.describe('Automation — Lifecycle', { tag: ['@automation', '@smoke', '@desktop', '@mobile', '@staging'] }, () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(async ({}, testInfo) => {
        const isMobile = testInfo.project.name.includes('mobile');
        const backupEmailVar = isMobile ? 'TEST_EMAIL_AUTOMATION_MOBILE' : 'TEST_EMAIL_AUTOMATION';

        // 'real' is intentional — this suite validates the real-account experience, matching the
        // rest of the trade specs. On the default staging environment a 'real' account is a
        // virtual/test account funded via top-up (no real money, no production). Automation itself
        // is gated by EU status (useIsAutomationEnabled), not by real-vs-demo, so it runs on both.
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

    // Always stop any run left active so a leftover bot can't affect the next test.
    test.afterEach(async ({ tradeAutomationPage }) => {
        await tradeAutomationPage.stopRunIfActive();
    });

    /**
     * Flow 1 — open automation → verify default panel → Run → verify Running → Stop → verify stopped
     */
    test('VERIFY start automation strategy, reach Running, then Stop', async ({ tradeAutomationPage }) => {
        await tradeAutomationPage.openAutomation();
        await tradeAutomationPage.verifyPanelDefaultState();
        await tradeAutomationPage.startRun();
        await tradeAutomationPage.verifyRunning();
        await tradeAutomationPage.stopRun();
        await tradeAutomationPage.verifyStopped();
    });
});
