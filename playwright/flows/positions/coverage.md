# Positions Journey Coverage

**Analysis date:** 2026-06-11

---

## Section 1 — Coverage at a Glance

| #      | Journey                                                                | Desktop | Mobile | Notes                                                        |
| ------ | ---------------------------------------------------------------------- | ------- | ------ | ------------------------------------------------------------ |
| Flow 1 | Open positions list loads (mobile)                                     | N/A     | ❌     | Mobile-only route; desktop uses sidebar flyout               |
| Flow 2 | Open positions list loads (desktop sidebar flyout)                     | ❌      | N/A    | Desktop-only; `dt_sidebar_positions` → flyout                |
| Flow 3 | Empty open positions state                                             | N/A     | ❌     | Requires account with no open contracts                      |
| Flow 4 | Closed positions tab with date sections                                | N/A     | ❌     | Mobile-only route                                            |
| Flow 5 | Filter open positions by trade type                                    | N/A     | ❌     | ContractTypeFilter chip + ActionSheet                        |
| Flow 6 | Filter closed positions by time                                        | N/A     | ❌     | TimeFilter chip + RadioGroup + reset                         |
| Flow 7 | Navigate from positions card to contract details                       | N/A     | ❌     | NavLink on mobile card; desktop cards are non-navigable divs |
| G1     | Close open contract from positions (swipe + Close button)              | N/A     | ❌     | Swipe left reveals Close; requires open contract             |
| G2     | Cancel open multiplier contract from positions (swipe + Cancel button) | N/A     | ❌     | Requires funded multiplier open position                     |
| G3     | Empty closed positions state                                           | N/A     | ❌     | Requires account with no closed contract history             |
| G4     | Filter yields no matches (open positions)                              | N/A     | ❌     | Apply filter with no matching open contracts                 |

> **Desktop column N/A** for Flows 1, 3–7, G1–G4: `PositionsSwitch` redirects desktop users to `/` — the `/positions` full-page route is mobile-only. Desktop positions are covered by Flow 2 (sidebar flyout).

---

## Section 2 — Gaps

| Gap | Description                                                                                           | Proposed spec file                                   |
| --- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| G1  | Close an open contract by swiping left on its card and clicking the Close button                      | `positions/close-contract-from-positions.spec.ts`    |
| G2  | Cancel an open multiplier contract with Deal Cancellation by swiping left and clicking Cancel         | `positions/cancel-multiplier-from-positions.spec.ts` |
| G3  | Verify the empty state on the Closed tab when the account has no contract history                     | `positions/empty-closed-positions.spec.ts`           |
| G4  | Verify the no-matches empty state when a trade type filter is applied with no matching open positions | `positions/filter-no-matches.spec.ts`                |

> Step-by-step test cases for each gap: [`flow.md — Gap Flows`](./flow.md#gap-flows)

---

## Section 3 — Priority List

| Priority | Spec file                                            | Gap / Flow | Reason                                                                           |
| -------- | ---------------------------------------------------- | ---------- | -------------------------------------------------------------------------------- |
| P0       | `positions/open-positions-mobile.spec.ts`            | Flow 1     | Core positions page load — gates mobile release                                  |
| P0       | `positions/open-positions-desktop.spec.ts`           | Flow 2     | Desktop positions flyout — gates desktop release                                 |
| P1       | `positions/contract-details-from-positions.spec.ts`  | Flow 7     | High-traffic user path: positions → contract details navigation                  |
| P1       | `positions/closed-positions-mobile.spec.ts`          | Flow 4     | Closed tab is key reporting surface; date grouping must be correct               |
| P1       | `positions/close-contract-from-positions.spec.ts`    | G1         | Closing contracts from the positions list is a primary use case                  |
| P2       | `positions/filter-open-by-trade-type.spec.ts`        | Flow 5     | Filter reduces cognitive load; important but positions still function without it |
| P2       | `positions/filter-closed-by-time.spec.ts`            | Flow 6     | Time filter on closed tab; important for P/L review but not blocking             |
| P2       | `positions/empty-open-positions.spec.ts`             | Flow 3     | Empty state UX — important but only hit when user has no trades                  |
| P2       | `positions/cancel-multiplier-from-positions.spec.ts` | G2         | Multiplier deal cancellation is a risk management feature; important but niche   |
| P3       | `positions/empty-closed-positions.spec.ts`           | G3         | Edge case — new accounts with no history                                         |
| P3       | `positions/filter-no-matches.spec.ts`                | G4         | Edge case — filter applied with no matching open contracts                       |
