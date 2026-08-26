## Why

The barrier field on Touch/No Touch cannot be used to place a trade ([#1144](https://github.com/deriv-com/derivatives-trader/issues/1144), consolidating [#1146](https://github.com/deriv-com/derivatives-trader/issues/1146)). Four problems compound: the barrier rejection error never states the accepted range or format, the field is pre-filled with an unusable hardcoded default (`+0.1`), the above/below control is confusing (two tabs), and the barrier types offered don't match what the API allows for the selected duration — so nothing the user enters is accepted and the trade type is untradable.

The root cause is that the frontend decides absolute-vs-relative barriers from a hardcoded `market === 'forex'` check plus a days-only condition, instead of reading the per-`expiry_type` default barrier that `contracts_for` already returns (and whose sign encodes offset-vs-absolute). That per-expiry default is already parsed into the store by `getBarriers` (`contract-type.ts:646-657`) but the AppV2 barrier input never uses it.

## What Changes

- **Derive barrier support (absolute vs relative) from the API's per-`expiry_type` default barrier sign**, not from the hardcoded `market === 'forex'` check. A leading `+`/`-` on the default barrier means a relative offset; a bare number means an absolute price. This correctly handles the per-contract-type reality (e.g. `touchnotouch` on `1HZ50V` ticks is relative `+39.37`, while `turbos` returns an absolute barrier at _every_ expiry type including tick) — a blanket "hide Fixed barrier on ticks" rule would be wrong.
- **Pre-populate the barrier field from the API default barrier for the current contract type + `expiry_type`** (already available in the store as `barrier_1` from `getBarriers`), replacing the hardcoded `+0.1` / `1.0000` fallbacks in the AppV2 barrier input. The hardcoded constants become a last-resort fallback only when the API provides no default.
- **Show the "Fixed barrier" option and the +/- offset control based on the API default's sign**, not on `!isDays && barrierSupport === 'relative'`. When the API default is relative, offer the offset control; when absolute, offer the fixed-price field.
- **Keep the "Above spot" / "Below spot" labelled options** for the relative barrier input, and drop "Fixed barrier" from that list — a relative barrier is a signed offset, so a fixed price is not one of its options. (An earlier revision of this change collapsed the two into a bare `+`/`-` toggle; reverted on review because the bare glyphs lost the meaning the labels carry.)
- **Barrier rejection errors state the accepted range (and format), consistently across every trade type that takes a barrier or range** (generalised from #1146). Surface the range from the proposal error's `code_args` (the `BarrierNotInRange` mapping already exists in `error-message-mapper.ts` but does not reach Touch/No Touch today) and from `barrier_choices` bounds when present; fall back to a clearer generic message that names the expected format.
- **Derive `contract_expiry_type` correctly at source.** It keys the per-expiry data `contracts_for` returns, but a reaction only ever wrote `'tick'` or `'intraday'`, so a days duration or a future end time resolved against the intraday entry. The reaction now uses `getExpiryType` — the same derivation the trade-params pipeline uses — so barrier support and duration limits both see the real expiry type and the two writers can no longer disagree.
- **Move the barrier re-seed onto that reaction.** `onChangeExpiry` used to re-seed barrier values when its own result differed from the store, which only worked while the store's value was derived incorrectly. The reaction owns the transition and re-seeds there, so crossing an expiry boundary (minutes → days flips relative to absolute) updates the barrier value as well as the control.
- Keep barrier values as strings with `pip_size` decimals throughout (no floating-point money arithmetic introduced).

## Capabilities

### New Capabilities

- `barrier-input`: How the barrier field determines absolute-vs-relative support, pre-populates its default, and presents the sign options — for Touch/No Touch and all other barrier trade types, on both AppV2 mobile and desktop.
- `barrier-range-errors`: How a rejected barrier (or range) surfaces the accepted range and expected format in its error message, consistently across every trade type that takes a barrier or range.

### Modified Capabilities

<!-- None. openspec/specs/ contains no existing spec covering barrier input or barrier validation messaging. -->

## Impact

- **Code (barrier support derivation — replace the forex hardcode):**
    - `packages/trader/src/Stores/Modules/Trading/trade-store.ts` — `getSymbolBarrierSupport` (lines 3075-3094) and the `BARRIER_DEFAULTS` fallbacks (lines 104-113, used at 3184-3200).
    - `packages/trader/src/AppV2/Components/TradeParameters/Barrier/barrier-input.tsx` — `getBarrierSupport` (29-44), `calculateInitialState` (49-86), default-fill effect (126-141), tab visibility (317-326), and the `barrier_tab_items` two-tab selector (14-18, 318-326).
    - `packages/trader/src/AppV2/Components/TradeParameters/Barrier/barrier-desktop.tsx` — duplicate `barrierSupport` memo (55-71) and `showBarrierTypes` (73).
    - `packages/trader/src/AppV2/Components/TradeParameters/Barrier/barrier-content-desktop.tsx` and `barrier-type-selector.tsx` — the desktop input/selector that consume `showBarrierTypes`.
- **Code (range in error messages — all trade types):**
    - `packages/trader/src/AppV2/Components/TradeParameters/Barrier/barrier-input.tsx` (apiValidationError, 170-178) and `barrier-content-desktop.tsx` — surface range from `code_args`.
    - `packages/shared/src/utils/error-mapping/error-message-mapper.ts` — barrier range/format message cases (`BarrierNotInRange`, `BarrierOutOfRange`, `BarrierValidationError`).
    - `packages/trader/src/Stores/Modules/Trading/Constants/validation-rules.ts` (barrier_1/barrier_2, 27-91) — client-side barrier messages.
    - `packages/trader/src/Stores/Modules/Trading/Helpers/proposal.ts` — `TValidationParams` (43-62) has no barrier entry; extend to carry a barrier range if/when the backend provides one.
- **Code (expiry-type derivation — the source fix):**
    - `packages/trader/src/Stores/Modules/Trading/trade-store.ts` — the reaction that owns `contract_expiry_type`, which now derives it with `getExpiryType` and re-seeds barrier values on an expiry-type transition.
    - `packages/trader/src/Stores/Modules/Trading/Actions/duration.ts` — `onChangeExpiry` no longer re-seeds barriers; it returns the expiry type only.
- **New files:** `packages/trader/src/AppV2/Components/TradeParameters/Barrier/barrier-error-utils.ts` (range/format message resolution), `packages/trader/src/Stores/Modules/Trading/__tests__/barrier-support.spec.ts` (support derivation + re-seed guards).
- **Consumed API data:** `contracts_for` per-expiry default barrier + `barrier_choices` (already captured at `contract-type.ts:135`, `getBarriers` 646-657, `getBarrierChoices` 679-683); proposal error `details.field` + `code_args`.
- **Tests:** `packages/trader/src/AppV2/Components/TradeParameters/Barrier/__tests__/` (barrier-input, barrier-desktop, barrier-type-selector, barrier-content-desktop, barrier) and `packages/trader/src/Stores/Modules/Trading/__tests__/barrier-reset.spec.ts`.
- **Backend dependency: none.** The unhelpful rejection was largely a symptom of offering "Fixed barrier" on a tick duration; with that gated correctly the rejection no longer occurs, and the rejections a user can still cause by hand are covered by `code_args`, `barrier_choices` and the format hint. No `validation_params.barrier` change is required — see Open Question 1.
- No routing, dependency, or data-model changes.
