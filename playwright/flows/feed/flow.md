# 📋 Feed Journey Spec — What to Test

> **Purpose:** Verifies that the live WebSocket price feed is active and that the price displayed in the market selector header updates within a few seconds of page load.
>
> **Feature location:** `packages/trader/src/AppV2/Components/MarketSelector/` · `packages/trader/src/AppV2/Components/CurrentSpot/`
> **Entry:** Navigate to trade page root, then select Multipliers trade type via `tradeParametersPage.selectTradeType('Multipliers')`.
> **Authentication:** No authentication required — feed is visible to logged-out users.

---

## Flow 1 — All markets: feed active or closed state correct for every market in the dialog · `feed/verify-all-markets-streaming.spec.ts`

> Iterates over ALL markets available (~65 symbols across synthetics, stock indices, forex, crypto, and commodities) and asserts the correct state per symbol: always-open markets (synthetics, baskets, daily reset, jump, step) must show a live updating price; session-gated markets (stock indices, forex, crypto, commodities) must show the CLOSED badge in the market selector header plus the reopen-time banner and countdown timer on the trade form. Both desktop and mobile select markets via `TradeParametersPage.selectMarket()` (search-based). Session-gated markets that happen to be within trading hours at runtime fall back to verifying the live feed instead.

| #   | Step                                     | Action                                                            | Expected Result                                                                                                                                | Test Data                     |
| --- | ---------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 1   | Navigate to trade page                   | `tradeParametersPage.gotoTradePage()`                             | Trade page loads with default symbol and trade type                                                                                            | —                             |
| 1a  | Select Multipliers                       | `tradeParametersPage.selectTradeType('Multipliers')`              | Multipliers chip becomes selected; trade form updates                                                                                          | `'Multipliers'`               |
| 2   | For each market in `FeedPage.MARKETS`…   | Loop over all ~65 entries                                         | —                                                                                                                                              | —                             |
| 2a  | Select market (viewport-aware)           | `tradeParametersPage.selectMarket(feedPage.resolveLabel(market))` | SmartCharts search (desktop) or Quill action sheet (mobile); `resolveLabel` picks `mobileLabel` when set.                                      | e.g. `'Volatility 100 Index'` |
| 2b  | **Branch: `status === 'open'`**          |                                                                   |                                                                                                                                                |                               |
| 2b1 | Assert price is visible                  | `feedPage.verifySpotPriceVisible()`                               | Spot price element is visible and contains a non-empty string                                                                                  | —                             |
| 2b2 | Read initial price                       | `feedPage.getCurrentSpotPrice()`                                  | Non-empty price string returned                                                                                                                | —                             |
| 2b3 | Wait for price to change                 | `feedPage.waitForPriceChange(initialPrice)`                       | Spot price differs from initial value within 5 s — WebSocket feed confirmed active                                                             | timeout: 5 000 ms             |
| 2c  | **Branch: `status === 'session_gated'`** |                                                                   |                                                                                                                                                |                               |
| 2c1 | Assert closed state (runtime-aware)      | `feedPage.verifyMarketClosedState(label)`                         | If CLOSED badge is visible: badge + reopen banner + countdown timer all visible. If market is open at runtime: falls back to spot price check. | —                             |
