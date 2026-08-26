# Suite 5 — Market Selection & Discovery Redesign

> **Story:** New market browsing experience with trade-type filtering, curated discovery sections (Trending/Gainers/Losers with time filters), favourites, market info screens, and only showing relevant tradeable markets.
> **Owner:** @nijil-deriv

## Confirmed Behavior (exploration notes)

- **Mobile** (500×850): "Add market" opens a **full-screen** modal — trade-type tabs as a horizontal scrollable strip (`Favourite (0)`, `Rise/Fall`, `Accumulators`, `Matches/Differs`, `Over/Under`, `Even/Odd`, `Multipliers x500`, `Touch/No Touch`, `Higher/Lower`, `Turbos`, `Vanillas`), asset-class filter chips (`Featured`/`Derived`/`Forex`/`Stocks & indices`/`Commodities`), then `Trending`/`Gainers`/`Losers` sections stacked vertically with a `(5m)` time-change label and a per-card `Info` button. Close (X), Guide, and Search icons top-of-modal.
- **Desktop** (≥1280): Same modal opens as an **overlay panel**, but trade types are grouped in a **left sidebar** under category headers — `Directional` (Rise/Fall, Touch/No Touch, Higher/Lower), `Growth based` (Accumulators, Multipliers, Turbos, Vanillas), `Digit based` (Matches/Differs, Over/Under, Even/Odd) — with a search bar at top and Trending/Gainers/Losers rendered as horizontally-scrollable carousels (`◄`/`►` arrows) rather than a vertical stack.
- Selecting a market from the modal both switches/opens a trade tab (see `06-multiple-trade-tabs.md`) and closes the modal.
- **Confirmed in Figma** ("🚧 Multiple tab + market selector" canvas): dedicated sections exist for a Featured/Info/Add-to-favourites flow, a Derived-market filter page, a Favourites page, a Market Closed scenario, and a Market Search scenario — including an explicit **empty-results state** for search (both mobile and desktop). These are all in scope for this story, not incidental additions. Exact copy/microcopy wasn't extracted at pixel level — treat the cases below as directionally confirmed, not verbatim.

## Preconditions (all cases)

- Both viewports unless platform-specific
- Some cases require a logged-in account to test Favourites persistence

---

## Test Cases

| ID     | Title                                         | Priority | Platform | Steps                                                             | Expected Result                                                                                                                                                                        | Status |
| ------ | --------------------------------------------- | -------- | -------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| MKT-01 | Open market selection                         | P0       | Both     | Tap/click "Add market"                                            | Mobile: full-screen modal. Desktop: overlay panel with sidebar. Both show Featured/Trending by default                                                                                 | ⬜     |
| MKT-02 | Trade-type tab list — mobile                  | P1       | Mobile   | Observe the horizontal tab strip                                  | All trade types available on the account are listed; fire emoji badges appear on types flagged as trending internally (e.g. Rise/Fall, Accumulators)                                   | ⬜     |
| MKT-03 | Trade-type sidebar grouping — desktop         | P1       | Desktop  | Observe the left sidebar                                          | Trade types are grouped under `Directional`/`Growth based`/`Digit based` headers; same set of types as the mobile tab strip (no type present on one platform and missing on the other) | ⬜     |
| MKT-04 | Switch trade-type tab/category                | P0       | Both     | Select "Accumulators"                                             | Market cards reload to show only markets tradeable under Accumulators                                                                                                                  | ⬜     |
| MKT-05 | Asset-class filter                            | P1       | Both     | Select "Forex" filter chip                                        | Only Forex markets shown across Trending/Gainers/Losers/full list                                                                                                                      | ⬜     |
| MKT-06 | Only tradeable markets shown                  | P0       | Both     | Browse any trade type/asset filter combination                    | No markets appear that are closed/untradeable for the currently selected trade type (e.g. a Forex pair outside market hours under a type that requires live trading)                   | ⬜     |
| MKT-07 | Trending section                              | P1       | Both     | Observe "Trending" section under Featured                         | Shows a curated, non-empty list (assuming market data available) with live price + % change                                                                                            | ⬜     |
| MKT-08 | Gainers section                               | P1       | Both     | Observe "Gainers" section                                         | All listed markets show a positive % change for the selected time filter                                                                                                               | ⬜     |
| MKT-09 | Losers section                                | P1       | Both     | Observe "Losers" section                                          | All listed markets show a negative % change for the selected time filter                                                                                                               | ⬜     |
| MKT-10 | Time filter changes Gainers/Losers            | P1       | Both     | Change the `(5m)` time filter to a longer window if selectable    | Gainers/Losers reorder/update to reflect the new time window's % change                                                                                                                | ⬜     |
| MKT-11 | Market info via Info button                   | P1       | Both     | Tap/click the "Info" icon on any market card                      | A market info screen/panel opens showing details (e.g. description, trading hours) without navigating away entirely from market selection                                              | ⬜     |
| MKT-12 | Search by market name                         | P1       | Both     | Type a market name (e.g. "Volatility") in Search                  | Results filter to matching markets across all categories                                                                                                                               | ⬜     |
| MKT-13 | Search with no matches                        | P1       | Both     | Type a nonsense string                                            | A dedicated empty-results illustration/message is shown (confirmed designed in Figma for both mobile and desktop), no error thrown                                                     | ⬜     |
| MKT-14 | Add to Favourites                             | P1       | Both     | Mark a market as favourite (star/heart icon, if present on cards) | Market appears under the "Favourite" tab/section; favourite count updates (mobile tab shows `Favourite (0)` baseline)                                                                  | ⬜     |
| MKT-15 | Favourites persist across session             | P2       | Both     | Favourite a market, reload the page (logged in)                   | Favourite is still present after reload                                                                                                                                                | ⬜     |
| MKT-16 | Selecting a market opens/switches a trade tab | P0       | Both     | Click a market card (e.g. "Jump 75 Index")                        | Modal closes; a tab for that market (with the currently active trade type) is added or switched to — cross-check with `06-multiple-trade-tabs.md`                                      | ⬜     |
| MKT-17 | Guide affordance                              | P3       | Both     | Tap/click the "Guide" icon (mobile)                               | Some form of onboarding/help content opens (confirm exact behavior against Figma)                                                                                                      | ⬜     |
| MKT-18 | Close without selecting                       | P2       | Both     | Open modal, tap Close (X) / backdrop without picking a market     | Modal closes; previously active tab/market unchanged                                                                                                                                   | ⬜     |

## Open Questions

- Confirm the exact favourite icon/gesture — not surfaced in the accessibility tree during exploration.
- Confirm whether "Guide" opens a tour, a help doc, or something else.
