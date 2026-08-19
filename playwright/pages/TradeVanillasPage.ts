import { expect, type Locator, type Page } from '@playwright/test';
import { TradeParametersPage } from './TradeParametersPage';
import { PositionsPage } from './PositionsPage';
import { ReportsPage } from './ReportsPage';
import { ContractDetailsPage } from './ContractDetailsPage';

/**
 * Page Object for the Vanillas contract type on the trade page (/).
 *
 * Extends TradeParametersPage (→ TradeBasePage). Vanillas specifics:
 *  - **Direction = Call/Put tabs** (`SegmentedControlSingleChoice`, class `.trade-params__option`,
 *    labels "Call"/"Put") — selecting a tab collapses the purchase area to a **single "Buy" button**
 *    (`.purchase-button--single`, no payout content — reuses the inherited `singlePurchaseButton`).
 *  - Unique params: **Strike price** and a **Payout per point info panel** (verified visible; not changed).
 *    Vanillas have **no take profit** parameter.
 *  - Full close-chain verification — early close via Positions Close button, then Closed tab,
 *    closed contract details, balance after close, and Reports Trade/Statement rows.
 *
 * @example
 * ```typescript
 * test('VERIFY Buy "Call" Vanillas Contract', async ({ tradeVanillasPage }) => {
 *     await tradeVanillasPage.buyVanillasAndVerify({
 *         market: 'Volatility 100 Index',
 *         direction: 'Call',
 *         durationUnit: 'Minutes',
 *         durationValue: '5 min',
 *         strike: '+0.00',
 *         stake: '10.00',
 *         currency: 'USD',
 *     });
 * });
 * ```
 */
export class TradeVanillasPage extends TradeParametersPage {
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
     * Strike wheel wrapper inside the mobile Strike action sheet.
     * Source: strike-wheel.tsx data-testid='dt_strike_wrapper'
     */
    get strikeWheelWrapper(): Locator {
        return this.page.getByTestId('dt_strike_wrapper');
    }

    /**
     * "Payout per point" label inside the mobile Strike action sheet.
     * Source: strike-wheel.tsx `.strike__payout__label`
     */
    get strikePayoutPerPointLabel(): Locator {
        return this.page.locator('.strike__payout__label');
    }

    /**
     * Save button in the mobile Strike action sheet footer.
     */
    get strikeSaveButton(): Locator {
        return this.page.locator('.quill-action-sheet--footer').getByRole('button', { name: 'Save' });
    }

    /**
     * Call/Put direction tab in the Vanillas trade-type tab selector (SegmentedControlSingleChoice).
     * Source: trade-type-tabs.tsx — class `.trade-params__option`, labels from getTradeTypeTabsList.
     *
     * @param direction - 'Call' or 'Put'
     */
    directionTab(direction: 'Call' | 'Put'): Locator {
        return this.page.locator('.trade-params__option').getByRole('button', { name: direction, exact: true });
    }

    /**
     * Strike option in the desktop SelectionListPopover.
     * Source: strike-desktop.tsx SelectionListPopover — role="option", label matches barrier_choices value.
     *
     * @param strike - Strike label as rendered (e.g. '+0.00', '-1.80')
     */
    strikeOption(strike: string): Locator {
        return this.page.getByRole('option', { name: strike, exact: true });
    }

    // ============================================
    // ACTIONS
    // ============================================

    /**
     * Assert payout per point is visible on desktop. On mobile, payout per point is asserted inside
     * {@link selectStrike} when the Strike action sheet opens.
     */
    async verifyPayoutPerPointInfo(): Promise<void> {
        if (this.isMobile) {
            return;
        }

        await expect(
            this.payoutPerPointInfo,
            'Payout per point info panel should be visible for Vanillas on desktop'
        ).toBeVisible();
    }

    /**
     * Select a strike price from the preset list (`barrier_choices`).
     * Desktop: opens the SelectionListPopover and clicks the matching option.
     * Mobile: opens the Strike WheelPicker, selects the value, asserts payout per point, then Save.
     *
     * Call after {@link selectDirection} so the proposal has resolved for the chosen Call/Put type.
     *
     * @param strike - Strike label as rendered (e.g. '+0.00', '-1.80')
     */
    async selectStrike(strike: string): Promise<void> {
        await expect(
            this.strikePriceField,
            'Strike price field should be visible before selecting a strike'
        ).toBeVisible();
        await this.strikePriceField.click();

        if (this.isMobile) {
            await expect(this.strikeWheelWrapper, 'Strike wheel should open after tapping Strike price').toBeVisible();
            await this.selectWheelPickerOption('.strike__wheel-picker', strike);
            await expect(
                this.strikePayoutPerPointLabel,
                'Payout per point should be visible inside the mobile Strike sheet'
            ).toBeVisible();
            await this.strikeSaveButton.click();
            await expect(this.strikeWheelWrapper, 'Strike sheet should close after Save').not.toBeVisible();
        } else {
            await expect(
                this.page.getByRole('listbox', { name: 'Selection options' }),
                'Strike selection list should be visible after opening the popover'
            ).toBeVisible();
            await this.strikeOption(strike).click();
        }

        await expect(this.strikePriceField, `Strike price field should show '${strike}' after selection`).toHaveValue(
            strike
        );
    }

    /**
     * Select the Call or Put tab. Confirms selection by asserting the single Buy button becomes enabled
     * (Vanillas show one "Buy" button after a direction is chosen — there is no color change).
     *
     * @param direction - 'Call' or 'Put'
     */
    async selectDirection(direction: 'Call' | 'Put'): Promise<void> {
        await this.directionTab(direction).click();
        await expect(
            this.singlePurchaseButton,
            `Buy button should be enabled after selecting ${direction}`
        ).toBeEnabled();
    }

    /**
     * Click the (single) Vanillas buy button once. Balance and open-position verification
     * happen in {@link buyVanillasAndVerify} via `verifyBalanceAfterContractPurchase` — same
     * pattern as {@link TradeTurbosPage.clickTurbosBuy}. Never re-click on balance timeout;
     * a slow WebSocket update can mean the first buy already succeeded (real-account risk).
     */
    async clickVanillasBuy(): Promise<void> {
        if (this.isMobile) {
            await expect(this.actionSheetOverlay, 'Action sheet overlay should be closed before buying').toBeHidden();
        }
        await expect(this.singlePurchaseButton, 'Vanillas buy button should be enabled before buying').toBeEnabled();
        await this.singlePurchaseButton.click();
    }

    /**
     * Full Vanillas flow: configure → buy → verify open position → early close → verify closed chain.
     *
     * Duration is a Minutes chip from the Vanillas volatility presets.
     *
     * @param accountType   - Account to trade on: 'real' or 'demo'
     * @param market        - Vanillas market symbol (e.g. 'Volatility 100 Index')
     * @param direction     - 'Call' or 'Put'
     * @param durationUnit  - Duration unit label (e.g. 'Minutes')
     * @param durationValue - Duration chip label (e.g. '5 min')
     * @param strike        - Strike preset from barrier_choices (e.g. '+0.00')
     * @param stake         - Stake amount as a string (e.g. '10.00')
     * @param currency      - Currency code (e.g. 'USD')
     */
    async buyVanillasAndVerify({
        accountType,
        market,
        direction,
        durationUnit,
        durationValue,
        strike,
        stake,
        currency,
    }: {
        accountType: 'real' | 'demo';
        market: string;
        direction: 'Call' | 'Put';
        durationUnit: string;
        durationValue: string;
        strike: string;
        stake: string;
        currency: string;
    }): Promise<void> {
        const contractType = `Vanillas ${direction}`;

        // 0. Trade on the account type requested by the test — the account created in beforeAll is real by default.
        await this.switchToAccountType(accountType);
        // Account switch remounts the trade form. Wait for the market strip (not the active-tab
        // aria-current, which can lag while tabs hydrate) before opening the picker.
        await expect(
            this.marketSelectionPage.addMarketButton,
            'Add market button should be visible after switching account'
        ).toBeVisible();

        // 1. Configure and buy
        await this.selectMarketAndTradeType(market, 'Vanillas'); // verifies Strike, Duration, Stake, Buy
        await this.selectDirection(direction);
        await this.selectStrike(strike);
        await this.verifyPayoutPerPointInfo();
        await this.selectDuration(durationUnit, durationValue);
        await this.setStake(stake);
        const balanceBefore = await this.getBalance();
        const buyDate = this.getCurrentDate();
        await this.clickVanillasBuy();

        // 2. Verify contract card appears in Positions and balance deducted
        await this.positionsPage.verifyOpenPositionsVisible();
        await this.verifyBalanceAfterContractPurchase(balanceBefore, stake);
        await this.positionsPage.verifyContractCardDetails(market, contractType, currency, stake, null);

        // 3. Capture balance, verify open position in Reports, and extract buyId
        const balanceBeforeClose = await this.getBalance();
        await this.goToReports();
        await this.reportsPage.verifyReportsPage();
        const buyId = await this.reportsPage.verifyOpenPositionsInReportsForVanillas(currency, stake);
        await this.reportsPage.closeReports();

        // 4. Open contract details and verify, then return to Positions and close the contract
        await this.goToPositions();
        await this.positionsPage.openFirstContract();
        await this.contractDetailsPage.verifyVanillasOpenContractDetailsPage(
            market,
            direction,
            contractType,
            currency,
            stake,
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
            contractType,
            currency,
            stake
        );
        await this.positionsPage.openFirstContract();
        const sellId = await this.contractDetailsPage.verifyVanillasClosedContractDetailsPage(
            market,
            direction,
            contractType,
            currency,
            stake,
            buyId,
            durationValue,
            buyDate,
            contractProfitLossAmount
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
