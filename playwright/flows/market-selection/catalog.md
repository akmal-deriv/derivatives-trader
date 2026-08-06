# 🗺️ Market Selection & Trade Tabs Journey Catalog — Technical Reference

> Source of truth: `playwright/pages/TradeParametersPage.ts` (extended — no new Page Object; see Section 4)
> Source components: `packages/trader/src/AppV2/Components/MarketSelection/`, `packages/trader/src/AppV2/Components/MarketTabs/`
> Created: 2026-08-05 | Last updated: 2026-08-06 (master PR #974 removed the Featured/Discovery view — see Flows 5–7 and Section 4)

---

## Section 1 — Journey Index

| Journey ID       | Spec File                                                     | Tags                                                             |
| ---------------- | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| Flow 1–7, 13, 14 | `market-selection/verify-market-browse-and-discovery.spec.ts` | `@market-selection @regression @desktop @mobile`                 |
| Flow 8           | `market-selection/verify-market-info-screen.spec.ts`          | `@market-selection @regression @desktop @mobile`                 |
| Flow 9, 10       | `market-selection/verify-market-search.spec.ts`               | `@market-selection @smoke @desktop @mobile`                      |
| Flow 11          | `market-selection/verify-market-favourites.spec.ts`           | `@market-selection @regression @desktop @mobile`                 |
| Flow 12          | `market-selection/verify-market-favourites.spec.ts`           | `@market-selection @regression @desktop @mobile`                 |
| Flow 15–21, 24   | `market-selection/verify-trade-tabs.spec.ts`                  | `@market-selection @smoke @desktop @mobile`                      |
| Flow 22          | `market-selection/verify-trade-tabs-persistence.spec.ts`      | `@market-selection @regression @desktop @mobile`                 |
| Flow 23          | `market-selection/verify-trade-tabs-buy.spec.ts`              | `@market-selection @trade @regression @desktop @mobile @staging` |
| Flow 25          | `market-selection/verify-trade-tabs-max-limit.spec.ts`        | `@market-selection @regression @desktop @mobile`                 |
| G1               | Not automated — see [`coverage.md`](./coverage.md)            | —                                                                |

> None of these spec files exist yet — this catalog is written to guide the next step (`/flow-to-playwright-dtrader`), not implemented here.

---

## Section 2 — Flow Details

### Flows 1–2 — Open picker (new tab vs. replace)

**Test pattern:**

```typescript
// Flow 1 — Add market → new tab
const tabCountBefore = await tradeParametersPage.marketTabs.count();
await tradeParametersPage.addMarketButton.click();
await expect(tradeParametersPage.marketSelectionPanel, 'Picker should open').toBeVisible();
await tradeParametersPage.selectMarketAndTradeType('Jump 75 Index', 'Rise/Fall'); // reuses existing method
await expect(tradeParametersPage.marketTabs, 'A new tab should be appended').toHaveCount(tabCountBefore + 1);
await expect(tradeParametersPage.activeMarketTab, 'New tab should be active').toContainText('Jump 75 Index');

// Flow 2 — click active tab → replace
const tabCountBefore2 = await tradeParametersPage.marketTabs.count();
await tradeParametersPage.activeMarketTab.click(); // NOT addMarketButton
await expect(tradeParametersPage.marketSelectionPanel, 'Picker should open').toBeVisible();
await tradeParametersPage.selectMarketAndTradeType('EUR/USD', 'Rise/Fall');
await expect(tradeParametersPage.marketTabs, 'Tab count should be unchanged (replaced, not added)').toHaveCount(
    tabCountBefore2
);
```

### Flows 3–4 — Trade-type navigation and switching

```typescript
await tradeParametersPage.addMarketButton.click();
await expect(tradeParametersPage.marketSelectionPanel, 'Picker should open').toBeVisible();

// Flow 3: same set both platforms — desktop sidebar groups, mobile tab strip
const tradeTypeLabels = await tradeParametersPage.tradeTypeNavItems.allTextContents();
expect(tradeTypeLabels, 'Trade-type list should include Accumulators').toContain('Accumulators');

// Flow 4: switching reloads the list to only tradeable symbols
await tradeParametersPage.selectTradeTypeInPicker('Accumulators');
await expect(tradeParametersPage.marketSelectionResultsList, 'List should reload for Accumulators').toBeVisible();
```

### Flow 5 — Asset-class category filter

```typescript
await tradeParametersPage.marketCategoryChip('Forex').click();
// Confirmed live: Quill's Chip.Selectable exposes `data-state="selected"`, not `aria-selected`.
await expect(tradeParametersPage.marketCategoryChip('Forex'), 'Forex chip should be selected').toHaveAttribute(
    'data-state',
    'selected'
);
```

### Flow 6 — Featured/Discovery view removed (regression guard)

```typescript
// No Featured chip exists anymore.
await expect(tradeParametersPage.marketCategoryChip('Featured'), 'Featured chip should not exist').toHaveCount(0);
// Discovery sections never render — DiscoveryView/DiscoverySection are unreachable dead code
// (show_discovery is hardcoded false in useMarketSelection.ts).
await expect(
    tradeParametersPage.page.getByText('Trending', { exact: true }),
    'Trending section should not render'
).not.toBeVisible();
await expect(
    tradeParametersPage.page.getByText('Gainers', { exact: true }),
    'Gainers section should not render'
).not.toBeVisible();
await expect(
    tradeParametersPage.page.getByText('Losers', { exact: true }),
    'Losers section should not render'
).not.toBeVisible();
```

### Flow 7 — Time-window dropdown is always present

```typescript
// No prior category click needed — the dropdown is present as soon as the picker opens, because
// the picker now ALWAYS lands in the category list view.
await expect(
    tradeParametersPage.marketChangesDropdownTrigger,
    'Changes dropdown should be visible by default'
).toBeVisible();
await tradeParametersPage.marketChangesDropdownTrigger.click();
await tradeParametersPage.marketChangesDropdownOption('15 minutes').click();
await expect(tradeParametersPage.marketChangesDropdownTrigger, 'Trigger should show the new window').toContainText(
    '15 minutes'
);

// The dropdown is absent only on the Favourite tab.
await tradeParametersPage.favouritesTab.click();
await expect(
    tradeParametersPage.marketChangesDropdownTrigger,
    'Changes dropdown should not appear on Favourites'
).not.toBeVisible();
```

### Flow 8 — Market Info screen

```typescript
await tradeParametersPage.marketInfoButton('Volatility 100 Index').click();
await expect(tradeParametersPage.marketInfoScreen, 'Info screen should replace the browse panel').toBeVisible();
await expect(tradeParametersPage.marketInfoTradeOnSection, '"Trade on" section should list trade types').toBeVisible();
await tradeParametersPage.marketInfoFavouriteButton.click();
await expect(tradeParametersPage.marketInfoFavouriteButton, 'Favourite toggles to Unfavourite').toHaveAttribute(
    'aria-pressed',
    'true'
);
await tradeParametersPage.marketInfoTradeOnCard('Multipliers').click();
await expect(tradeParametersPage.marketSelectionPanel, 'Picker should close after Trade-on CTA').not.toBeAttached();
```

### Flows 9–10 — Search and empty results

```typescript
// Flow 9
if (isMobileViewport) await tradeParametersPage.marketSelectionSearchButton.click();
await tradeParametersPage.marketSearchInput.fill('Volatility');
await tradeParametersPage.marketSearchResultRow('Volatility 100 Index', 'Rise/Fall').click();

// Flow 10
await tradeParametersPage.marketSearchInput.fill('zzznotreal');
await expect(tradeParametersPage.marketEmptyStateTitle, 'Empty state should show "No result found"').toHaveText(
    'No result found'
);
```

### Flows 11–12 — Favourites and persistence

```typescript
// Flow 11 — note: the Favourite tab renders rows under `.market-favourites__group`, NOT
// `.market-search-results__group` — use favouriteMarketRow(), not marketSearchResultRow().
await tradeParametersPage.favouriteButton('Volatility 100 Index').click();
await expect(tradeParametersPage.favouriteButton('Volatility 100 Index'), 'Should flip to Unfavourite').toHaveAttribute(
    'aria-label',
    'Unfavourite'
);
await tradeParametersPage.favouritesTab.click();
await expect(
    tradeParametersPage.favouriteMarketRow('Volatility 100 Index'),
    'Favourited market should appear in the Favourite tab'
).toBeVisible();

// Flow 12 — no login required, favourite_markets_v2 is plain localStorage
await page.reload();
await NavigationUtils.waitForDerivApiSettled(page);
await tradeParametersPage.addMarketButton.click();
await tradeParametersPage.favouritesTab.click();
await expect(
    tradeParametersPage.favouriteMarketRow('Volatility 100 Index'),
    'Favourite should survive reload'
).toBeVisible();
```

### Flows 15–21, 24 — Core tab mechanics

**Account setup:** none — all browsable without login. Flow 23 (Buy) is the only tab-strip flow needing an account.

```typescript
// Flow 15 — switch tabs
await tradeParametersPage.selectMarketAndTradeType('Bull Market Index', 'Rise/Fall', { openInNewTab: true });
await tradeParametersPage.marketTab('Volatility 100 Index', 'Rise/Fall').click();
await expect(tradeParametersPage.activeMarketTab, 'Should switch back to Volatility 100').toContainText(
    'Volatility 100 Index'
);

// Flow 16 — reselect an already-open pair (no duplicate)
const tabCount = await tradeParametersPage.marketTabs.count();
await tradeParametersPage.selectMarketAndTradeType('Bull Market Index', 'Rise/Fall', { openInNewTab: true });
await expect(tradeParametersPage.marketTabs, 'No duplicate tab should be created').toHaveCount(tabCount);

// Flow 17 — same market, different trade type = independent tabs
await tradeParametersPage.selectMarketAndTradeType('Volatility 100 Index', 'Accumulators', { openInNewTab: true });
await expect(tradeParametersPage.marketTabs, 'A second, independent tab should exist').toHaveCount(tabCount + 1);

// Flow 18 — remove a non-active tab (desktop hover)
await tradeParametersPage.marketTab('Bull Market Index', 'Rise/Fall').hover();
await tradeParametersPage.removeMarketTabButton('Bull Market Index', 'Rise/Fall').click();

// Flow 19 — remove the active tab, falls back to adjacent
await tradeParametersPage.activeMarketTab.locator('..').getByRole('button', { name: 'Remove market' }).click();
// Assert fallback via activeMarketTab content — see flow.md for exact left/right rule

// Flow 20 — remove the last tab is blocked
await expect(
    tradeParametersPage.activeMarketTab.getByRole('button', { name: 'Remove market' }),
    'Close control should not render with only one tab'
).not.toBeVisible();

// Flow 21 — scroll + active/inactive sizing — visual/behavioral, assert via bounding box or scrollLeft change
// Flow 24 — tab icon — assert distinct <svg> presence per tab, or a stable data attribute if one is added
```

### Flow 22 — Tabs persist across reload

```typescript
await tradeParametersPage.selectMarketAndTradeType('Bull Market Index', 'Rise/Fall', { openInNewTab: true });
await page.reload();
await NavigationUtils.waitForDerivApiSettled(page);
await expect(tradeParametersPage.marketTabs, 'Both tabs should be restored').toHaveCount(2);
```

### Flow 23 — Buy targets the active tab

**Account setup:**

```typescript
const account = await createAccountV2('real', 'al', { currency: 'USD' });
```

```typescript
await tradeParametersPage.selectMarketAndTradeType('Bull Market Index', 'Rise/Fall', { openInNewTab: true });
await tradeParametersPage.stakeInput.fill('5');
await tradeParametersPage.purchaseButton('Rise').click(); // reuse existing Rise/Fall purchase method if present
// Assert balance delta is exactly -5.00 and the new position matches Bull Market Index, not the other open tab
```

### Flow 25 — Max tab limit (4 mobile / 7 desktop)

```typescript
const max = isMobileViewport ? 4 : 7;
for (let i = 0; i < max - 1; i++) {
    await tradeParametersPage.selectMarketAndTradeType(SOME_UNIQUE_MARKET[i], 'Rise/Fall', { openInNewTab: true });
}
await expect(
    tradeParametersPage.addMarketButton,
    'Add button should be disabled/aria-disabled at the cap'
).toHaveAttribute('aria-disabled', 'true');
if (!isMobileViewport) {
    await expect(tradeParametersPage.addMarketButton, 'Desktop should set the HTML disabled attribute').toBeDisabled();
    await tradeParametersPage.addMarketButton.hover();
    await expect(page.getByText('You can open up to 7 tabs at a time. Close one to add another.')).toBeVisible();
} else {
    await tradeParametersPage.addMarketButton.click(); // still tappable — aria-disabled only
    await expect(page.getByText('You can open up to 4 tabs at a time. Close one to add another.')).toBeVisible();
}
```

---

## Section 3 — Tags Reference

| Tag                 | When to apply                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `@market-selection` | All tests in this feature area (picker + tab strip)                                       |
| `@trade`            | Additionally applied when a flow also exercises Buy (Flow 23)                             |
| `@smoke`            | Critical path — search-and-select (Flows 9–10) and core tab mechanics (Flows 15–21, 24)   |
| `@regression`       | Full-coverage flows not required on every run (discovery, favourites, persistence, limit) |
| `@staging`          | Uses account creation (`createAccountV2`) — Flow 23 only (Flow 12 needs no login)         |
| `@desktop`          | Desktop viewport (chromium project)                                                       |
| `@mobile`           | Mobile viewport (chromium-mobile project)                                                 |

> No `@production` tag anywhere in this module — Flow 23 mutates a real account's balance/positions, and several other flows depend on live market/discovery data that isn't safe to assert deterministically on production.

---

## Section 4 — Feature-Specific Decisions

### No new Page Object — extend `TradeParametersPage`

The market-selection picker and tab strip are both sub-panels of the trade page, and `TradeParametersPage`
(→ `TradeBasePage`) already owns `marketSelectionPanel`, `marketSearchInput`, `marketSearchResultRow`,
`addMarketButton`, and `activeMarketTab`. Per the "one Page Object per route" rule this is still the
trade route — add the new locators/methods below to `TradeParametersPage.ts` rather than creating a
`MarketSelectionPage.ts`.

**Impact on generated code:** all method chains above assume `tradeParametersPage` — do not create or
register a new fixture.

### Featured/Discovery view was removed (master PR #974, 2026-08-06)

The "Featured" category chip and the Trending/Gainers/Losers discovery cards no longer exist —
`show_discovery` is hardcoded `false` in `useMarketSelection.ts`, and `getMarketCategories()` no longer
returns a Featured entry. The picker now ALWAYS opens directly into the flat category list, scoped to
`categories[0]` (the first available category for the current trade type — typically "Derived" for
synthetic-heavy trade types like Rise/Fall). `DiscoveryView`/`DiscoverySection`/`MarketCard` still exist
in source but are permanently unreachable. **Impact on generated code:** never assert a "Featured" chip
or Trending/Gainers/Losers sections exist — Flow 6 now asserts the OPPOSITE (they must not exist) as a
regression guard. The `discoverySection`/`discoveryCard`/`discoverySectionScrollEndButton` POM locators
that previously targeted these were removed — do not re-add them without re-confirming the feature has
actually come back.

### The "Changes ({window})" dropdown is now always present (except on Favourites)

Before the Featured removal, the dropdown only appeared once a non-Featured category was selected.
Since every browse view is now the category list, the dropdown is present as soon as the picker opens —
no prior chip click needed. The one remaining exception is the Favourites tab: `MarketFavouritesView`
never receives `window`/`onSelectWindow` props, so it still renders no dropdown. **Impact on generated
code:** Flow 7's test asserts the dropdown is visible immediately, not after a category click.

### Closed markets are shown, not hidden

`useTradeTypeSymbols` retains closed markets in the list (tagged "CLOSED") — the `active_symbols`
`contract_type` filter only excludes symbols NOT tradeable under the selected trade type, it does not
exclude symbols outside current trading hours. **Impact on generated code:** never assert "closed
markets are absent" — assert "closed markets show a CLOSED tag" instead.

### Favourites are keyed by `(symbol, trade_type)`, not by symbol alone

`toggleFavourite(symbol, trade_type, source)` — a market can be favourited under one trade type and not
another. **Impact on generated code:** always pass the trade-type context when asserting favourite state.

### Desktop vs. mobile disabled-state pattern for "Add market" at the cap

Desktop sets the real HTML `disabled` attribute (Playwright's `toBeDisabled()` applies; button is not
clickable). Mobile keeps the button enabled and only sets `aria-disabled="true"`, showing a snackbar on
tap instead of a tooltip. **Impact on generated code:** never use `toBeDisabled()` for the mobile
assertion — check `aria-disabled` and the snackbar text instead.

### Max tab cap differs by platform — 4 mobile / 7 desktop, both intentional

Do not parametrize a single "expected max = 4" constant across both viewports. Use
`isMobileViewport ? 4 : 7` (or an equivalent constant if added to the POM) everywhere a cap is asserted.

### Selecting a market always commits BOTH symbol and trade type together

`selectMarketAndTradeType` (existing method) already encodes this — every new flow that ends in
"a market is selected" (Info screen Trade-on CTA, Favourites, Search) should reuse the existing
assertions inside it (`verifyParamsForTradeType`) rather than re-asserting trade-form params from
scratch.

### `open_markets` persistence keys (for Flow 22)

Tabs persist via `localStorage` keys `open_markets_v2` (manual trading) and
`open_markets_automation_v2` (Automate) — confirmed in `open-markets-utils.ts`. No test should read
these keys directly; assert via the rendered tab strip after reload, not via localStorage inspection.
