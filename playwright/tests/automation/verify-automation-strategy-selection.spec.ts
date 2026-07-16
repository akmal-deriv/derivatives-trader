/**
 * @name     Automation — strategy selection and parameters
 * @id       flow-4
 * @flow     playwright/flows/automation/flow.md#flow-4--strategy-selection-and-parameters
 * @coverage playwright/flows/automation/coverage.md
 */
import { test } from '../../fixtures/fixtures';
import { TradeBasePage } from '../../pages/TradeBasePage';
import { createAccountV2viaJS } from '../../utils';

let accountEmail: string;
let accountPassword: string;

test.describe('Automation — Strategy selection', { tag: ['@automation', '@desktop', '@mobile', '@staging'] }, () => {
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
     * Flow 4 — default (Martingale) → open strategy list → select D'Alembert → set Stake increment
     *          → Run → Running → Stop, so the run executes with the chosen strategy.
     */
    test("VERIFY select D'Alembert strategy, set its parameter, then run and stop", async ({ tradeAutomationPage }) => {
        await tradeAutomationPage.openAutomation();
        // Confirm the default state (Martingale) before switching strategy.
        await tradeAutomationPage.verifyPanelDefaultState();
        // Open the selector, confirm both strategies are offered, and switch to D'Alembert.
        await tradeAutomationPage.selectStrategy("D'Alembert");
        // D'Alembert exposes a Stake increment param — set it via a preset chip and confirm it persists.
        await tradeAutomationPage.setStakeIncrement(3);
        // The run must execute with the newly selected strategy.
        await tradeAutomationPage.startRun();
        await tradeAutomationPage.verifyRunning();
        await tradeAutomationPage.stopRun();
        await tradeAutomationPage.verifyStopped();
    });
});
