import { TradeDigitsPage } from './TradeDigitsPage';

/**
 * Page Object for the Even/Odd digit contract type on the trade page (/).
 *
 * Thin subclass of {@link TradeDigitsPage}. Even/Odd is the simplest digit type: it has **no last-digit
 * selector** (the outcome is whether the last digit is even or odd), so no `digit` is passed. The audit
 * Target row reads "Even" / "Odd" rather than a number.
 *
 * @example
 * ```typescript
 * test('VERIFY Buy "Even" Contract', async ({ tradeEvenOddPage }) => {
 *     await tradeEvenOddPage.buyEvenAndVerify({
 *         market: 'Volatility 10 Index',
 *         durationValue: '10 ticks',
 *         stake: '10.00',
 *         currency: 'USD',
 *     });
 * });
 * ```
 */
export class TradeEvenOddPage extends TradeDigitsPage {
    /**
     * Full Even contract flow: buy Even → settle in place → verify the closed contract in the
     * Positions Closed tab, contract details, balance, and Reports (Trade table + Statement).
     *
     * @param accountType   - Account to trade on: 'real' or 'demo'
     * @param market        - Digits market symbol (e.g. 'Volatility 10 Index')
     * @param durationValue - Ticks chip label (e.g. '10 ticks')
     * @param stake         - Stake amount as a string (e.g. '10.00')
     * @param currency      - Currency code (e.g. 'USD')
     */
    async buyEvenAndVerify(params: {
        accountType: 'real' | 'demo';
        market: string;
        durationValue: string;
        stake: string;
        currency: string;
    }): Promise<void> {
        await this.buyDigitContractAndVerify({
            tradeTypeLabel: 'Even/Odd',
            prediction: 'Even',
            position: 'top',
            ...params,
        });
    }

    /**
     * Full Odd contract flow: buy Odd → settle in place → verify the closed contract in the
     * Positions Closed tab, contract details, balance, and Reports (Trade table + Statement).
     *
     * @param accountType   - Account to trade on: 'real' or 'demo'
     * @param market        - Digits market symbol (e.g. 'Volatility 10 Index')
     * @param durationValue - Ticks chip label (e.g. '10 ticks')
     * @param stake         - Stake amount as a string (e.g. '10.00')
     * @param currency      - Currency code (e.g. 'USD')
     */
    async buyOddAndVerify(params: {
        accountType: 'real' | 'demo';
        market: string;
        durationValue: string;
        stake: string;
        currency: string;
    }): Promise<void> {
        await this.buyDigitContractAndVerify({
            tradeTypeLabel: 'Even/Odd',
            prediction: 'Odd',
            position: 'bottom',
            ...params,
        });
    }
}
