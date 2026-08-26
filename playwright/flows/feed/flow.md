# 📋 Feed Journey Spec — What to Test

> **Purpose:** Verifies every market's trade form loads correctly (Multipliers params render with
> no error), or shows the closed-market state for session-gated symbols. The redesigned trade page
> removed the live-ticking spot price from the DOM entirely (it now renders only on the chart
> `<canvas>`, which Playwright cannot read), so a per-market live-price assertion is no longer
> possible — a successful `selectMarketAndTradeType()` call is the strongest available signal that
> the `ticks`/`proposal` WebSocket subscriptions for that symbol actually resolved.
>
> **Feature location:** `packages/trader/src/AppV2/Components/MarketSelector/` · `packages/trader/src/AppV2/Components/TradeParameters/`
> **Entry:** Navigate to trade page root, then select market + Multipliers via `tradeParametersPage.selectMarketAndTradeType(market, 'Multipliers')`.
> **Authentication:** No authentication required — feed is visible to logged-out users.

---

## Flow 1 — All markets: feed active or closed state correct for every market in the dialog · `feed/verify-all-markets-streaming.spec.ts`

> Iterates over ALL markets available (~65 symbols across synthetics, stock indices, forex, crypto, and commodities) and asserts the correct state per symbol: always-open markets (synthetics, baskets, daily reset, jump, step) only need `selectMarketAndTradeType()` to succeed; session-gated markets (stock indices, forex, crypto, commodities) must additionally show the reopen-time banner and countdown timer on the trade form. Both desktop and mobile select markets via `TradeParametersPage.selectMarketAndTradeType()` (search-based). Session-gated markets that happen to be within trading hours at runtime skip the closed-state check (nothing further to assert).

| #   | Step                                     | Action                                                                                       | Expected Result                                                                                                                                       | Test Data                     |
| --- | ---------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 1   | Navigate to trade page                   | `tradeParametersPage.gotoTradePage()`                                                        | Trade page loads with default symbol and trade type                                                                                                   | —                             |
| 2   | For each market in `FeedPage.MARKETS`…   | Loop over all ~65 entries                                                                    | —                                                                                                                                                     | —                             |
| 2a  | Select market + Multipliers              | `tradeParametersPage.selectMarketAndTradeType(feedPage.resolveLabel(market), 'Multipliers')` | Market-selection search finds the symbol under the Multipliers group; trade form loads with Multiplier/Stake/Risk management params visible, no error | e.g. `'Volatility 100 Index'` |
| 2b  | **Branch: `status === 'session_gated'`** |                                                                                              |                                                                                                                                                       |                               |
| 2b1 | Assert closed state (runtime-aware)      | `feedPage.verifyMarketClosedState(label)`                                                    | If reopen banner is visible: banner + countdown timer both visible. If market is open at runtime: no-op (already covered by step 2a).                 | —                             |
