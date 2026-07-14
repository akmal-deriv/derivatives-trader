# 📋 Trade Journey Spec — What to Test

> **Purpose:** Describes the end-to-end buy + close flows for each trade type on `staging-dtrader.deriv.com`. Each dual-outcome trade type has a dedicated sub-flow per button.
>
> **Feature location:** `packages/trader/src/AppV2/Containers/Trade/` · `packages/trader/src/AppV2/Components/TradeParameters/` · `packages/trader/src/AppV2/Components/PurchaseButton/`
> **URL:** `https://staging-dtrader.deriv.com/` (trade page)
> **Authentication:** All flows start from a logged-in state (`loginPage.login()` in `beforeEach`)
> **Desktop source:** `trade-desktop.tsx` — inline trade params in a grid
> **Mobile source:** `trade-mobile.tsx` → `TradeParametersContainer` (swipeable bottom sheet)

---

## Flow 1 — Trade form loads with default state visible

### Flow 1a — Logged-out state

**Prerequisites:** No authentication. Market open.

| #   | Step                       | Action                                | Expected Result                       | Platform |
| --- | -------------------------- | ------------------------------------- | ------------------------------------- | -------- |
| 1   | Navigate to trade page     | `tradeParametersPage.gotoTradePage()` | Trade page loads at `/`               | Both     |
| 2   | Verify login button        | Observe header                        | Login button visible                  | Both     |
| 3   | Verify account info absent | Observe header                        | Account info not visible              | Both     |
| 4   | Verify trade type selector | Observe trade type row                | "View all trade types" button visible | Both     |
| 5   | Verify selected chip       | Observe trade type chips              | Rise/Fall chip selected by default    | Both     |
| 6   | Verify purchase button     | Observe buy area                      | Purchase button visible               | Both     |

### Flow 1b — Logged-in state

**Prerequisites:** Authenticated (real or demo account). Market open.

| #   | Step                               | Action                       | Expected Result                                             | Platform |
| --- | ---------------------------------- | ---------------------------- | ----------------------------------------------------------- | -------- |
| 1   | Login                              | `loginPage.login()`          | Redirected to trade page; API settled                       | Both     |
| 2   | Verify account info                | Observe header               | Account info, balance, deposit button visible               | Both     |
| 3   | Verify login button absent         | Observe header               | Login button not visible                                    | Both     |
| 4   | Verify market selector             | Observe market selector area | Market name + current spot price visible                    | Both     |
| 5   | Verify trade type selector         | Observe trade type row       | "View all trade types" button visible                       | Both     |
| 6   | Verify selected chip               | Observe trade type chips     | Rise/Fall chip selected by default                          | Both     |
| 7   | Verify Rise/Fall buttons           | Observe segmented control    | Rise and Fall buttons visible                               | Both     |
| 8   | Verify Duration + Stake            | Observe parameters           | Duration and Stake labels visible                           | Both     |
| 9   | Verify Allow equals                | Observe parameters           | Allow equals text visible                                   | Both     |
| 10  | Verify purchase button             | Observe buy area             | Purchase button visible                                     | Both     |
| 11  | Verify param container (mobile)    | Observe bottom sheet         | `trade-params-container` visible with `trade-params-handle` | Mobile   |
| 12  | Verify guide link (desktop)        | Observe trade params panel   | Guide link visible                                          | Desktop  |
| 13  | Verify network status (desktop)    | Observe footer               | Network status indicator visible                            | Desktop  |
| 14  | Verify fullscreen toggle (desktop) | Observe footer               | Fullscreen toggle visible                                   | Desktop  |
| 15  | Verify sidebar (desktop)           | Observe sidebar              | Home, Positions, Reports, Help, Language, Theme, Account    | Desktop  |
| 16  | Verify bottom nav (mobile)         | Observe bottom navigation    | Home, Trade, Positions, Menu tabs visible                   | Mobile   |

---

## Rise/Fall

### Flow 2.1 — Rise/Fall: buy Rise → close contract

**Prerequisites:** Authenticated with funded account. Symbol supporting Rise/Fall (e.g. Volatility 100 Index).
**Spec:** `playwright/tests/trade/rise-fall/verify-rise-fall.spec.ts` — `VERIFY Buy "Rise" Contract and Close`
**Unique params:** Duration (`15 min`), Stake (`10.50`), Allow equals toggle

| #   | Step                              | Action                                                         | Expected Result                                                 | Platform |
| --- | --------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------- | -------- |
| 1   | Navigate to trade page            | `page.goto(BASE_URL)` + `waitForDerivApiSettled`               | Trade page loaded                                               | Both     |
| 2   | Select market                     | `selectMarket('Volatility 100 Index')`                         | Market selector shows "Volatility 100 Index"                    | Both     |
| 3   | Select Rise/Fall trade type       | `selectTradeType('Rise/Fall')`                                 | Chip selected; Duration, Stake, Allow equals visible            | Both     |
| 4   | Select Rise option                | `clickRiseFallOption('Rise')`                                  | Purchase button turns green                                     | Both     |
| 5   | Select duration                   | `selectDuration('Minutes', '15 min')`                          | Duration field shows `15 min`                                   | Both     |
| 6   | Set stake                         | `setStake('10.50')`                                            | Stake field shows `10.50`                                       | Both     |
| 7   | Buy Rise contract                 | `clickBuy()` — captures payout                                 | Contract purchased                                              | Both     |
| 8   | Verify open position in Positions | `verifyOpenPositionsVisible()` + `verifyContractCardDetails()` | Card visible; balance reduced by stake                          | Both     |
| 9   | Verify open position in Reports   | `verifyOpenPositionsInReports()` — captures `buyId`            | Headers, row values, footer totals correct                      | Both     |
| 10  | Open contract details (open)      | `openFirstContract()` + `verifyContractDetailsPage()`          | Ref. ID, Duration, Start time, Entry spot, Barrier visible      | Both     |
| 11  | Close contract                    | `closeFirstContract()`                                         | Contract card disappears from Positions                         | Both     |
| 12  | Verify closed contract card       | `verifyClosedPositionsTab()` — captures P&L                    | Card shows market, trade type, stake, "Closed" status, P&L      | Both     |
| 13  | Open contract details (closed)    | `verifyClosedContractDetailsPage()` — captures `sellId`        | Buy + Sell Ref. IDs, Exit spot, Exit time visible; no Sell btn  | Both     |
| 14  | Verify balance after close        | `verifyBalanceAfterContractClose()`                            | Balance = balanceBeforeClose + stake + P&L                      | Both     |
| 15  | Reports — Trade table             | `verifyClosedContractInReports()` step 2                       | Row by `buyId`; dates, stake, contract value, P&L correct       | Both     |
| 16  | Reports — Statement               | `verifyClosedContractInReports()` step 3                       | Sell row (by `sellId`) + Buy row (by `buyId`); balances correct | Both     |

### Flow 2.2 — Rise/Fall: buy Fall → close contract

**Prerequisites:** Same as Flow 2.1.
**Spec:** `playwright/tests/trade/rise-fall/verify-rise-fall.spec.ts` — `VERIFY Buy "Fall" Contract and Close`

| #   | Step                              | Action                                                         | Expected Result                                                 | Platform |
| --- | --------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------- | -------- |
| 1   | Navigate to trade page            | `page.goto(BASE_URL)` + `waitForDerivApiSettled`               | Trade page loaded                                               | Both     |
| 2   | Select market                     | `selectMarket('Volatility 100 Index')`                         | Market selector shows "Volatility 100 Index"                    | Both     |
| 3   | Select Rise/Fall trade type       | `selectTradeType('Rise/Fall')`                                 | Chip selected; Duration, Stake, Allow equals visible            | Both     |
| 4   | Select Fall option                | `clickRiseFallOption('Fall')`                                  | Purchase button turns red                                       | Both     |
| 5   | Select duration                   | `selectDuration('Minutes', '15 min')`                          | Duration field shows `15 min`                                   | Both     |
| 6   | Set stake                         | `setStake('10.50')`                                            | Stake field shows `10.50`                                       | Both     |
| 7   | Buy Fall contract                 | `clickBuy()` — captures payout                                 | Contract purchased                                              | Both     |
| 8   | Verify open position in Positions | `verifyOpenPositionsVisible()` + `verifyContractCardDetails()` | Card visible; balance reduced by stake                          | Both     |
| 9   | Verify open position in Reports   | `verifyOpenPositionsInReports()` — captures `buyId`            | Headers, row values, footer totals correct                      | Both     |
| 10  | Open contract details (open)      | `openFirstContract()` + `verifyContractDetailsPage()`          | Ref. ID, Duration, Start time, Entry spot, Barrier visible      | Both     |
| 11  | Close contract                    | `closeFirstContract()`                                         | Contract card disappears from Positions                         | Both     |
| 12  | Verify closed contract card       | `verifyClosedPositionsTab()` — captures P&L                    | Card shows market, trade type, stake, "Closed" status, P&L      | Both     |
| 13  | Open contract details (closed)    | `verifyClosedContractDetailsPage()` — captures `sellId`        | Buy + Sell Ref. IDs, Exit spot, Exit time visible; no Sell btn  | Both     |
| 14  | Verify balance after close        | `verifyBalanceAfterContractClose()`                            | Balance = balanceBeforeClose + stake + P&L                      | Both     |
| 15  | Reports — Trade table             | `verifyClosedContractInReports()` step 2                       | Row by `buyId`; dates, stake, contract value, P&L correct       | Both     |
| 16  | Reports — Statement               | `verifyClosedContractInReports()` step 3                       | Sell row (by `sellId`) + Buy row (by `buyId`); balances correct | Both     |

---

## Rise/Fall (Allow Equals)

### Flow 2.3 — Rise/Fall Allow Equals: buy Rise → close contract

**Prerequisites:** Same as Flow 2.1.
**Spec:** `playwright/tests/trade/rise-fall/verify-rise-fall.spec.ts` — `VERIFY Buy "Rise" Contract with Allow Equals Enabled`
**Unique params:** Allow equals toggle enabled (changes contract to RISEEQUAL), Duration (`15 min`), Stake (`10.50`)
**Prerequisites:** Same as Flow 2.1.

| #   | Step                              | Action                                                         | Expected Result                                                 | Platform |
| --- | --------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------- | -------- |
| 1   | Navigate to trade page            | `page.goto(BASE_URL)` + `waitForDerivApiSettled`               | Trade page loaded                                               | Both     |
| 2   | Select market                     | `selectMarket('Volatility 100 Index')`                         | Market selector shows "Volatility 100 Index"                    | Both     |
| 3   | Select Rise/Fall trade type       | `selectTradeType('Rise/Fall')`                                 | Rise/Fall chip selected                                         | Both     |
| 4   | Select duration                   | `selectDuration('Minutes', '15 min')`                          | Duration field shows `15 min`                                   | Both     |
| 5   | Set stake amount                  | `setStake('10.50')`                                            | Stake input shows `10.50`                                       | Both     |
| 6   | Enable Allow equals               | `buyRiseAndVerify({ allowEquals: true })`                      | Toggle activated; contract type changes to RISEEQUAL            | Both     |
| 7   | Buy Rise contract                 | `clickBuy()` — captures payout                                 | Contract purchased                                              | Both     |
| 8   | Verify open position in Positions | `verifyOpenPositionsVisible()` + `verifyContractCardDetails()` | Card visible; balance reduced by stake                          | Both     |
| 9   | Verify open position in Reports   | `verifyOpenPositionsInReports()` — captures `buyId`            | Headers, row values, footer totals correct                      | Both     |
| 10  | Open contract details (open)      | `openFirstContract()` + `verifyContractDetailsPage()`          | Ref. ID, Duration, Start time, Entry spot, Barrier visible      | Both     |
| 11  | Close contract                    | `closeFirstContract()`                                         | Contract card disappears from Positions                         | Both     |
| 12  | Verify closed contract card       | `verifyClosedPositionsTab()` — captures P&L                    | Card shows market, trade type, stake, "Closed" status, P&L      | Both     |
| 13  | Open contract details (closed)    | `verifyClosedContractDetailsPage()` — captures `sellId`        | Buy + Sell Ref. IDs, Exit spot, Exit time visible; no Sell btn  | Both     |
| 14  | Verify balance after close        | `verifyBalanceAfterContractClose()`                            | Balance = balanceBeforeClose + stake + P&L                      | Both     |
| 15  | Reports — Trade table             | `verifyClosedContractInReports()` step 2                       | Row by `buyId`; dates, stake, contract value, P&L correct       | Both     |
| 16  | Reports — Statement               | `verifyClosedContractInReports()` step 3                       | Sell row (by `sellId`) + Buy row (by `buyId`); balances correct | Both     |

### Flow 2.4 — Rise/Fall Allow Equals: buy Fall → close contract

**Prerequisites:** Same as Flow 2.3.
**Spec:** `playwright/tests/trade/rise-fall/verify-rise-fall.spec.ts` — `VERIFY Buy "Fall" Contract with Allow Equals Enabled`
**Unique params:** Allow equals toggle enabled (changes contract to FALLEQUAL), Duration (`18 min`), Stake (`20.50`)

| #   | Step                              | Action                                                         | Expected Result                                                 | Platform |
| --- | --------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------- | -------- |
| 1   | Navigate to trade page            | `page.goto(BASE_URL)` + `waitForDerivApiSettled`               | Trade page loaded                                               | Both     |
| 2   | Select market                     | `selectMarket('Volatility 100 Index')`                         | Market selector shows "Volatility 100 Index"                    | Both     |
| 3   | Select Rise/Fall trade type       | `selectTradeType('Rise/Fall')`                                 | Rise/Fall chip selected                                         | Both     |
| 4   | Select duration                   | `selectDuration('Minutes', '18 min')`                          | Duration field shows `18 min`                                   | Both     |
| 5   | Set stake amount                  | `setStake('20.50')`                                            | Stake input shows `20.50`                                       | Both     |
| 6   | Enable Allow equals               | `buyFallAndVerify({ allowEquals: true })`                      | Toggle activated; contract type changes to FALLEQUAL            | Both     |
| 7   | Buy Fall contract                 | `clickBuy()` — captures payout                                 | Contract purchased                                              | Both     |
| 8   | Verify open position in Positions | `verifyOpenPositionsVisible()` + `verifyContractCardDetails()` | Card visible; balance reduced by stake                          | Both     |
| 9   | Verify open position in Reports   | `verifyOpenPositionsInReports()` — captures `buyId`            | Headers, row values, footer totals correct                      | Both     |
| 10  | Open contract details (open)      | `openFirstContract()` + `verifyContractDetailsPage()`          | Ref. ID, Duration, Start time, Entry spot, Barrier visible      | Both     |
| 11  | Close contract                    | `closeFirstContract()`                                         | Contract card disappears from Positions                         | Both     |
| 12  | Verify closed contract card       | `verifyClosedPositionsTab()` — captures P&L                    | Card shows market, trade type, stake, "Closed" status, P&L      | Both     |
| 13  | Open contract details (closed)    | `verifyClosedContractDetailsPage()` — captures `sellId`        | Buy + Sell Ref. IDs, Exit spot, Exit time visible; no Sell btn  | Both     |
| 14  | Verify balance after close        | `verifyBalanceAfterContractClose()`                            | Balance = balanceBeforeClose + stake + P&L                      | Both     |
| 15  | Reports — Trade table             | `verifyClosedContractInReports()` step 2                       | Row by `buyId`; dates, stake, contract value, P&L correct       | Both     |
| 16  | Reports — Statement               | `verifyClosedContractInReports()` step 3                       | Sell row (by `sellId`) + Buy row (by `buyId`); balances correct | Both     |

---

## Higher/Lower

### Flow 3.1 — Higher/Lower: buy Higher → close contract

**Prerequisites:** Authenticated with funded account. Symbol supporting Higher/Lower with barrier (e.g. Volatility 75 Index).
**Spec:** `playwright/tests/trade/higher-lower/verify-higher-lower.spec.ts` — `VERIFY Buy "Higher" Contract and Close`
**Unique params:** Barrier (above/below spot), Duration (`15 min`), Stake (`10.00`)

| #   | Step                              | Action                                                         | Expected Result                                                 | Platform |
| --- | --------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------- | -------- |
| 1   | Navigate to trade page            | `page.goto(BASE_URL)` + `waitForDerivApiSettled`               | Trade page loaded                                               | Both     |
| 2   | Select market                     | `selectMarket('Volatility 75 Index')`                          | Market selector shows "Volatility 75 Index"                     | Both     |
| 3   | Select Higher/Lower trade type    | `selectTradeType('Higher/Lower')`                              | Chip selected; Barrier, Duration, Stake visible                 | Both     |
| 4   | Select Higher option              | `clickHigherLowerOption('Higher')`                             | Purchase button turns green                                     | Both     |
| 5   | Select duration                   | `selectDuration('Minutes', '15 min')`                          | Duration field shows `15 min`                                   | Both     |
| 6   | Set stake                         | `setStake('10.00')`                                            | Stake field shows `10.00`                                       | Both     |
| 7   | Buy Higher contract               | `clickBuy()` — captures payout                                 | Contract purchased                                              | Both     |
| 8   | Verify open position in Positions | `verifyOpenPositionsVisible()` + `verifyContractCardDetails()` | Card visible; balance reduced by stake                          | Both     |
| 9   | Verify open position in Reports   | `verifyOpenPositionsInReports()` — captures `buyId`            | Headers, row values, footer totals correct                      | Both     |
| 10  | Open contract details (open)      | `openFirstContract()` + `verifyContractDetailsPage()`          | Ref. ID, Duration, Start time, Entry spot, Barrier visible      | Both     |
| 11  | Close contract                    | `closeFirstContract()`                                         | Contract card disappears from Positions                         | Both     |
| 12  | Verify closed contract card       | `verifyClosedPositionsTab()` — captures P&L                    | Card shows market, trade type, stake, "Closed" status, P&L      | Both     |
| 13  | Open contract details (closed)    | `verifyClosedContractDetailsPage()` — captures `sellId`        | Buy + Sell Ref. IDs, Exit spot, Exit time visible; no Sell btn  | Both     |
| 14  | Verify balance after close        | `verifyBalanceAfterContractClose()`                            | Balance = balanceBeforeClose + stake + P&L                      | Both     |
| 15  | Reports — Trade table             | `verifyClosedContractInReports()` step 2                       | Row by `buyId`; dates, stake, contract value, P&L correct       | Both     |
| 16  | Reports — Statement               | `verifyClosedContractInReports()` step 3                       | Sell row (by `sellId`) + Buy row (by `buyId`); balances correct | Both     |

### Flow 3.2 — Higher/Lower: buy Lower → close contract

**Prerequisites:** Same as Flow 3.1.
**Spec:** `playwright/tests/trade/higher-lower/verify-higher-lower.spec.ts` — `VERIFY Buy "Lower" Contract and Close`
**Unique params:** Duration (`18 min`), Stake (`10.00`)

| #   | Step                              | Action                                                         | Expected Result                                                 | Platform |
| --- | --------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------- | -------- |
| 1   | Navigate to trade page            | `page.goto(BASE_URL)` + `waitForDerivApiSettled`               | Trade page loaded                                               | Both     |
| 2   | Select market                     | `selectMarket('Volatility 75 Index')`                          | Market selector shows "Volatility 75 Index"                     | Both     |
| 3   | Select Higher/Lower trade type    | `selectTradeType('Higher/Lower')`                              | Chip selected; Barrier, Duration, Stake visible                 | Both     |
| 4   | Select Lower option               | `clickHigherLowerOption('Lower')`                              | Purchase button turns red                                       | Both     |
| 5   | Select duration                   | `selectDuration('Minutes', '18 min')`                          | Duration field shows `18 min`                                   | Both     |
| 6   | Set stake                         | `setStake('10.00')`                                            | Stake field shows `10.00`                                       | Both     |
| 7   | Buy Lower contract                | `clickBuy()` — captures payout                                 | Contract purchased                                              | Both     |
| 8   | Verify open position in Positions | `verifyOpenPositionsVisible()` + `verifyContractCardDetails()` | Card visible; balance reduced by stake                          | Both     |
| 9   | Verify open position in Reports   | `verifyOpenPositionsInReports()` — captures `buyId`            | Headers, row values, footer totals correct                      | Both     |
| 10  | Open contract details (open)      | `openFirstContract()` + `verifyContractDetailsPage()`          | Ref. ID, Duration, Start time, Entry spot, Barrier visible      | Both     |
| 11  | Close contract                    | `closeFirstContract()`                                         | Contract card disappears from Positions                         | Both     |
| 12  | Verify closed contract card       | `verifyClosedPositionsTab()` — captures P&L                    | Card shows market, trade type, stake, "Closed" status, P&L      | Both     |
| 13  | Open contract details (closed)    | `verifyClosedContractDetailsPage()` — captures `sellId`        | Buy + Sell Ref. IDs, Exit spot, Exit time visible; no Sell btn  | Both     |
| 14  | Verify balance after close        | `verifyBalanceAfterContractClose()`                            | Balance = balanceBeforeClose + stake + P&L                      | Both     |
| 15  | Reports — Trade table             | `verifyClosedContractInReports()` step 2                       | Row by `buyId`; dates, stake, contract value, P&L correct       | Both     |
| 16  | Reports — Statement               | `verifyClosedContractInReports()` step 3                       | Sell row (by `sellId`) + Buy row (by `buyId`); balances correct | Both     |

---

## Touch/No Touch

### Flow 4.1 — Touch/No Touch: buy Touch → close contract

**Prerequisites:** Authenticated with funded account. Symbol supporting Touch/No Touch (e.g. Volatility 75 Index).
**Spec:** `playwright/tests/trade/touch-no-touch/verify-touch-no-touch.spec.ts` — `VERIFY Buy "Touch" Contract and Close`
**Unique params:** Barrier, Duration (`15 min`), Stake (`10.00`)

| #   | Step                              | Action                                                         | Expected Result                                                 | Platform |
| --- | --------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------- | -------- |
| 1   | Navigate to trade page            | `page.goto(BASE_URL)` + `waitForDerivApiSettled`               | Trade page loaded                                               | Both     |
| 2   | Select market                     | `selectMarket('Volatility 75 Index')`                          | Market selector shows "Volatility 75 Index"                     | Both     |
| 3   | Select Touch/No Touch trade type  | `selectTradeType('Touch/No Touch')`                            | Chip selected; Barrier, Duration, Stake visible                 | Both     |
| 4   | Select Touch option               | `clickTouchNoTouchOption('Touch')`                             | Purchase button turns green                                     | Both     |
| 5   | Select duration                   | `selectDuration('Minutes', '15 min')`                          | Duration field shows `15 min`                                   | Both     |
| 6   | Set stake                         | `setStake('10.00')`                                            | Stake field shows `10.00`                                       | Both     |
| 7   | Buy Touch contract                | `clickBuy()` — captures payout                                 | Contract purchased                                              | Both     |
| 8   | Verify open position in Positions | `verifyOpenPositionsVisible()` + `verifyContractCardDetails()` | Card visible; balance reduced by stake                          | Both     |
| 9   | Verify open position in Reports   | `verifyOpenPositionsInReports()` — captures `buyId`            | Headers, row values, footer totals correct                      | Both     |
| 10  | Open contract details (open)      | `openFirstContract()` + `verifyContractDetailsPage()`          | Ref. ID, Duration, Start time, Entry spot, Barrier visible      | Both     |
| 11  | Close contract                    | `closeFirstContract()`                                         | Contract card disappears from Positions                         | Both     |
| 12  | Verify closed contract card       | `verifyClosedPositionsTab()` — captures P&L                    | Card shows market, trade type, stake, "Closed" status, P&L      | Both     |
| 13  | Open contract details (closed)    | `verifyClosedContractDetailsPage()` — captures `sellId`        | Buy + Sell Ref. IDs, Exit spot, Exit time visible; no Sell btn  | Both     |
| 14  | Verify balance after close        | `verifyBalanceAfterContractClose()`                            | Balance = balanceBeforeClose + stake + P&L                      | Both     |
| 15  | Reports — Trade table             | `verifyClosedContractInReports()` step 2                       | Row by `buyId`; dates, stake, contract value, P&L correct       | Both     |
| 16  | Reports — Statement               | `verifyClosedContractInReports()` step 3                       | Sell row (by `sellId`) + Buy row (by `buyId`); balances correct | Both     |

### Flow 4.2 — Touch/No Touch: buy No Touch → close contract

**Prerequisites:** Same as Flow 4.1.
**Spec:** `playwright/tests/trade/touch-no-touch/verify-touch-no-touch.spec.ts` — `VERIFY Buy "No Touch" Contract and Close`
**Unique params:** Duration (`18 min`), Stake (`10.00`)

| #   | Step                              | Action                                                         | Expected Result                                                 | Platform |
| --- | --------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------- | -------- |
| 1   | Navigate to trade page            | `page.goto(BASE_URL)` + `waitForDerivApiSettled`               | Trade page loaded                                               | Both     |
| 2   | Select market                     | `selectMarket('Volatility 75 Index')`                          | Market selector shows "Volatility 75 Index"                     | Both     |
| 3   | Select Touch/No Touch trade type  | `selectTradeType('Touch/No Touch')`                            | Chip selected; Barrier, Duration, Stake visible                 | Both     |
| 4   | Select No Touch option            | `clickTouchNoTouchOption('No Touch')`                          | Purchase button turns red                                       | Both     |
| 5   | Select duration                   | `selectDuration('Minutes', '18 min')`                          | Duration field shows `18 min`                                   | Both     |
| 6   | Set stake                         | `setStake('10.00')`                                            | Stake field shows `10.00`                                       | Both     |
| 7   | Buy No Touch contract             | `clickBuy()` — captures payout                                 | Contract purchased                                              | Both     |
| 8   | Verify open position in Positions | `verifyOpenPositionsVisible()` + `verifyContractCardDetails()` | Card visible; balance reduced by stake                          | Both     |
| 9   | Verify open position in Reports   | `verifyOpenPositionsInReports()` — captures `buyId`            | Headers, row values, footer totals correct                      | Both     |
| 10  | Open contract details (open)      | `openFirstContract()` + `verifyContractDetailsPage()`          | Ref. ID, Duration, Start time, Entry spot, Barrier visible      | Both     |
| 11  | Close contract                    | `closeFirstContract()`                                         | Contract card disappears from Positions                         | Both     |
| 12  | Verify closed contract card       | `verifyClosedPositionsTab()` — captures P&L                    | Card shows market, trade type, stake, "Closed" status, P&L      | Both     |
| 13  | Open contract details (closed)    | `verifyClosedContractDetailsPage()` — captures `sellId`        | Buy + Sell Ref. IDs, Exit spot, Exit time visible; no Sell btn  | Both     |
| 14  | Verify balance after close        | `verifyBalanceAfterContractClose()`                            | Balance = balanceBeforeClose + stake + P&L                      | Both     |
| 15  | Reports — Trade table             | `verifyClosedContractInReports()` step 2                       | Row by `buyId`; dates, stake, contract value, P&L correct       | Both     |
| 16  | Reports — Statement               | `verifyClosedContractInReports()` step 3                       | Sell row (by `sellId`) + Buy row (by `buyId`); balances correct | Both     |

---

## Matches/Differs

> **Structural exception — Ticks-only + no manual close:** Digit contracts support **Ticks duration only** (the duration popover has no unit-tab sidebar, just tick chips), and they **expire automatically** — there is no manual Close button. The tick duration is too short to reliably inspect the contract while open, so the flow opens the **open position's contract details right after purchase**, captures its buy reference ID, then **waits for the contract to settle in place** and verifies the **settled (closed)** contract — details page, Positions Closed tab, balance, and Reports (Trade table + Statement). The digit audit grid has **no Entry spot/Barrier** — instead a **Target** row (e.g. "Equals 5").

### Flow 5.1 — Matches/Differs: buy Matches → settle → verify closed

**Prerequisites:** Authenticated with funded account. Digits symbol (e.g. Volatility 10 Index).
**Spec:** `playwright/tests/trade/matches-differs/verify-matches-differs.spec.ts` — `VERIFY Buy "Matches" Contract`
**Unique params:** Last digit prediction, Duration (ticks), Stake (`10.00`)

| #   | Step                                 | Action                                                                             | Expected Result                                      | Platform |
| --- | ------------------------------------ | ---------------------------------------------------------------------------------- | ---------------------------------------------------- | -------- |
| 1   | Select market                        | `selectMarket('Volatility 10 Index')`                                              | Market selector shows "Volatility 10 Index"          | Both     |
| 2   | Select Matches/Differs trade type    | `selectTradeType('Matches/Differs')`                                               | Chip selected; last digit prediction + Stake visible | Both     |
| 3   | Select Matches                       | `clickMatchesDiffersOption('Matches')`                                             | Purchase button turns green                          | Both     |
| 4   | Select duration (ticks only)         | `selectTicksDuration('10 ticks')`                                                  | Duration field shows `10 ticks`                      | Both     |
| 5   | Set stake                            | `setStake('10.00')`                                                                | Stake field shows `10.00`                            | Both     |
| 6   | Select digit prediction              | `selectDigit('5')`                                                                 | Digit 5 selected                                     | Both     |
| 7   | Buy Matches contract                 | `clickBuy()` — captures payout                                                     | Contract purchased; balance reduced by stake         | Both     |
| 8   | Open the open position's details     | `openFirstContract()` + `getBuyReferenceId()`                                      | Buy reference ID captured (pins this contract)       | Both     |
| 9   | Wait for auto-expiry in place        | `waitForContractSettled()`                                                         | Sell reference ID appears (contract settled)         | Both     |
| 10  | Verify settled contract in Positions | Closed tab → `verifyClosedPositionsTab()` — captures signed P/L                    | Closed card shows market/type/stake/Closed + P/L     | Both     |
| 11  | Verify settled contract details      | `verifyClosedDigitContractDetailsPage()` — asserts Target digit, extracts `sellId` | Ref IDs, Duration, Target, Exit spot/time correct    | Both     |
| 12  | Verify final balance                 | `verifyBalanceAfterContractClose()`                                                | Balance = afterBuy + stake + P/L                     | Both     |
| 13  | Verify settled contract in Reports   | `verifyClosedContractInReports(buyId, sellId, …)`                                  | Trade table + Statement rows match                   | Both     |

### Flow 5.2 — Matches/Differs: buy Differs → settle → verify closed

**Prerequisites:** Same as Flow 5.1.
**Spec:** `playwright/tests/trade/matches-differs/verify-matches-differs.spec.ts` — `VERIFY Buy "Differs" Contract`
**Unique params:** Duration (ticks), Stake (`10.00`)

Identical chain to Flow 5.1 with `clickMatchesDiffersOption('Differs')` (purchase button turns red) — buy Differs → open details → settle in place → verify the closed contract in Positions, contract details, balance, and Reports.

---

## Over/Under

> **Structural exception — Ticks-only + no manual close:** Same digit-contract structure as Matches/Differs (see that section). Over/Under uses the same Ticks-only duration, tab selector → single colored purchase button, last-digit selector, and the **settle-in-place** verification chain. The audit **Target** row reads "Over N" / "Under N". **Invalid digits:** Over cannot predict 9, Under cannot predict 0 — use a middle digit (e.g. 5), valid for both.

### Flow 6.1 — Over/Under: buy Over → settle → verify closed

**Prerequisites:** Authenticated with funded account. Digits symbol (e.g. Volatility 10 Index).
**Spec:** `playwright/tests/trade/over-under/verify-over-under.spec.ts` — `VERIFY Buy "Over" Contract`
**Unique params:** Last digit prediction, Duration (ticks), Stake (`10.00`)

| #   | Step                                 | Action                                                                             | Expected Result                                  | Platform |
| --- | ------------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------ | -------- |
| 1   | Select market                        | `selectMarket('Volatility 10 Index')`                                              | Market selector shows "Volatility 10 Index"      | Both     |
| 2   | Select Over/Under trade type         | `selectTradeType('Over/Under')`                                                    | Chip selected; last digit prediction + Stake     | Both     |
| 3   | Select Over                          | `selectPredictionOption('Over', 'top')`                                            | Purchase button turns green                      | Both     |
| 4   | Select duration (ticks only)         | `selectTicksDuration('10 ticks')`                                                  | Duration field shows `10 ticks`                  | Both     |
| 5   | Set stake                            | `setStake('10.00')`                                                                | Stake field shows `10.00`                        | Both     |
| 6   | Select digit prediction              | `selectDigit('5')`                                                                 | Digit 5 selected                                 | Both     |
| 7   | Buy Over contract                    | `clickBuy()` — captures payout                                                     | Contract purchased; balance reduced by stake     | Both     |
| 8   | Open the open position's details     | `openFirstContract()` + `getBuyReferenceId()`                                      | Buy reference ID captured (pins this contract)   | Both     |
| 9   | Wait for auto-expiry in place        | `waitForContractSettled()`                                                         | Sell reference ID appears (contract settled)     | Both     |
| 10  | Verify settled contract in Positions | Closed tab → `verifyClosedPositionsTab()` — captures signed P/L                    | Closed card shows market/type/stake/Closed + P/L | Both     |
| 11  | Verify settled contract details      | `verifyClosedDigitContractDetailsPage()` — asserts Target digit, extracts `sellId` | Ref IDs, Duration, Target, Exit spot/time        | Both     |
| 12  | Verify final balance                 | `verifyBalanceAfterContractClose()`                                                | Balance = afterBuy + stake + P/L                 | Both     |
| 13  | Verify settled contract in Reports   | `verifyClosedContractInReports(buyId, sellId, …)`                                  | Trade table + Statement rows match               | Both     |

### Flow 6.2 — Over/Under: buy Under → settle → verify closed

**Prerequisites:** Same as Flow 6.1.
**Spec:** `playwright/tests/trade/over-under/verify-over-under.spec.ts` — `VERIFY Buy "Under" Contract`

Identical chain to Flow 6.1 with `selectPredictionOption('Under', 'bottom')` (purchase button turns red) — buy Under → open details → settle in place → verify the closed contract in Positions, contract details, balance, and Reports.

---

## Even/Odd

> **Structural exception — Ticks-only + no digit selector + no manual close:** Same digit-contract structure as Matches/Differs (see that section), but Even/Odd is the **simplest digit type — there is no last-digit selector** (the outcome is whether the final digit is even or odd). Uses the same Ticks-only duration, tab selector → single colored purchase button, and **settle-in-place** verification chain. The audit **Target** row reads "Even" / "Odd".

### Flow 7.1 — Even/Odd: buy Even → settle → verify closed

**Prerequisites:** Authenticated with funded account. Digits symbol (e.g. Volatility 10 Index).
**Spec:** `playwright/tests/trade/even-odd/verify-even-odd.spec.ts` — `VERIFY Buy "Even" Contract`
**Unique params:** Duration (ticks), Stake (`10.00`) — no digit selector

| #   | Step                                 | Action                                                                            | Expected Result                                  | Platform |
| --- | ------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------ | -------- |
| 1   | Select market                        | `selectMarket('Volatility 10 Index')`                                             | Market selector shows "Volatility 10 Index"      | Both     |
| 2   | Select Even/Odd trade type           | `selectTradeType('Even/Odd')`                                                     | Chip selected; Last digit prediction NOT visible | Both     |
| 3   | Select Even                          | `selectPredictionOption('Even', 'top')`                                           | Purchase button turns green                      | Both     |
| 4   | Select duration (ticks only)         | `selectTicksDuration('10 ticks')`                                                 | Duration field shows `10 ticks`                  | Both     |
| 5   | Set stake                            | `setStake('10.00')`                                                               | Stake field shows `10.00`                        | Both     |
| 6   | Buy Even contract                    | `clickBuy()` — captures payout                                                    | Contract purchased; balance reduced by stake     | Both     |
| 7   | Open the open position's details     | `openFirstContract()` + `getBuyReferenceId()`                                     | Buy reference ID captured (pins this contract)   | Both     |
| 8   | Wait for auto-expiry in place        | `waitForContractSettled()`                                                        | Sell reference ID appears (contract settled)     | Both     |
| 9   | Verify settled contract in Positions | Closed tab → `verifyClosedPositionsTab()` — captures signed P/L                   | Closed card shows market/type/stake/Closed + P/L | Both     |
| 10  | Verify settled contract details      | `verifyClosedDigitContractDetailsPage()` — Target reads "Even", extracts `sellId` | Ref IDs, Duration, Target, Exit spot/time        | Both     |
| 11  | Verify final balance                 | `verifyBalanceAfterContractClose()`                                               | Balance = afterBuy + stake + P/L                 | Both     |
| 12  | Verify settled contract in Reports   | `verifyClosedContractInReports(buyId, sellId, …)`                                 | Trade table + Statement rows match               | Both     |

### Flow 7.2 — Even/Odd: buy Odd → settle → verify closed

**Prerequisites:** Same as Flow 7.1.
**Spec:** `playwright/tests/trade/even-odd/verify-even-odd.spec.ts` — `VERIFY Buy "Odd" Contract`

Identical chain to Flow 7.1 with `selectPredictionOption('Odd', 'bottom')` (purchase button turns red) — buy Odd → open details → settle in place → verify the closed contract in Positions, contract details, balance, and Reports.

---

## Accumulators

> **Structural exception — close from trade page + auto-settle:** When an active accumulator is open, the purchase button on the trade page changes to "Close [amount] [currency]"; close is performed from the trade page directly (not the contract details footer). An accumulator can also **auto-settle** at any time — the spot hitting the **barrier** (loss) or the **take profit** (win) sells the contract, and the "Close" button reverts to "Buy". The implementation is therefore **close-reason agnostic**: it ensures the contract ends settled (manual close for 8.1; wait-for-auto-settle with a manual-close fallback for 8.2) and verifies the **settled (closed)** contract — Positions Closed tab, contract details, balance, and Reports — without asserting _how_ it closed. Because a low take profit can auto-settle within a tick or two, open-position assertions and the open-position Reports grid are **not** verified; the Take profit is instead asserted on the **trade form** before buying.

### Flow 8.1 — Accumulators without Take Profit: buy → close

**Prerequisites:** Authenticated with funded account. Symbol supporting Accumulators (e.g. Volatility 100 Index). Only one active accumulator per symbol at a time.
**Spec:** `playwright/tests/trade/accumulators/verify-accumulators.spec.ts` — `VERIFY Buy Accumulators Contract Without Take Profit and Close`
**Unique params:** Growth rate (`5%`), Stake (`10.00`) — NO Duration, Take profit left off

| #   | Step                              | Action                                                            | Expected Result                                                 | Platform |
| --- | --------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------- | -------- |
| 1   | Navigate to trade page            | `page.goto(BASE_URL)` + `waitForDerivApiSettled`                  | Trade page loaded                                               | Both     |
| 2   | Select market                     | `selectMarket('Volatility 100 Index')`                            | Market selector shows "Volatility 100 Index"                    | Both     |
| 3   | Select Accumulators trade type    | `selectTradeType('Accumulators')`                                 | Chip selected; Growth rate, Take profit, Stake visible          | Both     |
| 4   | Verify no Duration param          | Observe parameters                                                | "Duration" NOT visible                                          | Both     |
| 5   | Set growth rate to 5%             | `setGrowthRate('5%')`                                             | Growth rate shows `5%`                                          | Both     |
| 6   | Verify Take profit param visible  | Observe parameters                                                | "Take profit" parameter visible                                 | Both     |
| 7   | Verify Take profit is off         | Observe take profit toggle                                        | Take profit toggle is off by default                            | Both     |
| 8   | Set stake                         | `setStake('10.00')`                                               | Stake field shows `10.00`                                       | Both     |
| 9   | Buy Accumulators contract         | `clickBuy()` — captures payout                                    | Contract purchased                                              | Both     |
| 10  | Verify open position in Positions | `verifyOpenPositionsVisible()` + `verifyContractCardDetails()`    | Card visible; balance reduced by stake                          | Both     |
| 11  | Verify open position in Reports   | `verifyOpenPositionsInReports()` — captures `buyId`               | Headers, row values, footer totals correct                      | Both     |
| 12  | Close contract from trade page    | Click "Close [amount] [currency]" on purchase button (trade page) | Contract closed                                                 | Both     |
| 13  | Verify closed contract card       | `verifyClosedPositionsTab()` — captures P&L                       | Card shows market, trade type, stake, "Closed" status, P&L      | Both     |
| 14  | Verify balance after close        | `verifyBalanceAfterContractClose()`                               | Balance = balanceBeforeClose + stake + P&L                      | Both     |
| 15  | Reports — Trade table             | `verifyClosedContractInReports()` step 2                          | Row by `buyId`; dates, stake, contract value, P&L correct       | Both     |
| 16  | Reports — Statement               | `verifyClosedContractInReports()` step 3                          | Sell row (by `sellId`) + Buy row (by `buyId`); balances correct | Both     |

### Flow 8.2 — Accumulators with Take Profit: buy → TP closes contract

**Prerequisites:** Same as Flow 8.1.
**Spec:** `playwright/tests/trade/accumulators/verify-accumulators.spec.ts` — `VERIFY Buy Accumulators Contract With Take Profit and Close`
**Unique params:** Growth rate (`5%`), Take profit toggle + input (`4.00`) enabled

| #   | Step                              | Action                                                            | Expected Result                                                    | Platform |
| --- | --------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------ | -------- |
| 1   | Navigate to trade page            | `page.goto(BASE_URL)` + `waitForDerivApiSettled`                  | Trade page loaded                                                  | Both     |
| 2   | Select market                     | `selectMarket('Volatility 100 Index')`                            | Market selector shows "Volatility 100 Index"                       | Both     |
| 3   | Select Accumulators trade type    | `selectTradeType('Accumulators')`                                 | Chip selected; Growth rate, Take profit, Stake visible             | Both     |
| 4   | Set growth rate to 5%             | `setGrowthRate('5%')`                                             | Growth rate shows `5%`                                             | Both     |
| 5   | Set stake                         | `setStake('10.00')`                                               | Stake field shows `10.00`                                          | Both     |
| 6   | Enable take profit                | Toggle take profit on                                             | Take profit input appears (`dt_take_profit_input` / `dt_tp_input`) | Both     |
| 7   | Set take profit amount            | Enter `4.00` in take profit input                                 | Take profit shows `4.00`                                           | Both     |
| 8   | Save take profit                  | Click "Save"                                                      | Take profit applied                                                | Both     |
| 9   | Buy Accumulators contract         | `clickBuy()` — captures payout                                    | Contract purchased                                                 | Both     |
| 10  | Verify open position in Positions | `verifyOpenPositionsVisible()` + `verifyContractCardDetails()`    | Card visible; balance reduced by stake                             | Both     |
| 11  | Verify TP set in contract details | `openFirstContract()` + observe TP field                          | Contract details shows TP amount `4.00`                            | Both     |
| 12  | Close contract from trade page    | Click "Close [amount] [currency]" on purchase button (trade page) | Contract closed                                                    | Both     |
| 13  | Verify closed contract card       | `verifyClosedPositionsTab()` — captures P&L                       | Card shows market, trade type, stake, "Closed" status, P&L         | Both     |
| 14  | Verify balance after close        | `verifyBalanceAfterContractClose()`                               | Balance = balanceBeforeClose + stake + P&L                         | Both     |

---

## Multipliers

### Flow 9.1 — Multipliers no TP/SL: buy Up → close contract

**Prerequisites:** Authenticated with funded account. Symbol supporting Multipliers (e.g. Volatility 100 (1s) Index).
**Spec:** `playwright/tests/trade/multipliers/verify-multipliers-no-tpsl.spec.ts` — `VERIFY Buy "Up" Multipliers Contract and Close (without TP/SL)`
**Unique params:** Multiplier (`x200`), Stake (`5.40`) — NO Duration, NO TP/SL

> **Structural note:** Multipliers has no Duration param and no Barrier. The contract details page shows Multiplier value, Commission, Stop out level, and Entry/Exit spot details. Commission and Stop out are captured pre-buy from the info panel and asserted exactly in the closed contract details.

| #   | Step                              | Action                                                                                                  | Expected Result                                                                                                                                                         | Platform |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Navigate to trade page            | `page.goto(BASE_URL)` + `waitForDerivApiSettled`                                                        | Trade page loaded                                                                                                                                                       | Both     |
| 2   | Select market                     | `selectMarket('Volatility 100 (1s) Index')`                                                             | Market selector shows "Volatility 100 (1s) Index"                                                                                                                       | Both     |
| 3   | Select Multipliers trade type     | `selectTradeType('Multipliers')`                                                                        | Chip selected; Multiplier, Risk management, Stake visible                                                                                                               | Both     |
| 4   | Select Up direction               | `clickUpDownOption('Up')`                                                                               | "Up" segment selected                                                                                                                                                   | Both     |
| 5   | Set multiplier value              | `setMultiplier('x200')`                                                                                 | Multiplier field shows `x200`                                                                                                                                           | Both     |
| 6   | Set stake                         | `setStake('5.40')`                                                                                      | Stake field shows `5.40`                                                                                                                                                | Both     |
| 7   | Capture pre-buy values            | `commissionValue.innerText()` + `stopOutValue.innerText()`                                              | `commission` and `stopOut` captured for later assertion                                                                                                                 | Both     |
| 8   | Buy Up contract                   | `clickMultipliersBuy()`                                                                                 | Contract purchased; buy date captured                                                                                                                                   | Both     |
| 9   | Verify open position in Positions | `verifyOpenPositionsVisible()` + `verifyBalanceAfterContractPurchase()` + `verifyContractCardDetails()` | Card visible; balance reduced by stake                                                                                                                                  | Both     |
| 10  | Verify open position in Reports   | `verifyOpenPositionsInReportsForMultipliers(currency, stake, multiplier)`                               | Multiplier, currency, stake, contract cost, contract value all correct                                                                                                  | Both     |
| 11  | Open contract details (open)      | `verifyMultipliersContractDetailsPage()` — captures `buyId` + `entrySpot`                               | Ref. ID, Multiplier, Commission, Start time, Entry spot visible; mobile captures entry spot                                                                             | Both     |
| 12  | Close contract                    | `closeFirstContract()`                                                                                  | Contract card disappears from Positions                                                                                                                                 | Both     |
| 13  | Verify closed contract card       | `verifyClosedPositionsTab()` — captures `contractProfitLossAmount`                                      | Card shows market, trade type, stake, P&L                                                                                                                               | Both     |
| 14  | Open contract details (closed)    | `verifyClosedMultipliersContractDetailsPage()` — captures `sellId`                                      | Buy + Sell Ref. IDs; Multiplier, Stake, Commission, Stop out level, Take profit/Stop loss (Not set); Start time, Entry spot (exact), Exit time, Exit spot; no Close btn | Both     |
| 15  | Verify balance after close        | `verifyBalanceAfterContractClose()`                                                                     | Balance = balanceBeforeClose + stake + P&L                                                                                                                              | Both     |
| 16  | Reports — Trade table             | `verifyClosedContractInReports()` step 2                                                                | Row by `buyId`; dates, stake, contract value, P&L correct                                                                                                               | Both     |
| 17  | Reports — Statement               | `verifyClosedContractInReports()` step 3                                                                | Sell row (by `sellId`) + Buy row (by `buyId`); balances correct                                                                                                         | Both     |

> **Mobile date format:** Entry/exit details section renders dates as `DD Mon YYYY` (e.g. `07 Jul 2026`). The ISO `buyDate` is converted internally — no extra param needed.

### Flow 9.2 — Multipliers no TP/SL: buy Down → close contract

**Prerequisites:** Same as Flow 9.1.
**Spec:** `playwright/tests/trade/multipliers/verify-multipliers-no-tpsl.spec.ts` — `VERIFY Buy "Down" Multipliers Contract and Close (without TP/SL)`
**Unique params:** Multiplier (`x300`), Stake (`5.88`)

| #   | Step                              | Action                                                                                                  | Expected Result                                                                                                                                                         | Platform |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Navigate to trade page            | `page.goto(BASE_URL)` + `waitForDerivApiSettled`                                                        | Trade page loaded                                                                                                                                                       | Both     |
| 2   | Select market                     | `selectMarket('Volatility 100 (1s) Index')`                                                             | Market selector shows "Volatility 100 (1s) Index"                                                                                                                       | Both     |
| 3   | Select Multipliers trade type     | `selectTradeType('Multipliers')`                                                                        | Chip selected; Multiplier, Risk management, Stake visible                                                                                                               | Both     |
| 4   | Select Down direction             | `clickUpDownOption('Down')`                                                                             | "Down" segment selected                                                                                                                                                 | Both     |
| 5   | Set multiplier value              | `setMultiplier('x300')`                                                                                 | Multiplier field shows `x300`                                                                                                                                           | Both     |
| 6   | Set stake                         | `setStake('5.88')`                                                                                      | Stake field shows `5.88`                                                                                                                                                | Both     |
| 7   | Capture pre-buy values            | `commissionValue.innerText()` + `stopOutValue.innerText()`                                              | `commission` and `stopOut` captured for later assertion                                                                                                                 | Both     |
| 8   | Buy Down contract                 | `clickMultipliersBuy()`                                                                                 | Contract purchased; buy date captured                                                                                                                                   | Both     |
| 9   | Verify open position in Positions | `verifyOpenPositionsVisible()` + `verifyBalanceAfterContractPurchase()` + `verifyContractCardDetails()` | Card visible; balance reduced by stake                                                                                                                                  | Both     |
| 10  | Verify open position in Reports   | `verifyOpenPositionsInReportsForMultipliers(currency, stake, multiplier)`                               | Multiplier, currency, stake, contract cost, contract value all correct                                                                                                  | Both     |
| 11  | Open contract details (open)      | `verifyMultipliersContractDetailsPage()` — captures `buyId` + `entrySpot`                               | Ref. ID, Multiplier, Commission, Start time, Entry spot visible; mobile captures entry spot                                                                             | Both     |
| 12  | Close contract                    | `closeFirstContract()`                                                                                  | Contract card disappears from Positions                                                                                                                                 | Both     |
| 13  | Verify closed contract card       | `verifyClosedPositionsTab()` — captures `contractProfitLossAmount`                                      | Card shows market, trade type, stake, P&L                                                                                                                               | Both     |
| 14  | Open contract details (closed)    | `verifyClosedMultipliersContractDetailsPage()` — captures `sellId`                                      | Buy + Sell Ref. IDs; Multiplier, Stake, Commission, Stop out level, Take profit/Stop loss (Not set); Start time, Entry spot (exact), Exit time, Exit spot; no Close btn | Both     |
| 15  | Verify balance after close        | `verifyBalanceAfterContractClose()`                                                                     | Balance = balanceBeforeClose + stake + P&L                                                                                                                              | Both     |
| 16  | Reports — Trade table             | `verifyClosedContractInReports()` step 2                                                                | Row by `buyId`; dates, stake, contract value, P&L correct                                                                                                               | Both     |
| 17  | Reports — Statement               | `verifyClosedContractInReports()` step 3                                                                | Sell row (by `sellId`) + Buy row (by `buyId`); balances correct                                                                                                         | Both     |

---

### Flow 9.3 — Multipliers with Take Profit: buy Up → close contract

**Prerequisites:** Same as Flow 9.1.
**Spec:** `playwright/tests/trade/multipliers/verify-multipliers-with-tp.spec.ts` — `VERIFY Buy "Up" Multipliers Contract With Take Profit and Close`
**Unique params:** TP (`30.01`), Multiplier (`x160`), Stake (`10.00`), Market (`Volatility 25 (1s) Index`)

> **Implementation notes:**
>
> - TP input on mobile requires `pressSequentially` + `Tab` press to blur, then a 1500ms wait for the API response before clicking Save. The "acceptable range" hint can render from stale store state and is not a reliable guard alone — `is_api_response_tp_received_ref` must be `true` (set by API response) or `onSave()` returns early.
> - Commission is read from `.multipliers-information__container` on the trade page (same locator on desktop and mobile) — NOT from the stake action sheet estimate.
> - Open positions card on mobile renders TP as `"30.01"` (no `+` prefix); desktop renders `"+30.01"`.

| #   | Step                              | Action                                                                                                  | Expected Result                                                                                                                                                                    | Platform |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Navigate to trade page            | `page.goto(BASE_URL)` + `waitForDerivApiSettled`                                                        | Trade page loaded                                                                                                                                                                  | Both     |
| 2   | Select market                     | `selectMarket('Volatility 25 (1s) Index')`                                                              | Market selector shows "Volatility 25 (1s) Index"                                                                                                                                   | Both     |
| 3   | Select Multipliers trade type     | `selectTradeType('Multipliers')`                                                                        | Chip selected; Multiplier, Risk management, Stake visible                                                                                                                          | Both     |
| 4   | Select Up direction               | `clickUpDownOption('Up')`                                                                               | "Up" segment selected                                                                                                                                                              | Both     |
| 5   | Set multiplier value              | `setMultiplier('x160')`                                                                                 | Multiplier field shows `x160`                                                                                                                                                      | Both     |
| 6   | Set stake                         | `setStake('10.00')`                                                                                     | Stake field shows `10.00`                                                                                                                                                          | Both     |
| 7   | Capture pre-buy values            | `commissionValue.innerText()` + `stopOutValue.innerText()`                                              | `commission` and `stopOut` captured from `.multipliers-information__container`                                                                                                     | Both     |
| 8   | Set risk management (TP)          | `setRiskManagement({ takeProfit: '30.01' })` — opens panel, toggles TP on, types value, Tab, wait, Save | TP of `30.01` applied; risk management closes                                                                                                                                      | Both     |
| 9   | Buy Up contract                   | `clickMultipliersBuy()`                                                                                 | Contract purchased; buy date captured                                                                                                                                              | Both     |
| 10  | Verify open position in Positions | `verifyOpenPositionsVisible()` + `verifyBalanceAfterContractPurchase()` + `verifyContractCardDetails()` | Card visible; balance reduced by stake; TP shown as `30.01` (mobile) / `+30.01` (desktop)                                                                                          | Both     |
| 11  | Verify open position in Reports   | `verifyOpenPositionsInReportsForMultipliers(currency, stake, multiplier)`                               | Multiplier, currency, stake, contract cost, contract value all correct                                                                                                             | Both     |
| 12  | Open contract details (open)      | `verifyMultipliersContractDetailsPage()` — captures `buyId` + `entrySpot`                               | Ref. ID, Multiplier, Commission, Start time, Entry spot visible; TP amount shown                                                                                                   | Both     |
| 13  | Close contract                    | `closeFirstContract()`                                                                                  | Contract card disappears from Positions                                                                                                                                            | Both     |
| 14  | Verify closed contract card       | `verifyClosedPositionsTab()` — captures `contractProfitLossAmount`                                      | Card shows market, trade type, stake, P&L                                                                                                                                          | Both     |
| 15  | Open contract details (closed)    | `verifyClosedMultipliersContractDetailsPage()` — captures `sellId`                                      | Buy + Sell Ref. IDs; Multiplier, Stake, Commission, Stop out level, Take profit (`30.01`), Stop loss (Not set); Start time, Entry spot (exact), Exit time, Exit spot; no Close btn | Both     |
| 16  | Verify balance after close        | `verifyBalanceAfterContractClose()`                                                                     | Balance = balanceBeforeClose + stake + P&L                                                                                                                                         | Both     |
| 17  | Reports — Trade table             | `verifyClosedContractInReports()` step 2                                                                | Row by `buyId`; dates, stake, contract value, P&L correct                                                                                                                          | Both     |
| 18  | Reports — Statement               | `verifyClosedContractInReports()` step 3                                                                | Sell row (by `sellId`) + Buy row (by `buyId`); balances correct                                                                                                                    | Both     |

### Flow 9.4 — Multipliers with Take Profit: buy Down → close contract

**Prerequisites:** Same as Flow 9.3.
**Spec:** `playwright/tests/trade/multipliers/verify-multipliers-with-tp.spec.ts` — `VERIFY Buy "Down" Multipliers Contract With Take Profit and Close`
**Unique params:** TP (`21.32`), Stake (`11.11`), Multiplier (`x400`)

| #   | Step                              | Action                                                                                                  | Expected Result                                                                                                                                                                    | Platform |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Navigate to trade page            | `page.goto(BASE_URL)` + `waitForDerivApiSettled`                                                        | Trade page loaded                                                                                                                                                                  | Both     |
| 2   | Select market                     | `selectMarket('Volatility 25 (1s) Index')`                                                              | Market selector shows "Volatility 25 (1s) Index"                                                                                                                                   | Both     |
| 3   | Select Multipliers trade type     | `selectTradeType('Multipliers')`                                                                        | Chip selected                                                                                                                                                                      | Both     |
| 4   | Select Down direction             | `clickUpDownOption('Down')`                                                                             | "Down" segment selected                                                                                                                                                            | Both     |
| 5   | Set multiplier value              | `setMultiplier('x400')`                                                                                 | Multiplier field shows `x400`                                                                                                                                                      | Both     |
| 6   | Set stake                         | `setStake('11.11')`                                                                                     | Stake field shows `11.11`                                                                                                                                                          | Both     |
| 7   | Capture pre-buy values            | `commissionValue.innerText()` + `stopOutValue.innerText()`                                              | `commission` and `stopOut` captured from `.multipliers-information__container`                                                                                                     | Both     |
| 8   | Set risk management (TP)          | `setRiskManagement({ takeProfit: '21.32' })`                                                            | TP of `21.32` applied                                                                                                                                                              | Both     |
| 9   | Buy Down contract                 | `clickMultipliersBuy()`                                                                                 | Contract purchased; buy date captured                                                                                                                                              | Both     |
| 10  | Verify open position in Positions | `verifyOpenPositionsVisible()` + `verifyBalanceAfterContractPurchase()` + `verifyContractCardDetails()` | Card visible; balance reduced by stake; TP shown as `21.32` (mobile) / `+21.32` (desktop)                                                                                          | Both     |
| 11  | Verify open position in Reports   | `verifyOpenPositionsInReportsForMultipliers(currency, stake, multiplier)`                               | Multiplier, currency, stake, contract cost, contract value all correct                                                                                                             | Both     |
| 12  | Open contract details (open)      | `verifyMultipliersContractDetailsPage()` — captures `buyId` + `entrySpot`                               | Ref. ID, Multiplier, Commission, Start time, Entry spot visible; TP amount shown                                                                                                   | Both     |
| 13  | Close contract                    | `closeFirstContract()`                                                                                  | Contract card disappears from Positions                                                                                                                                            | Both     |
| 14  | Verify closed contract card       | `verifyClosedPositionsTab()` — captures `contractProfitLossAmount`                                      | Card shows market, trade type, stake, P&L                                                                                                                                          | Both     |
| 15  | Open contract details (closed)    | `verifyClosedMultipliersContractDetailsPage()` — captures `sellId`                                      | Buy + Sell Ref. IDs; Multiplier, Stake, Commission, Stop out level, Take profit (`21.32`), Stop loss (Not set); Start time, Entry spot (exact), Exit time, Exit spot; no Close btn | Both     |
| 16  | Verify balance after close        | `verifyBalanceAfterContractClose()`                                                                     | Balance = balanceBeforeClose + stake + P&L                                                                                                                                         | Both     |
| 17  | Reports — Trade table             | `verifyClosedContractInReports()` step 2                                                                | Row by `buyId`; dates, stake, contract value, P&L correct                                                                                                                          | Both     |
| 18  | Reports — Statement               | `verifyClosedContractInReports()` step 3                                                                | Sell row (by `sellId`) + Buy row (by `buyId`); balances correct                                                                                                                    | Both     |

---

### Flow 9.5 — Multipliers with Stop Loss: buy Up → close contract

**Prerequisites:** Same as Flow 9.1.
**Spec:** `playwright/tests/trade/multipliers/verify-multipliers-with-sl.spec.ts` — `VERIFY Buy "Up" Multipliers Contract With Stop Loss and Close`
**Unique params:** SL (`21.10`), Multiplier (`x200`), Stake (`25.05`), Market (`Volatility 50 (1s) Index`)

> **Implementation notes:**
>
> - SL input on mobile requires `pressSequentially` + `Tab` press to blur, then wait for the "Acceptable range" hint (`slAcceptableRangeHint`) to appear, then a 1500ms wait before clicking Save. The `is_api_response_received_ref` guard must be `true` (set by API response) or `onSave()` returns early.
> - Open positions card (mobile) renders SL as `-21.10 ` (negative prefix + trailing space) — use `new RegExp('^-${stopLoss}\\s*$')` in the assertion.
> - Contract details page (mobile) verifies: trade type (`Multipliers Up`), stake (`25.05 USD`), TP badge absent, SL badge present, SL toggle `aria-pressed="true"`, SL input value (`-21.10 USD`), start time contains `buyDate`, TP/SL history section with label/value rows.

| #   | Step                              | Action                                                                                                  | Expected Result                                                                                                                                                                    | Platform |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Navigate to trade page            | `page.goto(BASE_URL)` + `waitForDerivApiSettled`                                                        | Trade page loaded                                                                                                                                                                  | Both     |
| 2   | Select market                     | `selectMarket('Volatility 50 (1s) Index')`                                                              | Market selector shows "Volatility 50 (1s) Index"                                                                                                                                   | Both     |
| 3   | Select Multipliers trade type     | `selectTradeType('Multipliers')`                                                                        | Chip selected; Multiplier, Risk management, Stake visible                                                                                                                          | Both     |
| 4   | Select Up direction               | `clickUpDownOption('Up')`                                                                               | "Up" segment selected                                                                                                                                                              | Both     |
| 5   | Set multiplier value              | `setMultiplier('x200')`                                                                                 | Multiplier field shows `x200`                                                                                                                                                      | Both     |
| 6   | Set stake                         | `setStake('25.05')`                                                                                     | Stake field shows `25.05`                                                                                                                                                          | Both     |
| 7   | Capture pre-buy values            | `commissionValue.innerText()` + `stopOutValue.innerText()`                                              | `commission` and `stopOut` captured from `.multipliers-information__container`                                                                                                     | Both     |
| 8   | Set risk management (SL)          | `setRiskManagement({ stopLoss: '21.10' })` — opens panel, toggles SL on, types value, Tab, wait, Save   | SL of `21.10` applied; risk management closes                                                                                                                                      | Both     |
| 9   | Buy Up contract                   | `clickMultipliersBuy()`                                                                                 | Contract purchased; buy date captured                                                                                                                                              | Both     |
| 10  | Verify open position in Positions | `verifyOpenPositionsVisible()` + `verifyBalanceAfterContractPurchase()` + `verifyContractCardDetails()` | Card visible; balance reduced by stake; SL shown as `-21.10 ` (mobile) / `-21.10` (desktop)                                                                                        | Both     |
| 11  | Verify open position in Reports   | `verifyOpenPositionsInReportsForMultipliers(currency, stake, multiplier)`                               | Multiplier, currency, stake, contract cost, contract value all correct                                                                                                             | Both     |
| 12  | Open contract details (open)      | `verifyMultipliersContractDetailsPage()` — captures `buyId` + `entrySpot`                               | Ref. ID, Multiplier, Commission, Start time, Entry spot visible; SL amount shown; mobile: trade type `Multipliers Up`, stake, TP badge absent, SL badge present, toggles, history  | Both     |
| 13  | Close contract                    | `closeFirstContract()`                                                                                  | Contract card disappears from Positions                                                                                                                                            | Both     |
| 14  | Verify closed contract card       | `verifyClosedPositionsTab()` — captures `contractProfitLossAmount`                                      | Card shows market, trade type, stake, P&L                                                                                                                                          | Both     |
| 15  | Open contract details (closed)    | `verifyClosedMultipliersContractDetailsPage()` — captures `sellId`                                      | Buy + Sell Ref. IDs; Multiplier, Stake, Commission, Stop out level, Take profit (Not set), Stop loss (`21.10`); Start time, Entry spot (exact), Exit time, Exit spot; no Close btn | Both     |
| 16  | Verify balance after close        | `verifyBalanceAfterContractClose()`                                                                     | Balance = balanceBeforeClose + stake + P&L                                                                                                                                         | Both     |
| 17  | Reports — Trade table             | `verifyClosedContractInReports()` step 2                                                                | Row by `buyId`; dates, stake, contract value, P&L correct                                                                                                                          | Both     |
| 18  | Reports — Statement               | `verifyClosedContractInReports()` step 3                                                                | Sell row (by `sellId`) + Buy row (by `buyId`); balances correct                                                                                                                    | Both     |

> **Mobile SL display:** Open positions card renders SL as `-21.10 ` (negative prefix + trailing space) — asserted with `new RegExp('^-21.10\\s*$')`.
> **Mobile date format:** Entry/exit details section renders dates as `DD Mon YYYY` (e.g. `07 Jul 2026`). The ISO `buyDate` is converted internally — no extra param needed.

### Flow 9.6 — Multipliers with Stop Loss: buy Down → close contract

**Prerequisites:** Same as Flow 9.5.
**Spec:** `playwright/tests/trade/multipliers/verify-multipliers-with-sl.spec.ts` — `VERIFY Buy "Down" Multipliers Contract With Stop Loss and Close`
**Unique params:** SL (`23.01`), Multiplier (`x600`), Stake (`25.00`)

| #   | Step                              | Action                                                                                                  | Expected Result                                                                                                                                                                     | Platform |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Navigate to trade page            | `page.goto(BASE_URL)` + `waitForDerivApiSettled`                                                        | Trade page loaded                                                                                                                                                                   | Both     |
| 2   | Select market                     | `selectMarket('Volatility 50 (1s) Index')`                                                              | Market selector shows "Volatility 50 (1s) Index"                                                                                                                                    | Both     |
| 3   | Select Multipliers trade type     | `selectTradeType('Multipliers')`                                                                        | Chip selected                                                                                                                                                                       | Both     |
| 4   | Select Down direction             | `clickUpDownOption('Down')`                                                                             | "Down" segment selected                                                                                                                                                             | Both     |
| 5   | Set multiplier value              | `setMultiplier('x600')`                                                                                 | Multiplier field shows `x600`                                                                                                                                                       | Both     |
| 6   | Set stake                         | `setStake('25.00')`                                                                                     | Stake field shows `25.00`                                                                                                                                                           | Both     |
| 7   | Capture pre-buy values            | `commissionValue.innerText()` + `stopOutValue.innerText()`                                              | `commission` and `stopOut` captured from `.multipliers-information__container`                                                                                                      | Both     |
| 8   | Set risk management (SL)          | `setRiskManagement({ stopLoss: '23.01' })`                                                              | SL of `23.01` applied                                                                                                                                                               | Both     |
| 9   | Buy Down contract                 | `clickMultipliersBuy()`                                                                                 | Contract purchased; buy date captured                                                                                                                                               | Both     |
| 10  | Verify open position in Positions | `verifyOpenPositionsVisible()` + `verifyBalanceAfterContractPurchase()` + `verifyContractCardDetails()` | Card visible; balance reduced by stake; SL shown as `-23.01 ` (mobile) / `-23.01` (desktop)                                                                                         | Both     |
| 11  | Verify open position in Reports   | `verifyOpenPositionsInReportsForMultipliers(currency, stake, multiplier)`                               | Multiplier, currency, stake, contract cost, contract value all correct                                                                                                              | Both     |
| 12  | Open contract details (open)      | `verifyMultipliersContractDetailsPage()` — captures `buyId` + `entrySpot`                               | Ref. ID, Multiplier, Commission, Start time, Entry spot visible; SL amount shown; mobile: trade type `Multipliers Down`, stake, TP badge absent, SL badge present, toggles, history | Both     |
| 13  | Close contract                    | `closeFirstContract()`                                                                                  | Contract card disappears from Positions                                                                                                                                             | Both     |
| 14  | Verify closed contract card       | `verifyClosedPositionsTab()` — captures `contractProfitLossAmount`                                      | Card shows market, trade type, stake, P&L                                                                                                                                           | Both     |
| 15  | Open contract details (closed)    | `verifyClosedMultipliersContractDetailsPage()` — captures `sellId`                                      | Buy + Sell Ref. IDs; Multiplier, Stake, Commission, Stop out level, Take profit (Not set), Stop loss (`23.01`); Start time, Entry spot (exact), Exit time, Exit spot; no Close btn  | Both     |
| 16  | Verify balance after close        | `verifyBalanceAfterContractClose()`                                                                     | Balance = balanceBeforeClose + stake + P&L                                                                                                                                          | Both     |
| 17  | Reports — Trade table             | `verifyClosedContractInReports()` step 2                                                                | Row by `buyId`; dates, stake, contract value, P&L correct                                                                                                                           | Both     |
| 18  | Reports — Statement               | `verifyClosedContractInReports()` step 3                                                                | Sell row (by `sellId`) + Buy row (by `buyId`); balances correct                                                                                                                     | Both     |

---

### Flow 9.7 — Multipliers with Deal Cancellation: buy Up → cancel contract

**Prerequisites:** Same as Flow 9.1. Deal cancellation available for selected symbol.
**Spec:** `playwright/tests/trade/multipliers/verify-multipliers-deal-cancel.spec.ts` — `VERIFY Buy "Up" Multipliers Contract With Deal Cancellation and Cancel`
**Unique params:** Deal cancellation toggle inside Risk management; DC timer badge (`dt_deal_cancellation_badge`)

> **Structural exception:** Deal Cancellation contracts use a "Cancel [mm:ss]" button in the contract details footer — not "Close [amount] [currency]". The close flow ends at step 12 (cancel). No closed-tab verification or Reports/Statement steps follow because cancel returns the stake directly (no P&L row).

| #   | Step                              | Action                                                         | Expected Result                                                                                                   | Platform |
| --- | --------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Navigate to trade page            | `page.goto(BASE_URL)` + `waitForDerivApiSettled`               | Trade page loaded                                                                                                 | Both     |
| 2   | Select market                     | `selectMarket('Jump 10 Index')`                                | Market selector shows "Jump 10 Index"                                                                             | Both     |
| 3   | Select Multipliers trade type     | `selectTradeType('Multipliers')`                               | Chip selected                                                                                                     | Both     |
| 4   | Set stake                         | `setStake('20.00')`                                            | Stake field shows `20.00`                                                                                         | Both     |
| 5   | Set multiplier value              | Select `x10` in multiplier selector                            | Multiplier shows `x10`                                                                                            | Both     |
| 6   | Open Risk management              | Click "Risk management" param                                  | Panel opens                                                                                                       | Both     |
| 7   | Enable Deal cancellation          | Select "Deal cancellation" tab                                 | DC selected; TP/SL disabled ("Take profit and/or stop loss are not available while deal cancellation is active.") | Both     |
| 8   | Save                              | Click "Save"                                                   | DC applied                                                                                                        | Both     |
| 9   | Buy Up contract                   | `clickBuy()` — captures payout                                 | Contract purchased; DC timer badge visible (`dt_deal_cancellation_badge`)                                         | Both     |
| 10  | Verify open position in Positions | `verifyOpenPositionsVisible()` + `verifyContractCardDetails()` | Card visible; balance reduced by stake                                                                            | Both     |
| 11  | Open contract details             | `openFirstContract()`                                          | Footer shows "Cancel [mm:ss]" button                                                                              | Both     |
| 12  | Cancel contract                   | Click "Cancel [mm:ss]" button                                  | Contract cancelled; stake refunded                                                                                | Both     |

### Flow 9.8 — Multipliers with Deal Cancellation: buy Down → cancel contract

**Prerequisites:** Same as Flow 9.7.
**Spec:** `playwright/tests/trade/multipliers/verify-multipliers-deal-cancel.spec.ts` — `VERIFY Buy "Down" Multipliers Contract With Deal Cancellation and Cancel`

> **Structural exception:** Same as Flow 9.7 — cancel returns stake directly; no closed-tab or Reports/Statement verification.

| #   | Step                               | Action                                                         | Expected Result                                                           | Platform |
| --- | ---------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------- | -------- |
| 1–8 | Setup (same as Flow 9.7 steps 1–8) | Same setup steps                                               | DC applied                                                                | Both     |
| 9   | Buy Down contract                  | `clickBuy()` — captures payout                                 | Contract purchased; DC timer badge visible (`dt_deal_cancellation_badge`) | Both     |
| 10  | Verify open position in Positions  | `verifyOpenPositionsVisible()` + `verifyContractCardDetails()` | Card visible; balance reduced by stake                                    | Both     |
| 11  | Open contract details              | `openFirstContract()`                                          | Footer shows "Cancel [mm:ss]" button                                      | Both     |
| 12  | Cancel contract                    | Click "Cancel [mm:ss]" button                                  | Contract cancelled; stake refunded                                        | Both     |

---

## Turbos

> **Implementation note:** Turbos have no _trade-page_ (Accumulator-style) close button, but they **are early-sellable from the contract-details footer** (`isValidToSell`). The tests use a short **Minutes** duration (so the positions card shows a remaining-time countdown and `verifyContractCardDetails` works unchanged), stake **`10.50`**, verify the open position, then **close early via `ContractDetailsPage.sellContract()`** (which retries on `PriceMoved` slippage) and verify the full closed chain (Closed tab → balance-after-close → Reports). TP flows also assert the TP amount on the open contract details before closing.

### Flow 10.1 — Turbos without TP: buy Up → verify in positions

**Prerequisites:** Authenticated with funded account. Symbol supporting Turbos (e.g. Volatility 100 (1s) Index).
**Spec:** `playwright/tests/trade/turbos/verify-turbos.spec.ts` — `VERIFY Buy "Up" Turbos Contract`
**Unique params:** Duration, Payout per point (`dt_payout-per-point_wrapper`), Stake (`10.00`) — Take profit off by default

| #   | Step                              | Action                                                         | Expected Result                                   | Platform |
| --- | --------------------------------- | -------------------------------------------------------------- | ------------------------------------------------- | -------- |
| 1   | Navigate to trade page            | `page.goto(BASE_URL)` + `waitForDerivApiSettled`               | Trade page loaded                                 | Both     |
| 2   | Select market                     | `selectMarket('Volatility 100 (1s) Index')`                    | Market selector shows "Volatility 100 (1s) Index" | Both     |
| 3   | Select Turbos trade type          | `selectTradeType('Turbos')`                                    | Turbos chip selected                              | Both     |
| 4   | Verify Duration param visible     | Observe parameters                                             | "Duration" parameter visible                      | Both     |
| 5   | Verify Payout per point visible   | Observe parameters                                             | "Payout per point" parameter visible              | Both     |
| 6   | Verify Take profit param visible  | Observe parameters                                             | "Take profit" parameter visible                   | Both     |
| 7   | Verify Take profit is off         | Observe take profit toggle                                     | Take profit toggle is off by default              | Both     |
| 8   | Verify Barrier info panel visible | Observe below parameters                                       | Barrier info panel visible                        | Both     |
| 9   | Set stake                         | `setStake('10.00')`                                            | Stake field shows `10.00`                         | Both     |
| 10  | Buy Up contract                   | `clickBuy()` — captures payout                                 | Contract purchased                                | Both     |
| 11  | Verify open position in Positions | `verifyOpenPositionsVisible()` + `verifyContractCardDetails()` | Card visible; balance reduced by stake            | Both     |
| 12  | Verify open position in Reports   | `verifyOpenPositionsInReports()` — captures `buyId`            | Headers, row values, footer totals correct        | Both     |

### Flow 10.2 — Turbos without TP: buy Down → verify in positions

**Prerequisites:** Same as Flow 10.1.
**Spec:** `playwright/tests/trade/turbos/verify-turbos.spec.ts` — `VERIFY Buy "Down" Turbos Contract`
**Unique params:** Stake (`10.00`)

| #   | Step                              | Action                                                         | Expected Result                                   | Platform |
| --- | --------------------------------- | -------------------------------------------------------------- | ------------------------------------------------- | -------- |
| 1   | Navigate to trade page            | `page.goto(BASE_URL)` + `waitForDerivApiSettled`               | Trade page loaded                                 | Both     |
| 2   | Select market                     | `selectMarket('Volatility 100 (1s) Index')`                    | Market selector shows "Volatility 100 (1s) Index" | Both     |
| 3   | Select Turbos trade type          | `selectTradeType('Turbos')`                                    | Turbos chip selected                              | Both     |
| 4   | Set stake                         | `setStake('10.00')`                                            | Stake field shows `10.00`                         | Both     |
| 5   | Buy Down contract                 | `clickBuy()` — captures payout                                 | Contract purchased                                | Both     |
| 6   | Verify open position in Positions | `verifyOpenPositionsVisible()` + `verifyContractCardDetails()` | Card visible; balance reduced by stake            | Both     |
| 7   | Verify open position in Reports   | `verifyOpenPositionsInReports()` — captures `buyId`            | Headers, row values, footer totals correct        | Both     |

### Flow 10.3 — Turbos with Take Profit: buy Up → verify TP set in positions

**Prerequisites:** Same as Flow 10.1.
**Spec:** `playwright/tests/trade/turbos/verify-turbos-tp.spec.ts` — `VERIFY Buy "Up" Turbos Contract With Take Profit`
**Unique params:** TP (`20.00`), Stake (`10.00`)

| #   | Step                              | Action                                                         | Expected Result                                           | Platform |
| --- | --------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------- | -------- |
| 1   | Navigate to trade page            | `page.goto(BASE_URL)` + `waitForDerivApiSettled`               | Trade page loaded                                         | Both     |
| 2   | Select market                     | `selectMarket('Volatility 100 (1s) Index')`                    | Market selector shows "Volatility 100 (1s) Index"         | Both     |
| 3   | Select Turbos trade type          | `selectTradeType('Turbos')`                                    | Turbos chip selected                                      | Both     |
| 4   | Set stake                         | `setStake('10.00')`                                            | Stake field shows `10.00`                                 | Both     |
| 5   | Enable take profit                | Toggle take profit on                                          | TP input appears (`dt_take_profit_input` / `dt_tp_input`) | Both     |
| 6   | Set take profit amount            | Enter `20.00` in take profit input                             | TP input shows `20.00`                                    | Both     |
| 7   | Save take profit                  | Click "Save"                                                   | Take profit applied                                       | Both     |
| 8   | Buy Up contract                   | `clickBuy()` — captures payout                                 | Contract purchased                                        | Both     |
| 9   | Verify open position in Positions | `verifyOpenPositionsVisible()` + `verifyContractCardDetails()` | Card visible; balance reduced by stake                    | Both     |
| 10  | Open contract details             | `openFirstContract()` + `verifyContractDetailsPage()`          | Contract details shows TP amount `20.00`                  | Both     |
| 11  | Verify open position in Reports   | `verifyOpenPositionsInReports()` — captures `buyId`            | Headers, row values, footer totals correct                | Both     |

### Flow 10.4 — Turbos with Take Profit: buy Down → verify TP set in positions

**Prerequisites:** Same as Flow 10.3.
**Spec:** `playwright/tests/trade/turbos/verify-turbos-tp.spec.ts` — `VERIFY Buy "Down" Turbos Contract With Take Profit`
**Unique params:** TP (`20.00`), Stake (`10.00`)

| #   | Step                              | Action                                                         | Expected Result                                           | Platform |
| --- | --------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------- | -------- |
| 1   | Navigate to trade page            | `page.goto(BASE_URL)` + `waitForDerivApiSettled`               | Trade page loaded                                         | Both     |
| 2   | Select market                     | `selectMarket('Volatility 100 (1s) Index')`                    | Market selector shows "Volatility 100 (1s) Index"         | Both     |
| 3   | Select Turbos trade type          | `selectTradeType('Turbos')`                                    | Turbos chip selected                                      | Both     |
| 4   | Set stake                         | `setStake('10.00')`                                            | Stake field shows `10.00`                                 | Both     |
| 5   | Enable take profit                | Toggle take profit on                                          | TP input appears (`dt_take_profit_input` / `dt_tp_input`) | Both     |
| 6   | Set take profit amount            | Enter `20.00` in take profit input                             | TP input shows `20.00`                                    | Both     |
| 7   | Save take profit                  | Click "Save"                                                   | Take profit applied                                       | Both     |
| 8   | Buy Down contract                 | `clickBuy()` — captures payout                                 | Contract purchased                                        | Both     |
| 9   | Verify open position in Positions | `verifyOpenPositionsVisible()` + `verifyContractCardDetails()` | Card visible; balance reduced by stake                    | Both     |
| 10  | Open contract details             | `openFirstContract()` + `verifyContractDetailsPage()`          | Contract details shows TP amount `20.00`                  | Both     |
| 11  | Verify open position in Reports   | `verifyOpenPositionsInReports()` — captures `buyId`            | Headers, row values, footer totals correct                | Both     |

---

## Vanillas

> **Structural exception:** Vanillas contracts expire at duration end — there is no manual close button. The buy flow verifies purchase and presence in positions only (steps 1–10). Steps 11–18 of the standard chain (closed tab, contract details closed, balance after close, Reports) are not applicable.

### Flow 11.1 — Vanillas: buy Call → verify in positions

**Prerequisites:** Authenticated with funded account. Forex/Synthetics symbol supporting Vanillas (e.g. EUR/USD).
**Spec:** `playwright/tests/trade/vanillas/verify-vanillas.spec.ts` — `VERIFY Buy "Call" Vanillas Contract`
**Unique params:** Duration, Strike price (`dt_strike_wrapper`), Stake (`10.00`) — Payout per point info panel

| #   | Step                                 | Action                                                         | Expected Result                            | Platform |
| --- | ------------------------------------ | -------------------------------------------------------------- | ------------------------------------------ | -------- |
| 1   | Navigate to trade page               | `page.goto(BASE_URL)` + `waitForDerivApiSettled`               | Trade page loaded                          | Both     |
| 2   | Select market                        | `selectMarket('EUR/USD')`                                      | Market selector shows "EUR/USD"            | Both     |
| 3   | Select Vanillas trade type           | `selectTradeType('Vanillas')`                                  | Vanillas chip selected                     | Both     |
| 4   | Verify Strike price param visible    | Observe parameters                                             | "Strike price" parameter visible           | Both     |
| 5   | Verify Duration param visible        | Observe parameters                                             | "Duration" parameter visible               | Both     |
| 6   | Verify Payout per point info visible | Observe below parameters                                       | Payout per point info panel visible        | Both     |
| 7   | Set stake                            | `setStake('10.00')`                                            | Stake field shows `10.00`                  | Both     |
| 8   | Buy Call contract                    | `clickBuy()` — captures payout                                 | Contract purchased                         | Both     |
| 9   | Verify open position in Positions    | `verifyOpenPositionsVisible()` + `verifyContractCardDetails()` | Card visible; balance reduced by stake     | Both     |
| 10  | Verify open position in Reports      | `verifyOpenPositionsInReports()` — captures `buyId`            | Headers, row values, footer totals correct | Both     |

### Flow 11.2 — Vanillas: buy Put → verify in positions

**Prerequisites:** Same as Flow 11.1.
**Spec:** `playwright/tests/trade/vanillas/verify-vanillas.spec.ts` — `VERIFY Buy "Put" Vanillas Contract`
**Unique params:** Stake (`10.00`)

| #   | Step                              | Action                                                         | Expected Result                            | Platform |
| --- | --------------------------------- | -------------------------------------------------------------- | ------------------------------------------ | -------- |
| 1   | Navigate to trade page            | `page.goto(BASE_URL)` + `waitForDerivApiSettled`               | Trade page loaded                          | Both     |
| 2   | Select market                     | `selectMarket('EUR/USD')`                                      | Market selector shows "EUR/USD"            | Both     |
| 3   | Select Vanillas trade type        | `selectTradeType('Vanillas')`                                  | Vanillas chip selected                     | Both     |
| 4   | Set stake                         | `setStake('10.00')`                                            | Stake field shows `10.00`                  | Both     |
| 5   | Buy Put contract                  | `clickBuy()` — captures payout                                 | Contract purchased                         | Both     |
| 6   | Verify open position in Positions | `verifyOpenPositionsVisible()` + `verifyContractCardDetails()` | Card visible; balance reduced by stake     | Both     |
| 7   | Verify open position in Reports   | `verifyOpenPositionsInReports()` — captures `buyId`            | Headers, row values, footer totals correct | Both     |

---

## Gap Flows

### G1 — Insufficient balance → ServiceErrorSheet shown

| #   | Test case                                    | Steps                                                  | Expected Result                                                                |
| --- | -------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| 1   | Attempt trade with zero/insufficient balance | Account with balance below minimum stake → click "Buy" | `ServiceErrorSheet` with title "Insufficient balance" and "Deposit now" button |

> Requires account-state setup (zero or insufficient balance). Proposed spec: `trade/verify-insufficient-balance.spec.ts`

### G2 — Unauthenticated purchase attempt → login prompt sheet

| #   | Test case                      | Steps                                              | Expected Result                                                                                    |
| --- | ------------------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | Attempt trade while logged out | Navigate to trade page without login → click "Buy" | `ServiceErrorSheet` with title "Start trading with us" and "Login" / "Create free account" buttons |

> Requires unauthenticated session. Proposed spec: `trade/verify-unauthenticated-purchase.spec.ts`
