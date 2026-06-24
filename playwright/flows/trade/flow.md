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

### Flow 3.1 — Rise/Fall Allow Equals: buy Rise → close contract

**Prerequisites:** Same as Flow 2.1.
**Unique params:** Allow equals toggle enabled (changes contract to Rise/Fall Equal)

| #   | Step                         | Action                                           | Expected Result                                  | Platform |
| --- | ---------------------------- | ------------------------------------------------ | ------------------------------------------------ | -------- |
| 1   | Navigate to trade page       | `page.goto(BASE_URL)` + `waitForDerivApiSettled` | Trade page loaded                                | Both     |
| 2   | Select Rise/Fall trade type  | Click "Rise/Fall" chip                           | Rise/Fall chip selected                          | Both     |
| 3   | Enable Allow equals          | Toggle "Allow equals" on                         | Toggle activated                                 | Both     |
| 4   | Set stake amount             | Enter `10.00` in stake input                     | Stake input shows `10.00`                        | Both     |
| 5   | Buy Rise contract            | Click "Rise" button                              | Contract purchased; success notification appears | Both     |
| 6   | Navigate to contract details | Navigate to positions                            | Contract details page loads                      | Both     |
| 7   | Close contract               | Click "Close [amount] [currency]" button         | Contract closed                                  | Both     |

### Flow 3.2 — Rise/Fall Allow Equals: buy Fall → close contract

**Prerequisites:** Same as Flow 3.1.

| #   | Step                         | Action                                           | Expected Result                                  | Platform |
| --- | ---------------------------- | ------------------------------------------------ | ------------------------------------------------ | -------- |
| 1   | Navigate to trade page       | `page.goto(BASE_URL)` + `waitForDerivApiSettled` | Trade page loaded                                | Both     |
| 2   | Select Rise/Fall trade type  | Click "Rise/Fall" chip                           | Rise/Fall chip selected                          | Both     |
| 3   | Enable Allow equals          | Toggle "Allow equals" on                         | Toggle activated                                 | Both     |
| 4   | Set stake amount             | Enter `10.00` in stake input                     | Stake input shows `10.00`                        | Both     |
| 5   | Buy Fall contract            | Click "Fall" button                              | Contract purchased; success notification appears | Both     |
| 6   | Navigate to contract details | Navigate to positions                            | Contract details page loads                      | Both     |
| 7   | Close contract               | Click "Close [amount] [currency]" button         | Contract closed                                  | Both     |

---

## Higher/Lower

### Flow 4.1 — Higher/Lower: buy Higher → close contract

**Prerequisites:** Authenticated with funded account. Symbol supporting Higher/Lower with barrier (e.g. Volatility 75 Index).
**Unique params:** Barrier (Above spot / Below spot / Fixed barrier), Duration, Stake

| #   | Step                           | Action                                           | Expected Result                                  | Platform |
| --- | ------------------------------ | ------------------------------------------------ | ------------------------------------------------ | -------- |
| 1   | Navigate to trade page         | `page.goto(BASE_URL)` + `waitForDerivApiSettled` | Trade page loaded                                | Both     |
| 2   | Select Higher/Lower trade type | Click "Higher/Lower" chip                        | Higher/Lower chip selected                       | Both     |
| 3   | Verify Barrier param visible   | Observe parameters                               | "Barrier" parameter visible                      | Both     |
| 4   | Verify Duration param visible  | Observe parameters                               | "Duration" parameter visible                     | Both     |
| 5   | Set stake amount               | Enter `10.00` in stake input                     | Stake input shows `10.00`                        | Both     |
| 6   | Buy Higher contract            | Click "Higher" button                            | Contract purchased; success notification appears | Both     |
| 7   | Navigate to contract details   | Navigate to positions                            | Contract details page loads                      | Both     |
| 8   | Close contract                 | Click "Close [amount] [currency]" button         | Contract closed                                  | Both     |

### Flow 4.2 — Higher/Lower: buy Lower → close contract

**Prerequisites:** Same as Flow 4.1.

| #   | Step                           | Action                                           | Expected Result                                  | Platform |
| --- | ------------------------------ | ------------------------------------------------ | ------------------------------------------------ | -------- |
| 1   | Navigate to trade page         | `page.goto(BASE_URL)` + `waitForDerivApiSettled` | Trade page loaded                                | Both     |
| 2   | Select Higher/Lower trade type | Click "Higher/Lower" chip                        | Higher/Lower chip selected                       | Both     |
| 3   | Set stake amount               | Enter `10.00` in stake input                     | Stake input shows `10.00`                        | Both     |
| 4   | Buy Lower contract             | Click "Lower" button                             | Contract purchased; success notification appears | Both     |
| 5   | Navigate to contract details   | Navigate to positions                            | Contract details page loads                      | Both     |
| 6   | Close contract                 | Click "Close [amount] [currency]" button         | Contract closed                                  | Both     |

---

## Touch/No Touch

### Flow 5.1 — Touch/No Touch: buy Touch → close contract

**Prerequisites:** Authenticated with funded account. Symbol supporting Touch/No Touch.
**Unique params:** Barrier, Duration, Stake

| #   | Step                             | Action                                           | Expected Result                                  | Platform |
| --- | -------------------------------- | ------------------------------------------------ | ------------------------------------------------ | -------- |
| 1   | Navigate to trade page           | `page.goto(BASE_URL)` + `waitForDerivApiSettled` | Trade page loaded                                | Both     |
| 2   | Select Touch/No Touch trade type | Click "Touch/No Touch" chip                      | Touch/No Touch chip selected                     | Both     |
| 3   | Verify Barrier param visible     | Observe parameters                               | "Barrier" parameter visible                      | Both     |
| 4   | Set stake amount                 | Enter `10.00` in stake input                     | Stake input shows `10.00`                        | Both     |
| 5   | Buy Touch contract               | Click "Touch" button                             | Contract purchased; success notification appears | Both     |
| 6   | Navigate to contract details     | Navigate to positions                            | Contract details page loads                      | Both     |
| 7   | Close contract                   | Click "Close [amount] [currency]" button         | Contract closed                                  | Both     |

### Flow 5.2 — Touch/No Touch: buy No Touch → close contract

**Prerequisites:** Same as Flow 5.1.

| #   | Step                             | Action                                           | Expected Result                                  | Platform |
| --- | -------------------------------- | ------------------------------------------------ | ------------------------------------------------ | -------- |
| 1   | Navigate to trade page           | `page.goto(BASE_URL)` + `waitForDerivApiSettled` | Trade page loaded                                | Both     |
| 2   | Select Touch/No Touch trade type | Click "Touch/No Touch" chip                      | Touch/No Touch chip selected                     | Both     |
| 3   | Set stake amount                 | Enter `10.00` in stake input                     | Stake input shows `10.00`                        | Both     |
| 4   | Buy No Touch contract            | Click "No Touch" button                          | Contract purchased; success notification appears | Both     |
| 5   | Navigate to contract details     | Navigate to positions                            | Contract details page loads                      | Both     |
| 6   | Close contract                   | Click "Close [amount] [currency]" button         | Contract closed                                  | Both     |

---

## Matches/Differs

### Flow 6.1 — Matches/Differs: buy Matches → wait for expiry

**Prerequisites:** Authenticated with funded account. Digits symbol (e.g. Volatility 10 Index).
**Unique params:** Last digit prediction (`dt_digit_stats_percentage`), Duration, Stake

| #   | Step                                 | Action                                           | Expected Result                                            | Platform |
| --- | ------------------------------------ | ------------------------------------------------ | ---------------------------------------------------------- | -------- |
| 1   | Navigate to trade page               | `page.goto(BASE_URL)` + `waitForDerivApiSettled` | Trade page loaded                                          | Both     |
| 2   | Select Matches/Differs trade type    | Click "Matches/Differs" chip                     | Matches/Differs chip selected                              | Both     |
| 3   | Verify last digit prediction visible | Observe parameters                               | Digit selector (0–9) visible (`dt_digit_stats_percentage`) | Both     |
| 4   | Set stake amount                     | Enter `10.00` in stake input                     | Stake input shows `10.00`                                  | Both     |
| 5   | Select digit prediction              | Click digit "5" in the digit selector            | Digit 5 selected                                           | Both     |
| 6   | Buy Matches contract                 | Click "Matches" button                           | Contract purchased; success notification appears           | Both     |
| 7   | Navigate to positions                | Navigate to positions                            | Contract card visible (`dt_contract_card`)                 | Both     |
| 8   | Wait for contract to expire          | Observe contract status                          | Contract closes automatically at expiry                    | Both     |

> **No manual close for Matches/Differs** — digit contracts expire automatically at end of duration.

### Flow 6.2 — Matches/Differs: buy Differs → wait for expiry

**Prerequisites:** Same as Flow 6.1.

| #   | Step                              | Action                                           | Expected Result                                  | Platform |
| --- | --------------------------------- | ------------------------------------------------ | ------------------------------------------------ | -------- |
| 1   | Navigate to trade page            | `page.goto(BASE_URL)` + `waitForDerivApiSettled` | Trade page loaded                                | Both     |
| 2   | Select Matches/Differs trade type | Click "Matches/Differs" chip                     | Matches/Differs chip selected                    | Both     |
| 3   | Set stake amount                  | Enter `10.00` in stake input                     | Stake input shows `10.00`                        | Both     |
| 4   | Select digit prediction           | Click digit "5" in the digit selector            | Digit 5 selected                                 | Both     |
| 5   | Buy Differs contract              | Click "Differs" button                           | Contract purchased; success notification appears | Both     |
| 6   | Navigate to positions             | Navigate to positions                            | Contract card visible (`dt_contract_card`)       | Both     |
| 7   | Wait for contract to expire       | Observe contract status                          | Contract closes automatically at expiry          | Both     |

---

## Over/Under

### Flow 7.1 — Over/Under: buy Over → wait for expiry

**Prerequisites:** Authenticated with funded account. Digits symbol.
**Unique params:** Last digit prediction (`dt_digit_stats_percentage`), Duration, Stake

| #   | Step                                 | Action                                           | Expected Result                                      | Platform |
| --- | ------------------------------------ | ------------------------------------------------ | ---------------------------------------------------- | -------- |
| 1   | Navigate to trade page               | `page.goto(BASE_URL)` + `waitForDerivApiSettled` | Trade page loaded                                    | Both     |
| 2   | Select Over/Under trade type         | Click "Over/Under" chip                          | Over/Under chip selected                             | Both     |
| 3   | Verify last digit prediction visible | Observe parameters                               | Digit selector visible (`dt_digit_stats_percentage`) | Both     |
| 4   | Set stake amount                     | Enter `10.00` in stake input                     | Stake input shows `10.00`                            | Both     |
| 5   | Select digit barrier                 | Click digit "5" in the digit selector            | Digit 5 selected                                     | Both     |
| 6   | Buy Over contract                    | Click "Over" button                              | Contract purchased; success notification appears     | Both     |
| 7   | Navigate to positions                | Navigate to positions                            | Contract card visible (`dt_contract_card`)           | Both     |
| 8   | Wait for contract to expire          | Observe contract status                          | Contract closes automatically at expiry              | Both     |

### Flow 7.2 — Over/Under: buy Under → wait for expiry

**Prerequisites:** Same as Flow 7.1.

| #   | Step                         | Action                                           | Expected Result                                  | Platform |
| --- | ---------------------------- | ------------------------------------------------ | ------------------------------------------------ | -------- |
| 1   | Navigate to trade page       | `page.goto(BASE_URL)` + `waitForDerivApiSettled` | Trade page loaded                                | Both     |
| 2   | Select Over/Under trade type | Click "Over/Under" chip                          | Over/Under chip selected                         | Both     |
| 3   | Set stake amount             | Enter `10.00` in stake input                     | Stake input shows `10.00`                        | Both     |
| 4   | Select digit barrier         | Click digit "5" in the digit selector            | Digit 5 selected                                 | Both     |
| 5   | Buy Under contract           | Click "Under" button                             | Contract purchased; success notification appears | Both     |
| 6   | Navigate to positions        | Navigate to positions                            | Contract card visible (`dt_contract_card`)       | Both     |
| 7   | Wait for contract to expire  | Observe contract status                          | Contract closes automatically at expiry          | Both     |

---

## Even/Odd

### Flow 8.1 — Even/Odd: buy Even → wait for expiry

**Prerequisites:** Authenticated with funded account. Digits symbol.
**Unique params:** Duration, Stake — no digit selector (any even/odd final digit wins)

| #   | Step                        | Action                                           | Expected Result                                  | Platform |
| --- | --------------------------- | ------------------------------------------------ | ------------------------------------------------ | -------- |
| 1   | Navigate to trade page      | `page.goto(BASE_URL)` + `waitForDerivApiSettled` | Trade page loaded                                | Both     |
| 2   | Select Even/Odd trade type  | Click "Even/Odd" chip                            | Even/Odd chip selected                           | Both     |
| 3   | Verify no last digit param  | Observe parameters                               | Last digit prediction NOT visible                | Both     |
| 4   | Set stake amount            | Enter `10.00` in stake input                     | Stake input shows `10.00`                        | Both     |
| 5   | Buy Even contract           | Click "Even" button                              | Contract purchased; success notification appears | Both     |
| 6   | Navigate to positions       | Navigate to positions                            | Contract card visible (`dt_contract_card`)       | Both     |
| 7   | Wait for contract to expire | Observe contract status                          | Contract closes automatically at expiry          | Both     |

### Flow 8.2 — Even/Odd: buy Odd → wait for expiry

**Prerequisites:** Same as Flow 8.1.

| #   | Step                        | Action                                           | Expected Result                                  | Platform |
| --- | --------------------------- | ------------------------------------------------ | ------------------------------------------------ | -------- |
| 1   | Navigate to trade page      | `page.goto(BASE_URL)` + `waitForDerivApiSettled` | Trade page loaded                                | Both     |
| 2   | Select Even/Odd trade type  | Click "Even/Odd" chip                            | Even/Odd chip selected                           | Both     |
| 3   | Set stake amount            | Enter `10.00` in stake input                     | Stake input shows `10.00`                        | Both     |
| 4   | Buy Odd contract            | Click "Odd" button                               | Contract purchased; success notification appears | Both     |
| 5   | Navigate to positions       | Navigate to positions                            | Contract card visible (`dt_contract_card`)       | Both     |
| 6   | Wait for contract to expire | Observe contract status                          | Contract closes automatically at expiry          | Both     |

---

## Accumulators

### Flow 9.1 — Accumulators without Take Profit: buy → close

**Prerequisites:** Authenticated with funded account. Symbol supporting Accumulators (e.g. Volatility 100 Index). Only one active accumulator per symbol at a time.
**Unique params:** Growth rate, Stake — NO Duration, Take profit left off

| #   | Step                             | Action                                                            | Expected Result                                  | Platform |
| --- | -------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------ | -------- |
| 1   | Navigate to trade page           | `page.goto(BASE_URL)` + `waitForDerivApiSettled`                  | Trade page loaded                                | Both     |
| 2   | Select Accumulators trade type   | Click "Accumulators" chip                                         | Accumulators chip selected                       | Both     |
| 3   | Verify no Duration param         | Observe parameters                                                | "Duration" NOT visible                           | Both     |
| 4   | Verify Growth rate param visible | Observe parameters                                                | "Growth rate" parameter visible                  | Both     |
| 5   | Verify Take profit param visible | Observe parameters                                                | "Take profit" parameter visible                  | Both     |
| 6   | Verify Take profit is off        | Observe take profit toggle                                        | Take profit toggle is off by default             | Both     |
| 7   | Set stake amount                 | Enter `10.00` in stake input                                      | Stake input shows `10.00`                        | Both     |
| 8   | Buy Accumulators contract        | Click "Buy" button                                                | Contract purchased; success notification appears | Both     |
| 9   | Close contract                   | Click "Close [amount] [currency]" on purchase button (trade page) | Contract closed                                  | Both     |

> **Accumulator close:** When an active accumulator is open for the current symbol, the purchase button on the trade page changes to "Close [amount] [currency]". Close from the trade page directly without navigating to contract details.

### Flow 9.2 — Accumulators with Take Profit: buy → TP closes contract

**Prerequisites:** Same as Flow 9.1.
**Unique params:** Take profit toggle + input enabled

| #   | Step                           | Action                                                            | Expected Result                                                    | Platform |
| --- | ------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------ | -------- |
| 1   | Navigate to trade page         | `page.goto(BASE_URL)` + `waitForDerivApiSettled`                  | Trade page loaded                                                  | Both     |
| 2   | Select Accumulators trade type | Click "Accumulators" chip                                         | Accumulators chip selected                                         | Both     |
| 3   | Set stake amount               | Enter `10.00` in stake input                                      | Stake input shows `10.00`                                          | Both     |
| 4   | Enable take profit             | Toggle take profit on                                             | Take profit input appears (`dt_take_profit_input` / `dt_tp_input`) | Both     |
| 5   | Set take profit amount         | Enter `20.00` in take profit input                                | Take profit shows `20.00`                                          | Both     |
| 6   | Save take profit               | Click "Save"                                                      | Take profit applied                                                | Both     |
| 7   | Buy Accumulators contract      | Click "Buy" button                                                | Contract purchased; success notification appears                   | Both     |
| 8   | Verify take profit is set      | Navigate to positions → open contract                             | Contract details shows TP amount `20.00`                           | Both     |
| 9   | Close contract                 | Click "Close [amount] [currency]" on purchase button (trade page) | Contract closed                                                    | Both     |

---

## Multipliers

### Flow 10.1 — Multipliers no TP/SL: buy Up → close contract

**Prerequisites:** Authenticated with funded account. Symbol supporting Multipliers (e.g. Jump 10 Index).
**Unique params:** Multiplier, Stake, Risk management (TP/SL/Deal cancellation) — NO Duration

| #   | Step                            | Action                                           | Expected Result                                  | Platform |
| --- | ------------------------------- | ------------------------------------------------ | ------------------------------------------------ | -------- |
| 1   | Navigate to trade page          | `page.goto(BASE_URL)` + `waitForDerivApiSettled` | Trade page loaded                                | Both     |
| 2   | Select Multipliers trade type   | Click "Multipliers" chip                         | Multipliers chip selected                        | Both     |
| 3   | Verify no Duration param        | Observe parameters                               | "Duration" NOT visible                           | Both     |
| 4   | Verify Multiplier param visible | Observe parameters                               | "Multiplier" parameter visible                   | Both     |
| 5   | Verify Risk management visible  | Observe parameters                               | "Risk management" parameter visible              | Both     |
| 6   | Set stake amount                | Enter `20.00` in stake input                     | Stake input shows `20.00`                        | Both     |
| 7   | Set multiplier value            | Select `x200` in multiplier selector             | Multiplier shows `x200`                          | Both     |
| 8   | Buy Up contract                 | Click "Up" button                                | Contract purchased; success notification appears | Both     |
| 9   | Navigate to contract details    | Navigate to positions → open contract            | Contract details page loads                      | Both     |
| 10  | Close contract                  | Click "Close [amount] [currency]" in footer      | Contract closed                                  | Both     |

### Flow 10.2 — Multipliers no TP/SL: buy Down → close contract

**Prerequisites:** Same as Flow 10.1.

| #   | Step                          | Action                                           | Expected Result                                  | Platform |
| --- | ----------------------------- | ------------------------------------------------ | ------------------------------------------------ | -------- |
| 1   | Navigate to trade page        | `page.goto(BASE_URL)` + `waitForDerivApiSettled` | Trade page loaded                                | Both     |
| 2   | Select Multipliers trade type | Click "Multipliers" chip                         | Multipliers chip selected                        | Both     |
| 3   | Set stake amount              | Enter `21.00` in stake input                     | Stake input shows `21.00`                        | Both     |
| 4   | Set multiplier value          | Select `x300` in multiplier selector             | Multiplier shows `x300`                          | Both     |
| 5   | Buy Down contract             | Click "Down" button                              | Contract purchased; success notification appears | Both     |
| 6   | Navigate to contract details  | Navigate to positions → open contract            | Contract details page loads                      | Both     |
| 7   | Close contract                | Click "Close [amount] [currency]" in footer      | Contract closed                                  | Both     |

---

### Flow 11.1 — Multipliers with Take Profit: buy Up → close contract

**Prerequisites:** Same as Flow 10.1.
**Unique params:** Take profit toggle + input inside Risk management

| #   | Step                          | Action                                           | Expected Result                                          | Platform |
| --- | ----------------------------- | ------------------------------------------------ | -------------------------------------------------------- | -------- |
| 1   | Navigate to trade page        | `page.goto(BASE_URL)` + `waitForDerivApiSettled` | Trade page loaded                                        | Both     |
| 2   | Select Multipliers trade type | Click "Multipliers" chip                         | Multipliers chip selected                                | Both     |
| 3   | Set stake amount              | Enter `20.00` in stake input                     | Stake input shows `20.00`                                | Both     |
| 4   | Set multiplier value          | Select `x10` in multiplier selector              | Multiplier shows `x10`                                   | Both     |
| 5   | Open Risk management          | Click "Risk management" param                    | Risk management panel opens                              | Both     |
| 6   | Enable Take profit            | Toggle Take profit on                            | TP input appears (`dt_tp_input_desktop` / `dt_tp_input`) | Both     |
| 7   | Set take profit amount        | Enter `30.00` in TP input                        | TP input shows `30.00`                                   | Both     |
| 8   | Save                          | Click "Save"                                     | Risk management closes; TP applied                       | Both     |
| 9   | Buy Up contract               | Click "Up" button                                | Contract purchased; success notification appears         | Both     |
| 10  | Navigate to contract details  | Navigate to positions → open contract            | Contract details shows TP amount                         | Both     |
| 11  | Close contract                | Click "Close [amount] [currency]" in footer      | Contract closed                                          | Both     |

### Flow 11.2 — Multipliers with Take Profit: buy Down → close contract

**Prerequisites:** Same as Flow 11.1.

| #   | Step                                                       | Action                                           | Expected Result                                  | Platform |
| --- | ---------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------ | -------- |
| 1   | Navigate to trade page                                     | `page.goto(BASE_URL)` + `waitForDerivApiSettled` | Trade page loaded                                | Both     |
| 2   | Select Multipliers trade type + set multiplier + enable TP | Same setup as Flow 11.1 steps 2–8                | TP of `31.00` applied                            | Both     |
| 3   | Set stake amount                                           | Enter `21.00` in stake input                     | Stake input shows `21.00`                        | Both     |
| 4   | Buy Down contract                                          | Click "Down" button                              | Contract purchased; success notification appears | Both     |
| 5   | Navigate to contract details                               | Navigate to positions → open contract            | Contract details shows TP amount                 | Both     |
| 6   | Close contract                                             | Click "Close [amount] [currency]" in footer      | Contract closed                                  | Both     |

---

### Flow 12.1 — Multipliers with Stop Loss: buy Up → close contract

**Prerequisites:** Same as Flow 10.1.
**Unique params:** Stop loss toggle + input (`dt_sl_toggle_desktop` / `dt_sl_input`) inside Risk management

| #   | Step                                                        | Action                                           | Expected Result                                          | Platform |
| --- | ----------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------- | -------- |
| 1   | Navigate to trade page                                      | `page.goto(BASE_URL)` + `waitForDerivApiSettled` | Trade page loaded                                        | Both     |
| 2   | Select Multipliers, set stake `20.00`, set multiplier `x10` | Setup steps                                      | Parameters set                                           | Both     |
| 3   | Open Risk management                                        | Click "Risk management"                          | Panel opens                                              | Both     |
| 4   | Enable Stop loss                                            | Toggle Stop loss on                              | SL input appears (`dt_sl_input_desktop` / `dt_sl_input`) | Both     |
| 5   | Set stop loss amount                                        | Enter `15.00` in SL input                        | SL input shows `15.00`                                   | Both     |
| 6   | Save                                                        | Click "Save"                                     | SL applied                                               | Both     |
| 7   | Buy Up contract                                             | Click "Up" button                                | Contract purchased; success notification appears         | Both     |
| 8   | Navigate to contract details                                | Navigate to positions → open contract            | Contract details shows SL amount                         | Both     |
| 9   | Close contract                                              | Click "Close [amount] [currency]" in footer      | Contract closed                                          | Both     |

### Flow 12.2 — Multipliers with Stop Loss: buy Down → close contract

**Prerequisites:** Same as Flow 12.1. Same steps as 12.1 with "Down" button at step 7.

---

### Flow 13.1 — Multipliers with Deal Cancellation: buy Up → cancel contract

**Prerequisites:** Same as Flow 10.1. Deal cancellation available for selected symbol.
**Unique params:** Deal cancellation toggle inside Risk management; Deal cancellation timer badge (`dt_deal_cancellation_badge`)

| #   | Step                                                        | Action                                           | Expected Result                                                                                                   | Platform |
| --- | ----------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Navigate to trade page                                      | `page.goto(BASE_URL)` + `waitForDerivApiSettled` | Trade page loaded                                                                                                 | Both     |
| 2   | Select Multipliers, set stake `20.00`, set multiplier `x10` | Setup steps                                      | Parameters set                                                                                                    | Both     |
| 3   | Open Risk management                                        | Click "Risk management"                          | Panel opens                                                                                                       | Both     |
| 4   | Enable Deal cancellation                                    | Select "Deal cancellation" tab                   | DC selected; TP/SL disabled ("Take profit and/or stop loss are not available while deal cancellation is active.") | Both     |
| 5   | Save                                                        | Click "Save"                                     | DC applied                                                                                                        | Both     |
| 6   | Buy Up contract                                             | Click "Up" button                                | Contract purchased; DC timer badge visible (`dt_deal_cancellation_badge`)                                         | Both     |
| 7   | Navigate to contract details                                | Navigate to positions → open contract            | Footer shows "Cancel [mm:ss]" button                                                                              | Both     |
| 8   | Cancel contract                                             | Click "Cancel [mm:ss]" button                    | Contract cancelled; stake refunded                                                                                | Both     |

### Flow 13.2 — Multipliers with Deal Cancellation: buy Down → cancel contract

**Prerequisites:** Same as Flow 13.1. Same steps as 13.1 with "Down" button at step 6.

---

## Turbos

### Flow 14.1 — Turbos without TP: buy Up → verify in positions

**Prerequisites:** Authenticated with funded account. Symbol supporting Turbos (e.g. Volatility 100 (1s) Index).
**Unique params:** Duration, Payout per point (`dt_payout-per-point_wrapper`), Stake, Take profit left off, Barrier info panel
**Buttons:** "Up" / "Down" (source: `CONTRACT_TYPES.TURBOS.LONG` → name `'Up'`, `CONTRACT_TYPES.TURBOS.SHORT` → name `'Down'`)

| #   | Step                              | Action                                           | Expected Result                                  | Platform |
| --- | --------------------------------- | ------------------------------------------------ | ------------------------------------------------ | -------- |
| 1   | Navigate to trade page            | `page.goto(BASE_URL)` + `waitForDerivApiSettled` | Trade page loaded                                | Both     |
| 2   | Select Turbos trade type          | Click "Turbos" chip                              | Turbos chip selected                             | Both     |
| 3   | Verify Duration param visible     | Observe parameters                               | "Duration" parameter visible                     | Both     |
| 4   | Verify Payout per point visible   | Observe parameters                               | "Payout per point" parameter visible             | Both     |
| 5   | Verify Take profit param visible  | Observe parameters                               | "Take profit" parameter visible                  | Both     |
| 6   | Verify Take profit is off         | Observe take profit toggle                       | Take profit toggle is off by default             | Both     |
| 7   | Verify Barrier info panel visible | Observe below parameters                         | Barrier info panel visible                       | Both     |
| 8   | Set stake amount                  | Enter `10.00` in stake input                     | Stake input shows `10.00`                        | Both     |
| 9   | Buy Up contract                   | Click "Up" button                                | Contract purchased; success notification appears | Both     |
| 10  | Navigate to positions             | Navigate to positions                            | Contract card visible (`dt_contract_card`)       | Both     |
| 11  | Verify contract in positions      | Observe contract card                            | Turbos contract card present                     | Both     |

> **No manual close for Turbos** — contracts expire at barrier breach or duration end. The flow verifies purchase + presence in positions only.

### Flow 14.2 — Turbos without TP: buy Down → verify in positions

**Prerequisites:** Same as Flow 14.1.

| #   | Step                         | Action                                           | Expected Result                                  | Platform |
| --- | ---------------------------- | ------------------------------------------------ | ------------------------------------------------ | -------- |
| 1   | Navigate to trade page       | `page.goto(BASE_URL)` + `waitForDerivApiSettled` | Trade page loaded                                | Both     |
| 2   | Select Turbos trade type     | Click "Turbos" chip                              | Turbos chip selected                             | Both     |
| 3   | Set stake amount             | Enter `10.00` in stake input                     | Stake input shows `10.00`                        | Both     |
| 4   | Buy Down contract            | Click "Down" button                              | Contract purchased; success notification appears | Both     |
| 5   | Navigate to positions        | Navigate to positions                            | Contract card visible (`dt_contract_card`)       | Both     |
| 6   | Verify contract in positions | Observe contract card                            | Turbos contract card present                     | Both     |

### Flow 14.3 — Turbos with Take Profit: buy Up → verify TP set in positions

**Prerequisites:** Same as Flow 14.1.
**Unique params:** Take profit toggle + input (`dt_take_profit_input` / `dt_tp_input`)

| #   | Step                              | Action                                           | Expected Result                                           | Platform |
| --- | --------------------------------- | ------------------------------------------------ | --------------------------------------------------------- | -------- |
| 1   | Navigate to trade page            | `page.goto(BASE_URL)` + `waitForDerivApiSettled` | Trade page loaded                                         | Both     |
| 2   | Select Turbos trade type          | Click "Turbos" chip                              | Turbos chip selected                                      | Both     |
| 3   | Set stake amount                  | Enter `10.00` in stake input                     | Stake input shows `10.00`                                 | Both     |
| 4   | Enable take profit                | Toggle take profit on                            | TP input appears (`dt_take_profit_input` / `dt_tp_input`) | Both     |
| 5   | Set take profit amount            | Enter `20.00` in take profit input               | TP input shows `20.00`                                    | Both     |
| 6   | Save take profit                  | Click "Save"                                     | Take profit applied                                       | Both     |
| 7   | Buy Up contract                   | Click "Up" button                                | Contract purchased; success notification appears          | Both     |
| 8   | Navigate to positions             | Navigate to positions                            | Contract card visible (`dt_contract_card`)                | Both     |
| 9   | Verify TP set in contract details | Open contract card                               | Contract details shows TP amount `20.00`                  | Both     |

### Flow 14.4 — Turbos with Take Profit: buy Down → verify TP set in positions

**Prerequisites:** Same as Flow 14.3.

| #   | Step                              | Action                                           | Expected Result                                  | Platform |
| --- | --------------------------------- | ------------------------------------------------ | ------------------------------------------------ | -------- |
| 1   | Navigate to trade page            | `page.goto(BASE_URL)` + `waitForDerivApiSettled` | Trade page loaded                                | Both     |
| 2   | Select Turbos trade type          | Click "Turbos" chip                              | Turbos chip selected                             | Both     |
| 3   | Set stake amount                  | Enter `10.00` in stake input                     | Stake input shows `10.00`                        | Both     |
| 4   | Enable take profit                | Toggle take profit on                            | TP input appears                                 | Both     |
| 5   | Set take profit amount            | Enter `20.00` in take profit input               | TP input shows `20.00`                           | Both     |
| 6   | Save take profit                  | Click "Save"                                     | Take profit applied                              | Both     |
| 7   | Buy Down contract                 | Click "Down" button                              | Contract purchased; success notification appears | Both     |
| 8   | Navigate to positions             | Navigate to positions                            | Contract card visible (`dt_contract_card`)       | Both     |
| 9   | Verify TP set in contract details | Open contract card                               | Contract details shows TP amount `20.00`         | Both     |

---

## Vanillas

### Flow 15.1 — Vanillas: buy Call → verify in positions

**Prerequisites:** Authenticated with funded account. Forex/Synthetics symbol supporting Vanillas (e.g. EUR/USD).
**Unique params:** Duration, Strike price (`dt_strike_wrapper`), Stake, Payout per point info panel
**Buttons:** "Call" / "Put"

| #   | Step                                 | Action                                           | Expected Result                                  | Platform |
| --- | ------------------------------------ | ------------------------------------------------ | ------------------------------------------------ | -------- |
| 1   | Navigate to trade page               | `page.goto(BASE_URL)` + `waitForDerivApiSettled` | Trade page loaded                                | Both     |
| 2   | Select Vanillas trade type           | Click "Vanillas" chip                            | Vanillas chip selected                           | Both     |
| 3   | Verify Strike price param visible    | Observe parameters                               | "Strike price" parameter visible                 | Both     |
| 4   | Verify Duration param visible        | Observe parameters                               | "Duration" parameter visible                     | Both     |
| 5   | Verify Payout per point info visible | Observe below parameters                         | Payout per point info panel visible              | Both     |
| 6   | Set stake amount                     | Enter `10.00` in stake input                     | Stake input shows `10.00`                        | Both     |
| 7   | Buy Call contract                    | Click "Call" button                              | Contract purchased; success notification appears | Both     |
| 8   | Navigate to positions                | Navigate to positions                            | Contract card visible (`dt_contract_card`)       | Both     |
| 9   | Verify contract in positions         | Observe contract card                            | Vanillas contract card present                   | Both     |

> **No manual close for Vanillas** — contracts expire at duration end. The flow verifies purchase + presence in positions only.

### Flow 15.2 — Vanillas: buy Put → verify in positions

**Prerequisites:** Same as Flow 15.1.

| #   | Step                         | Action                                           | Expected Result                                  | Platform |
| --- | ---------------------------- | ------------------------------------------------ | ------------------------------------------------ | -------- |
| 1   | Navigate to trade page       | `page.goto(BASE_URL)` + `waitForDerivApiSettled` | Trade page loaded                                | Both     |
| 2   | Select Vanillas trade type   | Click "Vanillas" chip                            | Vanillas chip selected                           | Both     |
| 3   | Set stake amount             | Enter `10.00` in stake input                     | Stake input shows `10.00`                        | Both     |
| 4   | Buy Put contract             | Click "Put" button                               | Contract purchased; success notification appears | Both     |
| 5   | Navigate to positions        | Navigate to positions                            | Contract card visible (`dt_contract_card`)       | Both     |
| 6   | Verify contract in positions | Observe contract card                            | Vanillas contract card present                   | Both     |

---

## Flow 16 — Market closed → purchase button hidden, countdown visible

**Prerequisites:** Authenticated. Symbol with a closed market. `is_market_closed` = true.

| #   | Step                         | Action                                           | Expected Result                             | Platform |
| --- | ---------------------------- | ------------------------------------------------ | ------------------------------------------- | -------- |
| 1   | Navigate to trade page       | `page.goto(BASE_URL)` + `waitForDerivApiSettled` | Trade page loads                            | Both     |
| 2   | Observe closed market state  | Market selector shows closed symbol              | "CLOSED" tag visible next to symbol name    | Both     |
| 3   | Verify no purchase button    | Observe buy area                                 | "Buy" / "Rise" / "Fall" button NOT rendered | Both     |
| 4   | Verify closed market message | Observe trade page                               | "This market will reopen at" text visible   | Both     |
| 5   | Verify countdown timer       | Observe closed market message                    | Countdown timer visible                     | Both     |

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
