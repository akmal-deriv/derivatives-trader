import { expect, type Locator } from '@playwright/test';
import { TradeParametersPage } from './TradeParametersPage';
import { PositionsPage } from './PositionsPage';
import { ReportsPage } from './ReportsPage';
import { ContractDetailsPage } from './ContractDetailsPage';

/**
 * Page Object for Higher/Lower contract type on the trade page (/).
 *
 * Extends TradeParametersPage (→ TradeBasePage) and adds:
 *  - Higher / Lower purchase flow with full 7-step verification chain
 *  - Positions, Reports, and ContractDetails cross-checks (mirrors Rise/Fall pattern)
 *
 * @example
 * ```typescript
 * test.beforeEach(async ({ page, loginPage, tradeHigherLowerPage }) => {
 *     await TradeBasePage.seedLocalStorageOnOrigin(page);
 *     await loginPage.login(accountEmail, accountPassword);
 * });
 * ```
 */
export class TradeHigherLowerPage extends TradeParametersPage {
    private readonly positionsPage: PositionsPage;
    private readonly reportsPage: ReportsPage;
    private readonly contractDetailsPage: ContractDetailsPage;

    constructor(page: import('@playwright/test').Page) {
        super(page);
        this.positionsPage = new PositionsPage(page);
        this.reportsPage = new ReportsPage(page);
        this.contractDetailsPage = new ContractDetailsPage(page);
    }

    // ============================================
    // LOCATORS
    // ============================================

    /**
     * Purchase button for Higher — green, class="quill__color--primary-purchase".
     * Source: purchase-button.tsx getButtonType() returns 'purchase' for index 0 (Higher).
     */
    get higherPurchaseButton(): Locator {
        return this.page.locator('.quill__color--primary-purchase');
    }

    /**
     * Purchase button for Lower — red, class="quill__color--primary-sell".
     * Source: purchase-button.tsx getButtonType() returns 'sell' for index 1 (Lower).
     */
    get lowerPurchaseButton(): Locator {
        return this.page.locator('.quill__color--primary-sell');
    }

    // ============================================
    // ACTIONS
    // ============================================

    /**
     * Select Higher or Lower in the segmented control and verify the purchase button background color.
     *
     * @param option - 'Higher' or 'Lower'
     */
    async clickHigherLowerOption(option: 'Higher' | 'Lower'): Promise<void> {
        const target = option === 'Higher' ? this.higherOption : this.lowerOption;
        const expectedColor = option === 'Higher' ? 'rgb(0, 195, 144)' : 'rgb(222, 0, 64)';
        await target.click();
        await expect(
            option === 'Higher' ? this.higherPurchaseButton : this.lowerPurchaseButton,
            `Purchase button should have ${option === 'Higher' ? 'green' : 'red'} background after selecting ${option}`
        ).toHaveCSS('background-color', expectedColor);
    }

    /**
     * Full Higher contract flow: configure → buy → verify positions, reports, contract details, balance, and closed contract.
     *
     * @param market        - Market symbol to select (e.g. 'Volatility 75 Index')
     * @param durationUnit  - Duration unit label (e.g. 'Minutes')
     * @param durationValue - Duration chip label (e.g. '15 min')
     * @param stake         - Stake amount as a string (e.g. '10.00')
     * @param currency      - Currency code (e.g. 'USD')
     * @param barrier       - Barrier value without sign prefix (e.g. '3.51').
     * @param barrierType   - Barrier type to select (e.g. 'Above spot').
     */
    async buyHigherAndVerify({
        market,
        durationUnit,
        durationValue,
        stake,
        currency,
        barrier,
        barrierType,
    }: {
        market: string;
        durationUnit: string;
        durationValue: string;
        barrierType: 'Above spot' | 'Below spot' | 'Fixed barrier';
        barrier: string;
        stake: string;
        currency: string;
    }): Promise<void> {
        // 1. Configure and buy
        await this.selectMarket(market);
        await this.selectTradeType('Higher/Lower');
        await this.clickHigherLowerOption('Higher');
        await this.selectDuration(durationUnit, durationValue);
        await this.setBarrier(barrier, barrierType);
        await this.setStake(stake);
        const balanceBefore = await this.getBalance();
        const buyDate = this.getCurrentDate();
        const payout = await this.clickBuy();

        // 2. Verify contract card appears in Positions and balance deducted
        await this.positionsPage.verifyOpenPositionsVisible();
        await this.verifyBalanceAfterContractPurchase(balanceBefore, stake);
        await this.positionsPage.verifyContractCardDetails(market, 'Higher', currency, stake, payout);

        // 3. Capture balance, verify open position in Reports, and extract buyId
        const balanceBeforeClose = await this.getBalance();
        await this.goToReports();
        await this.reportsPage.verifyReportsPage();
        const buyId = await this.reportsPage.verifyOpenPositionsInReports(currency, stake, payout);
        await this.reportsPage.closeReports();

        // 4. Open contract details and verify, then return to Positions and close the contract
        await this.goToPositions();
        await this.positionsPage.openFirstContract();
        const entrySpot = await this.contractDetailsPage.verifyContractDetailsPage(
            market,
            'Higher',
            currency,
            stake,
            payout,
            buyId,
            durationValue,
            buyDate,
            barrier,
            barrierType
        );
        await this.contractDetailsPage.closeContractDetails();
        await this.goToPositions();
        await this.positionsPage.closeFirstContract();

        // 5. Verify closed contract in the Closed tab and contract details
        await this.positionsPage.clickClosedTab();
        const contractProfitLossAmount = await this.positionsPage.verifyClosedPositionsTab(
            market,
            'Higher',
            currency,
            stake
        );
        await this.positionsPage.openFirstContract();
        const sellId = await this.contractDetailsPage.verifyClosedContractDetailsPage(
            market,
            'Higher',
            currency,
            stake,
            payout,
            buyId,
            durationValue,
            buyDate,
            contractProfitLossAmount,
            entrySpot,
            barrier,
            barrierType
        );
        await this.contractDetailsPage.closeContractDetails();

        // 6. Verify final balance reflects contract P/L
        const balanceAfterClose = await this.getBalance();
        await this.verifyBalanceAfterContractClose(
            balanceBeforeClose,
            stake,
            contractProfitLossAmount,
            balanceAfterClose
        );

        // 7. Verify closed contract appears in Reports > Trade table and Statement
        await this.goToReports();
        await this.reportsPage.verifyClosedContractInReports(
            buyId,
            sellId,
            currency,
            stake,
            buyDate,
            contractProfitLossAmount,
            balanceAfterClose,
            balanceBeforeClose
        );
        await this.reportsPage.closeReports();
    }

    /**
     * Full Lower contract flow: configure → buy → verify positions, reports, contract details, balance, and closed contract.
     *
     * @param market        - Market symbol to select (e.g. 'Volatility 75 Index')
     * @param durationUnit  - Duration unit label (e.g. 'Minutes')
     * @param durationValue - Duration chip label (e.g. '18 min')
     * @param stake         - Stake amount as a string (e.g. '10.00')
     * @param currency      - Currency code (e.g. 'USD')
     * @param barrier       - Barrier value without sign prefix (e.g. '3.51').
     * @param barrierType   - Barrier type to select (e.g. 'Below spot').
     */
    async buyLowerAndVerify({
        market,
        durationUnit,
        durationValue,
        stake,
        currency,
        barrier,
        barrierType,
    }: {
        market: string;
        durationUnit: string;
        durationValue: string;
        barrierType: 'Above spot' | 'Below spot' | 'Fixed barrier';
        barrier: string;
        stake: string;
        currency: string;
    }): Promise<void> {
        // 1. Configure and buy
        await this.selectMarket(market);
        await this.selectTradeType('Higher/Lower');
        await this.clickHigherLowerOption('Lower');
        await this.selectDuration(durationUnit, durationValue);
        await this.setBarrier(barrier, barrierType);
        await this.setStake(stake);
        const balanceBefore = await this.getBalance();
        const buyDate = this.getCurrentDate();
        const payout = await this.clickBuy();

        // 2. Verify contract card appears in Positions and balance deducted
        await this.positionsPage.verifyOpenPositionsVisible();
        await this.verifyBalanceAfterContractPurchase(balanceBefore, stake);
        await this.positionsPage.verifyContractCardDetails(market, 'Lower', currency, stake, payout);

        // 3. Capture balance, verify open position in Reports, and extract buyId
        const balanceBeforeClose = await this.getBalance();
        await this.goToReports();
        await this.reportsPage.verifyReportsPage();
        const buyId = await this.reportsPage.verifyOpenPositionsInReports(currency, stake, payout);
        await this.reportsPage.closeReports();

        // 4. Open contract details and verify, then return to Positions and close the contract
        await this.goToPositions();
        await this.positionsPage.openFirstContract();
        const entrySpot = await this.contractDetailsPage.verifyContractDetailsPage(
            market,
            'Lower',
            currency,
            stake,
            payout,
            buyId,
            durationValue,
            buyDate,
            barrier,
            barrierType
        );
        await this.contractDetailsPage.closeContractDetails();
        await this.goToPositions();
        await this.positionsPage.closeFirstContract();

        // 5. Verify closed contract in the Closed tab and contract details
        await this.positionsPage.clickClosedTab();
        const contractProfitLossAmount = await this.positionsPage.verifyClosedPositionsTab(
            market,
            'Lower',
            currency,
            stake
        );
        await this.positionsPage.openFirstContract();
        const sellId = await this.contractDetailsPage.verifyClosedContractDetailsPage(
            market,
            'Lower',
            currency,
            stake,
            payout,
            buyId,
            durationValue,
            buyDate,
            contractProfitLossAmount,
            entrySpot,
            barrier,
            barrierType
        );
        await this.contractDetailsPage.closeContractDetails();

        // 6. Verify final balance reflects contract P/L
        const balanceAfterClose = await this.getBalance();
        await this.verifyBalanceAfterContractClose(
            balanceBeforeClose,
            stake,
            contractProfitLossAmount,
            balanceAfterClose
        );

        // 7. Verify closed contract appears in Reports > Trade table and Statement
        await this.goToReports();
        await this.reportsPage.verifyClosedContractInReports(
            buyId,
            sellId,
            currency,
            stake,
            buyDate,
            contractProfitLossAmount,
            balanceAfterClose,
            balanceBeforeClose
        );
        await this.reportsPage.closeReports();
    }
}
