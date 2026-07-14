import { Page, Locator, expect } from '@playwright/test';
import { NavigationUtils } from '../e2e-tests-core/utils';

/**
 * Base Page Object for the DTrader trade page (/).
 *
 * Contains only elements that are always present regardless of contract type:
 * the header (account info, balance, login button) and the trade container.
 * Contract-type-specific parameters live in subclass page objects.
 *
 * @example
 * ```typescript
 * test('VERIFY trade page loads', async ({ tradeBasePage }) => {
 *     await tradeBasePage.gotoTradePage();
 *     await tradeBasePage.verifySuccessfulLogin();
 * });
 * ```
 */
export class TradeBasePage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    // ============================================
    // HELPERS
    // ============================================

    protected get isMobile(): boolean {
        return (this.page.viewportSize()?.width ?? 1024) < 1024;
    }

    // ============================================
    // LOCATORS
    // ============================================

    /**
     * Account info area — AppV2 renders different elements per viewport.
     * - Mobile (< 1024px): `[data-testid="dt_acc_info"]`
     * - Desktop (≥ 1024px): `.account-header__content`
     */
    get accountInfo(): Locator {
        return this.isMobile ? this.page.getByTestId('dt_acc_info') : this.page.locator('.account-header__content');
    }

    /**
     * Balance display — AppV2 renders different elements per viewport.
     * - Mobile (< 1024px): `[data-testid="dt_balance"]`
     * - Desktop (≥ 1024px): `.account-header__balance`
     */
    get balance(): Locator {
        return this.isMobile ? this.page.getByTestId('dt_balance') : this.page.locator('.account-header__balance');
    }

    /**
     * Deposit button — visible when logged in on both viewports.
     * Label may be "Try real" for demo-only accounts.
     * Source: account-header.tsx aria-label='Deposit'
     */
    get depositButton(): Locator {
        return this.page.getByRole('button', { name: 'Deposit' });
    }

    /**
     * Login button — visible when logged out. AppV2 renders different elements per viewport.
     * - Mobile (< 1024px): `#dt_login_button_v2`
     * - Desktop (≥ 1024px): role-based button "Log in"
     */
    get loginButton(): Locator {
        return this.isMobile
            ? this.page.locator('#dt_login_button_v2')
            : this.page.getByRole('button', { name: 'Log in' });
    }

    /** Sidebar Home button — desktop only */
    get sidebarHomeButton(): Locator {
        return this.page.getByTestId('dt_sidebar_home');
    }

    /** Sidebar Positions button — desktop only */
    get sidebarPositionsButton(): Locator {
        return this.page.getByTestId('dt_sidebar_positions');
    }

    /** Sidebar Reports button — desktop only */
    get sidebarReportsButton(): Locator {
        return this.page.getByTestId('dt_sidebar_reports');
    }

    /** Sidebar Help button — desktop only */
    get sidebarHelpButton(): Locator {
        return this.page.getByTestId('dt_sidebar_help');
    }

    /** Sidebar Language button — desktop only */
    get sidebarLanguageButton(): Locator {
        return this.page.getByTestId('dt_sidebar_language');
    }

    /** Sidebar Theme button — desktop only */
    get sidebarThemeButton(): Locator {
        return this.page.getByTestId('dt_sidebar_theme');
    }

    /**
     * Sidebar Account button — desktop only, triggers account dropdown / logout.
     */
    get sidebarAccountButton(): Locator {
        return this.page.getByTestId('dt_sidebar_account');
    }

    /** Bottom nav Home tab — mobile only */
    get bottomNavHome(): Locator {
        return this.page.locator('.bottom-nav-container').getByText('Home');
    }

    /** Bottom nav Trade tab — mobile only */
    get bottomNavTrade(): Locator {
        return this.page.locator('.bottom-nav-container').getByText('Trade');
    }

    /** Bottom nav Positions tab — mobile only */
    get bottomNavPositions(): Locator {
        return this.page.locator('.bottom-nav-container').getByText('Positions');
    }

    /** Bottom nav Menu tab — mobile only */
    get bottomNavMenu(): Locator {
        return this.page.locator('.bottom-nav-container').getByText('Menu');
    }

    /**
     * "Open positions" link in the mobile Menu → Reports section.
     * Navigates to the open positions list (trade table).
     * Source: menu.tsx menu-page__item containing "Open positions"
     */
    get mobileMenuOpenPositions(): Locator {
        return this.page.getByText('Open positions', { exact: true });
    }

    /**
     * Log out control — rendered differently per viewport:
     *  - Desktop: a real `button` in the sidebar account dropdown (role=button, name "Log out").
     *  - Mobile: the logout row on the menu page — a `div.header__menu-logout` (NOT a button role,
     *    so `getByRole('button')` never matches). This class is unique to the logout row and owns
     *    the `handleLogout` click handler, so we target it directly rather than the generic
     *    `.header__menu-mobile-link` container (shared by every menu item) — this is also
     *    language-independent, unlike a text-based match.
     * The `.or()` chain resolves to exactly one element per viewport, avoiding strict-mode conflicts.
     */
    get logoutButton(): Locator {
        return this.page.getByRole('button', { name: 'Log out' }).or(this.page.locator('.header__menu-logout'));
    }

    /** Selected trade type chip — confirms the trade form is fully loaded */
    get selectedTradeTypeChip(): Locator {
        return this.page.locator('.quill-chip[data-state="selected"]').first();
    }

    // ============================================
    // ACTIONS
    // ============================================

    /**
     * Seed localStorage on the DTrader origin before the test starts.
     *
     * Navigates to BASE_URL, injects keys that suppress onboarding tours and popups,
     * then returns — the caller should proceed with `loginPage.login()`.
     *
     * Keys injected:
     *  - `guide_dtrader_v2` → marks all tour steps as seen
     *  - `guide_dtrader_v2_desktop` → marks desktop tour steps as seen
     *  - `guide_dtrader_v2_desktop_returning` → marks returning-user desktop tour steps as seen
     *  - `presets_onboarding_guide` → suppresses the presets onboarding popup
     *  - `trade_param_guide` → suppresses the trade parameter guide popup
     *  - `automation_onboarding_completed` → marks automation onboarding as completed
     *
     * @example
     * test.beforeEach(async ({ page, loginPage }) => {
     *   await TradeBasePage.seedLocalStorageOnOrigin(page);
     *   await loginPage.login();
     * });
     */
    static async seedLocalStorageOnOrigin(page: Page): Promise<void> {
        const baseUrl = process.env.BASE_URL;
        if (!baseUrl) {
            throw new Error(
                'BASE_URL environment variable is required. Add it to playwright/.env.staging (e.g. BASE_URL=https://staging-dtrader.deriv.com).'
            );
        }
        await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => {
            localStorage.setItem(
                'guide_dtrader_v2',
                JSON.stringify({
                    trade_types_selection: true,
                    trade_page: true,
                    positions_page: true,
                })
            );
            localStorage.setItem(
                'guide_dtrader_v2_desktop',
                JSON.stringify({
                    trade_page: true,
                    positions_page: true,
                })
            );
            localStorage.setItem(
                'guide_dtrader_v2_desktop_returning',
                JSON.stringify({
                    trade_page: true,
                    positions_page: true,
                })
            );
            localStorage.setItem('presets_onboarding_guide', 'true');
            localStorage.setItem('trade_param_guide', 'true');
            localStorage.setItem('automation_onboarding_completed', 'true');
        });
    }

    /**
     * Navigate to the dtrader root. Use only as the initial entry point.
     */
    async gotoTradePage(): Promise<void> {
        await this.page.goto('/');
        await this.page.waitForLoadState('domcontentloaded');
        await NavigationUtils.waitForDerivApiSettled(this.page);
        await expect(
            this.selectedTradeTypeChip,
            'Selected trade type chip should be visible — confirms trade form is fully loaded'
        ).toBeVisible();
    }

    /**
     * Navigate to the Reports page.
     * - Desktop: clicks the sidebar Reports button → opens the Reports flyout
     * - Mobile: taps bottom nav Menu → taps "Open positions" in the menu
     *
     * Waits for the Deriv API to settle after navigation.
     */
    async goToReports(): Promise<void> {
        if (this.isMobile) {
            await this.bottomNavMenu.click();
            await this.page.waitForURL('**/menu');
            await this.mobileMenuOpenPositions.click();
        } else {
            await this.sidebarReportsButton.click();
        }
        await NavigationUtils.waitForDerivApiSettled(this.page);
    }

    /**
     * Navigate to the Positions view.
     * - Desktop: clicks the sidebar Positions button → opens the flyout
     * - Mobile: clicks the bottom nav Positions tab → navigates to positions page
     *
     * Waits for Deriv API to settle after navigation.
     */
    async goToPositions(): Promise<void> {
        if (this.isMobile) {
            await this.bottomNavPositions.click();
        } else {
            await this.sidebarPositionsButton.click();
        }
        await NavigationUtils.waitForDerivApiSettled(this.page);
    }

    /**
     * Trigger logout for the current viewport.
     * - Desktop: clicks the sidebar account button then "Log out"
     * - Mobile: navigates to the menu page via the bottom nav then clicks "Log out"
     */
    async logout(): Promise<void> {
        if (this.isMobile) {
            await this.bottomNavMenu.click();
            await this.page.waitForURL('**/menu');
        } else {
            await expect(
                this.sidebarAccountButton,
                'Sidebar account button should be visible before logout'
            ).toBeVisible();
            await this.sidebarAccountButton.click();
        }
        await this.logoutButton.click();
    }

    /**
     * Returns the current balance as a numeric string, stripped of currency suffix.
     * Source: account-header__balance — text format "998.86 USD"
     *
     * @returns Balance value, e.g. "998.86"
     */
    async getBalance(): Promise<string> {
        const text = await this.balance.innerText();
        return text
            .replace(/,/g, '')
            .replace(/\s+[A-Z]+$/, '')
            .trim();
    }

    // ============================================
    // VERIFICATIONS
    // ============================================

    /**
     * Returns the current UTC date as "YYYY-MM-DD".
     * Use this to assert date-based values in the audit grid (e.g. start time).
     *
     * @returns UTC date string, e.g. "2026-06-18"
     */
    getCurrentDate(): string {
        return new Date().toISOString().slice(0, 10);
    }

    /**
     * Converts an ISO date string ("YYYY-MM-DD") to the "DD Mon YYYY" format used by
     * the mobile entry/exit details section (e.g. "2026-07-07" → "07 Jul 2026").
     *
     * @param iso - ISO date string, e.g. "2026-07-07"
     * @returns Formatted date string, e.g. "07 Jul 2026"
     */
    static formatISODate(iso: string): string {
        const [year, month, day] = iso.split('-');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${day} ${months[parseInt(month, 10) - 1]} ${year}`;
    }

    /**
     * Returns the current UTC date as "DD Mon YYYY" (e.g. "07 Jul 2026").
     * Use this for mobile entry/exit details date assertions where the UI renders
     * this format instead of the ISO "YYYY-MM-DD" used by the desktop audit grid.
     *
     * @returns Formatted date string, e.g. "07 Jul 2026"
     */
    getCurrentDateFormatted(): string {
        return TradeBasePage.formatISODate(this.getCurrentDate());
    }

    /**
     * Wait for the balance to decrease by the stake amount after a buy.
     * Polls the live balance element — needed because the WebSocket balance
     * update arrives asynchronously after the buy is confirmed.
     *
     * @param balanceBefore - Balance captured before clicking buy, e.g. "998.86"
     * @param stake         - Stake amount as a string, e.g. "10.50"
     */
    async verifyBalanceAfterContractPurchase(balanceBefore: string, stake: string): Promise<void> {
        const expectedBalance = (parseFloat(balanceBefore) - parseFloat(stake)).toFixed(2);
        await expect
            .poll(() => this.getBalance(), {
                message: `Balance should decrease by stake ${stake} after buy (${balanceBefore} → ${expectedBalance})`,
            })
            .toBe(expectedBalance);
    }

    /**
     * Wait for the balance to reflect the correct settlement after a contract closes.
     * Polls the live balance element until it matches the expected value — needed because
     * the WebSocket balance update arrives asynchronously after the contract settles.
     *
     * The balance before close = initialBalance - stake.
     * After close the account receives sellProceeds = stake + P&L back, so:
     *   expectedBalance = balanceBeforeClose + stake + P&L
     *
     * @param balanceBeforeClose - Balance captured immediately before clicking Close, e.g. "959.89"
     * @param stake              - Stake amount as a string, e.g. "10.50"
     * @param profitLossAmount   - P&L from the closed positions card, e.g. "+1.26 USD" or "-2.05 USD"
     */
    async verifyBalanceAfterContractClose(
        balanceBeforeClose: string,
        stake: string,
        profitLossAmount: string,
        currentBalance: string
    ): Promise<void> {
        const pnl = parseFloat(
            profitLossAmount
                .replace(/,/g, '')
                .replace(/[A-Za-z]+$/, '')
                .trim()
        );
        const expectedBalance = (parseFloat(balanceBeforeClose) + parseFloat(stake) + pnl).toFixed(2);
        expect(
            currentBalance,
            `Balance after close should be ${expectedBalance} (${balanceBeforeClose} + ${stake} + ${pnl})`
        ).toBe(expectedBalance);
    }

    /**
     * Verify the user is logged in — account info, balance, login button, and sidebar nav items.
     * Sidebar nav assertions are desktop-only (sidebar is not rendered on mobile).
     */
    async verifySuccessfulLogin(): Promise<void> {
        await expect(this.accountInfo, 'Account info should be visible after login').toBeVisible();
        await expect(this.balance, 'Balance should be visible after login').toBeVisible();
        await expect(this.depositButton, 'Deposit button should be visible after login').toBeVisible();
        await expect(this.loginButton, 'Login button should not be visible after login').not.toBeVisible();

        if (this.isMobile) {
            await expect(this.bottomNavHome, 'Bottom nav Home tab should be visible after login').toBeVisible();
            await expect(this.bottomNavTrade, 'Bottom nav Trade tab should be visible after login').toBeVisible();
            await expect(
                this.bottomNavPositions,
                'Bottom nav Positions tab should be visible after login'
            ).toBeVisible();
            await expect(this.bottomNavMenu, 'Bottom nav Menu tab should be visible after login').toBeVisible();
        } else {
            await expect(this.sidebarHomeButton, 'Sidebar Home button should be visible after login').toBeVisible();
            await expect(
                this.sidebarPositionsButton,
                'Sidebar Positions button should be visible after login'
            ).toBeVisible();
            await expect(
                this.sidebarReportsButton,
                'Sidebar Reports button should be visible after login'
            ).toBeVisible();
            await expect(this.sidebarHelpButton, 'Sidebar Help button should be visible after login').toBeVisible();
            await expect(
                this.sidebarLanguageButton,
                'Sidebar Language button should be visible after login'
            ).toBeVisible();
            await expect(this.sidebarThemeButton, 'Sidebar Theme button should be visible after login').toBeVisible();
            await expect(
                this.sidebarAccountButton,
                'Sidebar Account button should be visible after login'
            ).toBeVisible();
        }
    }

    /**
     * Verify the user is logged out — login button visible, account info absent.
     */
    async verifyLoggedOut(): Promise<void> {
        await expect(this.loginButton, 'Login button should reappear after logout').toBeVisible();
        await expect(this.accountInfo, 'Account info should not be visible after logout').not.toBeVisible();
    }
}
