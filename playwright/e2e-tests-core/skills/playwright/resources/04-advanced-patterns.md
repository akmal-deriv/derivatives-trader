---
title: Advanced Patterns, Anti-Patterns & Code Quality
description: MCP setup, security, performance, CI/CD, anti-patterns, advanced patterns, clean code standards, and quality metrics
parent_skill: playwright
---

## 🛠️ Playwright MCP Setup

Use the **Playwright MCP server** with the `--isolated` flag for AI-assisted browser exploration.

### MCP Configuration

```json
{
    "mcpServers": {
        "playwright": {
            "disabled": false,
            "timeout": 30,
            "type": "stdio",
            "command": "npx",
            "args": ["-y", "@playwright/mcp@latest", "--isolated"]
        }
    }
}
```

> ⚠️ **Without `--isolated`**: browser may reuse stale sessions causing failures.

> ✅ **With `--isolated`**: every session starts fresh — no cookie/state bleed.

---

---

### 1. Security & Data Management

#### ✅ **UPDATED 2026**: Secure Credential Handling - No Hardcoded Fallbacks

```typescript
// ✅ SECURE - Environment-only credential management (NO fallbacks)
export const loginHelpers = test.extend({
    login: async ({}, use) => {
        const loginFunction = async (page: Page, email?: string, password?: string): Promise<void> => {
            // Use provided credentials or environment variables
            const finalEmail = email ?? process.env.TEST_EMAIL;
            const finalPassword = password ?? process.env.TEST_PASSWORD;

            // ✅ CRITICAL: No fallback values - fail fast if credentials missing
            if (!finalEmail || !finalPassword) {
                throw new Error(
                    'Missing credentials: TEST_EMAIL and TEST_PASSWORD must be set in .env file ' +
                        'or passed as parameters. No hardcoded fallbacks allowed for security.'
                );
            }

            // Proceed with secure login...
        };
        await use(loginFunction);
    },
});

/* ❌ PSEUDOCODE — DO NOT COPY — illustrates the anti-pattern only
class TestCredentials {
  static getEmail(): string {
    return process.env.TEST_EMAIL || "<fallback>";
  }
}
*/

// ✅ SECURE - Fail-fast approach
class SecureTestCredentials {
    static getEmail(): string {
        const email = process.env.TEST_EMAIL;
        if (!email) {
            throw new Error('TEST_EMAIL environment variable is required');
        }
        return email;
    }

    static getPassword(): string {
        const password = process.env.TEST_PASSWORD;
        if (!password) {
            throw new Error('TEST_PASSWORD environment variable is required');
        }
        return password;
    }
}
```

#### 🚨 **CRITICAL RULE**: NEVER Change Real User Credentials to '[EMAIL_REDACTED]'

**❌ ABSOLUTELY FORBIDDEN:**

- Converting real working email addresses to '[EMAIL_REDACTED]' in existing test files
- Changing functioning credentials to placeholder values
- Replacing actual test data with redacted placeholders

**✅ CORRECT APPROACH:**

```typescript
// ❌ DON'T DO THIS - Breaking working tests
await loginHelpers.login(page, '[EMAIL_REDACTED]', process.env.TEST_PASSWORD);

// ❌ NEVER DO THIS - Hardcoded credentials in source code
await loginHelpers.login(page, 'real@email.com', 'realpassword');

// ✅ DO THIS - Use environment variables directly
await loginHelpers.login(page); // Uses TEST_EMAIL and TEST_PASSWORD from .env
```

**📋 When Working with Existing Tests:**

1. **PRESERVE working credentials** - don't change them to '[EMAIL_REDACTED]'
2. **Use environment variables** where possible for flexibility
3. **Only redact credentials in documentation/examples** - never in working tests
4. **If credentials are already working, leave them alone**

**🎯 Use '[EMAIL_REDACTED]' ONLY for:**

- Documentation examples in this skills file
- Code comments explaining patterns
- Template files that aren't actual tests
- Security-related examples where showing real data would be inappropriate

**⚠️ NEVER use '[EMAIL_REDACTED]' in:**

- Working test files that need to actually run
- Functional test specifications
- Files that are part of the active test suite

````

#### ✅ **NEW 2026**: Clean Code - No Unused Utilities Policy
```typescript
// ✅ PRINCIPLE: Keep utilities minimal and purpose-driven
// Only include functions that are actually used in tests

// ❌ AVOID - Unused utility functions
export const testUtils = {
    takeScreenshot: async (page: Page, name: string) => { /* unused */ },
    clearAllStorage: async (page: Page) => { /* unused */ },
    getBaseUrl: () => process.env.BASE_URL || 'fallback', // unused + fallback
};

// ✅ CORRECT - Clean, minimal utilities file
/**
 * Common test utilities for Playwright tests
 *
 * NOTE: Login functionality has been moved to fixtures/fixtures.ts
 * Use the fixtures approach for better test setup and teardown.
 *
 * This file is kept for future utility functions that may be needed.
 * Currently, all utilities have been moved to more appropriate locations:
 * - Login helpers: fixtures/fixtures.ts
 * - Page objects: pages/ directory
 */

// This file is intentionally minimal - add utilities here when needed
````

#### ✅ Data Cleanup Patterns

```typescript
// Cleanup after tests
test.afterEach(async ({ page }) => {
    // Clear browser data
    await page.context().clearCookies();
    await page.context().clearPermissions();

    // Cleanup test data if using real environment
    if (TestCredentials.isUsingRealCredentials()) {
        await cleanupTestData(page);
    }
});
```

### 2. Performance & Optimization

#### ✅ Test Performance Best Practices

```typescript
// Parallel execution optimization
test.describe.configure({ mode: 'parallel' });

// Serial execution (when tests must run in order and share state)
test.describe.configure({ mode: 'serial' });

// ❌ NEVER set timeout inside test.describe.configure — use the project default
// test.describe.configure({ mode: "serial", timeout: 120_000 }); // FORBIDDEN

// Efficient test setup
test.beforeAll(async ({ browser }) => {
    // Setup that can be shared across tests
    const context = await browser.newContext();
    const page = await context.newPage();
    await performExpensiveSetup(page);
});

// Resource optimization
test('should load quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/login');
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // 3 second threshold
});
```

### 3. CI/CD Integration Patterns

#### ✅ Environment Configuration

```typescript
// Environment-specific configurations
const config: PlaywrightTestConfig = {
    // ... base config
    projects: [
        {
            name: 'local',
            use: { baseURL: 'http://localhost:3000' },
        },
        {
            name: 'staging',
            use: { baseURL: 'https://staging.example.com' },
        },
        {
            name: 'production',
            use: {
                baseURL: 'https://app.deriv.com',
                testIgnore: /.*integration.spec.ts/, // Skip destructive tests
            },
        },
    ],
};
```

#### ✅ CI/CD Script Examples

```yaml
# GitHub Actions example
- name: Run Playwright Tests
  run: |
      npx playwright install --with-deps
      npx playwright test --project=chromium

- name: Upload test reports
  uses: actions/upload-artifact@v3
  if: always()
  with:
      name: playwright-report
      path: playwright-report/
```

## 🚨 Common Anti-Patterns to Avoid

### ❌ Bad Practices

```typescript
// DON'T: Use brittle selectors
await page.click('#app > div > form > div:nth-child(2) > button');

// DON'T: Hard-code waits
await page.waitForTimeout(5000);

// DON'T: Ignore errors
try { await page.click('.maybe-exists'); } catch {}

// DON'T: Hardcode test data
await page.fill('#email', 'john@company.com');

// DON'T: Write vague tests
test('test login', async ({ page }) => {
    // unclear what this tests
});

// DON'T: Use style-based / inline-style selectors (flaky)
// Inline styles change with theming, browser defaults, or minor UI updates
get accountName(): Locator {
    return this.page.locator('span[style*="color: rgba(0, 0, 0, 0.48)"]').filter({ hasText: 'Financial' });
    // ❌ style*= breaks when the colour token, opacity, or theme changes
}

// DON'T: Hardcode URLs for in-app navigation — use sidebar/nav clicks instead
async gotoOptionsPage(): Promise<void> {
    const rawBase = process.env.BASE_URL ?? 'https://app.example.com/dashboard';
    const origin = new URL(rawBase).origin;
    await this.page.goto(`${origin}/dashboard/options`); // ❌ Hardcoded URL navigation
}
```

### ✅ Corrected Versions

```typescript
// DO: Use robust selectors
await page.getByRole('button', { name: /submit|login/i }).click();

// DO: Use smart waiting
await expect(page.getByText('Success')).toBeVisible();

// DO: Handle errors gracefully
const button = page.getByRole('button', { name: 'Optional Action' });
if (await button.isVisible()) {
    await button.click();
}

// DO: Use environment variables
await page.fill('#email', process.env.TEST_EMAIL || 'test@example.com');

// DO: Write specific, testable descriptions
test('should display success message after valid form submission', async ({ page }) => {
    // clear test purpose
});

// DO: Use user-facing / content-based selectors instead of style attributes
get accountName(): Locator {
    return this.page.getByText('Financial')
        .or(this.page.locator('span:has-text("Financial")'))
        .first();
    // ✅ Stable - targets visible text content, not CSS implementation details
}

// DO: Navigate within the app via sidebar/nav links — never hardcode URLs
async gotoOptionsPage(): Promise<void> {
    await expect(this.optionsNavLink, 'Options sidebar link should be visible').toBeVisible();
    await this.optionsNavLink.click();
    await this.page.waitForLoadState('domcontentloaded');
    // ✅ Uses the actual sidebar navigation link — no hardcoded URL
}
```

### 🔗 In-App Navigation Anti-Pattern (Detailed)

#### ❌ **Why Hardcoding Navigation URLs Is Wrong**

```typescript
// ❌ AVOID — constructs and navigates to a URL directly
async gotoOptionsPage(): Promise<void> {
    const rawBase = process.env.BASE_URL ?? 'https://app.example.com';
    const origin = new URL(rawBase).origin;
    await this.page.goto(`${origin}/dashboard/options`);
}
```

**Why it breaks:**

- 🔗 **Bypasses real user flow** — users never type URLs; they click nav links
- 🌍 **Environment fragility** — URL paths differ between staging and production
- 🧭 **Skips route guards** — direct URL access may bypass auth checks or redirect logic
- 🔄 **Misses state transitions** — sidebar click may set app state that a direct URL visit does not
- 🧩 **Tight coupling** — tests break whenever a URL path changes, even if the nav link still works

#### ✅ **Always Navigate via Sidebar / Nav Links**

```typescript
// ✅ CORRECT — wait for the sidebar link, then click it
async gotoOptionsPage(): Promise<void> {
    await expect(this.optionsNavLink, 'Options sidebar link should be visible').toBeVisible();
    await this.optionsNavLink.click();
    await this.page.waitForLoadState('domcontentloaded');
}
```

**Key principles:**

- ✅ **Mimic real user behaviour** — click the link the user would click
- ✅ **Environment-agnostic** — the sidebar link renders the correct URL regardless of environment
- ✅ **Exercises the full navigation stack** — route guards, state changes, and redirects are all tested
- ✅ **Resilient to URL changes** — if the path changes, only the `href` attribute changes, not your test

#### 📋 **Navigation Quick-Reference**

| ❌ Avoid                                                     | ✅ Use Instead                                  |
| ------------------------------------------------------------ | ----------------------------------------------- |
| `page.goto('/dashboard/options')`                            | Click the Options sidebar link                  |
| `page.goto(\`${origin}/dashboard/cfds\`)`                    | Click the CFDs sidebar link                     |
| Constructing URLs from `process.env.BASE_URL` for in-app nav | Use sidebar/nav/breadcrumb links                |
| `page.goto(url)` for sub-pages the user navigates to via UI  | Use the UI element that triggers the navigation |

> **Exception**: `page.goto()` is acceptable for the **initial app entry point** (e.g. the login page or the root dashboard URL after login) — not for navigating between sections within the app.

### 🎨 Style-Based Selector Anti-Pattern (Detailed)

#### ❌ **Why `style*=` Selectors Are Flaky**

```typescript
// ❌ AVOID - style attribute selectors
this.page.locator('[style*="color: rgba(0, 0, 0, 0.48)"]');
this.page.locator('[style*="font-size: 24px"][style*="font-weight: 800"]');
this.page.locator('span[style*="background-color: red"]');
```

**Why they break:**

- 🎨 **Theming changes** - design system updates colour tokens
- 🌗 **Dark/light mode** - colours differ between themes
- 🔢 **Precision differences** - `rgba(0,0,0,0.48)` vs `rgba(0, 0, 0, 0.478)` - one space breaks the match
- 📱 **Responsive styles** - different values at different viewports
- 🔧 **CSS refactors** - moving from inline styles to CSS classes removes the attribute entirely
- 🌐 **Browser normalisation** - browsers may reformat inline style values

#### ✅ **Use Content or Role Selectors Instead**

```typescript
// ✅ CORRECT - match by visible text (user-facing, stable)
get financialMT5AccountName(): Locator {
    return this.page.getByText('Financial')
        .or(this.page.locator('span:has-text("Financial")'))
        .first();
}

// ✅ CORRECT - match by role and name
get dialogTitle(): Locator {
    return this.page.getByRole('heading', { name: 'Leave process?' });
}

// ✅ CORRECT - match by data-testid (most reliable)
get accountCard(): Locator {
    return this.page.getByTestId('financial-account-card');
}
```

#### 📋 **Style Selector Quick-Reference**

| ❌ Avoid                   | ✅ Use Instead                 |
| -------------------------- | ------------------------------ |
| `[style*="color:"]`        | `getByText()` or `:has-text()` |
| `[style*="font-weight:"]`  | `getByRole('heading')`         |
| `[style*="display: none"]` | `.not.toBeVisible()` assertion |
| `[style*="background"]`    | `data-testid` or semantic role |
| `[style*="font-size:"]`    | `getByRole()` with name        |

## 🎓 Advanced Patterns

### 🏗️ Global Page Object Fixtures (Recommended Pattern)

#### ❌ **Anti-Pattern: Manual Page Object Creation**

```typescript
// DON'T: Repetitive code in every test file
import { test, expect, loginHelpers } from '../../../fixtures/fixtures';
import { LoginPage } from '../../../pages/LoginPage';
import { PasswordPage } from '../../../pages/PasswordPage';

test.describe('Some Tests', () => {
    let loginPage: LoginPage;
    let passwordPage: PasswordPage;

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page); // ❌ Manual instantiation
        passwordPage = new PasswordPage(page); // ❌ Repetitive setup
        await loginPage.gotoLoginPage();
    });

    test('some test', async ({ page }) => {
        // Use loginPage and passwordPage...
    });
});
```

#### ✅ **Best Practice: Global Fixtures Pattern**

```typescript
// DO: Clean, reusable fixtures
import { test, expect, loginHelpers } from '../../../fixtures/fixtures';

test.describe('Some Tests', () => {
    test.beforeEach(async ({ loginPage }) => {
        await loginPage.gotoLoginPage(); // ✅ Direct fixture usage
    });

    test('some test', async ({ page, loginPage, passwordPage }) => {
        // ✅ Page objects automatically available as fixtures
        await loginHelpers.login(page, '[EMAIL_REDACTED]', process.env.TEST_PASSWORD);
    });
});
```

#### 🔧 **How It Works**

**1. Fixture Definition** (Already configured in `fixtures/fixtures.ts`):

```typescript
import { LoginPage } from '../pages/LoginPage';
import { PasswordPage } from '../pages/PasswordPage';
import { HomePage } from '../pages/HomePage';
import { SignupPage } from '../pages/SignupPage';
import { OnboardingPage } from '../pages/OnboardingPage';

export const test = base.extend<{
    loginPage: LoginPage;
    passwordPage: PasswordPage;
    homePage: HomePage;
    signupPage: SignupPage;
    onboardingPage: OnboardingPage;
}>({
    loginPage: async ({ page }, use) => {
        const loginPage = new LoginPage(page);
        await use(loginPage);
    },

    passwordPage: async ({ page }, use) => {
        const passwordPage = new PasswordPage(page);
        await use(passwordPage);
    },

    homePage: async ({ page }, use) => {
        const homePage = new HomePage(page);
        await use(homePage);
    },

    signupPage: async ({ page }, use) => {
        const signupPage = new SignupPage(page);
        await use(signupPage);
    },

    onboardingPage: async ({ page }, use) => {
        const onboardingPage = new OnboardingPage(page);
        await use(onboardingPage);
    },
});
```

**2. Usage in Tests**:

```typescript
// Access page objects directly as test parameters
test('my test', async ({ page, loginPage, passwordPage }) => {
    // loginPage and passwordPage are ready to use
    await loginPage.gotoLoginPage();
    await loginPage.enterEmailAndSubmit('[EMAIL_REDACTED]');
    await passwordPage.enterPasswordAndSubmit('password');
});

// All five fixtures are available in any test
test('signup real account', async ({ signupPage, onboardingPage }) => {
    await signupPage.goto();
    // ... complete signup flow ...
    await onboardingPage.waitForPersonalDetailsStep();
    // ... complete onboarding flow ...
});
```

#### 🎯 **Key Benefits**

- **Code Reduction**: Eliminates 8+ lines of boilerplate per test file
- **Zero Manual Imports**: No need to import `LoginPage`/`PasswordPage` classes
- **No Variable Declarations**: Eliminates `let loginPage: LoginPage;` variables
- **Automatic Availability**: Page objects available via fixtures in any test
- **Type Safety**: Full TypeScript intellisense for fixtures
- **Consistency**: All tests use same page object instances
- **Maintainability**: Single source of truth for page object initialization

#### 📝 **Migration Guide**

**Step 1**: Remove manual imports

```diff
- import { LoginPage } from '../../../pages/LoginPage';
- import { PasswordPage } from '../../../pages/PasswordPage';
```

**Step 2**: Remove variable declarations

```diff
- let loginPage: LoginPage;
- let passwordPage: PasswordPage;
```

**Step 3**: Update beforeEach

```diff
- test.beforeEach(async ({ page }) => {
-     loginPage = new LoginPage(page);
-     passwordPage = new PasswordPage(page);
-     await loginPage.gotoLoginPage();
- });

+ test.beforeEach(async ({ loginPage }) => {
+     await loginPage.gotoLoginPage();
+ });
```

**Step 4**: Add fixtures to test parameters as needed

```diff
- test('my test', async ({ page }) => {
+ test('my test', async ({ page, loginPage, passwordPage }) => {
```

#### 🚀 **Adding New Global Page Objects**

**Update `fixtures/fixtures.ts`** (current fixtures + new addition):

```typescript
export const test = base.extend<{
    loginPage: LoginPage;
    passwordPage: PasswordPage;
    homePage: HomePage;
    signupPage: SignupPage;
    onboardingPage: OnboardingPage;
    newPage: NewPage; // ← Add new fixture type
}>({
    loginPage: async ({ page }, use) => {
        await use(new LoginPage(page));
    },
    passwordPage: async ({ page }, use) => {
        await use(new PasswordPage(page));
    },
    homePage: async ({ page }, use) => {
        await use(new HomePage(page));
    },
    signupPage: async ({ page }, use) => {
        await use(new SignupPage(page));
    },
    onboardingPage: async ({ page }, use) => {
        await use(new OnboardingPage(page));
    },

    // ← Add new fixture implementation
    newPage: async ({ page }, use) => {
        const newPage = new NewPage(page);
        await use(newPage);
    },
});
```

**Use in any test:**

```typescript
test('dashboard test', async ({ dashboardPage }) => {
    await dashboardPage.navigateToPortfolio();
    // ...
});
```

### Custom Fixtures

```typescript
// fixtures/customFixtures.ts
export const test = baseTest.extend<{ loginPage: LoginPage }>({
    loginPage: async ({ page }, use) => {
        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await use(loginPage);
    },
});

// Usage in tests
test('should login successfully', async ({ loginPage }) => {
    await loginPage.login('[EMAIL_REDACTED]', 'password');
    await expect(loginPage.successMessage).toBeVisible();
});
```

### API Integration

```typescript
// Combine UI and API testing
test('should sync UI state with API', async ({ page, request }) => {
    // Setup via API
    const response = await request.post('/api/users', {
        data: { email: 'test@example.com', name: 'Test User' },
    });
    expect(response.ok()).toBeTruthy();

    // Verify in UI
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test@example.com', 'password');

    await expect(page.getByText('Welcome, Test User')).toBeVisible();
});
```

## 📊 Quality Metrics

### Test Quality Checklist

- ✅ Tests are independent and can run in any order
- ✅ Each test has a single, clear purpose
- ✅ Error messages are descriptive and actionable
- ✅ No hardcoded waits or brittle selectors
- ✅ Proper cleanup after each test
- ✅ Security best practices followed
- ✅ Cross-browser compatibility verified
- ✅ Mobile responsiveness tested
- ✅ Performance thresholds defined
- ✅ Documentation is up-to-date

## 🧹 **NEW 2026**: Clean Code Implementation Standards

### ✅ Zero-Waste Codebase Policy

This project now follows a **strict no-unused-code policy**:

#### **1. Security-First Credential Management**

```typescript
// ✅ IMPLEMENTED: No hardcoded fallbacks anywhere
// All credential functions throw errors if environment variables missing
// Complete removal of unsafe fallback patterns

// Before (❌ Security Risk):
const email = process.env.TEST_EMAIL || '[EMAIL_REDACTED]';

// After (✅ Secure):
const email = process.env.TEST_EMAIL;
if (!email) {
    throw new Error('TEST_EMAIL is required in .env file');
}
```

#### **2. Minimal Utilities Philosophy**

```typescript
// ✅ CURRENT STATE: utils/ is intentionally minimal and focused
// - All unused functions removed (takeScreenshot, clearAllStorage, testData)
// - Ready for future utilities only when actually needed
// - No speculative or "just in case" functions

// ✅ PRINCIPLE: Add utilities only when:
// - Function is used in 2+ places
// - Function serves a clear, documented purpose
// - Function is tested and maintained
```

#### **3. Robust Login Architecture**

```typescript
// ✅ SINGLE SOURCE OF TRUTH: fixtures/fixtures.ts
export const loginHelpers = test.extend({
    login: async ({}, use) => {
        const loginFunction = async (page: Page, email?: string, password?: string) => {
            // Smart parameter handling with environment fallback
            const finalEmail = email ?? process.env.TEST_EMAIL;
            const finalPassword = password ?? process.env.TEST_PASSWORD;

            // Fail-fast validation (no silent failures)
            if (!finalEmail || !finalPassword) {
                throw new Error('Missing credentials: TEST_EMAIL and TEST_PASSWORD required');
            }

            // Single, reliable login implementation
            // All tests use this same function for consistency
        };
        await use(loginFunction);
    },
});
```

#### **4. Production-Ready Error Handling**

```typescript
// ✅ DESCRIPTIVE ERROR MESSAGES: Help developers fix issues quickly
throw new Error(
    'Missing credentials: TEST_EMAIL and TEST_PASSWORD must be set in .env file ' +
        'or passed as parameters. No hardcoded fallbacks allowed for security.'
);

// ✅ FAIL-FAST VALIDATION: Catch configuration issues early
// ✅ CLEAR DOCUMENTATION: Every error explains how to fix it
```

#### **5. Test Quality Standards**

```typescript
// ✅ ALL TESTS MUST:
// - Use the unified login helper (no duplicate implementations)
// - Have descriptive names explaining what they test
// - Include proper error handling and validation
// - Work independently (no test dependencies)
// - Follow security best practices

// ✅ EXAMPLE TEST STRUCTURE:
test('should reject login with invalid email format', async ({ page, loginHelpers }) => {
    // Clear intent: testing email validation
    // Uses standardized login helper
    // Specific assertion about expected behavior
});
```

### 🎯 **Implementation Results**

#### **Before Cleanup (❌ Problems):**

- Multiple hardcoded credential fallbacks
- Unused utility functions (takeScreenshot, clearAllStorage, testData helpers)
- Inconsistent login implementations across tests
- Security risks from fallback values
- Cluttered codebase with speculative functions

#### **After Cleanup (✅ Benefits):**

- **Zero hardcoded credentials** - all environment-dependent
- **Minimal, focused utilities** - only what's actually used
- **Single login pattern** - consistent across all tests
- **Production-ready security** - no fallbacks, proper validation
- **Clean, maintainable codebase** - every function has a purpose

### 🔒 **Security Compliance Achieved**

- ✅ **No credentials in source code** anywhere in the system
- ✅ **Fail-fast validation** prevents silent failures
- ✅ **Environment-dependent configuration** enforced throughout
- ✅ **Clear error messages** help developers configure properly
- ✅ **Zero fallback security risks** eliminated completely

### 📈 **Maintenance Benefits**

- ✅ **Simplified debugging** - single login implementation to troubleshoot
- ✅ **Reduced cognitive load** - no unused code to understand
- ✅ **Clear architecture** - everything has a documented purpose
- ✅ **Easy onboarding** - new developers see only relevant code
- ✅ **Reliable testing** - consistent patterns across all tests

---

## 🎛️ Runtime-Parametrised Tests (env-var-driven)

Some tests are designed to be configured entirely at runtime via environment variables rather than having separate spec files per combination. This pattern is used when a test covers a matrix of configuration options (e.g. account type × routing × currency × CFD type) and creating a separate spec file for each combination would cause duplication.

### When to use

Use this pattern when creating a separate spec file for each combination would cause duplication. The parametrised approach keeps one spec file and exposes the axes as env vars.

### Pattern

Collect ALL validation errors before throwing so engineers see every problem in one run, not one-at-a-time:

```typescript
// ── Env vars (validated in beforeAll) ────────────────────────────────────
// eslint-disable-next-line prefer-const -- assigned in beforeAll, undefined! is the standard pattern
let ACCOUNT_TYPE: 'demo' | 'real' = undefined!;
// Optional — any value or undefined is valid; no validation needed
let SIGNUP_URL: string | undefined;

test.beforeAll(() => {
    // Collect all errors before throwing — engineers see every problem at once
    const errors: string[] = [];

    const rawAccountType = process.env.DERIV_ACCOUNT_TYPE;
    if (rawAccountType !== 'demo' && rawAccountType !== 'real')
        errors.push(`DERIV_ACCOUNT_TYPE must be "demo" or "real", got: "${rawAccountType}"`);

    // ... validate other required vars the same way ...

    if (errors.length > 0) {
        throw new Error(
            '[test-name] Missing or invalid env vars — add them to the appropriate .env file:\n' +
                errors.map(e => `  - ${e}`).join('\n')
        );
    }

    // All validations passed — safe to assign.
    // Non-null assertions and casts are safe: values are validated above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ACCOUNT_TYPE = rawAccountType! as 'demo' | 'real';

    // Optional vars: read after required validation, no error needed
    SIGNUP_URL = process.env.SIGNUP_URL;
    if (SIGNUP_URL) console.log(`[test-name] Using custom SIGNUP_URL: ${SIGNUP_URL}`);
});
```

### Rules

- All env vars **must** be validated in `beforeAll` — never at module top level
- Use strict union types (`'demo' | 'real'`) — never `string`
- Document the allowed values in the top-of-file banner comment
- Provide a guard for invalid combinations (e.g. real CFDs on a demo account) — log a warning and downgrade gracefully instead of hard-failing
- The GitHub Actions workflow exposing this test must map each input to the corresponding env var in the `env:` block of the test step

---
