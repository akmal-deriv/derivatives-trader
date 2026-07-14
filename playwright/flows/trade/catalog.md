# 🗺️ Trade Journey Catalog — Technical Reference

> Source of truth: `packages/trader/src/AppV2/Containers/Trade/` · `packages/trader/src/AppV2/Components/TradeParameters/` · `packages/trader/src/AppV2/Components/PurchaseButton/`
> Last updated: 2026-07-09

---

## Section 1 — Journey Index

| Journey ID | Spec File                                                        | Tags                             |
| ---------- | ---------------------------------------------------------------- | -------------------------------- |
| Flow 1     | `trade/verify-trade-form-loads.spec.ts`                          | `@trade @smoke @desktop @mobile` |
| Flow 2.1   | `trade/verify-rise-fall.spec.ts`                                 | `@trade @smoke @desktop @mobile` |
| Flow 2.2   | `trade/verify-rise-fall.spec.ts`                                 | `@trade @smoke @desktop @mobile` |
| Flow 2.3   | `trade/rise-fall/verify-rise-fall.spec.ts`                       | `@trade @smoke @desktop @mobile` |
| Flow 2.4   | `trade/rise-fall/verify-rise-fall.spec.ts`                       | `@trade @smoke @desktop @mobile` |
| Flow 3.1   | `trade/higher-lower/verify-higher-lower.spec.ts`                 | `@trade @desktop @mobile`        |
| Flow 3.2   | `trade/higher-lower/verify-higher-lower.spec.ts`                 | `@trade @desktop @mobile`        |
| Flow 4.1   | `trade/touch-no-touch/verify-touch-no-touch.spec.ts`             | `@trade @desktop @mobile`        |
| Flow 4.2   | `trade/touch-no-touch/verify-touch-no-touch.spec.ts`             | `@trade @desktop @mobile`        |
| Flow 5.1   | `trade/matches-differs/verify-matches-differs.spec.ts`           | `@trade @smoke @desktop @mobile` |
| Flow 5.2   | `trade/matches-differs/verify-matches-differs.spec.ts`           | `@trade @smoke @desktop @mobile` |
| Flow 6.1   | `trade/over-under/verify-over-under.spec.ts`                     | `@trade @desktop @mobile`        |
| Flow 6.2   | `trade/over-under/verify-over-under.spec.ts`                     | `@trade @desktop @mobile`        |
| Flow 7.1   | `trade/even-odd/verify-even-odd.spec.ts`                         | `@trade @desktop @mobile`        |
| Flow 7.2   | `trade/even-odd/verify-even-odd.spec.ts`                         | `@trade @desktop @mobile`        |
| Flow 8.1   | `trade/accumulators/verify-accumulators.spec.ts`                 | `@trade @smoke @desktop @mobile` |
| Flow 8.2   | `trade/accumulators/verify-accumulators.spec.ts`                 | `@trade @smoke @desktop @mobile` |
| Flow 9.1   | `trade/multipliers/verify-multipliers-no-tpsl.spec.ts`           | `@trade @smoke @desktop @mobile` |
| Flow 9.2   | `trade/multipliers/verify-multipliers-no-tpsl.spec.ts`           | `@trade @smoke @desktop @mobile` |
| Flow 9.3   | `trade/multipliers/verify-multipliers-with-tp.spec.ts`           | `@trade @smoke @desktop @mobile` |
| Flow 9.4   | `trade/multipliers/verify-multipliers-with-tp.spec.ts`           | `@trade @smoke @desktop @mobile` |
| Flow 9.5   | `trade/multipliers/verify-multipliers-with-sl.spec.ts`           | `@trade @desktop @mobile`        |
| Flow 9.6   | `trade/multipliers/verify-multipliers-with-sl.spec.ts`           | `@trade @desktop @mobile`        |
| Flow 9.7   | `trade/multipliers/verify-multipliers-deal-cancellation.spec.ts` | `@trade @desktop @mobile`        |
| Flow 9.8   | `trade/multipliers/verify-multipliers-deal-cancellation.spec.ts` | `@trade @desktop @mobile`        |
| Flow 10.1  | `trade/turbos/verify-turbos.spec.ts`                             | `@trade @desktop @mobile`        |
| Flow 10.2  | `trade/turbos/verify-turbos.spec.ts`                             | `@trade @desktop @mobile`        |
| Flow 10.3  | `trade/turbos/verify-turbos-tp.spec.ts`                          | `@trade @desktop @mobile`        |
| Flow 10.4  | `trade/turbos/verify-turbos-tp.spec.ts`                          | `@trade @desktop @mobile`        |
| Flow 11.1  | `trade/verify-vanillas.spec.ts`                                  | `@trade @desktop @mobile`        |
| Flow 11.2  | `trade/verify-vanillas.spec.ts`                                  | `@trade @desktop @mobile`        |
| Flow 12    | `trade/verify-closed-market.spec.ts`                             | `@trade @desktop @mobile`        |
| G1         | `trade/verify-insufficient-balance.spec.ts`                      | `@trade`                         |
| G2         | `trade/verify-unauthenticated-purchase.spec.ts`                  | `@trade`                         |

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

### Flow 8.1 / 8.2 — Accumulators: buy → settle → verify closed

Accumulators have **no duration**, a **Growth rate** param (set 5%), and an optional **Take profit**
(Flow 8.2 sets 4.00). They close from the **trade page** ("Close [amount]" purchase button), and can
also auto-settle when spot hits the **barrier** or the **take profit**. `TradeAccumulatorsPage` uses a
close-reason-agnostic settle helper (manual close for 8.1; wait-for-auto-settle with manual fallback
for 8.2) and verifies the closed contract in Positions, contract details, balance, and Reports. TP is
asserted on the **form** before buying (deterministic); open-position Reports grid is not verified.

```typescript
import { test } from '../../../fixtures/fixtures';
import { TradeBasePage } from '../../../pages/TradeBasePage';

test.describe('Trade — Accumulators', { tag: ['@desktop', '@mobile', '@trade', '@smoke'] }, () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, loginPage }) => {
        await TradeBasePage.seedLocalStorageOnOrigin(page);
        await loginPage.login(accountEmail, accountPassword);
    });

    test('VERIFY Buy Accumulators Contract Without Take Profit and Close', async ({ tradeAccumulatorsPage }) => {
        await tradeAccumulatorsPage.buyAccumulatorAndVerify({
            market: 'Volatility 100 Index',
            growthRate: '5%',
            stake: '10.00',
            currency: 'USD',
        });
    });

    test('VERIFY Buy Accumulators Contract With Take Profit and Close', async ({ tradeAccumulatorsPage }) => {
        await tradeAccumulatorsPage.buyAccumulatorAndVerify({
            market: 'Volatility 100 Index',
            growthRate: '5%',
            stake: '10.00',
            currency: 'USD',
            takeProfit: '4.00',
        });
    });
});
```

> **`buyAccumulatorAndVerify` covers (in order):** select market → select Accumulators (asserts no Duration)
> → `setGrowthRate('5%')` → (8.2) `setTakeProfit('4.00')` asserted on the form → `setStake` →
> `clickAccumulatorsBuy` → `settleAccumulatorContract` (manual / auto-settle) → Closed tab
> `verifyClosedPositionsTab` (signed P/L) → closed contract details `getBuyReferenceId` + `getSellReferenceId`
> → `verifyBalanceAfterContractClose` → Reports `verifyClosedContractInReports`.
> **Close button:** the trade-page purchase button becomes "Close [amount] [currency]" while an
> accumulator is open (`.purchase-button--single`); it reverts to "Buy" on any auto-close.
> **Flow 8.1** = `VERIFY Buy Accumulators Contract Without Take Profit and Close` · **Flow 8.2** = `VERIFY Buy Accumulators Contract With Take Profit and Close`

---

### Flow 9.1 — Multipliers without TP/SL: buy Up → close

### Flow 9.2 — Multipliers without TP/SL: buy Down → close

```typescript
test.describe('Trade — Multipliers', { tag: ['@desktop', '@mobile', '@trade'] }, () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(async ({}, testInfo) => {
        const isMobile = testInfo.project.name.includes('mobile');
        const backupEmailVar = isMobile ? 'TEST_EMAIL_MULTIPLIERS_MOBILE' : 'TEST_EMAIL_MULTIPLIERS';
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

    test('VERIFY Buy "Up" Multipliers Contract and Close (without TP/SL)', async ({ tradeMultipliersPage }) => {
        await tradeMultipliersPage.buyUpAndVerify({
            market: 'Volatility 100 (1s) Index',
            multiplier: 'x200',
            stake: '5.40',
            currency: 'USD',
        });
    });

    test('VERIFY Buy "Down" Multipliers Contract and Close (without TP/SL)', async ({ tradeMultipliersPage }) => {
        await tradeMultipliersPage.buyDownAndVerify({
            market: 'Volatility 100 (1s) Index',
            multiplier: 'x300',
            stake: '5.88',
            currency: 'USD',
        });
    });
});
```

> **Flow 9.1** = `VERIFY Buy "Up" Multipliers Contract and Close (without TP/SL)` · **Flow 9.2** = `VERIFY Buy "Down" Multipliers Contract and Close (without TP/SL)`
>
> Both tests delegate to `buyUpAndVerify` / `buyDownAndVerify` on `TradeMultipliersPage`, which implement the full 17-step chain: configure → buy → positions → reports (open) → contract details (open, captures `buyId` + `entrySpot`) → close → closed positions tab → contract details (closed, asserts commission, stop out level, entry/exit details) → balance → reports (closed trade table + statement).
> Commission and stop out are captured pre-buy from the info panel and asserted exactly in the closed contract details.
> Mobile entry/exit detail dates render as `DD Mon YYYY`; the helper derives this format internally from the ISO `buyDate`.
>
> **Env vars:** `TEST_EMAIL_MULTIPLIERS` (desktop) / `TEST_EMAIL_MULTIPLIERS_MOBILE` (mobile) — dedicated funded accounts.
> **Fixture:** `tradeMultipliersPage` from `playwright/fixtures/fixtures.ts` · **Serial mode:** shared account state between Up and Down tests

---

### Flow 9.3 — Multipliers with Take Profit: set TP → buy Up → close

### Flow 9.4 — Multipliers with Take Profit: set TP → buy Down → close

```typescript
test.describe('Trade — Multipliers', { tag: ['@desktop', '@mobile', '@trade'] }, () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(async ({}, testInfo) => {
        const isMobile = testInfo.project.name.includes('mobile');
        const backupEmailVar = isMobile ? 'TEST_EMAIL_MULTIPLIERS_TP_MOBILE' : 'TEST_EMAIL_MULTIPLIERS_TP';
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

    test('VERIFY Buy "Up" Multipliers Contract With Take Profit and Close', async ({ tradeMultipliersPage }) => {
        await tradeMultipliersPage.buyUpAndVerify({
            market: 'Volatility 25 (1s) Index',
            multiplier: 'x160',
            stake: '10.00',
            currency: 'USD',
            riskManagement: { takeProfit: '30.01' },
        });
    });

    test('VERIFY Buy "Down" Multipliers Contract With Take Profit and Close', async ({ tradeMultipliersPage }) => {
        await tradeMultipliersPage.buyDownAndVerify({
            market: 'Volatility 25 (1s) Index',
            multiplier: 'x400',
            stake: '11.11',
            currency: 'USD',
            riskManagement: { takeProfit: '21.32' },
        });
    });
});
```

> **Flow 9.3** = `VERIFY Buy "Up" Multipliers Contract With Take Profit and Close` · **Flow 9.4** = `VERIFY Buy "Down" Multipliers Contract With Take Profit and Close`
>
> Both tests delegate to `buyUpAndVerify` / `buyDownAndVerify` on `TradeMultipliersPage` with a `riskManagement: { takeProfit }` param, which adds `setRiskManagement()` before the buy step. The full 18-step chain is identical to the no-TP flows (Flow 9.1/9.2) plus TP configuration, and additionally asserts the TP amount in both the open and closed contract details pages.
>
> **TP input race condition (mobile):** `setRiskManagement()` uses `pressSequentially` + `Tab` to blur the input, then `waitForTimeout(1500)` before clicking Save. The `is_api_response_tp_received_ref` flag must be `true` (set by the API response) for `onSave()` to proceed — the "acceptable range" hint from the store alone is not a reliable guard.
>
> **Commission source:** read pre-buy from `.multipliers-information__container` on the trade page (same locator on desktop and mobile). Not from the stake action sheet.
>
> **TP display in positions:** mobile renders `"30.01"` (no `+` prefix); desktop renders `"+30.01"`. The assertion branches on `isMobile`.
>
> **Env vars:** `TEST_EMAIL_MULTIPLIERS_TP` (desktop) / `TEST_EMAIL_MULTIPLIERS_TP_MOBILE` (mobile) — dedicated funded accounts.
>
> **Fixture:** `tradeMultipliersPage` from `playwright/fixtures/fixtures.ts` · **Serial mode:** shared account state between Up and Down tests

---

### Flow 9.5 — Multipliers with Stop Loss: set SL → buy Up → close

### Flow 9.6 — Multipliers with Stop Loss: set SL → buy Down → close

```typescript
test.describe('Trade — Multipliers', { tag: ['@desktop', '@mobile', '@trade'] }, () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(async ({}, testInfo) => {
        const isMobile = testInfo.project.name.includes('mobile');
        const backupEmailVar = isMobile ? 'TEST_EMAIL_MULTIPLIERS_SL_MOBILE' : 'TEST_EMAIL_MULTIPLIERS_SL';
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

    test('VERIFY Buy "Up" Multipliers Contract With Stop Loss and Close', async ({ tradeMultipliersPage }) => {
        await tradeMultipliersPage.buyUpAndVerify({
            market: 'Volatility 50 (1s) Index',
            multiplier: 'x200',
            stake: '25.05',
            currency: 'USD',
            riskManagement: { stopLoss: '21.10' },
        });
    });

    test('VERIFY Buy "Down" Multipliers Contract With Stop Loss and Close', async ({ tradeMultipliersPage }) => {
        await tradeMultipliersPage.buyDownAndVerify({
            market: 'Volatility 50 (1s) Index',
            multiplier: 'x600',
            stake: '25.00',
            currency: 'USD',
            riskManagement: { stopLoss: '23.01' },
        });
    });
});
```

> **Flow 9.5** = `VERIFY Buy "Up" Multipliers Contract With Stop Loss and Close` · **Flow 9.6** = `VERIFY Buy "Down" Multipliers Contract With Stop Loss and Close`
>
> Both tests delegate to `buyUpAndVerify` / `buyDownAndVerify` on `TradeMultipliersPage` with a `riskManagement: { stopLoss }` param, which adds `setRiskManagement()` before the buy step. The full 18-step chain is identical to the no-SL flows (Flow 9.1/9.2) plus SL configuration, and additionally asserts the SL amount in both the open and closed contract details pages.
>
> **SL input race condition (mobile):** `setRiskManagement()` uses `pressSequentially` + `Tab` to blur the input, then waits for the `slAcceptableRangeHint` to appear, then `waitForTimeout(1500)` before clicking Save. The `is_api_response_received_ref` flag must be `true` (set by the API response) for `onSave()` to proceed.
>
> **SL display in positions (mobile):** renders as `-21.10 ` (negative prefix + trailing space) — asserted with `new RegExp('^-${stopLoss}\\s*$')`. Desktop renders `-21.10`.
>
> **Mobile contract details assertions:** trade type (`Multipliers Up`/`Multipliers Down`), stake value (`25.05 USD`), TP badge absent, SL badge present, TP toggle `aria-pressed="false"`, SL toggle `aria-pressed="true"`, SL input value (`-21.10 USD`), start time contains `buyDate`, TP/SL history section with label and value rows.
>
> **Env vars:** `TEST_EMAIL_MULTIPLIERS_SL` (desktop) / `TEST_EMAIL_MULTIPLIERS_SL_MOBILE` (mobile) — dedicated funded accounts.
>
> **Fixture:** `tradeMultipliersPage` from `playwright/fixtures/fixtures.ts` · **Serial mode:** shared account state between Up and Down tests

---

### Flow 9.7 — Multipliers with Deal Cancellation: set DC → buy Up → cancel

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

> **Flow 9.7** = `VERIFY buy Up multiplier contract with deal cancellation and cancel` · **Flow 9.8** = `VERIFY buy Down multiplier contract with deal cancellation and cancel`

---

### Flow 10.1 / 10.2 / 10.3 / 10.4 — Turbos: buy → verify open → close early → verify closed

Turbos use **Up/Down tabs** (`.trade-params__option`) → a **single "Buy" button** (`.purchase-button--single`),
with unique **Payout per point** + **Barrier info** params and an optional **Take profit** (shared
standalone widget). They are early-sellable, so `TradeTurbosPage.buyTurbosAndVerify` uses a **Minutes**
duration + `verifyContractCardDetails` (remaining-time works), then closes early via
`ContractDetailsPage.sellContract()` (retries on `PriceMoved` slippage) and verifies the full closed
chain (Closed tab → balance → Reports). TP flows also assert the TP amount on the open contract details.
No inline locators — all via `TradeTurbosPage`.

```typescript
import { test } from '../../../fixtures/fixtures';
import { TradeBasePage } from '../../../pages/TradeBasePage';

// verify-turbos.spec.ts (Flow 10.1 / 10.2 — no Take Profit)
test.describe('Trade — Turbos', { tag: ['@desktop', '@mobile', '@trade'] }, () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, loginPage }) => {
        await TradeBasePage.seedLocalStorageOnOrigin(page);
        await loginPage.login(accountEmail, accountPassword);
    });

    test('VERIFY Buy "Up" Turbos Contract', async ({ tradeTurbosPage }) => {
        await tradeTurbosPage.buyTurbosAndVerify({
            market: 'Volatility 100 (1s) Index',
            direction: 'Up',
            stake: '10.50',
            currency: 'USD',
        });
    });

    test('VERIFY Buy "Down" Turbos Contract', async ({ tradeTurbosPage }) => {
        await tradeTurbosPage.buyTurbosAndVerify({
            market: 'Volatility 100 (1s) Index',
            direction: 'Down',
            stake: '10.50',
            currency: 'USD',
        });
    });
});

// verify-turbos-tp.spec.ts (Flow 10.3 / 10.4 — Take Profit 20.00) — same as above with `takeProfit: '20.00'`.
```

> `buyTurbosAndVerify` covers (in order): select market → select Turbos (asserts Duration / Payout per point / Take profit / Barrier info visible) → `selectDirection` → (TP flows) `setTakeProfit('20.00')` asserted on the form → `selectDuration('Minutes','5 min')` → `setStake` → `clickTurbosBuy` → verify open card + balance → open details `getBuyReferenceId` (+ TP flows assert TP on details) → `sellContract()` (early close, slippage-tolerant) → Closed tab `verifyClosedPositionsTab` + `getSellReferenceId` → `verifyBalanceAfterContractClose` → `verifyClosedContractInReports`.
> **Turbos buttons are "Up" / "Down"** (card label "Turbos Up" / "Turbos Down"). Source: `CONTRACT_TYPES.TURBOS.LONG → name 'Up'`, `SHORT → 'Down'`.
> **Flow 10.1/10.2** = `VERIFY Buy "Up"/"Down" Turbos Contract` · **Flow 10.3/10.4** = `... With Take Profit`

---

### Flow 11.1 — Vanillas: buy Call → verify in positions

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
> **Flow 11.1** = `VERIFY buy Vanillas Call contract and verify in positions` · **Flow 11.2** = `VERIFY buy Vanillas Put contract and verify in positions`

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
