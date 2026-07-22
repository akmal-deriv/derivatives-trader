/**
 * @name     Automation — resync after account switch (run stays Running)
 * @id       flow-5
 * @flow     playwright/flows/automation/flow.md#flow-5--resync-after-account-switch-run-stays-running
 * @coverage playwright/flows/automation/coverage.md
 */
import { test } from '../../fixtures/fixtures';
import { TradeBasePage } from '../../pages/TradeBasePage';
import { createAccountV2viaJS } from '../../utils';

let accountEmail: string;
let accountPassword: string;

test.describe(
    'Automation — Resync after account switch',
    { tag: ['@automation', '@desktop', '@mobile', '@staging'] },
    () => {
        test.describe.configure({ mode: 'serial' });

        test.beforeAll(async ({}, testInfo) => {
            const isMobile = testInfo.project.name.includes('mobile');
            const backupEmailVar = isMobile ? 'TEST_EMAIL_AUTOMATION_MOBILE' : 'TEST_EMAIL_AUTOMATION';

            // 'real' is intentional — this validates the real-account experience, matching the rest of
            // the automation specs. On the default staging environment a 'real' account is a virtual/test
            // account funded via top-up (no real money, no production). The login also carries the demo
            // account every Deriv user gets, which serves as the second account (Account B) this flow
            // switches to and back from.
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
         * Flow 5 — start a run on the real account (A) → Running → switch to the demo account (B) and
         * back to A → the run on A must be re-adopted as Running (not stuck on "Starting…", no manual
         * refresh) → Stop. Guards the known intermittent resync bug GRWT-9318.
         */
        test('VERIFY automation run is re-adopted as Running after switching account away and back', async ({
            tradeAutomationPage,
        }) => {
            await tradeAutomationPage.openAutomation();
            await tradeAutomationPage.verifyPanelDefaultState();
            // Low stake so the live bot cannot burn much before it is stopped.
            await tradeAutomationPage.setStake('1');
            await tradeAutomationPage.startRun();
            await tradeAutomationPage.verifyRunning();

            // Switch to the demo account (Account B), then back to the real account (Account A).
            await tradeAutomationPage.switchToAccountType('demo');
            await tradeAutomationPage.switchToAccountType('real');

            // The run on Account A must still be Running after the round-trip — the resync guard.
            await tradeAutomationPage.verifyRunning();

            await tradeAutomationPage.stopRun();
            await tradeAutomationPage.verifyStopped();
        });
    }
);
