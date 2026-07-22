import { Locator, expect } from '@playwright/test';
import { TradeBasePage } from './TradeBasePage';

export type MarketStatus = 'open' | 'session_gated';

export interface Market {
    label: string;
    /** Override used on mobile when the action sheet renders a different name than SmartCharts. */
    mobileLabel?: string;
    status: MarketStatus;
}

/**
 * FeedPage — Verifies the live WebSocket price feed on the trade page.
 *
 * Owns all locators and interactions related to the market selector header's
 * spot price display — the element that ticks in real-time via the `ticks`
 * WebSocket subscription.
 *
 * Navigation to the trade page and trade type selection is handled by
 * `TradeParametersPage.gotoTradePage()` + `selectTradeType('Multipliers')`.
 *
 * @example
 * ```typescript
 * await tradeParametersPage.gotoTradePage();
 * await tradeParametersPage.selectTradeType('Multipliers');
 * const initial = await feedPage.getCurrentSpotPrice();
 * await feedPage.waitForPriceChange(initial);
 * ```
 */
export class FeedPage extends TradeBasePage {
    // ============================================
    // MARKET LIST
    // ============================================

    static readonly MARKETS: Market[] = [
        // ── Volatility indices (1s) — 24/7 ────────────────────────────────────
        { label: 'Volatility 100 (1s) Index', status: 'open' },
        { label: 'Volatility 10 (1s) Index', status: 'open' },
        { label: 'Volatility 25 (1s) Index', status: 'open' },
        { label: 'Volatility 50 (1s) Index', status: 'open' },
        { label: 'Volatility 75 (1s) Index', status: 'open' },
        // ── Volatility indices — 24/7 ──────────────────────────────────────────
        { label: 'Volatility 10 Index', status: 'open' },
        { label: 'Volatility 25 Index', status: 'open' },
        { label: 'Volatility 50 Index', status: 'open' },
        { label: 'Volatility 75 Index', status: 'open' },
        { label: 'Volatility 100 Index', status: 'open' },
        // ── Jump indices — 24/7 ────────────────────────────────────────────────
        { label: 'Jump 10 Index', status: 'open' },
        { label: 'Jump 25 Index', status: 'open' },
        { label: 'Jump 50 Index', status: 'open' },
        { label: 'Jump 75 Index', status: 'open' },
        { label: 'Jump 100 Index', status: 'open' },
        // ── Step indices — 24/7 ────────────────────────────────────────────────
        { label: 'Step Index 100', mobileLabel: 'Step 100 Index', status: 'open' },
        { label: 'Step Index 200', mobileLabel: 'Step 200 Index', status: 'open' },
        { label: 'Step Index 300', mobileLabel: 'Step 300 Index', status: 'open' },
        { label: 'Step Index 400', mobileLabel: 'Step 400 Index', status: 'open' },
        { label: 'Step Index 500', mobileLabel: 'Step 500 Index', status: 'open' },
        // ── Daily reset indices — 24/7 ─────────────────────────────────────────
        { label: 'Bear Market Index', status: 'open' },
        { label: 'Bull Market Index', status: 'open' },
        // ── Basket indices — 24/7 ──────────────────────────────────────────────
        { label: 'Gold Basket', status: 'open' },
        { label: 'AUD Basket', status: 'open' },
        { label: 'EUR Basket', status: 'open' },
        { label: 'GBP Basket', status: 'open' },
        { label: 'USD Basket', status: 'open' },
        // ── Stock indices — session-gated (exchange hours only) ────────────────
        { label: 'Wall Street 30', status: 'session_gated' },
        { label: 'US Tech 100', status: 'session_gated' },
        { label: 'US 500', status: 'session_gated' },
        { label: 'Australia 200', status: 'session_gated' },
        { label: 'Hong Kong 50', status: 'session_gated' },
        { label: 'Japan 225', status: 'session_gated' },
        { label: 'Netherlands 25', status: 'session_gated' },
        { label: 'France 40', status: 'session_gated' },
        { label: 'UK 100', status: 'session_gated' },
        { label: 'Germany 40', status: 'session_gated' },
        { label: 'Swiss 20', status: 'session_gated' },
        { label: 'Euro 50', status: 'session_gated' },
        // ── Crypto — weekday-only ──────────────────────────────────────────────
        { label: 'BTC/USD', status: 'session_gated' },
        { label: 'ETH/USD', status: 'session_gated' },
        // ── Forex major — weekday-only ─────────────────────────────────────────
        { label: 'AUD/JPY', status: 'session_gated' },
        { label: 'AUD/USD', status: 'session_gated' },
        { label: 'EUR/AUD', status: 'session_gated' },
        { label: 'EUR/CAD', status: 'session_gated' },
        { label: 'EUR/CHF', status: 'session_gated' },
        { label: 'EUR/GBP', status: 'session_gated' },
        { label: 'EUR/JPY', status: 'session_gated' },
        { label: 'EUR/USD', status: 'session_gated' },
        { label: 'GBP/AUD', status: 'session_gated' },
        { label: 'GBP/JPY', status: 'session_gated' },
        { label: 'GBP/USD', status: 'session_gated' },
        { label: 'USD/CAD', status: 'session_gated' },
        { label: 'USD/CHF', status: 'session_gated' },
        { label: 'USD/JPY', status: 'session_gated' },
        // ── Forex minor — weekday-only ─────────────────────────────────────────
        { label: 'AUD/CAD', status: 'session_gated' },
        { label: 'AUD/CHF', status: 'session_gated' },
        { label: 'AUD/NZD', status: 'session_gated' },
        { label: 'EUR/NZD', status: 'session_gated' },
        { label: 'GBP/CAD', status: 'session_gated' },
        { label: 'GBP/CHF', status: 'session_gated' },
        { label: 'GBP/NZD', status: 'session_gated' },
        { label: 'NZD/JPY', status: 'session_gated' },
        { label: 'NZD/USD', status: 'session_gated' },
        { label: 'USD/MXN', status: 'session_gated' },
        { label: 'USD/PLN', status: 'session_gated' },
        // ── Commodities — session-gated ────────────────────────────────────────
        { label: 'Silver/USD', status: 'session_gated' },
        { label: 'Gold/USD', status: 'session_gated' },
        { label: 'Palladium/USD', status: 'session_gated' },
        { label: 'Platinum/USD', status: 'session_gated' },
    ];

    // ============================================
    // LOCATORS
    // ============================================

    /**
     * The animated spot price rendered by SmartCharts inside `.cq-symbol-info`.
     * Class `.cq-animated-price` is set by SmartCharts and updates on every tick.
     * Falls back to `.market-selector-info__price` (mobile MarketSelector layout).
     */
    get spotPrice(): Locator {
        return this.page.locator('.cq-animated-price').or(this.page.locator('.market-selector-info__price')).first();
    }

    /**
     * "CLOSED" badge in the market selector header.
     * Desktop: SmartCharts renders `.cq-symbol-closed-text` inside the chart header.
     * Mobile:  Quill renders a `.tag.tag__color--error` chip inside `.market-selector-info__label`.
     */
    get symbolClosedBadge(): Locator {
        return this.isMobile
            ? this.page.locator('.market-selector-info__label .tag.tag__color--error')
            : this.page.locator('.cq-symbol-closed-text');
    }

    /**
     * "This market will reopen at…" banner rendered by the trade form when the selected
     * market is outside its trading hours.
     * Source: `.closed-market-message--container` in market-closed-message.tsx.
     */
    get closedMarketMessageContainer(): Locator {
        return this.page.locator('.closed-market-message--container');
    }

    /**
     * Countdown timer inside the closed-market banner — displays time remaining until reopen.
     * Source: `.market-countdown-timer` in market-closed-message.tsx.
     */
    get marketCountdownTimer(): Locator {
        return this.page.locator('.market-countdown-timer');
    }

    // ============================================
    // ACTIONS
    // ============================================

    /**
     * Read the current spot price text from the market selector header.
     *
     * @returns The price string as displayed (e.g. `"9987.779"`), or `""` if not visible.
     */
    async getCurrentSpotPrice(): Promise<string> {
        return (await this.spotPrice.textContent()) ?? '';
    }

    resolveLabel(market: Market): string {
        return this.isMobile && market.mobileLabel ? market.mobileLabel : market.label;
    }

    /**
     * Wait until the spot price displayed in the market selector header changes
     * from the provided `previousPrice`. Relies on Playwright's `waitForFunction`
     * which polls the DOM — no manual sleep needed.
     *
     * @param previousPrice - The price value to compare against (captured before this call).
     * @param timeout        - Maximum wait time in milliseconds (default: 5 000 ms).
     */
    async waitForPriceChange(previousPrice: string, timeout = 5_000): Promise<void> {
        await this.page.waitForFunction(
            ({ selectors, prev }: { selectors: string[]; prev: string }) => {
                const el = selectors.map(s => document.querySelector(s)).find(Boolean);
                return !!el && el.textContent?.trim() !== prev && el.textContent?.trim() !== '';
            },
            { selectors: ['.cq-animated-price', '.market-selector-info__price'], prev: previousPrice },
            { timeout }
        );
    }

    // ============================================
    // VERIFICATIONS
    // ============================================

    /**
     * Assert that the spot price element is visible and contains a non-empty string.
     */
    async verifySpotPriceVisible(): Promise<void> {
        await expect(this.spotPrice, 'Spot price should be visible in the market selector header').toBeVisible();
        const price = await this.getCurrentSpotPrice();
        expect(price, 'Spot price text should be non-empty').not.toBe('');
    }

    /**
     * Assert the closed-market UI state for a session-gated symbol.
     *
     * Checks three signals on both desktop and mobile:
     *   1. "CLOSED" badge in the market selector header
     *      Desktop: `.cq-symbol-closed-text` (SmartCharts)
     *      Mobile:  `.market-selector-info__label .tag.tag__color--error` (Quill chip)
     *   2. Trade form reopen-time banner (`.closed-market-message--container`)
     *   3. Countdown timer inside the banner (`.market-countdown-timer`)
     *
     * @param label - Human-readable market name used in assertion messages, e.g. `'Hong Kong 50'`.
     */
    async verifyMarketClosedState(label: string): Promise<void> {
        const isClosed = await this.symbolClosedBadge.isVisible();

        if (!isClosed) {
            // Market is within trading hours at runtime — verify live feed instead
            await this.verifySpotPriceVisible();
            return;
        }

        await expect(
            this.symbolClosedBadge,
            `[${label}] Market selector header should show CLOSED badge`
        ).toBeVisible();
        await expect(
            this.closedMarketMessageContainer,
            `[${label}] Closed-market reopen banner should be visible on the trade form`
        ).toBeVisible();
        await expect(
            this.marketCountdownTimer,
            `[${label}] Countdown timer should be visible in the closed-market banner`
        ).toBeVisible();
    }
}
