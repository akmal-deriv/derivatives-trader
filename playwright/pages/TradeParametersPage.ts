import { Locator, expect } from '@playwright/test';
import { TradeBasePage } from './TradeBasePage';

/**
 * Page Object for trade parameters shared across all contract types on the trade page (/).
 *
 * Covers: contract type selector, market selector, stake input, duration input,
 * purchase button, and the mobile parameters container (bottom sheet + drag handle).
 * All locators are viewport-aware — desktop (≥ 1024px) and mobile (< 1024px) use
 * different testids or selectors as rendered by AppV2.
 *
 * @example
 * ```typescript
 * test('VERIFY trade parameters load', async ({ tradeParametersPage }) => {
 *     await tradeParametersPage.gotoTradePage();
 *     await tradeParametersPage.verifyDTraderLandingPage(testInfo.project.name.includes('mobile'));
 * });
 * ```
 */
export class TradeParametersPage extends TradeBasePage {
    // ============================================
    // LOCATORS
    // ============================================

    /**
     * Contract type selector button — opens the trade types grid popover.
     * - Desktop: icon button with aria-label="View all trade types" (trade-types-selector.tsx)
     * - Mobile: "View all" text button in the trade types scrollable bar
     */
    get tradeTypeSelector(): Locator {
        return this.isMobile
            ? this.page.getByRole('button', { name: 'View all' })
            : this.page.getByLabel('View all trade types');
    }

    /**
     * Rise button in the Rise/Fall segmented control.
     * Default selected contract type on page load.
     */
    get riseButton(): Locator {
        return this.page.getByRole('button', { name: 'Rise', exact: true });
    }

    /**
     * Fall button in the Rise/Fall segmented control.
     */
    get fallButton(): Locator {
        return this.page.getByRole('button', { name: 'Fall', exact: true });
    }

    /**
     * Guide link/button — viewport-aware.
     * - Desktop: `.guide-link` anchor with "How to trade?" text
     * - Mobile: `.trade__guide` icon button (no text)
     */
    get guideLink(): Locator {
        return this.isMobile ? this.page.locator('.trade__guide') : this.page.locator('.guide-link');
    }

    /**
     * Allow equals — viewport-aware.
     * Desktop: <p class="allow-equals__title">Allow equals</p>
     * Mobile: <label for="quill-input-N">Allow equals</label> inside minimized trade params
     */
    get allowEqualsText(): Locator {
        return this.isMobile
            ? this.page.locator('.trade-params__option--minimized label', { hasText: 'Allow equals' })
            : this.page.locator('.allow-equals__title');
    }

    /**
     * Allow equals toggle button (desktop only).
     * Source: allow-equals.tsx — <button class="toggle-switch" aria-pressed="false|true">
     * Scoped inside .allow-equals__wrapper to avoid matching other toggle switches.
     */
    get allowEqualsToggle(): Locator {
        return this.page.locator('.allow-equals__wrapper button.toggle-switch');
    }

    /**
     * Allow equals minimized text field (mobile only).
     * Tapping this opens the action sheet with the toggle + Save button.
     * Source: allow-equals.tsx is_minimized branch — TextField with label "Allow equals"
     */
    get allowEqualsMobileField(): Locator {
        return this.page.locator('.trade-params__option--minimized', { hasText: 'Allow equals' });
    }

    /**
     * Allow equals toggle inside the mobile action sheet.
     * Visible after tapping allowEqualsMobileField.
     * Source: allow-equals.tsx is_minimized ActionSheet — ToggleSwitch inside .allow-equals__toggle-row
     */
    get allowEqualsSheetToggle(): Locator {
        return this.page.locator('.allow-equals__toggle-row button.toggle-switch');
    }

    /**
     * "Save" button inside the mobile Allow equals action sheet.
     * Source: allow-equals.tsx ActionSheet.Footer primaryAction
     */
    get allowEqualsSheetSaveButton(): Locator {
        return this.page.locator('.allow-equals__button').getByRole('button', { name: 'Save' });
    }

    /**
     * Growth rate label — Accumulators only.
     * Desktop: <label>Growth rate</label> inside .trade-params__option
     * Mobile: <label>Growth rate</label> inside .trade-params__option--minimized
     */
    get growthRateLabel(): Locator {
        return this.page.locator('label', { hasText: 'Growth rate' }).first();
    }

    /**
     * Take profit label — Accumulators and Multipliers.
     * Desktop/Mobile: <label>Take profit</label> inside .trade-params__option
     */
    get takeProfitLabel(): Locator {
        return this.page.locator('label', { hasText: 'Take profit' }).first();
    }

    /**
     * Accumulators stats panel — Accumulators only.
     * Source: accumulators-stats-v2.tsx
     */
    get accumulatorsStats(): Locator {
        return this.page.locator('.accumulators-stats-v2');
    }

    /**
     * Network status indicator — confirms WebSocket connection is active.
     * Source: network-status.tsx data-testid='dt_network_status_element'
     */
    get networkStatus(): Locator {
        return this.page.getByTestId('dt_network_status_element');
    }

    /**
     * Fullscreen toggle — desktop only footer element.
     * Source: trade-params-footer.tsx data-testid='dt_fullscreen_toggle'
     */
    get fullscreenToggle(): Locator {
        return this.page.getByTestId('dt_fullscreen_toggle');
    }

    /**
     * Market / symbol selector — viewport-aware.
     * - Mobile (< 1024px): .market-selector__container (market-selector.tsx)
     * - Desktop (≥ 1024px): .cq-symbol-select-btn inside SmartCharts (trade-desktop.tsx)
     *   MarketSelector is commented out on desktop; symbol selection is via the chart header.
     */
    get marketSelector(): Locator {
        return this.isMobile
            ? this.page.locator('.market-selector__container')
            : this.page.locator('.cq-symbol-select-btn');
    }

    /**
     * Market search input — viewport-aware.
     * - Desktop: text input inside the SmartCharts market picker dialog (.sc-search-input)
     * - Mobile: text input inside the Quill action sheet symbols search field
     */
    get marketSearchInput(): Locator {
        return this.isMobile
            ? this.page.locator('.symbols-search-field__container input')
            : this.page.locator('.sc-mcd__content .sc-search-input input');
    }

    /**
     * Selected market label — viewport-aware.
     * - Desktop: .cq-symbol text inside the SmartCharts symbol select button
     * - Mobile: first <p> inside .market-selector-info__label (Quill typography)
     */
    get selectedMarketLabel(): Locator {
        return this.isMobile
            ? this.page.locator('.market-selector-info__label p.quill-typography').first()
            : this.page.locator('.cq-symbol-select-btn .cq-symbol');
    }

    /**
     * Market item in the mobile Quill action sheet filtered by display name.
     * Source: market-category-item.tsx
     *
     * @param market - Visible market name (e.g. 'Volatility 100 Index')
     */
    marketCategoryItem(market: string): Locator {
        return this.page
            .locator('.market-category-item')
            .filter({ has: this.page.locator('.market-category-item-symbol span', { hasText: market }) })
            .first();
    }

    /**
     * Market item in the SmartCharts desktop picker filtered by display name.
     * Source: SmartCharts sc-mcd__item
     *
     * @param market - Visible market name (e.g. 'Volatility 100 Index')
     */
    smartChartsMarketItem(market: string): Locator {
        return this.page
            .locator('.sc-mcd__item')
            .filter({ has: this.page.locator('.sc-mcd__item__name', { hasText: market }) })
            .first();
    }

    /**
     * Stake amount input — viewport-aware.
     * - Mobile (< 1024px): dt_input_with_steppers (stake-input.tsx)
     * - Desktop (≥ 1024px): dt_stake_input_desktop (stake-input-desktop.tsx)
     */
    get stakeInput(): Locator {
        return this.isMobile
            ? this.page.getByTestId('dt_input_with_steppers')
            : this.page.getByTestId('dt_stake_input_desktop');
    }

    /**
     * Last digit prediction param — Matches/Differs and Over/Under digit trade types.
     * Desktop: <CaptionText class="last-digit-prediction__title">Last digit prediction</CaptionText>
     * Mobile: <label> "Last digit prediction" on the minimized TextField
     * Source: last-digit-prediction.tsx — the label text is present on both viewports.
     */
    get lastDigitPredictionParam(): Locator {
        return this.page.getByText('Last digit prediction').first();
    }

    /**
     * Barrier label — Higher/Lower and Touch/No Touch trade types.
     * Desktop: <label>Barrier</label> inside .trade-params__option
     * Mobile: visible "Barrier" text in the bottom sheet
     * Source: barrier.tsx label={<Localize i18n_default_text='Barrier' />}
     */
    get barrierLabel(): Locator {
        return this.page.locator('label', { hasText: 'Barrier' }).first();
    }

    /**
     * Purchase success notification icon — appears after a successful buy.
     * Source: purchase-button.tsx addBanner callback injects StandaloneStopwatchRegularIcon
     * with className 'trade-notification--purchase'.
     */
    get purchaseNotification(): Locator {
        return this.page.locator('.trade-notification--purchase');
    }

    /**
     * Duration label — stable across both viewports.
     * Desktop: <label>Duration</label> inside .trade-params__option
     * Mobile: visible "Duration" text in the bottom sheet
     */
    get durationLabel(): Locator {
        return this.page.locator('label', { hasText: 'Duration' }).first();
    }

    /**
     * Duration field (clickable trigger) — opens the duration popover/action sheet.
     * Both viewports render a readOnly <input> associated with a <label>Duration</label>
     * via `for="quill-input-N"`. getByLabel resolves to that input on both viewports.
     * - Desktop: readOnly input inside TradeParameterPopover (trade-params__option)
     * - Mobile: readOnly input inside .trade-params__option--minimized
     */
    get durationField(): Locator {
        return this.page.getByLabel('Duration').first();
    }

    /**
     * Duration unit tab button — both desktop (vertical-tab-selector) and mobile (horizontal-tab-selector)
     * render unit tabs as `role="tab"` with the unit label as accessible name.
     * Uses case-insensitive match to handle desktop "End time" vs mobile "End Time".
     *
     * @param unit - Duration unit label (e.g. 'Ticks', 'Seconds', 'Minutes', 'Hours', 'End Time')
     */
    durationUnitTab(unit: string): Locator {
        return this.page.getByRole('tab', { name: unit, exact: false });
    }

    /**
     * Duration preset chip button — rendered by value-chips.tsx.
     * aria-label pattern: "Select value X ticks" / "Select value X sec" / "Select value X min"
     *
     * @param formattedValue - The formatted chip label as rendered (e.g. '5 ticks', '15 sec', '1 min')
     */
    durationChip(formattedValue: string): Locator {
        return this.page.getByRole('button', { name: `Select value ${formattedValue}` });
    }

    /**
     * Keyboard icon toggle — switches the duration popover/action sheet to manual input mode.
     * - Desktop: inside `.duration-popover__header`
     * - Mobile: inside `.duration-container__tab-selector`
     */
    get durationManualInputToggle(): Locator {
        return this.isMobile
            ? this.page.locator('.duration-container__tab-selector .segmented-control-single .item:nth-child(2)')
            : this.page.locator('.duration-popover__header .segmented-control-single .item:nth-child(2)');
    }

    /** End date readonly input — opens the react-calendar date picker on click */
    get durationEndDateInput(): Locator {
        return this.page.getByTestId('dt_duration_end_date_input');
    }

    /** End time readonly input — opens a time picker on click */
    get durationEndTimeInput(): Locator {
        return this.page.getByTestId('dt_duration_end_time_input');
    }

    /** react-calendar date tile by full aria-label (e.g. '22 June 2026') */
    durationCalendarDay(ariaLabel: string): Locator {
        return this.page.locator('.react-calendar__month-view__days__day').filter({
            has: this.page.locator(`abbr[aria-label="${ariaLabel}"]`),
        });
    }

    /** react-calendar prev-month navigation arrow */
    get durationCalendarPrevMonth(): Locator {
        return this.page.locator('.react-calendar__navigation__prev-button');
    }

    /** react-calendar next-month navigation arrow */
    get durationCalendarNextMonth(): Locator {
        return this.page.locator('.react-calendar__navigation__next-button');
    }

    /**
     * Hour button in the end-time grid picker.
     * aria-label pattern: "Hour 06", "Hour 23"
     *
     * @param hour - Zero-padded hour string (e.g. '06', '14')
     */
    durationEndTimeHour(hour: string): Locator {
        return this.page.locator(`[aria-label="Hour ${hour}"]`);
    }

    /**
     * Minute button in the end-time grid picker.
     * aria-label pattern: "Minute 00", "Minute 45"
     *
     * @param minute - Zero-padded minute string (e.g. '00', '45')
     */
    durationEndTimeMinute(minute: string): Locator {
        return this.page.locator(`[aria-label="Minute ${minute}"]`);
    }

    /** "Done" button in the end-time grid picker footer — confirms the time selection */
    get durationEndTimeDoneButton(): Locator {
        return this.page.locator('.duration-end-time-desktop__time-picker-footer button');
    }

    /**
     * Stake field (clickable trigger) — opens the stake popover/action sheet.
     * TradeParameterPopover renders a readOnly <input> associated with <label>Stake</label>
     * via Quill's for/id pairing. getByLabel resolves directly to that input on both viewports.
     */
    get stakeField(): Locator {
        return this.page.getByLabel('Stake').first();
    }

    /**
     * Preset chip in the stake popover — aria-label pattern: "Select value X USD".
     * Source: value-chips.tsx inside stake-desktop.tsx / stake-mobile.tsx
     *
     * @param amount - Amount as a number string (e.g. '10' for the "10 USD" chip)
     */
    stakeChip(amount: string): Locator {
        return this.page.getByRole('button', { name: `Select value ${amount} USD` });
    }

    /**
     * Barrier field trigger (read-only TextField that opens the popover/action-sheet).
     * Desktop: TradeParameterPopover renders a readOnly TextField labelled "Barrier".
     * Mobile: barrier.tsx renders the same TextField labelled "Barrier".
     * Source: barrier-desktop.tsx + barrier.tsx
     */
    get barrierField(): Locator {
        return this.page
            .locator('.trade-params__option')
            .filter({ has: this.page.locator('label', { hasText: 'Barrier' }) });
    }

    /**
     * Barrier type selector inside the popover/action-sheet.
     * Desktop: role="tab" buttons inside .barrier-popover__sidebar (VerticalTabSelector)
     * Mobile: .quill-chip buttons inside .barrier-params__chips — no aria-label, matched by text content
     * Source: barrier-type-selector.tsx (desktop), barrier-input.tsx (mobile)
     */
    barrierTypeTab(type: 'Above spot' | 'Below spot' | 'Fixed barrier'): Locator {
        return this.isMobile
            ? this.page.locator('.barrier-params__chips').locator('.quill-chip', { hasText: type })
            : this.page.locator('.barrier-popover__sidebar').getByRole('tab', { name: type });
    }

    /**
     * Barrier value input inside the popover/action-sheet.
     * Both viewports: input[name="barrier_1"]
     * Source: barrier-content-desktop.tsx + barrier-input.tsx
     */
    get barrierInput(): Locator {
        return this.page.locator('input[name="barrier_1"]');
    }

    /**
     * Save button inside the barrier popover/action-sheet.
     * Desktop: .barrier-content__save-button (.quill__color--secondary-black-white)
     * Mobile: .quill-action-sheet--footer primary button (.quill__color--primary-black-white)
     * Source: barrier-content-desktop.tsx + barrier-input.tsx
     */
    get barrierSaveButton(): Locator {
        return this.isMobile
            ? this.page.locator('.quill-action-sheet--footer').getByRole('button', { name: 'Save' })
            : this.page.locator('.barrier-content__save-button');
    }

    /**
     * Manual input toggle button (second item in the segmented control) inside the stake popover/action sheet.
     * Switches from preset chips view to the text input view.
     * - Desktop: inside `.stake-popover`
     * - Mobile: inside `.stake-container__tab-selector`
     */
    get stakeManualInputToggle(): Locator {
        return this.isMobile
            ? this.page.locator('.stake-container__tab-selector .segmented-control-single .item:nth-child(2)')
            : this.page.locator('.stake-popover .segmented-control-single .item:nth-child(2)');
    }

    /**
     * Stake amount input inside the stake popover/action sheet — visible only after
     * switching to manual input mode via stakeManualInputToggle.
     * - Desktop: dt_stake_input_desktop (stake-input-desktop.tsx)
     * - Mobile: dt_input_with_steppers (stake-input.tsx TextFieldWithSteppers)
     */
    get stakePopoverInput(): Locator {
        return this.isMobile
            ? this.page.getByTestId('dt_input_with_steppers')
            : this.page.getByTestId('dt_stake_input_desktop');
    }

    /**
     * Save button inside the stake popover/action sheet — closes the popover and commits the value.
     * Both desktop (stake-input-desktop.tsx) and mobile (stake-input.tsx) render a "Save" button.
     */
    get stakeSaveButton(): Locator {
        return this.isMobile
            ? this.page.locator('.stake-container').getByRole('button', { name: 'Save' })
            : this.page.getByRole('button', { name: 'Save' });
    }

    /**
     * Stake label — stable across both viewports.
     * Desktop: <label>Stake</label> inside .trade-params__option
     * Mobile: visible "Stake" text in the bottom sheet
     */
    get stakeLabel(): Locator {
        return this.page.locator('label', { hasText: 'Stake' }).first();
    }

    /**
     * Duration input — viewport-aware.
     * - Mobile (< 1024px): no testid; use the visible "Duration" label text
     * - Desktop (≥ 1024px): duration display text in the trade params form
     */
    get durationInput(): Locator {
        return this.isMobile
            ? this.page.getByText('Duration').first()
            : this.page.getByTestId('dt_duration_input_desktop');
    }

    /**
     * Purchase / buy button wrapper — same testid on both viewports.
     * Source: purchase-button-content.tsx data-testid='dt_purchase_button_wrapper'
     */
    get purchaseButton(): Locator {
        return this.page.getByTestId('dt_purchase_button_wrapper').first();
    }

    /**
     * Trade parameters container — mobile only (AppV2 swipeable bottom sheet).
     * Source: trade-parameters-container.tsx:59
     */
    get tradeParamsContainer(): Locator {
        return this.page.getByTestId('trade-params-container');
    }

    /**
     * Trade parameters drag handle — mobile only.
     * Source: trade-parameters-container.tsx:85
     */
    get tradeParamsHandle(): Locator {
        return this.page.getByTestId('trade-params-handle');
    }

    /**
     * Payout value on the purchase button — present only for trade types that have a payout (e.g. Rise/Fall).
     * Source: purchase-button.tsx data-testid="dt_purchase_button_wrapper" > dt_span
     * Text format: "19.28 USD"
     */
    get purchaseButtonPayout(): Locator {
        return this.page.getByTestId('dt_purchase_button_wrapper').getByTestId('dt_span');
    }

    // ============================================
    // ACTIONS
    // ============================================

    /**
     * Select a trade type by its chip label.
     * Opens the trade types selector, clicks the matching item, asserts the chip becomes selected,
     * then verifies the trade-type-specific params are visible.
     *
     * @param tradeType - Visible label exactly as rendered (e.g. 'Rise/Fall', 'Multipliers', 'Accumulators')
     *
     * @example
     * ```typescript
     * await tradeParametersPage.selectTradeType('Rise/Fall');
     * await tradeParametersPage.selectTradeType('Multipliers');
     * ```
     */
    async selectTradeType(tradeType: string): Promise<void> {
        await this.tradeTypeSelector.click();

        if (this.isMobile) {
            const item = this.page
                .locator('.trade-type-list-item')
                .filter({ has: this.page.locator('.trade-type-list-item__title', { hasText: tradeType }) })
                .first();
            await item.click();
            const chip = this.page.locator('.quill-chip', { hasText: tradeType }).first();
            await expect(chip, `'${tradeType}' chip should become selected`).toHaveAttribute('data-state', 'selected');
        } else {
            // Label is "Select X trade type" or "Select X trade type, currently selected" — use prefix match
            const item = this.page.getByLabel(`Select ${tradeType} trade type`).first();
            await item.click();
            const chip = this.page.locator('.quill-chip', { hasText: tradeType }).first();
            await expect(chip, `'${tradeType}' chip should become selected`).toHaveAttribute('data-state', 'selected');
        }

        await this.verifyParamsForTradeType(tradeType);
    }

    /**
     * Enable the Allow Equals toggle, adapting for desktop vs mobile layout.
     *
     * Desktop: clicks the toggle button in .allow-equals__wrapper.
     * Mobile: taps the minimized text field to open the action sheet,
     *         clicks the toggle inside the sheet, then taps Save.
     *
     * Precondition: Allow Equals must be visible (Rise/Fall trade type selected,
     * duration unit compatible with callputequal, e.g. Minutes not Ticks).
     */
    async enableAllowEquals(): Promise<void> {
        if (this.isMobile) {
            await expect(
                this.allowEqualsMobileField,
                'Allow equals field should be visible before enabling (mobile)'
            ).toBeVisible();
            await this.allowEqualsMobileField.click();
            await expect(
                this.allowEqualsSheetToggle,
                'Allow equals toggle inside action sheet should be visible'
            ).toBeVisible();
            await this.allowEqualsSheetToggle.click();
            await expect(
                this.allowEqualsSheetToggle,
                'Allow equals toggle should be pressed after click'
            ).toHaveAttribute('aria-pressed', 'true');
            await this.allowEqualsSheetSaveButton.click();
        } else {
            await expect(
                this.allowEqualsToggle,
                'Allow equals toggle should be visible before enabling (desktop)'
            ).toBeVisible();
            await expect(this.allowEqualsToggle, 'Allow equals toggle should be off before enabling').toHaveAttribute(
                'aria-pressed',
                'false'
            );
            await this.allowEqualsToggle.click();
            await expect(this.allowEqualsToggle, 'Allow equals toggle should be on after enabling').toHaveAttribute(
                'aria-pressed',
                'true'
            );
        }
    }

    /**
     * Select a market / symbol by its display name.
     * Opens the market selector, searches for the market, clicks the matching item,
     * then asserts the selector label reflects the new market.
     *
     * Desktop path: SmartCharts symbol picker (.sc-mcd__item → .sc-mcd__item__name)
     * Mobile path: Quill action sheet (.market-category-item → .market-category-item-symbol span)
     *
     * @param market - Visible market name as rendered (e.g. 'Volatility 100 Index')
     *
     * @example
     * ```typescript
     * await tradeParametersPage.selectMarket('Volatility 100 Index');
     * ```
     */
    async selectMarket(market: string): Promise<void> {
        await this.marketSelector.click();
        await this.marketSearchInput.fill(market);

        if (this.isMobile) {
            await this.marketCategoryItem(market).click();
            await expect(
                this.page.locator('input[placeholder^="Search markets on"]'),
                'Market search input should be hidden after market selection'
            ).not.toBeVisible();
        } else {
            await this.smartChartsMarketItem(market).click();
            await expect(
                this.page.locator('.cq-menu-dropdown-enter-done'),
                'SmartCharts market picker should be closed after market selection'
            ).not.toBeAttached();
            await expect(
                this.durationField,
                'Duration field should be visible once market picker is closed'
            ).toBeVisible();
        }

        await expect(this.selectedMarketLabel, `Market selector should show '${market}' after selection`).toContainText(
            market
        );
    }

    /**
     * Select a duration by unit and preset chip value.
     * Opens the duration popover, switches to the given unit (desktop only — unit sidebar),
     * then clicks the matching preset chip.
     *
     * Unit labels (as rendered in duration-unit-selector.tsx):
     *   'Ticks' | 'Seconds' | 'Minutes' | 'Hours' | 'End Time'
     *
     * Chip formatted values (as produced by duration-desktop.tsx formatters):
     *   ticks    → '5 ticks', '10 ticks'
     *   seconds  → '15 sec', '30 sec'
     *   minutes  → '1 min', '5 min'
     *   hours    → '1 hr', '4 hr'
     *   end time → 'DD Mon YYYY HH:mm' (e.g. '25 Jun 2026 14:30')
     *
     * @param unit           - Duration unit label (e.g. 'Ticks', 'Minutes', 'End Time')
     * @param formattedValue - Chip label or end-time string as described above
     *
     * @example
     * ```typescript
     * await tradeParametersPage.selectDuration('Ticks', '5 ticks');
     * await tradeParametersPage.selectDuration('Minutes', '1 min');
     * await tradeParametersPage.selectDuration('End Time', '25 Jun 2026 14:30');
     * ```
     */
    async selectDuration(unit: string, formattedValue: string): Promise<void> {
        await this.durationField.click();
        await this.durationUnitTab(unit).click();

        if (unit.toLowerCase() === 'end time') {
            // formattedValue format: "DD Mon YYYY HH:mm" (e.g. "25 Jun 2026 14:30")
            const endTimeMatch = formattedValue.match(/^(\d{1,2}) (\w+ \d{4}) (\d{2}):(\d{2})$/);
            if (!endTimeMatch) {
                throw new Error(
                    `selectDuration: End time formattedValue must be "DD Mon YYYY HH:mm", got "${formattedValue}"`
                );
            }
            const [, day, monthYear, hour, minute] = endTimeMatch;
            const calendarAriaLabel = `${day} ${monthYear}`;

            await this.durationEndDateInput.click();
            await this.durationCalendarDay(calendarAriaLabel).click();

            await this.durationEndTimeInput.click();
            await this.durationEndTimeHour(hour).click();
            await this.durationEndTimeMinute(minute).click();
            await this.durationEndTimeDoneButton.click();
            return;
        }

        const chip = this.durationChip(formattedValue);
        if (await chip.isVisible()) {
            await chip.click();
        } else {
            await this.durationManualInputToggle.click();
            const unitLower = unit.toLowerCase();
            if (unitLower === 'hours') {
                // formattedValue expected as 'Xh Ym' (e.g. '1h 30m') or 'Xh' (e.g. '2h')
                const hoursMatch = formattedValue.match(/(\d+)h/);
                const minutesMatch = formattedValue.match(/(\d+)m/);
                const popover = this.isMobile
                    ? this.page.locator('.duration-container')
                    : this.page.locator('.duration-popover__content');
                await popover.getByRole('textbox', { name: 'Hours' }).fill(hoursMatch ? hoursMatch[1] : '0');
                await popover.getByRole('textbox', { name: 'Minutes' }).fill(minutesMatch ? minutesMatch[1] : '0');
            } else {
                const testId = unitLower === 'ticks' ? 'dt_duration_ticks_input_desktop' : 'dt_duration_input_desktop';
                await this.page.getByTestId(testId).fill(formattedValue.replace(/[^\d.]/g, ''));
            }
            await this.page.locator('.duration-popover').getByRole('button', { name: 'Save' }).click();
        }

        // Mobile expands abbreviations to full words (e.g. "15 min" → "15 minutes"); desktop keeps chip abbreviation
        const displayValue = this.isMobile ? this.expandDurationForDisplay(formattedValue) : formattedValue;
        await expect(this.durationField, `Duration field should show '${displayValue}' after selection`).toHaveValue(
            new RegExp(`^${displayValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`)
        );
    }

    /**
     * Expand abbreviated chip labels to the full display format used by the mobile duration input.
     * Desktop abbreviations: 'min', 'sec', 'hr', 'ticks'
     * Mobile display words:  'minutes', 'seconds', 'hours', 'ticks'
     */
    private expandDurationForDisplay(formattedValue: string): string {
        // Custom hours format '1h 30m' — app renders "1 hour 30 minutes"
        const customMatch = formattedValue.match(/^(\d+)h\s+(\d+)m$/);
        if (customMatch) {
            const h = parseInt(customMatch[1], 10);
            const m = parseInt(customMatch[2], 10);
            return `${h} ${h === 1 ? 'hour' : 'hours'} ${m} ${m === 1 ? 'minute' : 'minutes'}`;
        }
        // Chip format '1 hr' / '2 hr' — app renders "1 hour" / "2 hours"
        const hrMatch = formattedValue.match(/^(\d+) hr$/);
        if (hrMatch) {
            const n = parseInt(hrMatch[1], 10);
            return `${n} ${n === 1 ? 'hour' : 'hours'}`;
        }
        return formattedValue
            .replace(/\bmin\b/, 'minutes')
            .replace(/\bsec\b/, 'seconds')
            .replace(/\bhr\b/, 'hours');
    }

    /**
     * Set the stake amount.
     * Opens the stake popover, clears the existing value, types the new amount,
     * clicks Save to commit and close, then verifies the trigger reflects the value.
     *
     * @param amount - The stake amount as a string (e.g. '10.00')
     *
     * @example
     * ```typescript
     * await tradeParametersPage.setStake('10.00');
     * ```
     */
    async setStake(amount: string): Promise<void> {
        await this.stakeField.click();

        const chip = this.stakeChip(amount);
        if (await chip.isVisible()) {
            await chip.click();
        } else {
            await this.stakeManualInputToggle.click();
            await this.stakePopoverInput.click();
            await this.stakePopoverInput.fill(amount);
            await this.stakeSaveButton.click();
            if (this.isMobile) {
                await expect(
                    this.page.locator('.stake-container__tab-selector'),
                    'Stake action sheet should dismiss after saving'
                ).not.toBeVisible();
            }
        }

        await expect(this.stakeField, `Stake field should contain '${amount}' after saving`).toHaveValue(
            new RegExp(amount.replace('.', '\\.'))
        );
    }

    /**
     * Click the purchase / buy button to submit the trade.
     * Waits for the button to be enabled before clicking.
     *
     * @example
     * ```typescript
     * await tradeParametersPage.clickBuy();
     * ```
     */
    async clickBuy(): Promise<string> {
        await expect(this.purchaseButton, 'Purchase button should be enabled before buying').toBeEnabled();
        await expect(
            this.purchaseButtonPayout,
            'Payout value should appear on buy button before clicking'
        ).toBeVisible();
        const payoutText = (await this.purchaseButtonPayout.innerText()).replace(/\s+[A-Z]+$/, '').trim();
        await this.purchaseButton.click();
        return payoutText;
    }

    /**
     * "Higher" option in the Higher/Lower segmented control.
     * Source: purchase-button.tsx segmented-control-single > button.item containing "Higher"
     * Scoped to .trade-params__option to avoid matching other buttons with the same label.
     */
    get higherOption(): Locator {
        return this.page.locator('.trade-params__option').getByRole('button', { name: 'Higher', exact: true });
    }

    /**
     * "Lower" option in the Higher/Lower segmented control.
     * Source: purchase-button.tsx segmented-control-single > button.item containing "Lower"
     * Scoped to .trade-params__option to avoid matching other buttons with the same label.
     */
    get lowerOption(): Locator {
        return this.page.locator('.trade-params__option').getByRole('button', { name: 'Lower', exact: true });
    }

    /**
     * Open the Barrier popover/action-sheet, optionally switch type, set the value, and save.
     *
     * @param value - Numeric string without sign prefix, e.g. '3.51'
     * @param type  - Barrier type to select before typing. Omit to keep the current type.
     */
    async setBarrier(value: string, type?: 'Above spot' | 'Below spot' | 'Fixed barrier'): Promise<void> {
        await this.barrierField.click();
        if (type) {
            await this.barrierTypeTab(type).click();
            await expect(this.barrierTypeTab(type), `Barrier type "${type}" should be selected`).toHaveAttribute(
                this.isMobile ? 'data-state' : 'aria-selected',
                this.isMobile ? 'selected' : 'true'
            );
        }
        await this.barrierInput.clear();
        await this.barrierInput.fill(value);
        await expect(this.barrierInput, `Barrier input should contain "${value}" before saving`).toHaveValue(value);
        await this.barrierSaveButton.click();
        const expectedValue = type === 'Above spot' ? `+${value}` : type === 'Below spot' ? `-${value}` : value;
        await expect(
            this.barrierField.locator('input'),
            `Barrier field should display "${expectedValue}" after saving`
        ).toHaveValue(expectedValue);
    }

    // ============================================
    // VERIFICATIONS
    // ============================================

    /**
     * Verify that the Allow Equals toggle is currently enabled (aria-pressed="true").
     * Desktop: checks the toggle in .allow-equals__wrapper.
     * Mobile: checks the minimized field value shows "Yes".
     */
    async verifyAllowEqualsEnabled(): Promise<void> {
        if (this.isMobile) {
            const field = this.page.locator('.trade-params__option--minimized', { hasText: 'Allow equals' });
            await expect(
                field.locator('input'),
                'Allow equals minimized field should show "Yes" when enabled'
            ).toHaveValue('Yes');
        } else {
            await expect(
                this.allowEqualsToggle,
                'Allow equals toggle should be on (aria-pressed="true")'
            ).toHaveAttribute('aria-pressed', 'true');
        }
    }

    /**
     * Verifies the visible params after selecting a trade type.
     * Add a case here for each new trade type as it is implemented.
     *
     * @param tradeType - The trade type that was just selected
     */
    private async verifyParamsForTradeType(tradeType: string): Promise<void> {
        switch (tradeType) {
            case 'Rise/Fall':
                await expect(this.guideLink, 'Guide link should be visible for Rise/Fall').toBeVisible();
                await expect(this.riseButton, 'Rise button should be visible for Rise/Fall').toBeVisible();
                await expect(this.fallButton, 'Fall button should be visible for Rise/Fall').toBeVisible();
                await expect(this.durationLabel, 'Duration param should be visible for Rise/Fall').toBeVisible();
                await expect(this.stakeLabel, 'Stake param should be visible for Rise/Fall').toBeVisible();
                await expect(this.allowEqualsText, 'Allow equals should be visible for Rise/Fall').toBeVisible();
                await expect(this.purchaseButton, 'Buy button should be visible for Rise/Fall').toBeVisible();
                break;
            case 'Accumulators':
                await expect(this.guideLink, 'Guide link should be visible for Accumulators').toBeVisible();
                await expect(
                    this.growthRateLabel,
                    'Growth rate param should be visible for Accumulators'
                ).toBeVisible();
                await expect(this.stakeLabel, 'Stake param should be visible for Accumulators').toBeVisible();
                await expect(
                    this.takeProfitLabel,
                    'Take profit param should be visible for Accumulators'
                ).toBeVisible();
                await expect(
                    this.accumulatorsStats,
                    'Accumulators stats panel should be visible for Accumulators'
                ).toBeVisible();
                await expect(this.purchaseButton, 'Buy button should be visible for Accumulators').toBeVisible();
                break;
            case 'Higher/Lower':
                await expect(this.barrierLabel, 'Barrier param should be visible for Higher/Lower').toBeVisible();
                await expect(this.durationLabel, 'Duration param should be visible for Higher/Lower').toBeVisible();
                await expect(this.stakeLabel, 'Stake param should be visible for Higher/Lower').toBeVisible();
                await expect(this.purchaseButton, 'Buy button should be visible for Higher/Lower').toBeVisible();
                break;
            case 'Touch/No Touch':
                await expect(this.barrierLabel, 'Barrier param should be visible for Touch/No Touch').toBeVisible();
                await expect(this.durationLabel, 'Duration param should be visible for Touch/No Touch').toBeVisible();
                await expect(this.stakeLabel, 'Stake param should be visible for Touch/No Touch').toBeVisible();
                await expect(this.purchaseButton, 'Buy button should be visible for Touch/No Touch').toBeVisible();
                break;
            case 'Matches/Differs':
                await expect(
                    this.lastDigitPredictionParam,
                    'Last digit prediction should be visible for Matches/Differs'
                ).toBeVisible();
                await expect(this.durationLabel, 'Duration param should be visible for Matches/Differs').toBeVisible();
                await expect(this.stakeLabel, 'Stake param should be visible for Matches/Differs').toBeVisible();
                await expect(this.purchaseButton, 'Buy button should be visible for Matches/Differs').toBeVisible();
                break;
            case 'Over/Under':
                await expect(
                    this.lastDigitPredictionParam,
                    'Last digit prediction should be visible for Over/Under'
                ).toBeVisible();
                await expect(this.durationLabel, 'Duration param should be visible for Over/Under').toBeVisible();
                await expect(this.stakeLabel, 'Stake param should be visible for Over/Under').toBeVisible();
                await expect(this.purchaseButton, 'Buy button should be visible for Over/Under').toBeVisible();
                break;
            case 'Even/Odd':
                // Even/Odd has no last-digit prediction selector — the outcome is even vs odd.
                await expect(
                    this.lastDigitPredictionParam,
                    'Last digit prediction should NOT be visible for Even/Odd'
                ).not.toBeVisible();
                await expect(this.durationLabel, 'Duration param should be visible for Even/Odd').toBeVisible();
                await expect(this.stakeLabel, 'Stake param should be visible for Even/Odd').toBeVisible();
                await expect(this.purchaseButton, 'Buy button should be visible for Even/Odd').toBeVisible();
                break;
            // Add cases for Multipliers, Turbos, Vanillas, etc. as they are implemented
        }
    }

    /**
     * Verify the landing page state before login — login button visible, trade form accessible.
     */
    async verifyDTraderLandingPageLoggedOut(): Promise<void> {
        await expect(this.loginButton, 'Login button should be visible when logged out').toBeVisible();
        await expect(this.accountInfo, 'Account info should not be visible when logged out').not.toBeVisible();
        await expect(this.tradeTypeSelector, 'Trade type selector should be visible before login').toBeVisible();
        await expect(
            this.selectedTradeTypeChip,
            'Rise/Fall should be the selected trade type chip by default'
        ).toBeVisible();
        await expect(this.purchaseButton, 'Purchase button should be visible before login').toBeVisible();
        await expect(this.marketSelector, 'Market selector should be visible before login').toBeVisible();

        if (this.isMobile) {
            await expect(this.bottomNavHome, 'Bottom nav Home tab should be visible when logged out').toBeVisible();
            await expect(this.bottomNavTrade, 'Bottom nav Trade tab should be visible when logged out').toBeVisible();
            await expect(this.bottomNavMenu, 'Bottom nav Menu tab should be visible when logged out').toBeVisible();
            await expect(
                this.bottomNavPositions,
                'Bottom nav Positions tab should not be visible when logged out'
            ).not.toBeVisible();
        } else {
            await expect(this.sidebarHomeButton, 'Sidebar Home button should be visible when logged out').toBeVisible();
            await expect(this.sidebarHelpButton, 'Sidebar Help button should be visible when logged out').toBeVisible();
            await expect(
                this.sidebarLanguageButton,
                'Sidebar Language button should be visible when logged out'
            ).toBeVisible();
            await expect(
                this.sidebarThemeButton,
                'Sidebar Theme button should be visible when logged out'
            ).toBeVisible();
            await expect(
                this.sidebarPositionsButton,
                'Sidebar Positions button should not be visible when logged out'
            ).not.toBeVisible();
            await expect(
                this.sidebarReportsButton,
                'Sidebar Reports button should not be visible when logged out'
            ).not.toBeVisible();
            await expect(
                this.sidebarAccountButton,
                'Sidebar Account button should not be visible when logged out'
            ).not.toBeVisible();
        }
    }

    /**
     * Verify the core trade parameters are visible on the trade page.
     */
    async verifyDTraderLandingPage(): Promise<void> {
        await this.verifySuccessfulLogin();
        await expect(this.marketSelector, 'Market selector should be visible on the trade form').toBeVisible();
        await expect(
            this.tradeTypeSelector,
            'Contract type selector button should be visible on the trade form'
        ).toBeVisible();
        await expect(this.riseButton, 'Rise button should be visible as the default contract type').toBeVisible();
        await expect(this.fallButton, 'Fall button should be visible as the default contract type').toBeVisible();
        await expect(this.durationLabel, 'Duration field should be visible on the trade form').toBeVisible();
        await expect(this.stakeLabel, 'Stake field should be visible on the trade form').toBeVisible();
        await expect(
            this.allowEqualsText,
            'Allow equals should be visible for Rise/Fall on the trade form'
        ).toBeVisible();
        await expect(this.purchaseButton, 'Purchase button should be visible on the trade form').toBeVisible();

        if (this.isMobile) {
            await expect(
                this.tradeParamsContainer,
                'Trade params container (bottom sheet) should be visible on mobile'
            ).toBeVisible();
            await expect(this.tradeParamsHandle, 'Trade params drag handle should be visible on mobile').toBeVisible();
        } else {
            await expect(this.guideLink, 'Guide link should be visible on the desktop trade form').toBeVisible();
            await expect(
                this.networkStatus,
                'Network status indicator should be visible on the desktop trade form'
            ).toBeVisible();
            await expect(
                this.fullscreenToggle,
                'Fullscreen toggle should be visible on the desktop trade form'
            ).toBeVisible();
        }
    }
}
