# 🗺️ Positions Journey Catalog — Technical Reference

> Source of truth: `playwright/pages/PositionsPage.ts` (to be created)
> Created: 2026-06-11 | Last updated: 2026-06-11

---

## Section 1 — Journey Index

| Journey ID | Spec File                                            | Tags                             |
| ---------- | ---------------------------------------------------- | -------------------------------- |
| Flow 1     | `positions/open-positions-mobile.spec.ts`            | `@positions @smoke @mobile`      |
| Flow 2     | `positions/open-positions-desktop.spec.ts`           | `@positions @smoke @desktop`     |
| Flow 3     | `positions/empty-open-positions.spec.ts`             | `@positions @regression @mobile` |
| Flow 4     | `positions/closed-positions-mobile.spec.ts`          | `@positions @smoke @mobile`      |
| Flow 5     | `positions/filter-open-by-trade-type.spec.ts`        | `@positions @regression @mobile` |
| Flow 6     | `positions/filter-closed-by-time.spec.ts`            | `@positions @regression @mobile` |
| Flow 7     | `positions/contract-details-from-positions.spec.ts`  | `@positions @smoke @mobile`      |
| G1         | `positions/close-contract-from-positions.spec.ts`    | `@positions @regression @mobile` |
| G2         | `positions/cancel-multiplier-from-positions.spec.ts` | `@positions @regression @mobile` |
| G3         | `positions/empty-closed-positions.spec.ts`           | `@positions @regression @mobile` |
| G4         | `positions/filter-no-matches.spec.ts`                | `@positions @regression @mobile` |

---

## Section 2 — Flow Details

### Flow 1 — Open positions list loads on mobile

**Account setup:** Real account with at least one open contract (use a live staging account with `TEST_EMAIL` / `TEST_PASSWORD` env vars — cannot create a contract via `createAccountV2` alone; a pre-existing funded account with an open contract is required).

**Test pattern:**

```typescript
test.describe('Positions — Open tab (mobile)', { tag: ['@positions', '@smoke', '@mobile'] }, () => {
    let BASE_URL: string = undefined!;

    test.beforeAll(() => {
        const url = process.env.BASE_URL;
        if (!url) throw new Error('BASE_URL not set in playwright/.env.staging');
        BASE_URL = url;
    });

    test.beforeEach(async ({ loginPage }) => {
        await loginPage.login();
    });

    test('VERIFY open positions list loads with contract cards', async ({ page, positionsPage }) => {
        await redirectionHelpers.redirectTo(page, '/positions');
        await expect(positionsPage.openTab, 'Open tab should be active by default').toBeVisible();
        await expect(positionsPage.contractCards.first(), 'At least one contract card should be visible').toBeVisible();
        await expect(positionsPage.totalProfitLoss, 'Total P/L summary should be visible').toBeVisible();
    });
});
```

**Page Object locator pattern:**

```typescript
// positionsPage.openTab — no testid; use role
get openTab(): Locator {
    return this.page.getByRole('tab', { name: 'Open' });
}

// positionsPage.contractCards
get contractCards(): Locator {
    return this.page.getByTestId('dt_contract_card');
}

// positionsPage.totalProfitLoss
get totalProfitLoss(): Locator {
    return this.page.getByTestId('dt_total_profit_loss');
}
```

---

### Flow 2 — Open positions list loads on desktop (sidebar flyout)

**Account setup:** Same as Flow 1 — real account with open contracts.

**Test pattern:**

```typescript
test.describe('Positions — Sidebar flyout (desktop)', { tag: ['@positions', '@smoke', '@desktop'] }, () => {
    test.beforeEach(async ({ loginPage }) => {
        await loginPage.login();
    });

    test('VERIFY positions flyout opens from sidebar with contract cards', async ({ page, positionsPage }) => {
        await positionsPage.openSidebarPositions();
        await expect(positionsPage.flyoutTitle, 'Flyout title "Open positions" should be visible').toBeVisible();
        await expect(positionsPage.contractCards.first(), 'At least one contract card should be visible').toBeVisible();
        await expect(positionsPage.flyoutFooter, 'Flyout footer with Total P/L should be visible').toBeVisible();
    });
});
```

**Page Object locator pattern:**

```typescript
// positionsPage.sidebarPositionsButton
get sidebarPositionsButton(): Locator {
    return this.page.getByTestId('dt_sidebar_positions');
}

// positionsPage.flyoutTitle — no testid; use text
get flyoutTitle(): Locator {
    return this.page.getByText('Open positions');
}

// positionsPage.flyoutFooter — no testid; use text
get flyoutFooter(): Locator {
    return this.page.getByText('Total P/L:');
}

// openSidebarPositions action
async openSidebarPositions(): Promise<void> {
    await this.sidebarPositionsButton.click();
    await NavigationUtils.waitForDerivApiSettled(this.page);
}
```

---

### Flow 3 — Empty open positions state

**Account setup:** Real account with NO open contracts at test execution time.

**Test pattern:**

```typescript
test.describe('Positions — Empty open state', { tag: ['@positions', '@regression', '@mobile'] }, () => {
    test.beforeEach(async ({ loginPage }) => {
        await loginPage.login();
    });

    test('VERIFY empty state shown when no open positions', async ({ page, positionsPage }) => {
        await redirectionHelpers.redirectTo(page, '/positions');
        await expect(positionsPage.emptyStateIcon, 'Empty state icon should be visible').toBeVisible();
        await expect(
            page.getByText('No open positions'),
            'Empty heading should show "No open positions"'
        ).toBeVisible();
        await expect(
            page.getByText('Your active trades will appear here.'),
            'Empty description should be visible'
        ).toBeVisible();
    });
});
```

**Page Object locator pattern:**

```typescript
// positionsPage.emptyStateIcon
get emptyStateIcon(): Locator {
    return this.page.getByTestId('dt_empty_state_icon');
}
```

---

### Flow 4 — Closed positions tab loads with date sections

**Account setup:** Real account with closed contract history.

**Test pattern:**

```typescript
test.describe('Positions — Closed tab', { tag: ['@positions', '@smoke', '@mobile'] }, () => {
    test.beforeEach(async ({ loginPage }) => {
        await loginPage.login();
    });

    test('VERIFY closed positions tab shows contracts grouped by date', async ({ page, positionsPage }) => {
        await redirectionHelpers.redirectTo(page, '/positions');
        await positionsPage.switchToClosedTab();
        await expect(positionsPage.contractCards.first(), 'Closed contract card should be visible').toBeVisible();
        await expect(positionsPage.totalProfitLoss, 'Total P/L summary should be visible at bottom').toBeVisible();
    });
});
```

**Page Object locator pattern:**

```typescript
// positionsPage.closedTab
get closedTab(): Locator {
    return this.page.getByRole('tab', { name: 'Closed' });
}

// positionsPage.switchToClosedTab action
async switchToClosedTab(): Promise<void> {
    await this.closedTab.click();
    await NavigationUtils.waitForDerivApiSettled(this.page);
}
```

---

### Flow 5 — Filter open positions by trade type

**Account setup:** Real account with multiple open contracts of different trade types.

**Test pattern:**

```typescript
test.describe('Positions — Trade type filter', { tag: ['@positions', '@regression', '@mobile'] }, () => {
    test.beforeEach(async ({ loginPage, page }) => {
        await loginPage.login();
        await redirectionHelpers.redirectTo(page, '/positions');
    });

    test('VERIFY filter by trade type narrows open positions list', async ({ page, positionsPage }) => {
        const initialCount = await positionsPage.contractCards.count();
        await positionsPage.openTradeTypeFilter();
        await positionsPage.selectFirstTradeTypeFilter();
        await positionsPage.applyFilter();
        const filteredCount = await positionsPage.contractCards.count();
        expect(filteredCount, 'Filtered count should be less than or equal to initial count').toBeLessThanOrEqual(
            initialCount
        );
        await expect(positionsPage.tradeTypeFilterChip, 'Filter chip should show count').toContainText('(');
    });
});
```

**Page Object locator pattern:**

```typescript
// positionsPage.tradeTypeFilterChip — no testid; use text
get tradeTypeFilterChip(): Locator {
    return this.page.getByText('Trade types');
}

// positionsPage.filterActionSheetApplyButton — no testid; use role
get filterActionSheetApplyButton(): Locator {
    return this.page.getByRole('button', { name: 'Apply' });
}

// positionsPage.filterActionSheetClearAllButton — no testid; use role
get filterActionSheetClearAllButton(): Locator {
    return this.page.getByRole('button', { name: 'Clear All' });
}

// positionsPage.openTradeTypeFilter action
async openTradeTypeFilter(): Promise<void> {
    await this.tradeTypeFilterChip.click();
    await expect(this.page.getByText('Filter by trade types'), 'Filter sheet should open').toBeVisible();
}

// positionsPage.selectFirstTradeTypeFilter action — selects first available checkbox
async selectFirstTradeTypeFilter(): Promise<void> {
    await this.page.getByRole('checkbox').first().check();
}

// positionsPage.applyFilter action
async applyFilter(): Promise<void> {
    await this.filterActionSheetApplyButton.click();
}
```

---

### Flow 6 — Filter closed positions by time

**Account setup:** Real account with closed contracts spanning multiple days.

**Test pattern:**

```typescript
test.describe('Positions — Time filter (closed)', { tag: ['@positions', '@regression', '@mobile'] }, () => {
    test.beforeEach(async ({ loginPage, page }) => {
        await loginPage.login();
        await redirectionHelpers.redirectTo(page, '/positions');
    });

    test('VERIFY time filter narrows closed positions list', async ({ page, positionsPage }) => {
        await positionsPage.switchToClosedTab();
        await positionsPage.openTimeFilter();
        await positionsPage.selectTimeFilterOption('Today');
        await expect(positionsPage.timeFilterChip, 'Time chip should show "Today"').toContainText('Today');
        await positionsPage.resetTimeFilter();
        await expect(positionsPage.timeFilterChip, 'Time chip should reset to default').not.toContainText('Today');
    });
});
```

**Page Object locator pattern:**

```typescript
// positionsPage.timeFilterChip — no testid; fallback to All time chip (text varies by selection)
get timeFilterChip(): Locator {
    return this.page.getByRole('button', { name: /All time|Today|Yesterday|Last/ }).first()
        .or(this.page.locator('.filter__chip').first());
}

// positionsPage.timeFilterResetButton — no testid
get timeFilterResetButton(): Locator {
    return this.page.getByRole('button', { name: 'Reset' });
}

// positionsPage.openTimeFilter action
async openTimeFilter(): Promise<void> {
    await this.timeFilterChip.click();
    await expect(this.page.getByText('Filter by time'), 'Time filter sheet should open').toBeVisible();
}

// positionsPage.selectTimeFilterOption action
async selectTimeFilterOption(option: string): Promise<void> {
    await this.page.getByRole('radio', { name: option }).click();
}

// positionsPage.resetTimeFilter action
async resetTimeFilter(): Promise<void> {
    await this.timeFilterChip.click();
    await this.timeFilterResetButton.click();
}
```

---

### Flow 7 — Navigate from open position card to contract details

**Account setup:** Real account with at least one open contract.

**Test pattern:**

```typescript
test.describe('Positions — Navigate to contract details', { tag: ['@positions', '@smoke', '@mobile'] }, () => {
    test.beforeEach(async ({ loginPage }) => {
        await loginPage.login();
    });

    test('VERIFY clicking a contract card navigates to contract details', async ({ page, positionsPage }) => {
        await redirectionHelpers.redirectTo(page, '/positions');
        await positionsPage.contractCards.first().click();
        await NavigationUtils.waitForDerivApiSettled(page);
        await expect(page.getByText('Contract details'), 'Contract details header should be visible').toBeVisible();
        await expect(positionsPage.contractCards.first(), 'Contract card should be visible in details').toBeVisible();
        await page.goBack();
        await NavigationUtils.waitForDerivApiSettled(page);
        await expect(positionsPage.contractCards.first(), 'Should return to positions list').toBeVisible();
    });
});
```

---

## Section 3 — Tags Reference

| Tag           | When to apply                                                                         |
| ------------- | ------------------------------------------------------------------------------------- |
| `@positions`  | All tests in the positions feature area                                               |
| `@smoke`      | Critical path — open positions list visible, tab switching, card → details navigation |
| `@regression` | Full coverage including filters, edge states, close/cancel actions                    |
| `@production` | Tests safe to run on production (read-only, no contract mutations)                    |
| `@desktop`    | Desktop viewport — sidebar flyout flow only                                           |
| `@mobile`     | Mobile viewport — full-page `/positions` route with tabs                              |

---

## Section 4 — Feature-Specific Decisions

### Desktop-only: sidebar flyout, not a full-page route

`PositionsSwitch` redirects to `/` on desktop — the positions page only renders on mobile. Desktop positions live in the sidebar `Flyout` component opened by clicking `dt_sidebar_positions`. All desktop position tests must navigate to `/` first and interact via the sidebar. Never navigate to `/positions` on desktop — it redirects.

**Impact on generated code:** Desktop tests must click `dt_sidebar_positions` and assert on flyout content. Mobile tests use `redirectionHelpers.redirectTo(page, '/positions')`.

### No testids on filter chips or action sheet elements

The `ContractTypeFilter` and `TimeFilter` components use Quill UI `Chip.Standard` and `ActionSheet` — no `data-testid` attributes. Use role/text locators: `getByRole('button', { name: '...' })`, `getByText(...)`, `getByRole('checkbox')`, `getByRole('radio', { name: '...' })`.

**Impact on generated code:** Locators for filter chips fall back to text/role. Verify actual label text on staging before finalising assertions.

### Contract cards navigation uses `NavLink` with `redirectTo` prop

`ContractCard` renders as `NavLink` when `redirectTo` is set (open positions) and as `div` when not (desktop drawer). On mobile, clicking a contract card navigates to `/contract/{id}`. On desktop flyout, cards are non-navigable divs. Do not assert navigation from desktop flyout cards.

**Impact on generated code:** Flow 7 (card → contract details) is mobile only. Desktop tests should not assert navigation from flyout cards.

### Closed positions loading — scroll-triggered pagination

`ContractCardsSections` shows a `dt_load_more_spinner` when `isLoadingMore` is true. For accounts with many closed contracts, scroll to bottom to trigger fetch of next batch. Tests asserting a specific number of closed contracts should avoid exact counts — use `toBeVisible()` on the first card instead.

**Impact on generated code:** Avoid `contractCards.count()` assertions on the closed tab; prefer `.first().toBeVisible()`.

### Open positions require a pre-existing funded account

`createAccountV2` provisions a new account — it will have no open positions. Flows 1, 2, 4, 5, 6, 7 require a staging account that already has open/closed contracts. Use the shared `TEST_EMAIL`/`TEST_PASSWORD` staging account credentials, not a freshly created account.

**Impact on generated code:** No `createAccountV2` call in `beforeAll` for these flows — rely on env var credentials directly via `loginPage.login()`.

### `waitForDerivApiSettled` required after tab switch and filter apply

Switching from Open to Closed tab triggers a WebSocket call (`onClosedTabMount`) to fetch profit table data. Filter apply on the closed tab also triggers a refetch. Always call `NavigationUtils.waitForDerivApiSettled(page)` after these interactions before asserting card visibility.

**Impact on generated code:** Add `await NavigationUtils.waitForDerivApiSettled(page)` after `switchToClosedTab()` and after `applyFilter()` on the closed tab.
