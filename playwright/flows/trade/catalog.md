# 🗺️ Trade Journey Catalog — Technical Reference

> Source of truth: `packages/trader/src/AppV2/Containers/Trade/` · `packages/trader/src/AppV2/Components/TradeParameters/` · `packages/trader/src/AppV2/Components/PurchaseButton/`
> Last updated: 2026-06-24

---

## Section 1 — Journey Index

| Journey ID | Spec File                                            | Tags                                      |
| ---------- | ---------------------------------------------------- | ----------------------------------------- |
| Flow 1     | `trade/verify-trade-form-loads.spec.ts`              | `@trade @smoke @desktop @mobile`          |
| Flow 2.1   | `trade/verify-rise-fall.spec.ts`                     | `@trade @smoke @desktop @mobile @staging` |
| Flow 2.2   | `trade/verify-rise-fall.spec.ts`                     | `@trade @smoke @desktop @mobile @staging` |
| Flow 3.1   | `trade/verify-rise-fall-allow-equals.spec.ts`        | `@trade @desktop @mobile @staging`        |
| Flow 3.2   | `trade/verify-rise-fall-allow-equals.spec.ts`        | `@trade @desktop @mobile @staging`        |
| Flow 4.1   | `trade/verify-higher-lower.spec.ts`                  | `@trade @smoke @desktop @mobile @staging` |
| Flow 4.2   | `trade/verify-higher-lower.spec.ts`                  | `@trade @smoke @desktop @mobile @staging` |
| Flow 5.1   | `trade/verify-touch-no-touch.spec.ts`                | `@trade @desktop @mobile @staging`        |
| Flow 5.2   | `trade/verify-touch-no-touch.spec.ts`                | `@trade @desktop @mobile @staging`        |
| Flow 6.1   | `trade/verify-matches-differs.spec.ts`               | `@trade @smoke @desktop @mobile @staging` |
| Flow 6.2   | `trade/verify-matches-differs.spec.ts`               | `@trade @smoke @desktop @mobile @staging` |
| Flow 7.1   | `trade/verify-over-under.spec.ts`                    | `@trade @desktop @mobile @staging`        |
| Flow 7.2   | `trade/verify-over-under.spec.ts`                    | `@trade @desktop @mobile @staging`        |
| Flow 8.1   | `trade/verify-even-odd.spec.ts`                      | `@trade @desktop @mobile @staging`        |
| Flow 8.2   | `trade/verify-even-odd.spec.ts`                      | `@trade @desktop @mobile @staging`        |
| Flow 9.1   | `trade/verify-accumulators.spec.ts`                  | `@trade @smoke @desktop @mobile @staging` |
| Flow 9.2   | `trade/verify-accumulators.spec.ts`                  | `@trade @smoke @desktop @mobile @staging` |
| Flow 10.1  | `trade/verify-multipliers-no-tpsl.spec.ts`           | `@trade @smoke @desktop @mobile @staging` |
| Flow 10.2  | `trade/verify-multipliers-no-tpsl.spec.ts`           | `@trade @smoke @desktop @mobile @staging` |
| Flow 11.1  | `trade/verify-multipliers-with-tp.spec.ts`           | `@trade @smoke @desktop @mobile @staging` |
| Flow 11.2  | `trade/verify-multipliers-with-tp.spec.ts`           | `@trade @smoke @desktop @mobile @staging` |
| Flow 12.1  | `trade/verify-multipliers-with-sl.spec.ts`           | `@trade @desktop @mobile @staging`        |
| Flow 12.2  | `trade/verify-multipliers-with-sl.spec.ts`           | `@trade @desktop @mobile @staging`        |
| Flow 13.1  | `trade/verify-multipliers-deal-cancellation.spec.ts` | `@trade @desktop @mobile @staging`        |
| Flow 13.2  | `trade/verify-multipliers-deal-cancellation.spec.ts` | `@trade @desktop @mobile @staging`        |
| Flow 14.1  | `trade/verify-turbos.spec.ts`                        | `@trade @desktop @mobile @staging`        |
| Flow 14.2  | `trade/verify-turbos.spec.ts`                        | `@trade @desktop @mobile @staging`        |
| Flow 14.3  | `trade/verify-turbos.spec.ts`                        | `@trade @desktop @mobile @staging`        |
| Flow 14.4  | `trade/verify-turbos.spec.ts`                        | `@trade @desktop @mobile @staging`        |
| Flow 15.1  | `trade/verify-vanillas.spec.ts`                      | `@trade @desktop @mobile @staging`        |
| Flow 15.2  | `trade/verify-vanillas.spec.ts`                      | `@trade @desktop @mobile @staging`        |
| Flow 16    | `trade/verify-closed-market.spec.ts`                 | `@trade @desktop @mobile`                 |
| G1         | `trade/verify-insufficient-balance.spec.ts`          | `@trade @staging`                         |
| G2         | `trade/verify-unauthenticated-purchase.spec.ts`      | `@trade @staging`                         |

---

## Section 2 — Flow Details

### Flow 1 — Trade form loads with default state visible

```typescript
test.describe('Trade — Form Loads', { tag: ['@trade', '@smoke', '@desktop', '@mobile'] }, () => {
    test.beforeEach(async ({ loginPage }) => {
        await loginPage.login();
    });

    test('VERIFY trade form loads with default state visible', async ({ tradePage, page }, testInfo) => {
        await tradePage.goto();
        await NavigationUtils.waitForDerivApiSettled(page);
        await expect(page.getByTestId('dt_acc_info'), 'Account info should be visible').toBeVisible();
        await expect(tradePage.marketSelector, 'Market selector should be visible').toBeVisible();
        await expect(tradePage.purchaseButton, 'Purchase button should be visible').toBeVisible();
        if (testInfo.project.name.includes('mobile')) {
            await expect(
                page.getByTestId('trade-params-container'),
                'Bottom sheet should be visible on mobile'
            ).toBeVisible();
            await expect(
                page.getByTestId('trade-params-handle'),
                'Drag handle should be visible on mobile'
            ).toBeVisible();
        }
    });
});
```

---

### Flow 2.1 — Rise/Fall: buy Rise → close contract

### Flow 2.2 — Rise/Fall: buy Fall → close contract

```typescript
test.describe('Trade — Rise/Fall', { tag: ['@trade', '@smoke', '@desktop', '@mobile'] }, () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, loginPage }) => {
        await TradeBasePage.seedLocalStorageOnOrigin(page);
        await loginPage.login(process.env.TEST_EMAIL_RISE_FALL);
    });

    test('VERIFY Buy "Rise" Contract and Close', async ({ tradeRiseFallPage }) => {
        await tradeRiseFallPage.buyRiseAndVerify({
            market: 'Volatility 100 Index',
            durationUnit: 'Minutes',
            durationValue: '15 min',
            stake: '10.50',
            currency: 'USD',
        });
    });

    test('VERIFY Buy "Fall" Contract and Close', async ({ tradeRiseFallPage }) => {
        await tradeRiseFallPage.buyFallAndVerify({
            market: 'Volatility 100 Index',
            durationUnit: 'Minutes',
            durationValue: '15 min',
            stake: '10.50',
            currency: 'USD',
        });
    });
});
```

**`buyRiseAndVerify` / `buyFallAndVerify` cover (in order):**

1. `selectMarket` → `selectTradeType('Rise/Fall')` → `clickRiseFallOption` → `selectDuration` → `setStake` → `clickBuy`
2. `verifyOpenPositionsVisible` + `verifyContractCardDetails` + `verifyBalanceAfterContractPurchase`
3. `verifyOpenPositionsInReports` (Open positions tab) — captures `buyId`
4. `verifyContractDetailsPage` (open contract) — captures `entrySpot`
5. `closeFirstContract` / `sellContract`
6. `verifyClosedPositionsTab` — captures `contractProfitLossAmount`
7. `verifyClosedContractDetailsPage` (closed contract) — captures `sellId`
8. `verifyBalanceAfterContractClose`
9. `verifyClosedContractInReports` → Trade table (by `buyId`) + Statement Sell row (by `sellId`) + Buy row (by `buyId`)

> **Fixture:** `tradeRiseFallPage` from `playwright/fixtures/fixtures.ts`
> **Env var:** `TEST_EMAIL_RISE_FALL` — dedicated funded staging account for this suite
> **Serial mode:** tests run sequentially (shared account state between Rise and Fall)
> **Flow 2.1** = `VERIFY Buy "Rise" Contract and Close` · **Flow 2.2** = `VERIFY Buy "Fall" Contract and Close`

---

### Flow 3.1 — Rise/Fall Allow Equals: enable toggle → buy Rise → close

```typescript
test.describe('Trade — Rise/Fall Allow Equals', { tag: ['@trade', '@desktop', '@mobile'] }, () => {
    test.beforeEach(async ({ loginPage, tradePage, page }) => {
        await loginPage.login();
        await tradePage.goto();
        await NavigationUtils.waitForDerivApiSettled(page);
        await tradePage.selectTradeType('Rise/Fall');
        await tradePage.enableAllowEquals();
    });

    test('VERIFY Rise/Fall Allow Equals buy Rise and close', async ({ tradePage, page }) => {
        await tradePage.setStake('10.00');
        await tradePage.clickRise();
        await expect(
            page.locator('.trade-notification--purchase'),
            'Purchase notification should appear'
        ).toBeVisible();
        await tradePage.gotoPositions();
        await NavigationUtils.waitForDerivApiSettled(page);
        await tradePage.openFirstContract();
        await tradePage.closeContract();
    });

    test('VERIFY Rise/Fall Allow Equals buy Fall and close', async ({ tradePage, page }) => {
        await tradePage.setStake('10.00');
        await tradePage.clickFall();
        await expect(
            page.locator('.trade-notification--purchase'),
            'Purchase notification should appear'
        ).toBeVisible();
        await tradePage.gotoPositions();
        await NavigationUtils.waitForDerivApiSettled(page);
        await tradePage.openFirstContract();
        await tradePage.closeContract();
    });
});
```

> **Flow 3.1** = `VERIFY Rise/Fall Allow Equals buy Rise and close` · **Flow 3.2** = `VERIFY Rise/Fall Allow Equals buy Fall and close`

---

### Flow 4.1 — Higher/Lower: buy Higher → close

```typescript
test.describe('Trade — Higher/Lower', { tag: ['@trade', '@smoke', '@desktop', '@mobile'] }, () => {
    test.beforeEach(async ({ loginPage, tradePage, page }) => {
        await loginPage.login();
        await tradePage.goto();
        await NavigationUtils.waitForDerivApiSettled(page);
        await tradePage.selectTradeType('Higher/Lower');
    });

    test('VERIFY buy Higher contract and close', async ({ tradePage, page }) => {
        await expect(page.getByText('Barrier'), 'Barrier param should be visible for Higher/Lower').toBeVisible();
        await expect(page.getByText('Duration'), 'Duration param should be visible for Higher/Lower').toBeVisible();
        await tradePage.setStake('10.00');
        await tradePage.clickHigher();
        await expect(
            page.locator('.trade-notification--purchase'),
            'Purchase notification should appear'
        ).toBeVisible();
        await tradePage.gotoPositions();
        await NavigationUtils.waitForDerivApiSettled(page);
        await tradePage.openFirstContract();
        await tradePage.closeContract();
    });

    test('VERIFY buy Lower contract and close', async ({ tradePage, page }) => {
        await tradePage.setStake('10.00');
        await tradePage.clickLower();
        await expect(
            page.locator('.trade-notification--purchase'),
            'Purchase notification should appear'
        ).toBeVisible();
        await tradePage.gotoPositions();
        await NavigationUtils.waitForDerivApiSettled(page);
        await tradePage.openFirstContract();
        await tradePage.closeContract();
    });
});
```

> **Flow 4.1** = `VERIFY buy Higher contract and close` · **Flow 4.2** = `VERIFY buy Lower contract and close`

---

### Flow 5.1 — Touch/No Touch: buy Touch → close

```typescript
test.describe('Trade — Touch/No Touch', { tag: ['@trade', '@desktop', '@mobile'] }, () => {
    test.beforeEach(async ({ loginPage, tradePage, page }) => {
        await loginPage.login();
        await tradePage.goto();
        await NavigationUtils.waitForDerivApiSettled(page);
        await tradePage.selectTradeType('Touch/No Touch');
    });

    test('VERIFY buy Touch contract and close', async ({ tradePage, page }) => {
        await expect(page.getByText('Barrier'), 'Barrier param should be visible for Touch/No Touch').toBeVisible();
        await tradePage.setStake('10.00');
        await tradePage.clickTouch();
        await expect(
            page.locator('.trade-notification--purchase'),
            'Purchase notification should appear'
        ).toBeVisible();
        await tradePage.gotoPositions();
        await NavigationUtils.waitForDerivApiSettled(page);
        await tradePage.openFirstContract();
        await tradePage.closeContract();
    });

    test('VERIFY buy No Touch contract and close', async ({ tradePage, page }) => {
        await tradePage.setStake('10.00');
        await tradePage.clickNoTouch();
        await expect(
            page.locator('.trade-notification--purchase'),
            'Purchase notification should appear'
        ).toBeVisible();
        await tradePage.gotoPositions();
        await NavigationUtils.waitForDerivApiSettled(page);
        await tradePage.openFirstContract();
        await tradePage.closeContract();
    });
});
```

> **Flow 5.1** = `VERIFY buy Touch contract and close` · **Flow 5.2** = `VERIFY buy No Touch contract and close`

---

### Flow 6.1 — Matches/Differs: set last digit → buy Matches → wait for expiry

```typescript
test.describe('Trade — Matches/Differs', { tag: ['@trade', '@smoke', '@desktop', '@mobile'] }, () => {
    test.beforeEach(async ({ loginPage, tradePage, page }) => {
        await loginPage.login();
        await tradePage.goto();
        await NavigationUtils.waitForDerivApiSettled(page);
        await tradePage.selectTradeType('Matches/Differs');
    });

    test('VERIFY buy Matches contract and wait for expiry', async ({ tradePage, page }) => {
        await expect(
            page.getByTestId('dt_digit_stats_percentage').first(),
            'Digit selector should be visible'
        ).toBeVisible();
        await tradePage.setStake('10.00');
        await tradePage.selectDigit('5');
        await tradePage.clickMatches();
        await expect(
            page.locator('.trade-notification--purchase'),
            'Purchase notification should appear'
        ).toBeVisible();
        await tradePage.gotoPositions();
        await NavigationUtils.waitForDerivApiSettled(page);
        await expect(
            page.getByTestId('dt_contract_card').first(),
            'Contract card should appear in positions'
        ).toBeVisible();
    });

    test('VERIFY buy Differs contract and wait for expiry', async ({ tradePage, page }) => {
        await tradePage.setStake('10.00');
        await tradePage.selectDigit('5');
        await tradePage.clickDiffers();
        await expect(
            page.locator('.trade-notification--purchase'),
            'Purchase notification should appear'
        ).toBeVisible();
        await tradePage.gotoPositions();
        await NavigationUtils.waitForDerivApiSettled(page);
        await expect(
            page.getByTestId('dt_contract_card').first(),
            'Contract card should appear in positions'
        ).toBeVisible();
    });
});
```

> **Digit contracts auto-expire** — no manual close. Test only verifies purchase + position card.
> **Flow 6.1** = `VERIFY buy Matches contract and wait for expiry` · **Flow 6.2** = `VERIFY buy Differs contract and wait for expiry`

---

### Flow 7.1 — Over/Under: set digit → buy Over → wait for expiry

```typescript
test.describe('Trade — Over/Under', { tag: ['@trade', '@desktop', '@mobile'] }, () => {
    test.beforeEach(async ({ loginPage, tradePage, page }) => {
        await loginPage.login();
        await tradePage.goto();
        await NavigationUtils.waitForDerivApiSettled(page);
        await tradePage.selectTradeType('Over/Under');
    });

    test('VERIFY buy Over contract and wait for expiry', async ({ tradePage, page }) => {
        await expect(
            page.getByTestId('dt_digit_stats_percentage').first(),
            'Digit selector should be visible'
        ).toBeVisible();
        await tradePage.setStake('10.00');
        await tradePage.selectDigit('5');
        await tradePage.clickOver();
        await expect(
            page.locator('.trade-notification--purchase'),
            'Purchase notification should appear'
        ).toBeVisible();
        await tradePage.gotoPositions();
        await NavigationUtils.waitForDerivApiSettled(page);
        await expect(
            page.getByTestId('dt_contract_card').first(),
            'Contract card should appear in positions'
        ).toBeVisible();
    });

    test('VERIFY buy Under contract and wait for expiry', async ({ tradePage, page }) => {
        await tradePage.setStake('10.00');
        await tradePage.selectDigit('5');
        await tradePage.clickUnder();
        await expect(
            page.locator('.trade-notification--purchase'),
            'Purchase notification should appear'
        ).toBeVisible();
        await tradePage.gotoPositions();
        await NavigationUtils.waitForDerivApiSettled(page);
        await expect(
            page.getByTestId('dt_contract_card').first(),
            'Contract card should appear in positions'
        ).toBeVisible();
    });
});
```

---

### Flow 8.1 — Even/Odd: buy Even → wait for expiry

```typescript
test.describe('Trade — Even/Odd', { tag: ['@trade', '@desktop', '@mobile'] }, () => {
    test.beforeEach(async ({ loginPage, tradePage, page }) => {
        await loginPage.login();
        await tradePage.goto();
        await NavigationUtils.waitForDerivApiSettled(page);
        await tradePage.selectTradeType('Even/Odd');
    });

    test('VERIFY buy Even contract and wait for expiry', async ({ tradePage, page }) => {
        await expect(
            page.getByTestId('dt_digit_stats_percentage'),
            'Digit selector should NOT be visible for Even/Odd'
        ).not.toBeVisible();
        await tradePage.setStake('10.00');
        await tradePage.clickEven();
        await expect(
            page.locator('.trade-notification--purchase'),
            'Purchase notification should appear'
        ).toBeVisible();
        await tradePage.gotoPositions();
        await NavigationUtils.waitForDerivApiSettled(page);
        await expect(
            page.getByTestId('dt_contract_card').first(),
            'Contract card should appear in positions'
        ).toBeVisible();
    });

    test('VERIFY buy Odd contract and wait for expiry', async ({ tradePage, page }) => {
        await tradePage.setStake('10.00');
        await tradePage.clickOdd();
        await expect(
            page.locator('.trade-notification--purchase'),
            'Purchase notification should appear'
        ).toBeVisible();
        await tradePage.gotoPositions();
        await NavigationUtils.waitForDerivApiSettled(page);
        await expect(
            page.getByTestId('dt_contract_card').first(),
            'Contract card should appear in positions'
        ).toBeVisible();
    });
});
```

> **Flow 8.1** = `VERIFY buy Even contract and wait for expiry` · **Flow 8.2** = `VERIFY buy Odd contract and wait for expiry`

---

### Flow 9.1 — Accumulators without Take Profit: buy → close from trade page

```typescript
test.describe('Trade — Accumulators', { tag: ['@trade', '@smoke', '@desktop', '@mobile'] }, () => {
    test.beforeEach(async ({ loginPage, tradePage, page }) => {
        await loginPage.login();
        await tradePage.goto();
        await NavigationUtils.waitForDerivApiSettled(page);
        await tradePage.selectTradeType('Accumulators');
    });

    test('VERIFY buy Accumulators without TP and close from trade page', async ({ tradePage, page }) => {
        await expect(page.getByText('Duration'), 'Duration should NOT be visible for Accumulators').not.toBeVisible();
        await expect(page.getByText('Growth rate'), 'Growth rate param should be visible').toBeVisible();
        await tradePage.setStake('10.00');
        // Take profit left off by default
        await tradePage.clickBuy();
        await expect(
            page.locator('.trade-notification--purchase'),
            'Purchase notification should appear'
        ).toBeVisible();
        await expect(
            page.getByRole('button', { name: /^Close/ }),
            'Close button should appear on trade page for active accumulator'
        ).toBeVisible();
        await page.getByRole('button', { name: /^Close/ }).click();
    });

    test('VERIFY buy Accumulators with TP set and close from trade page', async ({ tradePage, page }, testInfo) => {
        await tradePage.setStake('10.00');
        await tradePage.enableTakeProfit();
        const tpInput = testInfo.project.name.includes('mobile')
            ? page.getByTestId('dt_tp_input')
            : page.getByTestId('dt_take_profit_input');
        await tpInput.fill('20.00');
        await tradePage.saveTakeProfit();
        await tradePage.clickBuy();
        await expect(
            page.locator('.trade-notification--purchase'),
            'Purchase notification should appear'
        ).toBeVisible();
        await tradePage.gotoPositions();
        await NavigationUtils.waitForDerivApiSettled(page);
        await expect(
            page.getByTestId('dt_contract_card').first(),
            'Contract card should appear in positions'
        ).toBeVisible();
        // Navigate back and close from trade page
        await tradePage.goto();
        await NavigationUtils.waitForDerivApiSettled(page);
        await expect(
            page.getByRole('button', { name: /^Close/ }),
            'Close button should appear on trade page for active accumulator'
        ).toBeVisible();
        await page.getByRole('button', { name: /^Close/ }).click();
    });
});
```

> **`closeAccumulatorButton`:** The PurchaseButton on the trade page changes to "Close [amount] [currency]" when an active accumulator is open for the current symbol. No `data-testid` — use `getByRole('button', { name: /^Close/ })`.
> **Flow 9.1** = `VERIFY buy Accumulators without TP and close from trade page` · **Flow 9.2** = `VERIFY buy Accumulators with TP set and close from trade page`

---

### Flow 10.1 — Multipliers without TP/SL: buy Up → close

```typescript
test.describe('Trade — Multipliers (no TP/SL)', { tag: ['@trade', '@smoke', '@desktop', '@mobile'] }, () => {
    test.beforeEach(async ({ loginPage, tradePage, page }) => {
        await loginPage.login();
        await tradePage.goto();
        await NavigationUtils.waitForDerivApiSettled(page);
        await tradePage.selectTradeType('Multipliers');
    });

    test('VERIFY buy Up multiplier contract without TP/SL and close', async ({ tradePage, page }) => {
        await expect(page.getByText('Duration'), 'Duration should NOT be visible for Multipliers').not.toBeVisible();
        await expect(page.getByText('Multiplier'), 'Multiplier param should be visible').toBeVisible();
        await expect(page.getByText('Risk management'), 'Risk management param should be visible').toBeVisible();
        await tradePage.setStake('20.00');
        await tradePage.setMultiplier('x200');
        await tradePage.clickUp();
        await expect(
            page.locator('.trade-notification--purchase'),
            'Purchase notification should appear'
        ).toBeVisible();
        await tradePage.gotoPositions();
        await NavigationUtils.waitForDerivApiSettled(page);
        await tradePage.openFirstContract();
        await tradePage.closeContract();
    });

    test('VERIFY buy Down multiplier contract without TP/SL and close', async ({ tradePage, page }) => {
        await tradePage.setStake('21.00');
        await tradePage.setMultiplier('x300');
        await tradePage.clickDown();
        await expect(
            page.locator('.trade-notification--purchase'),
            'Purchase notification should appear'
        ).toBeVisible();
        await tradePage.gotoPositions();
        await NavigationUtils.waitForDerivApiSettled(page);
        await tradePage.openFirstContract();
        await tradePage.closeContract();
    });
});
```

> **Flow 10.1** = `VERIFY buy Up multiplier contract without TP/SL and close` · **Flow 10.2** = `VERIFY buy Down multiplier contract without TP/SL and close`

---

### Flow 11.1 — Multipliers with Take Profit: set TP → buy Up → close

```typescript
test.describe('Trade — Multipliers with Take Profit', { tag: ['@trade', '@smoke', '@desktop', '@mobile'] }, () => {
    test.beforeEach(async ({ loginPage, tradePage, page }) => {
        await loginPage.login();
        await tradePage.goto();
        await NavigationUtils.waitForDerivApiSettled(page);
        await tradePage.selectTradeType('Multipliers');
    });

    test('VERIFY buy Up multiplier contract with take profit and close', async ({ tradePage, page }, testInfo) => {
        await tradePage.setStake('20.00');
        await tradePage.setMultiplier('x10');
        await tradePage.openRiskManagement();
        await tradePage.enableTakeProfit();
        const tpInput = testInfo.project.name.includes('mobile')
            ? page.getByTestId('dt_tp_input')
            : page.getByTestId('dt_tp_input_desktop');
        await tpInput.fill('30.00');
        await tradePage.saveRiskManagement();
        await tradePage.clickUp();
        await expect(
            page.locator('.trade-notification--purchase'),
            'Purchase notification should appear'
        ).toBeVisible();
        await tradePage.gotoPositions();
        await NavigationUtils.waitForDerivApiSettled(page);
        await tradePage.openFirstContract();
        await tradePage.closeContract();
    });

    test('VERIFY buy Down multiplier contract with take profit and close', async ({ tradePage, page }, testInfo) => {
        await tradePage.setStake('21.00');
        await tradePage.setMultiplier('x10');
        await tradePage.openRiskManagement();
        await tradePage.enableTakeProfit();
        const tpInput = testInfo.project.name.includes('mobile')
            ? page.getByTestId('dt_tp_input')
            : page.getByTestId('dt_tp_input_desktop');
        await tpInput.fill('31.00');
        await tradePage.saveRiskManagement();
        await tradePage.clickDown();
        await expect(
            page.locator('.trade-notification--purchase'),
            'Purchase notification should appear'
        ).toBeVisible();
        await tradePage.gotoPositions();
        await NavigationUtils.waitForDerivApiSettled(page);
        await tradePage.openFirstContract();
        await tradePage.closeContract();
    });
});
```

> **Flow 11.1** = `VERIFY buy Up multiplier contract with take profit and close` · **Flow 11.2** = `VERIFY buy Down multiplier contract with take profit and close`

---

### Flow 12.1 — Multipliers with Stop Loss: set SL → buy Up → close

```typescript
test.describe('Trade — Multipliers with Stop Loss', { tag: ['@trade', '@desktop', '@mobile'] }, () => {
    test.beforeEach(async ({ loginPage, tradePage, page }) => {
        await loginPage.login();
        await tradePage.goto();
        await NavigationUtils.waitForDerivApiSettled(page);
        await tradePage.selectTradeType('Multipliers');
    });

    test('VERIFY buy Up multiplier contract with stop loss and close', async ({ tradePage, page }, testInfo) => {
        await tradePage.setStake('20.00');
        await tradePage.setMultiplier('x10');
        await tradePage.openRiskManagement();
        await tradePage.enableStopLoss();
        const slInput = testInfo.project.name.includes('mobile')
            ? page.getByTestId('dt_sl_input')
            : page.getByTestId('dt_sl_input_desktop');
        await slInput.fill('15.00');
        await tradePage.saveRiskManagement();
        await tradePage.clickUp();
        await expect(
            page.locator('.trade-notification--purchase'),
            'Purchase notification should appear'
        ).toBeVisible();
        await tradePage.gotoPositions();
        await NavigationUtils.waitForDerivApiSettled(page);
        await tradePage.openFirstContract();
        await tradePage.closeContract();
    });

    test('VERIFY buy Down multiplier contract with stop loss and close', async ({ tradePage, page }, testInfo) => {
        await tradePage.setStake('21.00');
        await tradePage.setMultiplier('x10');
        await tradePage.openRiskManagement();
        await tradePage.enableStopLoss();
        const slInput = testInfo.project.name.includes('mobile')
            ? page.getByTestId('dt_sl_input')
            : page.getByTestId('dt_sl_input_desktop');
        await slInput.fill('15.00');
        await tradePage.saveRiskManagement();
        await tradePage.clickDown();
        await expect(
            page.locator('.trade-notification--purchase'),
            'Purchase notification should appear'
        ).toBeVisible();
        await tradePage.gotoPositions();
        await NavigationUtils.waitForDerivApiSettled(page);
        await tradePage.openFirstContract();
        await tradePage.closeContract();
    });
});
```

> **Flow 12.1** = `VERIFY buy Up multiplier contract with stop loss and close` · **Flow 12.2** = `VERIFY buy Down multiplier contract with stop loss and close`

---

### Flow 13.1 — Multipliers with Deal Cancellation: set DC → buy Up → cancel

```typescript
test.describe('Trade — Multipliers with Deal Cancellation', { tag: ['@trade', '@desktop', '@mobile'] }, () => {
    test.beforeEach(async ({ loginPage, tradePage, page }) => {
        await loginPage.login();
        await tradePage.goto();
        await NavigationUtils.waitForDerivApiSettled(page);
        await tradePage.selectTradeType('Multipliers');
    });

    test('VERIFY buy Up multiplier contract with deal cancellation and cancel', async ({ tradePage, page }) => {
        await tradePage.setStake('20.00');
        await tradePage.setMultiplier('x10');
        await tradePage.openRiskManagement();
        await tradePage.selectDealCancellation();
        await tradePage.saveRiskManagement();
        await tradePage.clickUp();
        await expect(
            page.locator('.trade-notification--purchase'),
            'Purchase notification should appear'
        ).toBeVisible();
        await expect(page.getByTestId('dt_deal_cancellation_badge'), 'DC timer badge should be visible').toBeVisible();
        await tradePage.gotoPositions();
        await NavigationUtils.waitForDerivApiSettled(page);
        await tradePage.openFirstContract();
        await page.getByRole('button', { name: /Cancel/ }).click();
    });

    test('VERIFY buy Down multiplier contract with deal cancellation and cancel', async ({ tradePage, page }) => {
        await tradePage.setStake('21.00');
        await tradePage.setMultiplier('x10');
        await tradePage.openRiskManagement();
        await tradePage.selectDealCancellation();
        await tradePage.saveRiskManagement();
        await tradePage.clickDown();
        await expect(
            page.locator('.trade-notification--purchase'),
            'Purchase notification should appear'
        ).toBeVisible();
        await expect(page.getByTestId('dt_deal_cancellation_badge'), 'DC timer badge should be visible').toBeVisible();
        await tradePage.gotoPositions();
        await NavigationUtils.waitForDerivApiSettled(page);
        await tradePage.openFirstContract();
        await page.getByRole('button', { name: /Cancel/ }).click();
    });
});
```

> **Flow 13.1** = `VERIFY buy Up multiplier contract with deal cancellation and cancel` · **Flow 13.2** = `VERIFY buy Down multiplier contract with deal cancellation and cancel`

---

### Flow 14.1 — Turbos without TP: buy Up → verify in positions

```typescript
test.describe('Trade — Turbos', { tag: ['@trade', '@desktop', '@mobile'] }, () => {
    test.beforeEach(async ({ loginPage, tradePage, page }) => {
        await loginPage.login();
        await tradePage.goto();
        await NavigationUtils.waitForDerivApiSettled(page);
        await tradePage.selectTradeType('Turbos');
    });

    test('VERIFY buy Turbos Up contract without TP and verify in positions', async ({ tradePage, page }) => {
        await expect(page.getByText('Payout per point'), 'Payout per point param should be visible').toBeVisible();
        await expect(page.getByText('Duration'), 'Duration param should be visible for Turbos').toBeVisible();
        await tradePage.setStake('10.00');
        await tradePage.clickUp();
        await expect(
            page.locator('.trade-notification--purchase'),
            'Purchase notification should appear'
        ).toBeVisible();
        await tradePage.gotoPositions();
        await NavigationUtils.waitForDerivApiSettled(page);
        await expect(
            page.getByTestId('dt_contract_card').first(),
            'Turbos contract card should appear in positions'
        ).toBeVisible();
    });

    test('VERIFY buy Turbos Down contract without TP and verify in positions', async ({ tradePage, page }) => {
        await tradePage.setStake('10.00');
        await tradePage.clickDown();
        await expect(
            page.locator('.trade-notification--purchase'),
            'Purchase notification should appear'
        ).toBeVisible();
        await tradePage.gotoPositions();
        await NavigationUtils.waitForDerivApiSettled(page);
        await expect(
            page.getByTestId('dt_contract_card').first(),
            'Turbos contract card should appear in positions'
        ).toBeVisible();
    });

    test('VERIFY buy Turbos Up contract with TP set and verify in positions', async ({ tradePage, page }, testInfo) => {
        await tradePage.setStake('10.00');
        await tradePage.enableTakeProfit();
        const tpInput = testInfo.project.name.includes('mobile')
            ? page.getByTestId('dt_tp_input')
            : page.getByTestId('dt_take_profit_input');
        await tpInput.fill('20.00');
        await tradePage.saveTakeProfit();
        await tradePage.clickUp();
        await expect(
            page.locator('.trade-notification--purchase'),
            'Purchase notification should appear'
        ).toBeVisible();
        await tradePage.gotoPositions();
        await NavigationUtils.waitForDerivApiSettled(page);
        await expect(
            page.getByTestId('dt_contract_card').first(),
            'Turbos contract card should appear in positions'
        ).toBeVisible();
    });

    test('VERIFY buy Turbos Down contract with TP set and verify in positions', async ({
        tradePage,
        page,
    }, testInfo) => {
        await tradePage.setStake('10.00');
        await tradePage.enableTakeProfit();
        const tpInput = testInfo.project.name.includes('mobile')
            ? page.getByTestId('dt_tp_input')
            : page.getByTestId('dt_take_profit_input');
        await tpInput.fill('20.00');
        await tradePage.saveTakeProfit();
        await tradePage.clickDown();
        await expect(
            page.locator('.trade-notification--purchase'),
            'Purchase notification should appear'
        ).toBeVisible();
        await tradePage.gotoPositions();
        await NavigationUtils.waitForDerivApiSettled(page);
        await expect(
            page.getByTestId('dt_contract_card').first(),
            'Turbos contract card should appear in positions'
        ).toBeVisible();
    });
});
```

> **Turbos buttons are "Up" / "Down"** — NOT "Long" / "Short". Source: `CONTRACT_TYPES.TURBOS.LONG → name 'Up'`, `CONTRACT_TYPES.TURBOS.SHORT → name 'Down'`.
> **Turbos auto-expire** — no manual close. Test only verifies purchase + position card.
> **Flow 14.1** = `VERIFY buy Turbos Up contract without TP and verify in positions`
> **Flow 14.2** = `VERIFY buy Turbos Down contract without TP and verify in positions`
> **Flow 14.3** = `VERIFY buy Turbos Up contract with TP set and verify in positions`
> **Flow 14.4** = `VERIFY buy Turbos Down contract with TP set and verify in positions`

---

### Flow 15.1 — Vanillas: buy Call → verify in positions

```typescript
test.describe('Trade — Vanillas', { tag: ['@trade', '@desktop', '@mobile'] }, () => {
    test.beforeEach(async ({ loginPage, tradePage, page }) => {
        await loginPage.login();
        await tradePage.goto();
        await NavigationUtils.waitForDerivApiSettled(page);
        await tradePage.selectTradeType('Vanillas');
    });

    test('VERIFY buy Vanillas Call contract and verify in positions', async ({ tradePage, page }) => {
        await expect(page.getByText('Strike price'), 'Strike price param should be visible').toBeVisible();
        await expect(page.getByText('Duration'), 'Duration param should be visible for Vanillas').toBeVisible();
        await tradePage.setStake('10.00');
        await tradePage.clickCall();
        await expect(
            page.locator('.trade-notification--purchase'),
            'Purchase notification should appear'
        ).toBeVisible();
        await tradePage.gotoPositions();
        await NavigationUtils.waitForDerivApiSettled(page);
        await expect(
            page.getByTestId('dt_contract_card').first(),
            'Vanillas contract card should appear in positions'
        ).toBeVisible();
    });

    test('VERIFY buy Vanillas Put contract and verify in positions', async ({ tradePage, page }) => {
        await tradePage.setStake('10.00');
        await tradePage.clickPut();
        await expect(
            page.locator('.trade-notification--purchase'),
            'Purchase notification should appear'
        ).toBeVisible();
        await tradePage.gotoPositions();
        await NavigationUtils.waitForDerivApiSettled(page);
        await expect(
            page.getByTestId('dt_contract_card').first(),
            'Vanillas contract card should appear in positions'
        ).toBeVisible();
    });
});
```

> **Vanillas have NO take profit parameter** — confirmed from `getTradeParams()` in `trade-params-utils.tsx`. Do not add TP assertions for Vanillas.
> **Vanillas auto-expire** — no manual close. Test only verifies purchase + position card.
> **Flow 15.1** = `VERIFY buy Vanillas Call contract and verify in positions` · **Flow 15.2** = `VERIFY buy Vanillas Put contract and verify in positions`

---

### Flow 16 — Market closed: purchase button hidden, countdown visible

```typescript
test.describe('Trade — Closed Market', { tag: ['@trade', '@desktop', '@mobile'] }, () => {
    test.beforeEach(async ({ loginPage, tradePage, page }) => {
        await loginPage.login();
        await tradePage.goto();
        await NavigationUtils.waitForDerivApiSettled(page);
    });

    test('VERIFY closed market hides purchase button and shows reopening countdown', async ({ tradePage, page }) => {
        await expect(page.getByText('CLOSED'), 'CLOSED tag should be visible in market selector').toBeVisible();
        await expect(
            tradePage.purchaseButton,
            'Purchase button should not be visible for closed market'
        ).not.toBeVisible();
        await expect(
            page.getByText('This market will reopen at'),
            'Closed market countdown message should be visible'
        ).toBeVisible();
    });
});
```

---

## Section 3 — Tags Reference

| Tag           | When to apply                                           |
| ------------- | ------------------------------------------------------- |
| `@trade`      | Trade form, purchase flow, market selector, trade types |
| `@auth`       | Login, logout, session handling                         |
| `@reports`    | Positions, statements, P&L                              |
| `@smoke`      | Critical path — must pass on every run                  |
| `@staging`    | Uses account credentials or requires funded account     |
| `@production` | Safe to run on production (read-only assertions only)   |
| `@desktop`    | Desktop viewport (chromium project, 1728×1117)          |
| `@mobile`     | Mobile viewport (chromium-mobile project, 500×850)      |

---

## Section 4 — Feature-Specific Decisions

### Desktop vs Mobile: same spec, platform-branched assertions

`trade.tsx` routes to `TradeDesktop` or `TradeMobile` based on `isMobile`. Both serve route `/`. Single spec per trade type runs under both `chromium` and `chromium-mobile` projects. Use `testInfo.project.name.includes('mobile')` for platform-specific testid branches (e.g. `dt_tp_input` vs `dt_tp_input_desktop`).

### Unique parameter locator map per trade type

| Trade type        | Unique param                                                        | Locator strategy                                       |
| ----------------- | ------------------------------------------------------------------- | ------------------------------------------------------ |
| Rise/Fall         | Allow equals                                                        | `getByText('Allow equals')` — toggle, no testid        |
| Higher/Lower      | Barrier                                                             | `getByText('Barrier')` — label, no testid              |
| Touch/No Touch    | Barrier                                                             | `getByText('Barrier')`                                 |
| Matches/Differs   | Last digit prediction                                               | `getByTestId('dt_digit_stats_percentage').first()`     |
| Over/Under        | Last digit prediction                                               | `getByTestId('dt_digit_stats_percentage').first()`     |
| Accumulators      | Growth rate                                                         | `getByText('Growth rate')`                             |
| Accumulators      | Take profit                                                         | Mobile: `dt_tp_input`; Desktop: `dt_take_profit_input` |
| Multipliers       | Multiplier                                                          | `getByText('Multiplier')` — label, no testid           |
| Multipliers       | Risk management                                                     | `getByText('Risk management')`                         |
| Multipliers TP    | TP input                                                            | Mobile: `dt_tp_input`; Desktop: `dt_tp_input_desktop`  |
| Multipliers SL    | SL input                                                            | Mobile: `dt_sl_input`; Desktop: `dt_sl_input_desktop`  |
| Multipliers DC    | Deal cancellation badge                                             | `getByTestId('dt_deal_cancellation_badge')`            |
| Turbos            | Payout per point                                                    | `getByText('Payout per point')`                        |
| Turbos            | Barrier info panel                                                  | `getByText('Barrier')` (info panel below params)       |
| Vanillas          | Strike price                                                        | `getByText('Strike price')`                            |
| Stake (all types) | Mobile: `dt_input_with_steppers`; Desktop: `dt_stake_input_desktop` |

### Which trade types require manual close vs auto-expiry

| Trade type                            | Close method                                                                                                                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rise/Fall                             | Desktop: `PositionsPage.closeFirstContract()` (inline Close button on card). Mobile: `PositionsPage.closeFirstContract()` (force-clicks hidden button). Then `verifyClosedContractDetailsPage()` extracts `sellId`. |
| Higher/Lower, Touch/No Touch          | Manual close via contract details footer: `getByRole('button', { name: /^Close/ })`                                                                                                                                 |
| Accumulators                          | Close button on trade page (`getByRole('button', { name: /^Close/ })`) while contract is active                                                                                                                     |
| Multipliers                           | Manual close via contract details footer                                                                                                                                                                            |
| Matches/Differs, Over/Under, Even/Odd | Auto-expiry — no manual close                                                                                                                                                                                       |
| Turbos, Vanillas                      | Auto-expiry — no manual close; test only verifies purchase + position card                                                                                                                                          |

### `NavigationUtils.waitForDerivApiSettled(page)` required after every navigation

All state is driven by WebSocket. Always call after `page.goto()` and after navigating to positions/contract details.

### Notification banner locator

No `data-testid` on the purchase notification banner. Use CSS class `'.trade-notification--purchase'` on the icon wrapper inside the banner — set during `addNotificationBannerCallback` in `purchase-button.tsx`.

### Purchase button does not disable on insufficient balance

Clicking "Buy" with insufficient balance opens `ServiceErrorSheet` instead. Do not assert `toBeDisabled()` on the buy button.

### Multipliers Risk Management panel — TP/SL and Deal Cancellation are mutually exclusive

When Deal Cancellation is active, TP and SL toggles are disabled. Source: `risk-management-content.tsx` copy: "Take profit and/or stop loss are not available while deal cancellation is active."

### `dt_acc_info` is in core Header, not AppV2

`data-testid='dt_acc_info'` is in `packages/core/src/App/Components/Layout/Header/account-info.tsx:79` — rendered by the dtrader shell, visible on all pages post-login.
