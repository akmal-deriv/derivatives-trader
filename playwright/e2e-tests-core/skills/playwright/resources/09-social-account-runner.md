---
title: Social Account Script Runner
description: Social/OAuth account creation, removal, and verification for mock IDP testing
parent_skill: playwright
---

## 👤 Social Account Script Runner

The Social Account Script Runner manages **social (OAuth) accounts** on the Deriv identity service (Ory Mock IDP). It is used to provision and clean up Gmail-based social accounts for tests that exercise the Mock Social Login flow.

> ⚠️ **STAGING ONLY** — never use in production tests.

**Location**: `utils/socialAccountScriptRunner.ts`

### Import

```typescript
import { addSocialAccount, removeSocialAccount, checkSocialAccount } from '../utils';
```

### Available Functions

| Function                                                    | Description                                                   |
| ----------------------------------------------------------- | ------------------------------------------------------------- |
| `addSocialAccount(request, qaEndpoint, email, options?)`    | Create a social (OAuth) account on the Deriv identity service |
| `removeSocialAccount(request, qaEndpoint, email, options?)` | Remove a social account by email                              |
| `checkSocialAccount(request, qaEndpoint, email, options?)`  | Check whether a social account exists for an email            |

### How It Works

Every function performs **two sequential API calls**:

1. **Set the QA endpoint** — `POST /qa/set_endpoint` with `{ endpoint: qaEndpoint }`
2. **Execute the operation** — `POST /qa/social_login` with the operation payload

### Signatures

```typescript
addSocialAccount(
    request: APIRequestContext,
    qaEndpoint: string,          // e.g. 'qa10'
    email: string,               // Gmail address to register
    options?: {
        brandCode?: 'deriv' | 'legacy';  // defaults to 'deriv'
        password?: string;               // defaults to SOCIAL_PASSWORD from .env
        debug?: boolean;                 // defaults to false
    }
): Promise<{ success: boolean; message: string }>

removeSocialAccount(
    request: APIRequestContext,
    qaEndpoint: string,
    email: string,
    options?: { debug?: boolean }
): Promise<{ success: boolean; message: string }>

checkSocialAccount(
    request: APIRequestContext,
    qaEndpoint: string,
    email: string,
    options?: { debug?: boolean }
): Promise<{ exists: boolean; message: string }>
```

### Key Rules

- Every function performs **two sequential API calls**: (1) set the QA endpoint, (2) execute the operation
- `addSocialAccount` defaults to `brandCode: 'deriv'` and uses `SOCIAL_PASSWORD` from `.env` — **never falls back to `TEST_PASSWORD`** (it may contain special characters rejected by the Ory Mock IDP)
- `SOCIAL_PASSWORD` must not contain special characters
- `SOCIAL_QA_ENDPOINT` must be set in `.env` (e.g. `qa10`) — fail-fast if not set
- Always clean up with `removeSocialAccount()` in `afterEach` regardless of test outcome
- Email format for social tests: `drvtst_social_<epoch>@gmail.com` (Gmail, not Mailisk)

### Environment Variables

```bash
SOCIAL_QA_ENDPOINT=qa10          # QA box for social account operations
SOCIAL_PASSWORD=Abcd1234         # Mock Social Login password — no special characters
```

### Example: Social Demo Signup Test

```typescript
import { test, expect } from '../../fixtures/fixtures';
import { addSocialAccount, removeSocialAccount, DataFactory, NavigationUtils } from '../../utils';

// ⚠️ Do NOT put env var validation at the top level of the file.
// Top-level throws crash the Playwright worker during tag-filtered runs
// (e.g. @production smoke runs that don't include this staging-only suite).
// Always validate inside test.beforeAll() — see the rule below.

const FEATURE_FLAGS_KEY = '_dashboard:featureFlags';
const SOCIAL_LOGIN_FLAG_OVERRIDES: Record<string, boolean> = {
    MOCK_SOCIAL_LOGIN: true,
    ENABLE_FEDCM: false,
    ENABLE_FEDCM_IFRAME: false,
    ENABLE_FEDCM_LOADER: false,
    ENABLE_FEDCM_LOGIN: false,
};

test.describe(
    'Social Account Demo Signup via Google OAuth',
    { tag: ['@signup', '@authentication', '@account-creation', '@desktop'] },
    () => {
        // ── Environment variables — validated in beforeAll, not top-level ────────
        // Declared here (inside describe) and assigned in beforeAll.
        // A top-level throw crashes the worker even when this suite is filtered out
        // (e.g. @production runs that don't include this staging-only suite).
        //
        // Non-null assertion (!): TypeScript cannot statically verify that beforeAll
        // runs before test() bodies, but Playwright guarantees it — this is the
        // standard pattern for beforeAll-initialized variables in this codebase.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        let SOCIAL_QA_ENDPOINT: string = undefined!;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        let SOCIAL_PASSWORD: string = undefined!;

        // Use DataFactory.generateSocialEmail() — never call generateEmail() for social login tests
        const testEmail = DataFactory.generateSocialEmail();

        test.beforeAll(() => {
            // Fail fast if required env vars are missing — but only when this suite runs
            const rawEndpoint = process.env.SOCIAL_QA_ENDPOINT;
            if (!rawEndpoint) {
                throw new Error(
                    '🔴 SOCIAL_QA_ENDPOINT is not set in .env — add it before running social account tests (e.g. SOCIAL_QA_ENDPOINT=qa10)'
                );
            }
            SOCIAL_QA_ENDPOINT = rawEndpoint;

            const rawPassword = process.env.SOCIAL_PASSWORD;
            if (!rawPassword) {
                throw new Error(
                    '🔴 SOCIAL_PASSWORD is not set in .env — add it before running social account tests. Must not contain special characters.'
                );
            }
            SOCIAL_PASSWORD = rawPassword;
        });

        test.afterEach(async ({ request }) => {
            try {
                await removeSocialAccount(request, SOCIAL_QA_ENDPOINT, testEmail);
            } catch (error) {
                console.warn(`Cleanup failed (non-fatal): ${error}`);
            }
        });

        test('should sign up for a demo account using Google OAuth via Mock Social Login', async ({
            page,
            request,
            signupPage,
        }) => {
            // Step 1: Register the Gmail address as a social account
            const addResult = await addSocialAccount(request, SOCIAL_QA_ENDPOINT, testEmail, {
                brandCode: 'deriv',
            });
            expect(addResult.success, 'addSocialAccount should return success: true').toBe(true);

            // Step 2: Inject feature flag overrides via addInitScript (survives reloads)
            await page.addInitScript(
                ({ key, overrides }: { key: string; overrides: Record<string, boolean> }) => {
                    const originalSetItem = localStorage.setItem.bind(localStorage);
                    function applyOverrides(k: string, ovr: Record<string, boolean>): void {
                        const raw = localStorage.getItem(k);
                        let data: {
                            version: string;
                            flags: Array<{ name: string; enabled: boolean }>;
                        };
                        try {
                            data = raw ? JSON.parse(raw) : { version: '1.0.0', flags: [] };
                        } catch {
                            data = { version: '1.0.0', flags: [] };
                        }
                        if (!Array.isArray(data.flags)) data.flags = [];
                        Object.entries(ovr).forEach(([name, enabled]) => {
                            const existing = data.flags.find(f => f.name === name);
                            if (existing) {
                                existing.enabled = enabled;
                            } else {
                                data.flags.push({ name, enabled });
                            }
                        });
                        originalSetItem.call(localStorage, k, JSON.stringify(data, null, 2));
                    }
                    applyOverrides(key, overrides);
                    localStorage.setItem = function (itemKey: string, value: string): void {
                        originalSetItem.call(localStorage, itemKey, value);
                        if (itemKey === key) {
                            applyOverrides(key, overrides);
                        }
                    };
                },
                { key: FEATURE_FLAGS_KEY, overrides: SOCIAL_LOGIN_FLAG_OVERRIDES }
            );

            // Step 3: Navigate to staging login page
            await signupPage.goto();
            await NavigationUtils.waitForDerivApiSettled(page);

            // Step 4: Verify and click 'Log in with Google'
            await expect(signupPage.loginWithGoogleButton, '"Log in with Google" button should be visible').toBeVisible(
                { timeout: 15_000 }
            );
            await signupPage.clickLoginWithGoogle();

            // Step 5: Complete Mock Social Login (email -> password -> consent)
            await signupPage.waitForMockSocialLoginPage();
            await signupPage.enterMockSocialEmail(testEmail);
            await signupPage.clickMockSocialContinue();
            await signupPage.enterMockSocialPassword(SOCIAL_PASSWORD);
            await signupPage.clickMockSocialSignIn();
            await signupPage.clickMockSocialAccept();

            // Step 6: Handle 'Sign up now' dialog (new Gmail not yet linked to Deriv)
            await page.waitForURL(/staging-home\.deriv\.com/, { timeout: 30_000 });
            await NavigationUtils.waitForDerivApiSettled(page);
            await signupPage.clickSignUpNow();

            // Step 7: Select country and proceed to email step
            await signupPage.selectCountry('Albania');
            await signupPage.clickSignUpButton();

            // Step 8: Click 'Sign up with Google' and complete second OAuth round
            await signupPage.clickSignUpWithGoogle();
            await signupPage.clickMockSocialAccept();

            // Step 9: Verify dashboard is loaded after successful social signup
            await page.waitForURL(/staging-home\.deriv\.com/, { timeout: 30_000 });
            await NavigationUtils.waitForDerivApiSettled(page);
            await signupPage.verifyDashboardLoaded();
            await expect(
                page.getByText('Try demo trading', { exact: true }),
                '"Try demo trading" section heading should be visible on the home dashboard after social signup'
            ).toBeVisible({ timeout: 30_000 });
        });
    }
);
```

---
