# Trade Journey Coverage

**Analysis date:** 2026-06-24

---

## Section 1 — Coverage at a Glance

| #         | Journey                                                | Desktop | Mobile | Notes |
| --------- | ------------------------------------------------------ | ------- | ------ | ----- |
| Flow 1    | Trade form loads with default state visible            | ✅      | ✅     |       |
| Flow 2.1  | Rise/Fall — buy Rise → close                           | ✅      | ✅     |       |
| Flow 2.2  | Rise/Fall — buy Fall → close                           | ✅      | ✅     |       |
| Flow 3.1  | Rise/Fall Allow Equals — buy Rise → close              | ❌      | ❌     |       |
| Flow 3.2  | Rise/Fall Allow Equals — buy Fall → close              | ❌      | ❌     |       |
| Flow 4.1  | Higher/Lower — buy Higher → close                      | ❌      | ❌     |       |
| Flow 4.2  | Higher/Lower — buy Lower → close                       | ❌      | ❌     |       |
| Flow 5.1  | Touch/No Touch — buy Touch → close                     | ❌      | ❌     |       |
| Flow 5.2  | Touch/No Touch — buy No Touch → close                  | ❌      | ❌     |       |
| Flow 6.1  | Matches/Differs — buy Matches → expiry                 | ❌      | ❌     |       |
| Flow 6.2  | Matches/Differs — buy Differs → expiry                 | ❌      | ❌     |       |
| Flow 7.1  | Over/Under — buy Over → expiry                         | ❌      | ❌     |       |
| Flow 7.2  | Over/Under — buy Under → expiry                        | ❌      | ❌     |       |
| Flow 8.1  | Even/Odd — buy Even → expiry                           | ❌      | ❌     |       |
| Flow 8.2  | Even/Odd — buy Odd → expiry                            | ❌      | ❌     |       |
| Flow 9.1  | Accumulators without TP — buy → close                  | ❌      | ❌     |       |
| Flow 9.2  | Accumulators with TP — buy → verify TP set → close     | ❌      | ❌     |       |
| Flow 10.1 | Multipliers no TP/SL — buy Up → close                  | ❌      | ❌     |       |
| Flow 10.2 | Multipliers no TP/SL — buy Down → close                | ❌      | ❌     |       |
| Flow 11.1 | Multipliers with TP — buy Up → close                   | ❌      | ❌     |       |
| Flow 11.2 | Multipliers with TP — buy Down → close                 | ❌      | ❌     |       |
| Flow 12.1 | Multipliers with SL — buy Up → close                   | ❌      | ❌     |       |
| Flow 12.2 | Multipliers with SL — buy Down → close                 | ❌      | ❌     |       |
| Flow 13.1 | Multipliers with Deal Cancellation — buy Up → cancel   | ❌      | ❌     |       |
| Flow 13.2 | Multipliers with Deal Cancellation — buy Down → cancel | ❌      | ❌     |       |
| Flow 14.1 | Turbos without TP — buy Up → verify in positions       | ❌      | ❌     |       |
| Flow 14.2 | Turbos without TP — buy Down → verify in positions     | ❌      | ❌     |       |
| Flow 14.3 | Turbos with TP — buy Up → verify TP set in positions   | ❌      | ❌     |       |
| Flow 14.4 | Turbos with TP — buy Down → verify TP set in positions | ❌      | ❌     |       |
| Flow 15.1 | Vanillas — buy Call → verify in positions              | ❌      | ❌     |       |
| Flow 15.2 | Vanillas — buy Put → verify in positions               | ❌      | ❌     |       |
| Flow 16   | Market closed → purchase hidden, countdown visible     | ❌      | ❌     |       |
| G1        | Insufficient balance → ServiceErrorSheet               | ❌      | ❌     |       |
| G2        | Unauthenticated purchase → login prompt sheet          | ❌      | ❌     |       |

---

## Section 2 — Gaps

| Gap | Description                                                                                                                                                                   | Proposed spec file                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| G1  | Insufficient balance: clicking Buy with insufficient funds opens `ServiceErrorSheet` ("Insufficient balance" / "Deposit now"). Requires specific account state.               | `trade/verify-insufficient-balance.spec.ts`     |
| G2  | Unauthenticated purchase: clicking Buy without login shows `ServiceErrorSheet` ("Start trading with us" / "Login" / "Create free account"). Requires unauthenticated session. | `trade/verify-unauthenticated-purchase.spec.ts` |

> Step-by-step test cases for each gap: [`flow.md — Gap Flows`](./flow.md#gap-flows)

---

## Section 3 — Priority List

| Priority | Spec file                                            | Flow                           | Reason                                                |
| -------- | ---------------------------------------------------- | ------------------------------ | ----------------------------------------------------- |
| P0       | `trade/verify-trade-form-loads.spec.ts`              | Flow 1                         | Trade form smoke — prerequisite for all trading tests |
| P0       | `trade/verify-rise-fall.spec.ts`                     | Flow 2.1 + 2.2                 | Most common trade type                                |
| P0       | `trade/verify-multipliers-no-tpsl.spec.ts`           | Flow 10.1 + 10.2               | Most popular contract type                            |
| P0       | `trade/verify-multipliers-with-tp.spec.ts`           | Flow 11.1 + 11.2               | TP is the most-used risk control                      |
| P0       | `trade/verify-accumulators.spec.ts`                  | Flow 9.1 + 9.2                 | Top-traffic trade type; without and with TP           |
| P0       | `trade/verify-matches-differs.spec.ts`               | Flow 6.1 + 6.2                 | Most popular Digit type                               |
| P1       | `trade/verify-higher-lower.spec.ts`                  | Flow 4.1 + 4.2                 | Core directional type with barrier                    |
| P1       | `trade/verify-multipliers-with-sl.spec.ts`           | Flow 12.1 + 12.2               | SL is a critical risk control path                    |
| P1       | `trade/verify-turbos.spec.ts`                        | Flow 14.1 + 14.2 + 14.3 + 14.4 | Unique payout per point param; without and with TP    |
| P1       | `trade/verify-vanillas.spec.ts`                      | Flow 15.1 + 15.2               | Unique strike price param                             |
| P2       | `trade/verify-touch-no-touch.spec.ts`                | Flow 5.1 + 5.2                 | Directional with barrier — lower traffic              |
| P2       | `trade/verify-over-under.spec.ts`                    | Flow 7.1 + 7.2                 | Secondary Digit type                                  |
| P2       | `trade/verify-even-odd.spec.ts`                      | Flow 8.1 + 8.2                 | Secondary Digit type; simplest params                 |
| P2       | `trade/verify-rise-fall-allow-equals.spec.ts`        | Flow 3.1 + 3.2                 | Allow Equals variant of Rise/Fall                     |
| P2       | `trade/verify-multipliers-deal-cancellation.spec.ts` | Flow 13.1 + 13.2               | DC less-used; symbol availability varies              |
| P2       | `trade/verify-closed-market.spec.ts`                 | Flow 16                        | Important edge case; environment-dependent            |
| P2       | `trade/verify-insufficient-balance.spec.ts`          | G1                             | Important error path; needs account state setup       |
| P3       | `trade/verify-unauthenticated-purchase.spec.ts`      | G2                             | Edge case — most users are logged in                  |
