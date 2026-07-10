import { TradeDigitsPage } from './TradeDigitsPage';

/**
 * Page Object for the Matches/Differs digit contract type on the trade page (/).
 *
 * Thin subclass of {@link TradeDigitsPage} — all digit behaviour (selector, ticks duration,
 * settle-in-place verification chain) lives in the base; this class only names the two outcomes.
 *
 * @example
 * ```typescript
 * test('VERIFY Buy "Matches" Contract', async ({ tradeMatchesDiffersPage }) => {
 *     await tradeMatchesDiffersPage.buyMatchesAndVerify({
 *         market: 'Volatility 10 Index',
 *         durationValue: '10 ticks',
 *         stake: '10.00',
 *         currency: 'USD',
 *         digit: '5',
 *     });
 * });
 * ```
 */
export class TradeMatchesDiffersPage extends TradeDigitsPage {
    /**
     * Full Matches contract flow: buy Matches → settle in place → verify the closed contract in the
     * Positions Closed tab, contract details, balance, and Reports (Trade table + Statement).
     *
     * @param market        - Digits market symbol (e.g. 'Volatility 10 Index')
     * @param durationValue - Ticks chip label (e.g. '10 ticks')
     * @param stake         - Stake amount as a string (e.g. '10.00')
     * @param currency      - Currency code (e.g. 'USD')
     * @param digit         - Last-digit prediction "0"–"9"
     */
    async buyMatchesAndVerify(params: {
        market: string;
        durationValue: string;
        stake: string;
        currency: string;
        digit: string;
    }): Promise<void> {
        await this.buyDigitContractAndVerify({
            tradeTypeLabel: 'Matches/Differs',
            prediction: 'Matches',
            position: 'top',
            ...params,
        });
    }

    /**
     * Full Differs contract flow: buy Differs → settle in place → verify the closed contract in the
     * Positions Closed tab, contract details, balance, and Reports (Trade table + Statement).
     *
     * @param market        - Digits market symbol (e.g. 'Volatility 10 Index')
     * @param durationValue - Ticks chip label (e.g. '10 ticks')
     * @param stake         - Stake amount as a string (e.g. '10.00')
     * @param currency      - Currency code (e.g. 'USD')
     * @param digit         - Last-digit prediction "0"–"9"
     */
    async buyDiffersAndVerify(params: {
        market: string;
        durationValue: string;
        stake: string;
        currency: string;
        digit: string;
    }): Promise<void> {
        await this.buyDigitContractAndVerify({
            tradeTypeLabel: 'Matches/Differs',
            prediction: 'Differs',
            position: 'bottom',
            ...params,
        });
    }
}
