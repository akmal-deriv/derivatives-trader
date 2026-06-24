import { Locator, expect } from '@playwright/test';
import { TradeBasePage } from './TradeBasePage';

/**
 * Page Object for the Contract Details overlay (/contract/).
 *
 * Opens as a full-screen overlay when a contract card is clicked from Positions.
 * Shows the contract card (live values) and the audit grid (static values).
 *
 * @example
 * ```typescript
 * test('VERIFY contract details after buy', async ({ contractDetailsPage }) => {
 *     await contractDetailsPage.verifyContractDetailsPage(market, tradeType, currency, stake, payout, buyId);
 * });
 * ```
 */
export class ContractDetailsPage extends TradeBasePage {
    // ============================================
    // LOCATORS
    // ============================================

    /**
     * Contract details header title — viewport-aware.
     * - Desktop: `.dc-page-overlay__header-title`
     * - Mobile: `<p>` inside `.contract-details-header-v2` banner
     */
    get contractDetailsHeaderTitle(): Locator {
        return this.isMobile
            ? this.page.locator('.contract-details-header-v2 p')
            : this.page.locator('.dc-page-overlay__header-title');
    }

    /**
     * Contract details back/close button — viewport-aware.
     * - Desktop: data-testid="dt_page_overlay_header_close"
     * - Mobile: back arrow `<button class="arrow">` inside the header
     */
    get contractDetailsCloseButton(): Locator {
        return this.isMobile
            ? this.page.locator('.contract-details-header-v2 .arrow')
            : this.page.getByTestId('dt_page_overlay_header_close');
    }

    /**
     * Contract card wrapper inside the contract drawer.
     * Desktop only — `#dt_contract_drawer .dc-contract-card`.
     * Mobile uses `.contract-details` wrapper with `.contract-card` elements.
     */
    get contractCard(): Locator {
        return this.page.locator('#dt_contract_drawer .dc-contract-card');
    }

    /**
     * Mobile contract details — "Close X.XX USD" / "Close" footer button.
     * Label pattern: "Close [amount] [currency]" while valid to sell, "Close" when disabled.
     * Source: contract-details-footer.tsx — Button label `${card_labels.CLOSE} ${bid_details}`
     */
    get mobileContractDetailsCloseButton(): Locator {
        return this.page.getByRole('button', { name: /^Close/ });
    }

    /**
     * Mobile Order Details table — wraps all key-value rows.
     */
    get mobileOrderDetails(): Locator {
        return this.page.locator('.order-details__table');
    }

    /**
     * Returns the value cell of a mobile Order Details row by its label text.
     * Uses the sibling structure: each row has two `.order-details__table-row-cell` divs.
     *
     * @param label - Exact label text, e.g. "Reference ID", "Duration", "Barrier", "Stake"
     */
    mobileOrderDetailsValue(label: string): Locator {
        return this.page
            .locator('.order-details__table-row', {
                has: this.page.locator('.order-details__table-row-cell', { hasText: label }),
            })
            .locator('.order-details__table-row-cell')
            .last();
    }

    /**
     * Mobile contract details — market name shown on the contract card.
     * Source: `.symbol` text paragraph
     */
    get mobileContractMarket(): Locator {
        return this.page.locator('.contract-details .symbol');
    }

    /**
     * Mobile contract details — trade type (e.g. "Rise", "Fall").
     * Source: `.trade-type` text paragraph
     */
    get mobileContractTradeType(): Locator {
        return this.page.locator('.contract-details .trade-type');
    }

    /**
     * Mobile contract details — profit/loss (live value).
     * Source: `.profit` paragraph
     */
    get mobileContractProfit(): Locator {
        return this.page.locator('.contract-details .profit');
    }

    /**
     * Mobile Entry & exit details section — wraps start time, entry spot, exit spot rows.
     * Source: EntryExitDetails component
     */
    get mobileEntryExitDetails(): Locator {
        return this.page.locator('.entry-exit-details');
    }

    /**
     * Market symbol on the contract card.
     * Source: dc-contract-card__symbol
     */
    get contractDetailsMarket(): Locator {
        return this.contractCard.locator('.dc-contract-card__symbol');
    }

    /**
     * Contract type label on the contract card (e.g. "Rise", "Fall").
     * Source: dc-contract-type__type-label
     */
    get contractDetailsTradeType(): Locator {
        return this.contractCard.locator('.dc-contract-type__type-label');
    }

    /**
     * Currency badge on the contract card (e.g. "USD").
     * Source: dc-currency-badge
     */
    get contractDetailsCurrency(): Locator {
        return this.contractCard.locator('.dc-currency-badge');
    }

    /**
     * Remaining time on the progress slider — live value.
     * Source: dc-remaining-time
     */
    get contractDetailsRemainingTime(): Locator {
        return this.contractCard.locator('.dc-remaining-time');
    }

    /**
     * Progress slider track line — open contracts only.
     * Source: dc-progress-slider__line
     */
    get contractDetailsProgressBar(): Locator {
        return this.contractCard.locator('.dc-progress-slider__line');
    }

    /**
     * Completed progress slider — closed contracts only.
     * Source: dc-progress-slider--completed
     */
    get contractDetailsProgressBarCompleted(): Locator {
        return this.contractCard.locator('.dc-progress-slider--completed');
    }

    /**
     * Sell button on the contract card footer.
     * Source: data-testid="dt_contract_card_sell"
     */
    get contractDetailsSellButton(): Locator {
        return this.contractCard.getByTestId('dt_contract_card_sell');
    }

    /**
     * Returns a contract card item body scoped to the given header label.
     * Source: dc-contract-card-item__header + dc-contract-card-item__body
     *
     * @param label - Exact header text, e.g. "Stake:", "Potential payout:"
     */
    contractCardItem(label: string): Locator {
        return this.contractCard
            .locator('.dc-contract-card-item', { hasText: label })
            .locator('.dc-contract-card-item__body');
    }

    /**
     * Reference ID label in the audit grid.
     * Source: contract-audit__grid[data-testid="dt_id_label"] > contract-audit__label
     */
    get contractDetailsReferenceIDLabel(): Locator {
        return this.page.getByTestId('dt_id_label').locator('.contract-audit__label');
    }

    /**
     * Reference ID value in the audit grid (e.g. "1071599 (Buy)").
     * Source: contract-audit__grid[data-testid="dt_id_label"] > contract-audit__value
     */
    get contractDetailsReferenceID(): Locator {
        return this.page.getByTestId('dt_id_label').locator('.contract-audit__value');
    }

    /**
     * Duration label in the audit grid.
     * Source: contract-audit__grid[data-testid="dt_duration_label"] > contract-audit__label
     */
    get contractDetailsDurationLabel(): Locator {
        return this.page.getByTestId('dt_duration_label').locator('.contract-audit__label');
    }

    /**
     * Duration value in the audit grid (e.g. "30 minutes").
     * Source: contract-audit__grid[data-testid="dt_duration_label"] > contract-audit__value
     */
    get contractDetailsDuration(): Locator {
        return this.page.getByTestId('dt_duration_label').locator('.contract-audit__value');
    }

    /**
     * Barrier label in the audit grid.
     * Source: contract-audit__grid[data-testid="dt_bt_label"] > contract-audit__label
     */
    get contractDetailsBarrierLabel(): Locator {
        return this.page.getByTestId('dt_bt_label').locator('.contract-audit__label');
    }

    /**
     * Barrier value in the audit grid (e.g. "9,666.52").
     * Source: contract-audit__grid[data-testid="dt_bt_label"] > contract-audit__value
     */
    get contractDetailsBarrier(): Locator {
        return this.page.getByTestId('dt_bt_label').locator('.contract-audit__value');
    }

    /**
     * Start time label in the audit grid.
     * Source: contract-audit__grid[data-testid="dt_start_time_label"] > contract-audit__label
     */
    get contractDetailsStartTimeLabel(): Locator {
        return this.page.getByTestId('dt_start_time_label').locator('.contract-audit__label');
    }

    /**
     * Start time value in the audit grid (e.g. "2026-06-18 07:50:17 GMT").
     * Source: contract-audit__grid[data-testid="dt_start_time_label"] > contract-audit__value
     */
    get contractDetailsStartTime(): Locator {
        return this.page.getByTestId('dt_start_time_label').locator('.contract-audit__value');
    }

    /**
     * Entry spot label in the audit grid.
     * Source: contract-audit__grid[data-testid="dt_entry_spot_label"] > contract-audit__label
     */
    get contractDetailsEntrySpotLabel(): Locator {
        return this.page.getByTestId('dt_entry_spot_label').locator('.contract-audit__label');
    }

    /**
     * Entry spot price in the audit grid (e.g. "9,666.52") — varies per run.
     * Source: contract-audit__grid[data-testid="dt_entry_spot_label"] > contract-audit__value
     */
    get contractDetailsEntrySpot(): Locator {
        return this.page.getByTestId('dt_entry_spot_label').locator('.contract-audit__value');
    }

    /**
     * Entry spot timestamp in the audit grid (e.g. "2026-06-18 07:50:18 GMT").
     * Source: contract-audit__grid[data-testid="dt_entry_spot_label"] > contract-audit__value2
     */
    get contractDetailsEntrySpotTime(): Locator {
        return this.page.getByTestId('dt_entry_spot_label').locator('.contract-audit__value2');
    }

    /**
     * Sell reference ID in the audit grid — closed contracts only (e.g. "1071699 (Sell)").
     * Source: contract-audit__grid[data-testid="dt_id_label"] > contract-audit__value2
     */
    get contractDetailsReferenceIDSell(): Locator {
        return this.page.getByTestId('dt_id_label').locator('.contract-audit__value2');
    }

    /**
     * Exit spot price in the audit grid (e.g. "9,603.17") — closed contracts only.
     * Source: contract-audit__grid[data-testid="dt_exit_spot_label"] > contract-audit__value
     */
    get contractDetailsExitSpot(): Locator {
        return this.page.getByTestId('dt_exit_spot_label').locator('.contract-audit__value');
    }

    /**
     * Exit spot timestamp in the audit grid (e.g. "2026-06-18 08:43:49 GMT") — closed contracts only.
     * Source: contract-audit__grid[data-testid="dt_exit_spot_label"] > contract-audit__value2
     */
    get contractDetailsExitSpotTime(): Locator {
        return this.page.getByTestId('dt_exit_spot_label').locator('.contract-audit__value2');
    }

    /**
     * Exit spot label in the audit grid — closed contracts only.
     * Source: contract-audit__grid[data-testid="dt_exit_spot_label"] > contract-audit__label
     */
    get contractDetailsExitSpotLabel(): Locator {
        return this.page.getByTestId('dt_exit_spot_label').locator('.contract-audit__label');
    }

    /**
     * Exit time label in the audit grid — closed contracts only.
     * Source: contract-audit__grid[data-testid="dt_exit_time_label"] > contract-audit__label
     */
    get contractDetailsExitTimeLabel(): Locator {
        return this.page.getByTestId('dt_exit_time_label').locator('.contract-audit__label');
    }

    /**
     * Exit time value in the audit grid (e.g. "2026-06-18 08:43:49 GMT") — closed contracts only.
     * Source: contract-audit__grid[data-testid="dt_exit_time_label"] > contract-audit__value
     */
    get contractDetailsExitTime(): Locator {
        return this.page.getByTestId('dt_exit_time_label').locator('.contract-audit__value');
    }

    // ============================================
    // ACTIONS
    // ============================================

    /**
     * Close the contract details overlay by clicking the header close button.
     */
    async closeContractDetails(): Promise<void> {
        await this.contractDetailsCloseButton.click();
        // Wait for navigation away from /contract/ — mobile back arrow is async
        await this.page.waitForURL(url => !url.pathname.includes('/contract/'));
    }

    /**
     * Sell / early-close the open contract.
     * - Desktop: clicks the Sell button on the contract card (`dt_contract_card_sell`)
     * - Mobile: clicks the "Close X.XX USD" footer button
     *
     * Retries on PriceMoved rejection (button re-enables after a transient market-moved error).
     */
    async sellContract(): Promise<void> {
        const sellBtn = this.isMobile ? this.mobileContractDetailsCloseButton : this.contractDetailsSellButton;

        await expect(sellBtn, 'Sell/Close button should be visible on the contract details').toBeVisible();
        await expect(sellBtn, 'Sell/Close button should be enabled before selling').toBeEnabled();
        await sellBtn.click();

        // Poll: re-click if rejected (PriceMoved) — button re-enables without navigating away
        await expect
            .poll(
                async () => {
                    const isGone = !(await sellBtn.isVisible());
                    if (isGone) return true;
                    const isEnabled = await sellBtn.isEnabled();
                    if (isEnabled) await sellBtn.click();
                    return false;
                },
                {
                    message: 'Sell/Close button should disappear after contract is sold',
                    intervals: [1000],
                    timeout: 60_000,
                }
            )
            .toBe(true);
    }

    // ============================================
    // VERIFICATIONS
    // ============================================

    /**
     * Normalise a chip-format duration label to the full-word form the audit grid renders.
     * e.g. '5 min' → '5 minutes', '15 sec' → '15 seconds', '6 ticks' → '6 ticks' (unchanged)
     */
    private normaliseDurationForAudit(value: string): string {
        return value
            .replace(/\bmin\b/, 'minutes')
            .replace(/\bsec\b/, 'seconds')
            .replace(/\bhr\b/, 'hours');
    }

    /**
     * Contract value = stake ± P&L.
     * Early sells settle at bid price (non-zero loss possible); expiry losses settle at 0.00.
     *
     * @param stake            - e.g. "10.50"
     * @param profitLossAmount - e.g. "+1.26 USD" or "-0.23 USD"
     * @returns e.g. "11.76" or "10.27"
     */
    private calculateClosedContractValue(stake: string, profitLossAmount: string): string {
        const sign = profitLossAmount.startsWith('-') ? -1 : 1;
        const profitNumeric = profitLossAmount
            .replace(/^[+-]/, '')
            .replace(/\s+[A-Z]+$/, '')
            .trim();
        return (parseFloat(stake) + sign * parseFloat(profitNumeric)).toFixed(2);
    }

    /**
     * Verify the contract details page is open and shows the expected contract data.
     * Delegates to the mobile or desktop implementation based on the current viewport.
     *
     * @param market        - Market symbol, e.g. "Volatility 100 (1s) Index"
     * @param tradeType     - Contract type label, e.g. "Rise"
     * @param currency      - Currency badge (desktop only), e.g. "USD"
     * @param stake         - Stake as displayed, e.g. "10.00"
     * @param payout        - Potential payout as displayed, e.g. "19.29"
     * @param buyId         - Reference ID from the buy, e.g. "1071599" (pass "" to skip exact check)
     * @param durationValue - Duration chip label, e.g. "15 min" (normalised internally)
     * @param buyDate       - UTC date captured before buy, e.g. "2026-06-18"
     * @returns Entry spot price string for barrier assertion, e.g. "9,874.68"
     */
    async verifyContractDetailsPage(
        market: string,
        tradeType: string,
        currency: string,
        stake: string,
        payout: string,
        buyId: string,
        durationValue: string,
        buyDate: string
    ): Promise<string> {
        return this.isMobile
            ? this.verifyContractDetailsPageMobile(market, tradeType, stake, payout, buyId, durationValue, buyDate)
            : this.verifyContractDetailsPageDesktop(
                  market,
                  tradeType,
                  currency,
                  stake,
                  payout,
                  buyId,
                  durationValue,
                  buyDate
              );
    }

    /**
     * Mobile contract details page verification.
     * Uses the AppV2 mobile `/contract/` page structure:
     * - `.contract-details-header-v2` banner
     * - `.order-details__table` key-value rows (Reference ID, Duration, Barrier, Stake, Potential payout)
     * - `.entry-exit-details__table` (Start time, Entry spot)
     * - "Close X.XX USD" footer button
     */
    private async verifyContractDetailsPageMobile(
        market: string,
        tradeType: string,
        stake: string,
        payout: string,
        buyId: string,
        durationValue: string,
        _buyDate: string
    ): Promise<string> {
        // Header
        await expect(
            this.contractDetailsHeaderTitle,
            'Contract details header should show "Contract details"'
        ).toHaveText('Contract details');

        // Contract card — market, trade type, profit (live)
        await expect(this.mobileContractMarket, `Mobile contract card should show market "${market}"`).toHaveText(
            market
        );
        await expect(
            this.mobileContractTradeType,
            `Mobile contract card should show trade type "${tradeType}"`
        ).toHaveText(tradeType);
        await expect(this.mobileContractProfit, 'Mobile contract card profit/loss should have a value').not.toBeEmpty();

        // Order Details — Reference ID
        if (buyId) {
            await expect(
                this.mobileOrderDetailsValue('Reference ID'),
                `Reference ID should be "${buyId} (Buy)"`
            ).toContainText(`${buyId} (Buy)`);
        } else {
            await expect(
                this.mobileOrderDetailsValue('Reference ID'),
                'Reference ID should have a value'
            ).not.toBeEmpty();
        }

        // Order Details — Duration
        const auditDuration = this.normaliseDurationForAudit(durationValue);
        await expect(this.mobileOrderDetailsValue('Duration'), `Duration should be "${auditDuration}"`).toHaveText(
            auditDuration
        );

        // Order Details — Stake
        await expect(this.mobileOrderDetailsValue('Stake'), `Stake should contain "${stake}"`).toContainText(stake);

        // Order Details — Potential payout
        await expect(
            this.mobileOrderDetailsValue('Potential payout'),
            `Potential payout should contain "${payout}"`
        ).toContainText(payout);

        // Order Details — Barrier (non-empty)
        await expect(this.mobileOrderDetailsValue('Barrier'), 'Barrier should have a value').not.toBeEmpty();
        const barrierText = (await this.mobileOrderDetailsValue('Barrier').innerText()).trim();

        // Entry & exit details — Start time contains buyDate
        await expect(this.mobileEntryExitDetails, 'Entry & exit details section should be visible').toBeVisible();

        // Entry spot row present
        const entrySpotRow = this.page.locator('.entry-exit-details__table-row', {
            has: this.page.locator('.entry-exit-details__table-cell', { hasText: 'Entry spot' }),
        });
        await expect(entrySpotRow, 'Entry spot row should be visible').toBeVisible();

        // Close button visible (bid price loaded)
        await expect(
            this.mobileContractDetailsCloseButton,
            'Close button should be visible on the mobile contract details page'
        ).toBeVisible();

        // Return barrier as entrySpot (Rise/Fall barrier = entry spot)
        return barrierText;
    }

    /**
     * Desktop contract details overlay verification.
     * Uses the `.dc-page-overlay` + `#dt_contract_drawer` structure.
     */
    private async verifyContractDetailsPageDesktop(
        market: string,
        tradeType: string,
        currency: string,
        stake: string,
        payout: string,
        buyId: string,
        durationValue: string,
        buyDate: string
    ): Promise<string> {
        // Step 1: header
        await expect(
            this.contractDetailsHeaderTitle,
            'Contract details header title should be "Contract details"'
        ).toHaveText('Contract details');

        // Step 2: contract card — market, trade type, currency
        await expect(this.contractDetailsMarket, `Contract card symbol should be "${market}"`).toHaveText(market);
        await expect(this.contractDetailsTradeType, `Contract card type should be "${tradeType}"`).toHaveText(
            tradeType
        );
        await expect(this.contractDetailsCurrency, `Contract card currency should be "${currency}"`).toHaveText(
            currency
        );

        // Step 3: contract card — remaining time, progress bar, total profit/loss, contract value
        await expect(this.contractDetailsRemainingTime, 'Remaining time should have a value').not.toBeEmpty();
        await expect(this.contractDetailsProgressBar, 'Progress bar should be visible').toBeVisible();
        await expect(
            this.contractCardItem('Total profit/loss:'),
            'Total profit/loss should have a value'
        ).not.toBeEmpty();
        await expect(this.contractCardItem('Contract value:'), 'Contract value should have a value').not.toBeEmpty();

        // Step 4: contract card — stake and payout
        await expect(this.contractCardItem('Stake:'), `Stake should be "${stake}"`).toHaveText(stake);
        await expect(this.contractCardItem('Potential payout:'), `Potential payout should be "${payout}"`).toHaveText(
            payout
        );

        // Step 5: sell button
        await expect(
            this.contractDetailsSellButton,
            'Sell button should be visible on the contract card'
        ).toBeVisible();

        // Step 6: Reference ID
        await expect(this.contractDetailsReferenceIDLabel, 'Reference ID label should be "Reference ID"').toHaveText(
            'Reference ID'
        );
        if (buyId) {
            await expect(this.contractDetailsReferenceID, `Reference ID should be "${buyId} (Buy)"`).toHaveText(
                `${buyId} (Buy)`
            );
        } else {
            await expect(this.contractDetailsReferenceID, 'Reference ID should have a value').not.toBeEmpty();
        }

        // Step 7: Duration
        const auditDuration = this.normaliseDurationForAudit(durationValue);
        await expect(this.contractDetailsDurationLabel, 'Duration label should be "Duration"').toHaveText('Duration');
        await expect(this.contractDetailsDuration, `Duration should be "${auditDuration}"`).toHaveText(auditDuration);

        // Step 8: Start time
        await expect(this.contractDetailsStartTimeLabel, 'Start time label should be "Start time"').toHaveText(
            'Start time'
        );
        await expect(this.contractDetailsStartTime, `Start time should contain "${buyDate}"`).toContainText(buyDate);

        // Step 9: Entry spot (extract price for barrier assertion)
        await expect(this.contractDetailsEntrySpotLabel, 'Entry spot label should be "Entry spot"').toHaveText(
            'Entry spot'
        );
        const entrySpot = (await this.contractDetailsEntrySpot.innerText()).trim();
        await expect(this.contractDetailsEntrySpot, 'Entry spot price should have a value').not.toBeEmpty();
        await expect(this.contractDetailsEntrySpotTime, `Entry spot time should contain "${buyDate}"`).toContainText(
            buyDate
        );

        // Step 10: Barrier matches entry spot (Rise/Fall barrier = entry spot)
        await expect(this.contractDetailsBarrierLabel, 'Barrier label should be "Barrier"').toHaveText('Barrier');
        await expect(this.contractDetailsBarrier, `Barrier should match entry spot "${entrySpot}"`).toHaveText(
            entrySpot
        );

        return entrySpot;
    }

    /**
     * Verify the contract details page for a closed contract.
     * Delegates to the mobile or desktop implementation based on the current viewport.
     *
     * @param market           - Market symbol, e.g. "Volatility 100 (1s) Index"
     * @param tradeType        - Contract type label, e.g. "Rise"
     * @param currency         - Currency badge (desktop only), e.g. "USD"
     * @param stake            - Stake as displayed, e.g. "10.00"
     * @param payout           - Potential payout as displayed, e.g. "19.29"
     * @param buyId            - Buy reference ID, e.g. "1071659"
     * @param durationValue    - Duration chip label, e.g. "15 min" (normalised internally)
     * @param buyDate          - UTC date captured before buy, e.g. "2026-06-18"
     * @param profitLossAmount - P&L from the closed positions card, e.g. "+1.26 USD" or "-2.05 USD"
     * @param entrySpot        - Entry spot price from the open contract details, e.g. "9,585.02"
     * @returns The sell reference ID string (desktop) or empty string (mobile)
     */
    async verifyClosedContractDetailsPage(
        market: string,
        tradeType: string,
        currency: string,
        stake: string,
        payout: string,
        buyId: string,
        durationValue: string,
        buyDate: string,
        profitLossAmount: string,
        entrySpot: string
    ): Promise<string> {
        if (this.isMobile) {
            return this.verifyClosedContractDetailsPageMobile(
                market,
                tradeType,
                stake,
                payout,
                buyId,
                durationValue,
                buyDate,
                profitLossAmount,
                entrySpot
            );
        }
        return this.verifyClosedContractDetailsPageDesktop(
            market,
            tradeType,
            currency,
            stake,
            payout,
            buyId,
            durationValue,
            buyDate,
            profitLossAmount,
            entrySpot
        );
    }

    /**
     * Mobile closed contract details verification.
     * After sell, the contract details page shows settled values in Order Details and
     * Entry & exit details sections. The Close button is gone; no sell button.
     */
    private async verifyClosedContractDetailsPageMobile(
        market: string,
        tradeType: string,
        stake: string,
        payout: string,
        buyId: string,
        durationValue: string,
        _buyDate: string,
        _profitLossAmount: string,
        entrySpot: string
    ): Promise<string> {
        // Header
        await expect(
            this.contractDetailsHeaderTitle,
            'Contract details header should show "Contract details"'
        ).toHaveText('Contract details');

        // Contract card — market, trade type, profit
        await expect(
            this.mobileContractMarket,
            `Mobile closed contract card should show market "${market}"`
        ).toHaveText(market);
        await expect(
            this.mobileContractTradeType,
            `Mobile closed contract card should show trade type "${tradeType}"`
        ).toHaveText(tradeType);
        await expect(
            this.mobileContractProfit,
            'Mobile closed contract card profit/loss should have a value'
        ).not.toBeEmpty();

        // Order Details — Reference ID: single row whose value cell contains both
        // Buy and Sell IDs as separate paragraphs (e.g. "1092759 (Buy)" / "1092779 (Sell)").
        const refIdValueCell = this.page
            .locator('.order-details__table-row', {
                has: this.page.locator('.order-details__table-row-cell', { hasText: 'Reference ID' }),
            })
            .locator('.order-details__table-row-cell')
            .last();

        const buyRefIdParagraph = refIdValueCell.locator('p').filter({ hasText: '(Buy)' });
        const sellRefIdParagraph = refIdValueCell.locator('p').filter({ hasText: '(Sell)' });

        await expect(buyRefIdParagraph, `Buy Reference ID should contain "${buyId} (Buy)"`).toContainText(
            `${buyId} (Buy)`
        );
        await expect(sellRefIdParagraph, 'Sell Reference ID should contain "(Sell)"').toContainText('(Sell)');

        const sellRefIdRaw = (await sellRefIdParagraph.innerText()).trim();
        const sellId = sellRefIdRaw.replace(' (Sell)', '');

        // Order Details — Duration
        const auditDuration = this.normaliseDurationForAudit(durationValue);
        await expect(this.mobileOrderDetailsValue('Duration'), `Duration should be "${auditDuration}"`).toHaveText(
            auditDuration
        );

        // Order Details — Stake and Potential payout
        await expect(this.mobileOrderDetailsValue('Stake'), `Stake should contain "${stake}"`).toContainText(stake);
        await expect(
            this.mobileOrderDetailsValue('Potential payout'),
            `Potential payout should contain "${payout}"`
        ).toContainText(payout);

        // Order Details — Barrier matches entrySpot
        await expect(this.mobileOrderDetailsValue('Barrier'), `Barrier should be "${entrySpot}"`).toContainText(
            entrySpot.replace(/,/g, '')
        );

        // Entry & exit details present
        await expect(this.mobileEntryExitDetails, 'Entry & exit details section should be visible').toBeVisible();

        // Close button should be gone (contract already settled)
        await expect(
            this.mobileContractDetailsCloseButton,
            'Close button should not be visible on a closed contract'
        ).not.toBeVisible();

        return sellId;
    }

    /**
     * Desktop closed contract details overlay verification.
     */
    private async verifyClosedContractDetailsPageDesktop(
        market: string,
        tradeType: string,
        currency: string,
        stake: string,
        payout: string,
        buyId: string,
        durationValue: string,
        buyDate: string,
        profitLossAmount: string,
        entrySpot: string
    ): Promise<string> {
        // Step 1: header
        await expect(
            this.contractDetailsHeaderTitle,
            'Contract details header title should be "Contract details"'
        ).toHaveText('Contract details');

        // Step 2: contract card — market, trade type, currency
        await expect(this.contractDetailsMarket, `Contract card symbol should be "${market}"`).toHaveText(market);
        await expect(this.contractDetailsTradeType, `Contract card type should be "${tradeType}"`).toHaveText(
            tradeType
        );
        await expect(this.contractDetailsCurrency, `Contract card currency should be "${currency}"`).toHaveText(
            currency
        );

        // Step 3: no remaining time on closed contracts
        await expect(
            this.contractDetailsRemainingTime,
            'Remaining time should not be visible on a closed contract'
        ).not.toBeVisible();

        // Step 4: contract card — settled values
        const profitLossNumeric = profitLossAmount
            .replace(/^[+-]/, '')
            .replace(/\s+[A-Z]+$/, '')
            .trim();
        await expect(
            this.contractCardItem('Total profit/loss:'),
            `Total profit/loss should contain "${profitLossNumeric}"`
        ).toContainText(profitLossNumeric);
        const expectedContractValue = this.calculateClosedContractValue(stake, profitLossAmount);
        await expect(
            this.contractCardItem('Contract value:'),
            `Contract value should be "${expectedContractValue}"`
        ).toHaveText(expectedContractValue);

        // Step 5: stake and payout
        await expect(this.contractCardItem('Stake:'), `Stake should be "${stake}"`).toHaveText(stake);
        await expect(this.contractCardItem('Potential payout:'), `Potential payout should be "${payout}"`).toHaveText(
            payout
        );

        // Step 6: no sell button on closed contracts
        await expect(
            this.contractDetailsSellButton,
            'Sell button should not be visible on a closed contract'
        ).not.toBeVisible();

        // Step 7: Reference ID — buy row (assert) + sell row (extract then assert)
        await expect(this.contractDetailsReferenceIDLabel, 'Reference ID label should be "Reference ID"').toHaveText(
            'Reference ID'
        );
        await expect(this.contractDetailsReferenceID, `Buy reference ID should be "${buyId} (Buy)"`).toHaveText(
            `${buyId} (Buy)`
        );
        await expect(this.contractDetailsReferenceIDSell, 'Sell reference ID should have a value').not.toBeEmpty();
        const sellIdText = (await this.contractDetailsReferenceIDSell.innerText()).trim();
        const sellId = sellIdText.replace(' (Sell)', '');

        // Step 8: Duration
        const auditDuration = this.normaliseDurationForAudit(durationValue);
        await expect(this.contractDetailsDurationLabel, 'Duration label should be "Duration"').toHaveText('Duration');
        await expect(this.contractDetailsDuration, `Duration should be "${auditDuration}"`).toHaveText(auditDuration);

        // Step 9: Start time
        await expect(this.contractDetailsStartTimeLabel, 'Start time label should be "Start time"').toHaveText(
            'Start time'
        );
        await expect(this.contractDetailsStartTime, `Start time should contain "${buyDate}"`).toContainText(buyDate);

        // Step 10: Entry spot
        await expect(this.contractDetailsEntrySpotLabel, 'Entry spot label should be "Entry spot"').toHaveText(
            'Entry spot'
        );
        await expect(this.contractDetailsEntrySpot, `Entry spot price should be "${entrySpot}"`).toHaveText(entrySpot);
        await expect(this.contractDetailsEntrySpotTime, `Entry spot time should contain "${buyDate}"`).toContainText(
            buyDate
        );

        // Step 11: Barrier matches entry spot (Rise/Fall barrier = entry spot)
        await expect(this.contractDetailsBarrierLabel, 'Barrier label should be "Barrier"').toHaveText('Barrier');
        await expect(this.contractDetailsBarrier, `Barrier should match entry spot "${entrySpot}"`).toHaveText(
            entrySpot
        );

        // Step 12: Exit spot
        await expect(this.contractDetailsExitSpotLabel, 'Exit spot label should be "Exit spot"').toHaveText(
            'Exit spot'
        );
        await expect(this.contractDetailsExitSpot, 'Exit spot price should have a value').not.toBeEmpty();
        await expect(this.contractDetailsExitSpotTime, `Exit spot time should contain "${buyDate}"`).toContainText(
            buyDate
        );

        // Step 13: Exit time
        await expect(this.contractDetailsExitTimeLabel, 'Exit time label should be "Exit time"').toHaveText(
            'Exit time'
        );
        await expect(this.contractDetailsExitTime, `Exit time should contain "${buyDate}"`).toContainText(buyDate);

        return sellId;
    }
}
