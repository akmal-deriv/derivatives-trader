## Context

The barrier field for Touch/No Touch (and other barrier trade types) lives in two AppV2 places:

- **Mobile:** `packages/trader/src/AppV2/Components/TradeParameters/Barrier/barrier-input.tsx` — an ActionSheet with a two-tab `barrier_tab_items` selector (`above_spot` / `below_spot` / `fixed_barrier`), a `getBarrierSupport()` callback, `calculateInitialState()`, and a default-fill effect.
- **Desktop:** `barrier-desktop.tsx` → `barrier-type-selector.tsx` + `barrier-content-desktop.tsx`, with its own duplicated `barrierSupport` memo.

Both decide absolute-vs-relative from a hardcoded `market === 'forex'` check and gate the type tabs on `!isDays && barrierSupport === 'relative'`. Both fall back to a hardcoded default (`+0.1` relative, `1.0000` absolute). The store mirrors the same forex check in `getSymbolBarrierSupport` (`trade-store.ts:3075-3094`) and `BARRIER_DEFAULTS` (`104-113`).

Crucially, the correct data is **already in the store**: `contracts_for` returns one entry per contract type per `expiry_type`, each with its own `barrier` default and `barrier_choices`. `contract-type.ts` captures these (`config.barrier_choices` at line 135; `getBarriers` at 646-657 reads `barriers[expiry_type].barrier` into `barrier_1`; `getBarrierChoices` at 679-683). The sign of that default barrier (`+`/`-` vs bare number) is exactly the offset-vs-absolute signal the UI is currently guessing at. The barrier input simply doesn't read it.

For errors: `error-message-mapper.ts` already maps `BarrierNotInRange` to a range-bearing message using `code_args`, and `barrier-input.tsx` (170-178) already calls `mapErrorMessage` on proposal errors whose `details.field` is `barrier`/`barrier2`. But `validation_params` (`proposal.ts:43-62`) has no barrier entry, and nothing reads a barrier range proactively, so on Touch/No Touch the user sees an unqualified rejection.

## Goals / Non-Goals

**Goals:**

- Make Touch/No Touch tradable: derive barrier support from the API per-expiry default, pre-populate the API default, keep the sign options clearly labelled, and surface the accepted range in the rejection message.
- Fix the general case (#1146): barrier/range errors state the accepted range and format across every barrier trade type.
- Single source of truth for barrier support + default, shared by mobile and desktop.

**Non-Goals:**

- Changing the backend proposal/`contracts_for` contract. No BE change is required (see Open Question 1): the range gap was largely a symptom of the barrier-type bug this change fixes.
- Reworking non-barrier trade parameters or the duration picker.
- Changing how `contracts_for` is fetched/cached (`useContractsFor.ts`) or the accumulator/vanilla/turbos barrier-choices flows already in the store.
- Visual redesign of the barrier control beyond removing options that do not apply to the derived support type.

## Decisions

- **Derive support from the API default barrier sign, not the market.** Replace the `market === 'forex'` branches in `getSymbolBarrierSupport` (store) and the duplicated `getBarrierSupport`/`barrierSupport` (mobile + desktop) with a helper that inspects the default barrier for the _current contract type + `expiry_type`_ from `available_contract_types[type].config.barriers[expiry_type].barrier`: leading `+`/`-` ⇒ `relative`, bare number ⇒ `absolute`. _Alternatives:_ (a) keep the forex check and special-case ticks — rejected, wrong for turbos (absolute at tick) and still a guess; (b) read only `barrier_choices` — rejected, choices may be absent while a default barrier is present.
- **Pre-populate from `barrier_1` (already set by `getBarriers`) instead of `+0.1`.** In `barrier-input.tsx`/`barrier-content-desktop.tsx`, when the field opens empty, seed from the store's `barrier_1` (the API default) and only fall back to `BARRIER_DEFAULTS` when it is absent. _Alternative:_ fetch the default separately in the component — rejected, duplicates data already in the store.
- **Gate the "Fixed barrier"/offset presentation on the derived support, not `!isDays`.** The `isDays` short-circuit (`selectedTab === 2 || isDays`) is a proxy for "absolute"; replace it with the derived support so ticks that are genuinely relative get the offset control and daily/absolute contracts get the fixed field.
- **Keep "Above spot" / "Below spot" labels; drop "Fixed barrier" from the relative list.** A relative barrier is a signed offset, so the only choice is the sign — `fixed_barrier` appears only when support is absolute. Preserve the entered magnitude when toggling. _Revised on review:_ an earlier revision collapsed the two options into bare `+`/`-` glyphs; that was reverted because the glyphs dropped the meaning the labels carry, while the actual complaint (a "Fixed barrier" option that could not work for the selected duration) is addressed by the derived-support gating above. The `+`/`-` addon on the input itself is unchanged.
- **Surface range in the error message from `code_args` (and `barrier_choices` when present).** Keep `mapErrorMessage` as the single mapping point; ensure the barrier components pass the proposal error through it and prefer the range-bearing message over generic client-side text. Where the proposal gives no range, show a format hint keyed to the derived support type. _Alternative:_ hardcode ranges in the FE — rejected, ranges are per symbol/duration and owned by the BE.
- **`contract_expiry_type` is derived correctly at source, not compensated for downstream.** A reaction wrote only `'tick'`/`'intraday'`, so days and end-time durations resolved against the intraday entry. It now uses `getExpiryType` (the pipeline's own derivation) and depends on everything that derivation reads, since several flows assign the duration/expiry fields directly. _Alternatives:_ (a) resolve the barrier against a locally-corrected expiry type — rejected, adds a second derivation beside a wrong one; (b) delete the reaction and let the pipeline be sole writer — rejected, direct assignments bypass the pipeline.
- **The reaction owns the barrier re-seed on an expiry-type change.** `onChangeExpiry` detected a change by disagreeing with the store, which stopped being a signal once the store derived the value correctly; the reaction can see the transition directly. It skips the first resolve (the pipeline seeds that) and leaves the value alone when the new expiry type offers no barrier.
- **One fallback for unresolved barrier support: `relative`.** The barrier field renders from a static per-trade-type map that does not wait for `active_symbols`, and most barrier symbols are synthetics, so `absolute` would show a fixed-price field that then switches. _Revised on review:_ an earlier revision parameterised the fallback per caller — rejected, nothing depended on the other value and a split contract is the same smell this change removes.
- **Shared helper location.** Put the "derive support + default from config for a contract type + expiry_type" logic in the trade store (or a Barrier util imported by both), replacing the three copies. Keeps mobile/desktop consistent (KISS/DRY).

## Risks / Trade-offs

- **[Some symbols/durations may not carry a usable default or range in `contracts_for`/proposal]** → Keep `BARRIER_DEFAULTS` and the generic format-hint message as explicit fallbacks; log/track cases where the API omits the data so the BE follow-up can close them.
- **[Regression in forex absolute barriers]** → The sign rule must yield `absolute` for forex (their default barrier is a bare number); cover forex in `barrier-reset.spec.ts` and barrier-input tests so the behaviour is pinned.
- **[Barrier reset on symbol change (`handleTradeParamsResetOnSymbolChange`) still uses the old support notion]** → Update it to use the new derivation so the reset default also comes from the API where available.
- **[`validation_params` has no barrier entry]** → Resolved: not needed. The range gap was mostly a symptom of offering an option the duration could not accept; `code_args`/`barrier_choices`/the format hint cover the rejections a user can still trigger. The speculative `TValidationParams.barrier` wiring was removed. If proactive range display (before submit) is ever wanted, it needs both a BE field _and_ a FE change to render it — `getBarrierErrorMessage` only runs on a rejection.
- **[Correcting `contract_expiry_type` changes which duration limits apply]** → `getDurationMinMax`/`getDurationMinMaxValues` key off it, so a days duration now resolves against the `daily` entry rather than `intraday`. Intended, but not previously pinned by a test — exercise duration min/max on a days duration.
- **[Correcting it also removes `onChangeExpiry`'s re-seed trigger]** → Addressed by moving the re-seed into the reaction; covered by `barrier-support.spec.ts`.
- **[Two desktop components consume `showBarrierTypes`]** → Update `barrier-type-selector.tsx` and `barrier-content-desktop.tsx` together to avoid a half-migrated state.

## Migration Plan

Front-end only; no data/config/API migration. Ships with the normal build behind the existing trade UI. Rollback is reverting the diff. If the BE follow-up (populate `validation_params.barrier`) lands separately, the FE already tolerates its absence, so ordering is independent.

## Open Questions

See `tasks.md` → `## Open Questions` for the decision-changing questions (range source; +/- affordance shape; whether the store method or a Barrier util owns the shared derivation), each with a recommended default that the tasks proceed on.
