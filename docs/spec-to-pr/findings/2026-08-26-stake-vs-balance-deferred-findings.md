# Deferred findings — stake-vs-balance client validation (#1245)

Recorded per `.buildwright/framework/findings.md` (class: **report-upstream**) while implementing
`docs/spec-to-pr/plans/2026-08-26-p2-buy-button-stays-enabled-and-quotes-a-payout-when-stake-is-5x-available-balance.md`.
These are issues better fixed at their source; this repo's fix (client-side validation rule +
AppV2 gating) is a UX guard on top, not a workaround that hides them.

## [ ] Proposal API quotes payouts with no balance awareness

- Symptom: with balance 0.77 USD and stake 4 USD, `proposal` streams a normal quote; the
  insufficient balance is only surfaced when `buy` fails with `InsufficientBalance`. Every client
  (web, mobile, third-party) must re-implement a stake-vs-balance guard to avoid quoting trades the
  user cannot place.
- Context: backend `proposal` service (outside this repo). Observed while fixing
  deriv-com/derivatives-trader#1245; client guard added in
  `packages/trader/src/Stores/Modules/Trading/Constants/validation-rules.ts` (`amount` rule #3).
- Upstream fix: for authorised proposal subscriptions, have `proposal` (or a validation field on
  its response, alongside the existing `validation_params`) flag stake > balance so clients can
  render the state without duplicating the rule.

## [ ] Desktop `basis === 'payout'` can still quote when the ask price exceeds balance

- Symptom: with basis = Payout, the `amount` field is the payout, not the debited stake, so the new
  client rule is deliberately conditioned off (`store.basis !== 'payout'`). The ask (buy) price of a
  payout-basis proposal can still exceed the balance; the user only finds out on `buy`
  (`InsufficientBalance`), same as the original bug but on the payout path.
- Context: decision A1 in the implementation plan; rule condition at
  `packages/trader/src/Stores/Modules/Trading/Constants/validation-rules.ts` (`amount` rule #3).
  Comparing a payout amount to the balance would be wrong, and the ask price is only known from the
  proposal response, not from the input value the validation pipeline sees.
- Upstream fix: same as the finding above (balance-aware `proposal` for authorised subscriptions
  covers the payout-basis path for free). A client-side follow-up could compare
  `proposal_info[type].stake` (the ask price) against the balance after each response, but that
  belongs to a separate change.

## [ ] Desktop purchase button derives disabled state from `!info.id` indirection

- Symptom: desktop Buy disables on validation errors only because `requestProposal()` wipes
  `proposal_info` (so `!info.id`), not because the button reads `validation_errors`
  (`packages/trader/src/Modules/Trading/Containers/purchase.tsx`,
  `packages/trader/src/Modules/Trading/Components/Elements/purchase-button.tsx`). It works, but the
  coupling is fragile: any future change that keeps a stale `proposal_info` around while validation
  errors exist would re-enable Buy incorrectly. (The AppV2 button now reads `validation_errors`
  directly after #1245.)
- Context: `packages/trader/src` desktop purchase path; noticed while extending the AppV2 button in
  `packages/trader/src/AppV2/Components/PurchaseButton/purchase-button.tsx`.
- Upstream fix: in-repo follow-up cleanup (not third-party): make the desktop purchase container
  read `validation_errors` explicitly, mirroring the AppV2 `has_trade_param_errors` gate.
