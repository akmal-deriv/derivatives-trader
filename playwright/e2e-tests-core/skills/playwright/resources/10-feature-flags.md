---
title: Feature Flag Utilities
description: Feature flag checking and usage patterns in tests
parent_skill: playwright
---

## 🚩 Feature Flag Utilities

Feature flags control UI changes in the Deriv app. Tests that cover flagged features must toggle
the relevant flags before interacting with the page.

All toggle functions reload the page after updating localStorage so the app picks up the new flag
state. `NavigationUtils.waitForDerivApiSettled()` is called internally — never use `waitForTimeout`
after these helpers.

**NOTE:** `waitForLoadState('networkidle')` is intentionally NOT used here because third-party
scripts (Datadog, analytics) maintain persistent connections that prevent 'networkidle' from ever
being reached on staging-trading.deriv.com.

### Import

```typescript
import { enableFeatureFlags, disableFeatureFlags, getFeatureFlags } from '../utils';
```

### Available Functions

| Function                           | Description                                                    |
| ---------------------------------- | -------------------------------------------------------------- |
| `enableFeatureFlags(page, flags)`  | Enable one or more feature flags in localStorage, then reload  |
| `disableFeatureFlags(page, flags)` | Disable one or more feature flags in localStorage, then reload |
| `getFeatureFlags(page)`            | Read current feature flags from localStorage as a typed array  |

### Signatures

```typescript
enableFeatureFlags(page: Page, flags: string | string[]): Promise<void>
disableFeatureFlags(page: Page, flags: string | string[]): Promise<void>
getFeatureFlags(page: Page): Promise<FeatureFlag[]>

interface FeatureFlag {
    name: string;
    enabled: boolean;
}
```

### Key Rules

- Always navigate to the page **before** calling `enableFeatureFlags` — localStorage is only accessible after page load
- The page is **always reloaded** after toggling flags — `waitForDerivApiSettled` is called internally
- Never use `waitForTimeout` after these helpers — use `expect(...).toBeVisible()` instead
- Clean up flags in `afterEach` with `disableFeatureFlags` to avoid state leaking between tests

### Example: Feature Flag Usage

```typescript
import { test, expect } from '../../fixtures/fixtures';
import { enableFeatureFlags, disableFeatureFlags, getFeatureFlags } from '../../utils';

test.describe('Wallet V2 feature flag', { tag: ['@smoke', '@wallet', '@desktop', '@mobile'] }, () => {
    /**
     * Verifies that the wallet_v2 feature flag enables the new wallet UI.
     */
    test('should show new wallet UI when wallet_v2 flag is enabled', async ({ page }) => {
        // Navigate first — localStorage is only accessible after page load
        await page.goto('/');

        // Enable the flag — page reloads automatically
        await enableFeatureFlags(page, 'wallet_v2');

        // Assert the flagged UI is now visible
        await expect(
            page.getByTestId('wallet-v2-container'),
            'Wallet V2 container should be visible after flag is enabled'
        ).toBeVisible();
    });

    test('should verify and clean up flags', async ({ page }) => {
        await page.goto('/');
        await enableFeatureFlags(page, ['flag_a', 'flag_b']);

        // Verify flags were set
        const flags = await getFeatureFlags(page);
        expect(flags.find(f => f.name === 'flag_a')?.enabled, 'flag_a should be enabled').toBe(true);
        expect(flags.find(f => f.name === 'flag_b')?.enabled, 'flag_b should be enabled').toBe(true);

        // Disable after test
        await disableFeatureFlags(page, ['flag_a', 'flag_b']);
    });
});
```

---
