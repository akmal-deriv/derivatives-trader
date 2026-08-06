# Suite 4 — Trade Parameter Interactions Across Trade Types

> **Story:** Reduce taps and steps for all non-stake/non-duration parameters by introducing direct toggles, +/- controls in expanded sections, and better information placement (e.g. Max payout in Buy button for Accumulators, Stop out improvements for Multipliers).
> **Owner:** @farabi-deriv
> **Depth:** Full coverage for Rise/Fall, Accumulators, Multipliers (the 3 trade types named explicitly in the issue). One smoke case per remaining trade type — expand to full coverage in a follow-up pass if regressions are found.

## Confirmed Behavior (exploration notes)

- Accumulators: "Max payout" is now shown **inside the Buy button** (`Buy` / `Max payout 10,000.00 USD`) instead of a separate row — confirmed on staging preview, matches the issue exactly.
- Accumulators: a new **"Stats" ticker row** appears above the trade params (a barometer-style strip of recent tick counts). Not mentioned explicitly in the issue text — confirm scope with @farabi-deriv (see README open questions).
- Duration and Stake fields themselves are covered in `02-duration-selection.md` / `03-stake-selection.md` — this suite covers the _other_ params per trade type.

---

## Rise/Fall

| ID          | Title                                         | Priority | Platform | Steps                                              | Expected Result                                                                                                                       | Status |
| ----------- | --------------------------------------------- | -------- | -------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| PARAM-RF-01 | Rise/Fall toggle                              | P0       | Both     | Tap/click "Fall" then "Rise"                       | Selected side is visually highlighted; Payout value updates to match the selected side (Rise vs Fall payout can differ)               | ⬜     |
| PARAM-RF-02 | Allow equals toggle                           | P1       | Both     | Tap/click the "Allow equals" toggle                | Toggle switches state; Payout recalculates (allow-equals typically reduces payout) — matches production parity                        | ⬜     |
| PARAM-RF-03 | Allow equals persists across Rise/Fall switch | P2       | Both     | Enable "Allow equals", toggle Rise ⇄ Fall          | Allow-equals stays enabled                                                                                                            | ⬜     |
| PARAM-RF-04 | Buy executes with correct contract params     | P0       | Both     | Set Rise, a duration, a stake, tap Buy (logged in) | Purchase confirmation reflects the exact type (Rise), duration, and stake selected — no param drift between UI and submitted contract | ⬜     |

## Accumulators

| ID           | Title                                                     | Priority | Platform | Steps                                                            | Expected Result                                                                                                | Status |
| ------------ | --------------------------------------------------------- | -------- | -------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------ |
| PARAM-ACC-01 | Growth rate selector                                      | P0       | Both     | Open growth rate control, select a different rate (e.g. 1% → 3%) | Growth rate updates; barrier range/Max payout adjust accordingly                                               | ⬜     |
| PARAM-ACC-02 | Take profit toggle off by default                         | P1       | Both     | Load Accumulators fresh                                          | Take profit field shows "-" / disabled state, matching production default                                      | ⬜     |
| PARAM-ACC-03 | Take profit enable + input                                | P1       | Both     | Enable Take profit, enter a value                                | Value accepted with same min/max validation as production; Buy button reflects the capped payout if applicable | ⬜     |
| PARAM-ACC-04 | Max payout shown in Buy button                            | P0       | Both     | Load Accumulators, observe Buy button                            | Buy button shows `Max payout <amount>` beneath "Buy" instead of a separate row above the button                | ⬜     |
| PARAM-ACC-05 | Max payout updates with stake                             | P0       | Both     | Change Stake                                                     | Max payout value inside the Buy button updates to match the new stake                                          | ⬜     |
| PARAM-ACC-06 | Stats ticker row renders                                  | P2       | Both     | Load Accumulators                                                | A tick-stats row is visible above the params (confirm scope — see suite header note)                           | ⬜     |
| PARAM-ACC-07 | Buy executes and contract matches growth rate/take profit | P0       | Both     | Set growth rate + take profit, tap Buy (logged in)               | Purchased contract's growth rate and take profit match what was configured                                     | ⬜     |

## Multipliers

| ID            | Title                                              | Priority | Platform | Steps                                                       | Expected Result                                                                                                                                                    | Status |
| ------------- | -------------------------------------------------- | -------- | -------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| PARAM-MULT-01 | Multiplier value selector                          | P0       | Both     | Open multiplier selector (e.g. x50/x100/x500), pick a value | Selected multiplier updates; Stop out level recalculates                                                                                                           | ⬜     |
| PARAM-MULT-02 | Stop loss toggle + input                           | P1       | Both     | Enable Stop loss, enter a value                             | Accepted within valid range; matches production min/max for the selected multiplier                                                                                | ⬜     |
| PARAM-MULT-03 | Take profit toggle + input                         | P1       | Both     | Enable Take profit, enter a value                           | Accepted within valid range                                                                                                                                        | ⬜     |
| PARAM-MULT-04 | Stop out display improvement                       | P0       | Both     | Load Multipliers with a given stake/multiplier              | Stop out level/amount is clearly shown per the redesign (confirm exact placement against Figma) and matches production's calculated value                          | ⬜     |
| PARAM-MULT-05 | Deal cancellation toggle                           | P1       | Both     | Enable "Deal cancellation" (if available for the symbol)    | Stop loss/Take profit inputs disable per production rules (deal cancellation is mutually exclusive with manual SL in production); price/fee for the option updates | ⬜     |
| PARAM-MULT-06 | Stop out recalculates on multiplier change         | P0       | Both     | Change the multiplier value                                 | Stop out level updates immediately to match                                                                                                                        | ⬜     |
| PARAM-MULT-07 | Buy executes and contract matches SL/TP/multiplier | P0       | Both     | Configure multiplier + SL + TP, tap Buy (logged in)         | Purchased contract's multiplier, stop loss, and take profit match configuration                                                                                    | ⬜     |

## Remaining Trade Types — Smoke Coverage

One case per type: confirm the redesigned param bar renders without missing/broken controls and Buy still works. Expand to full param-level cases if any of these fail.

| ID             | Trade Type      | Priority | Platform | Steps                                                                                   | Expected Result                                                         | Status |
| -------------- | --------------- | -------- | -------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------ |
| PARAM-SMOKE-01 | Matches/Differs | P2       | Both     | Select trade type, pick a digit, set duration/stake, tap Buy                            | Digit selector renders correctly; Buy executes with correct digit param | ⬜     |
| PARAM-SMOKE-02 | Over/Under      | P2       | Both     | Select trade type, pick a digit threshold, set duration/stake, tap Buy                  | Threshold selector renders correctly; Buy executes with correct param   | ⬜     |
| PARAM-SMOKE-03 | Even/Odd        | P2       | Both     | Select trade type, choose Even or Odd, set duration/stake, tap Buy                      | Toggle renders correctly; Buy executes with correct param               | ⬜     |
| PARAM-SMOKE-04 | Touch/No Touch  | P2       | Both     | Select trade type, confirm barrier control renders, set duration/stake, tap Buy         | Barrier input/selector renders correctly; Buy executes                  | ⬜     |
| PARAM-SMOKE-05 | Higher/Lower    | P2       | Both     | Select trade type, confirm barrier control renders, set duration/stake, tap Buy         | Barrier input renders correctly; Buy executes                           | ⬜     |
| PARAM-SMOKE-06 | Turbos          | P2       | Both     | Select trade type, confirm barrier/payout-per-point controls render, set stake, tap Buy | Controls render correctly; Buy executes                                 | ⬜     |
| PARAM-SMOKE-07 | Vanillas        | P2       | Both     | Select trade type, confirm strike/expiry controls render, set stake, tap Buy            | Controls render correctly; Buy executes                                 | ⬜     |

## Open Questions

- Confirm scope of the Accumulators "Stats" ticker row (PARAM-ACC-06) with @farabi-deriv — not called out in the issue text.
- Confirm whether the 7 smoke-only trade types have any redesign changes at all in this epic, or are explicitly unchanged/out of scope.
