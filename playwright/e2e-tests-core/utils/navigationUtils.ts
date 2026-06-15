import { Page, expect } from '@playwright/test';

/**
 * NavigationUtils - Reusable browser navigation helpers for Playwright tests.
 *
 * Use these utilities anywhere a page-level navigation action (back, forward,
 * URL assertion after navigation, etc.) is needed across multiple page objects
 * or test files.
 *
 * @example
 * ```typescript
 * import { NavigationUtils } from '../utils';
 *
 * // Inside a page object or test:
 * await NavigationUtils.goBackAndExpectUrl(page, /\/dashboard\/home\?more=open/);
 *
 * // Wait for all deriv.com API requests to settle:
 * await NavigationUtils.waitForDerivApiSettled(page);
 * ```
 */
/**
 * Represents a Playwright request or response object with the minimal shape
 * needed by `isTrackedRequest()` to determine whether the network event
 * should be tracked (i.e. is an XHR/Fetch to a `deriv.com` URL).
 *
 * - For **Request** objects: `url()` and `resourceType()` are available directly.
 * - For **Response** objects: `url()` is direct, but `resourceType` is on the
 *   underlying request — accessed via `request().resourceType()`.
 */
interface TrackedRequestLike {
    /** Returns the URL of the request or response */
    url: () => string;
    /** Present on Request objects — returns the resource type (xhr, fetch, image, etc.) */
    resourceType?: () => string;
    /** Present on Response objects — returns the underlying Request */
    request?: () => { resourceType: () => string };
}

export class NavigationUtils {
    /**
     * Navigate back using the browser back button and assert the resulting URL
     * matches the given pattern.
     *
     * @param page - The Playwright `Page` instance
     * @param urlPattern - A string or RegExp the URL must match after navigating back
     *
     * @example
     * await NavigationUtils.goBackAndExpectUrl(page, /\/dashboard\/home\?more=open/);
     */
    static async goBackAndExpectUrl(page: Page, urlPattern: string | RegExp): Promise<void> {
        await page.goBack();
        await page.waitForTimeout(1000); // Brief pause to allow the page to stabilise after navigating
        await expect(page, `Browser back should navigate to URL matching: ${urlPattern}`).toHaveURL(urlPattern);
    }

    /**
     * Wait for all in-flight XHR/Fetch requests to URLs containing `deriv.com` to settle.
     *
     * This is a **project-wide utility** designed to solve the race condition where
     * pages are interacted with before all API calls have completed — causing UI state
     * (e.g. account lists, balances, feature flags) to not be fully hydrated yet.
     *
     * **How it works:**
     * 1. Listens for all outgoing requests whose URL contains `deriv.com`
     * 2. Tracks each request/response pair in a pending counter
     * 3. Waits until the counter reaches 0 **and** stays at 0 for a configurable
     *    idle period (default: 5 seconds) — this ensures late-arriving cascading
     *    requests are also captured
     * 4. Times out after `maxWaitMs` (default: 20 seconds) to prevent hanging
     *
     * **When to use:**
     * - After `page.goto()` / `redirectionHelpers.redirectTo()` on any Deriv page
     * - After navigating between tabs (Real ↔ Demo) on the CFDs page
     * - Before interacting with dynamically loaded UI elements
     *
     * **Note:** This is automatically called by `redirectionHelpers.redirectTo()`,
     * so most tests do NOT need to call it manually. Use it directly only when
     * navigating via sidebar clicks, tab switches, or other non-`redirectTo` flows.
     *
     * @param page - The Playwright `Page` instance
     * @param options - Optional configuration
     * @param options.idleMs - Time in ms with no new deriv.com requests before considering settled (default: 5000)
     * @param options.maxWaitMs - Maximum time in ms to wait before giving up (default: 20000)
     * @param options.urlPattern - Custom URL pattern to match (default: /deriv\.com/)
     *
     * @example
     * ```typescript
     * // After a sidebar navigation:
     * await cfdsPage.navigateToCFDsPage();
     * await NavigationUtils.waitForDerivApiSettled(page);
     *
     * // With custom idle time (faster, for quick pages):
     * await NavigationUtils.waitForDerivApiSettled(page, { idleMs: 1000 });
     * ```
     */
    static async waitForDerivApiSettled(
        page: Page,
        options?: {
            idleMs?: number;
            maxWaitMs?: number;
            urlPattern?: RegExp;
        }
    ): Promise<void> {
        const idleMs = options?.idleMs ?? 5000;
        const maxWaitMs = options?.maxWaitMs ?? 20000;
        const urlPattern = options?.urlPattern ?? /deriv\.com/;

        let pendingCount = 0;

        /**
         * Check if a request/response is an XHR/Fetch call matching our URL pattern.
         * Excludes WebSocket upgrades and other non-XHR resource types (e.g. images,
         * scripts, stylesheets) to avoid false positives that would inflate pendingCount
         * and cause unnecessary timeouts.
         */
        const isTrackedRequest = (reqOrRes: TrackedRequestLike): boolean => {
            const url = reqOrRes.url();
            if (!urlPattern.test(url)) return false;

            // For responses, get the resource type from the underlying request
            const resourceType = reqOrRes.resourceType
                ? reqOrRes.resourceType()
                : (reqOrRes.request?.().resourceType() ?? '');

            // Only track XHR and Fetch requests — ignore WebSocket, images, scripts, etc.
            return resourceType === 'xhr' || resourceType === 'fetch';
        };

        // Track outgoing XHR/Fetch requests matching the URL pattern
        const onRequest = (request: { url: () => string; resourceType: () => string }): void => {
            if (isTrackedRequest(request)) {
                pendingCount++;
            }
        };

        // Track completed responses (only for XHR/Fetch)
        const onResponse = (response: { url: () => string; request: () => { resourceType: () => string } }): void => {
            if (isTrackedRequest(response)) {
                pendingCount = Math.max(0, pendingCount - 1);
            }
        };

        // Track failed requests (only for XHR/Fetch, also decrement pending)
        const onRequestFailed = (request: { url: () => string; resourceType: () => string }): void => {
            if (isTrackedRequest(request)) {
                pendingCount = Math.max(0, pendingCount - 1);
            }
        };

        page.on('request', onRequest);
        page.on('response', onResponse);
        page.on('requestfailed', onRequestFailed);

        try {
            await new Promise<void>(resolve => {
                let idleTimer: NodeJS.Timeout | null = null;
                let resolved = false;

                // Safety timeout — always resolve after maxWaitMs
                const maxTimer = setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        if (idleTimer) clearTimeout(idleTimer);
                        resolve();
                    }
                }, maxWaitMs);

                // Poll: reset idle timer whenever there are pending requests
                const checkIdle = (): void => {
                    if (resolved) return;

                    if (pendingCount === 0) {
                        // No pending requests — start idle countdown
                        if (!idleTimer) {
                            idleTimer = setTimeout(() => {
                                if (!resolved && pendingCount === 0) {
                                    resolved = true;
                                    clearTimeout(maxTimer);
                                    resolve();
                                } else {
                                    // New requests came in during idle — reset
                                    idleTimer = null;
                                    checkIdle();
                                }
                            }, idleMs);
                        }
                    } else {
                        // Requests still pending — cancel any idle timer
                        if (idleTimer) {
                            clearTimeout(idleTimer);
                            idleTimer = null;
                        }
                        // Re-check after a short interval
                        setTimeout(checkIdle, 200);
                    }
                };

                // Start checking after a brief initial delay to allow requests to begin
                setTimeout(checkIdle, 300);
            });
        } finally {
            // Always clean up listeners
            page.off('request', onRequest);
            page.off('response', onResponse);
            page.off('requestfailed', onRequestFailed);
        }
    }
}
