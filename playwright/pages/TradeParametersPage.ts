import { Locator, expect } from '@playwright/test';
import { TradeBasePage } from './TradeBasePage';

/**
 * Page Object for trade parameters shared across all contract types on the trade page (/).
 *
 * Covers: contract type selector, market selector, stake input, duration input,
 * and the purchase button — elements present for every trade type.
 * Contract-type-specific parameters live in MultipliersTradePage / AccumulatorsTradePage.
 *
 * @example
 * ```typescript
 * test('VERIFY trade parameters load', async ({ tradeParametersPage }) => {
 *     await tradeParametersPage.gotoTradePage();
 *     await tradeParametersPage.verifyTradeParametersVisible();
 * });
 * ```
 */
export class TradeParametersPage extends TradeBasePage {
    // ============================================
    // LOCATORS
    // ============================================

    /** Contract type / trade type selector button */
    get contractTypeSelector(): Locator {
        return this.page.getByTestId('dt_contract_type_selector');
    }

    /** Market / symbol selector button */
    get marketSelector(): Locator {
        return this.page.getByTestId('dt_underlying_dropdown');
    }

    /** Stake amount input */
    get stakeInput(): Locator {
        return this.page.getByTestId('dt_stake_input');
    }

    /** Duration input */
    get durationInput(): Locator {
        return this.page.getByTestId('dt_duration_input');
    }

    /** Purchase / Buy button */
    get purchaseButton(): Locator {
        return this.page.getByTestId('dt_purchase_button');
    }

    // ============================================
    // VERIFICATIONS
    // ============================================

    /**
     * Verify the core trade parameters are visible on the trade page.
     */
    async verifyTradeParametersVisible(): Promise<void> {
        await expect(this.contractTypeSelector, 'Contract type selector should be visible').toBeVisible();
        await expect(this.marketSelector, 'Market selector should be visible').toBeVisible();
        await expect(this.stakeInput, 'Stake input should be visible').toBeVisible();
        await expect(this.purchaseButton, 'Purchase button should be visible').toBeVisible();
    }
}
