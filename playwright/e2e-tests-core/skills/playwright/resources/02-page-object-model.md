---
title: Page Object Model & Locator Strategies
description: POM patterns, creating page objects, cross-domain redirects, locator fallback chains, and best practices checklist
parent_skill: playwright
---

### 1. Modern Locator Strategies

#### 🔍 Locator Discovery Order (How to Find Selectors)

**Before opening a browser, always check the source code first:**

1. **Search `src/` for `data-testid`** — grep the component source for existing test IDs. This is the fastest and most reliable method because it gives you the exact attribute value used in production code.
    ```bash
    grep -r "data-testid" src/app/(auth)/ src/features/auth/
    # or search for a specific component name
    grep -r "testid\|data-testid" src/components/LoginForm.tsx
    ```
2. **If `src/` has no testids or you need to verify live rendering** — use Playwright MCP: navigate to the staging environment and take a `browser_snapshot` to see actual element roles, labels, and attributes in the rendered DOM.
3. **Never guess** — do not invent selector strings. Always confirm from source or live DOM.

#### ✅ Priority Order (Best to Worst)

1. **`data-testid`** - Most reliable, specifically for testing
2. **`getByRole()`** - User-facing, semantic
3. **`getByLabel()`** - Accessible, user-centric
4. **`getByPlaceholder()`** - User-visible text
5. **`getByText()`** - Visible content
6. **CSS/XPath selectors** - Last resort, implementation-dependent

#### ✅ Robust Locator Patterns

```typescript
// ✅ EXCELLENT - Fallback chain with multiple strategies
get emailInput(): Locator {
    return this.page.getByTestId('email-input')              // Best: dedicated test attribute
        .or(this.page.getByRole('textbox', { name: /email/i }))  // Good: semantic role
        .or(this.page.getByPlaceholder(/email/i))             // OK: placeholder text
        .or(this.page.getByLabel(/email/i))                   // OK: label association
        .or(this.page.locator('input[type="email"]'))         // Fallback: CSS selector
        .first();                                             // Handle multiple matches
}

// ✅ GOOD - Single robust strategy
get submitButton(): Locator {
    return this.page.getByRole('button', { name: /submit|send|continue/i });
}

// ❌ AVOID - Brittle, implementation-dependent
get badSelector(): Locator {
    return this.page.locator('#form > div:nth-child(2) > input.email-field');
}
```

#### Locale-safe dashboard locators (`HomePage`)

**My trading accounts** card actions use **`next-intl`** — button labels are not stable in English. In **`playwright/pages/HomePage.ts`**, scope to the card (e.g. **`accountCards`** + account name) then target **`data-testid`**:

- Deposit CTA (pre–first-deposit matrix): **`locator('[data-testid^="dashboard-btn-deposit-"]')`** — matches **`dashboard-btn-deposit-{loginId}`** from **`trading-accounts.tsx`**.
- Prefer the same **prefix pattern** for trade / transfer / details when adding helpers: **`dashboard-btn-trade-`**, **`dashboard-btn-transfer-`**, **`dashboard-btn-details-`**.

**More drawer** section **`<h3>`** headings: **`data-testid="more-drawer-heading-section-{sectionId}"`** (e.g. **`partnership`**, **`download_apps`**) — use **`getByTestId`**, not English **`getByRole('heading', { name: '...' })`**, for non-English locale runs.

See **`docs/web-conversion-skills/23-playwright-test-ids.md`** (Dashboard → Account Card + More Drawer).

### 2. Page Object Model Excellence

#### 🏗️ **Mandatory Section Order — LOCATORS → ACTIONS → VERIFICATIONS**

Every Page Object **must** be arranged in exactly this order — no exceptions:

| #   | Section            | What goes here                                                        |
| --- | ------------------ | --------------------------------------------------------------------- |
| 1   | `// LOCATORS`      | All getter properties and parameterized locator methods               |
| 2   | `// ACTIONS`       | Navigation (`goto`, `click*`), fills, and any other user interactions |
| 3   | `// VERIFICATIONS` | All `verify*` / assertion-only methods (`expect(...)`)                |

> **Why?** A consistent top-to-bottom read maps directly to how tests use a POM: find the element → act on it → assert the result. Never mix sections or add extra section types (no separate NAVIGATION or INTERACTIONS splits).

---

#### 📚 **What is a Page Object Model (POM)?**

A Page Object Model is a design pattern that:

- **Encapsulates** page-specific elements and interactions
- **Separates** test logic from UI implementation details
- **Provides** reusable methods for page interactions
- **Improves** test maintainability and readability

**Benefits:**

- ✅ Single source of truth for page elements
- ✅ Easy to update when UI changes
- ✅ Reusable across multiple tests
- ✅ Better code organization and readability

---

#### ✅ **Complete Page Object Structure**

```typescript
import { Page, Locator } from '@playwright/test';

/**
 * LoginPage - Handles all login page interactions
 *
 * @example
 * const loginPage = new LoginPage(page);
 * await loginPage.goto();
 * await loginPage.login('[email protected]', 'password');
 */
export class LoginPage {
    readonly page: Page;
    readonly baseURL: string;

    constructor(page: Page, baseURL: string = 'https://oauth.deriv.com/oauth2/authorize') {
        this.page = page;
        this.baseURL = baseURL;
    }

    // ============================================
    // LOCATORS (Element Getters)
    // ============================================

    /**
     * Email input field with fallback selectors
     * Uses multiple strategies for robustness
     */
    get emailInput(): Locator {
        return this.page
            .getByTestId('email-input')
            .or(this.page.getByRole('textbox', { name: /email/i }))
            .or(this.page.getByPlaceholder(/email/i))
            .or(this.page.getByLabel(/email/i))
            .or(this.page.locator('input[type="email"]'))
            .first();
    }

    /**
     * Password input field
     */
    get passwordInput(): Locator {
        return this.page
            .getByTestId('password-input')
            .or(this.page.getByRole('textbox', { name: /password/i }))
            .or(this.page.locator('input[type="password"]'))
            .first();
    }

    /**
     * Submit/Login button
     */
    get submitButton(): Locator {
        return this.page.getByRole('button', { name: /submit|login|continue/i });
    }

    /**
     * Error message container
     */
    get errorMessage(): Locator {
        return this.page.locator('.error-message, [role="alert"]');
    }

    /**
     * Success indicator
     */
    get successMessage(): Locator {
        return this.page.locator('.success-message');
    }

    // ============================================
    // ACTIONS
    // ============================================

    /**
     * Navigate to the login page
     */
    async goto(): Promise<void> {
        await this.page.goto(this.baseURL);
        await this.page.waitForLoadState('domcontentloaded');
    }

    /**
     * Enter email address
     * @param email - Email address to enter
     */
    async enterEmail(email: string): Promise<void> {
        await this.emailInput.fill(email);
    }

    /**
     * Enter password
     * @param password - Password to enter
     */
    async enterPassword(password: string): Promise<void> {
        await this.passwordInput.fill(password);
    }

    /**
     * Click submit button
     */
    async clickSubmit(): Promise<void> {
        await this.submitButton.click();
    }

    /**
     * Complete login flow
     * @param email - Email address
     * @param password - Password
     * @param options - Optional configuration
     */
    async login(email: string, password: string, options?: LoginOptions): Promise<void> {
        await this.enterEmail(email);
        await this.enterPassword(password);
        await this.clickSubmit();

        if (options?.waitForNavigation !== false) {
            await this.waitForLoginSuccess();
        }
    }

    // ============================================
    // VERIFICATIONS
    // ============================================

    /**
     * Check if login was successful
     * @returns true if login succeeded
     */
    async isLoginSuccessful(): Promise<boolean> {
        try {
            await this.page.waitForURL(/.*dashboard.*/, { timeout: 5000 });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get error message text
     * @returns Error message or null if no error
     */
    async getErrorMessage(): Promise<string | null> {
        try {
            if (await this.errorMessage.isVisible({ timeout: 2000 })) {
                return await this.errorMessage.textContent();
            }
            return null;
        } catch {
            return null;
        }
    }

    /**
     * Wait for login to complete successfully
     */
    async waitForLoginSuccess(): Promise<void> {
        await this.page.waitForURL(/.*dashboard.*/, { timeout: 10000 });
    }
}

// Type definitions
interface LoginOptions {
    waitForNavigation?: boolean;
}
```

---

#### 🆕 **How to Create a New Page Object**

**Step-by-Step Guide:**

**1. Create the Page Object File**

```bash
# Create new file in pages/ directory
touch pages/DashboardPage.ts
```

**2. Define the Page Object Class**

```typescript
import { Page, Locator } from '@playwright/test';

/**
 * DashboardPage - Handles dashboard interactions
 */
export class DashboardPage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    // ============================================
    // LOCATORS
    // ============================================

    get welcomeMessage(): Locator {
        return this.page.getByTestId('welcome-message').or(this.page.getByText(/welcome/i));
    }

    get portfolioLink(): Locator {
        return this.page.getByRole('link', { name: /portfolio/i });
    }

    get accountBalance(): Locator {
        return this.page.getByTestId('account-balance');
    }

    // ============================================
    // ACTIONS
    // ============================================

    async goto(): Promise<void> {
        await this.page.goto('/dashboard');
        await this.page.waitForLoadState('networkidle');
    }

    async navigateToPortfolio(): Promise<void> {
        await this.portfolioLink.click();
        await this.page.waitForURL(/.*portfolio.*/);
    }

    async getBalance(): Promise<string> {
        return (await this.accountBalance.textContent()) || '0';
    }

    // ============================================
    // VERIFICATIONS
    // ============================================

    async isWelcomeMessageVisible(): Promise<boolean> {
        return await this.welcomeMessage.isVisible();
    }
}
```

**3. Register as Global Fixture (Recommended)**

Update `fixtures/fixtures.ts`:

```typescript
import { DashboardPage } from '../pages/DashboardPage';

export const test = base.extend<{
    loginPage: LoginPage;
    passwordPage: PasswordPage;
    dashboardPage: DashboardPage; // ← Add new page object
}>({
    loginPage: async ({ page }, use) => {
        const loginPage = new LoginPage(page);
        await use(loginPage);
    },

    passwordPage: async ({ page }, use) => {
        const passwordPage = new PasswordPage(page);
        await use(passwordPage);
    },

    // ← Add fixture implementation
    dashboardPage: async ({ page }, use) => {
        const dashboardPage = new DashboardPage(page);
        await use(dashboardPage);
    },
});
```

**4. Use in Tests**

```typescript
import { test, expect } from '../../fixtures/fixtures';

test('should display dashboard after login', async ({ page, loginPage, dashboardPage }) => {
    // Login
    await loginPage.goto();
    await loginPage.login('[email protected]', 'password');

    // Verify dashboard
    await expect(dashboardPage.welcomeMessage, 'Welcome message should be visible').toBeVisible();

    const balance = await dashboardPage.getBalance();
    expect(balance, 'Account balance should be displayed').toBeTruthy();
});
```

---

#### 🌐 **Cross-Domain Redirect Page Objects**

When a feature under test **redirects the user to an external domain** (e.g., clicking a "DTrader" button on `deriv.com` that opens `dtrader.deriv.com`), the destination page deserves its **own dedicated Page Object** — never mix its locators into the originating page's POM.

**Why a separate POM?**

- Keeps each POM focused on a single domain / responsibility
- Avoids polluting `HomePage` (or any source page) with locators that belong to the target page
- Makes the redirect verification reusable across many tests
- Follows the Single Responsibility Principle

---

**Example: DTraderPage**

`pages/DTraderPage.ts` — owns all DTrader-specific selectors and verifications:

```typescript
import { Page, Locator, expect } from '@playwright/test';

/**
 * DTraderPage - Handles assertions and interactions on dtrader.deriv.com
 *
 * Used when tests redirect from deriv.com → dtrader.deriv.com
 * and need to verify the landing state.
 */
export class DTraderPage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    // ============================================
    // LOCATORS
    // ============================================

    get demoAccountHeader(): Locator {
        return this.page.getByTestId('dt_core_account-info_acc-info').or(this.page.getByText(/Demo/i).first());
    }

    get tryRealButton(): Locator {
        return this.page
            .getByRole('button', { name: /try real|switch to real/i })
            .or(this.page.getByTestId('dt_button_demo_hint'));
    }

    get homeLink(): Locator {
        return this.page
            .getByRole('link', { name: /home/i })
            .or(this.page.locator('a[href*="deriv.com"]:not([href*="dtrader"])'));
    }

    // ============================================
    // ACTIONS
    // ============================================

    /**
     * Click the Home link on DTrader to return to the main Deriv dashboard.
     */
    async clickHomeToReturnToDashboard(): Promise<void> {
        await this.homeLink.click();
        await this.page.waitForURL(/deriv\.com\/(?!dtrader)/);
    }

    // ============================================
    // VERIFICATIONS
    // ============================================

    /**
     * Assert that the user has landed correctly on DTrader with a demo account.
     */
    async verifyLandedOnDTrader(): Promise<void> {
        await expect(this.page, 'Should redirect to DTrader domain').toHaveURL(/dtrader\.deriv\.com/);
        await expect(this.demoAccountHeader, 'Demo account header should be visible on DTrader').toBeVisible();
        await expect(this.tryRealButton, '"Try Real" button should be visible for demo users on DTrader').toBeVisible();
    }
}
```

**Pattern: Source page delegates to target POM**

In `pages/HomePage.ts`, instead of duplicating DTrader locators, instantiate `DTraderPage` and call its methods:

```typescript
// ✅ CORRECT — HomePage delegates DTrader verification to DTraderPage
import { DTraderPage } from './DTraderPage';

async verifyOptions(page: Page): Promise<void> {
    // ... click DTrader option in HomePage ...

    const dtraderPage = new DTraderPage(page);
    await dtraderPage.verifyLandedOnDTrader();
    await dtraderPage.clickHomeToReturnToDashboard();
}

// ❌ WRONG — Don't put dtrader locators inside HomePage
get dtraderDemoAccountHeader(): Locator {
    return this.page.locator('[data-testid="dt_core_account-info_acc-info"]'); // ❌ Belongs in DTraderPage
}
```

**Register as a global fixture**

Add to `fixtures/fixtures.ts` so any test can inject it directly:

```typescript
import { DTraderPage } from '../pages/DTraderPage';

export const test = base.extend<{
    loginPage: LoginPage;
    passwordPage: PasswordPage;
    homePage: HomePage;
    dtraderPage: DTraderPage; // ← add here
}>({
    // ... existing fixtures ...
    dtraderPage: async ({ page }, use) => {
        const dtraderPage = new DTraderPage(page);
        await use(dtraderPage);
    },
});
```

**Use in tests:**

```typescript
test('should redirect to DTrader in demo mode', async ({ page, homePage, dtraderPage }) => {
    await homePage.clickDTraderOption();

    await dtraderPage.verifyLandedOnDTrader();
    await dtraderPage.clickHomeToReturnToDashboard();

    await expect(page, 'Should return to Deriv home after clicking Home').toHaveURL(/deriv\.com/);
});
```

**Key Rules for Cross-Domain POMs:**

- ✅ One POM per domain/app (e.g., `DTraderPage`, `SmartTraderPage`, `DBotPage`)
- ✅ Source POM only handles the click/navigation; target POM handles verification
- ✅ Register target POMs as global fixtures for clean test access
- ✅ Use `toHaveURL()` assertions with domain patterns for reliable redirect checks
- ❌ Never define selectors for App B inside App A's page object

---

#### 🗂️ **One Page Object Per Route — Same-Domain Navigation**

The same principle applies to **same-domain, different-route** navigation within home-app. When a test navigates from `/dashboard/home` to `/dashboard/cfds`, the CFDs page content belongs in `CFDsPage`, not `HomePage`.

**The decision rule:**

> _"Does this locator belong to the page navigated TO, or the navigation shell?"_
>
> - **Navigation shell** (sidebar links, nav bar, Ask Amy — visible on every dashboard route) → `HomePage`
> - **Destination page content** (page-specific sections, cards, headings) → destination's own Page Object

```typescript
// ❌ WRONG — CFDs page locator crammed into HomePage
// pages/HomePage.ts
get cfdMyAccountsSection(): Locator {
    return this.page.getByTestId("cfd-section-my-accounts"); // ❌ belongs in CFDsPage
}

// ✅ CORRECT — each route has its own Page Object
// pages/CFDsPage.ts
get myAccountsSection(): Locator {
    return this.page.getByTestId("cfd-section-my-accounts"); // ✅
}

// pages/OptionsPage.ts
get platformCardDtrader(): Locator {
    return this.page.getByTestId("options-card-platform-dtrader"); // ✅
}

// pages/PortfolioPage.ts
get walletUsd(): Locator {
    return this.page.getByTestId("portfolio-btn-wallet-balance-USD"); // ✅
}
```

**In tests, destructure all page fixtures for the routes visited:**

```typescript
// ✅ CORRECT — fixtures match the pages visited in the test
test('VERIFY sidebar redirects', async ({ page, homePage, cfdsPage, optionsPage, portfolioPage }) => {
    await homePage.navigateToCFDsFromSidebar();
    await expect(cfdsPage.myAccountsSection, '"My accounts" section should be visible on CFDs page').toBeVisible();

    await homePage.navigateToOptionsFromSidebar();
    await expect(optionsPage.platformCardDtrader, 'DTrader card should be visible on Options page').toBeVisible();
});

// ❌ WRONG — all assertions going through homePage even though we're on different pages
test('VERIFY sidebar redirects', async ({ page, homePage }) => {
    await homePage.navigateToCFDsFromSidebar();
    await expect(homePage.cfdMyAccountsSection, '...').toBeVisible(); // ❌ wrong POM
});
```

**Summary:**

- ✅ One POM per route (`CFDsPage` for `/dashboard/cfds`, `OptionsPage` for `/dashboard/options`, etc.)
- ✅ `HomePage` owns only the persistent shell: sidebar nav links, Ask Amy, deposit nudge
- ❌ Never add destination-page locators to the source page's POM

---

#### 📋 **Page Object Best Practices Checklist**

**Structure:**

- ✅ Use TypeScript for type safety
- ✅ Add JSDoc comments for documentation
- ✅ Group methods into exactly **three** ordered sections: **LOCATORS → ACTIONS → VERIFICATIONS**
- ✅ Use readonly for page property
- ✅ Export class for reusability

**Locators:**

- ✅ Use getter methods (not properties)
- ✅ Implement fallback selector chains
- ✅ Prefer user-facing selectors (role, label, text)
- ✅ Use data-testid as first choice
- ✅ Add descriptive comments

**Methods:**

- ✅ Keep methods focused (single responsibility)
- ✅ Use async/await for all interactions
- ✅ Add parameter type annotations
- ✅ Return meaningful values
- ✅ Handle errors gracefully

**Naming:**

- ✅ Use descriptive method names (navigateToPortfolio, not goToP)
- ✅ Use consistent naming patterns
- ✅ Prefix verification methods with 'is' or 'has'
- ✅ Use 'get' prefix for retrieval methods

**Documentation:**

- ✅ Add class-level JSDoc
- ✅ Document complex methods
- ✅ Include usage examples
- ✅ Explain parameters and return values

---

#### ✅ Key POM Principles

1. **Encapsulation**: Hide implementation, expose user actions
2. **Single Responsibility**: Each method does one thing well
3. **Robust Selectors**: Use fallback chains
4. **Error Handling**: Graceful failures with useful information
5. **Utility Methods**: Helper functions for common checks
6. **Type Safety**: Full TypeScript support
7. **Reusability**: Methods can be used across multiple tests
8. **Maintainability**: Easy to update when UI changes

---

### Always Explore Pages with Playwright MCP Before Creating Page Objects

**Never assume the structure, flow, or locators of any page.** Before writing or updating a Page Object, you MUST:

1. **Use Playwright MCP to navigate to the page** and take a live snapshot (`browser_snapshot`) to see the actual DOM structure, roles, and accessible names.
2. **Explore the full user flow** — many flows span multiple screens (e.g. signup is split across: country selection → email entry → OTP verification → password creation → post-signup dialog). Explore each screen individually.
3. **Ask the user for context** when a page is behind authentication, a specific flow, or requires setup data you don't have (e.g. a pre-existing account, a specific URL, a feature flag).
4. **Document what you find** — note the actual button labels, input placeholders, test IDs, and URL patterns before writing any locator.
5. **Never guess locators** — if you cannot navigate to the page, ask the user to provide a screenshot, the page URL, or the relevant DOM snapshot.

#### Why this matters

Assuming page structure leads to:

- Incorrect locators that fail immediately or intermittently
- Missing steps in multi-screen flows
- Wasted debugging time fixing tests that never matched the real UI

#### Workflow for new Page Objects

```
1. Use Playwright MCP → navigate to the page
2. Take a browser_snapshot → inspect roles, labels, test IDs
3. Navigate through each step of the flow → snapshot each screen
4. Note actual button text, input names, URL patterns
5. Ask user if any screen requires auth or special setup
6. Only then write the Page Object with accurate locators
```

#### Using Mailisk to Unblock Yourself During Exploration

When a flow requires OTP verification (e.g. signup, email change), use the Mailisk API to retrieve the OTP and continue exploring beyond the OTP screen.

**Rules:**

- Always use the **same email format** as `DataFactory` generates: `drvtstqa_<prefix>_<timestamp>_<random>@webapps.mailisk.net` (Email local part must NEVER exceed 64 characters)
- Always use the **`webapps` namespace** — never `mobileapps` during exploration
- Capture `from_timestamp = Math.floor(Date.now() / 1000)` **before** triggering the email send
- Use `MailiskUtils.extractOtp('webapps', { to_addr_prefix: emailLocalPart, from_timestamp })` to retrieve the OTP
- See `08-mailisk.md` for full API reference
