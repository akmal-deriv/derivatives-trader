## Context

Descriptions on the AppV2 market info screen come from a single hand-maintained map, `MARKET_DESCRIPTIONS`, in `packages/trader/src/AppV2/Utils/market-descriptions.ts`, keyed by `underlying_symbol` with values as `() => localize('…')` thunks. `getMarketDescription(symbol)` returns the resolved string or `''` when the symbol has no entry. `market-info-screen.tsx:142` calls it and `:331` renders `{description && (<Text …>{description}</Text>)}`, so a missing entry silently renders nothing.

The Bull/Bear indices are offered by the app (symbols `RDBULL`/`RDBEAR`, display names "Bull Market Index"/"Bear Market Index" in `packages/shared/src/utils/constants/contract.ts:449-450`) but have no entry in the map — hence the empty description in issue #1029.

## Goals / Non-Goals

**Goals:**

- `RDBULL` and `RDBEAR` return the copy specified in the issue, translatable via `localize()`.
- Follow the existing map pattern exactly; no new abstractions.

**Non-Goals:**

- Migrating descriptions to a remote/API source (the file comment notes this is a possible future move; out of scope here).
- Auditing/backfilling descriptions for every other symbol that lacks one. The issue says "some markets, including Bull and Bear"; this change fixes the two the issue names and expected result specifies. See Open Questions in tasks.md.
- Any change to the render path in `market-info-screen.tsx`.

## Decisions

- **Add two entries to `MARKET_DESCRIPTIONS` under a new "Bull/Bear Market Index" comment group**, keyed by the uppercase `RDBULL`/`RDBEAR` symbols. Rationale: the key must match the `underlying_symbol` from the active_symbols API; the trade-store tests (`trade-store.spec.ts`) confirm the app uses `RDBULL` uppercase. Placed near the other derived-index groups for readability.
    - Alternative considered: sourcing copy dynamically — rejected per YAGNI; the map is the established, boring pattern.
- **Use the exact copy from the issue** ("Positive/Negative drift and constant volatility with a tick every 2 seconds"), each wrapped in `localize()`. Consistent with the "tick every 2 seconds" phrasing already used for the `R_*` continuous indices.
- **Extend the existing co-located spec** rather than adding a new test file, matching the "co-locate tests" convention.

## Risks / Trade-offs

- [Wrong key casing → description still missing] → Mitigated by grounding on `RDBULL`/`RDBEAR` (uppercase) as used in `trade-store.spec.ts` and `contract.ts`; the unit test asserts resolution.
- [Copy not translated] → Mitigated by wrapping in `localize()` like every other entry, so Crowdin extraction picks it up.

## Migration Plan

Pure additive data change; no migration. Rollback is reverting the two map entries. No feature flag needed.

## Open Questions

None that block implementation. A broader "which other symbols still lack descriptions" question is captured in tasks.md as an optional follow-up, not part of this change.
