import { expect, type Locator } from '@playwright/test';
import { TradeParametersPage } from './TradeParametersPage';
import { PositionsPage } from './PositionsPage';
import { ReportsPage } from './ReportsPage';
import { ContractDetailsPage } from './ContractDetailsPage';

/**
 * Page Object for the Multipliers contract type on the trade page (/).
 *
 * Extends TradeParametersPage (→ TradeBasePage) and adds:
 *  - Multiplier parameter locators (desktop: SelectionListPopover, mobile: WheelPicker)
 *  - Risk management label locator
 *  - Up / Down purchase buttons
 *  - buyUpAndVerify / buyDownAndVerify — full 7-step verification chain
 *
 * @example
 * ```typescript
 * test.beforeEach(async ({ page, loginPage, tradeMultipliersPage }) => {
 *     await TradeBasePage.seedLocalStorageOnOrigin(page);
 *     await loginPage.login(accountEmail, accountPassword);
 * });
 * ```
 */
export class TradeMultipliersPage extends TradeParametersPage {
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
     * "Multiplier" label — stable across both viewports.
     * Desktop: TradeParameterPopover renders a readOnly TextField labelled "Multiplier".
     * Mobile: ActionSheet TextField labelled "Multiplier".
     * Source: multiplier-desktop.tsx / multiplier.tsx — i18n_default_text='Multiplier'
     */
    get multiplierLabel(): Locator {
        return this.page.locator('label', { hasText: 'Multiplier' }).first();
    }

    /**
     * Multiplier field trigger (read-only TextField that opens the popover/action-sheet).
     * Desktop: TradeParameterPopover renders a readOnly TextField labelled "Multiplier".
     * Mobile: multiplier.tsx renders a readOnly TextField labelled "Multiplier".
     * Source: multiplier-desktop.tsx + multiplier.tsx
     */
    get multiplierField(): Locator {
        return this.page.getByLabel('Multiplier').first();
    }

    /**
     * Risk management label — stable across both viewports.
     * Desktop: TradeParameterPopover labelled "Risk management".
     * Mobile: ActionSheet TextField labelled "Risk management".
     * Source: risk-management-desktop.tsx / risk-management.tsx — i18n_default_text='Risk management'
     */
    get riskManagementLabel(): Locator {
        return this.page.locator('label', { hasText: 'Risk management' }).first();
    }

    /**
     * Buy button — single button shared by both Up and Down directions.
     * Direction is set via the segmented control before clicking this.
     * Source: purchase-button.tsx — className='purchase-button purchase-button--single'
     * The Multipliers buy button always renders in single-button mode.
     */
    get buyButton(): Locator {
        return this.page.locator('.purchase-button--single');
    }

    /**
     * Direction segment button inside the segmented control.
     * Source: segmented-control-single — two <button class="item"> elements: "Up" and "Down".
     *
     * @param direction - "Up" or "Down"
     */
    directionButton(direction: 'Up' | 'Down'): Locator {
        return this.page.locator('.segmented-control-single button.item', { hasText: direction });
    }

    /**
     * Stop out value shown below the trade params (e.g. "10.00 USD").
     * Source: multipliers-information__row containing "Stop out" label > span[data-testid="dt_span"]
     */
    get stopOutValue(): Locator {
        return this.page.locator('.multipliers-information__row', { hasText: 'Stop out' }).getByTestId('dt_span');
    }

    /**
     * Commission value shown below the trade params (e.g. "0.15 USD").
     * Source: multipliers-information__row containing "Commission" label > span[data-testid="dt_span"]
     */
    get commissionValue(): Locator {
        return this.page.locator('.multipliers-information__row', { hasText: 'Commission' }).getByTestId('dt_span');
    }

    /**
     * Multiplier option button inside the desktop SelectionListPopover.
     * Source: SelectionListPopover.tsx — role="option", text content is the multiplier label (e.g. "x200").
     *
     * @param value - Multiplier label as rendered (e.g. 'x200', 'x300')
     */
    multiplierOption(value: string): Locator {
        return this.page.getByRole('option', { name: value, exact: true });
    }

    /**
     * WheelPicker item for a multiplier value — mobile only.
     * Source: WheelPicker data items rendered with text content matching multiplier_range_list text (e.g. "x200").
     *
     * @param value - Multiplier label as rendered (e.g. 'x200', 'x300')
     */
    multiplierWheelItem(value: string): Locator {
        return this.page.locator('.multiplier__wheel-picker').getByText(value, { exact: true });
    }

    /**
     * "Save" button inside the multiplier ActionSheet footer — mobile only.
     * Source: multiplier-wheel-picker.tsx ActionSheet.Footer primaryAction
     */
    get multiplierMobileSaveButton(): Locator {
        return this.page.locator('.quill-action-sheet--footer').getByRole('button', { name: 'Save' });
    }

    // ============================================
    // ACTIONS
    // ============================================

    /**
     * Set the multiplier value.
     * Desktop: opens the SelectionListPopover and clicks the matching option.
     * Mobile: opens the WheelPicker ActionSheet, selects the value, clicks Save.
     *
     * @param value - Multiplier label as rendered (e.g. 'x200', 'x300')
     *
     * @example
     * ```typescript
     * await tradeMultipliersPage.setMultiplier('x200');
     * ```
     */
    async setMultiplier(value: string): Promise<void> {
        await this.multiplierField.click();

        if (this.isMobile) {
            await expect(
                this.page.locator('.multiplier__wheel-picker'),
                'Multiplier wheel picker should be visible on mobile'
            ).toBeVisible();
            await this.multiplierWheelItem(value).click();
            await this.multiplierMobileSaveButton.click();
            await expect(
                this.page.locator('.multiplier__wheel-picker'),
                'Multiplier action sheet should dismiss after saving'
            ).not.toBeVisible();
        } else {
            await expect(
                this.page.getByRole('listbox', { name: 'Selection options' }),
                'Multiplier selection list should be visible after opening the popover'
            ).toBeVisible();
            await this.multiplierOption(value).click();
        }

        await expect(this.multiplierField, `Multiplier field should show '${value}' after selection`).toHaveValue(
            value
        );
    }

    /**
     * Select Up or Down in the direction segmented control and verify the segment is active.
     * Mirrors the clickRiseFallOption pattern in TradeRiseFallPage.
     *
     * @param direction - 'Up' or 'Down'
     */
    async clickUpDownOption(direction: 'Up' | 'Down'): Promise<void> {
        await this.directionButton(direction).click();
        await expect(
            this.directionButton(direction),
            `"${direction}" segment should be selected after clicking`
        ).toHaveClass(/selected/);
    }

    /**
     * Click the Buy button. Call clickUpDownOption() first to set the direction.
     */
    async clickMultipliersBuy(): Promise<void> {
        await expect(this.buyButton, 'Buy button should be enabled before buying').toBeEnabled();
        await this.buyButton.click();
    }

    // ============================================
    // FULL FLOW METHODS
    // ============================================

    /**
     * Full Multipliers Up contract flow: configure → buy → verify positions, reports,
     * contract details, balance, and closed contract.
     *
     * Implements Flow 9.1 (18 steps): Multipliers has no Duration param and no Barrier.
     * The contract details page shows a Multiplier value (not Duration/Barrier).
     *
     * @param market     - Market symbol to select (e.g. 'Jump 10 Index')
     * @param multiplier - Multiplier value to select (e.g. 'x200')
     * @param stake      - Stake amount as a string (e.g. '20.00')
     * @param currency   - Currency code (e.g. 'USD')
     */
    async buyUpAndVerify({
        market,
        multiplier,
        stake,
        currency,
    }: {
        market: string;
        multiplier: string;
        stake: string;
        currency: string;
    }): Promise<void> {
        // 1. Configure and buy
        await this.selectMarket(market);
        await this.selectTradeType('Multipliers');
        await this.clickUpDownOption('Up');
        await this.setMultiplier(multiplier);
        await this.setStake(stake);
        const commission = (await this.commissionValue.innerText()).trim();
        const stopOut = (await this.stopOutValue.innerText()).trim();
        const balanceBefore = await this.getBalance();
        const buyDate = this.getCurrentDate();
        await this.clickMultipliersBuy();

        // 2. Verify contract card appears in Positions and balance deducted
        await this.positionsPage.verifyOpenPositionsVisible();
        await this.verifyBalanceAfterContractPurchase(balanceBefore, stake);
        await this.positionsPage.verifyContractCardDetails(market, 'Multipliers Up', currency, stake, null);

        // 3. Capture balance, verify open position in Reports
        const balanceBeforeClose = await this.getBalance();
        await this.goToReports();
        await this.reportsPage.verifyReportsPage();
        await this.reportsPage.verifyOpenPositionsInReportsForMultipliers(currency, stake, multiplier);
        await this.reportsPage.closeReports();

        // 4. Open contract details — verify and extract buyId from the audit grid
        await this.goToPositions();
        await this.positionsPage.openFirstContract();
        const { buyId, entrySpot } = await this.contractDetailsPage.verifyMultipliersContractDetailsPage(
            market,
            'Up',
            currency,
            stake,
            multiplier,
            buyDate,
            commission
        );
        await this.contractDetailsPage.closeContractDetails();
        await this.goToPositions();
        await this.positionsPage.closeFirstContract();

        // 5. Verify closed contract in the Closed tab and contract details
        await this.positionsPage.clickClosedTab();
        const contractProfitLossAmount = await this.positionsPage.verifyClosedPositionsTab(
            market,
            'Multipliers Up',
            currency,
            stake
        );
        await this.positionsPage.openFirstContract();
        const sellId = await this.contractDetailsPage.verifyClosedMultipliersContractDetailsPage(
            market,
            'Up',
            currency,
            stake,
            multiplier,
            buyId,
            buyDate,
            contractProfitLossAmount,
            commission,
            entrySpot,
            stopOut
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
     * Full Multipliers Down contract flow: configure → buy → verify positions, reports,
     * contract details, balance, and closed contract.
     *
     * Implements Flow 9.2 (15 steps): same structure as buyUpAndVerify but with Down direction.
     *
     * @param market     - Market symbol to select (e.g. 'Jump 10 Index')
     * @param multiplier - Multiplier value to select (e.g. 'x300')
     * @param stake      - Stake amount as a string (e.g. '21.00')
     * @param currency   - Currency code (e.g. 'USD')
     */
    async buyDownAndVerify({
        market,
        multiplier,
        stake,
        currency,
    }: {
        market: string;
        multiplier: string;
        stake: string;
        currency: string;
    }): Promise<void> {
        // 1. Configure and buy
        await this.selectMarket(market);
        await this.selectTradeType('Multipliers');
        await this.clickUpDownOption('Down');
        await this.setMultiplier(multiplier);
        await this.setStake(stake);
        const commission = (await this.commissionValue.innerText()).trim();
        const stopOut = (await this.stopOutValue.innerText()).trim();
        const balanceBefore = await this.getBalance();
        const buyDate = this.getCurrentDate();
        await this.clickMultipliersBuy();

        // 2. Verify contract card appears in Positions and balance deducted
        await this.positionsPage.verifyOpenPositionsVisible();
        await this.verifyBalanceAfterContractPurchase(balanceBefore, stake);
        await this.positionsPage.verifyContractCardDetails(market, 'Multipliers Down', currency, stake, null);

        // 3. Capture balance, verify open position in Reports
        const balanceBeforeClose = await this.getBalance();
        await this.goToReports();
        await this.reportsPage.verifyReportsPage();
        await this.reportsPage.verifyOpenPositionsInReportsForMultipliers(currency, stake, multiplier);
        await this.reportsPage.closeReports();

        // 4. Open contract details — verify and extract buyId from the audit grid
        await this.goToPositions();
        await this.positionsPage.openFirstContract();
        const { buyId, entrySpot } = await this.contractDetailsPage.verifyMultipliersContractDetailsPage(
            market,
            'Down',
            currency,
            stake,
            multiplier,
            buyDate,
            commission
        );
        await this.contractDetailsPage.closeContractDetails();
        await this.goToPositions();
        await this.positionsPage.closeFirstContract();

        // 5. Verify closed contract in the Closed tab and contract details
        await this.positionsPage.clickClosedTab();
        const contractProfitLossAmount = await this.positionsPage.verifyClosedPositionsTab(
            market,
            'Multipliers Down',
            currency,
            stake
        );
        await this.positionsPage.openFirstContract();
        const sellId = await this.contractDetailsPage.verifyClosedMultipliersContractDetailsPage(
            market,
            'Down',
            currency,
            stake,
            multiplier,
            buyId,
            buyDate,
            contractProfitLossAmount,
            commission,
            entrySpot,
            stopOut
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
