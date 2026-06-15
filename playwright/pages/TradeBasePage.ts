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

    get tradeContainer(): Locator {
        return this.page.getByTestId('dt_trade_container');
    }

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
        return this.page.locator('.bottom-nav-container').getByRole('paragraph', { name: 'Home' });
    }

    /** Bottom nav Trade tab — mobile only */
    get bottomNavTrade(): Locator {
        return this.page.locator('.bottom-nav-container').getByRole('paragraph', { name: 'Trade' });
    }

    /** Bottom nav Positions tab — mobile only */
    get bottomNavPositions(): Locator {
        return this.page.locator('.bottom-nav-container').getByRole('paragraph', { name: 'Positions' });
    }

    /** Bottom nav Menu tab — mobile only */
    get bottomNavMenu(): Locator {
        return this.page.locator('.bottom-nav-container').getByRole('paragraph', { name: 'Menu' });
    }

    /**
     * Bottom nav Menu button — mobile only, navigates to /menu.
     * @deprecated Use bottomNavMenu instead
     */
    get mobileMenuButton(): Locator {
        return this.bottomNavMenu;
    }

    /**
     * Log out button — visible in sidebar dropdown (desktop) or menu page (mobile).
     */
    get logoutButton(): Locator {
        return this.page.getByRole('button', { name: 'Log out' });
    }

    /** Logout success modal title. */
    get logoutSuccessTitle(): Locator {
        return this.page.getByText('Log out successful');
    }

    /** Logout success modal body text. */
    get logoutSuccessMessage(): Locator {
        return this.page.getByText('To sign out everywhere');
    }

    /** "Got it" dismiss button on the logout success modal. */
    get logoutSuccessDismissButton(): Locator {
        return this.page.getByRole('button', { name: 'Got it' });
    }

    // ============================================
    // ACTIONS
    // ============================================

    /** Selected trade type chip — confirms the trade form is fully loaded */
    get selectedTradeTypeChip(): Locator {
        return this.page.locator('.quill-chip[data-state="selected"]').first();
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

    // ============================================
    // VERIFICATIONS
    // ============================================

    /**
     * Verify the user is logged in — account info, balance, login button, and sidebar nav items.
     * Sidebar nav assertions are desktop-only (sidebar is not rendered on mobile).
     */
    async verifySuccessfulLogin(): Promise<void> {
        await expect(this.accountInfo, 'Account info should be visible after login').toBeVisible();
        await expect(this.balance, 'Balance should be visible after login').toBeVisible();
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
