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
     * Desktop: .multipliers-information__row > dt_span
     * Mobile: second <p> in .stake-content__details-row containing "Stop out" — only visible while stake action sheet is open.
     */
    get stopOutValue(): Locator {
        return this.page.locator('.multipliers-information__row', { hasText: 'Stop out' }).getByTestId('dt_span');
    }

    /**
     * Commission value from .multipliers-information__container on the trade page.
     * Same locator on both desktop and mobile.
     */
    get commissionValue(): Locator {
        return this.page.locator('.multipliers-information__row', { hasText: 'Commission' }).getByTestId('dt_span');
    }

    /**
     * Risk management field (read-only TextField that opens the risk management panel).
     * Desktop: TradeParameterPopover; Mobile: ActionSheet.
     * Source: risk-management.tsx + risk-management-desktop.tsx
     */
    get riskManagementField(): Locator {
        return this.page.getByLabel('Risk management').first();
    }

    /**
     * "TP & SL" tab in the desktop risk management popover sidebar.
     * Source: risk-management-desktop.tsx — vertical-tab-selector first tab.
     */
    get tpSlTabDesktop(): Locator {
        return this.page.locator('.vertical-tab-selector').getByRole('tab', { name: 'TP & SL' });
    }

    /**
     * "DC" tab in the desktop risk management popover sidebar.
     * Source: risk-management-desktop.tsx — vertical-tab-selector second tab.
     */
    get dcTabDesktop(): Locator {
        return this.page.locator('.vertical-tab-selector').getByRole('tab', { name: 'DC' });
    }

    /**
     * Take profit toggle switch in the desktop risk management popover.
     * Scoped to the .risk-management-desktop__field containing the "Take profit" label.
     */
    get tpToggleDesktop(): Locator {
        return this.page
            .locator('.risk-management-desktop__field', { has: this.page.locator('p', { hasText: 'Take profit' }) })
            .locator('button.toggle-switch');
    }

    /**
     * Take profit input (the Quill Textfield wrapper) in the desktop risk management popover.
     * Scoped to the .risk-management-desktop__field containing the "Take profit" label.
     */
    get tpInputDesktop(): Locator {
        return this.page
            .locator('.risk-management-desktop__field', { has: this.page.locator('p', { hasText: 'Take profit' }) })
            .getByRole('textbox', { name: 'Amount' });
    }

    /**
     * Take profit toggle switch in the mobile risk management ActionSheet.
     * Source: take-profit-and-stop-loss-input.tsx — button.toggle-switch inside the TP wrapper.
     * Scoped via the .take-profit__wrapper containing "Take profit" text.
     */
    get tpToggleMobile(): Locator {
        return this.page
            .locator('.take-profit__wrapper', { has: this.page.locator('p', { hasText: 'Take profit' }) })
            .locator('button.toggle-switch');
    }

    /**
     * Take profit input in the mobile risk management ActionSheet.
     * Source: take-profit-and-stop-loss-input.tsx — data-testid="dt_tp_input" is on the <input> itself.
     */
    get tpInputMobile(): Locator {
        return this.page.getByTestId('dt_tp_input');
    }

    /**
     * "Acceptable range" hint below the TP input — only visible after the proposal API responds.
     * Used as a readiness signal before clicking Save on mobile.
     */
    get tpAcceptableRangeHint(): Locator {
        return this.page
            .locator('.take-profit__wrapper', { has: this.page.locator('p', { hasText: 'Take profit' }) })
            .locator('.message__container__text', { hasText: 'Acceptable range' });
    }

    /**
     * "Acceptable range" hint below the SL input — only visible after the proposal API responds.
     * Used as a readiness signal before clicking Save on mobile.
     */
    get slAcceptableRangeHint(): Locator {
        return this.page
            .locator('.take-profit__wrapper', { has: this.page.locator('p', { hasText: 'Stop loss' }) })
            .locator('.message__container__text', { hasText: 'Acceptable range' });
    }

    /**
     * Stop loss toggle switch in the desktop risk management popover.
     * Scoped to the .risk-management-desktop__field containing the "Stop loss" label.
     */
    get slToggleDesktop(): Locator {
        return this.page
            .locator('.risk-management-desktop__field', { has: this.page.locator('p', { hasText: 'Stop loss' }) })
            .locator('button.toggle-switch');
    }

    /**
     * Stop loss input (the Quill Textfield wrapper) in the desktop risk management popover.
     * Scoped to the .risk-management-desktop__field containing the "Stop loss" label.
     */
    get slInputDesktop(): Locator {
        return this.page
            .locator('.risk-management-desktop__field', { has: this.page.locator('p', { hasText: 'Stop loss' }) })
            .getByRole('textbox', { name: 'Amount' });
    }

    /**
     * Stop loss toggle in the mobile risk management ActionSheet.
     * Source: take-profit-and-stop-loss-input.tsx — button.toggle-switch inside the SL wrapper.
     * Scoped via the .take-profit__wrapper containing "Stop loss" text.
     */
    get slToggleMobile(): Locator {
        return this.page
            .locator('.take-profit__wrapper', { has: this.page.locator('p', { hasText: 'Stop loss' }) })
            .locator('button.toggle-switch');
    }

    /**
     * Stop loss input in the mobile risk management ActionSheet.
     * Source: take-profit-and-stop-loss-input.tsx — data-testid="dt_sl_input"
     */
    get slInputMobile(): Locator {
        return this.page.getByTestId('dt_sl_input');
    }

    /**
     * "TP & SL" tab in the mobile segmented control.
     * Source: risk-management-picker.tsx — segmented-control-single first button.item.
     */
    get tpSlTabMobile(): Locator {
        return this.page.locator('.risk-management__picker .segmented-control-single button.item', {
            hasText: 'TP & SL',
        });
    }

    /**
     * "Deal cancellation" tab in the mobile segmented control.
     * Source: risk-management-picker.tsx — segmented-control-single second button.item.
     */
    get dcTabMobile(): Locator {
        return this.page.locator('.risk-management__picker .segmented-control-single button.item', {
            hasText: 'Deal cancellation',
        });
    }

    /**
     * Deal cancellation toggle in the mobile ActionSheet.
     * Source: deal-cancellation.tsx — button.toggle-switch inside .deal-cancellation__toggle.
     */
    get dcToggleMobile(): Locator {
        return this.page.locator('.deal-cancellation__toggle').locator('button.toggle-switch');
    }

    /**
     * Deal cancellation toggle in the desktop popover.
     * Source: deal-cancellation-desktop.tsx — button.toggle-switch inside .deal-cancellation-desktop__wrapper.
     * Uses aria-pressed (not aria-checked) — same as TP/SL toggles.
     */
    get dcToggleDesktop(): Locator {
        return this.page.locator('.deal-cancellation-desktop__wrapper').locator('button.toggle-switch');
    }

    /**
     * A DC duration chip in the desktop popover.
     * Valid values: '5 min', '10 min', '15 min', '30 min', '60 min'.
     * Source: deal-cancellation-desktop.tsx — value-chips__chip with aria-label="Select value <n> min"
     *
     * @param duration - Duration label as shown on the chip (e.g. '60 min')
     */
    dcChipDesktop(duration: '5 min' | '10 min' | '15 min' | '30 min' | '60 min'): Locator {
        return this.page
            .locator('.deal-cancellation-desktop__chips')
            .getByRole('button', { name: `Select value ${duration}` });
    }

    /**
     * A DC duration option in the mobile ActionSheet WheelPicker.
     * Valid values: '5 min', '10 min', '15 min', '30 min', '60 min'.
     * Source: deal-cancellation.tsx — quill-wheel-picker items with role="option".
     *
     * @param duration - Duration label as shown in the wheel (e.g. '60 min')
     */
    dcChipMobile(duration: '5 min' | '10 min' | '15 min' | '30 min' | '60 min'): Locator {
        return this.page
            .locator('.deal-cancellation__wheel-picker')
            .getByRole('option', { name: duration, exact: true });
    }

    /**
     * "Save" button inside the risk management panel.
     * Desktop TP/SL: .risk-management-desktop__tp-sl-wrapper > Save
     * Desktop DC:    .deal-cancellation-desktop__footer > Save
     * Mobile TP/SL:  Quill ActionSheet hoists Save to .quill-action-sheet--footer outside
     *                .risk-management__tp-sl__wrapper — scope via .risk-management__picker instead
     * Mobile DC:     Same picker container, use .last() to disambiguate when segmented control visible
     * Source: take-profit-stop-loss-desktop.tsx, deal-cancellation-desktop.tsx,
     *         take-profit-and-stop-loss-container.tsx, deal-cancellation.tsx, risk-management-picker.tsx
     */
    riskManagementSaveButton(mode: 'tp_sl' | 'dc' = 'tp_sl'): Locator {
        if (this.isMobile) {
            // Mobile TP/SL: Save button has class .risk-management__save-button, rendered inside
            // .risk-management__tp-sl__wrapper (within the ActionSheet content — not hoisted to footer).
            // Mobile DC: same picker container, scoped via .risk-management__picker.
            return mode === 'dc'
                ? this.page.locator('.risk-management__picker').getByRole('button', { name: 'Save' })
                : this.page.locator('.risk-management__tp-sl__wrapper').getByRole('button', { name: 'Save' });
        }
        return mode === 'dc'
            ? this.page.locator('.deal-cancellation-desktop__footer').getByRole('button', { name: 'Save' })
            : this.page.locator('.risk-management-desktop__tp-sl-wrapper').getByRole('button', { name: 'Save' });
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

            // The wheel is a CSS scroll-snap picker (scroll-snap-type: y mandatory).
            // Snap positions are index*48+24. Setting scrollTop directly to the snap-aligned
            // value is the only reliable approach — touch drag and mouse.wheel are unreliable
            // in Playwright's hasTouch emulation context.
            const listbox = this.page.locator('.multiplier__wheel-picker [role="listbox"]');
            const options = await this.page.locator('.multiplier__wheel-picker [role="option"]').all();
            const labels = await Promise.all(options.map(o => o.innerText()));
            const targetIndex = labels.findIndex(t => t.trim() === value);
            if (targetIndex < 0) throw new Error(`Multiplier option '${value}' not found in wheel picker`);

            // Snap formula: index*48+24 (item height 48px, half-item snap offset 24px)
            const targetScrollTop = targetIndex * 48 + 24;
            await listbox.evaluate((el, scrollTop) => {
                el.scrollTop = scrollTop;
            }, targetScrollTop);

            // Verify the field reflects the selection before saving
            await expect(this.multiplierField, `Multiplier field should show '${value}' before saving`).toHaveValue(
                value
            );

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

    /**
     * Open the Risk management panel, configure the requested params, and Save.
     *
     * Supports two mutually exclusive modes — pass TP/SL (can combine both), or DC alone:
     * - `takeProfit`: enable TP toggle and enter the given amount
     * - `stopLoss`:   enable SL toggle and enter the given amount (can be combined with takeProfit)
     * - `dealCancellation`: switch to the DC tab (mobile) or DC panel (desktop), enable the
     *   DC toggle, and select the given duration chip
     *
     * Desktop flow: opens TradeParameterPopover → configures the requested field → clicks Save.
     * Mobile flow:  opens ActionSheet → selects the correct tab if needed → configures → clicks Save.
     *
     * @param params.takeProfit        - TP amount to enter (e.g. '30.00')
     * @param params.stopLoss          - SL amount to enter (e.g. '15.00')
     * @param params.dealCancellation  - DC duration chip to select (e.g. '60 min')
     */
    async setRiskManagement({
        takeProfit,
        stopLoss,
        dealCancellation,
    }: {
        takeProfit?: string;
        stopLoss?: string;
        dealCancellation?: '5 min' | '10 min' | '15 min' | '30 min' | '60 min';
    }): Promise<void> {
        await this.riskManagementField.click();

        if (this.isMobile) {
            await expect(
                this.page.locator('.risk-management__picker'),
                'Risk management ActionSheet should open on mobile'
            ).toBeVisible();

            if (dealCancellation) {
                await this.dcTabMobile.click();
                const isPressed = (await this.dcToggleMobile.getAttribute('aria-pressed')) === 'true';
                if (!isPressed) {
                    await this.dcToggleMobile.click();
                }
                await this.dcChipMobile(dealCancellation).click();
                await this.riskManagementSaveButton('dc').click();
            } else {
                await this.tpSlTabMobile.click();
                if (takeProfit !== undefined) {
                    const isPressed = (await this.tpToggleMobile.getAttribute('aria-pressed')) === 'true';
                    if (!isPressed) {
                        await this.tpToggleMobile.click();
                    }
                    await expect(this.tpInputMobile, 'TP input should appear after enabling toggle').toBeVisible();
                    await this.tpInputMobile.clear();
                    await this.tpInputMobile.pressSequentially(takeProfit, { delay: 70 });
                    await expect(this.tpInputMobile, `TP input should show "${takeProfit}"`).toHaveValue(takeProfit);
                    await this.tpInputMobile.press('Tab');
                    // Wait for the proposal round-trip to populate min/max — the hint only renders
                    // numeric values after is_api_response_received_ref is set to true. This replaces
                    // a fixed timeout and ties progress to actual app readiness.
                    await expect(
                        this.tpAcceptableRangeHint,
                        'TP acceptable range hint should contain a numeric range'
                    ).toContainText(/\d/);
                }
                if (stopLoss !== undefined) {
                    const isPressed = (await this.slToggleMobile.getAttribute('aria-pressed')) === 'true';
                    if (!isPressed) {
                        await this.slToggleMobile.click();
                    }
                    await expect(this.slInputMobile, 'SL input should appear after enabling toggle').toBeVisible();
                    await this.slInputMobile.clear();
                    await this.slInputMobile.pressSequentially(stopLoss, { delay: 70 });
                    await expect(this.slInputMobile, `SL input should show "${stopLoss}"`).toHaveValue(stopLoss);
                    await this.slInputMobile.press('Tab');
                    // Same as TP: wait for numeric range to confirm proposal round-trip completed.
                    await expect(
                        this.slAcceptableRangeHint,
                        'SL acceptable range hint should contain a numeric range'
                    ).toContainText(/\d/);
                }
                await this.riskManagementSaveButton('tp_sl').click();
            }

            await expect(
                this.page.locator('.risk-management__picker'),
                'Risk management ActionSheet should close after saving'
            ).not.toBeVisible();
        } else {
            await expect(
                this.page.locator('.risk-management-popover__main'),
                'Risk management popover should open on desktop'
            ).toBeVisible();

            if (dealCancellation) {
                await this.dcTabDesktop.click();
                const isPressed = (await this.dcToggleDesktop.getAttribute('aria-pressed')) === 'true';
                if (!isPressed) {
                    await this.dcToggleDesktop.click();
                }
                await this.dcChipDesktop(dealCancellation).click();
                await this.riskManagementSaveButton('dc').click();
            } else {
                await this.tpSlTabDesktop.click();
                if (takeProfit !== undefined) {
                    const isPressed = (await this.tpToggleDesktop.getAttribute('aria-pressed')) === 'true';
                    if (!isPressed) {
                        await this.tpToggleDesktop.click();
                    }
                    await expect(this.tpInputDesktop, 'TP input should be enabled after toggle').toBeEnabled();
                    await this.tpInputDesktop.clear();
                    await this.tpInputDesktop.pressSequentially(takeProfit, { delay: 70 });
                    await expect(this.tpInputDesktop, `TP input should show "${takeProfit}"`).toHaveValue(takeProfit);
                }
                if (stopLoss !== undefined) {
                    const isPressed = (await this.slToggleDesktop.getAttribute('aria-pressed')) === 'true';
                    if (!isPressed) {
                        await this.slToggleDesktop.click();
                    }
                    await expect(this.slInputDesktop, 'SL input should be enabled after toggle').toBeEnabled();
                    await this.slInputDesktop.clear();
                    await this.slInputDesktop.pressSequentially(stopLoss, { delay: 70 });
                    await expect(this.slInputDesktop, `SL input should show "${stopLoss}"`).toHaveValue(stopLoss);
                }
                await this.riskManagementSaveButton('tp_sl').click();
            }

            await expect(
                this.page.locator('.risk-management-popover__main'),
                'Risk management popover should close after saving'
            ).not.toBeVisible();
        }

        // After the panel closes, verify the Risk management field reflects the saved value.
        // Both TP and SL set: "TP: 10 USD / SL: 9 USD"; only one: "TP: 10 USD" or "SL: 9 USD".
        if (takeProfit !== undefined && stopLoss !== undefined) {
            await expect(
                this.riskManagementField,
                `Risk management field should show "TP: ${takeProfit} USD / SL: ${stopLoss} USD" after saving`
            ).toHaveValue(`TP: ${takeProfit} USD / SL: ${stopLoss} USD`);
        } else if (takeProfit !== undefined) {
            await expect(
                this.riskManagementField,
                `Risk management field should show "TP: ${takeProfit} USD" after saving`
            ).toHaveValue(`TP: ${takeProfit} USD`);
        } else if (stopLoss !== undefined) {
            await expect(
                this.riskManagementField,
                `Risk management field should show "SL: ${stopLoss} USD" after saving`
            ).toHaveValue(`SL: ${stopLoss} USD`);
        } else if (dealCancellation) {
            const dcMinutes = dealCancellation.replace(' min', '');
            await expect(
                this.riskManagementField,
                `Risk management field should show "DC: ${dcMinutes} minutes" after saving deal cancellation`
            ).toHaveValue(`DC: ${dcMinutes} minutes`);
        }
    }

    /**
     * Read commission and stop out values from .multipliers-information__container on the trade page.
     * Same element on both desktop and mobile — no need to open the stake action sheet.
     */
    private async readCommissionAndStopOut(): Promise<{ commission: string; stopOut: string }> {
        await expect(this.commissionValue, 'Commission value should be visible and non-empty').not.toBeEmpty();
        await expect(this.stopOutValue, 'Stop out value should be visible and non-empty').not.toBeEmpty();
        const commission = (await this.commissionValue.innerText()).trim();
        const stopOut = (await this.stopOutValue.innerText()).trim();
        return { commission, stopOut };
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
        riskManagement,
    }: {
        market: string;
        multiplier: string;
        stake: string;
        currency: string;
        riskManagement?: {
            takeProfit?: string;
            stopLoss?: string;
            dealCancellation?: '5 min' | '10 min' | '15 min' | '30 min' | '60 min';
        };
    }): Promise<void> {
        // 1. Configure and buy
        await this.selectMarket(market);
        await this.selectTradeType('Multipliers');
        await this.clickUpDownOption('Up');
        await this.setMultiplier(multiplier);
        await this.setStake(stake);
        if (riskManagement) {
            await this.setRiskManagement(riskManagement);
        }
        const { commission, stopOut } = await this.readCommissionAndStopOut();
        const balanceBefore = await this.getBalance();
        const buyDate = this.getCurrentDate();
        await this.clickMultipliersBuy();

        // 2. Verify contract card appears in Positions and balance deducted
        await this.positionsPage.verifyOpenPositionsVisible();
        await this.verifyBalanceAfterContractPurchase(balanceBefore, stake);
        await this.positionsPage.verifyMultipliersContractCardDetails(
            market,
            'Multipliers Up',
            currency,
            stake,
            riskManagement
        );

        // 3. Capture balance, verify open position in Reports
        const balanceBeforeClose = await this.getBalance();
        await this.goToReports();
        await this.reportsPage.verifyReportsPage();
        await this.reportsPage.verifyOpenPositionsInReportsForMultipliers(
            currency,
            stake,
            multiplier,
            riskManagement?.takeProfit,
            riskManagement?.stopLoss
        );
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
            commission,
            riskManagement?.takeProfit,
            riskManagement?.stopLoss
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
            stopOut,
            riskManagement?.takeProfit,
            riskManagement?.stopLoss
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
        riskManagement,
    }: {
        market: string;
        multiplier: string;
        stake: string;
        currency: string;
        riskManagement?: {
            takeProfit?: string;
            stopLoss?: string;
            dealCancellation?: '5 min' | '10 min' | '15 min' | '30 min' | '60 min';
        };
    }): Promise<void> {
        // 1. Configure and buy
        await this.selectMarket(market);
        await this.selectTradeType('Multipliers');
        await this.clickUpDownOption('Down');
        await this.setMultiplier(multiplier);
        await this.setStake(stake);
        if (riskManagement) {
            await this.setRiskManagement(riskManagement);
        }
        const { commission, stopOut } = await this.readCommissionAndStopOut();
        const balanceBefore = await this.getBalance();
        const buyDate = this.getCurrentDate();
        await this.clickMultipliersBuy();

        // 2. Verify contract card appears in Positions and balance deducted
        await this.positionsPage.verifyOpenPositionsVisible();
        await this.verifyBalanceAfterContractPurchase(balanceBefore, stake);
        await this.positionsPage.verifyMultipliersContractCardDetails(
            market,
            'Multipliers Down',
            currency,
            stake,
            riskManagement
        );

        // 3. Capture balance, verify open position in Reports
        const balanceBeforeClose = await this.getBalance();
        await this.goToReports();
        await this.reportsPage.verifyReportsPage();
        await this.reportsPage.verifyOpenPositionsInReportsForMultipliers(
            currency,
            stake,
            multiplier,
            riskManagement?.takeProfit,
            riskManagement?.stopLoss
        );
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
            commission,
            riskManagement?.takeProfit,
            riskManagement?.stopLoss
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
            stopOut,
            riskManagement?.takeProfit,
            riskManagement?.stopLoss
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
