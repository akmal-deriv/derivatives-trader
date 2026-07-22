# 🗺️ Feed Journey Catalog — Technical Reference

> Source of truth: `packages/trader/src/AppV2/Components/MarketSelector/market-selector.tsx` · `packages/trader/src/AppV2/Components/CurrentSpot/`
> Created: 2026-07-20 | Last updated: 2026-07-22 (removed symbolClass from Market interface; both viewports now use TradeParametersPage.selectMarket search-based selection; session_gated runtime fallback added)

---

## Section 1 — Journey Index

| Journey ID | Spec File                                   | Tags                                        |
| ---------- | ------------------------------------------- | ------------------------------------------- |
| Flow 1     | `feed/verify-all-markets-streaming.spec.ts` | `@feed @smoke @desktop @mobile @production` |

---

## Section 2 — Flow Details

### Flow 1 — All markets: feed active or closed state correct for every market in the dialog

```typescript
// Entry: unauthenticated, Multipliers trade type
await tradeParametersPage.gotoTradePage();
await tradeParametersPage.selectTradeType('Multipliers');

// Iterate over all ~65 markets from FeedPage.MARKETS; branch on status
for (const market of FeedPage.MARKETS) {
    // Both viewports: TradeParametersPage.selectMarket() — search-based via SmartCharts input (desktop)
    // or Quill action sheet search (mobile). mobileLabel overrides label for markets where mobile
    // renders a different name (e.g. 'Step Index 100' → 'Step 100 Index').
    await feedPage.selectMarket(market.label, market.mobileLabel);

    if (market.status === 'open') {
        // 24/7 synthetics — verify live feed
        await feedPage.verifySpotPriceVisible();
        const initialPrice = await feedPage.getCurrentSpotPrice();
        await feedPage.waitForPriceChange(initialPrice);
        const updatedPrice = await feedPage.getCurrentSpotPrice();
        expect(updatedPrice, `[${market.label}] Spot price should have changed`).not.toBe(initialPrice);
    } else {
        // Session-gated — verify closed state, or fall back to live feed if open at runtime
        await feedPage.verifyMarketClosedState(market.label);
        // Closed: .cq-symbol-closed-text (desktop) / .tag.tag__color--error (mobile) + banner + timer
        // Open at runtime: falls back to verifySpotPriceVisible()
    }
}
```

**Market data:** `FeedPage.MARKETS` (static property) — all ~65 symbols with `label`, optional `mobileLabel`, and `status`. No `symbolClass` — selection is name-based via search.

---

## Section 3 — POM Method Reference

| What the step does                                                                      | Method                                               |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Get current spot price text from market selector                                        | `feedPage.getCurrentSpotPrice()`                     |
| Wait until the spot price differs from a given value                                    | `feedPage.waitForPriceChange(previousPrice)`         |
| Assert the spot price is visible and non-empty                                          | `feedPage.verifySpotPriceVisible()`                  |
| Select market — viewport-aware via search (desktop: SmartCharts, mobile: Quill sheet)   | `feedPage.selectMarket(label, mobileLabel?)`         |
| Assert closed badge + reopen banner + countdown (or live feed fallback at runtime)      | `feedPage.verifyMarketClosedState(label)`            |
| Static array of all ~65 markets with `label`, optional `mobileLabel`, and `status`      | `FeedPage.MARKETS`                                   |
| Locator: animated spot price (`.cq-animated-price` / `.market-selector-info__price`)    | `feedPage.spotPrice`                                 |
| Locator: CLOSED badge (`.cq-symbol-closed-text` desktop / `.tag.tag__color--error` mob) | `feedPage.symbolClosedBadge`                         |
| Locator: reopen-time banner on trade form                                               | `feedPage.closedMarketMessageContainer`              |
| Locator: countdown timer inside reopen banner                                           | `feedPage.marketCountdownTimer`                      |
| Navigate to trade page (entry point)                                                    | `tradeParametersPage.gotoTradePage()`                |
| Switch to Multipliers trade type                                                        | `tradeParametersPage.selectTradeType('Multipliers')` |
