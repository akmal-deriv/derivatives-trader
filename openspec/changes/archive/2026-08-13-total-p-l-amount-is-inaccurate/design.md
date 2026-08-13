## Context

The desktop positions sidebar flyout renders an Open tab and a Closed tab (`positions-drawer-tabs.tsx`). The Open tab list (`PositionsDrawerContent`) already filters correctly: it shows the empty message when `active_positions.length === 0`. The bug lives entirely in the sibling `PositionsDrawerFooter` in `packages/trader/src/AppV2/Components/Layout/PositionsDrawer/positions-drawer-content.tsx`.

Two lines are wrong:

- Line 55 — visibility guard: `if (all_positions.length === 0 || is_switching_account) return null;`. Because `all_positions` includes settled contracts, the footer stays visible after all open contracts expire.
- Lines 67 & 69 — `getTotalProfit(all_positions)` sums P/L across every position, including closed ones.

The portfolio store (`packages/core/src/Stores/portfolio-store.js`, `setActivePositions`) defines the two arrays used here:

- `active_positions` = `positions.filter(p => !getEndTime(p.contract_info))` — open/running contracts only.
- `all_positions` = `[...positions]` — open plus closed/settled.

The Closed tab footer (`PositionsDrawerClosedFooter`) is the correct reference pattern: it scopes both its visibility guard (`if (!data.length) return null;`) and its total to its own dataset (reports `profit_table.data`).

## Goals / Non-Goals

**Goals:**

- Show the Open tab footer only when `active_positions.length > 0`.
- Compute the Open tab Total P/L from `active_positions` only.
- Keep the open-position count (already correct, uses `active_positions.length`) and all styling/markup unchanged.
- Add co-located tests for the empty and mixed open/closed scenarios.

**Non-Goals:**

- No changes to the portfolio store, the Closed tab, `PositionsDrawerContent`, or `PositionsDrawerTabs`.
- No change to how `profit_loss` is sourced or formatted (`Money` component, `has_sign`).
- No new money/precision handling: this reuses the existing `Number(position.profit_loss)` summation already present for the footer and mirrored in the Closed footer.

## Decisions

- **Fix in-place in `PositionsDrawerFooter`; do not move logic to the store.** The two-array split already exists in the store and is the intended source of truth; the component simply consumes the wrong one. Swapping `all_positions → active_positions` in three places is the minimal, DRY correction (KISS/YAGNI). Alternative — a new `total_open_profit` computed in the portfolio store — was rejected as unnecessary indirection for a single consumer.
- **Guard on `active_positions.length === 0`** to match `PositionsDrawerContent` (line 23), so the list and footer appear/disappear together. Alternative — keying visibility off `is_active_empty` (a store computed) — was rejected to keep the footer's guard consistent with its sibling list component, which uses `active_positions.length` directly.
- **Keep `is_switching_account` in the guard** unchanged.
- **P/L summation stays floating-point `Number(...)`** as-is. The philosophy's "no floating point for money" note is acknowledged, but this change is a scoping bugfix, not a money-precision rework; introducing a decimal type here would diverge from the identical Closed-tab summation and the surrounding codebase. Flagged in Open Questions for a reviewer.

## Risks / Trade-offs

- [`active_positions` uses `observable.struct`, `all_positions` uses `observable.shallow`] → Both are already observed by this `observer()` component, so reactivity is preserved; swapping arrays does not change subscription behavior.
- [Closed-contract P/L visible on Closed tab total but no longer on Open total may briefly look like the number "moved"] → This is the intended, specified behavior (issue #1057 expected result); covered by tests asserting the mixed-positions total.
- [Retained floating-point summation] → Existing behavior, unchanged; no regression introduced, but currency rounding edge cases remain as they are today.

## Migration Plan

Pure front-end display fix; no data migration, no feature flag. Ships with the component change and its tests. Rollback = revert the single-file diff.

## Open Questions

See `tasks.md` for the reviewer-facing Open Questions (money-precision scope, and whether to key visibility off the store's `is_active_empty` computed). Recommended defaults are already applied so the plan is implementable as-is.
