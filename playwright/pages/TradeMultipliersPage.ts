import { Locator, expect } from '@playwright/test';
import { TradeParametersPage } from './TradeParametersPage';

/**
 * Page Object for the Multipliers contract type on the trade page (/).
 *
 * Extends TradeParametersPage (which extends TradeBasePage) and adds
 * locators and verifications specific to multiplier trades:
 * take profit, stop loss, deal cancellation, and risk management info.
 *
 * @example
 * ```typescript
 * test('VERIFY multipliers parameters load', async ({ tradeMultipliersPage }) => {
 *     await tradeMultipliersPage.gotoTradePage();
 *     await tradeMultipliersPage.verifyMultipliersParametersVisible();
 * });
 * ```
 */
export class TradeMultipliersPage extends TradeParametersPage {
    // ============================================
    // LOCATORS
    // ============================================

    /** Multiplier value selector (e.g. x10, x20, x50) */
    get multiplierSelector(): Locator {
        return this.page.getByTestId('dt_multiplier_selector');
    }

    /** Take profit toggle / input */
    get takeProfitInput(): Locator {
        return this.page.getByTestId('dt_take_profit_input');
    }

    /** Stop loss toggle / input */
    get stopLossInput(): Locator {
        return this.page.getByTestId('dt_stop_loss_input');
    }

    /** Deal cancellation toggle */
    get dealCancellationToggle(): Locator {
        return this.page.getByTestId('dt_deal_cancellation_toggle');
    }

    /** Risk management info button — opens the info modal */
    get riskManagementInfoButton(): Locator {
        return this.page.getByTestId('dt_risk_management_info');
    }

    // ============================================
    // VERIFICATIONS
    // ============================================

    /**
     * Verify multipliers-specific parameters are visible on the trade page.
     */
    async verifyMultipliersParametersVisible(): Promise<void> {
        await expect(this.multiplierSelector, 'Multiplier selector should be visible').toBeVisible();
        await expect(this.stakeInput, 'Stake input should be visible').toBeVisible();
        await expect(this.purchaseButton, 'Purchase button should be visible').toBeVisible();
    }
}
