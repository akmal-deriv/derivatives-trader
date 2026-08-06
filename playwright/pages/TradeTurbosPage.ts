import { expect, type Locator, type Page } from '@playwright/test';
import { TradeParametersPage } from './TradeParametersPage';
import { PositionsPage } from './PositionsPage';
import { ReportsPage } from './ReportsPage';
import { ContractDetailsPage } from './ContractDetailsPage';

/**
 * Page Object for the Turbos contract type on the trade page (/).
 *
 * Extends TradeParametersPage (→ TradeBasePage). Turbos specifics:
 *  - **Direction = Up/Down tabs** (`SegmentedControlSingleChoice`, class `.trade-params__option`,
 *    labels "Up"/"Down") — selecting a tab collapses the purchase area to a **single "Buy" button**
 *    (`.purchase-button--single`, no payout content — reuses the inherited `singlePurchaseButton`).
 *  - Unique params: **Payout per point** and a **Barrier info panel** (verified visible; not changed).
 *  - **Take profit** uses the shared standalone widget (inherited `setTakeProfit`).
 *  - **Manual early close** from the contract-details footer (`sellContract()`, which retries on
 *    PriceMoved slippage), then the full closed chain — Turbos have a duration/expiry, so the
 *    positions card shows a remaining-time countdown and `verifyContractCardDetails` works unchanged.
 *
 * @example
 * ```typescript
 * test('VERIFY Buy "Up" Turbos Contract', async ({ tradeTurbosPage }) => {
 *     await tradeTurbosPage.buyTurbosAndVerify({
 *         market: 'Volatility 100 (1s) Index',
 *         direction: 'Up',
 *         stake: '10.50',
 *         currency: 'USD',
 *     });
 * });
 * ```
 */
export class TradeTurbosPage extends TradeParametersPage {
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
     * Up/Down direction tab in the Turbos trade-type tab selector (SegmentedControlSingleChoice).
     * Source: trade-type-tabs.tsx — class `.trade-params__option`, labels from getTradeTypeTabsList.
     *
     * @param direction - 'Up' or 'Down'
     */
    directionTab(direction: 'Up' | 'Down'): Locator {
        return this.page.locator('.trade-params__option').getByRole('button', { name: direction, exact: true });
    }

    // ============================================
    // ACTIONS
    // ============================================

    /**
     * Select the Up or Down tab. Confirms selection by asserting the single Buy button becomes enabled
     * (Turbos show one black "Buy" button after a direction is chosen — there is no color change).
     *
     * @param direction - 'Up' or 'Down'
     */
    async selectDirection(direction: 'Up' | 'Down'): Promise<void> {
        await this.directionTab(direction).click();
        await expect(
            this.singlePurchaseButton,
            `Buy button should be enabled after selecting ${direction}`
        ).toBeEnabled();
    }

    /**
     * Click the (single) Turbos buy button. Turbos render one full-width "Buy" button with no payout
     * content wrapper, so this uses the inherited `singlePurchaseButton` (`.purchase-button--single`).
     */
    async clickTurbosBuy(): Promise<void> {
        await expect(this.singlePurchaseButton, 'Turbos buy button should be enabled before buying').toBeEnabled();
        await this.singlePurchaseButton.click();
    }

    /**
     * Full Turbos flow: configure → buy → verify open position → close early from the contract-details
     * footer → verify the settled contract in the Positions Closed tab, balance, and Reports.
     *
     * Duration is a short Minutes value so the card shows a remaining-time countdown (works with the
     * standard `verifyContractCardDetails`); the contract is closed early, so we never wait it out.
     *
     * @param accountType - Account to trade on: 'real' or 'demo'
     * @param market     - Turbos market symbol (e.g. 'Volatility 100 (1s) Index')
     * @param direction  - 'Up' or 'Down'
     * @param stake      - Stake amount as a string (e.g. '10.50')
     * @param currency   - Currency code (e.g. 'USD')
     * @param takeProfit - Optional take-profit amount (e.g. '20.00'). Omit for the no-TP flow.
     */
    async buyTurbosAndVerify({
        accountType,
        market,
        direction,
        stake,
        currency,
        takeProfit,
    }: {
        accountType: 'real' | 'demo';
        market: string;
        direction: 'Up' | 'Down';
        stake: string;
        currency: string;
        takeProfit?: string;
    }): Promise<void> {
        const contractType = `Turbos ${direction}`;

        // 0. Trade on the account type requested by the test — the account created in beforeAll is real by default.
        await this.switchToAccountType(accountType);

        // 1. Configure and buy
        await this.selectMarketAndTradeType(market, 'Turbos'); // verifies Duration, Payout per point, Take profit, Barrier info, Buy
        await this.selectDirection(direction);
        if (takeProfit !== undefined) {
            // Assert TP is configured on the FORM (deterministic) before buying.
            await this.setTakeProfit(takeProfit);
        }
        await this.selectDuration('Minutes', '5 min');
        await this.setStake(stake);
        const balanceBefore = await this.getBalance();
        const buyDate = this.getCurrentDate();
        await this.clickTurbosBuy();

        // 2. Verify the open position and balance deducted
        await this.positionsPage.verifyOpenPositionsVisible();
        await this.verifyBalanceAfterContractPurchase(balanceBefore, stake);
        await this.positionsPage.verifyContractCardDetails(market, contractType, currency, stake, null);
        const balanceBeforeClose = await this.getBalance();

        // 3. Open contract details, capture buyId, (TP flows) assert TP, then close early (slippage-tolerant)
        await this.positionsPage.openFirstContract();
        const buyId = await this.contractDetailsPage.getBuyReferenceId();
        if (takeProfit !== undefined) {
            await this.verifyOpenContractTakeProfit(takeProfit);
        }
        await this.contractDetailsPage.sellContract();
        await this.contractDetailsPage.closeContractDetails();

        // 4. Verify the settled contract in the Positions Closed tab (newest closed = ours)
        await this.goToPositions();
        await this.positionsPage.clickClosedTab();
        const profitLoss = await this.positionsPage.verifyClosedPositionsTab(market, contractType, currency, stake);
        await this.positionsPage.openFirstContract();
        const sellId = await this.contractDetailsPage.getSellReferenceId();
        await this.contractDetailsPage.closeContractDetails();

        // 5. Verify final balance reflects the settlement
        const balanceAfterClose = await this.getBalance();
        await this.verifyBalanceAfterContractClose(balanceBeforeClose, stake, profitLoss, balanceAfterClose);

        // 6. Verify the settled contract in Reports — Trade table and Statement
        await this.goToReports();
        await this.reportsPage.verifyClosedContractInReports(
            buyId,
            sellId,
            currency,
            stake,
            buyDate,
            profitLoss,
            balanceAfterClose,
            balanceBeforeClose
        );
        await this.reportsPage.closeReports();
    }

    // ============================================
    // VERIFICATIONS
    // ============================================

    /**
     * Assert the open Turbos contract details show the configured Take profit amount.
     * Desktop: the "Take profit:" audit-card item. Mobile: the "Take profit" order-details row.
     *
     * @param amount - Expected take-profit amount (e.g. '20.00')
     */
    async verifyOpenContractTakeProfit(amount: string): Promise<void> {
        // Desktop audit card renders labels with a trailing colon ("Take profit:");
        // mobile order-details rows do not ("Take profit").
        const target = this.isMobile
            ? this.contractDetailsPage.mobileOrderDetailsValue('Take profit')
            : this.contractDetailsPage.contractCardItem('Take profit:');
        await expect(target, `Contract details should show Take profit "${amount}"`).toContainText(amount);
    }
}
