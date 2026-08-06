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
 * FeedPage — Verifies every market's trade form loads correctly (or shows the closed-market
 * state) after the WebSocket feed connects.
 *
 * The redesigned trade page no longer exposes the live-ticking spot price anywhere in the DOM
 * (the old SmartCharts symbol-info header — `.cq-animated-price` / `.market-selector-info__price`
 * — was removed; the price now renders only on the chart `<canvas>`, which Playwright cannot read).
 * So "the feed is alive" is instead verified indirectly: for each market, selecting it + Multipliers
 * succeeds and the trade form's params render with no error (asserted inside
 * `selectMarketAndTradeType()`'s own `verifyParamsForTradeType()` call) — this only happens once the
 * `ticks`/`proposal` subscriptions for that symbol have actually resolved.
 *
 * Navigation to the trade page and market/trade-type selection is handled by
 * `TradeParametersPage.gotoTradePage()` + `selectMarketAndTradeType(market, 'Multipliers')`.
 *
 * @example
 * ```typescript
 * await tradeParametersPage.gotoTradePage();
 * await tradeParametersPage.selectMarketAndTradeType('Volatility 100 Index', 'Multipliers');
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
        // ── Basket indices — weekday-only (closed on weekends) ─────────────────
        { label: 'Gold Basket', status: 'session_gated' },
        { label: 'AUD Basket', status: 'session_gated' },
        { label: 'EUR Basket', status: 'session_gated' },
        { label: 'GBP Basket', status: 'session_gated' },
        { label: 'USD Basket', status: 'session_gated' },
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
     * "This market will reopen at…" banner rendered by the trade form when the selected
     * market is outside its trading hours. Also doubles as the closed-state signal itself —
     * the redesign removed the old "CLOSED" badge from the chart header entirely, so this
     * banner's presence is now the only DOM-visible indicator that a market is closed.
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

    resolveLabel(market: Market): string {
        return this.isMobile && market.mobileLabel ? market.mobileLabel : market.label;
    }

    // ============================================
    // VERIFICATIONS
    // ============================================

    /**
     * Assert the closed-market UI state for a session-gated symbol.
     *
     * Checks two signals on both desktop and mobile:
     *   1. Trade form reopen-time banner (`.closed-market-message--container`)
     *   2. Countdown timer inside the banner (`.market-countdown-timer`)
     *
     * @param label - Human-readable market name used in assertion messages, e.g. `'Hong Kong 50'`.
     */
    async verifyMarketClosedState(label: string): Promise<void> {
        const isClosed = await this.closedMarketMessageContainer.isVisible().catch(() => false);

        if (!isClosed) {
            // Market is within trading hours at runtime — selectMarketAndTradeType() already
            // confirmed the trade form loaded without error, nothing further to assert here.
            return;
        }

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
