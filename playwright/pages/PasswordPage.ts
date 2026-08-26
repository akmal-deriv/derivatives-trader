import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the Deriv enter-password step (/dashboard/enter-password).
 *
 * Reached after submitting an email on the LoginPage. Handles password entry,
 * submission, and redirect back to dtrader.
 *
 * @example
 * ```typescript
 * test('VERIFY login', async ({ loginPage, passwordPage, tradePage }) => {
 *     await loginPage.gotoLoginPage();
 *     await loginPage.enterEmail(process.env.TEST_EMAIL!);
 *     await loginPage.clickLogInButton();
 *     await passwordPage.enterPassword(process.env.TEST_PASSWORD!);
 *     await passwordPage.clickLogInButton();
 *     await tradePage.verifySuccessfulLogin();
 * });
 * ```
 */
export class PasswordPage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    // ============================================
    // LOCATORS
    // ============================================

    /** "Enter password" heading — confirms the password page has loaded */
    get enterPasswordHeading(): Locator {
        return this.page.getByTestId('enter-password-heading');
    }

    /** Email label showing the account email address */
    get emailLabel(): Locator {
        return this.page.getByTestId('enter-password-text-email');
    }

    /** Password textbox container (the clickable field that reveals the native input) */
    get passwordTextbox(): Locator {
        return this.page.getByTestId('enter-password-input-password');
    }

    /**
     * Native <input> inside the password textbox.
     * Scoped to avoid ambiguity with the "Show password" toggle button.
     */
    get passwordInput(): Locator {
        return this.passwordTextbox.locator("input[type='password']");
    }

    /** Submit / Log in button on the password step */
    get logInButton(): Locator {
        return this.page.getByTestId('enter-password-btn-submit').getByRole('button').first();
    }

    /** "Forgot password?" button */
    get forgotPasswordButton(): Locator {
        return this.page.getByTestId('enter-password-btn-forgot-password');
    }

    /** "Try another verification method" button */
    get tryAnotherMethodButton(): Locator {
        return this.page.getByTestId('enter-password-btn-try-another-method').getByRole('button').first();
    }

    /** "Get a one-time code" option in the verification method modal */
    get getOtpButton(): Locator {
        return this.page.getByTestId('enter-password-method-get-otp');
    }

    /** "Go back" button in the auth top bar */
    get goBackButton(): Locator {
        return this.page.getByTestId('auth-btn-back');
    }

    /** Language switcher button in the auth top bar */
    get languageSwitcher(): Locator {
        return this.page.getByTestId('auth-language-btn');
    }

    /** Live chat button in the auth top bar */
    get liveChatButton(): Locator {
        return this.page.getByTestId('auth-btn-live-chat');
    }

    // ============================================
    // ACTIONS
    // ============================================

    /**
     * Fill the password field.
     * @param password - Password to type
     */
    async enterPassword(password: string): Promise<void> {
        await this.passwordTextbox.click();
        await this.passwordInput.fill(password);
    }

    /**
     * Click the Log in button and wait for redirect back to dtrader,
     * then wait for the WebSocket API to settle.
     */
    async clickLogInButton(): Promise<void> {
        await this.logInButton.click();
    }

    /**
     * Click "Try another verification method" to open the method selection modal.
     */
    async clickTryAnotherMethod(): Promise<void> {
        await this.tryAnotherMethodButton.click();
    }

    /**
     * Open the verification method modal, click "Get a one-time code",
     * and wait for navigation to /login-otp.
     */
    async clickGetOtp(): Promise<void> {
        await this.clickTryAnotherMethod();
        await expect(this.getOtpButton, '"Get a one-time code" option should be visible').toBeVisible();
        await this.getOtpButton.click();
        await expect(this.page, 'URL should navigate to /login-otp after selecting "Get a one-time code"').toHaveURL(
            /\/login-otp/
        );
    }

    // ============================================
    // VERIFICATIONS
    // ============================================

    /**
     * Verify the enter-password page has loaded with all expected elements visible.
     */
    async verifyEnterPasswordPageElements(): Promise<void> {
        await expect(
            this.enterPasswordHeading,
            'Password page heading "Enter Password" should be visible'
        ).toBeVisible();
        await expect(this.emailLabel, 'Email label showing the account email should be visible').toBeVisible();
        await expect(this.passwordInput, 'Password input should be visible').toBeVisible();
        await expect(this.logInButton, '"Log in" submit button should be visible').toBeVisible();
        await expect(this.forgotPasswordButton, '"Forgot password?" button should be visible').toBeVisible();
        await expect(
            this.tryAnotherMethodButton,
            '"Try another verification method" button should be visible'
        ).toBeVisible();
        await expect(this.goBackButton, '"Go back" button should be visible').toBeVisible();
        await expect(this.languageSwitcher, 'Language switcher button should be visible').toBeVisible();
        await expect(this.liveChatButton, 'Live chat button should be visible').toBeVisible();
    }
}
