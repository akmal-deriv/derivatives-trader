# 🗺️ Trade Journey Catalog — Technical Reference

> Source of truth: `packages/trader/src/AppV2/Containers/Trade/` · `packages/trader/src/AppV2/Components/TradeParameters/` · `packages/trader/src/AppV2/Components/PurchaseButton/`
> Last updated: 2026-07-06

---

## Section 1 — Journey Index

| Journey ID | Spec File                                              | Tags                             |
| ---------- | ------------------------------------------------------ | -------------------------------- |
| Flow 1     | `trade/verify-trade-form-loads.spec.ts`                | `@trade @smoke @desktop @mobile` |
| Flow 2.1   | `trade/verify-rise-fall.spec.ts`                       | `@trade @smoke @desktop @mobile` |
| Flow 2.2   | `trade/verify-rise-fall.spec.ts`                       | `@trade @smoke @desktop @mobile` |
| Flow 2.3   | `trade/rise-fall/verify-rise-fall.spec.ts`             | `@trade @smoke @desktop @mobile` |
| Flow 2.4   | `trade/rise-fall/verify-rise-fall.spec.ts`             | `@trade @smoke @desktop @mobile` |
| Flow 3.1   | `trade/higher-lower/verify-higher-lower.spec.ts`       | `@trade @desktop @mobile`        |
| Flow 3.2   | `trade/higher-lower/verify-higher-lower.spec.ts`       | `@trade @desktop @mobile`        |
| Flow 4.1   | `trade/touch-no-touch/verify-touch-no-touch.spec.ts`   | `@trade @desktop @mobile`        |
| Flow 4.2   | `trade/touch-no-touch/verify-touch-no-touch.spec.ts`   | `@trade @desktop @mobile`        |
| Flow 5.1   | `trade/matches-differs/verify-matches-differs.spec.ts` | `@trade @smoke @desktop @mobile` |
| Flow 5.2   | `trade/matches-differs/verify-matches-differs.spec.ts` | `@trade @smoke @desktop @mobile` |
| Flow 6.1   | `trade/over-under/verify-over-under.spec.ts`           | `@trade @desktop @mobile`        |
| Flow 6.2   | `trade/over-under/verify-over-under.spec.ts`           | `@trade @desktop @mobile`        |
| Flow 7.1   | `trade/even-odd/verify-even-odd.spec.ts`               | `@trade @desktop @mobile`        |
| Flow 7.2   | `trade/even-odd/verify-even-odd.spec.ts`               | `@trade @desktop @mobile`        |
| Flow 8.1   | `trade/verify-accumulators.spec.ts`                    | `@trade @smoke @desktop @mobile` |
| Flow 8.2   | `trade/verify-accumulators.spec.ts`                    | `@trade @smoke @desktop @mobile` |
| Flow 9.1   | `trade/verify-multipliers-no-tpsl.spec.ts`             | `@trade @smoke @desktop @mobile` |
| Flow 9.2   | `trade/verify-multipliers-no-tpsl.spec.ts`             | `@trade @smoke @desktop @mobile` |
| Flow 10.1  | `trade/verify-multipliers-with-tp.spec.ts`             | `@trade @smoke @desktop @mobile` |
| Flow 10.2  | `trade/verify-multipliers-with-tp.spec.ts`             | `@trade @smoke @desktop @mobile` |
| Flow 11.1  | `trade/verify-multipliers-with-sl.spec.ts`             | `@trade @desktop @mobile`        |
| Flow 11.2  | `trade/verify-multipliers-with-sl.spec.ts`             | `@trade @desktop @mobile`        |
| Flow 12.1  | `trade/verify-multipliers-deal-cancellation.spec.ts`   | `@trade @desktop @mobile`        |
| Flow 12.2  | `trade/verify-multipliers-deal-cancellation.spec.ts`   | `@trade @desktop @mobile`        |
| Flow 13.1  | `trade/verify-turbos.spec.ts`                          | `@trade @desktop @mobile`        |
| Flow 13.2  | `trade/verify-turbos.spec.ts`                          | `@trade @desktop @mobile`        |
| Flow 13.3  | `trade/verify-turbos.spec.ts`                          | `@trade @desktop @mobile`        |
| Flow 13.4  | `trade/verify-turbos.spec.ts`                          | `@trade @desktop @mobile`        |
| Flow 14.1  | `trade/verify-vanillas.spec.ts`                        | `@trade @desktop @mobile`        |
| Flow 14.2  | `trade/verify-vanillas.spec.ts`                        | `@trade @desktop @mobile`        |
| Flow 15    | `trade/verify-closed-market.spec.ts`                   | `@trade @desktop @mobile`        |
| G1         | `trade/verify-insufficient-balance.spec.ts`            | `@trade`                         |
| G2         | `trade/verify-unauthenticated-purchase.spec.ts`        | `@trade`                         |

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

### Flow 2.3 — Rise/Fall Allow Equals: enable toggle → buy Rise → close

### Flow 2.4 — Rise/Fall Allow Equals: enable toggle → buy Fall → close

```typescript
// Co-located in verify-rise-fall.spec.ts alongside Flow 2.1 + 2.2 (same describe block, serial mode)
test.describe('Trade — Rise/Fall', { tag: ['@trade', '@smoke', '@desktop', '@mobile'] }, () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(async ({}, testInfo) => {
        const isMobile = testInfo.project.name.includes('mobile');
        const backupEmailVar = isMobile ? 'TEST_EMAIL_RISE_FALL_MOBILE' : 'TEST_EMAIL_RISE_FALL';
        const account = await createAccountV2viaJS('real', {
            currency: 'USD',
            trading: true,
            backupAccount: process.env[backupEmailVar],
        });
        accountEmail = account.email;
        accountPassword = account.password;
    });

    test.beforeEach(async ({ page, loginPage }) => {
        await TradeBasePage.seedLocalStorageOnOrigin(page);
        await loginPage.login(accountEmail, accountPassword);
    });

    test('VERIFY Buy "Rise" Contract with Allow Equals Enabled', async ({ tradeRiseFallPage }) => {
        await tradeRiseFallPage.buyRiseAndVerify({
            market: 'Volatility 100 Index',
            durationUnit: 'Minutes',
            durationValue: '15 min',
            stake: '10.50',
            currency: 'USD',
            allowEquals: true,
        });
    });

    test('VERIFY Buy "Fall" Contract with Allow Equals Enabled', async ({ tradeRiseFallPage }) => {
        await tradeRiseFallPage.buyFallAndVerify({
            market: 'Volatility 100 Index',
            durationUnit: 'Minutes',
            durationValue: '18 min',
            stake: '20.50',
            currency: 'USD',
            allowEquals: true,
        });
    });
});
```

**`buyRiseAndVerify` / `buyFallAndVerify` with `allowEquals: true` cover (in order):**

1. `selectMarket` → `selectTradeType('Rise/Fall')` → enable Allow Equals toggle → `clickRiseFallOption` → `selectDuration` → `setStake` → `clickBuy`
2. Contract type submitted as `RISEEQUAL` / `FALLEQUAL` (pays out when exit spot = entry spot too)
3. Same full verification chain as Flow 2.1/2.2: open positions → reports → contract details → close → closed card → balance → reports

> **Spec:** `playwright/tests/trade/rise-fall/verify-rise-fall.spec.ts`
> **Fixture:** `tradeRiseFallPage` from `playwright/fixtures/fixtures.ts`
> **Serial mode:** all four Rise/Fall tests share the same funded account; order matters
> **Flow 2.3** = `VERIFY Buy "Rise" Contract with Allow Equals Enabled` · **Flow 2.4** = `VERIFY Buy "Fall" Contract with Allow Equals Enabled`

---

### Flow 3.1 — Higher/Lower: buy Higher → close

```typescript
test.describe('Trade — Higher/Lower', { tag: ['@desktop', '@mobile', '@trade'] }, () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(async ({}, testInfo) => {
        const isMobile = testInfo.project.name.includes('mobile');
        const backupEmailVar = isMobile ? 'TEST_EMAIL_HIGHER_LOWER_MOBILE' : 'TEST_EMAIL_HIGHER_LOWER';
        const account = await createAccountV2viaJS('real', {
            currency: 'USD',
            trading: true,
            backupAccount: process.env[backupEmailVar],
        });
        accountEmail = account.email;
        accountPassword = account.password;
    });

    test.beforeEach(async ({ page, loginPage }) => {
        await TradeBasePage.seedLocalStorageOnOrigin(page);
        await loginPage.login(accountEmail, accountPassword);
    });

    test('VERIFY Buy "Higher" Contract and Close', async ({ tradeHigherLowerPage }) => {
        await tradeHigherLowerPage.buyHigherAndVerify({
            market: 'Volatility 100 (1s) Index',
            durationUnit: 'Hours',
            durationValue: '1 hr',
            barrierType: 'Above spot',
            barrier: '5.11',
            stake: '10.00',
            currency: 'USD',
        });
    });

    test('VERIFY Buy "Lower" Contract and Close', async ({ tradeHigherLowerPage }) => {
        await tradeHigherLowerPage.buyLowerAndVerify({
            market: 'Volatility 100 (1s) Index',
            durationUnit: 'Hours',
            durationValue: '1h 30m',
            barrierType: 'Below spot',
            barrier: '5.00',
            stake: '10.00',
            currency: 'USD',
        });
    });
});
```

> **Flow 3.1** = `VERIFY Buy "Higher" Contract and Close` · **Flow 3.2** = `VERIFY Buy "Lower" Contract and Close`

---

### Flow 4.1 — Touch/No Touch: buy Touch → close

```typescript
test.describe('Trade — Touch/No Touch', { tag: ['@desktop', '@mobile', '@trade'] }, () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(async ({}, testInfo) => {
        const isMobile = testInfo.project.name.includes('mobile');
        const backupEmailVar = isMobile ? 'TEST_EMAIL_TOUCH_NO_TOUCH_MOBILE' : 'TEST_EMAIL_TOUCH_NO_TOUCH';
        const account = await createAccountV2viaJS('real', {
            currency: 'USD',
            trading: true,
            backupAccount: process.env[backupEmailVar],
        });
        accountEmail = account.email;
        accountPassword = account.password;
    });

    test.beforeEach(async ({ page, loginPage }) => {
        await TradeBasePage.seedLocalStorageOnOrigin(page);
        await loginPage.login(accountEmail, accountPassword);
    });

    test('VERIFY Buy "Touch" Contract and Close', async ({ tradeTouchNoTouchPage }) => {
        await tradeTouchNoTouchPage.buyTouchAndVerify({
            market: 'Volatility 75 Index',
            durationUnit: 'Minutes',
            durationValue: '15 min',
            barrierType: 'Above spot',
            barrier: '5.11',
            stake: '10.00',
            currency: 'USD',
        });
    });

    test('VERIFY Buy "No Touch" Contract and Close', async ({ tradeTouchNoTouchPage }) => {
        await tradeTouchNoTouchPage.buyNoTouchAndVerify({
            market: 'Volatility 75 Index',
            durationUnit: 'Minutes',
            durationValue: '18 min',
            barrierType: 'Below spot',
            barrier: '5.00',
            stake: '10.00',
            currency: 'USD',
        });
    });
});
```

> **Flow 4.1** = `VERIFY Buy "Touch" Contract and Close` · **Flow 4.2** = `VERIFY Buy "No Touch" Contract and Close`

---

### Flow 5.1 / 5.2 — Matches/Differs: buy → settle in place → verify closed

Digit contracts are **Ticks-only** and **auto-expire** (no manual close). The POM opens the open
position's contract details right after buy, captures its buy reference ID, waits for the contract to
settle in place, then verifies the settled contract in Positions, contract details, balance, and Reports.
All locators live in `TradeMatchesDiffersPage` / `ContractDetailsPage` (no inline locators in the test).

```typescript
import { test } from '../../../fixtures/fixtures';
import { TradeBasePage } from '../../../pages/TradeBasePage';

test.describe('Trade — Matches/Differs', { tag: ['@desktop', '@mobile', '@trade', '@smoke'] }, () => {
    test.describe.configure({ mode: 'serial' });

    // Dedicated funded real USD account (custom password) — logs in directly.
    test.beforeEach(async ({ page, loginPage }) => {
        await TradeBasePage.seedLocalStorageOnOrigin(page);
        await loginPage.login(accountEmail, accountPassword);
    });

    test('VERIFY Buy "Matches" Contract', async ({ tradeMatchesDiffersPage }) => {
        await tradeMatchesDiffersPage.buyMatchesAndVerify({
            market: 'Volatility 10 Index',
            durationValue: '10 ticks',
            stake: '10.00',
            currency: 'USD',
            digit: '5',
        });
    });

    test('VERIFY Buy "Differs" Contract', async ({ tradeMatchesDiffersPage }) => {
        await tradeMatchesDiffersPage.buyDiffersAndVerify({
            market: 'Volatility 10 Index',
            durationValue: '10 ticks',
            stake: '10.00',
            currency: 'USD',
            digit: '5',
        });
    });
});
```

> **`buyMatchesAndVerify` / `buyDiffersAndVerify` cover (in order):** select market → select Matches/Differs →
> select Matches/Differs tab → `selectTicksDuration` → `setStake` → `selectDigit` → `clickBuy` →
> verify balance deducted → open the open position's details + capture `buyId` → `waitForContractSettled` →
> Closed tab `verifyClosedPositionsTab` (signed P/L) → `verifyClosedDigitContractDetailsPage` (Target digit, `sellId`) →
> `verifyBalanceAfterContractClose` → Reports `verifyClosedContractInReports` (Trade table + Statement).
> **Flow 5.1** = `VERIFY Buy "Matches" Contract` · **Flow 5.2** = `VERIFY Buy "Differs" Contract`

---

### Flow 6.1 / 6.2 — Over/Under: buy → settle in place → verify closed

Same digit-contract pattern as Matches/Differs (Flow 5.1/5.2). The `TradeOverUnderPage` fixture shares
its logic with `TradeMatchesDiffersPage` via the common `TradeDigitsPage` base; only the outcome labels
differ. **Invalid digits:** Over cannot predict 9, Under cannot predict 0 — use a middle digit (e.g. 5).

```typescript
import { test } from '../../../fixtures/fixtures';
import { TradeBasePage } from '../../../pages/TradeBasePage';

test.describe('Trade — Over/Under', { tag: ['@desktop', '@mobile', '@trade'] }, () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, loginPage }) => {
        await TradeBasePage.seedLocalStorageOnOrigin(page);
        await loginPage.login(accountEmail, accountPassword);
    });

    test('VERIFY Buy "Over" Contract', async ({ tradeOverUnderPage }) => {
        await tradeOverUnderPage.buyOverAndVerify({
            market: 'Volatility 10 Index',
            durationValue: '10 ticks',
            stake: '10.00',
            currency: 'USD',
            digit: '5',
        });
    });

    test('VERIFY Buy "Under" Contract', async ({ tradeOverUnderPage }) => {
        await tradeOverUnderPage.buyUnderAndVerify({
            market: 'Volatility 10 Index',
            durationValue: '10 ticks',
            stake: '10.00',
            currency: 'USD',
            digit: '5',
        });
    });
});
```

> `buyOverAndVerify` / `buyUnderAndVerify` run the same chain as `buyMatchesAndVerify` (see Flow 5.1/5.2),
> differing only in the outcome tab (`Over`/`Under`) and audit Target text (`Over N` / `Under N`).
> **Flow 6.1** = `VERIFY Buy "Over" Contract` · **Flow 6.2** = `VERIFY Buy "Under" Contract`

---

### Flow 7.1 / 7.2 — Even/Odd: buy → settle in place → verify closed

Simplest digit type — **no last-digit selector** (the outcome is even vs odd). The `TradeEvenOddPage`
fixture shares its logic with the other digit types via the common `TradeDigitsPage` base; `buyEvenAndVerify`
/ `buyOddAndVerify` take no `digit`, and the audit Target row reads "Even" / "Odd".

```typescript
import { test } from '../../../fixtures/fixtures';
import { TradeBasePage } from '../../../pages/TradeBasePage';

test.describe('Trade — Even/Odd', { tag: ['@desktop', '@mobile', '@trade'] }, () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, loginPage }) => {
        await TradeBasePage.seedLocalStorageOnOrigin(page);
        await loginPage.login(accountEmail, accountPassword);
    });

    test('VERIFY Buy "Even" Contract', async ({ tradeEvenOddPage }) => {
        await tradeEvenOddPage.buyEvenAndVerify({
            market: 'Volatility 10 Index',
            durationValue: '10 ticks',
            stake: '10.00',
            currency: 'USD',
        });
    });

    test('VERIFY Buy "Odd" Contract', async ({ tradeEvenOddPage }) => {
        await tradeEvenOddPage.buyOddAndVerify({
            market: 'Volatility 10 Index',
            durationValue: '10 ticks',
            stake: '10.00',
            currency: 'USD',
        });
    });
});
```

> `buyEvenAndVerify` / `buyOddAndVerify` run the same chain as `buyMatchesAndVerify` (see Flow 5.1/5.2)
> minus the digit selection, differing in the outcome tab (`Even`/`Odd`) and audit Target text (`Even` / `Odd`).
> **Flow 7.1** = `VERIFY Buy "Even" Contract` · **Flow 7.2** = `VERIFY Buy "Odd" Contract`

---

### Flow 8.1 — Accumulators without Take Profit: buy → close from trade page

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
> **Flow 8.1** = `VERIFY buy Accumulators without TP and close from trade page` · **Flow 8.2** = `VERIFY buy Accumulators with TP set and close from trade page`

---

### Flow 9.1 — Multipliers without TP/SL: buy Up → close

```typescript
test.describe('Trade — Multipliers (no TP/SL)', { tag: ['@desktop', '@mobile', '@trade', '@smoke'] }, () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, loginPage }) => {
        await TradeBasePage.seedLocalStorageOnOrigin(page);
        await loginPage.login('account@example.com');
    });

    test('VERIFY Buy "Up" Multipliers Contract and Close', async ({ tradeMultipliersPage }) => {
        await tradeMultipliersPage.buyUpAndVerify({
            market: 'Volatility 100 (1s) Index',
            multiplier: 'x200',
            stake: '20.00',
            currency: 'USD',
        });
    });

    test('VERIFY Buy "Down" Multipliers Contract and Close', async ({ tradeMultipliersPage }) => {
        await tradeMultipliersPage.buyDownAndVerify({
            market: 'Volatility 100 (1s) Index',
            multiplier: 'x300',
            stake: '21.00',
            currency: 'USD',
        });
    });
});
```

> **Flow 9.1** = `VERIFY Buy "Up" Multipliers Contract and Close` · **Flow 9.2** = `VERIFY Buy "Down" Multipliers Contract and Close`
>
> Both tests delegate to `buyUpAndVerify` / `buyDownAndVerify` on `TradeMultipliersPage`, which implement the full 17-step chain: configure → buy → positions → reports (open) → contract details (open, captures `buyId` + `entrySpot`) → close → closed positions tab → contract details (closed, asserts commission, stop out level, entry/exit details) → balance → reports (closed trade table + statement).
> Commission and stop out are captured pre-buy from the info panel and asserted exactly in the closed contract details.
> Mobile entry/exit detail dates render as `DD Mon YYYY`; the helper derives this format internally from the ISO `buyDate`.

---

### Flow 10.1 — Multipliers with Take Profit: set TP → buy Up → close

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

> **Flow 10.1** = `VERIFY buy Up multiplier contract with take profit and close` · **Flow 10.2** = `VERIFY buy Down multiplier contract with take profit and close`

---

### Flow 11.1 — Multipliers with Stop Loss: set SL → buy Up → close

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

> **Flow 11.1** = `VERIFY buy Up multiplier contract with stop loss and close` · **Flow 11.2** = `VERIFY buy Down multiplier contract with stop loss and close`

---

### Flow 12.1 — Multipliers with Deal Cancellation: set DC → buy Up → cancel

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

> **Flow 12.1** = `VERIFY buy Up multiplier contract with deal cancellation and cancel` · **Flow 12.2** = `VERIFY buy Down multiplier contract with deal cancellation and cancel`

---

### Flow 13.1 — Turbos without TP: buy Up → verify in positions

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
> **Flow 13.1** = `VERIFY buy Turbos Up contract without TP and verify in positions`
> **Flow 13.2** = `VERIFY buy Turbos Down contract without TP and verify in positions`
> **Flow 13.3** = `VERIFY buy Turbos Up contract with TP set and verify in positions`
> **Flow 13.4** = `VERIFY buy Turbos Down contract with TP set and verify in positions`

---

### Flow 14.1 — Vanillas: buy Call → verify in positions

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
> **Flow 14.1** = `VERIFY buy Vanillas Call contract and verify in positions` · **Flow 14.2** = `VERIFY buy Vanillas Put contract and verify in positions`

---

### Flow 15 — Market closed: purchase button hidden, countdown visible

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
