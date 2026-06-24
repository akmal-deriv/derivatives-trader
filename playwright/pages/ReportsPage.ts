import { Locator, expect } from '@playwright/test';
import { TradeBasePage } from './TradeBasePage';

/**
 * Page Object for the Reports overlay (/reports).
 *
 * The Reports page opens as a full-screen overlay triggered from the sidebar.
 * It contains three tabs: Open positions, Trade table, and Statement.
 *
 * @example
 * ```typescript
 * test('VERIFY open positions appear in reports', async ({ reportsPage }) => {
 *     await reportsPage.goToReports();
 *     await reportsPage.verifyOpenPositionsInReports();
 * });
 * ```
 */
export class ReportsPage extends TradeBasePage {
    // ============================================
    // ROUTE PICKER VALUES (mobile native <select>)
    // ============================================

    static readonly ROUTE_OPEN_POSITIONS_MOB = '/reports/positions';
    static readonly ROUTE_TRADE_TABLE_MOB = '/reports/profit';
    static readonly ROUTE_STATEMENT_MOB = '/reports/statement';

    // ============================================
    // LOCATORS
    // ============================================

    /**
     * Reports page overlay header title.
     * Source: dc-page-overlay__header-title
     */
    get reportsHeaderTitle(): Locator {
        return this.page.locator('.dc-page-overlay__header-title');
    }

    /**
     * Reports close button in the overlay header.
     * Source: data-testid="dt_page_overlay_header_close"
     */
    get reportsCloseButton(): Locator {
        return this.page.getByTestId('dt_page_overlay_header_close');
    }

    /**
     * "Open positions" nav link in the Reports sidebar — desktop only.
     * Source: dc-vertical-tab__header id="dc_open-positions_link"
     */
    get reportsOpenPositionsTab(): Locator {
        return this.page.locator('#dc_open-positions_link');
    }

    /**
     * "Trade table" nav link in the Reports sidebar — desktop only.
     * Source: dc-vertical-tab__header id="dc_trade-table_link"
     */
    get reportsTradeTableTab(): Locator {
        return this.page.locator('#dc_trade-table_link');
    }

    /**
     * "Statement" nav link in the Reports sidebar — desktop only.
     * Source: dc-vertical-tab__header id="dc_statement_link"
     */
    get reportsStatementTab(): Locator {
        return this.page.locator('#dc_statement_link');
    }

    // ============================================
    // STATEMENT LOCATORS
    // ============================================

    /**
     * Statement header row.
     * Source: .statement__row inside .table__head
     */
    get statementTableHeader(): Locator {
        return this.page.locator('.table__head .statement__row');
    }

    /**
     * All statement rows whose Ref. ID contains the given refId.
     * - Desktop: a.statement__row with .table__cell.refid .dc-popover__target
     * - Mobile:  a.data-list__item--wrapper with .refid .dc-popover__target
     */
    statementRowsByRefId(refId: string): Locator {
        if (this.isMobile) {
            return this.page.locator('a.data-list__item--wrapper').filter({
                has: this.page.locator('.refid .dc-popover__target', { hasText: refId }),
            });
        }
        return this.page.locator('a.statement__row').filter({
            has: this.page.locator('.table__cell.refid .dc-popover__target', { hasText: refId }),
        });
    }

    /**
     * The Sell transaction row identified by refId + .dc-label--general--danger.
     * On mobile the Sell row has its own refId (different from buyId) — pass sellId extracted
     * from ContractDetailsPage. On desktop pass the sellId from the audit grid.
     */
    statementSellRow(refId: string): Locator {
        if (this.isMobile) {
            return this.page
                .locator('a.data-list__item--wrapper')
                .filter({
                    has: this.page.locator('.action_type .dc-label--general--danger'),
                })
                .filter({
                    has: this.page.locator('.refid .dc-popover__target', { hasText: refId }),
                });
        }
        return this.statementRowsByRefId(refId).filter({
            has: this.page.locator('.table__cell.action_type .dc-label--general--danger'),
        });
    }

    /**
     * The Buy transaction row for a contract identified by refId.
     * Identified by .dc-label--general--success in the action_type cell.
     */
    statementBuyRow(refId: string): Locator {
        if (this.isMobile) {
            return this.page
                .locator('a.data-list__item--wrapper')
                .filter({
                    has: this.page.locator('.action_type .dc-label--general--success'),
                })
                .filter({
                    has: this.page.locator('.refid .dc-popover__target', { hasText: refId }),
                });
        }
        return this.statementRowsByRefId(refId).filter({
            has: this.page.locator('.table__cell.action_type .dc-label--general--success'),
        });
    }

    /** "Type" header cell on the Statement table */
    get statementHeaderType(): Locator {
        return this.statementTableHeader.locator('.table__cell.icon');
    }

    /** "Ref. ID" header cell on the Statement table */
    get statementHeaderRefId(): Locator {
        return this.statementTableHeader.locator('.table__cell.refid');
    }

    /** "Currency" header cell on the Statement table */
    get statementHeaderCurrency(): Locator {
        return this.statementTableHeader.locator('.table__cell.currency');
    }

    /** "Transaction time" header cell on the Statement table */
    get statementHeaderTransactionTime(): Locator {
        return this.statementTableHeader.locator('.table__cell.transaction_time');
    }

    /** "Action" header cell on the Statement table */
    get statementHeaderAction(): Locator {
        return this.statementTableHeader.locator('.table__cell.action_type');
    }

    /** "Credit/Debit" header cell on the Statement table */
    get statementHeaderAmount(): Locator {
        return this.statementTableHeader.locator('.table__cell.amount');
    }

    /** "Balance" header cell on the Statement table */
    get statementHeaderBalance(): Locator {
        return this.statementTableHeader.locator('.table__cell.balance');
    }

    // ============================================
    // TRADE TABLE LOCATORS
    // ============================================

    /**
     * Trade table row matching a specific contract by its Ref. ID (buyId).
     * - Desktop: a.profit-table__row with .table__cell.transaction_id
     * - Mobile:  a.data-list__item--wrapper with .transaction_id .data-list__row-content
     */
    tradeTableRowByRefId(buyId: string): Locator {
        if (this.isMobile) {
            return this.page.locator('a.data-list__item--wrapper').filter({
                has: this.page.locator('.transaction_id .data-list__row-content', { hasText: buyId }),
            });
        }
        return this.page.locator('a.profit-table__row').filter({
            has: this.page.locator(`.table__cell.transaction_id`, { hasText: buyId }),
        });
    }

    /** Table header row. Source: .profit-table__row inside .table__head */
    get tradeTableHeader(): Locator {
        return this.page.locator('.table__head .profit-table__row');
    }

    /** "Type" header cell */
    get tradeTableHeaderType(): Locator {
        return this.tradeTableHeader.locator('.table__cell.action_type');
    }

    /** "Ref. ID" header cell */
    get tradeTableHeaderRefId(): Locator {
        return this.tradeTableHeader.locator('.table__cell.transaction_id');
    }

    /** "Currency" header cell */
    get tradeTableHeaderCurrency(): Locator {
        return this.tradeTableHeader.locator('.table__cell.currency');
    }

    /** "Buy time" header cell */
    get tradeTableHeaderBuyTime(): Locator {
        return this.tradeTableHeader.locator('.table__cell.purchase_time_unix');
    }

    /** "Stake" header cell */
    get tradeTableHeaderStake(): Locator {
        return this.tradeTableHeader.locator('.table__cell.buy_price');
    }

    /** "Sell time" header cell */
    get tradeTableHeaderSellTime(): Locator {
        return this.tradeTableHeader.locator('.table__cell.sell_time_unix');
    }

    /** "Contract value" header cell */
    get tradeTableHeaderContractValue(): Locator {
        return this.tradeTableHeader.locator('.table__cell.sell_price');
    }

    /** "Total profit/loss" header cell */
    get tradeTableHeaderProfitLoss(): Locator {
        return this.tradeTableHeader.locator('.table__cell.profit_loss');
    }

    /**
     * Mobile Reports route selector — native <select> that switches between
     * Open positions / Trade table / Statement pages.
     * Scoped to the "Open positions" wrapper to avoid matching the second native select
     * (trade type picker) that shares the same id on the same page.
     */
    get reportsRoutePicker(): Locator {
        return this.page.locator('.dc-select-native').filter({ hasText: 'Open positions' }).locator('select');
    }

    /**
     * Mobile Reports selected value display text — scoped to the "Open positions" select group
     * to avoid matching the second native select (trade type picker) on the same page.
     * Source: dc-select-native wrapper containing "Open positions" heading
     */
    get reportsRoutePickerDisplayText(): Locator {
        return this.page
            .locator('.dc-select-native')
            .filter({ hasText: 'Open positions' })
            .getByTestId('selected_value');
    }

    /**
     * Empty state shown in the Open Positions tab when no open positions exist.
     * Source: empty-trade-history > empty-trade-history__text
     */
    get reportsEmptyOpenPositions(): Locator {
        return this.page.locator('.empty-trade-history');
    }

    /**
     * Open positions table header row.
     * Source: open-positions__table > table__head > table__row
     */
    get openPositionsTableHeader(): Locator {
        return this.page.locator('.open-positions__table .table__head .table__row');
    }

    /**
     * First data row in the open positions table — linked to a contract details page.
     * Desktop: a.table__row-link[id^="dt_reports_contract_"]
     * Mobile:  a.data-list__item--wrapper[id^="dt_reports_contract_"]
     * Both share the id prefix — match on id only.
     */
    get openPositionsFirstRow(): Locator {
        return this.page.locator('a[id^="dt_reports_contract_"]').first();
    }

    /**
     * Footer "Total" row in the open positions table.
     * Source: open-positions__table > table__foot > table__row
     */
    get openPositionsFooterRow(): Locator {
        return this.page.locator('.open-positions__table .table__foot .table__row');
    }

    // First row cells
    /** Ref. ID cell on the first open positions row — desktop only (.table__cell.reference). */
    get openPositionsFirstRowRefId(): Locator {
        return this.openPositionsFirstRow.locator('.table__cell.reference');
    }

    /** Ref. ID value on the first open positions card — mobile only (.reference .data-list__row-content). */
    get openPositionsMobFirstRowRefId(): Locator {
        return this.openPositionsFirstRow.locator('.reference .data-list__row-content');
    }

    /** Currency cell on the first open positions row — desktop only. */
    get openPositionsFirstRowCurrency(): Locator {
        return this.openPositionsFirstRow.locator('.table__cell.currency .dc-text');
    }

    /** Currency value on the first open positions card — mobile only. */
    get openPositionsMobFirstRowCurrency(): Locator {
        return this.openPositionsFirstRow.locator('.currency .data-list__row-content .dc-text');
    }

    /** Stake cell on the first open positions row — desktop only. */
    get openPositionsFirstRowStake(): Locator {
        return this.openPositionsFirstRow.locator('.table__cell.purchase [data-testid="dt_span"]');
    }

    /** Stake value on the first open positions card — mobile only. */
    get openPositionsMobFirstRowStake(): Locator {
        return this.openPositionsFirstRow.locator('.purchase .data-list__row-content [data-testid="dt_span"]');
    }

    /** Potential payout cell on the first open positions row — desktop only. */
    get openPositionsFirstRowPayout(): Locator {
        return this.openPositionsFirstRow.locator('.table__cell.payout [data-testid="dt_span"]');
    }

    /** Potential payout value on the first open positions card — mobile only. */
    get openPositionsMobFirstRowPayout(): Locator {
        return this.openPositionsFirstRow.locator('.payout .data-list__row-content [data-testid="dt_span"]');
    }

    /** Total profit/loss cell on the first open positions row — desktop only, live tick value. */
    get openPositionsFirstRowProfitLoss(): Locator {
        return this.openPositionsFirstRow.locator('.table__cell.profit [data-testid="dt_span"]');
    }

    /** Total profit/loss value on the first open positions card — mobile only, live tick value. */
    get openPositionsMobFirstRowProfitLoss(): Locator {
        return this.openPositionsFirstRow.locator('.profit .data-list__row-content [data-testid="dt_span"]');
    }

    /** Contract value cell on the first open positions row — desktop only, live tick value. */
    get openPositionsFirstRowContractValue(): Locator {
        return this.openPositionsFirstRow.locator('.table__cell.indicative [data-testid="dt_span"]');
    }

    /** Contract value on the first open positions card — mobile only, live tick value. */
    get openPositionsMobFirstRowContractValue(): Locator {
        return this.openPositionsFirstRow.locator('.indicative .data-list__row-content [data-testid="dt_span"]');
    }

    /** Remaining time display on the first open positions row — live tick value. */
    get openPositionsFirstRowRemainingTime(): Locator {
        return this.openPositionsFirstRow.locator('.dc-remaining-time');
    }

    /** Progress bar track line on the first open positions row — desktop only. */
    get openPositionsFirstRowProgressBar(): Locator {
        return this.openPositionsFirstRow.locator('.dc-progress-slider__line');
    }

    /** Progress bar fill on the first open positions card — mobile only. */
    get openPositionsMobProgressBar(): Locator {
        return this.openPositionsFirstRow.locator('.dc-progress-bar__bar');
    }

    // Footer cells
    /** "Total" label cell in the footer row. */
    get openPositionsFooterLabel(): Locator {
        return this.openPositionsFooterRow.locator('.table__cell.type');
    }

    /** Stake total in the footer row. */
    get openPositionsFooterStake(): Locator {
        return this.openPositionsFooterRow.locator('.table__cell.purchase [data-testid="dt_span"]');
    }

    /** Potential payout total in the footer row. */
    get openPositionsFooterPayout(): Locator {
        return this.openPositionsFooterRow.locator('.table__cell.payout [data-testid="dt_span"]');
    }

    /** All stake cells across every data row — used to compute the expected footer total. */
    get openPositionsAllRowStakes(): Locator {
        return this.page.locator(
            'a.table__row-link[id^="dt_reports_contract_"] .table__cell.purchase [data-testid="dt_span"]'
        );
    }

    /** All payout cells across every data row — used to compute the expected footer total. */
    get openPositionsAllRowPayouts(): Locator {
        return this.page.locator(
            'a.table__row-link[id^="dt_reports_contract_"] .table__cell.payout [data-testid="dt_span"]'
        );
    }

    /** Total profit/loss in the footer row — desktop only, live tick value. */
    get openPositionsFooterProfitLoss(): Locator {
        return this.openPositionsFooterRow.locator('.table__cell.profit [data-testid="dt_span"]');
    }

    /** Contract value total in the footer row — desktop only, live tick value. */
    get openPositionsFooterContractValue(): Locator {
        return this.openPositionsFooterRow.locator('.table__cell.indicative [data-testid="dt_span"]');
    }

    // Mobile footer (.data-list__footer) — replaces the desktop <table> footer row
    /** Mobile footer wrapper. Source: .data-list__footer.open-positions__data-list-footer */
    get openPositionsMobFooter(): Locator {
        return this.page.locator('.data-list__footer.open-positions__data-list-footer');
    }

    /** Stake total in the mobile footer. */
    get openPositionsMobFooterStake(): Locator {
        return this.openPositionsMobFooter.locator('.purchase .data-list__row-content [data-testid="dt_span"]');
    }

    /** Potential payout total in the mobile footer. */
    get openPositionsMobFooterPayout(): Locator {
        return this.openPositionsMobFooter.locator('.payout .data-list__row-content [data-testid="dt_span"]');
    }

    /** Total profit/loss in the mobile footer — live tick value. */
    get openPositionsMobFooterProfitLoss(): Locator {
        return this.openPositionsMobFooter.locator('.profit .data-list__row-content [data-testid="dt_span"]');
    }

    /** Contract value total in the mobile footer — live tick value. */
    get openPositionsMobFooterContractValue(): Locator {
        return this.openPositionsMobFooter.locator('.indicative .data-list__row-content [data-testid="dt_span"]');
    }

    /**
     * Sell button in the contract value cell of the first open positions row.
     * Source: table__cell.indicative > dc-btn--sell data-testid="dt_contract_card_sell"
     */
    get openPositionsFirstRowSellButton(): Locator {
        return this.openPositionsFirstRow.locator('[data-testid="dt_contract_card_sell"]');
    }

    // Mobile row-title labels (inline divs inside each card — mobile only, no <table> header)
    /** "Ref. ID" inline label inside the first mobile open positions card. */
    get openPositionsMobRowTitleRefId(): Locator {
        return this.openPositionsFirstRow.locator('.reference__row-title');
    }

    /** "Currency" inline label inside the first mobile open positions card. */
    get openPositionsMobRowTitleCurrency(): Locator {
        return this.openPositionsFirstRow.locator('.currency__row-title');
    }

    /** "Stake" inline label inside the first mobile open positions card. */
    get openPositionsMobRowTitleStake(): Locator {
        return this.openPositionsFirstRow.locator('.purchase__row-title');
    }

    /** "Potential payout" inline label inside the first mobile open positions card. */
    get openPositionsMobRowTitlePayout(): Locator {
        return this.openPositionsFirstRow.locator('.payout__row-title');
    }

    /** "Total profit/loss" inline label inside the first mobile open positions card. */
    get openPositionsMobRowTitleProfitLoss(): Locator {
        return this.openPositionsFirstRow.locator('.profit__row-title');
    }

    /** "Contract value" inline label inside the first mobile open positions card. */
    get openPositionsMobRowTitleContractValue(): Locator {
        return this.openPositionsFirstRow.locator('.indicative__row-title');
    }

    // Table header cells
    /** "Type" header cell. */
    get openPositionsHeaderType(): Locator {
        return this.openPositionsTableHeader.locator('.table__cell.type');
    }

    /** "Ref. ID" header cell. */
    get openPositionsHeaderRefId(): Locator {
        return this.openPositionsTableHeader.locator('.table__cell.reference');
    }

    /** "Currency" header cell. */
    get openPositionsHeaderCurrency(): Locator {
        return this.openPositionsTableHeader.locator('.table__cell.currency');
    }

    /** "Stake" header cell. */
    get openPositionsHeaderStake(): Locator {
        return this.openPositionsTableHeader.locator('.table__cell.purchase');
    }

    /** "Potential payout" header cell. */
    get openPositionsHeaderPayout(): Locator {
        return this.openPositionsTableHeader.locator('.table__cell.payout');
    }

    /** "Total profit/loss" header cell. */
    get openPositionsHeaderProfitLoss(): Locator {
        return this.openPositionsTableHeader.locator('.table__cell.profit');
    }

    /** "Contract value" header cell. */
    get openPositionsHeaderContractValue(): Locator {
        return this.openPositionsTableHeader.locator('.table__cell.indicative');
    }

    /** "Remaining time" header cell. */
    get openPositionsHeaderRemainingTime(): Locator {
        return this.openPositionsTableHeader.locator('.table__cell.id');
    }

    // ============================================
    // ACTIONS
    // ============================================

    /**
     * Close the Reports overlay by clicking the header close button.
     */
    async closeReports(): Promise<void> {
        await this.reportsCloseButton.click();
    }

    // ============================================
    // VERIFICATIONS
    // ============================================

    /**
     * Verify the Reports page overlay is open and shows the expected header and navigation.
     * - Desktop: vertical tab nav with Open positions / Trade table / Statement links
     * - Mobile: native <select> dropdown with the same three options
     */
    async verifyReportsPage(): Promise<void> {
        await expect(this.reportsHeaderTitle, 'Reports header title should be "Reports"').toHaveText('Reports');
        await expect(this.reportsCloseButton, 'Reports close button should be visible').toBeVisible();

        if (this.isMobile) {
            await expect(
                this.reportsRoutePickerDisplayText,
                'Mobile route picker should show "Open positions" by default'
            ).toHaveText('Open positions');
            await expect(this.reportsRoutePicker, 'Mobile route picker should have Open positions option').toHaveValue(
                ReportsPage.ROUTE_OPEN_POSITIONS_MOB
            );
        } else {
            await expect(this.reportsOpenPositionsTab, 'Open positions tab should be visible').toBeVisible();
            await expect(this.reportsTradeTableTab, 'Trade table tab should be visible').toBeVisible();
            await expect(this.reportsStatementTab, 'Statement tab should be visible').toBeVisible();
        }
    }

    /**
     * Click the "Open positions" tab in Reports and verify the table is populated.
     * Asserts static values exactly and returns the Ref. ID (buy ID) for use in subsequent steps.
     *
     * Step 1: click Open positions tab
     * Step 2: assert empty-state is NOT visible
     * Step 3: assert table structure — headers, data row values, and footer totals
     *
     * @param currency - Expected currency badge, e.g. "USD"
     * @param stake    - Expected stake amount, e.g. "10.50"
     * @param payout   - Expected potential payout captured from the buy button, e.g. "19.26"
     * @returns        The buy ID (Ref. ID) string from the first row, e.g. "1071479"
     */
    async verifyOpenPositionsInReports(currency: string, stake: string, payout: string): Promise<string> {
        if (this.isMobile) {
            await this.reportsRoutePicker.selectOption(ReportsPage.ROUTE_OPEN_POSITIONS_MOB);
        } else {
            await this.reportsOpenPositionsTab.click();
        }

        await expect(
            this.reportsEmptyOpenPositions,
            'Empty open positions state should not be visible — at least one open position must exist'
        ).not.toBeVisible();
        // ReactVirtualized renders rows with overflow:hidden on the container — use toBeAttached()
        // instead of toBeVisible() since rows outside the virtual scroll viewport are DOM-clipped.
        await expect(
            this.openPositionsFirstRow,
            'At least one open position row should be present in the table'
        ).toBeAttached();

        return this.isMobile
            ? this.verifyOpenPositionsInReportsMobile(currency, stake, payout)
            : this.verifyOpenPositionsInReportsDesktop(currency, stake, payout);
    }

    private async verifyOpenPositionsInReportsMobile(currency: string, stake: string, payout: string): Promise<string> {
        // Column labels — inline row-title divs inside each card
        await expect(this.openPositionsMobRowTitleRefId, 'Row should show "Ref. ID" label').toHaveText('Ref. ID');
        await expect(this.openPositionsMobRowTitleCurrency, 'Row should show "Currency" label').toHaveText('Currency');
        await expect(this.openPositionsMobRowTitleStake, 'Row should show "Stake" label').toHaveText('Stake');
        await expect(this.openPositionsMobRowTitlePayout, 'Row should show "Potential payout" label').toHaveText(
            'Potential payout'
        );
        await expect(this.openPositionsMobRowTitleProfitLoss, 'Row should show "Total profit/loss" label').toHaveText(
            'Total profit/loss'
        );
        await expect(this.openPositionsMobRowTitleContractValue, 'Row should show "Contract value" label').toHaveText(
            'Contract value'
        );

        // Extract buy ID
        const buyId = (await this.openPositionsMobFirstRowRefId.innerText()).trim();

        // Static values
        await expect(this.openPositionsMobFirstRowCurrency, `Currency should be "${currency}"`).toHaveText(currency);
        await expect(this.openPositionsMobFirstRowStake, `Stake should be "${stake}"`).toHaveText(stake);
        await expect(this.openPositionsMobFirstRowPayout, `Potential payout should be "${payout}"`).toHaveText(payout);

        // Live tick values
        await expect(
            this.openPositionsMobFirstRowProfitLoss,
            'Total profit/loss cell should have a value'
        ).not.toBeEmpty();
        await expect(
            this.openPositionsMobFirstRowContractValue,
            'Contract value cell should have a value'
        ).not.toBeEmpty();
        await expect(this.openPositionsFirstRowSellButton, 'Sell button should be visible').toBeVisible();
        await expect(this.openPositionsMobProgressBar, 'Progress bar should be visible').toBeVisible();

        // Footer (.data-list__footer) — no "Total" label, no row-sum verification
        await expect(this.openPositionsMobFooter, 'Mobile footer should be visible').toBeVisible();
        await expect(this.openPositionsMobFooterStake, 'Footer stake should have a value').not.toBeEmpty();
        await expect(this.openPositionsMobFooterPayout, 'Footer potential payout should have a value').not.toBeEmpty();
        await expect(this.openPositionsMobFooterProfitLoss, 'Footer profit/loss should have a value').not.toBeEmpty();
        await expect(
            this.openPositionsMobFooterContractValue,
            'Footer contract value should have a value'
        ).not.toBeEmpty();

        return buyId;
    }

    private async verifyOpenPositionsInReportsDesktop(
        currency: string,
        stake: string,
        payout: string
    ): Promise<string> {
        // Table header columns
        await expect(this.openPositionsHeaderType, 'Table header should show "Type"').toHaveText('Type');
        await expect(this.openPositionsHeaderRefId, 'Table header should show "Ref. ID"').toHaveText('Ref. ID');
        await expect(this.openPositionsHeaderCurrency, 'Table header should show "Currency"').toHaveText('Currency');
        await expect(this.openPositionsHeaderStake, 'Table header should show "Stake"').toHaveText('Stake');
        await expect(this.openPositionsHeaderPayout, 'Table header should show "Potential payout"').toHaveText(
            'Potential payout'
        );
        await expect(this.openPositionsHeaderProfitLoss, 'Table header should show "Total profit/loss"').toHaveText(
            'Total profit/loss'
        );
        await expect(this.openPositionsHeaderContractValue, 'Table header should show "Contract value"').toHaveText(
            'Contract value'
        );
        await expect(this.openPositionsHeaderRemainingTime, 'Table header should show "Remaining time"').toHaveText(
            'Remaining time'
        );

        // Extract buy ID
        const buyId = (await this.openPositionsFirstRowRefId.innerText()).trim();

        // Static values
        await expect(this.openPositionsFirstRowCurrency, `Currency should be "${currency}"`).toHaveText(currency);
        await expect(this.openPositionsFirstRowStake, `Stake should be "${stake}"`).toHaveText(stake);
        await expect(this.openPositionsFirstRowPayout, `Potential payout should be "${payout}"`).toHaveText(payout);

        // Live tick values
        await expect(
            this.openPositionsFirstRowProfitLoss,
            'Total profit/loss cell should have a value'
        ).not.toBeEmpty();
        await expect(
            this.openPositionsFirstRowContractValue,
            'Contract value cell should have a value'
        ).not.toBeEmpty();
        await expect(this.openPositionsFirstRowSellButton, 'Sell button should be visible').toBeVisible();
        await expect(this.openPositionsFirstRowRemainingTime, 'Remaining time should have a value').not.toBeEmpty();
        await expect(this.openPositionsFirstRowProgressBar, 'Progress bar should be visible').toBeVisible();

        // Footer totals — "Total" label + row-sum verification
        await expect(this.openPositionsFooterLabel, 'Footer should show "Total" label').toHaveText('Total');
        const stakeTexts = await this.openPositionsAllRowStakes.allInnerTexts();
        const expectedStakeTotal = stakeTexts.reduce((sum, t) => sum + parseFloat(t.trim()), 0).toFixed(2);
        await expect(
            this.openPositionsFooterStake,
            `Footer stake total should be "${expectedStakeTotal}" (sum of all rows)`
        ).toHaveText(expectedStakeTotal);

        const payoutTexts = await this.openPositionsAllRowPayouts.allInnerTexts();
        const expectedPayoutTotal = payoutTexts.reduce((sum, t) => sum + parseFloat(t.trim()), 0).toFixed(2);
        await expect(
            this.openPositionsFooterPayout,
            `Footer payout total should be "${expectedPayoutTotal}" (sum of all rows)`
        ).toHaveText(expectedPayoutTotal);
        await expect(
            this.openPositionsFooterProfitLoss,
            'Footer profit/loss total should have a value'
        ).not.toBeEmpty();
        await expect(
            this.openPositionsFooterContractValue,
            'Footer contract value total should have a value'
        ).not.toBeEmpty();

        return buyId;
    }

    /**
     * Navigate to the Trade table tab and verify the closed contract row.
     *
     * Verifies:
     * - Open positions tab shows "no open positions" empty state
     * - Trade table headers are correct
     * - First row matches all expected values
     *
     * @param buyId                  - Contract reference ID returned from verifyOpenPositionsInReports
     * @param sellId                 - Sell reference ID from verifyClosedContractDetailsPage (empty string on mobile)
     * @param currency               - Expected currency badge, e.g. "USD"
     * @param stake                  - Expected stake amount, e.g. "10.50"
     * @param buyDate                - Expected buy/sell date string, e.g. "23 Jun 2026"
     * @param contractProfitLossAmount - Raw P&L string from closed positions card, e.g. "+1.26 USD" or "-0.23 USD"
     * @param sellRowBalance         - Account balance after sell settled (balanceAfterClose)
     * @param buyRowBalance          - Account balance after buy settled (balanceBeforeClose)
     */
    async verifyClosedContractInReports(
        buyId: string,
        sellId: string,
        currency: string,
        stake: string,
        buyDate: string,
        contractProfitLossAmount: string,
        sellRowBalance: string,
        buyRowBalance: string
    ): Promise<void> {
        const sign = contractProfitLossAmount.startsWith('-') ? -1 : 1;
        const profitNumeric = contractProfitLossAmount
            .replace(/^[+-]/, '')
            .replace(/\s+[A-Z]+$/, '')
            .trim();
        const contractValue = (parseFloat(stake) + sign * parseFloat(profitNumeric)).toFixed(2);
        // Trade table and Statement display dates as "DD Mon YYYY" (e.g. "24 Jun 2026")
        const displayDate = this.isoToDisplayDate(buyDate);

        if (this.isMobile) {
            await this.verifyClosedContractInReportsMobile(
                buyId,
                sellId,
                currency,
                stake,
                displayDate,
                contractValue,
                profitNumeric,
                sellRowBalance,
                buyRowBalance
            );
        } else {
            await this.verifyClosedContractInReportsDesktop(
                buyId,
                sellId,
                currency,
                stake,
                displayDate,
                contractValue,
                profitNumeric,
                sellRowBalance,
                buyRowBalance
            );
        }
    }

    /**
     * Converts an ISO date string ("YYYY-MM-DD") to the display format used by
     * the Trade table and Statement ("DD Mon YYYY", e.g. "24 Jun 2026").
     */
    private isoToDisplayDate(isoDate: string): string {
        const [year, month, day] = isoDate.split('-').map(Number);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${String(day).padStart(2, '0')} ${months[month - 1]} ${year}`;
    }

    private async verifyClosedContractInReportsMobile(
        buyId: string,
        sellId: string,
        currency: string,
        stake: string,
        buyDate: string,
        contractValue: string,
        profitNumeric: string,
        sellRowBalance: string,
        buyRowBalance: string
    ): Promise<void> {
        // 1. Open positions tab — confirm empty state after contract closed
        await this.reportsRoutePicker.selectOption(ReportsPage.ROUTE_OPEN_POSITIONS_MOB);
        await expect(
            this.reportsEmptyOpenPositions,
            'Open positions tab should show empty state after contract is closed'
        ).toBeVisible();

        // 2. Trade table — find row and verify inline column labels + cell values
        await this.reportsRoutePicker.selectOption(ReportsPage.ROUTE_TRADE_TABLE_MOB);

        const row = this.tradeTableRowByRefId(buyId);
        await expect(row, `Trade table row with Ref. ID "${buyId}" should be attached`).toBeAttached();

        // Inline column labels (mobile card layout — no table header)
        await expect(row.locator('.transaction_id__row-title'), 'Row title should show "Ref. ID"').toHaveText(
            'Ref. ID'
        );
        await expect(row.locator('.currency__row-title'), 'Row title should show "Currency"').toHaveText('Currency');
        await expect(row.locator('.purchase_time_unix__row-title'), 'Row title should show "Buy time"').toHaveText(
            'Buy time'
        );
        await expect(row.locator('.buy_price__row-title'), 'Row title should show "Stake"').toHaveText('Stake');
        await expect(row.locator('.sell_price__row-title'), 'Row title should show "Contract value"').toHaveText(
            'Contract value'
        );
        await expect(row.locator('.profit_loss__row-title'), 'Row title should show "Total profit/loss"').toHaveText(
            'Total profit/loss'
        );

        // Cell values
        await expect(
            row.locator('.currency .data-list__row-content .dc-text'),
            `Currency should be "${currency}"`
        ).toHaveText(currency);
        await expect(
            row.locator('.purchase_time_unix .data-list__row-content span'),
            `Buy time should contain date "${buyDate}"`
        ).toContainText(buyDate);
        await expect(
            row.locator('.buy_price .data-list__row-content [data-testid="dt_span"]'),
            `Stake should be "${stake}"`
        ).toHaveText(stake);
        await expect(
            row.locator('.sell_time_unix .data-list__row-content span'),
            `Sell time should contain date "${buyDate}"`
        ).toContainText(buyDate);
        await expect(
            row.locator('.sell_price .data-list__row-content [data-testid="dt_span"]'),
            `Contract value should be "${contractValue}"`
        ).toHaveText(contractValue);
        await expect(
            row.locator('.profit_loss .data-list__row-content [data-testid="dt_span"]'),
            `Total profit/loss should be "${profitNumeric}"`
        ).toHaveText(profitNumeric);

        // 3. Statement — verify Sell and Buy rows
        await this.reportsRoutePicker.selectOption(ReportsPage.ROUTE_STATEMENT_MOB);

        const sellRow = this.statementSellRow(sellId);
        await expect(sellRow, `Statement Sell row for ref "${sellId}" should be attached`).toBeAttached();
        await expect(sellRow.locator('.refid__row-title'), 'Sell row label should show "Ref. ID"').toHaveText(
            'Ref. ID'
        );
        await expect(sellRow.locator('.currency__row-title'), 'Sell row label should show "Currency"').toHaveText(
            'Currency'
        );
        await expect(
            sellRow.locator('.transaction_time__row-title'),
            'Sell row label should show "Transaction time"'
        ).toHaveText('Transaction time');
        await expect(sellRow.locator('.action_type__row-title'), 'Sell row label should show "Transaction"').toHaveText(
            'Transaction'
        );
        await expect(sellRow.locator('.amount__row-title'), 'Sell row label should show "Credit/Debit"').toHaveText(
            'Credit/Debit'
        );
        await expect(sellRow.locator('.balance__row-title'), 'Sell row label should show "Balance"').toHaveText(
            'Balance'
        );
        await expect(
            sellRow.locator('.refid .dc-popover__target'),
            `Sell row Ref. ID should be "${sellId}"`
        ).toHaveText(sellId);
        await expect(
            sellRow.locator('.action_type .data-list__row-content .dc-label--general--danger'),
            'Sell row action should be "Sell"'
        ).toHaveText('Sell');
        await expect(
            sellRow.locator('.currency .data-list__row-content .dc-text'),
            `Sell row Currency should be "${currency}"`
        ).toHaveText(currency);
        await expect(
            sellRow.locator('.transaction_time .data-list__row-content span'),
            `Sell row Transaction time should contain date "${buyDate}"`
        ).toContainText(buyDate);
        await expect(
            sellRow.locator('.amount .data-list__row-content [data-testid="dt_span"]'),
            `Sell row Credit/Debit should be "${contractValue}"`
        ).toHaveText(contractValue);
        await expect(
            sellRow.locator('.balance .data-list__row-content [data-testid="dt_span"]'),
            `Sell row Balance should be "${sellRowBalance}"`
        ).toHaveText(sellRowBalance);

        // Buy row — identified by buyId
        const buyRow = this.statementBuyRow(buyId);
        await expect(buyRow, `Statement Buy row for ref "${buyId}" should be attached`).toBeAttached();
        await expect(buyRow.locator('.refid__row-title'), 'Buy row label should show "Ref. ID"').toHaveText('Ref. ID');
        await expect(buyRow.locator('.currency__row-title'), 'Buy row label should show "Currency"').toHaveText(
            'Currency'
        );
        await expect(
            buyRow.locator('.transaction_time__row-title'),
            'Buy row label should show "Transaction time"'
        ).toHaveText('Transaction time');
        await expect(buyRow.locator('.action_type__row-title'), 'Buy row label should show "Transaction"').toHaveText(
            'Transaction'
        );
        await expect(buyRow.locator('.amount__row-title'), 'Buy row label should show "Credit/Debit"').toHaveText(
            'Credit/Debit'
        );
        await expect(buyRow.locator('.balance__row-title'), 'Buy row label should show "Balance"').toHaveText(
            'Balance'
        );
        await expect(buyRow.locator('.refid .dc-popover__target'), `Buy row Ref. ID should be "${buyId}"`).toHaveText(
            buyId
        );
        await expect(
            buyRow.locator('.action_type .data-list__row-content .dc-label--general--success'),
            'Buy row action should be "Buy"'
        ).toHaveText('Buy');
        await expect(
            buyRow.locator('.currency .data-list__row-content .dc-text'),
            `Buy row Currency should be "${currency}"`
        ).toHaveText(currency);
        await expect(
            buyRow.locator('.transaction_time .data-list__row-content span'),
            `Buy row Transaction time should contain date "${buyDate}"`
        ).toContainText(buyDate);
        await expect(
            buyRow.locator('.amount .data-list__row-content [data-testid="dt_span"]'),
            `Buy row Credit/Debit should be "${stake}"`
        ).toHaveText(stake);
        await expect(
            buyRow.locator('.balance .data-list__row-content [data-testid="dt_span"]'),
            `Buy row Balance should be "${buyRowBalance}"`
        ).toHaveText(buyRowBalance);
    }

    private async verifyClosedContractInReportsDesktop(
        buyId: string,
        sellId: string,
        currency: string,
        stake: string,
        buyDate: string,
        contractValue: string,
        profitNumeric: string,
        sellRowBalance: string,
        buyRowBalance: string
    ): Promise<void> {
        // 1. Open positions tab — confirm empty state after contract closed
        await this.reportsOpenPositionsTab.click();
        await expect(
            this.reportsEmptyOpenPositions,
            'Open positions tab should show empty state after contract is closed'
        ).toBeVisible();

        // 2. Trade table — verify headers, find row by Ref. ID, verify cell values
        await this.reportsTradeTableTab.click();

        await expect(this.tradeTableHeaderType, 'Trade table header should show "Type"').toHaveText('Type');
        await expect(this.tradeTableHeaderRefId, 'Trade table header should show "Ref. ID"').toHaveText('Ref. ID');
        await expect(this.tradeTableHeaderCurrency, 'Trade table header should show "Currency"').toHaveText('Currency');
        await expect(this.tradeTableHeaderBuyTime, 'Trade table header should show "Buy time"').toHaveText('Buy time');
        await expect(this.tradeTableHeaderStake, 'Trade table header should show "Stake"').toHaveText('Stake');
        await expect(this.tradeTableHeaderSellTime, 'Trade table header should show "Sell time"').toHaveText(
            'Sell time'
        );
        await expect(this.tradeTableHeaderContractValue, 'Trade table header should show "Contract value"').toHaveText(
            'Contract value'
        );
        await expect(this.tradeTableHeaderProfitLoss, 'Trade table header should show "Total profit/loss"').toHaveText(
            'Total profit/loss'
        );

        const row = this.tradeTableRowByRefId(buyId);
        await expect(row, `Trade table row with Ref. ID "${buyId}" should be visible`).toBeVisible();

        await expect(row.locator('.table__cell.currency .dc-text'), `Currency should be "${currency}"`).toHaveText(
            currency
        );
        await expect(
            row.locator('.table__cell.purchase_time_unix span'),
            `Buy time should contain date "${buyDate}"`
        ).toContainText(buyDate);
        await expect(
            row.locator('.table__cell.buy_price [data-testid="dt_span"]'),
            `Stake should be "${stake}"`
        ).toHaveText(stake);
        await expect(
            row.locator('.table__cell.sell_time_unix span'),
            `Sell time should contain date "${buyDate}"`
        ).toContainText(buyDate);
        await expect(
            row.locator('.table__cell.sell_price [data-testid="dt_span"]'),
            `Contract value should be "${contractValue}"`
        ).toHaveText(contractValue);
        await expect(
            row.locator('.table__cell.profit_loss [data-testid="dt_span"]'),
            `Total profit/loss should be "${profitNumeric}"`
        ).toHaveText(profitNumeric);

        // 3. Statement — verify headers, then Sell and Buy rows
        await this.reportsStatementTab.click();

        await expect(this.statementHeaderType, 'Statement header should show "Type"').toHaveText('Type');
        await expect(this.statementHeaderRefId, 'Statement header should show "Ref. ID"').toHaveText('Ref. ID');
        await expect(this.statementHeaderCurrency, 'Statement header should show "Currency"').toHaveText('Currency');
        await expect(this.statementHeaderTransactionTime, 'Statement header should show "Transaction time"').toHaveText(
            'Transaction time'
        );
        await expect(this.statementHeaderAction, 'Statement header should show "Transaction"').toHaveText(
            'Transaction'
        );
        await expect(this.statementHeaderAmount, 'Statement header should show "Credit/Debit"').toHaveText(
            'Credit/Debit'
        );
        await expect(this.statementHeaderBalance, 'Statement header should show "Balance"').toHaveText('Balance');

        const sellRow = sellId ? this.statementSellRow(sellId) : this.statementSellRow(buyId);
        const sellRowLabel = sellId || buyId;
        await expect(sellRow, `Statement Sell row for ref "${sellRowLabel}" should be visible`).toBeVisible();
        await expect(
            sellRow.locator('.table__cell.currency .dc-text'),
            `Sell row Currency should be "${currency}"`
        ).toHaveText(currency);
        await expect(
            sellRow.locator('.table__cell.transaction_time span'),
            `Sell row Transaction time should contain date "${buyDate}"`
        ).toContainText(buyDate);
        await expect(
            sellRow.locator('.table__cell.action_type .dc-label--general--danger'),
            'Sell row action type should be "Sell"'
        ).toHaveText('Sell');
        await expect(
            sellRow.locator('.table__cell.amount [data-testid="dt_span"]'),
            `Sell row Credit/Debit should be "${contractValue}"`
        ).toHaveText(contractValue);
        await expect(
            sellRow.locator('.table__cell.balance [data-testid="dt_span"]'),
            `Sell row Balance should be "${sellRowBalance}"`
        ).toHaveText(sellRowBalance);

        const buyRow = this.statementBuyRow(buyId);
        await expect(buyRow, `Statement Buy row for contract "${buyId}" should be visible`).toBeVisible();
        await expect(
            buyRow.locator('.table__cell.currency .dc-text'),
            `Buy row Currency should be "${currency}"`
        ).toHaveText(currency);
        await expect(
            buyRow.locator('.table__cell.transaction_time span'),
            `Buy row Transaction time should contain date "${buyDate}"`
        ).toContainText(buyDate);
        await expect(
            buyRow.locator('.table__cell.action_type .dc-label--general--success'),
            'Buy row action type should be "Buy"'
        ).toHaveText('Buy');
        await expect(
            buyRow.locator('.table__cell.amount [data-testid="dt_span"]'),
            `Buy row Credit/Debit should be "${stake}"`
        ).toHaveText(stake);
        await expect(
            buyRow.locator('.table__cell.balance [data-testid="dt_span"]'),
            `Buy row Balance should be "${buyRowBalance}"`
        ).toHaveText(buyRowBalance);
    }
}
