# Automation (Automated Trading) Journey Coverage

**Analysis date:** 2026-07-15

---

## Section 1 — Coverage at a Glance

| #      | Journey                                               | Desktop | Mobile | Notes                                                                                                                                                                                                                                                                                    |
| ------ | ----------------------------------------------------- | ------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Flow 1 | Lifecycle — start strategy → Running → Stop           | ✅      | ✅     | `verify-automation-lifecycle.spec.ts`                                                                                                                                                                                                                                                    |
| Flow 2 | Pause and Resume a running automation                 | ✅      | ✅     | `verify-automation-pause-resume.spec.ts`                                                                                                                                                                                                                                                 |
| Flow 3 | Risk threshold auto-stop (loss/profit threshold)      | ✅      | ✅     | `verify-automation-threshold-stop.spec.ts` — sets 5-tick duration + tiny loss threshold (`1`), asserts durable auto-stop (idle Run returns, no manual Stop). Snackbar is transient (`hasCloseButton:false`) so the durable stopped-state is asserted instead. 3/3 pass desktop + mobile. |
| Flow 4 | Strategy selection & params (Martingale / D'Alembert) | ✅      | ✅     | `verify-automation-strategy-selection.spec.ts` — default (Martingale) → open selector (both strategies offered) → select D'Alembert → set Stake increment via preset chip → Run → Running → Stop. 1/1 pass desktop + mobile.                                                             |
| Flow 5 | Resync after account switch (stays Running)           | ❌      | ❌     | Guards GRWT-9318 "stuck on Starting…"                                                                                                                                                                                                                                                    |
| Flow 6 | Automation panel loads with default state             | ✅      | ✅     | `verify-automation-panel-loads.spec.ts`                                                                                                                                                                                                                                                  |
| Flow 7 | Automation unavailable for EU account (gating)        | ❌      | ❌     | Requires an EU/DIEL account                                                                                                                                                                                                                                                              |
| G1     | "Automation already running" adoption snackbar        | ❌      | ❌     |                                                                                                                                                                                                                                                                                          |
| G2     | Validation / unsupported-contract-type error          | ❌      | ❌     |                                                                                                                                                                                                                                                                                          |

---

## Section 2 — Gaps

| Gap | Description                                                                                  | Proposed spec file                                     |
| --- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| G1  | Clicking Run while a run is already active shows an "already running" snackbar, no duplicate | `automation/verify-automation-already-running.spec.ts` |
| G2  | Unsupported trade type / invalid strategy params surface an error and block the run          | `automation/verify-automation-validation.spec.ts`      |

> Step-by-step test cases for each gap: [`flow.md — Gap Flows`](./flow.md#gap-flows)

---

## Section 3 — Priority List

| Priority | Spec file                                                 | Flow / Gap | Reason                                                       |
| -------- | --------------------------------------------------------- | ---------- | ------------------------------------------------------------ |
| P0       | `automation/verify-automation-lifecycle.spec.ts`          | Flow 1     | Core automation path — start → Running → Stop; gates release |
| P1       | `automation/verify-automation-panel-loads.spec.ts`        | Flow 6     | Panel renders with defaults — fast smoke check               |
| P1       | `automation/verify-automation-pause-resume.spec.ts`       | Flow 2     | Primary run controls after start                             |
| P1       | `automation/verify-automation-threshold-stop.spec.ts`     | Flow 3     | Risk control is the key safety feature of automation         |
| P2       | `automation/verify-automation-strategy-selection.spec.ts` | Flow 4     | Strategy/param configuration                                 |
| P2       | `automation/verify-automation-resync.spec.ts`             | Flow 5     | Account-switch resync — guards a known intermittent bug      |
| P2       | `automation/verify-automation-already-running.spec.ts`    | G1         | Duplicate-run guard / snackbar                               |
| P2       | `automation/verify-automation-validation.spec.ts`         | G2         | Error paths — unsupported type / invalid params              |
| P3       | `automation/verify-automation-eu-gating.spec.ts`          | Flow 7     | Negative gating — needs a dedicated EU account               |
