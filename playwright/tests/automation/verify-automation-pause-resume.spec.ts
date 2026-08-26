/**
 * @name     Automation — pause and resume a running strategy
 * @id       flow-2
 * @flow     playwright/flows/automation/flow.md#flow-2--pause-and-resume-a-running-automation
 * @coverage playwright/flows/automation/coverage.md
 */
import { test } from '../../fixtures/fixtures';
import { TradeBasePage } from '../../pages/TradeBasePage';
import { createAccountV2viaJS } from '../../utils';

let accountEmail: string;
let accountPassword: string;

test.describe('Automation — Pause/Resume', { tag: ['@automation', '@desktop', '@mobile', '@staging'] }, () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(async ({}, testInfo) => {
        const isMobile = testInfo.project.name.includes('mobile');
        const backupEmailVar = isMobile ? 'TEST_EMAIL_AUTOMATION_MOBILE' : 'TEST_EMAIL_AUTOMATION';

        // 'real' is intentional — real-account experience, matching the rest of the trade specs.
        // On the default staging environment a 'real' account is a virtual/test account funded via
        // top-up (no real money, no production). See verify-automation-lifecycle.spec.ts.
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
     * Flow 2 — start → Running → Pause → Paused → Resume → Running → Stop
     */
    test('VERIFY pause and resume a running automation', async ({ tradeAutomationPage }) => {
        await tradeAutomationPage.openAutomation();
        await tradeAutomationPage.startRun();
        await tradeAutomationPage.verifyRunning();
        await tradeAutomationPage.pauseRun();
        await tradeAutomationPage.verifyPaused();
        await tradeAutomationPage.resumeRun();
        await tradeAutomationPage.verifyRunning();
        await tradeAutomationPage.stopRun();
        await tradeAutomationPage.verifyStopped();
    });
});
