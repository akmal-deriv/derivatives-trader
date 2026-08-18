## Open Questions

1. **Where does the valid range for the error message come from?**
    - (a) Proposal error `code_args` only (e.g. `BarrierNotInRange`) — FE-only, ships now, but only shows a range _after_ a rejected submit and only when the BE sends the subcode/args.
    - (b) (a) **plus** `barrier_choices` bounds when present, to also hint a range before submit — still FE-only.
    - (c) Add `validation_params.barrier` on the backend and read it proactively — most complete, but needs a BE change and cross-team coordination (Matin/@farabi-deriv per the issue).
    - **RESOLVED: (b). (c) is NOT needed.** The unhelpful rejection was largely a _symptom_ of offering "Fixed barrier" on a tick duration — the user was being pushed into entering a barrier the contract could never accept. With the option gated on the API-derived support type, that rejection no longer occurs. Rejections that remain are ones the user can still cause by hand (out-of-range value, too many decimals), and `code_args`/`barrier_choices`/the format hint cover those. No backend change is required, and the speculative `validation_params.barrier` wiring added for (c) has been removed rather than left as dead code.

2. **Shape of the sign control.** — **RESOLVED ON REVIEW: keep labelled "Above spot" / "Below spot" options.**
   The implementation first collapsed them into bare `+`/`-` glyphs; that was reverted because the glyphs dropped the meaning the labels carry. The reporter's actual complaint — a "Fixed barrier" option that cannot work for the selected duration — is addressed by gating the options on the derived support type, not by relabelling. The `+`/`-` addon on the input itself is unchanged.

3. **Who owns the shared support/default derivation?**
    - (a) A method on the trade store (near `getSymbolBarrierSupport`) reading `available_contract_types[type].config`.
    - (b) A pure util in `AppV2/Components/TradeParameters/Barrier/` imported by store + components.
    - **RECOMMENDED: (a)** — the store already exposes `barrier_1`/`barrier_choices` and the existing `getSymbolBarrierSupport`; extending it keeps one source of truth and is directly unit-testable in `barrier-reset.spec.ts`.

Tasks below proceed on the recommended defaults; a reviewer may override any answer before implementation.

## 1. Shared barrier-support + default derivation (source of truth)

- [x] 1.1 In `packages/trader/src/Stores/Modules/Trading/trade-store.ts`, add a method that derives barrier support for the current contract type + `expiry_type` from the API default barrier sign, reading `available_contract_types[type].config.barriers[expiry_type].barrier` (exposed via `ContractType`/`getBarriers`): leading `+`/`-` ⇒ `relative`, bare number ⇒ `absolute`.
- [x] 1.2 Rewrite `getSymbolBarrierSupport` (trade-store.ts:3075-3094) to use the API-default-sign derivation instead of the `market === 'forex'` branch, with `'relative'` as the fallback when no default/active_symbols are available (revised on review: `'absolute'` made the field flash a fixed-price control before the symbol list loaded, and nothing depended on the old value).
- [x] 1.3 Add a helper that returns the pre-populated default barrier for the current contract type + `expiry_type` from the store's `barrier_1` (set by `getBarriers`), falling back to `BARRIER_DEFAULTS` (trade-store.ts:104-113) only when the API default is absent.
- [x] 1.4 Update `handleTradeParamsResetOnSymbolChange` (trade-store.ts:3129-3226) so barrier reset defaults come from the API default where available, preserving the existing absolute/relative fallback constants otherwise.

## 2. Mobile barrier input (`barrier-input.tsx`)

- [x] 2.1 In `packages/trader/src/AppV2/Components/TradeParameters/Barrier/barrier-input.tsx`, replace the local `getBarrierSupport` (29-44) with the shared store derivation from Task 1.
- [x] 2.2 Change `calculateInitialState` (49-86) and the default-fill effect (126-141) to seed from the store's API default `barrier_1`, using `+0.1` / `1.0000` only as last-resort fallback.
- [x] 2.3 Keep the two sign options in the `HorizontalTabSelector`, labelled "Above spot" / "Below spot" (built in-component so they re-localise), and show them only for relative support; keep magnitude on sign toggle.
- [x] 2.4 Gate the fixed-price field vs the relative offset field on the derived support instead of `selectedTab === 2 || isDays` (329).
- [x] 2.5 Ensure `barrier_1` is written with the correct leading sign for relative and with no sign for absolute, unchanged for the proposal request (243-259, 287-296).

## 3. Desktop barrier input (`barrier-desktop.tsx`, `barrier-content-desktop.tsx`, `barrier-type-selector.tsx`)

- [x] 3.1 In `barrier-desktop.tsx`, replace the duplicated `barrierSupport` memo (55-71) and `showBarrierTypes` (73) with the shared derivation from Task 1.
- [x] 3.2 In `barrier-type-selector.tsx`, present "Above spot" / "Below spot" for relative support and the fixed-price option only for absolute support (drop the `!isDays`-driven "show all three" bucket).
- [x] 3.3 In `barrier-content-desktop.tsx`, seed the default from the store's API default `barrier_1` and align the input rendering (fixed vs relative) with the derived support.

## 4. Barrier/range error messaging (all trade types)

- [x] 4.1 In `packages/shared/src/utils/error-mapping/error-message-mapper.ts`, confirm/adjust the `BarrierNotInRange`, `BarrierOutOfRange`, and `BarrierValidationError` cases so a range or format hint is always produced from `code_args`; add a format-hint fallback message when no range args are present.
- [x] 4.2 In `barrier-input.tsx` (170-178) and `barrier-content-desktop.tsx`, ensure proposal errors with `details.field` of `barrier`/`barrier2` are routed through `mapErrorMessage` and that the range-bearing message takes precedence over generic client-side text.
- [x] 4.3 When `barrier_choices` bounds are available for the current contract type + expiry_type, surface them as a range hint in the message (per Open Question 1 recommended default (b)).
- [x] 4.4 In `packages/trader/src/Stores/Modules/Trading/Constants/validation-rules.ts` (barrier_1 27-59, barrier_2 60-91), keep the required/zero/relative-or-absolute checks but ensure their messages don't mask an API range message.
- [x] 4.5 ~~Extend `TValidationParams` with an optional `barrier` range entry~~ — **reverted.** Added, then removed once Open Question 1 resolved to "no backend change needed": the entry could never be populated, so it was dead code with a phantom dependency attached. `getBarrierErrorMessage` now takes only the error, `barrier_choices` and the support type.

## 4b. Expiry-type derivation at source (added on review)

- [x] 4b.1 Fix the trade-store reaction that owns `contract_expiry_type` to derive it with `getExpiryType` (tick / intraday / daily) instead of writing only `'tick'`/`'intraday'`, and depend on duration unit, expiry type, expiry date and duration units list.
- [x] 4b.2 Move the barrier re-seed on an expiry-type change out of `onChangeExpiry` (which could only detect a change by disagreeing with the store) and into that reaction, which sees the transition directly; skip the first resolve and leave the value alone when the new expiry type offers no barrier.
- [x] 4b.3 Remove the compensating indirections added while diagnosing this — the local expiry-type resolver in the barrier lookups and the per-caller support fallback — now that the observable is correct at source.

## 5. Tests

- [x] 5.1 Extend `packages/trader/src/Stores/Modules/Trading/__tests__/barrier-reset.spec.ts` to cover the new API-default-sign derivation: relative for `touchnotouch` tick (`+39.37`), absolute for `turbos` tick, absolute for forex — replacing the market-based assertions.
- [x] 5.2 Update `packages/trader/src/AppV2/Components/TradeParameters/Barrier/__tests__/barrier-input.spec.tsx`: default pre-populated from the API default (not `+0.1`), "Above spot" / "Below spot" shown for relative support with no "Fixed barrier" option, sign toggle preserves magnitude.
- [x] 5.3 Update `barrier-desktop.spec.tsx`, `barrier-type-selector.spec.tsx`, and `barrier-content-desktop.spec.tsx` for the derived-support presentation.
- [x] 5.5 Add `packages/trader/src/Stores/Modules/Trading/__tests__/barrier-support.spec.ts`: support per duration unit (tick/intraday/daily), Turbos absolute at tick, market-heuristic fallback, barrier re-seed across expiry transitions, and no blanking when the new expiry type offers no barrier. Each guard verified to fail with its fix reverted.
- [x] 5.6 Remove the four vacuous `isDays` tests from `barrier.spec.tsx` (they asserted only that a textbox rendered, and `BarrierInput` is mocked there so they could never have covered barrier type) and update `duration.spec.ts` for `onChangeExpiry`'s narrowed contract.
- [x] 5.4 Add error-message tests: a range-bearing proposal error (`BarrierNotInRange` with `code_args`) renders the accepted range on the barrier field, for Touch/No Touch and one other barrier trade type; a rangeless rejection renders the format hint.

## 6. Verification

- [x] 6.1 Run `npm run test:jest -- packages/trader/src/AppV2/Components/TradeParameters/Barrier` and `npm run test:jest -- packages/trader/src/Stores/Modules/Trading/__tests__/barrier-reset.spec.ts`; confirm all pass.
- [x] 6.2 Run `npm run test:eslint-all` (or the trader + shared workspace lint) and confirm no unused-import/type errors from removed hardcoded logic.
- [x] 6.3 Manual repro from the issue: `1HZ50V` → Touch/No Touch → ticks (5–10) → Barrier field. Confirm: relative offset control with "Above spot" / "Below spot" (no "Fixed barrier"), a usable API-scale default is pre-filled, a rejected barrier states the accepted range, and a Touch/No Touch trade can be placed.
- [x] 6.4 Regression check: a forex barrier contract still shows an absolute-price field and places a trade; turbos still shows an absolute barrier at tick duration.
- [x] 6.5 Update any affected docs/comments in the barrier components. The `validation_params.barrier` backend follow-up is recorded in this change's Open Question 1 and design notes rather than a separate before-production doc.
- [x] 6.6 Manual check that the barrier value and control both change when the duration crosses an expiry boundary (minutes → days → ticks), and that duration min/max still behaves on a days duration (that path now resolves against the `daily` entry).
