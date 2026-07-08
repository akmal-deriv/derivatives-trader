import { Locator, expect } from '@playwright/test';
import { NavigationUtils } from '../e2e-tests-core/utils';
import { TradeParametersPage } from './TradeParametersPage';

/**
 * Page Object for the DTrader Automated Trading feature.
 *
 * Extends TradeParametersPage (→ TradeBasePage) — automation reuses the shared trade
 * form (trade type, duration, stake) and adds the strategy/risk-management panel plus
 * the Run / Pause / Stop controls.
 *
 * The panel has **no data-testids**, so locators use Quill button labels, the status
 * text, and stable classes (source: `AppV2/Components/AutomationPanel/automation-actions.tsx`).
 *
 * Run status machine: idle → starting → running → stopping → stopped. After Run the store
 * holds `starting` until the first contract is observed, then flips to `running` — so
 * `verifyRunning()` waits (tolerating the transient "Starting...").
 *
 * @example
 * ```typescript
 * test('VERIFY automation lifecycle', async ({ tradeAutomationPage }) => {
 *     await tradeAutomationPage.openAutomation();
 *     await tradeAutomationPage.startRun();
 *     await tradeAutomationPage.verifyRunning();
 *     await tradeAutomationPage.stopRun();
 *     await tradeAutomationPage.verifyStopped();
 * });
 * ```
 */
export class TradeAutomationPage extends TradeParametersPage {
    // ============================================
    // LOCATORS
    // ============================================

    /** "Strategy parameters" section header — confirms the automation panel rendered. */
    get strategyParametersHeader(): Locator {
        return this.page.getByText('Strategy parameters');
    }

    /** "Risk management" section header. */
    get riskManagementHeader(): Locator {
        return this.page.getByText('Risk management');
    }

    /**
     * Strategy field (readonly `TradeParameterPopover` input) — its value is the selected
     * strategy label, defaulting to "Martingale".
     * Source: strategy-selector-{desktop,mobile}.tsx — `value={getStrategyLabel('martingale')}`.
     */
    get strategyField(): Locator {
        return this.page.getByLabel('Strategy').first();
    }

    /**
     * Run button (idle state) — Quill Button labelled "Run".
     * Source: automation-actions.tsx — label `localize('Run')`, class `automation-actions__run-button`.
     */
    get runButton(): Locator {
        return this.page.getByRole('button', { name: 'Run', exact: true });
    }

    /** "Status: Running" line shown while a run is active. */
    get statusRunning(): Locator {
        return this.page.getByText('Status: Running');
    }

    /** "Status: Paused" line shown while a run is paused. */
    get statusPaused(): Locator {
        return this.page.getByText('Status: Paused');
    }

    /**
     * Run stats line — "Contracts: N | P/L: X USD" — visible while running/paused.
     * Source: automation-actions.tsx — `Contracts: {{count}} | P/L: {{profit}} {{currency}}`.
     */
    get automationStats(): Locator {
        return this.page.getByText(/Contracts:.*P\/L:/);
    }

    /** Pause button (visible while running). */
    get pauseButton(): Locator {
        return this.page.getByRole('button', { name: 'Pause', exact: true });
    }

    /** Resume button (visible while paused). */
    get resumeButton(): Locator {
        return this.page.getByRole('button', { name: 'Resume', exact: true });
    }

    /**
     * Stop button (visible while running/paused/stopping).
     * Source: automation-actions.tsx — label `localize('Stop')`, class `automation-actions__run-stop`.
     */
    get stopButton(): Locator {
        return this.page.getByRole('button', { name: 'Stop', exact: true });
    }

    // ============================================
    // ACTIONS
    // ============================================

    /**
     * Open the Automation view via the `/automate` route.
     *
     * The app's `AutomateSwitch` route handles both viewports: on desktop it selects the
     * "Automated trading" panel tab and redirects to the trade page; on mobile it renders
     * the Automate page. Using the route avoids the fragile icon-only tab locator and works
     * identically across viewports.
     *
     * @returns Promise that resolves once the automation panel (Strategy parameters) is visible.
     */
    async openAutomation(): Promise<void> {
        await this.page.goto('/automate');
        await this.page.waitForLoadState('domcontentloaded');
        await NavigationUtils.waitForDerivApiSettled(this.page);
        await expect(
            this.strategyParametersHeader,
            'Automation panel (Strategy parameters) should be visible after opening automation'
        ).toBeVisible();
    }

    /**
     * Start the automation run with the current (default) configuration.
     * Waits for the Run button to be enabled before clicking.
     *
     * @returns Promise that resolves once the Run button has been clicked.
     */
    async startRun(): Promise<void> {
        await expect(this.runButton, 'Run button should be visible before starting').toBeVisible();
        await expect(this.runButton, 'Run button should be enabled before starting').toBeEnabled();
        await this.runButton.click();
    }

    /**
     * Stop the active automation run via the Stop button.
     *
     * @returns Promise that resolves once the Stop button has been clicked.
     */
    async stopRun(): Promise<void> {
        await expect(this.stopButton, 'Stop button should be visible while a run is active').toBeVisible();
        await expect(this.stopButton, 'Stop button should be enabled before stopping').toBeEnabled();
        await this.stopButton.click();
    }

    /**
     * Cleanup helper — stop any still-active run so subsequent tests start clean.
     * Safe to call when no run is active (no Stop button present). When a run IS active, the
     * stop click and the resulting return-to-idle are asserted, so a genuine cleanup failure
     * surfaces rather than being silently swallowed.
     *
     * @returns Promise that resolves once no run is active.
     */
    async stopRunIfActive(): Promise<void> {
        const hasActiveRun = await this.stopButton.isVisible().catch(() => false);
        if (!hasActiveRun) return;
        await this.stopButton.click();
        await expect(this.runButton, 'Run button should reappear after cleanup stop').toBeVisible({
            timeout: 30_000,
        });
    }

    // ============================================
    // VERIFICATIONS
    // ============================================

    /**
     * Verify the automation panel loaded with its default state: both section headers, the
     * default Martingale strategy, and an enabled Run button.
     *
     * @returns Promise that resolves once all default-state assertions pass.
     */
    async verifyPanelDefaultState(): Promise<void> {
        await expect(this.strategyParametersHeader, 'Strategy parameters header should be visible').toBeVisible();
        await expect(this.riskManagementHeader, 'Risk management header should be visible').toBeVisible();
        await expect(this.strategyField, 'Default strategy should be Martingale').toHaveValue('Martingale');
        await expect(this.runButton, 'Run button should be visible in the default state').toBeVisible();
        await expect(this.runButton, 'Run button should be enabled in the default state').toBeEnabled();
    }

    /**
     * Verify the run reached the Running state. Tolerates the transient "Starting..." — the
     * store only flips to running once the first contract is observed, which arrives async.
     *
     * @returns Promise that resolves once the Running state + controls + stats are visible.
     */
    async verifyRunning(): Promise<void> {
        await expect(this.statusRunning, 'Status should become "Running" after starting the run').toBeVisible({
            timeout: 60_000,
        });
        await expect(this.pauseButton, 'Pause button should be visible while running').toBeVisible();
        await expect(this.stopButton, 'Stop button should be visible while running').toBeVisible();
        await expect(this.automationStats, 'Contracts / P/L stats line should be visible while running').toBeVisible();
    }

    /**
     * Verify the run has stopped — controls return to the single Run button and the status
     * line is gone.
     *
     * @returns Promise that resolves once the run has returned to the idle (Run) state.
     */
    async verifyStopped(): Promise<void> {
        await expect(this.runButton, 'Run button should reappear after stopping the run').toBeVisible({
            timeout: 30_000,
        });
        await expect(this.statusRunning, 'Running status should no longer be visible after stopping').not.toBeVisible();
    }
}
