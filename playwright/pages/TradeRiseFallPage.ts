import { Locator, expect } from '@playwright/test';
import { TradeParametersPage } from './TradeParametersPage';
import { PositionsPage } from './PositionsPage';
import { ReportsPage } from './ReportsPage';
import { ContractDetailsPage } from './ContractDetailsPage';

/**
 * Page Object for Rise/Fall contract type on the trade page (/).
 *
 * Extends TradeParametersPage (→ TradeBasePage) and adds:
 *  - Stake input action
 *  - Rise / Fall purchase buttons
 *  - Purchase success notification assertion
 *  - Positions navigation + contract open + contract close
 *
 * @example
 * ```typescript
 * test.beforeEach(async ({ page, loginPage, tradeRiseFallPage }) => {
 *     await TradeBasePage.seedLocalStorageOnOrigin(page);
 *     await loginPage.login(accountEmail, accountPassword);
 *     await tradeRiseFallPage.selectMarketAndTradeType('Volatility 100 Index', 'Rise/Fall');
 * });
 * ```
 */
export class TradeRiseFallPage extends TradeParametersPage {
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
     * Purchase success notification icon.
     * Injected by `addBanner` callback in purchase-button.tsx after a successful buy.
     * The `StandaloneStopwatchRegularIcon` receives className `trade-notification--purchase`.
     * Source: purchase-button.tsx addNotificationBannerCallback
     */
    get purchaseNotification(): Locator {
        return this.page.locator('.trade-notification--purchase');
    }

    /**
     * "Rise" option in the Rise/Fall segmented control.
     * Source: trade-params segmented-control-single > button.item containing "Rise"
     */
    get riseOption(): Locator {
        return this.page.locator('.trade-params__option').getByRole('button', { name: 'Rise' });
    }

    /**
     * "Fall" option in the Rise/Fall segmented control.
     * Source: trade-params segmented-control-single > button.item containing "Fall"
     */
    get fallOption(): Locator {
        return this.page.locator('.trade-params__option').getByRole('button', { name: 'Fall' });
    }

    /**
     * Purchase button for Rise — green, class="quill__color--primary-purchase".
     * Source: purchase-button.tsx getButtonType() returns 'purchase' for index 0 (Rise).
     */
    get risePurchaseButton(): Locator {
        return this.page.locator('.quill__color--primary-purchase');
    }

    /**
     * Purchase button for Fall — red, class="quill__color--primary-sell".
     * Source: purchase-button.tsx getButtonType() returns 'sell' for index 1 (Fall).
     */
    get fallPurchaseButton(): Locator {
        return this.page.locator('.quill__color--primary-sell');
    }

    /**
     * Contract details footer close button.
     * Label pattern: "Close [amount] [currency]" or just "Close" while disabled.
     * Source: contract-details-footer.tsx — Button label `${card_labels.CLOSE} ${bid_details}`
     * No testid; matched by accessible name prefix.
     */
    get contractDetailsCloseButton(): Locator {
        return this.page.getByRole('button', { name: /^Close/ });
    }

    // ============================================
    // ACTIONS
    // ============================================

    /**
     * Select Rise or Fall in the segmented control and verify the purchase button turns green.
     *
     * @param option - 'Rise' or 'Fall'
     */
    async clickRiseFallOption(option: 'Rise' | 'Fall'): Promise<void> {
        const target = option === 'Rise' ? this.riseOption : this.fallOption;
        const expectedColor = option === 'Rise' ? 'rgb(0, 195, 144)' : 'rgb(222, 0, 64)';
        await target.click();
        await expect(
            option === 'Rise' ? this.risePurchaseButton : this.fallPurchaseButton,
            `Purchase button should have ${option === 'Rise' ? 'green' : 'red'} background after selecting ${option}`
        ).toHaveCSS('background-color', expectedColor);
    }

    /**
     * Full Rise trade flow: select market → select trade type → set duration → set stake → buy → verify positions.
     *
     * @param accountType - Account to trade on: 'real' or 'demo'
     * @param market - Market symbol to select (e.g. 'Volatility 100 Index')
     * @param durationUnit - Duration unit (e.g. 'Ticks', 'Minutes')
     * @param durationValue - Duration chip label used for selection (e.g. '5 min', '6 ticks')
     * @param stake - Stake amount as a string (e.g. '10.50')
     * @param currency - Currency code (e.g. 'USD')
     */
    async buyRiseAndVerify({
        accountType,
        market,
        durationUnit,
        durationValue,
        stake,
        currency,
        allowEquals = false,
    }: {
        accountType: 'real' | 'demo';
        market: string;
        durationUnit: string;
        durationValue: string;
        stake: string;
        currency: string;
        allowEquals?: boolean;
    }): Promise<void> {
        // 0. Trade on the account type requested by the test — the account created in beforeAll is real by default.
        await this.switchToAccountType(accountType);

        // 1. Configure and buy
        await this.selectMarketAndTradeType(market, 'Rise/Fall');
        if (allowEquals) {
            await this.enableAllowEquals();
            await this.verifyAllowEqualsEnabled();
        }
        await this.clickRiseFallOption('Rise');
        await this.selectDuration(durationUnit, durationValue);
        await this.setStake(stake);
        const balanceBefore = await this.getBalance();
        const buyDate = this.getCurrentDate();
        const payout = await this.clickBuy();

        // 2. Verify contract card appears in Positions and balance deducted
        await this.positionsPage.verifyOpenPositionsVisible();
        await this.verifyBalanceAfterContractPurchase(balanceBefore, stake);
        await this.positionsPage.verifyContractCardDetails(market, 'Rise', currency, stake, payout);

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
            'Rise',
            currency,
            stake,
            payout,
            buyId,
            durationValue,
            buyDate
        );
        await this.contractDetailsPage.closeContractDetails();
        await this.goToPositions();
        await this.positionsPage.closeFirstContract();

        // 5. Verify closed contract in the Closed tab and contract details
        await this.positionsPage.clickClosedTab();
        const contractProfitLossAmount = await this.positionsPage.verifyClosedPositionsTab(
            market,
            'Rise',
            currency,
            stake
        );
        await this.positionsPage.openFirstContract();
        const sellId = await this.contractDetailsPage.verifyClosedContractDetailsPage(
            market,
            'Rise',
            currency,
            stake,
            payout,
            buyId,
            durationValue,
            buyDate,
            contractProfitLossAmount,
            entrySpot
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
     * Full Fall trade flow: select market → select trade type → set duration → set stake → buy → verify positions.
     *
     * @param accountType - Account to trade on: 'real' or 'demo'
     * @param market - Market symbol to select (e.g. 'Volatility 100 Index')
     * @param durationUnit - Duration unit (e.g. 'Ticks', 'Minutes')
     * @param durationValue - Duration chip label used for selection (e.g. '5 min', '6 ticks')
     * @param stake - Stake amount as a string (e.g. '10.50')
     * @param currency - Currency code (e.g. 'USD')
     */
    async buyFallAndVerify({
        accountType,
        market,
        durationUnit,
        durationValue,
        stake,
        currency,
        allowEquals = false,
    }: {
        accountType: 'real' | 'demo';
        market: string;
        durationUnit: string;
        durationValue: string;
        stake: string;
        currency: string;
        allowEquals?: boolean;
    }): Promise<void> {
        // 0. Trade on the account type requested by the test — the account created in beforeAll is real by default.
        await this.switchToAccountType(accountType);

        // 1. Configure and buy
        await this.selectMarketAndTradeType(market, 'Rise/Fall');
        if (allowEquals) {
            await this.enableAllowEquals();
            await this.verifyAllowEqualsEnabled();
        }
        await this.clickRiseFallOption('Fall');
        await this.selectDuration(durationUnit, durationValue);
        await this.setStake(stake);
        const balanceBefore = await this.getBalance();
        const buyDate = this.getCurrentDate();
        const payout = await this.clickBuy();

        // 2. Verify contract card appears in Positions and balance deducted
        await this.positionsPage.verifyOpenPositionsVisible();
        await this.verifyBalanceAfterContractPurchase(balanceBefore, stake);
        await this.positionsPage.verifyContractCardDetails(market, 'Fall', currency, stake, payout);

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
            'Fall',
            currency,
            stake,
            payout,
            buyId,
            durationValue,
            buyDate
        );
        await this.contractDetailsPage.closeContractDetails();
        await this.goToPositions();
        await this.positionsPage.closeFirstContract();

        // 5. Verify closed contract in the Closed tab and contract details
        await this.positionsPage.clickClosedTab();
        const contractProfitLossAmount = await this.positionsPage.verifyClosedPositionsTab(
            market,
            'Fall',
            currency,
            stake
        );
        await this.positionsPage.openFirstContract();
        const sellId = await this.contractDetailsPage.verifyClosedContractDetailsPage(
            market,
            'Fall',
            currency,
            stake,
            payout,
            buyId,
            durationValue,
            buyDate,
            contractProfitLossAmount,
            entrySpot
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
     * Close the currently open contract via the footer "Close" button.
     * Waits for the button to be enabled (bid price loaded) before clicking.
     */
    async closeContract(): Promise<void> {
        await expect(
            this.contractDetailsCloseButton,
            'Contract details footer close button should be visible'
        ).toBeVisible();
        await expect(
            this.contractDetailsCloseButton,
            'Contract details footer close button should be enabled before closing'
        ).toBeEnabled();
        await this.contractDetailsCloseButton.click();
    }

    // ============================================
    // VERIFICATIONS
    // ============================================

    /**
     * Wait for the purchase notification to appear after buying a contract.
     */
    async waitForPurchaseNotification(): Promise<void> {
        await expect(
            this.purchaseNotification,
            'Purchase success notification should appear after buying a contract'
        ).toBeVisible();
    }
}
