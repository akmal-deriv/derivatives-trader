import { Locator, expect } from '@playwright/test';
import { TradeParametersPage } from './TradeParametersPage';

/**
 * Page Object for the Accumulators contract type on the trade page (/).
 *
 * Extends TradeParametersPage (which extends TradeBasePage) and adds
 * locators and verifications specific to accumulator trades:
 * growth rate selector, accumulator stats, and the info section.
 *
 * @example
 * ```typescript
 * test('VERIFY accumulators parameters load', async ({ accumulatorsTradePage }) => {
 *     await accumulatorsTradePage.gotoTradePage();
 *     await accumulatorsTradePage.verifyAccumulatorsParametersVisible();
 * });
 * ```
 */
export class TradeAccumulatorsPage extends TradeParametersPage {
    // ============================================
    // LOCATORS
    // ============================================

    /** Growth rate selector (e.g. 1%, 2%, 3%, 4%, 5%) */
    get growthRateSelector(): Locator {
        return this.page.getByTestId('dt_growth_rate_selector');
    }

    /** Accumulator stats section — shows current payout and tick count */
    get accumulatorStats(): Locator {
        return this.page.getByTestId('dt_accu_stats');
    }

    /** Accumulators info button — opens the info/explanation modal */
    get accumulatorsInfoButton(): Locator {
        return this.page.getByTestId('dt_accumulators_info_button');
    }

    // ============================================
    // VERIFICATIONS
    // ============================================

    /**
     * Verify accumulators-specific parameters are visible on the trade page.
     */
    async verifyAccumulatorsParametersVisible(): Promise<void> {
        await expect(this.growthRateSelector, 'Growth rate selector should be visible').toBeVisible();
        await expect(this.stakeInput, 'Stake input should be visible').toBeVisible();
        await expect(this.purchaseButton, 'Purchase button should be visible').toBeVisible();
    }
}
