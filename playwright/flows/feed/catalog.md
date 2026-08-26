# 🗺️ Feed Journey Catalog — Technical Reference

> Source of truth: `packages/trader/src/AppV2/Components/MarketSelector/market-selector.tsx` · `packages/trader/src/AppV2/Components/TradeParameters/`
> Created: 2026-07-20 | Last updated: 2026-08-05 (redesign removed the live spot-price DOM element entirely — see below; switched to `selectMarketAndTradeType()`, removed the CLOSED badge check)

---

## Section 1 — Journey Index

| Journey ID | Spec File                                   | Tags                                        |
| ---------- | ------------------------------------------- | ------------------------------------------- |
| Flow 1     | `feed/verify-all-markets-streaming.spec.ts` | `@feed @smoke @desktop @mobile @production` |

---

## Section 2 — Flow Details

### Flow 1 — All markets: feed active or closed state correct for every market in the dialog

```typescript
// Entry: unauthenticated
await tradeParametersPage.gotoTradePage();

// Iterate over all ~65 markets from FeedPage.MARKETS; branch on status
for (const market of FeedPage.MARKETS) {
    // Both viewports: TradeParametersPage.selectMarketAndTradeType() — search-based via the unified
    // Market Selection modal. mobileLabel overrides label for markets where mobile renders a
    // different name (e.g. 'Step Index 100' → 'Step 100 Index'). This call itself asserts the
    // Multipliers params (Multiplier/Stake/Risk management/Buy button) render with no error — the
    // strongest available signal that the WS feed/proposal for this symbol resolved, now that the
    // redesign has no DOM-visible live price to check directly.
    await tradeParametersPage.selectMarketAndTradeType(feedPage.resolveLabel(market), 'Multipliers');

    if (market.status === 'session_gated') {
        // Session-gated — verify closed state, or no-op if open at runtime (already covered above)
        await feedPage.verifyMarketClosedState(market.label);
        // Closed: .closed-market-message--container (reopen banner) + .market-countdown-timer
    }
}
```

**Market data:** `FeedPage.MARKETS` (static property) — all ~65 symbols with `label`, optional `mobileLabel`, and `status`. No `symbolClass` — selection is name-based via search.

**Why there's no live-price assertion:** The pre-redesign trade page rendered the ticking spot price
via SmartCharts' `.cq-symbol-info` header (`.cq-animated-price` desktop / `.market-selector-info__price`
mobile) and a "CLOSED" badge (`.cq-symbol-closed-text` / `.tag.tag__color--error`) in that same header.
The redesign removed this header entirely — the price now renders only on the chart `<canvas>`, which
Playwright cannot read, and there is no DOM-visible "CLOSED" badge anymore either. The reopen-time
banner and countdown timer (`.closed-market-message--container` / `.market-countdown-timer`) are
unaffected and still render correctly for closed markets.

---

## Section 3 — POM Method Reference

| What the step does                                                                      | Method                                                            |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Select market + trade type — viewport-aware via search (unified Market Selection modal) | `tradeParametersPage.selectMarketAndTradeType(market, tradeType)` |
| Assert closed-market reopen banner + countdown (or no-op if open at runtime)            | `feedPage.verifyMarketClosedState(label)`                         |
| Resolve the display label for the current viewport (`mobileLabel` override)             | `feedPage.resolveLabel(market)`                                   |
| Static array of all ~65 markets with `label`, optional `mobileLabel`, and `status`      | `FeedPage.MARKETS`                                                |
| Locator: reopen-time banner on trade form                                               | `feedPage.closedMarketMessageContainer`                           |
| Locator: countdown timer inside reopen banner                                           | `feedPage.marketCountdownTimer`                                   |
| Navigate to trade page (entry point)                                                    | `tradeParametersPage.gotoTradePage()`                             |
