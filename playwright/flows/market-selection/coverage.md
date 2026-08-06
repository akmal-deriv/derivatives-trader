# Market Selection & Trade Tabs Journey Coverage

**Analysis date:** 2026-08-06

> Covers `playwright/test-plans/879-web-responsive-redesign/05-market-selection-discovery.md` (Suite 5)
> and `06-multiple-trade-tabs.md` (Suite 6). All 25 flows now have spec files (8 files under
> `playwright/tests/market-selection/`) via `/flow-to-playwright-dtrader`. Flows 9–10 have been run
> against staging (desktop + mobile) and pass. The remaining flows are written but not yet
> independently verified — `✅` below is reserved for confirmed-passing per the coverage template
> convention; update as verification runs complete.
>
> **2026-08-06:** master PR #974 removed the "Featured" category chip and the Trending/Gainers/Losers
> discovery view. Flow 5 (category chips), Flow 6 (repurposed to a removal regression-guard), and Flow 7
> (time-window dropdown) were updated, and `verify-market-browse-and-discovery.spec.ts` was rewritten
> accordingly — see flow.md and catalog.md for details.

---

## Section 1 — Coverage at a Glance

| #       | Journey                                                         | Desktop | Mobile | Notes                                                                                                                                           |
| ------- | --------------------------------------------------------------- | ------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Flow 1  | Add market opens the picker as a new-tab flow                   | 🟡      | 🟡     | Spec written (`verify-market-browse-and-discovery.spec.ts`) — pending verification run                                                          |
| Flow 2  | Clicking the active tab replaces it instead of adding a new one | 🟡      | 🟡     | Spec written — pending verification run                                                                                                         |
| Flow 3  | Trade-type navigation lists the same set on both platforms      | 🟡      | 🟡     | Spec written — pending verification run                                                                                                         |
| Flow 4  | Switching trade type reloads the list to only tradeable symbols | 🟡      | 🟡     | Spec written — pending verification run                                                                                                         |
| Flow 5  | Asset-class category filter chips scope the list                | 🟡      | 🟡     | Spec written — pending verification run                                                                                                         |
| Flow 6  | Featured/Discovery view removed (regression guard)              | 🟡      | 🟡     | Repurposed 2026-08-06 after master PR #974 removed Featured/Trending/Gainers/Losers. Spec rewritten — pending verification run                  |
| Flow 7  | Time-window dropdown is always present in the category list     | 🟡      | 🟡     | Now visible immediately on open (was gated behind a non-Featured chip pre-#974); absent only on Favourites. Spec written — pending verification |
| Flow 8  | Market Info screen                                              | 🟡      | 🟡     | Spec written (`verify-market-info-screen.spec.ts`) — pending verification run                                                                   |
| Flow 9  | Search by market name                                           | ✅      | ✅     | Verified passing on staging (desktop + mobile)                                                                                                  |
| Flow 10 | Search with no matches                                          | ✅      | ✅     | Verified passing on staging (desktop + mobile)                                                                                                  |
| Flow 11 | Favourite toggle from the browse list                           | 🟡      | 🟡     | Spec written (`verify-market-favourites.spec.ts`) — pending verification run                                                                    |
| Flow 12 | Favourites persist across a page reload                         | 🟡      | 🟡     | No login required — `favourite_markets_v2` is plain localStorage. Spec written — pending verification                                           |
| Flow 13 | Guide affordance opens the trade-type description modal         | 🟡      | 🟡     | Spec written — pending verification run                                                                                                         |
| Flow 14 | Close without selecting                                         | 🟡      | 🟡     | Spec written — pending verification run                                                                                                         |
| Flow 15 | Switch between existing tabs                                    | 🟡      | 🟡     | Spec written (`verify-trade-tabs.spec.ts`) — pending verification run                                                                           |
| Flow 16 | Re-selecting an already-open pair focuses the existing tab      | 🟡      | 🟡     | Spec written — pending verification run                                                                                                         |
| Flow 17 | Same market, different trade type are independent tabs          | 🟡      | 🟡     | Spec written — pending verification run                                                                                                         |
| Flow 18 | Remove a non-active tab                                         | 🟡      | N/A    | Mobile's primary close affordance is via the active tab — see flow.md Flow 18 notes. Spec written (desktop-only test) — pending verification    |
| Flow 19 | Remove the active tab falls back to an adjacent tab             | 🟡      | 🟡     | Spec written — pending verification run                                                                                                         |
| Flow 20 | Remove the last remaining tab is blocked                        | 🟡      | 🟡     | Spec written — pending verification run                                                                                                         |
| Flow 21 | Tab strip scroll and active/inactive tab sizing                 | 🟡      | 🟡     | Spec written — pending verification run                                                                                                         |
| Flow 22 | Tabs persist across page reload                                 | 🟡      | 🟡     | Spec written (`verify-trade-tabs-persistence.spec.ts`) — pending verification run                                                               |
| Flow 23 | Buy always targets the active tab's pair                        | 🟡      | 🟡     | Requires a funded account. Spec written (`verify-trade-tabs-buy.spec.ts`) — pending verification                                                |
| Flow 24 | Tab icon reflects its own market                                | 🟡      | 🟡     | Spec written — pending verification run                                                                                                         |
| Flow 25 | Max tab limit enforced (4 mobile / 7 desktop)                   | 🟡      | 🟡     | Confirmed intentional platform-specific caps — not a bug. Spec written (`verify-trade-tabs-max-limit.spec.ts`) — pending verification           |
| G1      | No trade parameter is tab-scoped except (symbol, contract_type) | ❌      | ❌     | Documented gap only — not automated, per plan                                                                                                   |

---

## Section 2 — Gaps

| Gap | Description                                                                                                                                                                                                                                                                                    | Proposed spec file                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | No trade parameter (Stake, Duration, Barrier, etc.) persists per tab — only `{symbol, contract_type}` is tab-scoped by architecture (`TOpenMarket`). Broader/corrected framing of the original "Stake persistence bug" (TABS-03) — file against engineering as a systemic gap, not Stake-only. | `market-selection/verify-trade-tabs-param-isolation.spec.ts` (not yet written — pending a product decision on whether params SHOULD be tab-scoped) |

> Step-by-step test cases for each gap: [`flow.md — Gap Flows`](./flow.md#gap-flows)

---

## Section 3 — Priority List

| Priority | Spec file                                                     | Flow             | Reason                                                                             |
| -------- | ------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------- |
| P0       | `market-selection/verify-trade-tabs.spec.ts`                  | Flow 15–21, 24   | Core tab mechanics — every trader touches this; redesign's flagship new capability |
| P0       | `market-selection/verify-market-search.spec.ts`               | Flow 9–10        | Search is the primary reliable path to any of ~65 markets                          |
| P1       | `market-selection/verify-market-browse-and-discovery.spec.ts` | Flow 1–7, 13, 14 | Entry mechanics + discovery browsing — high traffic, first-run UX                  |
| P1       | `market-selection/verify-trade-tabs-max-limit.spec.ts`        | Flow 25          | Platform-specific caps now confirmed intentional — good regression guard           |
| P1       | `market-selection/verify-trade-tabs-buy.spec.ts`              | Flow 23          | Confirms Buy targets the correct tab — financially significant if wrong            |
| P2       | `market-selection/verify-market-info-screen.spec.ts`          | Flow 8           | Secondary discovery surface, not required for a purchase                           |
| P2       | `market-selection/verify-market-favourites.spec.ts`           | Flow 11–12       | Convenience feature, not blocking a trade                                          |
| P2       | `market-selection/verify-trade-tabs-persistence.spec.ts`      | Flow 22          | Important but only observable across a reload                                      |
| P3       | (folded into browse-and-discovery)                            | Flow 13 (Guide)  | Informational only, low risk of regression                                         |
