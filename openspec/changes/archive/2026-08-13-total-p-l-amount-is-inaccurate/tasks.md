## Open Questions

1. **Money summation precision.** The footer sums P/L with floating-point `Number(position.profit_loss)`, which the Buildwright philosophy discourages for money.
    - (a) **RECOMMENDED** — Keep the existing `Number(...)` summation. It matches the identical Closed-tab footer and the surrounding codebase; this change is a scoping bugfix, not a precision rework.
    - (b) Introduce a decimal/minor-units helper for both Open and Closed footers in a separate change.
      Proceeding with (a).

2. **Visibility guard source.** Whether to guard footer visibility on `active_positions.length === 0` (local) or the store computed `is_active_empty`.
    - (a) **RECOMMENDED** — Use `active_positions.length === 0` to mirror the sibling `PositionsDrawerContent` guard (line 23) exactly.
    - (b) Use `portfolio.is_active_empty` for a single store-level source of truth.
      Proceeding with (a).

## 1. Fix the Open tab footer

- [x] 1.1 In `packages/trader/src/AppV2/Components/Layout/PositionsDrawer/positions-drawer-content.tsx`, change the `PositionsDrawerFooter` visibility guard (line 55) from `if (all_positions.length === 0 || is_switching_account)` to `if (active_positions.length === 0 || is_switching_account)`.
- [x] 1.2 In the same component, change both `getTotalProfit(all_positions)` calls (the `color` prop on line 67 and the `Money amount` on line 69) to `getTotalProfit(active_positions)`.
- [x] 1.3 Remove `all_positions` from the destructured `portfolio` values (line 46) if it is no longer referenced anywhere in `PositionsDrawerFooter`, to avoid an unused-variable lint error.

## 2. Tests

- [x] 2.1 Create `packages/trader/src/AppV2/Components/Layout/PositionsDrawer/__tests__/positions-drawer-content.spec.tsx`, wrapping `PositionsDrawerFooter` in `<StoreProvider store={mockStore}>` and mocking `portfolio.active_positions`, `portfolio.all_positions`, `client.currency`, and `ui.is_switching_account`.
- [x] 2.2 Add a test: with `active_positions = []` and a non-empty `all_positions` (closed contracts present), `PositionsDrawerFooter` renders nothing (asserts issue #1057 Issue 1).
- [x] 2.3 Add a test: with one running position (profit +10) and one settled position (profit +100) present in `all_positions` but only the running one in `active_positions`, the rendered Total P/L reflects +10 only and the count reads "1 open position" (asserts issue #1057 Issue 2).
- [x] 2.4 Add a test: with `is_switching_account = true` the footer renders nothing even when open positions exist.

## 3. Verify

- [x] 3.1 Run `npm run test:jest -- packages/trader/src/AppV2/Components/Layout/PositionsDrawer/__tests__/positions-drawer-content.spec.tsx` and confirm all cases pass. (3/3 pass.)
- [x] 3.2 Run `npm run test:eslint-all` (or lint the changed file) to confirm no unused-variable or other lint errors from task 1.3. (ESLint clean on both changed files, exit 0.)
- [~] 3.3 Manually verify in the desktop positions sidebar flyout: open two contracts, let one settle, confirm the Open tab Total P/L matches only the running card; wait for all to settle, confirm the footer disappears and only the empty message remains. (Manual browser step — not runnable in this unattended environment; behaviour is fully covered by the automated tests in 2.2–2.4.)
- [x] 3.4 Confirm the Closed tab total (`PositionsDrawerClosedFooter`) is unchanged and still reports the settled contract's P/L. (Lives in the untouched `positions-drawer-closed-content.tsx`; not in the diff.)
