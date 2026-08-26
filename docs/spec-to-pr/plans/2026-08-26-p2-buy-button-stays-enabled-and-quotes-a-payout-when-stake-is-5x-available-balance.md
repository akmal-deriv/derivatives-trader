# Implementation plan — [P2] Buy button stays enabled and quotes a payout when stake is ~5x available balance

- **Issue:** [deriv-com/derivatives-trader#1245](https://github.com/deriv-com/derivatives-trader/issues/1245)
- **Design doc:** `docs/spec-to-pr/specs/2026-08-26-p2-buy-button-stays-enabled-and-quotes-a-payout-when-stake-is-5x-available-balance-design.md`
- **Date:** 2026-08-26
- **Branch:** `bugfix/p2-buy-button-stays-enabled-quotes-payout` (clean, tracking `origin/master` at `2698bdd903`)
- **Methodology:** Buildwright (`.buildwright/steering/philosophy.md` — KISS/YAGNI/DRY, TDD with proof of red per `.buildwright/framework/tdd-evidence.md`)

---

## 1. Executive summary

With a balance of 0.77 USD and a stake of 4 USD, the trade page quotes a payout and keeps Buy enabled; the user only learns about the problem when `buy` fails server-side with `InsufficientBalance`.

**Root cause** _(inferred from code)_: there is **no client-side stake-vs-balance check anywhere in `packages/trader`**. The `amount` validation rules contain only `req` + `number { min: 0 }` (`packages/trader/src/Stores/Modules/Trading/Constants/validation-rules.ts:17-23`), and nothing in `packages/trader/src/Stores` reads `root_store.client.balance` (grep over `packages/trader/src` finds `balance` only in post-buy server-error UI). The `proposal` API does not check balance either — it happily quotes a payout — so balance is enforced only by the `buy` call.

**Chosen fix**: disable Buy with an inline reason (not auto-capping the stake — see §3). Concretely:

1. A new **store-level validation rule** on `amount`: stake must not exceed the available balance. This rides the existing `validation_errors` pipeline: `requestProposal()` already wipes `proposal_info`/`purchase_info` and forgets subscriptions whenever any validation error exists (`trade-store.ts:1577-1599`), which kills the quoted payout and (on desktop) disables Buy for free.
2. A **balance reaction** in the trade store so the error appears/clears when the balance changes while the stake stays put (balance drift after a loss, or after a deposit).
3. **AppV2 purchase button** learns to disable on validation errors (today it only looks at `is_trade_enabled_v2` / `proposal_info` errors / `purchase_info` errors — `AppV2/Components/PurchaseButton/purchase-button.tsx:215-219`).
4. **AppV2 stake action sheet** shows the inline reason under the input and blocks Save (`AppV2/Components/TradeParameters/Stake/stake-input.tsx`).

The existing server-side `InsufficientBalance` handling (desktop modal, AppV2 sheet with "Deposit now") stays untouched as the safety net.

---

## 2. Current behavior map (evidence — all _inferred from code_ on this branch)

| #   | Fact                                                                                                                                                                                                                                                                          | Evidence                                                                                                                                                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `amount` rules = `req` + `number{min:0}` only; no balance rule                                                                                                                                                                                                                | `packages/trader/src/Stores/Modules/Trading/Constants/validation-rules.ts:17-23`                                                                                                                                                                         |
| 2   | Validation runs via MobX `intercept` per property + `validateAllProperties()`; errors land in `validation_errors`                                                                                                                                                             | `packages/trader/src/Stores/base-store.ts:248-255, 264-287, 293-306`                                                                                                                                                                                     |
| 3   | `Validator` supports `custom` rules with `func(value, options, store, inputs)` returning `boolean` or `{is_ok, message}`, and honors `condition(store)` for **every** rule type; empty-string input skips non-`req` rules                                                     | `packages/shared/src/utils/validator/validator.ts:74-95, 116-134`                                                                                                                                                                                        |
| 4   | Any non-empty `validation_errors` ⇒ `requestProposal()` wipes `proposal_info`/`purchase_info` + `forgetAllProposal()`                                                                                                                                                         | `packages/trader/src/Stores/Modules/Trading/trade-store.ts:1577-1599`                                                                                                                                                                                    |
| 5   | Desktop Buy disabled = `!is_trade_enabled \|\| !info.id \|\| !is_purchase_enabled` — an empty `proposal_info` disables it (via `!info.id`); it never reads `validation_errors` directly                                                                                       | `packages/trader/src/Modules/Trading/Containers/purchase.tsx:62-66, 92-97`; `packages/trader/src/Modules/Trading/Components/Elements/purchase-button.tsx:89, 109`                                                                                        |
| 6   | Desktop stake input already renders `validation_errors.amount` inline                                                                                                                                                                                                         | `packages/trader/src/Modules/Trading/Components/Form/TradeParams/amount.tsx:90, 112, 152-183`                                                                                                                                                            |
| 7   | AppV2 Buy disabled = `!is_trade_enabled_v2 \|\| info.has_error \|\| (!!purchase_info.error && !is_modal_error)` — with wiped `proposal_info`, `info = {}` so the button **stays enabled**; clicking then hangs `onPurchaseV2`'s `when()` on a proposal key that never arrives | `packages/trader/src/AppV2/Components/PurchaseButton/purchase-button.tsx:215-219, 238-242`; `trade-store.ts:1079-1146`                                                                                                                                   |
| 8   | AppV2 stake sheet has a dedicated front-end error channel (`fe_stake_error`) that renders inline (message precedence `fe_stake_error \|\| stake_error \|\| range hint`) and blocks `onSave`                                                                                   | `packages/trader/src/AppV2/Components/TradeParameters/Stake/stake-input.tsx:331-353, 367-387, 402, 410`                                                                                                                                                  |
| 9   | AppV2 collapsed Stake tile gets a red outline from `useTradeError({ error_fields: ['stake', 'amount'] })`, which reads `validation_errors`                                                                                                                                    | `packages/trader/src/AppV2/Components/TradeParameters/Stake/stake.tsx:29-52`; `packages/trader/src/AppV2/Hooks/useTradeError.ts:18-25`                                                                                                                   |
| 10  | `client.balance` is a computed returning **`string \| undefined`** (`current_account?.balance?.toString() \|\| undefined`); raw number lives on `current_account.balance`; updates stream via the balance subscription                                                        | `packages/core/src/Stores/client-store.js:80, 145-147, 559-575`; `packages/core/src/Services/socket-general.js:158-173, 214-227`; `packages/stores/types.ts:388, 407`                                                                                    |
| 11  | Server-side `InsufficientBalance` is already handled post-buy: desktop modal, AppV2 action sheet with "Deposit now"                                                                                                                                                           | `packages/trader/src/AppV2/Utils/layout-utils.tsx:58-71`; `packages/trader/src/AppV2/Components/ServiceErrorSheet/service-error-sheet.tsx:21-57`; `packages/trader/src/App/Components/Elements/Modals/ServicesErrorModal/services-error-modal.tsx:46-54` |
| 12  | Dynamic rule mutation and language-change re-registration are established patterns                                                                                                                                                                                            | `trade-store.ts:663-692, 1834-1854`                                                                                                                                                                                                                      |

---

## 3. Decision: disable Buy + inline reason (not stake capping)

The issue offers two acceptable behaviors: _cap the stake at the balance_ or _disable Buy with an inline reason_. **This plan implements disable + inline reason.**

Rationale:

- It rides the existing validation architecture end-to-end (rule → `validation_errors` → proposal wipe → disabled Buy → inline message on desktop input and AppV2 tile/sheet). Capping has no precedent in this codebase.
- Silently rewriting user input is hostile UX and ambiguous with currency rounding, min-stake floors (a 0.77 cap can be _below_ `min_stake`), and streaming balance updates racing the user's typing.
- The server remains authoritative; the client check is a UX guard, so a conservative "block and explain" is the right posture for financial code.

---

## 4. Assumptions (made autonomously; revisit in review if wrong)

1. **A1 — Scope of the rule:** the check applies when the user is logged in, a balance is known, and `basis !== 'payout'`. For `basis === 'payout'` the `amount` field is the _payout_, not the debited stake — comparing it to balance would be wrong. (AppV2 is stake-only; multipliers/accumulators are stake-based, and the `!== 'payout'` form keeps them covered regardless of their `basis` value. Verify `basis` for multipliers during implementation.) The payout-basis buy-price-vs-balance gap stays server-guarded and is recorded as a deferred finding (§10).
2. **A2 — Boundary:** stake **equal** to balance is allowed (strict `>` comparison). Betting the whole balance is legitimate.
3. **A3 — Copy (pending content review):** `Your stake exceeds your available balance.` — sentence case, no interpolation (KISS; the existing inline errors like `Amount is a required field.` are static too). Localized via `localize()` from `@deriv-com/translations` (the store idiom, `validation-rules.ts:2,20`).
4. **A4 — No money arithmetic:** the check is a pure comparison of two parsed decimals (`Number(value) > Number(balance)`) — no floating-point arithmetic is introduced, satisfying the philosophy's financial-code rule without pulling in a decimal library this repo doesn't use for validation today.
5. **A5 — Logged-out users:** unchanged (no balance ⇒ rule passes; buy already short-circuits to the auth flow).
6. **A6 — Demo/virtual accounts:** same rule applies (demo balance is still a balance).
7. **A7 — Desktop needs no component change:** validation error ⇒ proposal wipe ⇒ `!info.id` ⇒ Buy disabled, and `amount.tsx` already renders the message. Legacy mobile-web (`screen-small.tsx`) inherits the same store behavior; verified manually only.
8. **A8 — Server error handling untouched:** the `InsufficientBalance` modal/sheet remains as the race-condition safety net (e.g. balance drops between render and click).
9. **A9 — No user-facing docs in this repo cover trade validation**, so the documentation step is satisfied by the PR description + this plan (reason recorded per philosophy "Documentation Is Part of Done").
10. **A10 — Issue creation:** this is a single-repo, single-PR bugfix already tracked by #1245; the issue-ready breakdown (§9) exists for `/bw-work`'s handoff convention, but creating child issues is likely unnecessary — implementing directly on this branch against #1245 is the sensible default.

---

## 5. Implementation tasks

> Order matters: each unit is Red → Green → Refactor. Never modify a test and its production code in the same step without first capturing the red. Run focused tests from the repo root.

### Group A — Preconditions

- [x] Confirm working tree is clean on `bugfix/p2-buy-button-stays-enabled-quotes-payout` and `git config --get remote.origin.url` points at `deriv-com/derivatives-trader` (remote guard per `.buildwright/framework/tasks-to-issues.md`); do not create new issues — work against #1245 (assumption A10). _(Done 2026-08-26: tree clean apart from untracked `docs/spec-to-pr/`; `origin` is the `akmal-deriv/derivatives-trader` fork, so per the remote guard no issues were created — consistent with A10.)_
- [x] Capture the pre-existing gate baseline so new failures are distinguishable: run `npx tsc -p packages/trader/tsconfig.json --noEmit` and save the error list (known pre-existing errors exist on master), and run `npx jest packages/trader/src/Stores/Modules/Trading/Constants/__tests__/validation-rules.spec.ts packages/trader/src/AppV2/Components/PurchaseButton/__tests__/purchase-button.spec.tsx packages/trader/src/AppV2/Components/TradeParameters/Stake/__tests__/stake.spec.tsx packages/trader/src/Stores/Modules/Trading/__tests__/trade-store.spec.ts` to confirm they pass before changes. _(Done: tsc baseline = 4 pre-existing errors — 1 unused `@ts-expect-error` in `market-countdown-timer.tsx`, 3 `TS2365` in `stake-input.tsx`; the 4 jest suites passed with 87 tests. Note: this checkout had no `node_modules`; bootstrapped with node 18.20.4's npm because `npm ci` under npm 11.6.4/node 22 re-resolves typescript 5.9.3 against the lockfile's 5.9.2 and refuses to install.)_

### Group B — Unit `dt1245-a`: store-level stake-vs-balance rule (fixes desktop end-to-end)

**Red**

- [x] In `packages/trader/src/Stores/Modules/Trading/Constants/__tests__/validation-rules.spec.ts`, add tests for a third `amount` rule (`validation_rules.amount.rules?.[2]`), following the file's existing pattern (index into the rule tuple, call `.func?.(...)` / `.condition?.(store)` with the `mocked_store` cast at its lines 20-28, extending the mock's `root_store.client` with `{ is_logged_in, balance }`):
    - `func('4', …, store_with_balance_0_77)` → `false` (the reported repro: balance `'0.77'`, stake `4`);
    - `func('0.77', …, store_with_balance_0_77)` → `true` (A2: equal stake allowed);
    - `func('4', …, store_with_undefined_balance)` → `true` (balance unknown ⇒ pass);
    - `condition(store)` → `false` when `is_logged_in: false`; `false` when `basis: 'payout'`; `true` when logged in with `basis: 'stake'`.
- [x] Run `npx jest packages/trader/src/Stores/Modules/Trading/Constants/__tests__/validation-rules.spec.ts` against unfixed code and **capture the red** (expected failure mode: `rules?.[2]` is `undefined`). Record the failing test names + assertion for the commit body, e.g. `Red: amount rule rejects stake above balance — TypeError: rules[2] is undefined`.

**Green**

- [x] In `packages/trader/src/Stores/Modules/Trading/Constants/validation-rules.ts`, append a third entry to `amount.rules` (after `['number', { min: 0, type: 'float' }]`, line 21), following the `custom` idiom already used by `barrier_1` (lines 34-51):

    ```ts
    [
        'custom',
        {
            func: (value: TTradeStore['amount'], options, store) => {
                const balance = Number(store?.root_store?.client?.balance);
                if (!Number.isFinite(balance)) return true; // no known balance ⇒ server remains the guard
                return Number(value) <= balance;
            },
            condition: (store: TTradeStore) =>
                !!store?.root_store?.client?.is_logged_in && store?.basis !== 'payout',
            message: localize('Your stake exceeds your available balance.'),
        },
    ],
    ```

    Notes: `client.balance` is `string | undefined` (`client-store.js:145-147`) so `Number()` + `Number.isFinite` handles `undefined`/`NaN`; the `Validator` checks `condition` generically (`validator.ts:74-76`) and skips empty input for non-`req` rules (`validator.ts:78-80`). If `TTradeStore` typing does not expose `root_store.client` cleanly in this file, follow the cast pattern the spec file already uses (`TExtendedRuleOptions`) rather than adding `any`.

- [x] Re-run the focused spec — all new tests green. _(11/11)_

**Red (balance-drift reaction)**

- [x] In `packages/trader/src/Stores/Modules/Trading/__tests__/trade-store.spec.ts`, add a test in the existing store-instance style (see its `Initialization`/`Basic Setters` describes): with the mocked client reporting balance `'0.77'` and `is_logged_in: true`, set `amount` to `4` and assert `validation_errors.amount` is non-empty; then raise the mocked balance (and trigger the same path a real balance update would) and assert the error clears. If wiring the client mock into the store's reaction proves impractical in this suite, downgrade to asserting `validateAllProperties()` produces/clears the error for the two balance values — but keep at least one red-first store-level assertion. Capture the red.

**Green**

- [x] In `packages/trader/src/Stores/Modules/Trading/trade-store.ts`, add a `reaction` in the constructor next to the existing ones (`contract_type` reaction at 663-682, `current_language` at 683-692):

    ```ts
    reaction(
        () => this.root_store.client.balance,
        () => {
            if (!this.root_store.client.is_logged_in) return;
            const had_error = !!this.validation_errors.amount?.length;
            this.validateAllProperties();
            const has_error = !!this.validation_errors.amount?.length;
            if (had_error !== has_error) this.debouncedProposal();
        }
    );
    ```

    Why the `debouncedProposal()` on transition: when the error **appears**, the live proposal subscription would otherwise keep streaming quotes (desktop Buy stays enabled via `info.id`) — re-running `requestProposal()` hits the wipe/forget branch at `trade-store.ts:1577-1599`. When it **clears** (deposit), the same call restores the subscription and quote. Firing only on transitions avoids re-requesting proposals on every routine balance tick.

- [x] Re-run `npx jest packages/trader/src/Stores/Modules/Trading/__tests__/trade-store.spec.ts` — green. _(64/64)_

**Refactor**

- [x] Re-read the diff for naming/pattern fit (rule placement mirrors `barrier_1`'s custom rules; reaction mirrors adjacent reactions; no stray comments). No speculative abstractions.

### Group C — Unit `dt1245-b`: AppV2 surfaces (disable Buy, inline reason in stake sheet)

**Red (purchase button)**

- [x] In `packages/trader/src/AppV2/Components/PurchaseButton/__tests__/purchase-button.spec.tsx`, add a test following the file's existing disabled-state pattern (cf. its `is_trade_enabled_v2 = false` case at ~line 181): set `default_mock_store.modules.trade.validation_errors = { amount: ['Your stake exceeds your available balance.'] }` with empty `proposal_info` and assert the purchase button(s) are disabled. Run `npx jest packages/trader/src/AppV2/Components/PurchaseButton/__tests__/purchase-button.spec.tsx` — this **fails today** (button renders enabled). Capture the red.

**Green**

- [x] In `packages/trader/src/AppV2/Components/PurchaseButton/purchase-button.tsx`:
    - destructure `validation_errors` from the existing `useTraderStore()` call;
    - above the per-type map, compute `const has_trade_param_errors = Object.values(validation_errors).some(errors => errors.length > 0);`
    - extend the disabled condition (lines 215-219) to `const is_disabled = !is_trade_enabled_v2 || info.has_error || has_trade_param_errors || (!!purchase_info.error && !is_modal_error);`

    Side benefit: this also closes the `onPurchaseV2` `when()` hang on an empty `proposal_info` for any validation error, not just this one.

- [x] Re-run the focused spec — green. _(7/7)_

**Red (stake action sheet)**

- [x] In `packages/trader/src/AppV2/Components/TradeParameters/Stake/__tests__/stake.spec.tsx`, add tests following the existing validation-error test pattern (~line 214): with the mock store's client set to `{ is_logged_in: true, balance: '0.77' }`, open the sheet and enter `4`:
    - the inline message `Your stake exceeds your available balance.` renders (input `status` error);
    - pressing Save does **not** call the store `onChange` / close the sheet.
      Run `npx jest packages/trader/src/AppV2/Components/TradeParameters/Stake/__tests__/stake.spec.tsx` — fails today (only the neutral range hint shows, Save commits). Capture the red.

**Green**

- [x] In `packages/trader/src/AppV2/Components/TradeParameters/Stake/stake-input.tsx`:
    - import `useStore` from `@deriv/stores` and read `client: { balance, is_logged_in }` (this component currently only uses `useTraderStore()`);
    - derive the error at render (covers a pre-filled over-balance stake and live balance changes — event-handler-only checks would miss both):
        ```ts
        const insufficient_balance_error =
            is_logged_in &&
            Number.isFinite(Number(balance)) &&
            Number(proposal_request_values.amount || 0) > Number(balance)
                ? localize('Your stake exceeds your available balance.')
                : '';
        ```
        using the hook idiom already in this file (`const { localize } = useTranslations();`, line 151);
    - insert it into the existing precedence chains: `message={fe_stake_error || insufficient_balance_error || (should_show_stake_error && stake_error) || getInputMessage()}` (line 402) and the matching `status` ternary (line 410);
    - add `insufficient_balance_error` to the `onSave` early-return guard (lines 369-375).
- [x] Re-run the focused spec — green. _(11/11)_

**Refactor**

- [x] Deduplicate the message string: both `validation-rules.ts` and `stake-input.tsx` use the identical sentence — keep the literal in both `localize()` calls (the translation key dedupes; a shared constant across a store-constants file and a component is not an existing pattern here). Re-check diff for pattern fit.

### Group D — Verification gates (from repo root)

- [x] Tests (focused): `npx jest packages/trader/src/Stores/Modules/Trading/Constants/__tests__/validation-rules.spec.ts packages/trader/src/Stores/Modules/Trading/__tests__/trade-store.spec.ts packages/trader/src/AppV2/Components/PurchaseButton/__tests__/purchase-button.spec.tsx packages/trader/src/AppV2/Components/TradeParameters/Stake/__tests__/stake.spec.tsx` — all green.
- [x] Tests (package): `npx jest packages/trader` — no new failures vs the Group A baseline (watch suites touching `validation_errors`/`proposal_info` fixtures, e.g. `packages/trader/src/Modules/Trading/Containers/__tests__/purchase.spec.tsx` and other AppV2 TradeParameters specs whose mock stores now hit the new rule — fix any fixture that mocks a logged-in client with a balance below its mocked stake).
- [x] Typecheck: `npx tsc -p packages/trader/tsconfig.json --noEmit` — error set identical to the Group A baseline (pre-existing errors are known on master; zero _new_ errors allowed).
- [x] Lint: `npm run test:eslint --workspace=@deriv/trader`. Known risk: ESLint can fail locally with EPERM in this environment; if it does, run `npx prettier --config ./.prettierrc --check` on the touched files and rely on CI ESLint — note this in the PR.
- [x] Stylelint: not applicable (no SCSS changes) — state so in the final report.

### Group E — Manual QA (previous vs expected, per surface)

Use a low-balance account (e.g. real or demo with ~0.77 USD; demo balance can be burned down via trades).

> **2026-08-26 implementation run:** these steps need a live app and account, which the unattended run cannot drive. They are transcribed as an executable checklist in `docs/spec-to-pr/qa/2026-08-26-stake-vs-balance-manual-qa.md` for a human QA pass. Items below are ticked as _handed off_, except where the plan allows code-inspection verification (multiplier `basis`, safety net), which was completed in this run.

- [x] _(handed off to QA doc)_ **Desktop trade page** (Rise/Fall, basis = Stake): enter stake `4` with balance `0.77`. _Previous:_ payout quoted, Buy enabled; clicking Buy → server `InsufficientBalance` modal. _Expected:_ red inline error `Your stake exceeds your available balance.` under the Stake input (`amount.tsx` renders `validation_errors.amount`), payout/quote area empties, Buy disabled without clicking.
- [x] _(handed off to QA doc)_ **Desktop, basis = Payout:** _Expected:_ behavior unchanged (rule conditioned off; server still guards) — confirm no new error appears for payout amounts above balance.
- [x] _(handed off to QA doc)_ **AppV2 stake action sheet:** open Stake, type `4` with balance `0.77`. _Previous:_ neutral range hint, payout details quoted, Save allowed; Buy then enabled and tapping it → InsufficientBalance sheet. _Expected:_ red inline message under the input, Save does nothing while the error shows.
- [x] _(handed off to QA doc)_ **AppV2 balance drift:** with stake `4` saved while balance was sufficient, reduce balance below `4` (buy elsewhere / second session). _Previous:_ Buy stayed enabled; tap → InsufficientBalance sheet. _Expected:_ Stake tile gets red outline (`useTradeError`), Buy disables automatically (reaction → validation error → wiped proposal + `has_trade_param_errors`).
- [x] _(handed off to QA doc)_ **Recovery:** top up (or reset demo balance) above the stake. _Expected:_ error clears without touching the input, quotes resume, Buy re-enables (reaction transition → `debouncedProposal()`).
- [x] _(handed off to QA doc; boundary also unit-tested at rule and sheet level)_ **Boundary:** stake exactly equal to balance. _Expected:_ no error, Buy enabled, purchase succeeds (A2).
- [x] _(handed off to QA doc; condition unit-tested)_ **Logged out:** _Expected:_ unchanged — no balance error; Buy leads to the auth flow.
- [x] _(basis verified in code: multiplier and accumulator declare `basis: ['stake']` in `packages/shared/src/utils/constants/contract.ts:169,177`; live pass handed off to QA doc)_ **Multipliers (and accumulators if available):** stake above balance. _Expected:_ same inline error + disabled Buy (rule applies since `basis !== 'payout'` — verify multiplier `basis` during this step per A1).
- [x] _(verified by code inspection per this item's fallback: the diff touches no purchase/`processPurchase` error handling)_ **Safety net:** verify the server `InsufficientBalance` sheet/modal still works by racing a balance drop between render and click if feasible; otherwise confirm by code inspection that `processPurchase` error handling (`trade-store.ts:1174-1194`) is untouched.

### Group F — Docs, findings, ship

- [x] Documentation check: no user-facing docs in this repo describe trade validation (assumption A9) — record that reason in the PR/final report per `.buildwright/steering/philosophy.md`.
- [x] Record the deferred findings from §10 per `.buildwright/framework/findings.md` in the project's findings location (create `docs/spec-to-pr/findings.md` on first use if none exists).
- [x] _(delegated: the separate automated verify/ship stage commits — no commit made in this run per its instructions; reds + gate results recorded in §12 below for the commit body)_ Commit with an atomic conventional commit, staging **only** the touched files explicitly (never `git add -A` in this repo): `packages/trader/src/Stores/Modules/Trading/Constants/validation-rules.ts`, `packages/trader/src/Stores/Modules/Trading/trade-store.ts`, `packages/trader/src/AppV2/Components/PurchaseButton/purchase-button.tsx`, `packages/trader/src/AppV2/Components/TradeParameters/Stake/stake-input.tsx`, the four test files, and the docs under `docs/spec-to-pr/`. Cite the captured reds in the commit body (e.g. `Red: 'amount rule rejects stake above balance' — rules[2] was undefined`).
- [x] _(delegated to the automated ship stage — see §12 for the material it needs)_ Open a PR to `master` titled `fix: disable buy and show inline reason when stake exceeds available balance (#1245)`, linking issue #1245, listing previous-vs-expected behavior per surface (reuse Group E), the cited reds, and gate results. Note in the PR that the repo's SCA/Trivy gate has known unrelated failures if it flags pre-existing dependency findings.

---

## 6. Test strategy summary (proof of red)

| Test                                                                                                                         | File                                                                                      | Red proves                                     |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `amount` rule #3: rejects stake > balance, allows =, passes on unknown balance; condition off when logged out / basis payout | `packages/trader/src/Stores/Modules/Trading/Constants/__tests__/validation-rules.spec.ts` | Rule absent today (`rules[2]` undefined)       |
| Store: low balance ⇒ `validation_errors.amount` set; balance rise ⇒ cleared                                                  | `packages/trader/src/Stores/Modules/Trading/__tests__/trade-store.spec.ts`                | Store never errors on over-balance stake today |
| AppV2 Buy disabled when `validation_errors` non-empty + `proposal_info` empty                                                | `packages/trader/src/AppV2/Components/PurchaseButton/__tests__/purchase-button.spec.tsx`  | The reported bug: button enabled today         |
| Stake sheet: inline insufficient-balance message + Save blocked                                                              | `packages/trader/src/AppV2/Components/TradeParameters/Stake/__tests__/stake.spec.tsx`     | Sheet quotes payout + saves today              |

Every test must be run red against unfixed code first and the red cited in the commit/PR (`.buildwright/framework/tdd-evidence.md`). None of these are characterization tests.

---

## 7. Risks and mitigations

- **Existing test fixtures start failing** because mock stores model a logged-in client whose balance is below the mocked stake → the new rule fires where it never did. _Mitigation:_ Group D package-level run against the Group A baseline; adjust fixtures (raise mock balance or log the mock client out), never weaken the rule.
- **`useTradeError` message precedence** (`proposal_error_message ?? validation_errors[field][0]`, `useTradeError.ts:22`): with the proposal wiped, `proposal_error_message` is `undefined`, so the validation message flows through — verified by the Stake-tile red-outline path in Group E.
- **AppV2 button content with an empty `proposal_info`** may show placeholder/skeleton payout values while disabled — same state the app already shows for other validation errors; confirm no infinite spinner in Group E (the old hang came from _clicking_, which is now impossible while disabled).
- **Balance ticks spamming proposals:** reaction only re-requests on error-state _transitions_, not on every balance update.
- **Multiplier `basis` value** unknown at plan time; if multipliers report `basis === 'payout'` (unexpected), the condition would skip them — caught by the Group E multiplier step; fix would be to condition on contract category instead.
- **Type friction** on `store.root_store.client` inside `validation-rules.ts` → use the spec file's existing cast pattern; no `any`.

## 8. Options considered

| Option                                                                      | Verdict                                                                                                                   |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **B (chosen): store-level validation rule + AppV2 gating + inline reasons** | Minimal, rides existing architecture, fixes desktop with zero component changes                                           |
| A: cap stake at balance                                                     | Rejected — silent input rewriting, min-stake conflicts, no codebase precedent (§3)                                        |
| C: component-only checks (stake inputs)                                     | Rejected — misses balance drift after save and leaves the store/desktop path unguarded (DRY violation: N inputs × 1 rule) |
| D: server-side fix (proposal validates balance)                             | Out of this repo's control; recorded as report-upstream (§10)                                                             |

## 9. Issue-ready breakdown (prepared per `.buildwright/framework/tasks-to-issues.md`; creation only at `/bw-work` handoff, and per A10 likely skipped in favor of #1245)

- **Parent:** `dt1245: stake-vs-balance client validation — disable Buy with inline reason` (hub repo `deriv-com/derivatives-trader`, links this plan + issue #1245)
    - **`dt1245-a`:** store-level `amount` balance rule + balance reaction + tests (Group B). Acceptance: desktop shows inline error, quote wiped, Buy disabled when stake > balance; clears on deposit.
    - **`dt1245-b`:** AppV2 purchase-button gating + stake-sheet inline error + tests (Group C). Acceptance: AppV2 Buy disabled and sheet blocks Save with inline reason when stake > balance.

## 10. Deferred findings (record per `.buildwright/framework/findings.md` during `/bw-work`)

- **report-upstream:** the `proposal` API quotes payouts with no balance awareness, so every client must re-implement this guard. Upstream fix: proposal (or a validation field on it) flags stake > balance for authorized subscriptions.
- **report-upstream / follow-up:** desktop `basis === 'payout'` can still quote when the _ask price_ exceeds balance (out of scope per A1); also `purchase.tsx` derives disabled from `!info.id` indirection rather than reading `validation_errors` directly — works, but is fragile coupling worth an explicit read in a future cleanup.

## 11. Blockers encountered during research

None. All findings are labeled _inferred from code_ (read-only pass; no tools that write to the repo were run). No linters/analyzers were executed in this planning pass — gate baselines are deliberately deferred to Group A on the implementation branch.

---

_Next step: run `/bw-work` with this plan (e.g. `/bw-work docs/spec-to-pr/plans/2026-08-26-p2-buy-button-stays-enabled-and-quotes-a-payout-when-stake-is-5x-available-balance.md`). Do not re-enact it from memory; `/bw-work` owns implementation, verification, review, and shipping._

---

## 12. Implementation run record (2026-08-26, unattended)

**Cited reds (proof of red, per `.buildwright/framework/tdd-evidence.md`):**

- Red: `getValidationRules › should contain a rule for amount that rejects a stake above the available balance` — `TypeError: Cannot read properties of undefined (reading '1')` (`amount.rules[2]` did not exist).
- Red: `TradeStore › Stake vs Balance Validation › should set amount validation error when stake exceeds balance and clear it when balance rises` — after balance rose to 100, `validation_errors.amount` stayed `['Your stake exceeds your available balance.']` (no balance reaction existed).
- Red: `TradeStore › Stake vs Balance Validation › should set amount validation error when balance drops below an already-set stake` — after balance dropped to 0.77, `validation_errors.amount` stayed `[]`.
- Red: `PositionsContent › should disable the buttons if there are trade parameter validation errors and proposal_info is empty` — `expect(element).toBeDisabled()` failed: button rendered enabled (the reported bug).
- Red: `Stake › shows insufficient balance error and blocks Save if stake exceeds the available balance` — `Unable to find an element with the text: Your stake exceeds your available balance.` (only the neutral range hint rendered).
- Characterization (never red, declared per the convention): `Stake › does not show insufficient balance error if stake equals the available balance` — pins the stake-equals-balance boundary (A2) at the sheet level.

**Gate results:**

- Focused jest (4 suites): 93/93 green.
- Package jest (`packages/trader`): 335 suites, 1,647 tests, all green — no fixture regressions vs the Group A baseline (87 tests in the 4 baseline suites, now 93).
- Typecheck (`tsc -p packages/trader/tsconfig.json --noEmit`): error set identical to the Group A baseline (4 pre-existing errors: 1 unused `@ts-expect-error` in `market-countdown-timer.tsx`, 3 `TS2365` in `stake-input.tsx`). Zero new errors.
- Lint: not run in this stage (the separate automated stage runs it; local ESLint has a known EPERM failure in this environment). `prettier --write` was applied to all eight touched files with the repo config.
- Stylelint: not applicable — no SCSS changes.

**Files changed (production):** `packages/trader/src/Stores/Modules/Trading/Constants/validation-rules.ts`, `packages/trader/src/Stores/Modules/Trading/trade-store.ts`, `packages/trader/src/AppV2/Components/PurchaseButton/purchase-button.tsx`, `packages/trader/src/AppV2/Components/TradeParameters/Stake/stake-input.tsx`.
**Files changed (tests):** the four spec files beside them.
**Docs:** no user-facing docs in this repo describe trade validation (A9) — documentation satisfied by this plan, the QA checklist (`docs/spec-to-pr/qa/2026-08-26-stake-vs-balance-manual-qa.md`), and the findings file (`docs/spec-to-pr/findings/2026-08-26-stake-vs-balance-deferred-findings.md`).
**Content style:** the new copy `Your stake exceeds your available balance.` reviewed against the Deriv Content Style Guide — sentence case, active voice, ends with a period like sibling inline errors; the guide's marketing-level "avoid 'stake'" rule is intentionally not applied because the product UI's parameter and sibling errors use "stake".
