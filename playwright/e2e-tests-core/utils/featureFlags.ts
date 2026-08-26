/**
 * Feature Flag Utilities
 *
 * Provides Playwright helpers to enable, disable, and read feature flags stored
 * in the browser's `localStorage` under the key `_dashboard:featureFlags`.
 *
 * Feature flags control UI changes in the Deriv app. Tests that cover flagged
 * features must toggle the relevant flags before interacting with the page.
 *
 * All toggle functions reload the page after updating localStorage so the app
 * picks up the new flag state. `NavigationUtils.waitForDerivApiSettled()` is
 * called internally — never use `waitForTimeout` after these helpers.
 *
 * NOTE: `waitForLoadState('networkidle')` is intentionally NOT used here because
 * third-party scripts (Datadog, analytics) maintain persistent connections that
 * prevent 'networkidle' from ever being reached on staging-home.deriv.com.
 *
 * @example
 * ```typescript
 * import { enableFeatureFlags, disableFeatureFlags, getFeatureFlags } from '../utils';
 *
 * // Enable one flag
 * await enableFeatureFlags(page, 'my_new_feature');
 *
 * // Enable multiple flags
 * await enableFeatureFlags(page, ['flag_a', 'flag_b']);
 *
 * // Disable flags
 * await disableFeatureFlags(page, ['flag_a', 'flag_b']);
 *
 * // Read current state
 * const flags = await getFeatureFlags(page);
 * ```
 */

import { Page } from '@playwright/test';
import { NavigationUtils } from './navigationUtils';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** localStorage key used by the Deriv dashboard to store feature flags */
const FEATURE_FLAGS_KEY = '_dashboard:featureFlags';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shape of a single feature flag entry in localStorage
 */
export interface FeatureFlag {
    /** Feature flag name */
    name: string;
    /** Whether the flag is currently enabled */
    enabled: boolean;
}

/**
 * Shape of the full feature flags object stored in localStorage
 */
export interface FeatureFlagsData {
    /** Schema version */
    version: string;
    /** Array of feature flag entries */
    flags: FeatureFlag[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enables one or more feature flags in the browser's localStorage, then reloads
 * the page so the app picks up the new state.
 *
 * If a flag already exists it is updated in-place. If it does not exist it is
 * added. The page is always reloaded after the update.
 *
 * Uses `NavigationUtils.waitForDerivApiSettled()` after reload instead of
 * `waitForLoadState('networkidle')` — third-party scripts on staging prevent
 * networkidle from ever being reached.
 *
 * @param page - Playwright Page instance
 * @param flags - Flag name or array of flag names to enable
 * @returns Promise that resolves after the page has reloaded and Deriv API requests have settled
 *
 * @example
 * // Enable a single flag
 * await enableFeatureFlags(page, 'wallet_v2');
 *
 * @example
 * // Enable multiple flags at once
 * await enableFeatureFlags(page, ['wallet_v2', 'p2p_redesign', 'mt5_new_flow']);
 */
export async function enableFeatureFlags(page: Page, flags: string | string[]): Promise<void> {
    const flagList = normaliseFlags(flags);

    if (flagList.length === 0) {
        console.warn('⚠️ enableFeatureFlags: No valid flag names provided. Skipping.');
        return;
    }

    await setFeatureFlagsState(page, flagList, true);

    console.log(`✅ Feature flags enabled: ${flagList.join(', ')}`);

    await page.reload();
    // Use waitForDerivApiSettled instead of waitForLoadState('networkidle') because
    // third-party scripts (Datadog, analytics) maintain persistent connections that
    // prevent 'networkidle' from ever being reached on staging-home.deriv.com.
    await NavigationUtils.waitForDerivApiSettled(page);
}

/**
 * Disables one or more feature flags in the browser's localStorage, then reloads
 * the page so the app picks up the new state.
 *
 * If a flag already exists it is updated in-place. If it does not exist it is
 * added with `enabled: false`. The page is always reloaded after the update.
 *
 * Uses `NavigationUtils.waitForDerivApiSettled()` after reload instead of
 * `waitForLoadState('networkidle')` — third-party scripts on staging prevent
 * networkidle from ever being reached.
 *
 * @param page - Playwright Page instance
 * @param flags - Flag name or array of flag names to disable
 * @returns Promise that resolves after the page has reloaded and Deriv API requests have settled
 *
 * @example
 * // Disable a single flag
 * await disableFeatureFlags(page, 'wallet_v2');
 *
 * @example
 * // Disable multiple flags at once
 * await disableFeatureFlags(page, ['wallet_v2', 'p2p_redesign']);
 */
export async function disableFeatureFlags(page: Page, flags: string | string[]): Promise<void> {
    const flagList = normaliseFlags(flags);

    if (flagList.length === 0) {
        console.warn('⚠️ disableFeatureFlags: No valid flag names provided. Skipping.');
        return;
    }

    await setFeatureFlagsState(page, flagList, false);

    console.log(`✅ Feature flags disabled: ${flagList.join(', ')}`);

    await page.reload();
    // Use waitForDerivApiSettled instead of waitForLoadState('networkidle') because
    // third-party scripts (Datadog, analytics) maintain persistent connections that
    // prevent 'networkidle' from ever being reached on staging-home.deriv.com.
    await NavigationUtils.waitForDerivApiSettled(page);
}

/**
 * Reads the current feature flags from the browser's localStorage and returns
 * them as a typed array. Useful for assertions in tests.
 *
 * Returns an empty array if no flags have been set yet.
 *
 * @param page - Playwright Page instance
 * @returns Promise resolving to an array of FeatureFlag objects
 *
 * @example
 * const flags = await getFeatureFlags(page);
 * const walletFlag = flags.find(f => f.name === 'wallet_v2');
 * expect(walletFlag?.enabled, 'wallet_v2 flag should be enabled').toBe(true);
 */
export async function getFeatureFlags(page: Page): Promise<FeatureFlag[]> {
    const flags = await page.evaluate((key: string) => {
        const raw = localStorage.getItem(key);
        if (!raw) return [];

        // Wrap JSON.parse in try/catch so malformed localStorage data surfaces as a
        // meaningful test error rather than an opaque browser-context exception.
        const data: { version: string; flags: Array<{ name: string; enabled: boolean }> } = (() => {
            try {
                return JSON.parse(raw);
            } catch {
                throw new Error(`Feature flags data at '${key}' is not valid JSON — got: ${raw}`);
            }
        })();

        return Array.isArray(data.flags) ? data.flags : [];
    }, FEATURE_FLAGS_KEY);

    return flags;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shared implementation for enabling or disabling a list of feature flags in
 * localStorage. Extracted to avoid duplicating the page.evaluate body between
 * `enableFeatureFlags` and `disableFeatureFlags`.
 *
 * Wraps JSON.parse in a try/catch so malformed localStorage data surfaces as a
 * meaningful test error rather than an opaque browser-context exception.
 *
 * @param page - Playwright Page instance
 * @param flagList - Deduplicated, trimmed list of flag names to update
 * @param enabled - Target enabled state for all flags in the list
 */
async function setFeatureFlagsState(page: Page, flagList: string[], enabled: boolean): Promise<void> {
    await page.evaluate(
        ({ key, flagList, enabled }: { key: string; flagList: string[]; enabled: boolean }) => {
            const raw = localStorage.getItem(key);

            // Wrap JSON.parse in try/catch so malformed localStorage data surfaces as a
            // meaningful test error rather than an opaque browser-context exception.
            const data: { version: string; flags: Array<{ name: string; enabled: boolean }> } = (() => {
                try {
                    return raw ? JSON.parse(raw) : { version: '1.0.0', flags: [] };
                } catch {
                    throw new Error(`Feature flags data at '${key}' is not valid JSON — got: ${raw}`);
                }
            })();

            if (!Array.isArray(data.flags)) {
                throw new Error(`Feature flags data at '${key}' is malformed — expected a "flags" array.`);
            }

            flagList.forEach(name => {
                const existing = data.flags.find(f => f.name === name);
                if (existing) {
                    existing.enabled = enabled;
                } else {
                    data.flags.push({ name, enabled });
                }
            });

            localStorage.setItem(key, JSON.stringify(data, null, 2));
        },
        { key: FEATURE_FLAGS_KEY, flagList, enabled }
    );
}

/**
 * Normalises a flag input (string or string[]) into a deduplicated, trimmed
 * array of non-empty flag names.
 *
 * @param flags - Single flag name or array of flag names
 * @returns Cleaned array of flag names
 */
function normaliseFlags(flags: string | string[]): string[] {
    const raw = Array.isArray(flags) ? flags : [flags];
    return [...new Set(raw.map(f => f.trim()).filter(f => f.length > 0))];
}
