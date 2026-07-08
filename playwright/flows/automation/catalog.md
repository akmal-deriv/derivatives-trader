# 🗺️ Automation (Automated Trading) Journey Catalog — Technical Reference

> Source of truth: `playwright/pages/TradeAutomationPage.ts` (to be created — extends `TradeParametersPage → TradeBasePage`)
> Source components: `packages/trader/src/AppV2/Components/AutomationPanel/` · `packages/trader/src/AppV2/Hooks/useRunControls.ts` · `packages/trader/src/Stores/Modules/Trading/automation-store.ts` · `packages/trader/src/AppV2/Components/TradePanelTabs/trade-panel-tabs.tsx` · `packages/trader/src/AppV2/Routes/AutomateSwitch.tsx`
> Created: 2026-07-07 | Last updated: 2026-07-07

---

## Section 1 — Journey Index

| Journey ID | Spec File                                                 | Tags                                           |
| ---------- | --------------------------------------------------------- | ---------------------------------------------- |
| Flow 1     | `automation/verify-automation-lifecycle.spec.ts`          | `@automation @smoke @desktop @mobile @staging` |
| Flow 2     | `automation/verify-automation-pause-resume.spec.ts`       | `@automation @desktop @mobile @staging`        |
| Flow 3     | `automation/verify-automation-threshold-stop.spec.ts`     | `@automation @desktop @mobile @staging`        |
| Flow 4     | `automation/verify-automation-strategy-selection.spec.ts` | `@automation @desktop @mobile @staging`        |
| Flow 5     | `automation/verify-automation-resync.spec.ts`             | `@automation @desktop @mobile @staging`        |
| Flow 6     | `automation/verify-automation-panel-loads.spec.ts`        | `@automation @smoke @desktop @mobile @staging` |
| Flow 7     | `automation/verify-automation-eu-gating.spec.ts`          | `@automation @desktop @mobile @staging`        |
| G1         | `automation/verify-automation-already-running.spec.ts`    | `@automation @desktop @mobile @staging`        |
| G2         | `automation/verify-automation-validation.spec.ts`         | `@automation @desktop @mobile @staging`        |

---

## Section 2 — Flow Details

### Flow 1 — Automation lifecycle: start → Running → Stop

**Account setup** (mirror `verify-rise-fall.spec.ts`; automation runs on a funded **real (staging test)** account with automation enabled — non-EU. Note: on the default **staging** environment a `'real'` account is a virtual/test account funded via top-up — no real money, no production — matching the rest of the trade suite):

```typescript
// beforeAll — one funded real (staging test) account for the suite (serial mode)
const account = await createAccountV2viaJS('real', {
    currency: 'USD',
    trading: true,
    backupAccount: process.env[isMobile ? 'TEST_EMAIL_AUTOMATION_MOBILE' : 'TEST_EMAIL_AUTOMATION'],
});
// beforeEach
await TradeBasePage.seedLocalStorageOnOrigin(page); // seeds automation_onboarding_completed etc.
await loginPage.login(account.email, account.password);
```

**Test pattern:**

```typescript
await NavigationUtils.waitForDerivApiSettled(page);
await tradeAutomationPage.openAutomation(); // desktop: "Automated trading" tab · mobile: Automate bottom nav (/automate)
await tradeAutomationPage.verifyPanelDefaultState(); // Strategy = Martingale, Run button enabled
await tradeAutomationPage.setStake('1'); // low stake (inherited from TradeParametersPage)
await tradeAutomationPage.startRun(); // click Run → "Starting..."
await tradeAutomationPage.verifyRunning(); // "Status: Running" + Pause/Stop + "Contracts: N | P/L: …"
await tradeAutomationPage.stopRun(); // click Stop
await tradeAutomationPage.verifyStopped(); // controls return to single "Run" button
```

**Cleanup (required):**

```typescript
test.afterEach(async ({ tradeAutomationPage }) => {
    await tradeAutomationPage.stopRunIfActive(); // stop any run so the next test starts clean
});
```

**Method chain covered by `verifyRunning()` (in order):**

1. Wait for **"Status: Running"** text (tolerate the transient "Starting..." — poll with a generous timeout; the run only flips to Running once the first contract is observed)
2. Assert **Pause** and **Stop** buttons visible
3. Assert stats line **"Contracts: N | P/L: X USD"** present

> **Fixture:** `tradeAutomationPage` (register in `playwright/fixtures/fixtures.ts`)
> **Serial mode:** `test.describe.configure({ mode: 'serial' })` — a running bot is shared state
> **Env vars (optional backups):** `TEST_EMAIL_AUTOMATION` / `TEST_EMAIL_AUTOMATION_MOBILE`

### Flows 2–7 + G1/G2

Lower priority — implement after Flow 1. See `flow.md` for step tables. They reuse the same POM: `openAutomation()`, `startRun()`, plus `pauseRun()` / `resumeRun()` (Flow 2), threshold setters (Flow 3), `selectStrategy()` (Flow 4), account switching + `verifyRunning()` (Flow 5), `verifyPanelDefaultState()` (Flow 6), EU-account gating assertions (Flow 7), and the already-running snackbar / validation-error assertions (G1/G2).

---

## Section 3 — Tags Reference

| Tag           | When to apply                                                  |
| ------------- | -------------------------------------------------------------- |
| `@automation` | All Automated Trading tests (this module)                      |
| `@smoke`      | Critical path — the lifecycle (Flow 1) and panel-load (Flow 6) |
| `@staging`    | Uses account creation (`createAccountV2viaJS`) — not prod-safe |
| `@desktop`    | Desktop viewport (chromium project)                            |
| `@mobile`     | Mobile viewport (chromium-mobile project)                      |

---

## Section 4 — Feature-Specific Decisions

### No data-testids on the automation panel

The Automation panel and run controls (`automation-panel.tsx`, `automation-actions.tsx`) expose **no `data-testid`s**. Locate via Quill button labels, status text, and stable classes:

**Impact on generated code:** the Page Object must use:

- **Run:** `getByRole('button', { name: 'Run' })` — or `.automation-actions__run-button`
- **Starting:** the Run button's label becomes `Starting...` and it is disabled
- **Status:** `getByText('Status: Running')` / `getByText('Status: Paused')`
- **Stats:** `getByText(/Contracts:.*P\/L:/)`
- **Pause / Resume:** `getByRole('button', { name: 'Pause' })` / `{ name: 'Resume' }`
- **Stop:** `getByRole('button', { name: 'Stop' })` — or `.automation-actions__run-stop`
- **Panel headers:** `getByText('Strategy parameters')`, `getByText('Risk management')`
- **Strategy default:** the selector shows **Martingale** by default (`DEFAULT_AUTOMATION_CONFIG.strategy = 'martingale'`); options include Martingale and D'Alembert

### Entry point is viewport-specific — `openAutomation()` branches on `isMobile`

- **Desktop:** click the **"Automated trading"** tab in `TradePanelTabs` (a Quill `SegmentedControlSingleChoice`, `.trade-panel-tabs__toggle`, 2nd option, tooltip content `Automated trading`). The tab is **icon-only** — its accessible name may come from the tooltip. Try `getByRole('button', { name: 'Automated trading' })`; if not resolvable, click the 2nd segmented item in `.trade-panel-tabs`. **Verify the exact locator on staging / via MCP.**
- **Mobile:** tap the **Automate** bottom-nav item (label "Automate") → navigates to `/automate` (`routes.trader_automate`). The `AutomateSwitch` route renders `automate-mobile.tsx`.

### Async run-status transitions — never use fixed waits

`run_status` moves `idle → starting → running → stopping → stopped` over the WebSocket. After **Run**, the store holds `starting` until the **first contract is observed**, then flips to `running`.

**Impact on generated code:** assert `Status: Running` with `expect(...).toBeVisible({ timeout: 60_000 })` (or `expect.poll`); tolerate the transient `Starting...`. Never `waitForTimeout`.

### It runs a live bot — low stake + mandatory cleanup

Starting a run places actual (staging test) contracts continuously until stopped.

**Impact on generated code:** use a **low initial stake** (e.g. `1`), run **serial**, and **always Stop** the run in `afterEach` (`stopRunIfActive()`). A second **Run** on an account with an active run does **not** start a duplicate — it shows the snackbar _"Automation is already running for this account."_ (so leftover runs break the next test).

### Automation reuses the shared trade form

Trade type (Rise/Fall), duration, and **Stake** come from the shared trade params (`TradeParametersPage`). The automation panel only adds strategy / stake-multiplier / max-stake / thresholds.

**Impact on generated code:** `TradeAutomationPage` should **extend `TradeParametersPage`** so it inherits `selectMarket`, `selectTradeType`, `setStake`, etc., and add only the automation-specific locators/actions.

### Feature gating — non-EU account required

Automation availability is controlled by `useIsAutomationEnabled` (EU/DIEL accounts don't get it). Flow 7 covers EU gating; all other flows require an account where automation is available.

**Impact on generated code:** the primary suite must use a **non-EU** account; Flow 7 uses an EU account and asserts the tab is absent / `/automate` redirects.

### Page Object section ordering

`TradeAutomationPage` follows: **LOCATORS** → **ACTIONS** (public then private) → **VERIFICATIONS** (public then private), matching the other trade POMs.
