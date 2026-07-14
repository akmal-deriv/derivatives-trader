import { expect, type Locator, type Page } from '@playwright/test';
import { TradeParametersPage } from './TradeParametersPage';
import { PositionsPage } from './PositionsPage';
import { ReportsPage } from './ReportsPage';
import { ContractDetailsPage } from './ContractDetailsPage';

/**
 * Page Object for the Accumulators contract type on the trade page (/).
 *
 * Extends TradeParametersPage (→ TradeBasePage). Accumulators are unlike directional/digit contracts:
 *  - **No Duration** — instead a **Growth rate** param (1%–5%) and an optional **Take profit**.
 *  - A single buy button (no Up/Down or outcome tabs).
 *  - **Close from the trade page:** while an accumulator is open, the purchase button becomes
 *    "Close [amount] [currency]" (`.purchase-button--single`). This same button works on both
 *    viewports (no positions inline close needed).
 *  - The contract ends **three ways** — manual Close, spot hitting the **barrier** (auto-sell/loss),
 *    or the **Take profit** being hit (auto-sell/win). On any auto-close the Close button disappears
 *    (reverts to the buy button). {@link settleAccumulatorContract} is therefore close-reason agnostic:
 *    it ensures the contract ends settled without asserting *how* it closed.
 *
 * @example
 * ```typescript
 * test('VERIFY Buy Accumulators Contract Without Take Profit and Close', async ({ tradeAccumulatorsPage }) => {
 *     await tradeAccumulatorsPage.buyAccumulatorAndVerify({
 *         market: 'Volatility 100 Index',
 *         growthRate: '5%',
 *         stake: '10.00',
 *         currency: 'USD',
 *     });
 * });
 * ```
 */
export class TradeAccumulatorsPage extends TradeParametersPage {
    private readonly positionsPage: PositionsPage;
    private readonly reportsPage: ReportsPage;
    private readonly contractDetailsPage: ContractDetailsPage;

    constructor(page: Page) {
        super(page);
        this.positionsPage = new PositionsPage(page);
        this.reportsPage = new ReportsPage(page);
        this.contractDetailsPage = new ContractDetailsPage(page);
    }

    // ============================================
    // LOCATORS
    // ============================================

    /**
     * Growth rate field trigger (readOnly TextField, value like "5%").
     * Desktop: TradeParameterPopover → SelectionListPopover. Mobile: ActionSheet wheel picker.
     * Source: growth-rate.tsx / growth-rate-desktop.tsx — label "Growth rate".
     */
    get growthRateField(): Locator {
        return this.page.getByLabel('Growth rate').first();
    }

    /**
     * Growth rate option in the desktop SelectionListPopover (role="option", label e.g. "5%").
     * Source: growth-rate-desktop.tsx SelectionListPopover.
     *
     * @param value - Growth rate label as rendered (e.g. '5%')
     */
    growthRateOption(value: string): Locator {
        return this.page.getByRole('option', { name: value, exact: true });
    }

    /**
     * Growth rate wheel-picker value — mobile only (inside the ActionSheet carousel).
     * Source: growth-rate-picker.tsx `.growth-rate__picker`.
     *
     * @param value - Growth rate label as rendered (e.g. '5%')
     */
    growthRateWheelItem(value: string): Locator {
        return this.page.locator('.growth-rate__picker').getByText(value, { exact: true });
    }

    /**
     * "Save" button inside the mobile growth-rate action sheet footer (if present).
     */
    get growthRateSaveButton(): Locator {
        return this.page.locator('.quill-action-sheet--footer').getByRole('button', { name: 'Save' });
    }

    /**
     * Trade-page purchase button in its "Close [amount] [currency]" state — shown while an
     * accumulator is open. Reverts to the buy button ("Buy") once the contract settles (any close
     * reason), so filtering by "Close" text also encodes the open/closed state.
     *
     * Scoped to `.purchase-button--single` (the trade-page button) to avoid matching the positions
     * flyout's inline card Close button, which auto-opens on desktop after a buy.
     * Source: purchase-button.tsx `.purchase-button--single`.
     */
    get closeButton(): Locator {
        return this.singlePurchaseButton.filter({ hasText: 'Close' });
    }

    // ============================================
    // ACTIONS
    // ============================================

    /**
     * Select the growth rate.
     * Desktop: opens the SelectionListPopover and clicks the matching option.
     * Mobile: opens the wheel-picker ActionSheet, selects the value, saves.
     *
     * @param value - Growth rate label as rendered (e.g. '5%')
     */
    async setGrowthRate(value: string): Promise<void> {
        await this.growthRateField.click();
        if (this.isMobile) {
            await expect(
                this.page.locator('.growth-rate__picker'),
                'Growth rate wheel picker should be visible on mobile'
            ).toBeVisible();
            await this.growthRateWheelItem(value).click();
            if (await this.growthRateSaveButton.isVisible().catch(() => false)) {
                await this.growthRateSaveButton.click();
            }
        } else {
            await expect(
                this.page.getByRole('listbox', { name: 'Selection options' }),
                'Growth rate selection list should be visible after opening the popover'
            ).toBeVisible();
            await this.growthRateOption(value).click();
        }
        await expect(this.growthRateField, `Growth rate field should show '${value}' after selection`).toHaveValue(
            value
        );
    }

    /**
     * Click the (single) Accumulators buy button. Waits for it to be enabled first.
     * Accumulators render one full-width button with no payout content wrapper, so this uses
     * `singlePurchaseButton` (`.purchase-button--single`), not the `dt_purchase_button_wrapper`.
     */
    async clickAccumulatorsBuy(): Promise<void> {
        await expect(
            this.singlePurchaseButton,
            'Accumulators buy button should be enabled before buying'
        ).toBeEnabled();
        await this.singlePurchaseButton.click();
    }

    /**
     * Ensure the open accumulator ends settled — close-reason agnostic.
     *
     * Accumulators can end via manual Close, barrier breach, or take-profit; the trade-page Close
     * button disappears the instant the contract auto-sells.
     * - `waitForAutoSettle` (Flow 8.2, low TP): first give TP/barrier a chance to close the contract
     *   (Close button disappears); only if it is still open after the grace period do we close manually.
     * - Otherwise (Flow 8.1): close manually from the trade page.
     *
     * Final settlement is confirmed later by `verifyClosedPositionsTab` (waits for the closed card).
     *
     * @param waitForAutoSettle - Wait for an automatic close before falling back to a manual close.
     */
    async settleAccumulatorContract({ waitForAutoSettle = false } = {}): Promise<void> {
        // The accumulator can end before we get to act on it — the spot may hit the **barrier** (loss)
        // or the **take profit** (win) within a tick or two of the buy, in which case the "Close"
        // button never appears (it reverts straight to "Buy"). Detect that and defer to the Closed-tab
        // verification instead of failing on a missing Close button.
        const opened = await expect(this.closeButton, 'Accumulator Close button should appear after buying')
            .toBeVisible({ timeout: 10_000 })
            .then(() => true)
            .catch(() => false);
        if (!opened) return; // already settled (e.g. immediate barrier/TP hit); confirmed in the Closed tab

        if (waitForAutoSettle) {
            // Give TP/barrier a chance to close the contract on its own before falling back to manual.
            const autoSettled = await expect(
                this.closeButton,
                'Accumulator should auto-settle (Close button disappears)'
            )
                .toBeHidden({ timeout: 20_000 })
                .then(() => true)
                .catch(() => false);
            if (autoSettled) return;
        }

        // Manual close. The Close button flickers disabled between ticks, so poll for it to be enabled;
        // if it vanishes first, the contract already auto-settled (barrier/TP) — nothing to click.
        const closable = await expect(this.closeButton, 'Close button should become enabled for manual close')
            .toBeEnabled({ timeout: 10_000 })
            .then(() => true)
            .catch(() => false);
        if (closable) {
            // The click can still race a same-instant auto-close; settlement is confirmed in the Closed tab.
            await this.closeButton.click().catch(() => {});
        }
    }

    // ============================================
    // FULL FLOW
    // ============================================

    /**
     * Full Accumulators flow: configure → buy → settle (manual, or auto with manual fallback when a
     * take profit is set) → verify the settled contract in the Positions Closed tab, contract details,
     * balance, and Reports (Trade table + Statement).
     *
     * @param market     - Market symbol supporting Accumulators (e.g. 'Volatility 100 Index')
     * @param growthRate - Growth rate label (e.g. '5%')
     * @param stake      - Stake amount as a string (e.g. '10.00')
     * @param currency   - Currency code (e.g. 'USD')
     * @param takeProfit - Optional take-profit amount (e.g. '1.00'). Omit for the no-TP flow.
     */
    async buyAccumulatorAndVerify({
        market,
        growthRate,
        stake,
        currency,
        takeProfit,
    }: {
        market: string;
        growthRate: string;
        stake: string;
        currency: string;
        takeProfit?: string;
    }): Promise<void> {
        const withTakeProfit = takeProfit !== undefined;

        // 1. Configure
        await this.selectMarket(market);
        await this.selectTradeType('Accumulators');
        await expect(this.durationLabel, 'Duration param should NOT be shown for Accumulators').not.toBeVisible();
        await this.setGrowthRate(growthRate);
        if (withTakeProfit) {
            // Assert TP is configured on the FORM before buying — deterministic, unlike post-buy
            // contract details which can be racy when a low TP auto-closes within a few ticks.
            await this.setTakeProfit(takeProfit!);
        }
        await this.setStake(stake);
        const balanceBefore = await this.getBalance();
        const buyDate = this.getCurrentDate();
        await this.clickAccumulatorsBuy();

        // 2. Post-buy balance. The stake is deducted on buy and stays deducted whether the contract is
        // open or has already auto-settled (a barrier loss returns nothing; a win is credited only at
        // settlement), so `balanceBefore - stake` is the reliable post-buy balance for both flows.
        // We do not assert the open-position card here — the contract may auto-settle within a tick or
        // two (barrier/TP), which would make any open-state assertion racy.
        const balanceAfterBuy = (parseFloat(balanceBefore) - parseFloat(stake)).toFixed(2);

        // 3. Settle the contract (close-reason agnostic: manual, barrier, or take-profit).
        await this.settleAccumulatorContract({ waitForAutoSettle: withTakeProfit });

        // 4. Verify the settled contract in the Positions Closed tab (newest closed = ours).
        // Reopen the flyout fresh: on desktop it auto-opens on buy and its Closed list is fetched then,
        // so it would not reflect a contract that settled afterwards. Close it (if open) before
        // navigating so goToPositions reopens with an up-to-date Closed list.
        if (!this.isMobile) {
            const closeFlyout = this.page.getByRole('button', { name: 'Close flyout' });
            if (await closeFlyout.isVisible().catch(() => false)) {
                await closeFlyout.click();
            }
        }
        await this.goToPositions();
        await this.positionsPage.clickClosedTab();
        const profitLoss = await this.positionsPage.verifyClosedPositionsTab(market, 'Accumulators', currency, stake);

        // 5. Closed contract details — read buy + sell reference IDs for the Reports cross-check.
        await this.positionsPage.openFirstContract();
        const buyId = await this.contractDetailsPage.getBuyReferenceId();
        const sellId = await this.contractDetailsPage.getSellReferenceId();
        await this.contractDetailsPage.closeContractDetails();

        // 6. Verify final balance reflects the settlement.
        const balanceAfterClose = await this.getBalance();
        await this.verifyBalanceAfterContractClose(balanceAfterBuy, stake, profitLoss, balanceAfterClose);

        // 7. Verify the settled contract in Reports — Trade table and Statement.
        await this.goToReports();
        await this.reportsPage.verifyClosedContractInReports(
            buyId,
            sellId,
            currency,
            stake,
            buyDate,
            profitLoss,
            balanceAfterClose,
            balanceAfterBuy
        );
        await this.reportsPage.closeReports();
    }
}
