# Manual QA — stake-vs-balance validation (#1245)

Status: **prepared, not yet executed** — these steps need a running app and a low-balance account
(real or demo with ~0.77 USD; a demo balance can be burned down via trades), which the unattended
implementation run cannot drive. Execute per surface and tick each item.

Change under test: stake > available balance now fails client-side validation
(`Your stake exceeds your available balance.`), which wipes the proposal quote and disables Buy;
AppV2 purchase button also disables on any trade-parameter validation error, and the AppV2 stake
sheet shows the message inline and blocks Save. On AppV2 the reason is surfaced by the trade-page
snackbar plus a red outline on the Stake tile: store validation errors bypass the "only one subtype
errored" suppression gate (`useTradeError.is_validation_error`), which the proposal wipe would
otherwise close on two-button trade types (Rise/Fall, Digits).

## Checklist (previous vs expected, per surface)

- [ ] **Desktop trade page** (Rise/Fall, basis = Stake): enter stake `4` with balance `0.77`.
    - _Previous:_ payout quoted, Buy enabled; clicking Buy → server `InsufficientBalance` modal.
    - _Expected:_ red inline error `Your stake exceeds your available balance.` under the Stake input,
      payout/quote area empties, Buy disabled without clicking.
- [ ] **Desktop, basis = Payout**: enter a payout amount above the balance.
    - _Expected:_ behaviour unchanged (rule conditioned off; server still guards) — no new inline
      error for payout amounts above balance.
- [ ] **AppV2 stake action sheet**: open Stake, type `4` with balance `0.77`.
    - _Previous:_ neutral range hint, payout details quoted, Save allowed; Buy then enabled and
      tapping it → InsufficientBalance sheet.
    - _Expected:_ red inline message under the input; Save does nothing while the error shows.
- [ ] **AppV2 trade page, Rise/Fall (two Buy buttons, no tabs)**: land on the trade page logged in
      with balance `0.77` and the default stake `10`.
    - _Previous:_ payout quoted on both buttons, both enabled; tap → InsufficientBalance sheet.
    - _Expected:_ both Buy buttons disabled **and** the error snackbar
      `Your stake exceeds your available balance.` appears, with a red outline on the Stake tile.
      (Regression guard: before the `is_validation_error` bypass the buttons went dead silently here.)
- [ ] **AppV2 trade page, a Digits type** (e.g. Matches/Differs, also two buttons and no tabs):
      same as the Rise/Fall step above — snackbar + red Stake tile, not a silent disable.
- [ ] **AppV2 balance drift**: with stake `4` saved while balance was sufficient, reduce balance
      below `4` (buy elsewhere / second session).
    - _Previous:_ Buy stayed enabled; tap → InsufficientBalance sheet.
    - _Expected:_ error snackbar fires, Stake tile gets a red outline (`useTradeError`), Buy disables
      automatically (balance reaction → validation error → wiped proposal + `has_trade_param_errors`).
- [ ] **Recovery**: top up (or reset demo balance) above the stake.
    - _Expected:_ error clears without touching the input, the Stake tile returns to neutral, quotes
      resume, Buy re-enables (reaction transition → `debouncedProposal()`).
- [ ] **Suppression preserved**: on Rise/Fall, trigger a proposal error that hits only one subtype
      (e.g. a stake below the minimum for one direction only, if reproducible).
    - _Expected:_ unchanged — no snackbar and no red Stake tile for that single-subtype error.
- [ ] **Boundary**: stake exactly equal to balance.
    - _Expected:_ no error, Buy enabled, purchase succeeds (stake = balance is allowed).
- [ ] **Logged out**: _Expected:_ unchanged — no balance error; Buy leads to the auth flow.
- [ ] **Multipliers (and accumulators if available)**: stake above balance.
    - _Expected:_ same inline error + disabled Buy. (Both types declare `basis: ['stake']` in
      `packages/shared/src/utils/constants/contract.ts`, verified in code, so the
      `basis !== 'payout'` condition covers them.)
- [ ] **Legacy mobile-web** (`screen-small.tsx`): same as desktop — inherits the store behaviour;
      verify the inline error and disabled Buy.
- [ ] **Safety net**: the server `InsufficientBalance` sheet/modal still works if a balance drop
      races the click. Verified by code inspection that `processPurchase` error handling in
      `trade-store.ts` is untouched by this change; a live race check is optional.
