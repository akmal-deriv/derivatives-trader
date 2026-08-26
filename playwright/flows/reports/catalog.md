# 🗺️ Reports Journey Catalog — Technical Reference

> Source of truth: `playwright/pages/ReportsPage.ts` (to be created)
> Created: 2026-06-11 | Last updated: 2026-06-11

---

## Section 1 — Journey Index

| Journey ID | Spec File                                                   | Tags                                    |
| ---------- | ----------------------------------------------------------- | --------------------------------------- |
| Flow 1     | `reports/verify-reports-page-loads.spec.ts`                 | `@reports @smoke @desktop @mobile`      |
| Flow 2     | `reports/verify-open-positions-options.spec.ts`             | `@reports @smoke @desktop @mobile`      |
| Flow 3     | `reports/verify-open-positions-multipliers.spec.ts`         | `@reports @regression @desktop @mobile` |
| Flow 4     | `reports/verify-open-positions-accumulators.spec.ts`        | `@reports @regression @desktop @mobile` |
| Flow 5     | `reports/verify-trade-table-tab.spec.ts`                    | `@reports @smoke @desktop @mobile`      |
| Flow 6     | `reports/verify-statement-tab.spec.ts`                      | `@reports @smoke @desktop @mobile`      |
| Flow 7     | `reports/verify-empty-trade-table.spec.ts`                  | `@reports @regression @desktop @mobile` |
| Flow 8     | `reports/verify-empty-statement.spec.ts`                    | `@reports @regression @desktop @mobile` |
| G1         | `reports/verify-open-positions-to-contract-details.spec.ts` | `@reports @regression @desktop @mobile` |
| G2         | `reports/verify-archived-statement.spec.ts`                 | `@reports @regression @desktop @mobile` |

---

## Section 2 — Flow Details

### Flow 1 — Reports page loads with default tab

**Account setup:** Any logged-in account. Use `TEST_EMAIL` / `TEST_PASSWORD` env vars via `loginPage.login()`.

**Test pattern:**

```typescript
test.describe('Reports — Page loads', { tag: ['@reports', '@smoke', '@desktop', '@mobile'] }, () => {
    let BASE_URL: string = undefined!;

    test.beforeAll(() => {
        const url = process.env.BASE_URL;
        if (!url) throw new Error('BASE_URL not set in playwright/.env.staging');
        BASE_URL = url;
    });

    test.beforeEach(async ({ loginPage }) => {
        await loginPage.login();
    });

    test('VERIFY reports page loads with default Open positions tab', async ({ page, reportsPage }) => {
        await redirectionHelpers.redirectTo(page, '/reports');
        await expect(reportsPage.metaWrapper, 'Reports meta wrapper should be visible').toBeVisible();
        await expect(reportsPage.pageHeading, 'Reports heading should be visible').toBeVisible();
        await expect(page, 'URL should default to /reports/positions').toHaveURL(/\/reports\/positions/);
    });
});
```

**Page Object locator pattern:**

```typescript
// reportsPage.metaWrapper
get metaWrapper(): Locator {
    return this.page.getByTestId('dt_reports_meta_wrapper');
}

// reportsPage.pageHeading — no testid; use text
get pageHeading(): Locator {
    return this.page.getByText('Reports').first();
}
```

---

### Flow 2 — Open Positions tab — Options contracts

**Account setup:** Real account with at least one open Options contract. Use `TEST_EMAIL` / `TEST_PASSWORD`.

**Test pattern:**

```typescript
test.describe('Reports — Open Positions (Options)', { tag: ['@reports', '@smoke', '@desktop', '@mobile'] }, () => {
    test.beforeEach(async ({ loginPage }) => {
        await loginPage.login();
    });

    test('VERIFY open positions tab shows Options contracts by default', async ({ page, reportsPage }) => {
        await redirectionHelpers.redirectTo(page, '/reports/positions');
        await expect(reportsPage.metaWrapper, 'Meta wrapper should be visible on Open Positions tab').toBeVisible();
        await expect(reportsPage.contractTypeFilter, 'Contract type filter should be visible').toBeVisible();
        await expect(reportsPage.tableRows.first(), 'At least one contract row should be visible').toBeVisible();
    });
});
```

**Page Object locator pattern:**

```typescript
// reportsPage.contractTypeFilter — desktop: Dropdown; mobile: SelectNative
get contractTypeFilter(): Locator {
    const isMobile = (this.page.viewportSize()?.width ?? 1024) < 1024;
    if (isMobile) {
        return this.page.getByRole('combobox').first();
    }
    return this.page.locator('.dc-dropdown__container').first();
}

// reportsPage.tableRows — DataTable rows (desktop) / DataList items (mobile)
get tableRows(): Locator {
    return this.page.getByRole('row').or(
        this.page.locator('.dc-data-list__item')
    );
}
```

---

### Flow 3 — Open Positions tab — Multipliers filter

**Account setup:** Real account with at least one open Multiplier contract.

**Test pattern:**

```typescript
test.describe(
    'Reports — Open Positions (Multipliers)',
    { tag: ['@reports', '@regression', '@desktop', '@mobile'] },
    () => {
        test.beforeEach(async ({ loginPage }) => {
            await loginPage.login();
        });

        test('VERIFY switching to Multipliers filter shows multiplier contracts', async ({ page, reportsPage }) => {
            await redirectionHelpers.redirectTo(page, '/reports/positions');
            await reportsPage.selectContractTypeFilter('Multipliers');
            await NavigationUtils.waitForDerivApiSettled(page);
            await expect(
                reportsPage.tableRows.first(),
                'Multiplier contract row should be visible after filter'
            ).toBeVisible();
        });
    }
);
```

**Page Object locator pattern:**

```typescript
// reportsPage.selectContractTypeFilter action
async selectContractTypeFilter(option: string): Promise<void> {
    const isMobile = (this.page.viewportSize()?.width ?? 1024) < 1024;
    if (isMobile) {
        await this.contractTypeFilter.selectOption(option);
    } else {
        await this.contractTypeFilter.click();
        await this.page.getByText(option).click();
    }
}
```

---

### Flow 4 — Open Positions tab — Accumulators filter

**Account setup:** Real account with at least one open Accumulator contract.

**Test pattern:**

```typescript
test.describe(
    'Reports — Open Positions (Accumulators)',
    { tag: ['@reports', '@regression', '@desktop', '@mobile'] },
    () => {
        test.beforeEach(async ({ loginPage }) => {
            await loginPage.login();
        });

        test('VERIFY switching to Accumulators filter shows growth rate sub-filter', async ({ page, reportsPage }) => {
            await redirectionHelpers.redirectTo(page, '/reports/positions');
            await reportsPage.selectContractTypeFilter('Accumulators');
            await NavigationUtils.waitForDerivApiSettled(page);
            await expect(
                reportsPage.growthRateFilter,
                'Growth rate sub-filter should appear for Accumulators'
            ).toBeVisible();
        });
    }
);
```

**Page Object locator pattern:**

```typescript
// reportsPage.growthRateFilter — no testid; use role/text
get growthRateFilter(): Locator {
    return this.page.getByText('All growth rates')
        .or(this.page.getByRole('combobox', { name: /growth rate/i }));
}
```

---

### Flow 5 — Trade Table tab loads with date filter

**Account setup:** Real account with at least one completed contract in profit table history.

**Test pattern:**

```typescript
test.describe('Reports — Trade Table', { tag: ['@reports', '@smoke', '@desktop', '@mobile'] }, () => {
    test.beforeEach(async ({ loginPage }) => {
        await loginPage.login();
    });

    test('VERIFY trade table tab loads with date filter and data rows', async ({ page, reportsPage }) => {
        await redirectionHelpers.redirectTo(page, '/reports/profit');
        await NavigationUtils.waitForDerivApiSettled(page);
        await expect(reportsPage.metaWrapper, 'Meta wrapper should be visible on Trade Table tab').toBeVisible();
        await expect(reportsPage.calendarIcon, 'Calendar icon should be visible for date filter').toBeVisible();
        await expect(reportsPage.tableRows.first(), 'At least one trade table row should be visible').toBeVisible();
    });
});
```

**Page Object locator pattern:**

```typescript
// reportsPage.calendarIcon
get calendarIcon(): Locator {
    return this.page.getByTestId('dt_calendar_icon');
}

// reportsPage.calendarInputFrom — desktop: HTML id (not data-testid)
get calendarInputFrom(): Locator {
    return this.page.locator('#dt_calendar_input_from');
}

// reportsPage.calendarInputTo — desktop: HTML id (not data-testid)
get calendarInputTo(): Locator {
    return this.page.locator('#dt_calendar_input_to');
}
```

---

### Flow 6 — Statement tab loads with transaction type filter

**Account setup:** Real account with at least one statement entry.

**Test pattern:**

```typescript
test.describe('Reports — Statement', { tag: ['@reports', '@smoke', '@desktop', '@mobile'] }, () => {
    test.beforeEach(async ({ loginPage }) => {
        await loginPage.login();
    });

    test('VERIFY statement tab loads with transaction filter and statement rows', async ({ page, reportsPage }) => {
        await redirectionHelpers.redirectTo(page, '/reports/statement');
        await NavigationUtils.waitForDerivApiSettled(page);
        await expect(reportsPage.metaWrapper, 'Meta wrapper should be visible on Statement tab').toBeVisible();
        await expect(reportsPage.transactionTypeFilter, 'Transaction type filter should be visible').toBeVisible();
        await expect(reportsPage.tableRows.first(), 'At least one statement row should be visible').toBeVisible();
    });

    test('VERIFY filtering by Buy shows only buy transactions', async ({ page, reportsPage }) => {
        await redirectionHelpers.redirectTo(page, '/reports/statement');
        await reportsPage.selectTransactionTypeFilter('Buy');
        await NavigationUtils.waitForDerivApiSettled(page);
        await expect(reportsPage.tableRows.first(), 'Buy transaction row should be visible after filter').toBeVisible();
    });
});
```

**Page Object locator pattern:**

```typescript
// reportsPage.transactionTypeFilter — FilterDropdown; no testid; use role/text
get transactionTypeFilter(): Locator {
    return this.page.getByText('All transactions')
        .or(this.page.locator('.filter__dropdown').first());
}

// reportsPage.selectTransactionTypeFilter action
async selectTransactionTypeFilter(option: string): Promise<void> {
    const isMobile = (this.page.viewportSize()?.width ?? 1024) < 1024;
    if (isMobile) {
        await this.transactionTypeFilter.click();
        await this.page.getByText(option).click();
    } else {
        await this.transactionTypeFilter.click();
        await this.page.getByText(option).click();
    }
}
```

---

### Flow 7 — Empty state on Trade Table

**Account setup:** Real account with no completed contracts, or use date filter to select a period with no history.

**Test pattern:**

```typescript
test.describe('Reports — Empty Trade Table', { tag: ['@reports', '@regression', '@desktop', '@mobile'] }, () => {
    test.beforeEach(async ({ loginPage }) => {
        await loginPage.login();
    });

    test('VERIFY empty state shown when no trading activity on Trade Table', async ({ page, reportsPage }) => {
        await redirectionHelpers.redirectTo(page, '/reports/profit');
        await NavigationUtils.waitForDerivApiSettled(page);
        await expect(reportsPage.emptyStateIcon, 'Empty state icon should be visible').toBeVisible();
        await expect(
            page.getByText('You have no trading activity yet.'),
            'Empty state message should be visible'
        ).toBeVisible();
    });
});
```

**Page Object locator pattern:**

```typescript
// reportsPage.emptyStateIcon
get emptyStateIcon(): Locator {
    return this.page.getByTestId('dt_empty_trade_history_icon');
}
```

---

### Flow 8 — Empty state on Statement

**Account setup:** Real account with no transactions (fresh account).

**Test pattern:**

```typescript
test.describe('Reports — Empty Statement', { tag: ['@reports', '@regression', '@desktop', '@mobile'] }, () => {
    test.beforeEach(async ({ loginPage }) => {
        await loginPage.login();
    });

    test('VERIFY empty state shown when no transactions on Statement', async ({ page, reportsPage }) => {
        await redirectionHelpers.redirectTo(page, '/reports/statement');
        await NavigationUtils.waitForDerivApiSettled(page);
        await expect(reportsPage.emptyStateIcon, 'Empty state icon should be visible on Statement').toBeVisible();
        await expect(
            page.getByText('You have no transactions yet.'),
            'Empty state message should read "You have no transactions yet."'
        ).toBeVisible();
    });
});
```

---

### G1 — Navigate from Open Positions row to contract details

**Account setup:** Real account with at least one open Options contract.

**Test pattern:**

```typescript
test.describe(
    'Reports — Open Positions → Contract Details',
    { tag: ['@reports', '@regression', '@desktop', '@mobile'] },
    () => {
        test.beforeEach(async ({ loginPage }) => {
            await loginPage.login();
        });

        test('VERIFY clicking an open position row navigates to contract details', async ({ page, reportsPage }) => {
            await redirectionHelpers.redirectTo(page, '/reports/positions');
            await expect(
                reportsPage.tableRows.first(),
                'Contract row should be visible before navigating'
            ).toBeVisible();
            await reportsPage.tableRows.first().click();
            await NavigationUtils.waitForDerivApiSettled(page);
            await expect(
                page.getByText('Contract details'),
                'Contract details page should be visible after clicking a row'
            ).toBeVisible();
        });
    }
);
```

---

### G2 — Archived Statement (conditional on `has_archived_statement`)

**Account setup:** Staging account with `has_archived_statement = true`. Use dedicated `ARCHIVED_TEST_EMAIL` / `TEST_PASSWORD` env vars — cannot be created via `createAccountV2`.

**Test pattern:**

```typescript
test.describe('Reports — Archived Statement', { tag: ['@reports', '@regression', '@desktop', '@mobile'] }, () => {
    let ARCHIVED_EMAIL: string = undefined!;

    test.beforeAll(() => {
        const email = process.env.ARCHIVED_TEST_EMAIL;
        if (!email) throw new Error('ARCHIVED_TEST_EMAIL not set in playwright/.env.staging');
        ARCHIVED_EMAIL = email;
    });

    test.beforeEach(async ({ loginPage }) => {
        await loginPage.login();
    });

    test('VERIFY archived statement tab visible and loads history', async ({ page, reportsPage }) => {
        await redirectionHelpers.redirectTo(page, '/reports/archived-statement');
        await NavigationUtils.waitForDerivApiSettled(page);
        await expect(reportsPage.metaWrapper, 'Meta wrapper should be visible on Archived Statement').toBeVisible();
        await expect(reportsPage.tableRows.first(), 'Archived statement row should be visible').toBeVisible();
    });
});
```

**Page Object locator pattern:**

```typescript
// reportsPage.archivedStatementTab — no testid; use role/text
get archivedStatementTab(): Locator {
    return this.page.getByText('Archived statement')
        .or(this.page.getByRole('option', { name: 'Archived statement' }));
}
```

---

## Section 3 — Tags Reference

| Tag           | When to apply                                                                 |
| ------------- | ----------------------------------------------------------------------------- |
| `@reports`    | All tests in the reports feature area                                         |
| `@smoke`      | Critical path — page load, default tab, basic data rows visible               |
| `@regression` | Full coverage including filters, empty states, navigation, archived statement |
| `@production` | Tests safe to run on production (read-only, no contract mutations)            |
| `@desktop`    | Desktop viewport — `VerticalTab` sidebar navigation                           |
| `@mobile`     | Mobile viewport — `SelectNative` dropdown tab navigation                      |

---

## Section 4 — Feature-Specific Decisions

### Reports is full-page on BOTH desktop and mobile

Unlike `Positions` (mobile-only full page, desktop sidebar flyout), the `/reports` route renders a full-page layout on both desktop and mobile. Desktop shows a `VerticalTab` sidebar with tab links; mobile shows a `SelectNative` dropdown for tab selection. Both surfaces render the same route content below.

**Impact on generated code:** Always use `redirectionHelpers.redirectTo(page, '/reports')` — no platform guard needed for the route. Platform branching is only needed at the tab-navigation interaction level (`VerticalTab.click()` vs `SelectNative.selectOption()`).

### Tab navigation differs by platform

- **Desktop:** Click the tab label inside the `VerticalTab` sidebar (text match: "Open positions", "Trade table", "Statement", "Archived statement")
- **Mobile:** Select the option from the `SelectNative` `<select>` dropdown element

No `data-testid` on the tab elements — use `getByText()` (desktop) and `getByRole('option', { name: '...' })` or direct `selectOption()` (mobile).

**Impact on generated code:** Tab-switch actions in the Page Object must branch on `isMobile`. Verify actual select/option label text on staging before finalising.

### Contract type filter differs by platform

- **Desktop:** Quill `Dropdown` component — click to open, then click an option
- **Mobile:** `SelectNative` `<select>` — use `.selectOption(value)` directly

No `data-testid` on the filter element. Use class-based or role-based locators; verify on staging.

**Impact on generated code:** `selectContractTypeFilter()` POM action must branch on `isMobile`.

### Calendar date inputs use HTML `id`, not `data-testid`

`CompositeCalendar` renders its desktop inputs with `id="dt_calendar_input_from"` and `id="dt_calendar_input_to"` — NOT `data-testid`. Use `this.page.locator('#dt_calendar_input_from')` for desktop. Mobile uses `CompositeCalendarMobile` with a sheet UI — verify the mobile interaction pattern on staging.

**Impact on generated code:** Never use `getByTestId('dt_calendar_input_from')` — it will not find the element. Use `locator('#dt_calendar_input_from')` on desktop.

### `waitForDerivApiSettled` required after tab switch and filter apply

Switching between Reports tabs triggers WebSocket calls to fetch data (profit table, statement, open positions). Always call `NavigationUtils.waitForDerivApiSettled(page)` after tab switching and after filter changes before asserting row visibility.

**Impact on generated code:** Every tab switch action and filter action in the Page Object must be followed by `await NavigationUtils.waitForDerivApiSettled(page)` in the test.

### Archived Statement is conditional on `has_archived_statement`

The "Archived statement" tab only appears in the `VerticalTab` / `SelectNative` when `client.has_archived_statement` is true. This cannot be set programmatically — requires a specific staging account. Tests for G2 must use a dedicated env var (`ARCHIVED_TEST_EMAIL`) and be tagged `@regression`, not `@smoke`.

**Impact on generated code:** G2 spec uses `ARCHIVED_TEST_EMAIL` env var; validation must throw a descriptive error if missing.

### Open Positions contract rows require a pre-existing funded account

Flows 2–4 require open contracts of specific types. These cannot be created via `createAccountV2` alone — use the shared `TEST_EMAIL`/`TEST_PASSWORD` staging account which has pre-existing contracts.

**Impact on generated code:** No `createAccountV2` call in `beforeAll` for Flows 2–4 — rely on env var credentials directly via `loginPage.login()`.
