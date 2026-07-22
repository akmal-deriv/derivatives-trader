# Feed Journey Coverage

**Analysis date:** 2026-07-20

---

## Section 1 — Coverage at a Glance

| #      | Journey                                                                         | Desktop | Mobile | Notes                                                                                                                                                                                                                                                               |
| ------ | ------------------------------------------------------------------------------- | ------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Flow 1 | All markets: feed active or closed state correct for every market in the dialog | ✅      | ✅     | ~65 symbols; `open` branch verifies live price; `session_gated` branch verifies CLOSED badge + reopen banner + countdown (or falls back to live price if market is open at runtime); both viewports use `TradeParametersPage.selectMarket()` search-based selection |

Full details → [flow.md — Flow 1](./flow.md#flow-1--all-markets-feed-active-or-closed-state-correct-for-every-market-in-the-dialog--feedverify-all-markets-streamingspects)

---

## Section 2 — Gaps

_No known gaps._

---

## Section 3 — Priority List

| Priority | Spec file                                   | Flow   | Reason                                                                              |
| -------- | ------------------------------------------- | ------ | ----------------------------------------------------------------------------------- |
| P0       | `feed/verify-all-markets-streaming.spec.ts` | Flow 1 | Confirms WebSocket feed is alive and all ~65 markets show correct open/closed state |
