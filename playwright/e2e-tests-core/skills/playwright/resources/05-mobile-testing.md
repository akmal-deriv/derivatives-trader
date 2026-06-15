---
title: Mobile & Cross-Browser Testing
description: Mobile viewport detection, responsive locator patterns, overlay guards, and state-change assertions
parent_skill: playwright
---

---

title: "Mobile & Cross-Browser Testing"
description: "Mobile viewport detection, responsive locator patterns, overlay guards, and state-change assertions"
parent_skill: playwright

---

### 8. Mobile & Cross-Browser Testing

#### ✅ Project-Based Mobile Testing — Setup

Use a real mobile device preset as the base — never spread a desktop device and then patch `isMobile: true` (produces a mismatched desktop UA with mobile behaviour):

```typescript
// playwright.config.ts

// ❌ Incorrect — desktop UA but mobile touch behaviour
{
  name: 'chromium-mobile',
  use: {
    ...devices['Desktop Chrome'],   // desktop UA
    isMobile: true,                 // mismatched
    hasTouch: true,
    viewport: { width: 500, height: 850 },
  },
}

// ✅ Correct — Pixel 5 gives mobile UA + isMobile + hasTouch; override viewport as needed
{
  name: 'chromium-mobile',
  use: {
    ...devices['Pixel 5'],          // isMobile: true, hasTouch: true, mobile UA
    viewport: { width: 500, height: 850 },
  },
}
```

#### ✅ Single Describe Block Strategy

One `test.describe` per spec runs automatically under all configured projects. Never duplicate describe blocks with `(Desktop)` / `(Mobile)` suffixes:

```typescript
// ✅ Single describe — runs under every project in playwright.config.ts
test.describe('My Feature', { tag: ['@home', '@desktop', '@mobile'] }, () => {
    test('should do something', async ({ page }) => {
        /* ... */
    });
});

// ❌ Never do this — creates duplicate test runs and confuses the HTML report
test.describe('My Feature (Desktop)', () => {
    /* ... */
});
test.describe('My Feature (Mobile)', () => {
    /* ... */
});
```

Only add a `(Desktop)` / `(Mobile)` suffix when the test is **explicitly** restricted to one project via `test.use()`.

#### ✅ Conditional Steps — Detecting Viewport at Runtime

Use a **hybrid check** combining project name and viewport width for maximum robustness — catches explicitly-named mobile projects AND any viewport below the threshold. Fall back to a standalone approach when the hybrid is not possible:

```typescript
// ✅ Recommended hybrid (in test files) — covers named mobile projects AND narrow viewports
test('should open navigation menu', async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name.includes('mobile')
        || (page.viewportSize()?.width ?? 1024) < 768;
    if (isMobile) {
        // Mobile requires opening the drawer before the nav links are visible
        await page.locator('#mobile-menu-toggle').click();
    }
    // Link is now visible on both desktop (always shown) and mobile (drawer open)
    await page.getByRole('link', { name: 'Home' }).click();
});

// Standalone A — project name only (when viewport is irrelevant or testInfo is the only context)
const isMobile = testInfo.project.name.includes('mobile');

// Standalone B — viewport width only (Page Object methods have no access to testInfo)
async openNavigation(): Promise<void> {
    const isMobile = (this.page.viewportSize()?.width ?? 1024) < 768;
    if (isMobile) {
        await this.mobileMenuToggle.click();
    }
    // On desktop the nav is always visible — no interaction needed
}
```

**Rule: use the `private get isMobile` pattern in Page Objects** — declare it once at the top of the class, call `this.isMobile` everywhere. Only add this getter to a Page Object when at least one method actually calls `this.isMobile`. Do **not** add it speculatively to every POM.

```typescript
// ✅ RECOMMENDED: declare once as a private getter in the Page Object class
// so all methods share a single definition — no inline repetition.
private get isMobile(): boolean {
    return (this.page.viewportSize()?.width ?? 1024) < 768;
}

// Usage in any method:
async selectFromAccount(accountName: string): Promise<void> {
    // ...
    if (!this.isMobile) {
        await expect(popup, 'popup should be dismissed').toBeHidden();
    }
}
```

#### ✅ Viewport-Aware Locators — Put `isMobile` in the Getter, Not the Method

When a page renders **two separate DOM trees** for mobile and desktop (e.g. a desktop list hidden with `hidden lg:flex` and a mobile carousel hidden with `lg:hidden`), Playwright's unscoped locator may resolve the CSS-hidden desktop element first — and report it as `hidden`.

**Fix: scope the locator inside the getter itself** so every caller automatically gets the correct element without needing `if/else` in action methods.

```typescript
// ❌ PROBLEMATIC — unscoped locator resolves the desktop card first on mobile.
// The desktop list is in the DOM but CSS-hidden via `hidden lg:flex`.
// Playwright reports the element as "hidden" even though a mobile card exists.
get accountCards(): Locator {
    return this.page.locator('[data-testid^="dashboard-card-account-"]');
}

// ✅ CORRECT — viewport-aware getter scopes to the right container.
// On mobile: scoped to the `lg:hidden` carousel → visible mobile card.
// On desktop: unscoped → visible desktop list card.
get accountCards(): Locator {
    if (this.isMobile) {
        return this.page
            .locator(".lg\\:hidden")
            .locator('[data-testid^="dashboard-card-account-"]');
    }
    return this.page.locator('[data-testid^="dashboard-card-account-"]');
}
```

This keeps **action methods and `verifySuccessfulLogin()`-style methods clean** — they call `this.accountCards.first()` on both viewports without branching:

```typescript
// ✅ Action method needs no isMobile check — the locator handles it
async waitForAccountsLoaded(): Promise<void> {
    await expect(
        this.accountCards.first(),
        'At least one trading account card should be visible',
    ).toBeVisible();
}
```

**When to use viewport-aware locators vs. `if (this.isMobile)` in methods:**

| Situation                                                            | Recommended approach                                        |
| -------------------------------------------------------------------- | ----------------------------------------------------------- |
| Same element exists but is CSS-hidden in one layout (dual DOM trees) | Viewport-aware getter — scopes to the visible container     |
| Element is completely absent on one viewport (e.g. sidebar nav)      | `if (!this.isMobile)` guard in the action/verify method     |
| Complex multi-step interaction differs per viewport                  | `if (this.isMobile)` in the method (e.g. open drawer first) |

#### ✅ Viewport-Aware Locators — Put `isMobile` in the Getter, Not the Method

When a page renders **two separate DOM trees** for mobile and desktop (e.g. a desktop list hidden with `hidden lg:flex` and a mobile carousel hidden with `lg:hidden`), Playwright's unscoped locator may resolve the CSS-hidden desktop element first — and report it as `hidden`.

**Fix: scope the locator inside the getter itself** so every caller automatically gets the correct element without needing `if/else` in action methods.

```typescript
// ❌ PROBLEMATIC — unscoped locator resolves the desktop card first on mobile.
// The desktop list is in the DOM but CSS-hidden via `hidden lg:flex`.
// Playwright reports the element as "hidden" even though a mobile card exists.
get accountCards(): Locator {
    return this.page.locator('[data-testid^="dashboard-card-account-"]');
}

// ✅ CORRECT — viewport-aware getter scopes to the right container.
// On mobile: scoped to the `lg:hidden` carousel → visible mobile card.
// On desktop: unscoped → visible desktop list card.
get accountCards(): Locator {
    if (this.isMobile) {
        return this.page
            .locator(".lg\\:hidden")
            .locator('[data-testid^="dashboard-card-account-"]');
    }
    return this.page.locator('[data-testid^="dashboard-card-account-"]');
}
```

This keeps **action methods and `verifySuccessfulLogin()`-style methods clean** — they call `this.accountCards.first()` on both viewports without branching:

```typescript
// ✅ Action method needs no isMobile check — the locator handles it
async waitForAccountsLoaded(): Promise<void> {
    await expect(
        this.accountCards.first(),
        'At least one trading account card should be visible',
    ).toBeVisible();
}
```

**When to use viewport-aware locators vs. `if (this.isMobile)` in methods:**

| Situation                                                            | Recommended approach                                        |
| -------------------------------------------------------------------- | ----------------------------------------------------------- |
| Same element exists but is CSS-hidden in one layout (dual DOM trees) | Viewport-aware getter — scopes to the visible container     |
| Element is completely absent on one viewport (e.g. sidebar nav)      | `if (!this.isMobile)` guard in the action/verify method     |
| Complex multi-step interaction differs per viewport                  | `if (this.isMobile)` in the method (e.g. open drawer first) |

When to use each:

- **Hybrid** — default choice in test files; guards against both project naming and viewport edge cases
- **`testInfo.project.name`** — when `testInfo` is the only available context; clear and config-driven
- **`page.viewportSize()`** — necessary in Page Object methods (no access to `testInfo`)

#### ✅ Known Desktop vs Mobile DOM Differences — home-app

The following elements render differently on desktop (≥ 1024 px) vs mobile (< 1024 px). Always use the corresponding viewport-aware getter from `HomePage` rather than writing raw locators in tests.

| Element                | Desktop                                                                              | Mobile                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| **Account cards**      | `[data-testid^="dashboard-card-account-"]` — unscoped (inside `hidden lg:flex` list) | `.lg\\:hidden [data-testid^="dashboard-card-account-"]` — scoped to snap carousel |
| **User profile**       | `data-testid="sidebar-link-profile"` — sidebar `<Link>`                              | `data-testid="mobile-header-btn-profile"` — header `<button>` with user initials  |
| **Home nav link**      | `getByRole("navigation").getByRole("link", { name: "Home" })` — sidebar nav          | `locator("nav.lg\\:hidden").getByRole("link", { name: "Home" })` — bottom tab bar |
| **CFDs nav link**      | `getByRole("navigation").getByRole("link", { name: "CFDs" })`                        | `locator("nav.lg\\:hidden").getByRole("link", { name: "CFDs" })`                  |
| **Options nav link**   | `getByRole("navigation").getByRole("link", { name: "Options" })`                     | `locator("nav.lg\\:hidden").getByRole("link", { name: "Options" })`               |
| **Portfolio nav link** | `getByRole("navigation").getByRole("link", { name: "Portfolio" })`                   | `locator("nav.lg\\:hidden").getByRole("link", { name: "Portfolio" })`             |

**Tailwind breakpoint reference:**

- `hidden lg:flex` — hidden on mobile, visible on desktop (≥ 1024 px)
- `lg:hidden` — visible on mobile, hidden on desktop

All of the above are already implemented as viewport-aware getters in `playwright/pages/HomePage.ts`. Use them directly — don't re-implement the logic in tests.

**Rule: every test must run on both viewports.** When you discover a new element with different mobile/desktop DOM, add a viewport-aware getter to the relevant Page Object and document it here.

#### ✅ Conditional Test Names — Rely on Playwright's Project Prefix

Playwright test titles are **static strings** — they are evaluated at parse time and cannot be changed at runtime. Do **not** encode `(Desktop)` / `(Mobile)` into test or describe names manually.

Playwright's HTML report and CLI output already prefix every result with the project name:

```
[chromium]        > My Feature > should open navigation menu
[chromium-mobile] > My Feature > should open navigation menu
```

This is the canonical way to distinguish viewport results. For richer annotations visible in the HTML report, add them inside the test body:

```typescript
test('should open navigation menu', async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name.includes('mobile');

    // Optional: adds a "viewport" label to the HTML report for this run
    testInfo.annotations.push({
        type: 'viewport',
        description: isMobile ? 'Mobile (500×850)' : 'Desktop (1728×1117)',
    });

    // ... test steps
});
```

```typescript
// ❌ Unnecessary — project prefix in the report already communicates this
test('should open navigation menu (Desktop)', async ({ page }) => {
    /* ... */
});
test('should open navigation menu (Mobile)', async ({ page }) => {
    /* ... */
});

// ✅ Single test name — Playwright's project prefix handles the distinction
test('should open navigation menu', async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name.includes('mobile');
    // branch as needed
});
```

#### ✅ Responsive Locator Fallback Chains

Many apps swap navigation elements between viewport sizes (sidebar on desktop → bottom tab bar on mobile). Always explore both viewports before writing locators, then cover both in a `.or()` chain:

```typescript
// ✅ Pattern: single locator resolves on desktop and mobile
get navLink(): Locator {
    return this.page.locator('#desktop-sidebar').getByRole('link', { name: 'Home' })
        .or(this.page.locator('#mobile-bottom-nav').getByRole('link', { name: 'Home' }))
        .or(this.page.getByRole('navigation').getByRole('link', { name: 'Home' }))
        .first();
}
```

Sometimes the same class is on a **child element** on desktop but on the **element itself** on mobile — always verify with the DOM snapshot and cover both:

```typescript
// ✅ Pattern: covers class-on-child (desktop) and class-on-element (mobile)
get featureLink(): Locator {
    return this.page.locator('a:has(.icon-feature)')  // desktop: icon is inside <a>
        .or(this.page.locator('a.icon-feature'))       // mobile: icon IS the <a>
        .first();
}
```

#### ✅ Mobile Overlay / Drawer Guards

On narrow viewports, drawers and slide-up panels may expand and overlay toolbar/action buttons, intercepting pointer events. Guard against this with a Page Object method that collapses the overlay if open — safe to call unconditionally on both viewports because `isVisible()` returns `false` immediately on desktop when the overlay doesn't exist:

```typescript
// ✅ Pattern: safe no-op guard for mobile overlay
async closeDrawerIfOpen(): Promise<void> {
    // Returns false (not throws) if element is absent — no-op on desktop
    const isOpen = await this.page
        .locator('.mobile-drawer--open')
        .isVisible({ timeout: 2000 })
        .catch(() => false);
    if (isOpen) {
        await this.drawerToggleButton.click();
        await expect(
            this.page.locator('.mobile-drawer--open'),
            'Drawer should be collapsed after toggle',
        ).not.toBeVisible({ timeout: 5000 });
    }
}

// Usage — call before any toolbar/panel interaction that may be blocked on mobile
await this.closeDrawerIfOpen();
await this.toolbarButton.click();
```

#### ✅ State-Change Assertions — Prefer Element Disappearance

Text-based confirmation elements (e.g. "Stopped", "Done") are often inside collapsed mobile panels and not visible on screen. Use the **disappearance of an action button** as the confirmation instead — it works on both viewport sizes:

```typescript
// ❌ Unreliable on mobile — confirmation text may be inside a collapsed panel
await expect(page.getByText('Process stopped'), 'Process should be stopped').toBeVisible();

// ✅ Reliable on both desktop and mobile — action button disappears when process ends
await expect(this.stopButton, 'Stop button should disappear — confirms process has ended').not.toBeVisible({
    timeout: 15000,
});
```

#### ✅ Known Desktop vs Mobile DOM Differences — home-app

The following elements render differently on desktop (≥ 1024 px) vs mobile (< 1024 px). Always use the corresponding viewport-aware getter from `HomePage` rather than writing raw locators in tests.

| Element                | Desktop                                                                              | Mobile                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| **Account cards**      | `[data-testid^="dashboard-card-account-"]` — unscoped (inside `hidden lg:flex` list) | `.lg\\:hidden [data-testid^="dashboard-card-account-"]` — scoped to snap carousel |
| **User profile**       | `data-testid="sidebar-link-profile"` — sidebar `<Link>`                              | `data-testid="mobile-header-btn-profile"` — header `<button>` with user initials  |
| **Home nav link**      | `getByRole("navigation").getByRole("link", { name: "Home" })` — sidebar nav          | `locator("nav.lg\\:hidden").getByRole("link", { name: "Home" })` — bottom tab bar |
| **CFDs nav link**      | `getByRole("navigation").getByRole("link", { name: "CFDs" })`                        | `locator("nav.lg\\:hidden").getByRole("link", { name: "CFDs" })`                  |
| **Options nav link**   | `getByRole("navigation").getByRole("link", { name: "Options" })`                     | `locator("nav.lg\\:hidden").getByRole("link", { name: "Options" })`               |
| **Portfolio nav link** | `getByRole("navigation").getByRole("link", { name: "Portfolio" })`                   | `locator("nav.lg\\:hidden").getByRole("link", { name: "Portfolio" })`             |

**Tailwind breakpoint reference:**

- `hidden lg:flex` — hidden on mobile, visible on desktop (≥ 1024 px)
- `lg:hidden` — visible on mobile, hidden on desktop

All of the above are already implemented as viewport-aware getters in `playwright/pages/HomePage.ts`. Use them directly — don't re-implement the logic in tests.

**Rule: every test must run on both viewports.** When you discover a new element with different mobile/desktop DOM, add a viewport-aware getter to the relevant Page Object and document it here.

#### ✅ Cross-Browser Configuration

```typescript
// In playwright.config.ts
projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 12'] } },
];
```
