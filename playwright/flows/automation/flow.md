# 📋 Automation (Automated Trading) Journey Spec — What to Test

> **Purpose:** Describes the Automated Trading feature on `staging-dtrader.deriv.com`. Defines _what_ to verify at each step.
>
> **Feature location:** Trade page — Desktop: the **"Automated trading"** tab in the trade panel (`TradePanelTabs`). Mobile: the **`/automate`** route (reached via the **Automate** bottom-nav item).
> **URL:** `https://staging-dtrader.deriv.com/` (desktop tab) · `https://staging-dtrader.deriv.com/automate` (mobile)
> **Authentication:** Required — all tests start from a logged-in state
> **Staging only:** Requires a **funded real (staging test) account with Automation enabled** (non-EU/DIEL). On the default staging environment a `'real'` account uses virtual/test funds (no real money, no production). The run controls place actual (staging test) contracts, so a running bot must always be stopped in cleanup.

---

## Section 2 — Per-Flow Sections

### Flow 1 — Automation lifecycle: start strategy → Running → Stop

**Prerequisites:** Funded real (staging) account, Automation available (non-EU). Rise/Fall + Martingale defaults are sufficient. Use a small initial stake so the bot cannot burn much before it is stopped.

| #   | Step                      | Action                                                   | Expected Result                                                                                         | Platform |
| --- | ------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Login                     | `loginPage.login()`                                      | Redirected to the trade page; Deriv API settled                                                         | Both     |
| 2   | Open Automation           | Click the **"Automated trading"** tab in the trade panel | Automation panel visible — **Strategy parameters** + **Risk management** sections, **Run** button       | Desktop  |
| 2   | Open Automation           | Tap the **Automate** bottom-nav item → `/automate`       | Automation page loads; **Strategy parameters** + **Risk management** + **Run** button visible           | Mobile   |
| 3   | Verify default config     | Observe the panel                                        | **Strategy = Martingale**; **Run** button enabled (not "Starting...")                                   | Both     |
| 4   | Set a small initial stake | Set the trade-form **Stake** to a low value (e.g. `1`)   | Stake reflects the value                                                                                | Both     |
| 5   | Start the run             | Click **Run**                                            | Button changes to **"Starting..."** (disabled)                                                          | Both     |
| 6   | Verify Running            | Wait for the first contract to be observed               | **"Status: Running"** appears; **Pause** + **Stop** buttons visible; **"Contracts: N \| P/L: …"** shown | Both     |
| 7   | Stop the run              | Click **Stop**                                           | Run stops; controls return to the single **Run** button (idle state); status line disappears            | Both     |

> **No manual close of individual contracts** — the automation run is stopped via the **Stop** button; the bot manages its own contracts.
> **Cleanup:** an `afterEach` must stop any still-active run so tests remain independent (a second Run on an already-running account only shows an "Automation is already running" snackbar).

---

### Flow 2 — Pause and Resume a running automation

**Prerequisites:** Same as Flow 1; a run is active (Running).

| #   | Step        | Action           | Expected Result                                     | Platform |
| --- | ----------- | ---------------- | --------------------------------------------------- | -------- |
| 1   | Start a run | Run → Running    | "Status: Running"; Pause + Stop visible             | Both     |
| 2   | Pause       | Click **Pause**  | **"Status: Paused"**; the button becomes **Resume** | Both     |
| 3   | Resume      | Click **Resume** | **"Status: Running"**; the button becomes **Pause** | Both     |
| 4   | Stop        | Click **Stop**   | Run stops; back to the **Run** button               | Both     |

---

### Flow 3 — Risk threshold auto-stop (loss/profit threshold reached)

**Prerequisites:** Same as Flow 1. Set a very small **Loss threshold** (Stop loss) so the run auto-stops quickly.

| #   | Step               | Action                               | Expected Result                                            | Platform |
| --- | ------------------ | ------------------------------------ | ---------------------------------------------------------- | -------- |
| 1   | Set loss threshold | Enter a small **Stop loss** value    | Threshold saved                                            | Both     |
| 2   | Start a run        | Run → Running                        | "Status: Running"                                          | Both     |
| 3   | Wait for auto-stop | Let the run reach the loss threshold | Run stops automatically; a stop/completion message appears | Both     |

---

### Flow 4 — Strategy selection and parameters

**Prerequisites:** Same as Flow 1.

| #   | Step               | Action                                   | Expected Result                                          | Platform |
| --- | ------------------ | ---------------------------------------- | -------------------------------------------------------- | -------- |
| 1   | Open strategy list | Open the **Strategy** selector           | Options include **Martingale** and **D'Alembert**        | Both     |
| 2   | Select D'Alembert  | Choose **D'Alembert**                    | Strategy shows D'Alembert; its params/description update | Both     |
| 3   | Set params         | Set **Stake multiplier** / **Max stake** | Values persist                                           | Both     |
| 4   | Start + Stop       | Run → Running → Stop                     | Runs with the selected strategy, then stops              | Both     |

---

### Flow 5 — Resync after account switch (run stays Running)

**Prerequisites:** Same as Flow 1; a run is active on Account A; a second account available.

| #   | Step           | Action                              | Expected Result                                                                                        | Platform |
| --- | -------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------ | -------- |
| 1   | Start a run    | Run on Account A → Running          | "Status: Running"                                                                                      | Both     |
| 2   | Switch account | Switch to Account B, then back to A | Automation on A is re-adopted as **Running** (not stuck on "Starting..." and no manual refresh needed) | Both     |
| 3   | Stop           | Click **Stop**                      | Run stops                                                                                              | Both     |

> Guards the known intermittent "stuck on Starting…" resync behaviour (GRWT-9318).

---

### Flow 6 — Automation panel loads with default state

**Prerequisites:** Funded real (staging) account, Automation available.

| #   | Step            | Action                        | Expected Result                                                                                                                         | Platform |
| --- | --------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Open Automation | Enter the Automation tab/page | **Strategy parameters** header, **Strategy = Martingale**, **Stake multiplier**, **Risk management** header, **Run** button all visible | Both     |

---

### Flow 7 — Automation unavailable for EU account (gating)

**Prerequisites:** An **EU/DIEL** account.

| #   | Step              | Action                                | Expected Result                                             | Platform |
| --- | ----------------- | ------------------------------------- | ----------------------------------------------------------- | -------- |
| 1   | Check trade panel | Log in on an EU account, open trade   | The **"Automated trading"** tab is **not** available        | Desktop  |
| 1   | Check /automate   | Navigate to `/automate` on EU account | Redirected away from `/automate` (automation not available) | Mobile   |

---

## Gap Flows

> These are test cases for coverage gaps. The proposed spec file for each gap is in [`coverage.md`](./coverage.md).

### G1 — "Automation already running" adoption snackbar

| #   | Test case           | Steps                                                                | Expected Result                                                                           |
| --- | ------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | Already-running Run | With a run active, click **Run** again (or open in a second context) | Snackbar: **"Automation is already running for this account."**; no duplicate run started |

### G2 — Validation / unsupported-contract-type error

| #   | Test case              | Steps                                                                    | Expected Result                                                                          |
| --- | ---------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| 1   | Unsupported trade type | Select a trade type the strategy doesn't support, click **Run**          | Inline error banner (e.g. strategy does not support this trade type); run does not start |
| 2   | Invalid params         | Enter an invalid strategy parameter (e.g. multiplier ≤ 1), click **Run** | Validation error shown; run does not start                                               |
