import { Locator, expect } from '@playwright/test';
import { NavigationUtils } from '../e2e-tests-core/utils';
import { TradeBasePage } from './TradeBasePage';

/**
 * Page Object for the Positions view.
 *
 * On desktop, positions open as a flyout drawer (`dc-flyout`) alongside the trade form.
 * On mobile, positions are a dedicated bottom-nav page.
 *
 * @example
 * ```typescript
 * test('VERIFY open position appears after buy', async ({ positionsPage }) => {
 *     await positionsPage.goToPositions();
 *     await positionsPage.verifyOpenPositionsVisible();
 * });
 * ```
 */
export class PositionsPage extends TradeBasePage {
    // ============================================
    // LOCATORS
    // ============================================

    /**
     * Desktop positions flyout drawer.
     * Source: positions-drawer.jsx role="dialog" class="dc-flyout dc-flyout--open"
     */
    get positionsFlyout(): Locator {
        return this.page.locator('.dc-flyout.dc-flyout--open');
    }

    /**
     * Positions flyout/page title — "Positions".
     * Desktop: #flyout-title inside dc-flyout__header
     */
    get positionsTitle(): Locator {
        return this.page.locator('#flyout-title');
    }

    /**
     * "Open" tab in the positions tab list — desktop and mobile.
     * Source: .positions-drawer-tabs__tab-bar > button role="tab" with text "Open"
     */
    get positionsOpenTab(): Locator {
        return this.page.getByRole('tab', { name: 'Open' });
    }

    /**
     * "Closed" tab in the positions tab list — desktop and mobile.
     * Source: .positions-drawer-tabs__tab-bar > button role="tab" with text "Closed"
     */
    get positionsClosedTab(): Locator {
        return this.page.getByRole('tab', { name: 'Closed' });
    }

    /**
     * First contract card in the positions list — both desktop and mobile.
     * Source: a.contract-card[data-testid="dt_contract_card"]
     */
    get firstContractCard(): Locator {
        return this.page.getByTestId('dt_contract_card').first();
    }

    /**
     * Position count badge on the sidebar Positions button — desktop only.
     * Source: sidebar__item-badge span inside dt_sidebar_positions button.
     * Shows the number of open positions (e.g. "1").
     */
    get sidebarPositionsBadge(): Locator {
        return this.sidebarPositionsButton.locator('.sidebar__item-badge');
    }

    /**
     * Position count badge on the bottom nav Positions tab — mobile only.
     * Source: badge__position-top-sm <p> inside .bottom-nav-item--positions.
     * Shows the number of open positions (e.g. "1").
     */
    get bottomNavPositionsBadge(): Locator {
        return this.page.locator('.bottom-nav-item--positions .bottom-nav-item__position-badge p');
    }

    /**
     * Symbol name on the first contract card.
     * Source: contract-card__details > p.symbol
     */
    get contractCardMarket(): Locator {
        return this.firstContractCard.locator('.symbol');
    }

    /**
     * Contract type label on the first contract card (e.g. "Rise", "Fall").
     * Source: contract-card__details > p.trade-type
     */
    get contractCardType(): Locator {
        return this.firstContractCard.locator('.trade-type');
    }

    /**
     * Remaining time display on the contract card.
     * Source: .timer.tag > dc-remaining-time
     * Text format: "00:04:50" — live value, assert non-empty only.
     */
    get contractCardRemainingTime(): Locator {
        return this.firstContractCard.locator('.dc-remaining-time');
    }

    /**
     * Stake value on the contract card (e.g. "10.00 USD" — combined with currency).
     * Source: .contract-card__details-col > .contract-card__details > p > [data-testid="dt_span"]
     * Scoped to the details column (not the bottom profit row) to avoid matching the profit span.
     */
    get contractCardStake(): Locator {
        return this.firstContractCard.locator('.contract-card__details-col').getByTestId('dt_span');
    }

    /**
     * Profit/loss paragraph on the contract card (e.g. "-2.05 USD" or "+3.01 USD").
     * The sign is a raw text node; the amount lives in a nested dt_span.
     * Source: p.profit (full paragraph — contains sign + dt_span)
     * Live tick value — assert non-empty only.
     */
    get contractCardProfit(): Locator {
        return this.firstContractCard.locator('p.profit');
    }

    /**
     * Close/sell button on the first contract card — desktop only.
     * Source: .contract-card__sell-btn (labelled "Close")
     */
    get contractCardCloseButton(): Locator {
        return this.firstContractCard.locator('.contract-card__sell-btn');
    }

    /**
     * Close button revealed after swiping the first contract card left — mobile only.
     * Source: .contract-card-wrapper .buttons > button (labelled "Close")
     * The card must have class "show-buttons" before this button is interactable.
     */
    get mobileContractCardCloseButton(): Locator {
        return this.page.locator('.contract-card-wrapper').first().locator('.buttons button');
    }

    /**
     * Empty state message shown when there are no open positions.
     * Desktop: .portfolio-empty__text inside the flyout
     * Mobile: "No open positions" paragraph inside the Open tabpanel
     */
    get noOpenPositionsText(): Locator {
        return this.isMobile
            ? this.page.getByRole('tabpanel', { name: 'Open' }).getByText('No open positions')
            : this.page.locator('.portfolio-empty__text');
    }

    /**
     * "Closed" status tag on the first contract card in the Closed tab.
     * Desktop only — Source: .status.tag > p.custom (text "Closed")
     */
    get closedContractStatusTag(): Locator {
        return this.firstContractCard.locator('.status.tag p.custom');
    }

    /**
     * Risk management badge label on the first open contract card.
     * Shows "TP", "SL", "DC", or a combined pill when multiple are set.
     * Source: .risk-management.tag p.custom inside .tag__wrapper
     */
    get contractCardRiskTag(): Locator {
        return this.firstContractCard.locator('.risk-management.tag p.custom');
    }

    /**
     * First closed contract link card — mobile Closed tab only.
     * The Closed tab on mobile renders <a> link cards (not dt_contract_card).
     * Source: tabpanel[name="Closed"] > a (first link)
     */
    get firstMobileClosedCard(): Locator {
        return this.page.getByRole('tabpanel', { name: 'Closed' }).getByRole('link').first();
    }

    /**
     * "Closed" status paragraph inside the first mobile closed card.
     * Source: paragraph with text "Closed" inside the link card
     */
    get mobileClosedCardStatusText(): Locator {
        return this.firstMobileClosedCard.getByText('Closed', { exact: true });
    }

    /**
     * Profit/loss paragraph (last paragraph) inside the first mobile closed card.
     * e.g. "-0.75 USD" or "+1.35 USD"
     */
    get mobileClosedCardProfit(): Locator {
        return this.firstMobileClosedCard.locator('p').last();
    }

    /**
     * Footer open position count — desktop only.
     * Source: positions-drawer-footer.jsx class="positions-drawer-footer--count"
     * Text pattern: "N open position(s)"
     */
    get footerPositionCount(): Locator {
        return this.page.locator('.positions-drawer-footer--count');
    }

    /**
     * Footer Total P/L label — desktop only.
     * Source: positions-drawer-footer.jsx class="positions-drawer-footer--total"
     * Live value — assert presence only.
     */
    get footerTotalPL(): Locator {
        return this.page.locator('.positions-drawer-footer--total');
    }

    /**
     * Mobile-only total profit/loss summary above the positions list.
     * Source: TotalProfitLoss component — data-testid="dt_total_profit_loss"
     */
    get mobileTotalProfitLoss(): Locator {
        return this.page.getByTestId('dt_total_profit_loss');
    }

    // ============================================
    // ACTIONS
    // ============================================

    /**
     * Close the first open contract.
     *
     * - Desktop: clicks the inline "Close" button on the contract card, retrying on PriceMoved
     *   (transient sell rejection where the API rejects and re-enables the button).
     * - Mobile: there is no inline close button — callers must open the contract details
     *   and call `contractDetailsPage.closeContractDetails()` from there. This method is a
     *   no-op on mobile; use `openFirstContract()` + `ContractDetailsPage.closeContractDetails()`.
     */
    async closeFirstContract(): Promise<void> {
        if (this.isMobile) {
            // The Close button is always in the DOM (hidden via CSS until swipe reveals it).
            // Use force:true to click it directly without needing the swipe gesture.
            await expect(this.mobileContractCardCloseButton, 'Mobile close button should be attached').toBeAttached();
            await this.mobileContractCardCloseButton.click({ force: true });
            await this.pollUntilContractClosed(this.mobileContractCardCloseButton);
        } else {
            await expect(
                this.contractCardCloseButton,
                'Close button should be visible on the contract card'
            ).toBeVisible();
            await expect(this.contractCardCloseButton, 'Close button should be enabled before closing').toBeEnabled();
            await this.contractCardCloseButton.click();
            await this.pollUntilContractClosed(this.contractCardCloseButton);
            await expect(
                this.footerPositionCount,
                'Footer position count should show "0 open positions" after closing all positions'
            ).toHaveText('0 open positions');
        }
    }

    /**
     * Click the "Closed" tab to switch to the closed positions list.
     */
    async clickClosedTab(): Promise<void> {
        await this.positionsClosedTab.click();
    }

    /**
     * Open the first contract in the Positions list by clicking its card.
     * Waits for the contract card to be visible before clicking.
     */
    async openFirstContract(): Promise<void> {
        await expect(
            this.firstContractCard,
            'At least one open contract card should be visible in Positions'
        ).toBeVisible();
        await this.firstContractCard.click();
        await this.page.waitForURL(/\/contract\//);
        await NavigationUtils.waitForDerivApiSettled(this.page);
    }

    private async pollUntilContractClosed(closeButton: import('@playwright/test').Locator): Promise<void> {
        // The Open tab stays active after close — the card disappears and the empty state appears.
        // We poll for the empty state with a short inner timeout to allow MobX re-render to settle.
        // Retry the close on each interval; click errors (button gone or disabled) are swallowed.
        await expect
            .poll(
                async () => {
                    // Use a short inner timeout — the global expect timeout is 45s, which would
                    // block each poll interval for 45s on every miss before retrying the close.
                    try {
                        await expect(this.noOpenPositionsText).toBeVisible({ timeout: 5000 });
                        return true;
                    } catch {
                        // not visible yet — retry close only if button is still attached
                    }
                    try {
                        if (this.isMobile) {
                            await closeButton.click({ force: true });
                        } else {
                            await closeButton.click();
                        }
                    } catch {
                        // button gone or disabled — ignore
                    }
                    return false;
                },
                {
                    message: 'Open positions empty state should appear after closing the contract',
                    intervals: [1000],
                    timeout: 60_000,
                }
            )
            .toBe(true);
    }

    // ============================================
    // VERIFICATIONS
    // ============================================

    /**
     * Verify the first contract card shows the expected trade details.
     *
     * On desktop: also asserts the inline Close button and footer summary.
     * On mobile: there is no inline Close button; contracts are closed from the contract details page.
     *
     * @param market    - Market symbol, e.g. "Volatility 100 (1s) Index"
     * @param tradeType - Contract type, e.g. "Rise" or "Fall"
     * @param currency  - Currency code, e.g. "USD" — stake is displayed as "10.00 USD" (combined)
     * @param stake     - Stake amount as displayed, e.g. "10.00"
     * @param payout    - Not shown on the new card layout; kept for call-site compatibility.
     * Profit/loss is a live tick-by-tick value — only its presence is asserted, not its value.
     */
    async verifyContractCardDetails(
        market: string,
        tradeType: string,
        currency: string,
        stake: string,
        _payout: string | null
    ): Promise<void> {
        // Market symbol and contract type
        await expect(this.contractCardMarket, `Contract card symbol should be "${market}"`).toHaveText(market);
        await expect(this.contractCardType, `Contract card type should be "${tradeType}"`).toHaveText(tradeType);

        // Stake — displayed as "10.00 USD" (stake + currency combined in one element)
        await expect(this.contractCardStake, `Stake should contain "${stake} ${currency}"`).toHaveText(
            `${stake} ${currency}`
        );

        // Remaining time — Multipliers contracts have no expiry, so no remaining time is shown
        const isMultipliers = tradeType.startsWith('Multipliers');
        if (!isMultipliers) {
            await expect(this.contractCardRemainingTime, 'Remaining time should have a value').not.toBeEmpty();
        }

        // Profit/loss — live tick value (sign is a text node outside dt_span), assert presence only
        await expect(this.contractCardProfit, 'Profit/loss should have a value').not.toBeEmpty();

        if (this.isMobile) {
            // Mobile has no inline close button — contract is closed from the contract details page
            await expect(
                this.mobileTotalProfitLoss,
                'Mobile total profit/loss summary should be visible'
            ).toBeVisible();
        } else {
            // Desktop: assert inline close button and drawer footer
            await expect(
                this.contractCardCloseButton,
                'Close button should be visible on the contract card'
            ).toBeVisible();
            await this.verifyPositionsFooter();
        }
    }

    /**
     * Verify the open contract card for a Multipliers position, including the risk management badge.
     * Delegates common field checks to `verifyContractCardDetails`, then additionally asserts
     * the TP / SL / DC badge label visible on the card.
     *
     * Badge text rules (mirrors the app's label logic):
     * - TP only  → "TP"
     * - SL only  → "SL"
     * - DC only  → "DC"
     * - TP + SL  → "TP/SL"
     *
     * @param market         - Market symbol, e.g. "Volatility 25 (1s) Index"
     * @param tradeType      - "Multipliers Up" or "Multipliers Down"
     * @param currency       - Currency code, e.g. "USD"
     * @param stake          - Stake amount as displayed, e.g. "10.00"
     * @param riskManagement - Optional risk management config set before purchase
     */
    async verifyMultipliersContractCardDetails(
        market: string,
        tradeType: string,
        currency: string,
        stake: string,
        riskManagement?: {
            takeProfit?: string;
            stopLoss?: string;
            dealCancellation?: string;
        }
    ): Promise<void> {
        await this.verifyContractCardDetails(market, tradeType, currency, stake, null);

        if (riskManagement) {
            const { takeProfit, stopLoss, dealCancellation } = riskManagement;
            let expectedTag: string;
            if (dealCancellation) {
                expectedTag = 'DC';
            } else if (takeProfit && stopLoss) {
                expectedTag = 'TP/SL';
            } else if (takeProfit) {
                expectedTag = 'TP';
            } else if (stopLoss) {
                expectedTag = 'SL';
            } else {
                return;
            }
            await expect(this.contractCardRiskTag, `Risk management badge should show "${expectedTag}"`).toHaveText(
                expectedTag
            );
        }
    }

    /**
     * Verify the positions flyout footer — desktop only.
     * Derives the expected count from the number of contract cards in the DOM.
     * Asserts the open position count label and that Total P/L has a value.
     */
    async verifyPositionsFooter(): Promise<void> {
        const count = await this.page.getByTestId('dt_contract_card').count();
        const label = count === 1 ? '1 open position' : `${count} open positions`;
        await expect(this.footerPositionCount, `Footer should show "${label}"`).toHaveText(label);
        await expect(this.footerTotalPL.locator('span').first(), 'Footer should show "Total P/L:" label').toHaveText(
            'Total P/L:'
        );
        await expect(
            this.footerTotalPL.getByTestId('dt_span'),
            'Footer Total P/L value should be non-empty'
        ).not.toBeEmpty();
    }

    /**
     * Verify the Closed tab is selected and the first closed contract card is correct.
     * Desktop also asserts the drawer footer (count + Total P/L).
     * Mobile asserts the total profit/loss summary above the list instead.
     *
     * @param market    - Market symbol, e.g. "Volatility 100 (1s) Index"
     * @param tradeType - Contract type, e.g. "Rise" or "Fall"
     * @param currency  - Currency code, e.g. "USD"
     * @param stake     - Stake amount as displayed, e.g. "10.00"
     * @returns The profit/loss text as displayed on the closed card, e.g. "-2.05 USD"
     */
    async verifyClosedPositionsTab(
        market: string,
        tradeType: string,
        currency: string,
        stake: string
    ): Promise<string> {
        await expect(this.positionsClosedTab, 'Closed tab should be selected after switching').toHaveAttribute(
            'aria-selected',
            'true'
        );

        if (this.isMobile) {
            // Mobile Closed tab renders <a> link cards — no dt_contract_card testid
            await expect(
                this.firstMobileClosedCard,
                'At least one closed contract card should be visible'
            ).toBeVisible();
            await expect(this.firstMobileClosedCard, `Closed card should show market "${market}"`).toContainText(
                market
            );
            await expect(this.firstMobileClosedCard, `Closed card should show trade type "${tradeType}"`).toContainText(
                tradeType
            );
            await expect(
                this.firstMobileClosedCard,
                `Closed card should show stake "${stake} ${currency}"`
            ).toContainText(`${stake} ${currency}`);
            await expect(this.mobileClosedCardStatusText, 'Closed card should show "Closed" status').toBeVisible();
            await expect(this.mobileClosedCardProfit, 'Closed card profit/loss should have a value').not.toBeEmpty();
            const profitLoss = (await this.mobileClosedCardProfit.innerText()).trim();
            return profitLoss;
        }

        // Desktop — dt_contract_card structure
        await expect(this.firstContractCard, 'At least one closed contract card should be visible').toBeVisible();
        await expect(this.contractCardMarket, `Closed card market should be "${market}"`).toHaveText(market);
        await expect(this.contractCardType, `Closed card type should be "${tradeType}"`).toHaveText(tradeType);
        await expect(this.contractCardStake, `Closed card stake should be "${stake} ${currency}"`).toHaveText(
            `${stake} ${currency}`
        );
        await expect(this.closedContractStatusTag, 'Closed card should show "Closed" status tag').toHaveText('Closed');
        await expect(this.contractCardProfit, 'Closed card profit/loss should have a value').not.toBeEmpty();
        const profitLoss = (await this.contractCardProfit.innerText()).trim();

        const count = await this.page.getByTestId('dt_contract_card').count();
        const label = count === 1 ? '1 closed position' : `${count} closed positions`;
        await expect(this.footerPositionCount, `Footer should show "${label}"`).toHaveText(label);
        await expect(this.footerTotalPL.locator('span').first(), 'Footer should show "Total P/L:" label').toHaveText(
            'Total P/L:'
        );
        await expect(
            this.footerTotalPL.getByTestId('dt_span'),
            'Footer Total P/L value should be non-empty'
        ).not.toBeEmpty();

        return profitLoss;
    }

    /**
     * Verify the positions flyout/page is open and shows at least one open position.
     */
    async verifyOpenPositionsVisible(): Promise<void> {
        if (this.isMobile) {
            await expect(
                this.bottomNavPositionsBadge,
                'Bottom nav Positions badge should show 1 open position'
            ).toHaveText('1');
            await this.bottomNavPositions.click();
        } else {
            await expect(this.positionsFlyout, 'Positions flyout should be open').toBeVisible();
            await expect(this.positionsTitle, 'Positions flyout header should read "Positions"').toHaveText(
                'Positions'
            );
            await expect(this.sidebarPositionsBadge, 'Sidebar Positions badge should show 1 open position').toHaveText(
                '1'
            );
        }
        await expect(this.positionsOpenTab, 'Open tab should be visible').toBeVisible();
        await expect(this.positionsOpenTab, 'Open tab should be selected by default').toHaveAttribute(
            'aria-selected',
            'true'
        );
        await expect(this.positionsClosedTab, 'Closed tab should be visible').toBeVisible();
        await expect(
            this.firstContractCard,
            'At least one open contract card should be visible in Positions'
        ).toBeVisible();
    }
}
