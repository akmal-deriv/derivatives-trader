# 📋 Market Selection & Trade Tabs Journey Spec — What to Test

> **Purpose:** Describes the Market Selection & Discovery picker and the Multiple Trade Tabs strip on
> `staging-dtrader.deriv.com`. Defines _what_ to verify at each step. Covers redesign test plans
> `playwright/test-plans/879-web-responsive-redesign/05-market-selection-discovery.md` (Suite 5) and
> `06-multiple-trade-tabs.md` (Suite 6) — combined into one module because selecting a market from the
> picker directly drives the tab strip (they are one continuous journey).
>
> **Feature location:** `packages/trader/src/AppV2/Components/MarketSelection/` (picker) ·
> `packages/trader/src/AppV2/Components/MarketTabs/` (tab strip)
> **URL:** `https://staging-dtrader.deriv.com/`
> **Authentication:** Not required anywhere in this module. Favourites (`favourite_markets_v2`) persist
> via plain `localStorage`, independent of login state — confirmed in `markets-store.ts` — so Flow 12
> (persistence across reload) does not need a logged-in session either, despite the original test plan
> assuming otherwise.
>
> **2026-08-06 update:** master PR #974 ("remove featured list in market selection modal") removed the
> "Featured" category chip and the Trending/Gainers/Losers discovery view entirely — `show_discovery` is
> now hardcoded `false` in `useMarketSelection.ts`. The picker now ALWAYS opens directly into the flat
> category list (`MarketSelectionList`), scoped to the first available category for the current trade
> type (`categories[0]`, computed from `getMarketCategories()` — no longer includes a Featured entry).
> `DiscoveryView`/`DiscoverySection`/`MarketCard` still exist in source but are permanently unreachable
> dead code. Flow 6 below now documents and guards against this removal instead of testing the
> (removed) discovery cards.

---

## Section 1 — Shared Step Pattern

### Open Market Selection Steps

> Referenced by every flow below except the Tab-strip-only flows (Flows 16–26), which start from an
> already-open picker or an already-populated tab strip.

**Prerequisites:** On the trade page, at least one tab open (always true — the app never has zero tabs).

| #   | Step                  | Action                                             | Expected Result                                                                                                                                                                                                                                                              | Platform |
| --- | --------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Open picker (new tab) | Click the "Add market" (+) button on the tab strip | Mobile: full-screen dialog (`role="dialog"`, `aria-label="Market selection"`). Desktop: popover anchored below the strip (`.market-selection-desktop`). Both default straight into the flat category list, scoped to the first available category for the current trade type | Both     |
| 1b  | Open picker (replace) | Click the already-active tab                       | Same picker opens; selecting a market here REPLACES the active tab in place instead of adding a new one                                                                                                                                                                      | Both     |

---

## Section 2 — Per-Flow Sections

### Flow 1 — Add market opens the picker as a new-tab flow

Follows [Open Market Selection Steps](#open-market-selection-steps) step 1.

| #   | Step                         | Action                                                          | Expected Result                                                                                                                                            | Platform |
| --- | ---------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Note current tab count       | Read the number of tabs (`dt_market_tab` elements) on the strip | Baseline count captured                                                                                                                                    | Both     |
| 2   | Open picker via Add market   | Click the "Add market" (+) button                               | Picker opens directly into the flat category list — the first available category for the current trade type is auto-selected, no discovery/Featured screen | Both     |
| 3   | Select a market + trade type | Search for and select a market not already open as a tab        | Picker closes; a NEW tab is appended (tab count = baseline + 1); new tab becomes active; URL `symbol`/`trade_type` query params update                     | Both     |

### Flow 2 — Clicking the active tab replaces it instead of adding a new one

Follows [Open Market Selection Steps](#open-market-selection-steps) step 1b.

| #   | Step                           | Action                                          | Expected Result                                                                                                                               | Platform |
| --- | ------------------------------ | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Note current tab count         | Read the number of open tabs                    | Baseline count captured                                                                                                                       | Both     |
| 2   | Click the currently active tab | Click the tab that is already active            | Picker opens (same picker as Flow 1)                                                                                                          | Both     |
| 3   | Select a different market      | Search for and select a market not already open | Picker closes; the PREVIOUSLY ACTIVE tab is replaced IN PLACE with the new market — tab count is unchanged (still baseline), not baseline + 1 | Both     |

### Flow 3 — Trade-type navigation lists the same set on both platforms

| #   | Step                          | Action                                                             | Expected Result                                                                                                                                                                                                                                        | Platform |
| --- | ----------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| 1   | Open the picker               | Follow [Open Market Selection Steps](#open-market-selection-steps) | Picker opens                                                                                                                                                                                                                                           | Both     |
| 2   | Observe trade-type navigation | Read the trade-type controls                                       | Mobile: horizontal `role="tablist"` strip of `role="tab"` buttons, leading with `Favourite ({{count}})`. Desktop: left sidebar grouped under `Directional` / `Growth based` / `Digit based` headers, with `Favourite ({{count}})` pinned at the bottom | Both     |
| 3   | Compare the trade-type set    | Collect the trade-type labels shown on each platform               | Same set of trade types appears on both — no type present on one platform and missing on the other                                                                                                                                                     | Both     |

### Flow 4 — Switching trade type reloads the market list to only tradeable symbols

| #   | Step                                | Action                                                                                                | Expected Result                                                                                                                                | Platform |
| --- | ----------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Open the picker                     | Follow [Open Market Selection Steps](#open-market-selection-steps)                                    | Picker opens on the default trade type                                                                                                         | Both     |
| 2   | Select "Accumulators"               | Mobile: tap the "Accumulators" tab. Desktop: click "Accumulators" in the sidebar's Growth based group | Market list reloads to show only markets tradeable under Accumulators (server-filtered via `active_symbols` `contract_type`)                   | Both     |
| 3   | Confirm closed markets still render | Observe any Accumulators-tradeable market that is currently outside trading hours                     | It IS shown in the list (not hidden) with a "CLOSED" tag — the filter scopes by trade-type tradeability only, not by open/closed session state | Both     |

### Flow 5 — Asset-class category filter chips scope the list

| #   | Step                        | Action                                                             | Expected Result                                                                                                         | Platform |
| --- | --------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Open the picker             | Follow [Open Market Selection Steps](#open-market-selection-steps) | Picker opens with the first available category (e.g. "Derived") selected by default — no Featured chip exists           | Both     |
| 2   | Select the "Forex" chip     | Click/tap the "Forex" category chip                                | List reloads to show only Forex markets (`symbol.market === 'forex'`); category chips row stays visible                 | Both     |
| 3   | Select a different category | Click/tap another category chip (e.g. "Derived")                   | List reloads again to that category's markets — there is no "reset"/default chip to return to, every category is a peer | Both     |

> Available category chips: `Derived`, `Forex`, `Stocks & indices`, `Cryptocurrencies`, `Commodities` —
> derived from `packages/trader/src/AppV2/Utils/market-selection-utils.ts`. `Featured` no longer exists
> as of master PR #974 (2026-08-06) — the redesign test plan's original list included it, and also
> omitted `Cryptocurrencies`, which does exist as a chip when the trade type offers crypto symbols.

### Flow 6 — Featured/Discovery view has been removed (regression guard)

> **Repurposed 2026-08-06:** this flow previously tested the Trending/Gainers/Losers discovery cards.
> Master PR #974 removed that surface entirely — `show_discovery` is hardcoded `false` in
> `useMarketSelection.ts`, and `getMarketCategories()` no longer returns a Featured entry. This flow now
> guards against regressing back to the old behavior.

| #   | Step                                 | Action                                                                  | Expected Result                                                                                                                                        | Platform |
| --- | ------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| 1   | Open the picker                      | Follow [Open Market Selection Steps](#open-market-selection-steps)      | Picker opens                                                                                                                                           | Both     |
| 2   | Confirm no Featured chip             | Read the category chip labels                                           | No chip is labelled "Featured" — only real market categories (`Derived`, `Forex`, `Stocks & indices`, `Commodities`, `Cryptocurrencies` as applicable) | Both     |
| 3   | Confirm no discovery sections        | Search the picker for "Trending", "Gainers", or "Losers" section titles | None of the three sections render, on any category or trade type                                                                                       | Both     |
| 4   | Confirm the list view is the default | Observe what renders immediately on open, with no chip clicked yet      | The flat category list (grouped by submarket, e.g. "Baskets" / "Synthetics") renders immediately — never a discovery-card layout                       | Both     |

### Flow 7 — Time-window dropdown is always present in the category list

> **Correction 2026-08-06:** since Featured/Discovery no longer exists, EVERY browse view (except the
> Favourites tab) is now the category list — so the "Changes ({window})" dropdown is present as soon as
> the picker opens, not gated behind selecting a "non-Featured" chip as previously documented.

| #   | Step                        | Action                                                             | Expected Result                                                                                                    | Platform |
| --- | --------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | -------- |
| 1   | Open the picker             | Follow [Open Market Selection Steps](#open-market-selection-steps) | Picker opens; first group header already shows a "Changes (5 minutes)" dropdown trigger, with no prior interaction | Both     |
| 2   | Open the dropdown           | Click/tap the "Changes (5 minutes)" trigger                        | Desktop: anchored popover with `role="listbox"` options. Mobile: bottom ActionSheet titled "Change period"         | Both     |
| 3   | Select a longer window      | Select "15 minutes"                                                | Dropdown trigger label updates to "Changes (15 minutes)"; row % changes reload for the new window                  | Both     |
| 4   | Switch to the Favourite tab | Click/tap the "Favourite ({{count}})" tab/sidebar item             | The dropdown is NOT present — `MarketFavouritesView` never wires a window selector, unlike every category list     | Both     |

### Flow 8 — Market Info screen

| #   | Step                       | Action                                                                                | Expected Result                                                                                                                                                                                                                                                                      | Platform |
| --- | -------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| 1   | Open the picker            | Follow [Open Market Selection Steps](#open-market-selection-steps)                    | Picker opens                                                                                                                                                                                                                                                                         | Both     |
| 2   | Tap/click the Info icon    | Click the info icon (`aria-label="Info"`) on any market card or row                   | Market info screen opens IN PLACE of the browse panel (desktop: same popover footprint; mobile: same full-screen dialog) — market selection is not fully exited                                                                                                                      | Both     |
| 3   | Verify info content        | Read the screen                                                                       | Shows: symbol icon + display name, live price (or "Closed" tag), a worm chart, Open/Highest/Lowest/Close price stats, market description (if available), a "Trade on" section listing every trade type this symbol supports as a direct CTA, and a "Market availability" status line | Both     |
| 4   | Toggle Favourite from Info | Click the Favourite button (`aria-label="Favourite"`/`"Unfavourite"`, `aria-pressed`) | Icon and label toggle between star-outline "Favourite" and filled-star "Unfavourite"                                                                                                                                                                                                 | Both     |
| 5   | Select a "Trade on" CTA    | Click one of the trade-type cards under "Trade on"                                    | Commits the symbol under that trade type (same as picking it from the browse list) and closes the whole picker — trade page reflects the new market + trade type                                                                                                                     | Both     |
| 6   | Back out of Info           | Click the Back button (`aria-label="Back"`) instead of a Trade-on CTA                 | Returns to the browse panel/modal (category list, favourites, or search — whichever was active before Info opened)                                                                                                                                                                   | Both     |

### Flow 9 — Search by market name

| #   | Step               | Action                                                                                           | Expected Result                                                                                                                                                                            | Platform |
| --- | ------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| 1   | Open the picker    | Follow [Open Market Selection Steps](#open-market-selection-steps)                               | Picker opens                                                                                                                                                                               | Both     |
| 2   | Open search        | Desktop: the search field is already inline. Mobile: tap the Search icon (`aria-label="Search"`) | Desktop: nothing further needed. Mobile: dedicated full-screen search page opens with a back "Cancel" control and an autofocused field                                                     | Both     |
| 3   | Type a market name | Type "Volatility" into the search field                                                          | Results render grouped by trade type — each trade type that has a tradeable match gets its own header, split into submarket sections; a symbol can appear under multiple trade-type groups | Both     |
| 4   | Select a result    | Click a row under one of the trade-type groups                                                   | Commits BOTH the symbol and that group's trade type; picker closes                                                                                                                         | Both     |

### Flow 10 — Search with no matches

| #   | Step                  | Action                                               | Expected Result                                                                                                                                     | Platform |
| --- | --------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Open search           | Follow Flow 9 steps 1–2                              | Search field is ready                                                                                                                               | Both     |
| 2   | Type a nonsense query | Type a string matching no market (e.g. "zzznotreal") | Empty-results illustration + "No result found" title + "Check your spelling or try searching for a different market." description — no error thrown | Both     |

### Flow 11 — Favourite toggle from the browse list

| #   | Step                         | Action                                                                       | Expected Result                                                                                                         | Platform |
| --- | ---------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Open the picker              | Follow [Open Market Selection Steps](#open-market-selection-steps)           | Picker opens                                                                                                            | Both     |
| 2   | Reveal the Favourite action  | Desktop: actions are always visible on the row. Mobile: swipe the row left   | Desktop: Info + Favourite (star) buttons visible inline. Mobile: swipe reveals Info + Favourite buttons                 | Both     |
| 3   | Tap/click the Favourite star | Click the Favourite button (`aria-label="Favourite"`)                        | Star fills in (`aria-label` flips to "Unfavourite"); the "Favourite ({{count}})" tab/sidebar-item label increments by 1 | Both     |
| 4   | Open the Favourite tab       | Click "Favourite ({{count}})" (tab strip on mobile, sidebar item on desktop) | The just-favourited market appears, grouped under its trade type and submarket                                          | Both     |
| 5   | Unfavourite                  | Click the star again (now `aria-label="Unfavourite"`)                        | Market disappears from the Favourite tab; count decrements by 1                                                         | Both     |

### Flow 12 — Favourites persist across a page reload

| #   | Step                     | Action                                      | Expected Result                                     | Platform |
| --- | ------------------------ | ------------------------------------------- | --------------------------------------------------- | -------- |
| 1   | Favourite a market       | Follow Flow 11 steps 1–3                    | Market is favourited; count updates                 | Both     |
| 2   | Reload the page          | Reload `https://staging-dtrader.deriv.com/` | Page reloads; API/WebSocket settles                 | Both     |
| 3   | Reopen the Favourite tab | Follow Flow 11 step 4                       | The favourited market is still present after reload | Both     |

### Flow 13 — Guide affordance opens the trade-type description modal

| #   | Step                               | Action                                                                                        | Expected Result                                                                                                                             | Platform |
| --- | ---------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Open the picker                    | Follow [Open Market Selection Steps](#open-market-selection-steps)                            | Picker opens                                                                                                                                | Both     |
| 2   | Tap/click the Guide icon           | Mobile: tap the Guide icon in the header. Desktop: click the Guide icon in the sidebar header | A description modal opens explaining "how to trade" the currently-selected trade type, with chips to switch between trade types             | Both     |
| 3   | Switch trade type inside the Guide | Select a different trade-type chip inside the modal                                           | Modal content updates to that trade type's description — does not close the modal or affect the underlying picker's own selected trade type | Both     |

### Flow 14 — Close without selecting

| #   | Step                    | Action                                                                                      | Expected Result                                                                | Platform |
| --- | ----------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------- |
| 1   | Note the active tab     | Read the currently active tab's market + trade type                                         | Baseline captured                                                              | Both     |
| 2   | Open the picker         | Follow [Open Market Selection Steps](#open-market-selection-steps) step 1                   | Picker opens                                                                   | Both     |
| 3   | Close without selecting | Click the Close (`aria-label="Close"`) icon (mobile) or click outside the popover (desktop) | Picker closes; the previously active tab/market is unchanged from the baseline | Both     |

### Flow 15 — Switch between existing tabs

**Prerequisites:** At least two tabs already open (e.g. via Flow 1 twice with different markets).

| #   | Step                   | Action                              | Expected Result                                                                                                                                         | Platform |
| --- | ---------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Note both tabs' state  | Read each tab's market + trade type | Baseline captured for Tab A (active) and Tab B (inactive)                                                                                               | Both     |
| 2   | Click the inactive tab | Click Tab B                         | Tab B becomes active (`aria-current="true"`); URL `symbol`/`trade_type` query params update to Tab B's pair; trade form/chart reload for Tab B's market | Both     |
| 3   | Click back to Tab A    | Click Tab A                         | Tab A becomes active again; its (symbol, contract_type) pair is exactly as it was at step 1 — no drift from having visited Tab B                        | Both     |

### Flow 16 — Re-selecting an already-open pair focuses the existing tab

**Prerequisites:** A tab for (market, trade type) already open and NOT active.

| #   | Step                         | Action                                                                          | Expected Result                                                                                | Platform |
| --- | ---------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------- |
| 1   | Note current tab count       | Read the number of open tabs                                                    | Baseline count captured                                                                        | Both     |
| 2   | Open picker via Add market   | Click "Add market"                                                              | Picker opens                                                                                   | Both     |
| 3   | Select the already-open pair | Search for and select the exact (market, trade type) pair already open as a tab | Picker closes; that existing tab becomes active; tab count is UNCHANGED (no duplicate created) | Both     |

### Flow 17 — Same market, different trade type are independent tabs

| #   | Step                                              | Action                                                                | Expected Result                                                                                                                                   | Platform |
| --- | ------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Open a market under Rise/Fall                     | Follow Flow 1 with e.g. 'Volatility 100 Index' + 'Rise/Fall'          | New tab created and active                                                                                                                        | Both     |
| 2   | Open the SAME market under a different trade type | Follow Flow 1 (Add market) with the SAME market + e.g. 'Accumulators' | A SECOND, independent tab is created (not merged with step 1's tab) — both tabs show the same market icon/name but different trade-type subtitles | Both     |
| 3   | Switch between both                               | Click each tab in turn                                                | Each activates independently; no cross-contamination of trade type between them                                                                   | Both     |

### Flow 18 — Remove a non-active tab

**Prerequisites:** At least two tabs open.

| #   | Step                            | Action                                                                                                  | Expected Result                                                                                  | Platform |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------- |
| 1   | Reveal the close control        | Desktop: hover the non-active tab. Mobile: the active tab always shows it, others need...               | Close (×) control (`aria-label="Remove market"`) becomes visible/tappable for the non-active tab | Desktop  |
| 1   | N/A — mobile close affordance   | Mobile shows the × on the active tab by default; a non-active tab's × is reached by first activating it | (documented for completeness — mobile's primary close path is via the active tab)                | Mobile   |
| 2   | Click the × on a non-active tab | Click the Remove button on a tab that is NOT active                                                     | That tab closes; the active tab and all other tabs are unaffected; tab count decreases by 1      | Desktop  |

### Flow 19 — Remove the active tab falls back to an adjacent tab

**Prerequisites:** At least two tabs open, one of them active.

| #   | Step                  | Action                                          | Expected Result                                                                                                                                                                                    | Platform |
| --- | --------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Note tab order        | Read the order of open tabs and which is active | Baseline captured                                                                                                                                                                                  | Both     |
| 2   | Remove the active tab | Click the × on the currently active tab         | That tab closes; the tab immediately to its RIGHT becomes active (or, if the closed tab was last, the tab immediately to its LEFT becomes active) — never leaves the trade page with no active tab | Both     |

### Flow 20 — Remove the last remaining tab is blocked

**Prerequisites:** Exactly one tab open.

| #   | Step                     | Action                                            | Expected Result                                                                           | Platform |
| --- | ------------------------ | ------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------- |
| 1   | Reduce to a single tab   | Remove tabs (per Flow 18/19) until only 1 remains | One tab remains, active                                                                   | Both     |
| 2   | Look for a close control | Hover (desktop) or inspect (mobile) the sole tab  | NO close (×) control renders at all — removal is fully blocked, even via hover on desktop | Both     |

### Flow 21 — Tab strip scroll and active/inactive tab sizing

**Prerequisites:** Enough tabs open to overflow the visible strip width (e.g. at the platform's max — see Flow 26).

| #   | Step                   | Action                                   | Expected Result                                                                                                                  | Platform |
| --- | ---------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Observe collapsed tabs | Look at inactive tabs when many are open | Inactive tabs render compact (icon-first); the ACTIVE tab alone expands to show its full market name + trade-type subtitle       | Both     |
| 2   | Scroll the strip       | Scroll/swipe the tab list horizontally   | Strip scrolls; an edge-fade overlay appears on whichever side still has more tabs to reveal, and clears once that end is reached | Both     |
| 3   | Activate an edge tab   | Click a tab near the scrolled-away edge  | Strip auto-scrolls to bring the newly-active tab fully into view as it expands                                                   | Both     |

### Flow 22 — Tabs persist across page reload

**Prerequisites:** At least two tabs open, e.g. 'Volatility 100 Index' (Rise/Fall) + 'Bull Market Index' (Rise/Fall).

| #   | Step                   | Action                                      | Expected Result                                                                                | Platform |
| --- | ---------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------- |
| 1   | Note tabs + active one | Read the open tabs and which is active      | Baseline captured                                                                              | Both     |
| 2   | Reload the page        | Reload `https://staging-dtrader.deriv.com/` | Page reloads; API/WebSocket settles                                                            | Both     |
| 3   | Verify tabs restored   | Read the open tabs and active tab again     | Same tabs (same symbols + trade types, same order) and the same active tab are restored intact | Both     |

### Flow 23 — Buy always targets the active tab's pair

**Prerequisites:** At least two tabs open with different markets, e.g. Tab A = 'Volatility 100 Index', Tab B = 'Bull Market Index'. Logged-in account with sufficient balance.

| #   | Step                           | Action                                           | Expected Result                                                                                                                          | Platform |
| --- | ------------------------------ | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Set Tab B active, adjust stake | Activate Tab B, set a distinct Stake (e.g. 5.00) | Tab B is active with the new Stake; Tab A remains untouched at its own default                                                           | Both     |
| 2   | Click Buy                      | Click the purchase button while Tab B is active  | The contract purchased matches Tab B's (symbol, contract_type) — balance change and the resulting position both reflect Tab B, not Tab A | Both     |

### Flow 24 — Tab icon reflects its own market

**Prerequisites:** At least three tabs open across visibly different symbol categories (e.g. a Volatility index, a Jump index, and a forex pair like 'EUR/USD').

| #   | Step              | Action                                  | Expected Result                                                                                                                                                              | Platform |
| --- | ----------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Compare tab icons | Read the icon rendered on each open tab | Each tab's icon matches its own symbol (e.g. the forex tab shows a flag icon distinct from the two index tabs' icons) — never a shared/generic icon across different symbols | Both     |

### Flow 25 — Max tab limit enforced (4 on mobile, 7 on desktop)

**Prerequisites:** Open tabs up to the platform's cap (4 on mobile, 7 on desktop) via repeated Flow 1.

> **Correction vs the original test plan:** the redesign's caps are 4 (mobile) / 7 (desktop) BY DESIGN
> (`getMaxOpenMarkets`, `packages/trader/src/AppV2/Utils/open-markets-utils.ts` — unchanged since the
> initial redesign PR, with a dedicated Jest test asserting both values). This is the final, intended
> behavior — desktop is not "failing" to enforce a 4-tab cap; it enforces its own, larger cap correctly.

| #   | Step                               | Action                                                               | Expected Result                                                                                                                                                                              | Platform |
| --- | ---------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Reach the cap                      | Open tabs until the platform's cap is reached (4 mobile / 7 desktop) | The "Add market" button becomes disabled: desktop sets the HTML `disabled` attribute (button unclickable, hover reveals a tooltip); mobile sets `aria-disabled` only (button stays tappable) | Both     |
| 2   | Attempt to open one more (desktop) | Hover the disabled Add-market button                                 | Tooltip reads "You can open up to 7 tabs at a time. Close one to add another."                                                                                                               | Desktop  |
| 2   | Attempt to open one more (mobile)  | Tap the Add-market button                                            | A dismissible snackbar reads "You can open up to 4 tabs at a time. Close one to add another." and the modal does NOT open                                                                    | Mobile   |
| 3   | Recover after closing one          | Close any one tab, then click "Add market" again                     | Button is enabled again; the picker opens and a new tab can be added, bringing the count back to the cap                                                                                     | Both     |

---

## Gap Flows

> These are test cases for coverage gaps. The proposed spec file for each gap is in [`coverage.md`](./coverage.md).

### G1 — No trade parameter is tab-scoped except (symbol, contract_type)

| #   | Test case                                     | Steps                                                                                                       | Expected Result                                                                                                                                                                                                                                                         |
| --- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Stake does not persist per tab                | On Tab A, set Stake to a non-default value. Switch to Tab B, then back to Tab A                             | Tab A's Stake has reverted to its (re-derived) default for that symbol/trade type — the manually-entered value was NOT remembered, because `TOpenMarket` only stores `{symbol, contract_type}`; Stake is a single global observable (`this.amount` in `trade-store.ts`) |
| 2   | Same applies to Duration/Barrier/other params | On Tab A, change Duration (or Barrier, if applicable) from its default. Switch to Tab B, then back to Tab A | Any apparent "isolation" is coincidental — each symbol/trade-type pulls its own default from `contracts_for` on activation, not because the value is remembered per tab. This is systemic, not Stake-specific — do not scope a fix narrowly to Stake                    |

> **Framing correction vs the original test plan:** the manual test run (`06-multiple-trade-tabs.md`,
> TABS-03) described this narrowly as "Stake persistence bug." Source confirms it is broader: the
> `TOpenMarket` record is `{symbol, contract_type}` only — no trade parameter is tab-scoped by
> architecture. Any fix should be scoped to "make trade parameters tab-aware" generally, not just Stake.
