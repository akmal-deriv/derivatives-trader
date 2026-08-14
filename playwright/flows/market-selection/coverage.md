# Market Selection & Trade Tabs Journey Coverage

**Analysis date:** 2026-08-06

---

## Section 1 — Coverage at a Glance

| #       | Journey                                                         | Desktop | Mobile | Notes                                         |
| ------- | --------------------------------------------------------------- | ------- | ------ | --------------------------------------------- |
| Flow 1  | Add market opens the picker as a new-tab flow                   | ✅      | ✅     |                                               |
| Flow 2  | Clicking the active tab replaces it instead of adding a new one | ✅      | ✅     |                                               |
| Flow 3  | Trade-type navigation lists the same set on both platforms      | ✅      | ✅     |                                               |
| Flow 4  | Switching trade type reloads the list to only tradeable symbols | ✅      | ✅     |                                               |
| Flow 5  | Asset-class category filter chips scope the list                | ✅      | ✅     |                                               |
| Flow 6  | Time-window dropdown is always present in the category list     | ✅      | ✅     |                                               |
| Flow 7  | Market Info screen                                              | ✅      | ✅     |                                               |
| Flow 8  | Search by market name                                           | ✅      | ✅     |                                               |
| Flow 9  | Search with no matches                                          | ✅      | ✅     |                                               |
| Flow 10 | Favourite toggle from the browse list                           | ✅      | ✅     |                                               |
| Flow 11 | Favourites persist across a page reload                         | ✅      | ✅     |                                               |
| Flow 12 | Guide affordance opens the trade-type description modal         | ✅      | ✅     |                                               |
| Flow 13 | Close without selecting                                         | ✅      | ✅     |                                               |
| Flow 14 | Switch between existing tabs                                    | ✅      | ✅     |                                               |
| Flow 15 | Re-selecting an already-open pair focuses the existing tab      | ✅      | ✅     |                                               |
| Flow 16 | Same market, different trade type are independent tabs          | ✅      | ✅     |                                               |
| Flow 17 | Remove a non-active tab                                         | ✅      | ✅     |                                               |
| Flow 18 | Remove the active tab falls back to an adjacent tab             | ✅      | ✅     |                                               |
| Flow 19 | Remove the last remaining tab is blocked                        | ✅      | ✅     |                                               |
| Flow 20 | Tab strip scroll and active/inactive tab sizing                 | ✅      | ✅     |                                               |
| Flow 21 | Tabs persist across page reload                                 | ✅      | ✅     |                                               |
| Flow 22 | Buy always targets the active tab's pair                        | ✅      | ✅     |                                               |
| Flow 23 | Tab icon reflects its own market                                | ✅      | ✅     |                                               |
| Flow 24 | Max tab limit enforced (4 mobile / 7 desktop)                   | ✅      | ✅     |                                               |
| G1      | No trade parameter is tab-scoped except (symbol, contract_type) | ❌      | ❌     | Documented gap only — not automated, per plan |

---

## Section 2 — Gaps

| Gap | Description                                                                                                                                                                                                                                                                                    | Proposed spec file                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | No trade parameter (Stake, Duration, Barrier, etc.) persists per tab — only `{symbol, contract_type}` is tab-scoped by architecture (`TOpenMarket`). Broader/corrected framing of the original "Stake persistence bug" (TABS-03) — file against engineering as a systemic gap, not Stake-only. | `market-selection/verify-trade-tabs-param-isolation.spec.ts` (not yet written — pending a product decision on whether params SHOULD be tab-scoped) |

> Step-by-step test cases for each gap: [`flow.md — Gap Flows`](./flow.md#gap-flows)
