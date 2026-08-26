import { expect, type Locator } from '@playwright/test';
import { TradeParametersPage } from './TradeParametersPage';
import { PositionsPage } from './PositionsPage';
import { ReportsPage } from './ReportsPage';
import { ContractDetailsPage } from './ContractDetailsPage';

/**
 * Page Object for Touch/No Touch contract type on the trade page (/).
 *
 * Extends TradeParametersPage (→ TradeBasePage) and adds:
 *  - Touch / No Touch purchase flow with full 7-step verification chain
 *  - Positions, Reports, and ContractDetails cross-checks (mirrors Higher/Lower pattern)
 *
 * @example
 * ```typescript
 * test.beforeEach(async ({ page, loginPage, tradeTouchNoTouchPage }) => {
 *     await TradeBasePage.seedLocalStorageOnOrigin(page);
 *     await loginPage.login(accountEmail, accountPassword);
 * });
 * ```
 */
export class TradeTouchNoTouchPage extends TradeParametersPage {
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
     * Purchase button for Touch — green, class="quill__color--primary-purchase".
     * Source: purchase-button.tsx getButtonType() returns 'purchase' for index 0 (Touch).
     */
    get touchPurchaseButton(): Locator {
        return this.page.locator('.quill__color--primary-purchase');
    }

    /**
     * Purchase button for No Touch — red, class="quill__color--primary-sell".
     * Source: purchase-button.tsx getButtonType() returns 'sell' for index 1 (No Touch).
     */
    get noTouchPurchaseButton(): Locator {
        return this.page.locator('.quill__color--primary-sell');
    }

    /**
     * "Touch" option in the Touch/No Touch segmented control.
     * Source: purchase-button.tsx segmented-control-single > button.item containing "Touch"
     * Scoped to .trade-params__option to avoid matching other buttons.
     */
    get touchOption(): Locator {
        return this.page.locator('.trade-params__option').getByRole('button', { name: 'Touch', exact: true });
    }

    /**
     * "No Touch" option in the Touch/No Touch segmented control.
     * Source: purchase-button.tsx segmented-control-single > button.item containing "No Touch"
     * Scoped to .trade-params__option to avoid matching other buttons.
     */
    get noTouchOption(): Locator {
        return this.page.locator('.trade-params__option').getByRole('button', { name: 'No Touch', exact: true });
    }

    // ============================================
    // ACTIONS
    // ============================================

    /**
     * Select Touch or No Touch in the segmented control and verify the purchase button background color.
     *
     * @param option - 'Touch' or 'No Touch'
     */
    async clickTouchNoTouchOption(option: 'Touch' | 'No Touch'): Promise<void> {
        const target = option === 'Touch' ? this.touchOption : this.noTouchOption;
        const expectedColor = option === 'Touch' ? 'rgb(0, 195, 144)' : 'rgb(222, 0, 64)';
        await target.click();
        await expect(
            option === 'Touch' ? this.touchPurchaseButton : this.noTouchPurchaseButton,
            `Purchase button should have ${option === 'Touch' ? 'green' : 'red'} background after selecting ${option}`
        ).toHaveCSS('background-color', expectedColor);
    }

    /**
     * Full Touch contract flow: configure → buy → verify positions, reports, contract details, balance, and closed contract.
     *
     * @param accountType   - Account to trade on: 'real' or 'demo'
     * @param market        - Market symbol to select (e.g. 'Volatility 75 Index')
     * @param durationUnit  - Duration unit label (e.g. 'Minutes')
     * @param durationValue - Duration chip label (e.g. '15 min')
     * @param stake         - Stake amount as a string (e.g. '10.00')
     * @param currency      - Currency code (e.g. 'USD')
     * @param barrier       - Barrier value without sign prefix (e.g. '3.51')
     * @param barrierType   - Barrier type to select (e.g. 'Above spot')
     */
    async buyTouchAndVerify({
        accountType,
        market,
        durationUnit,
        durationValue,
        stake,
        currency,
        barrier,
        barrierType,
    }: {
        accountType: 'real' | 'demo';
        market: string;
        durationUnit: string;
        durationValue: string;
        barrierType: 'Above spot' | 'Below spot' | 'Fixed barrier';
        barrier: string;
        stake: string;
        currency: string;
    }): Promise<void> {
        // 0. Trade on the account type requested by the test — the account created in beforeAll is real by default.
        await this.switchToAccountType(accountType);

        // 1. Configure and buy
        await this.selectMarketAndTradeType(market, 'Touch/No Touch');
        await this.clickTouchNoTouchOption('Touch');
        await this.selectDuration(durationUnit, durationValue);
        // The app snaps the barrier to a market-valid offset; use the accepted value downstream.
        const acceptedBarrier = await this.setBarrier(barrier, barrierType);
        await this.setStake(stake);
        const balanceBefore = await this.getBalance();
        const buyDate = this.getCurrentDate();
        const payout = await this.clickBuy();

        // 2. Verify contract card appears in Positions and balance deducted
        await this.positionsPage.verifyOpenPositionsVisible();
        await this.verifyBalanceAfterContractPurchase(balanceBefore, stake);
        await this.positionsPage.verifyContractCardDetails(market, 'Touch', currency, stake, payout);

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
            'Touch',
            currency,
            stake,
            payout,
            buyId,
            durationValue,
            buyDate,
            acceptedBarrier,
            barrierType
        );
        await this.contractDetailsPage.closeContractDetails();
        await this.goToPositions();
        await this.positionsPage.closeFirstContract();

        // 5. Verify closed contract in the Closed tab and contract details
        await this.positionsPage.clickClosedTab();
        const contractProfitLossAmount = await this.positionsPage.verifyClosedPositionsTab(
            market,
            'Touch',
            currency,
            stake
        );
        await this.positionsPage.openFirstContract();
        const sellId = await this.contractDetailsPage.verifyClosedContractDetailsPage(
            market,
            'Touch',
            currency,
            stake,
            payout,
            buyId,
            durationValue,
            buyDate,
            contractProfitLossAmount,
            entrySpot,
            acceptedBarrier,
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
     * Full No Touch contract flow: configure → buy → verify positions, reports, contract details, balance, and closed contract.
     *
     * @param accountType   - Account to trade on: 'real' or 'demo'
     * @param market        - Market symbol to select (e.g. 'Volatility 75 Index')
     * @param durationUnit  - Duration unit label (e.g. 'Minutes')
     * @param durationValue - Duration chip label (e.g. '18 min')
     * @param stake         - Stake amount as a string (e.g. '10.00')
     * @param currency      - Currency code (e.g. 'USD')
     * @param barrier       - Barrier value without sign prefix (e.g. '3.51')
     * @param barrierType   - Barrier type to select (e.g. 'Below spot')
     */
    async buyNoTouchAndVerify({
        accountType,
        market,
        durationUnit,
        durationValue,
        stake,
        currency,
        barrier,
        barrierType,
    }: {
        accountType: 'real' | 'demo';
        market: string;
        durationUnit: string;
        durationValue: string;
        barrierType: 'Above spot' | 'Below spot' | 'Fixed barrier';
        barrier: string;
        stake: string;
        currency: string;
    }): Promise<void> {
        // 0. Trade on the account type requested by the test — the account created in beforeAll is real by default.
        await this.switchToAccountType(accountType);

        // 1. Configure and buy
        await this.selectMarketAndTradeType(market, 'Touch/No Touch');
        await this.clickTouchNoTouchOption('No Touch');
        await this.selectDuration(durationUnit, durationValue);
        // The app snaps the barrier to a market-valid offset; use the accepted value downstream.
        const acceptedBarrier = await this.setBarrier(barrier, barrierType);
        await this.setStake(stake);
        const balanceBefore = await this.getBalance();
        const buyDate = this.getCurrentDate();
        const payout = await this.clickBuy();

        // 2. Verify contract card appears in Positions and balance deducted
        await this.positionsPage.verifyOpenPositionsVisible();
        await this.verifyBalanceAfterContractPurchase(balanceBefore, stake);
        await this.positionsPage.verifyContractCardDetails(market, 'No Touch', currency, stake, payout);

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
            'No Touch',
            currency,
            stake,
            payout,
            buyId,
            durationValue,
            buyDate,
            acceptedBarrier,
            barrierType
        );
        await this.contractDetailsPage.closeContractDetails();
        await this.goToPositions();
        await this.positionsPage.closeFirstContract();

        // 5. Verify closed contract in the Closed tab and contract details
        await this.positionsPage.clickClosedTab();
        const contractProfitLossAmount = await this.positionsPage.verifyClosedPositionsTab(
            market,
            'No Touch',
            currency,
            stake
        );
        await this.positionsPage.openFirstContract();
        const sellId = await this.contractDetailsPage.verifyClosedContractDetailsPage(
            market,
            'No Touch',
            currency,
            stake,
            payout,
            buyId,
            durationValue,
            buyDate,
            contractProfitLossAmount,
            entrySpot,
            acceptedBarrier,
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
