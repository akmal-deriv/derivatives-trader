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
     * A strategy option inside the open Strategy selector. The two viewports render options with
     * different anchors, so branch on `isMobile`:
     * - Desktop: `SelectionListPopover` renders each option as `<button role="option">{label}</button>`.
     * - Mobile: the ActionSheet renders each option as `<button class="automation-popover__option">{label}</button>`
     *   with no `option` role.
     * Source: TradeParameters/Shared/SelectionListPopover.tsx · StrategySelector/strategy-selector-mobile.tsx.
     *
     * @param label - The strategy display label, e.g. `'Martingale'` or `"D'Alembert"`.
     * @returns Locator for that option button within the open selector.
     */
    strategyOption(label: string): Locator {
        return this.isMobile
            ? this.page.locator('.automation-popover__option', { hasText: label })
            : this.page.getByRole('option', { name: label });
    }

    /**
     * D'Alembert's stake-parameter field. The shared `StakeMultiplier` component renders with the
     * **"Stake increment"** label for D'Alembert (the `unit` param) — as opposed to Martingale's
     * "Stake multiplier" (the `multiplier` param) — and its value reads `"{n} unit"`.
     * Source: StakeMultiplier/stake-multiplier-{desktop,mobile}.tsx
     * (`is_martingale ? 'Stake multiplier' : 'Stake increment'`).
     */
    get stakeIncrementField(): Locator {
        return this.page.getByLabel('Stake increment').first();
    }

    /**
     * A preset value chip inside an open parameter popover. The chips tab is the default view, so
     * chips are visible immediately after opening the field — no tab switch needed. `ValueChips`
     * renders each preset as `<button aria-label="Select value {n}">`.
     * Source: AppV2/Components/InputPopover/value-chips.tsx.
     *
     * @param value - The preset numeric value to pick, e.g. `3`.
     * @returns Locator for that chip button.
     */
    valueChip(value: number): Locator {
        return this.page.getByRole('button', { name: `Select value ${value}`, exact: true });
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

    /**
     * "Loss threshold" (stop-loss) field trigger in the Risk management section — a readonly
     * `TradeParameterPopover` (desktop) / readonly `TextField` (mobile) that opens the editor.
     * Source: ThresholdInput/threshold-input-{desktop,mobile}.tsx — `label = localize('Loss threshold')`.
     * `exact` avoids also matching the inner "Loss threshold (USD)" input while the editor is open.
     */
    get lossThresholdField(): Locator {
        return this.page.getByLabel('Loss threshold', { exact: true }).first();
    }

    /**
     * "Profit threshold" (take-profit) field trigger in the Risk management section — the same
     * `ThresholdInput` component as the loss threshold (`threshold_type='take_profit'`).
     * `exact` avoids also matching the inner "Profit threshold (USD)" input while the editor is open.
     */
    get profitThresholdField(): Locator {
        return this.page.getByLabel('Profit threshold', { exact: true }).first();
    }

    /**
     * Numeric input inside whichever threshold popover/action-sheet is currently open. Both
     * viewports wrap it in `.automation-popover__input-wrapper` (source: threshold-input-*.tsx),
     * and only one editor is open at a time, so a single selector serves both threshold fields.
     */
    get thresholdInput(): Locator {
        return this.page.locator('.automation-popover__input-wrapper input');
    }

    /**
     * Save button that commits a threshold value (shared by both threshold editors).
     * - Desktop: `.automation-popover__save-button` (threshold-input-desktop.tsx).
     * - Mobile: the ActionSheet footer "Save" button (threshold-input-mobile.tsx `ActionSheet.Footer`),
     *   matching the barrier action-sheet pattern in `TradeParametersPage`.
     */
    get thresholdSaveButton(): Locator {
        return this.isMobile
            ? this.page.locator('.quill-action-sheet--footer').getByRole('button', { name: 'Save' })
            : this.page.locator('.automation-popover__save-button');
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

    /**
     * Pause the active run (click the Pause button).
     *
     * @returns Promise that resolves once the Pause button has been clicked.
     */
    async pauseRun(): Promise<void> {
        await expect(this.pauseButton, 'Pause button should be visible while running').toBeVisible();
        await expect(this.pauseButton, 'Pause button should be enabled before pausing').toBeEnabled();
        await this.pauseButton.click();
    }

    /**
     * Resume a paused run (click the Resume button).
     *
     * @returns Promise that resolves once the Resume button has been clicked.
     */
    async resumeRun(): Promise<void> {
        await expect(this.resumeButton, 'Resume button should be visible while paused').toBeVisible();
        await expect(this.resumeButton, 'Resume button should be enabled before resuming').toBeEnabled();
        await this.resumeButton.click();
    }

    /**
     * Open the Strategy selector, confirm both bundled strategies are offered, select one, and
     * confirm the Strategy field reflects the chosen label after the selector closes.
     *
     * Both bundled strategies (Martingale, D'Alembert) are asserted present so the test doubles as
     * coverage of the selector's contents (Flow 4 step 1).
     *
     * @param label - The strategy to select, e.g. `"D'Alembert"`.
     * @returns Promise that resolves once the Strategy field shows the selected label.
     */
    async selectStrategy(label: string): Promise<void> {
        await this.strategyField.click();
        await expect(
            this.strategyOption('Martingale'),
            'Martingale should be offered in the strategy selector'
        ).toBeVisible();
        await expect(
            this.strategyOption("D'Alembert"),
            "D'Alembert should be offered in the strategy selector"
        ).toBeVisible();
        await this.strategyOption(label).click();
        await expect(this.strategyField, `Strategy field should show '${label}' after selection`).toHaveValue(label);
    }

    /**
     * Set D'Alembert's Stake increment via a preset chip. The chips tab is shown by default, so the
     * chip is clickable immediately with no tab switch; the field then reads `"{value} unit"`.
     *
     * @param value - A preset increment to pick (one of the chip presets, e.g. `3`).
     * @returns Promise that resolves once the Stake increment field reflects the value.
     */
    async setStakeIncrement(value: number): Promise<void> {
        await this.stakeIncrementField.click();
        await this.valueChip(value).click();
        await expect(
            this.stakeIncrementField,
            `Stake increment field should reflect '${value}' after selecting the chip`
        ).toHaveValue(new RegExp(`^${value}\\b`));
    }

    /**
     * Open a Risk-management threshold field's editor, type the amount, save, and confirm the
     * field reflects it. Shared by the loss- and profit-threshold setters.
     *
     * @param field  - The threshold field trigger locator (loss or profit).
     * @param amount - Threshold in the account currency as a string.
     * @returns Promise that resolves once the field shows the saved value.
     */
    private async setThreshold(field: Locator, amount: string): Promise<void> {
        await field.click();
        await expect(this.thresholdInput, 'Threshold input should be visible after opening the field').toBeVisible();
        await this.thresholdInput.fill(amount);
        await this.thresholdSaveButton.click();
        await expect(field, `Threshold field should reflect '${amount}' after saving`).toHaveValue(
            // Escape every '.' (not just the first) so the literal amount is matched, not "any char".
            new RegExp(`^${amount.replace(/\./g, '\\.')}\\b`)
        );
    }

    /**
     * Set the Loss threshold (stop-loss). Use a small value (e.g. `'1'`) so a losing run
     * auto-stops quickly — the safety control Flow 3 exercises.
     *
     * @param amount - Threshold in the account currency as a string, e.g. `'1'`.
     * @returns Promise that resolves once the field shows the saved value.
     */
    async setLossThreshold(amount: string): Promise<void> {
        await this.setThreshold(this.lossThresholdField, amount);
    }

    /**
     * Set the Profit threshold (take-profit). Set it high (e.g. `'1000'`) so the run cannot stop
     * on profit and can only stop on the loss threshold — this makes the loss auto-stop, and the
     * resulting negative closed P/L, deterministic (otherwise a few early wins could occasionally
     * trip the profit threshold instead, leaving a positive P/L).
     *
     * @param amount - Threshold in the account currency as a string, e.g. `'1000'`.
     * @returns Promise that resolves once the field shows the saved value.
     */
    async setProfitThreshold(amount: string): Promise<void> {
        await this.setThreshold(this.profitThresholdField, amount);
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
     * Verify the run is paused — "Status: Paused" and both the Resume and Stop buttons are shown.
     *
     * @returns Promise that resolves once the paused state is confirmed.
     */
    async verifyPaused(): Promise<void> {
        await expect(this.statusPaused, 'Status should become "Paused" after pausing').toBeVisible({
            timeout: 30_000,
        });
        await expect(this.resumeButton, 'Resume button should be visible while paused').toBeVisible();
        await expect(this.stopButton, 'Stop button should be visible while paused').toBeVisible();
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

    /**
     * Verify the run auto-stopped once the loss threshold was reached — i.e. the controls
     * returned to the idle Run button *by themselves*, with no manual Stop click.
     *
     * Why the durable idle state and not the snackbar: the "Loss threshold reached. Automation
     * stopped." snackbar is rendered with `hasCloseButton: false` and auto-dismisses after a few
     * seconds, so asserting it directly is inherently racy — it can appear and vanish between
     * polls (observed: caught on one run, already gone on the next). The return to the idle Run
     * button (with Running/Pause cleared) is the reliable, durable proof that the run stopped on
     * its own. The caller sets the profit threshold high (unreachable) and the loss threshold tiny,
     * so a self-triggered stop can only be the loss threshold — the durable idle state is therefore
     * sufficient to confirm a loss-threshold auto-stop without reading the transient snackbar.
     *
     * Timing: the bot trades live contracts until cumulative loss ≥ the threshold, so a bounded
     * (never fixed) wait is used to allow a few contracts to settle.
     *
     * @returns Promise that resolves once the auto-stop (idle state) is confirmed.
     */
    async verifyLossThresholdAutoStop(): Promise<void> {
        await expect(
            this.runButton,
            'Run button should reappear once the run auto-stops at the loss threshold (no manual Stop)'
        ).toBeVisible({ timeout: 120_000 });
        await expect(
            this.statusRunning,
            'Running status should no longer be visible after the auto-stop'
        ).not.toBeVisible();
        await expect(
            this.pauseButton,
            'Pause button should no longer be visible after the auto-stop'
        ).not.toBeVisible();
        await expect(this.stopButton, 'Stop button should no longer be visible after the auto-stop').not.toBeVisible();
    }
}
