# Reports Journey Coverage

**Analysis date:** 2026-06-11

---

## Section 1 — Coverage at a Glance

| #      | Journey                                                           | Desktop | Mobile | Notes                                                               |
| ------ | ----------------------------------------------------------------- | ------- | ------ | ------------------------------------------------------------------- |
| Flow 1 | Reports page loads with default tab (Open positions)              | ❌      | ❌     | Both platforms: full-page `/reports` route                          |
| Flow 2 | Open Positions tab — Options contracts visible                    | ❌      | ❌     | Default contract type filter; requires open Options contract        |
| Flow 3 | Open Positions tab — Multipliers filter                           | ❌      | ❌     | Requires open Multiplier contract                                   |
| Flow 4 | Open Positions tab — Accumulators filter + growth rate sub-filter | ❌      | ❌     | Requires open Accumulator contract                                  |
| Flow 5 | Trade Table tab loads with date filter and data rows              | ❌      | ❌     | Desktop: `CompositeCalendar` with id-based inputs; mobile: sheet UI |
| Flow 6 | Statement tab loads with transaction type filter                  | ❌      | ❌     | Filter: All transactions/Buy/Sell/Deposit/Withdrawal                |
| Flow 7 | Empty state — no trading activity (Trade Table)                   | ❌      | ❌     | Requires account with no profit table history                       |
| Flow 8 | Empty state — no transactions (Statement)                         | ❌      | ❌     | Requires fresh account with no statement entries                    |

> **N/A Note:** No flows are platform-exclusive. Both desktop and mobile render the full `/reports` page. Platform differences are limited to tab navigation UI (VerticalTab vs SelectNative) and filter interaction (Dropdown vs SelectNative).

---

## Section 2 — Gaps

| Gap | Description                                                                                          | Proposed spec file                                          |
| --- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| G1  | Navigate from an Open Positions row to contract details, then return to Reports                      | `reports/verify-open-positions-to-contract-details.spec.ts` |
| G2  | Archived Statement tab loads and shows history (requires `has_archived_statement = true` on account) | `reports/verify-archived-statement.spec.ts`                 |

> Step-by-step test cases for each gap: [`flow.md — Gap Flows`](./flow.md#gap-flows)

---

## Section 3 — Priority List

| Priority | Spec file                                                   | Gap / Flow | Reason                                                                   |
| -------- | ----------------------------------------------------------- | ---------- | ------------------------------------------------------------------------ |
| P0       | `reports/verify-reports-page-loads.spec.ts`                 | Flow 1     | Core page load — gates all reports release                               |
| P0       | `reports/verify-trade-table-tab.spec.ts`                    | Flow 5     | Trade Table is the primary P&L reference surface                         |
| P0       | `reports/verify-statement-tab.spec.ts`                      | Flow 6     | Statement is the primary transaction history surface                     |
| P1       | `reports/verify-open-positions-options.spec.ts`             | Flow 2     | Open Positions is the default tab; Options is the default filter         |
| P1       | `reports/verify-open-positions-to-contract-details.spec.ts` | G1         | High-traffic path: reports row → contract details                        |
| P2       | `reports/verify-open-positions-multipliers.spec.ts`         | Flow 3     | Multiplier contract view — important but not blocking                    |
| P2       | `reports/verify-open-positions-accumulators.spec.ts`        | Flow 4     | Accumulator + growth rate sub-filter — important but niche               |
| P2       | `reports/verify-empty-trade-table.spec.ts`                  | Flow 7     | Empty state UX — important but only hit on accounts with no history      |
| P2       | `reports/verify-empty-statement.spec.ts`                    | Flow 8     | Empty state UX — same as above for statement                             |
| P3       | `reports/verify-archived-statement.spec.ts`                 | G2         | Conditional feature — only for accounts with archived history; edge case |
