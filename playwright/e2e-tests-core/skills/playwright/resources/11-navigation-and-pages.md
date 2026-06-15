---
title: Navigation, Page Load & Transfer Patterns
description: NavigationUtils, API settlement, page load verification, and transfer page patterns
parent_skill: playwright
---

## ✅ Page Load Verification — Always Confirm New Page Is Loaded

**Every time a new page or view is loaded** — whether triggered by navigation, login, form submission, redirect, link click, tab switch, dialog close, or any other action — you MUST verify the new page is fully loaded before continuing execution. This applies universally: any time the current view changes, the new view must be confirmed as ready.

### Precedence Order

1. **`NavigationUtils.waitForDerivApiSettled(page)`** — use as the default for any Deriv API-driven page or view (home, dashboard, CFDs, portfolio, profile, cashier, etc.)
2. **Assert a visible landmark element** — use when `waitForDerivApiSettled` is not appropriate (see below)

### When to Use Element Visibility Assertions Instead of `waitForDerivApiSettled`

- **DTrader** and **DBot** use WebSocket connections — `waitForDerivApiSettled` only tracks XHR/Fetch and will **not** detect WebSocket activity. For these apps, assert the visibility of a key landmark element (preferably the last element expected to appear after page load, e.g. the chart, trade panel, or strategy builder)
- Any other context where the primary data channel is WebSocket rather than XHR/Fetch

### Belt and Suspenders — Combine Both for Critical Flows

- For **critical or flaky-prone page transitions** (e.g. login → dashboard, tab switch Real ↔ Demo, post-signup redirect), use **both** `waitForDerivApiSettled` **and** a landmark element assertion for maximum reliability
- `waitForDerivApiSettled` confirms all API data has arrived; the landmark assertion confirms the UI has actually rendered that data
- This is **recommended** (not mandatory) — single-approach is acceptable for simple navigations, but combining both is the gold standard for high-value flows

### Do's

- **Do** always follow any page load or view transition with either `waitForDerivApiSettled` or a positive visibility assertion on a landmark element of the new page/view
- **Do** combine both approaches for critical flows: `waitForDerivApiSettled` first, then assert a landmark element
- **Do** assert the element that best represents "the new page is fully loaded" — typically the last thing to appear (e.g. chart, account balance, main content area, the final loading element)
- **Do** treat this rule as applying to the full scope of page changes: navigation, login, redirect, link click, tab switch, form submit, dialog dismissal, route change — anything that results in a new page or view being shown

### Don'ts

- **Do NOT** use negative assertions alone (e.g. `expect(oldElement).not.toBeVisible()`) — these only confirm the old state is gone, not that the new page is ready. Negative-assertion-only page load checks are considered **incomplete** in code review
- **Do NOT** treat a URL change or redirect as sufficient — a URL can change before content is rendered
- **Do NOT** assume the page is ready just because a click or navigation call has completed — always confirm with a positive assertion

### Examples

```typescript
// ✅ CORRECT — Deriv API page: use waitForDerivApiSettled after any page change
await homePage.clickCFDsInSidebar();
await NavigationUtils.waitForDerivApiSettled(page);

// ✅ CORRECT — DBot: WebSocket app, assert landmark element visibility
await page.goto('https://dbot.deriv.com');
await expect(dbotPage.strategyBuilderPanel, 'DBot strategy builder panel should be visible after load').toBeVisible();

// ✅ CORRECT — DTrader: WebSocket app, assert landmark element visibility
await page.goto('https://dtrader.deriv.com');
await expect(dtraderPage.tradePanel, 'DTrader trade panel should be visible after load').toBeVisible();

// ❌ WRONG — negative assertion only (incomplete — does not confirm new page is ready)
await homePage.clickCFDsInSidebar();
await expect(homePage.oldElement, 'Old element gone').not.toBeVisible();

// ❌ WRONG — URL check only (insufficient — content may not be rendered yet)
await homePage.clickCFDsInSidebar();
await expect(page).toHaveURL(/cfds/);
```

### Why This Matters

- Reduces flaky tests caused by interacting with UI before it has fully rendered
- Catches real navigation failures (e.g. redirect loops, broken routes)
- Makes AI-generated tests much more reliable and trustworthy
- A URL change or the disappearance of an old element does **not** guarantee the new page is ready — only a positive assertion on a new element does

---

## 🧭 NavigationUtils: Browser Navigation Helpers

**Location**: `e2e-tests-core/utils/navigationUtils.ts` (submodule)  
**Import from**: the project's `utils/` barrel — always relative to `utils/index.ts` in the project root. Never import directly from the submodule path.

- From `tests/auth/*.spec.ts` → `../../utils`
- From `tests/dashboard/tokens/*.spec.ts` → `../../../utils`
- From `tests/docs/reference/*.spec.ts` → `../../../utils`
- From `pages/*.ts` → `../utils`

NavigationUtils provides reusable browser navigation helpers for Playwright tests. These utilities solve common race conditions where tests interact with UI before API data has loaded.

### Available Methods

#### `NavigationUtils.goBackAndExpectUrl(page, urlPattern)`

Navigate back using the browser back button and assert the resulting URL matches the given pattern.

**Parameters:**

- `page` — The Playwright `Page` instance
- `urlPattern` — A `string` or `RegExp` the URL must match after navigating back

**Example:**

```typescript
await NavigationUtils.goBackAndExpectUrl(page, /\/dashboard\/home\?more=open/);
```

#### `NavigationUtils.waitForDerivApiSettled(page, options?)`

Wait for all in-flight XHR/Fetch requests to URLs containing `deriv.com` to settle. This is a **project-wide utility** designed to solve the race condition where pages are interacted with before all API calls have completed.

**How it works:**

1. Listens for all outgoing requests whose URL contains `deriv.com`
2. Tracks each request/response pair in a pending counter
3. Only tracks `xhr` and `fetch` resource types (ignores WebSocket, images, scripts, etc.)
4. Waits until the counter reaches 0 **and** stays at 0 for a configurable idle period (default: 2 seconds)
5. Times out after `maxWaitMs` (default: 15 seconds) to prevent hanging

**Parameters:**

- `page` — The Playwright `Page` instance
- `options` (optional):
    - `idleMs` — Time in ms with no new deriv.com requests before considering settled (default: `2000`)
    - `maxWaitMs` — Maximum time in ms to wait before giving up (default: `15000`)
    - `urlPattern` — Custom URL pattern to match (default: `/deriv\.com/`)

**When to use — EVERY interactive event that changes the page state:**

- After navigation functions (sidebar clicks, page.goto, etc.)
- After redirection functions
- After clicking any button that changes the page state
- After tab switches (Real ↔ Demo)
- After dialog dismissals that reload data
- After any action that triggers a route change or data reload

**When NOT needed (already called automatically):**

- After `redirectionHelpers.redirectTo()` — it already calls this internally

**Example:**

```typescript
import { NavigationUtils } from '../../utils'; // adjust depth to your file's location

// After a sidebar navigation:
await cfdsPage.navigateToCFDsPage();
await NavigationUtils.waitForDerivApiSettled(page);

// After clicking a tab that changes page state:
await page.getByRole('button', { name: 'Demo' }).click();
await NavigationUtils.waitForDerivApiSettled(page);

// With custom idle time (faster, for quick pages):
await NavigationUtils.waitForDerivApiSettled(page, { idleMs: 1000 });
```

### ⚠️ Best Practice: Always Settle API After Page State Changes

**Every interactive event that changes the page state MUST be followed by `NavigationUtils.waitForDerivApiSettled(page)`** to avoid flaky tests caused by interacting with UI before API data has loaded.

This includes:

- Navigation functions (sidebar navigation, page.goto)
- Redirection functions
- Clicking any button that changes the page state
- Tab switches (Real ↔ Demo)
- Dialog dismissals that reload data
- Any action that triggers a route change or data reload

The only exception is `redirectionHelpers.redirectTo()` which already handles this internally.

---

## 💸 Transfer Page Patterns

`TransferPage` (`pages/TransferPage.ts`) covers the full wallet↔CFD transfer flow. Use `transferFundsMT5()` for all MT5 account types and `transferFundsCTrader()` for cTrader.

**Icons:** Trading rows on `/transfer` use **`renderTradingAccountQuillIcon`** — locate via **`[data-testid^="account-icon-quill-"]`** (e.g. **`account-icon-quill-standard`**, **`account-icon-quill-ctrader`**) instead of legacy raster **`renderAccountIcon`** `<img>` hooks.

---

### Account Name Formats (Critical)

**cTrader** — the account number is dynamic and appears differently by view:

| View                                                          | Format       | Example            |
| ------------------------------------------------------------- | ------------ | ------------------ |
| Wallet transaction list / detail (`From`/`To`)                | Login ID     | `CTRXXXXXX`        |
| CFD sidebar, transfer selectors, review modal, success screen | Display name | `cTrader (XXXXXX)` |

- Wallet-side assertions: `toContainText('CTR')`
- CFD-side/modal assertions: use the resolved display name — **never hardcode the account number**

```typescript
// Always resolve at runtime — never hardcode
const resolvedCTraderName = await transferPage.resolveCTraderAccountName('#TransferTo');
// resolvedCTraderName = "cTrader (XXXXXX)"  ← actual value is dynamic

// ✅ Correct — resolved value for assertions
await expect(confirmModal, 'cTrader name in modal should match').toContainText(resolvedCTraderName);

// ✅ Correct — regex prefix match (for locators)
this.page
    .locator('#TransferTo')
    .getByText(/^cTrader\s*\(/, { exact: false })
    .first();

// ❌ Wrong — hardcoded account number
await expect(confirmModal).toContainText('cTrader (XXXXXX)');
```

**Rule:** When asserting wallet-side transaction rows or detail fields, use `toContainText('CTR')` — never assert the full display name there. When asserting the CFD sidebar or review modal, use the resolved display name.

---

### MT5 Account Name: Wallet View vs CFD Sidebar

The same MT5 account is rendered differently depending on which view you are asserting:

| View                                           | Label format        | Example                      |
| ---------------------------------------------- | ------------------- | ---------------------------- |
| Wallet transaction list route label            | `MT5 <AccountType>` | `US Dollar -> MT5 Financial` |
| Wallet transaction detail From/To              | `MT5 <AccountType>` | `From: MT5 Financial`        |
| CFD account sidebar transaction list           | `MT5 <AccountType>` | `MT5 Financial`              |
| CFD account sidebar transaction detail From/To | `MT5 <AccountType>` | `From: MT5 Financial`        |

**Rule:** Always use `toContainText('MT5 Financial')` (or the relevant account type) for both wallet-side and CFD-side assertions — the prefix is consistent across all views for MT5.

---

### Usage — `transferFundsMT5()`

Use for all MT5 account types: Financial, Swap-Free, Zero Spread, Gold, Standard, CFDs, Crypto.

```typescript
// Wallet → MT5 CFD (e.g. USD wallet to Financial account)
await transferPage.transferFundsMT5('US Dollar', 'Financial', '1.00', 'wallet-to-cfd');

// MT5 CFD → Wallet (e.g. Financial account to USD wallet)
await transferPage.transferFundsMT5('Financial', 'US Dollar', '1.00', 'cfd-to-wallet');
```

**Parameters:**

- `fromAccount` — source account name as shown in the Portfolio (e.g. `"US Dollar"`, `"Financial"`)
- `toAccount` — destination account name (e.g. `"Financial"`, `"US Dollar"`)
- `transferAmount` — numeric string, e.g. `"1.00"`
- `direction` — `'wallet-to-cfd'` or `'cfd-to-wallet'`

---

### Usage — `transferFundsCTrader()`

Use for all cTrader account transfers. Resolves the dynamic account number internally.

```typescript
// Wallet → cTrader
await transferPage.transferFundsCTrader('US Dollar', 'cTrader', '1.00', 'wallet-to-ctrader');

// cTrader → Wallet
await transferPage.transferFundsCTrader('cTrader', 'US Dollar', '1.00', 'ctrader-to-wallet');
```

**Parameters:**

- `fromAccount` — `"US Dollar"` or `"cTrader"`
- `toAccount` — `"cTrader"` or `"US Dollar"`
- `transferAmount` — numeric string, e.g. `"1.00"`
- `direction` — `'wallet-to-ctrader'` or `'ctrader-to-wallet'`

---
