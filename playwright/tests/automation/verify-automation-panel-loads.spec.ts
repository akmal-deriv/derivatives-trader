/**
 * @name     Automation — panel loads with default state
 * @id       flow-6
 * @flow     playwright/flows/automation/flow.md#flow-6--automation-panel-loads-with-default-state
 * @coverage playwright/flows/automation/coverage.md
 */
import { test } from '../../fixtures/fixtures';
import { TradeBasePage } from '../../pages/TradeBasePage';
import { createAccountV2viaJS } from '../../utils';

let accountEmail: string;
let accountPassword: string;

test.describe('Automation — Panel Loads', { tag: ['@automation', '@smoke', '@desktop', '@mobile', '@staging'] }, () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(async ({}, testInfo) => {
        const isMobile = testInfo.project.name.includes('mobile');
        const backupEmailVar = isMobile ? 'TEST_EMAIL_AUTOMATION_MOBILE' : 'TEST_EMAIL_AUTOMATION';

        // 'real' is intentional — see verify-automation-lifecycle.spec.ts (staging 'real' = virtual test funds).
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
     * Flow 6 — open automation → default panel visible (Strategy = Martingale, Run enabled)
     */
    test('VERIFY automation panel loads with default state', async ({ tradeAutomationPage }) => {
        await tradeAutomationPage.openAutomation();
        await tradeAutomationPage.verifyPanelDefaultState();
    });
});
