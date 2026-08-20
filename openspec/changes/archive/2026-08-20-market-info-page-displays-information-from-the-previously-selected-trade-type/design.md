## Context

The AppV2 market-selector (`packages/trader/src/AppV2/Components/MarketSelection/`) is a headless `useMarketSelection` hook (`packages/trader/src/AppV2/Hooks/useMarketSelection.ts`) rendered by two device shells — desktop popover (`market-selection-desktop.tsx`) and mobile full-screen modal (`market-selection-mobile.tsx`) — both mounted by `MarketTabs` (`market-tabs.tsx`). The hook owns browse state in `useState`, including `selected_trade_type` (the browsed trade-type tab) and `info_symbol`/`info_trade_type` (the Market Info screen's pending symbol + the trade type it was opened from).

`selected_trade_type` is seeded once at mount from the store's `contract_type` (`getTradeTypeForContractType(contract_type) ?? AVAILABLE_CONTRACTS[0]`, lines 37-39). The hook then reads `symbols` from `useTradeTypeSymbols(selected_trade_type)` (line 48), and `info_item` is resolved as `symbols.find(...) ?? activeSymbols.find(...)` (lines 157-159). There is **no** re-sync of `selected_trade_type` to the store's `contract_type` after mount.

Because the desktop shell always calls the hook (the `InputPopover` returns `null` when closed, but `MarketSelectionDesktop` stays mounted under `MarketTabs`) and the mobile shell calls the hook before its `!isOpen` early return, the hook's state persists across selector open/close cycles. So after the user switches trade type on the strip (which writes a new `contract_type` to the store via `selectMarketAndTradeType`), reopening the selector still browses the **old** trade type's `symbols`, and the Market Info page opened from that list resolves the old market — the bug in issue #1173.

`MarketInfoScreen` (`market-info-screen.tsx`) itself is correct: it keys everything off its `item` prop (the `underlying_symbol`) and its own `useMarketInfoTradeTypes(underlying_symbol)` / `useLiveTick` / `useMarketDiscovery` / `useSymbolTradingTimes` hooks, which all subscribe to the symbol the info screen was opened for. The stale-data source is the `item`/`default_trade_type` the shell passes, which come from the hook's stale `selected_trade_type`/`info_*` state.

## Goals / Non-Goals

**Goals:**

- The selector's browse trade type and the Market Info screen reflect the store's current `contract_type` whenever the strip has moved, on every (re)open — on both desktop and mobile.
- Preserve the user's ability to browse a different trade-type tab than the active trade within a single open session (a voluntary tab pick is not a store change).
- Keep the fix in the shared hook so both device shells are fixed by one change.

**Non-Goals:**

- Changing `MarketInfoScreen`'s render/data logic (it is already symbol-driven; the fix is upstream).
- Replacing the `useState` browse state with a fully derived/computed value (the user must still be able to browse a tab other than the active trade, so local state stays).
- Changing the store shape, `selectMarketAndTradeType`, routing, or persistence.
- Persisting the last-browsed trade type across sessions (out of scope; the seed is the live `contract_type`).

## Decisions

- **Resync `selected_trade_type` via a `useEffect` keyed on the store's `contract_type`, not a derived/computed value.** A `useEffect` that, on `contract_type` change, calls `setSelectedTradeType(getTradeTypeForContractType(contract_type) ?? AVAILABLE_CONTRACTS[0])` (and clears `info_symbol`/`info_trade_type`). Rationale: the user can voluntarily browse a different tab via `handleSelectTradeType` (which only sets local state, never the store), so the browse trade type cannot be a pure `computed(get)` off `contract_type` — that would discard a voluntary browse pick on every render. The effect fires only on a real store change, so a voluntary pick survives until the strip next moves.
    - Alternative considered: derive `selected_trade_type` as `useMemo(() => getTradeTypeForContractType(contract_type) ?? AVAILABLE_CONTRACTS[0], [contract_type])` — **rejected**, because it makes a voluntary browse tab impossible (the memo would override the user's pick every render).
    - Alternative considered: reset state only in the device shells on open (e.g. the desktop `isOpen` effect) — **rejected**, because the mobile shell's `useMarketSelection` runs before its `!isOpen` early return and the hook's state persists there too; a shell-level reset would leave the mobile path half-fixed and duplicate logic. The single source of truth is the hook.

- **Clear `info_symbol`/`info_trade_type` in the same effect.** A strip switch happens while the selector is closed (a commit closes it, and an external tab switch requires the popover to be closed), so `info_symbol` is already null in practice — but clearing it in the effect is belt-and-suspenders against any future code path that changes `contract_type` while the info screen is open, and it makes the invariant "info state never outlives a trade-type change" explicit and testable.

- **Keep the existing lazy `useState` initialiser.** It is still the correct mount seed; the effect only handles subsequent changes. `getTradeTypeForContractType` is shared with the seed so the two never diverge.

- **No `skip_specs` / no feature flag.** This is a correctness fix; gating it would let the bug recur, and there is no partial-coverage safety argument for the old behaviour.

## Risks / Trade-offs

- [Effect overrides a voluntary browse tab on a spurious `contract_type` change while the selector is open] → Mitigated: `contract_type` only changes on a commit (which closes the selector) or an external strip switch (popover closed), so the effect does not fire during an interactive browse session. If a future code path changes `contract_type` with the selector open, that is the bug the resync is meant to catch — resetting to the new active trade is the desired behaviour.
- [Extra render on mount from the effect] → The effect runs once after mount but `setSelectedTradeType` with the same value is a no-op (React bails on equal state), so no extra commit in the common case where the seed already matches.
- [Test friction: the `useTraderStore` mock is a static `jest.fn(() => ({ contract_type: 'rise_fall', ... }))`] → The regression test will need to make the mock return a different `contract_type` on a later render (e.g. swap `useTraderStore`'s mock implementation between renders and `rerender`), mirroring how the store observable would update in the real app. Documented in tasks.

## Migration Plan

Pure behaviour fix inside one hook; no migration. Rollback is reverting the `useEffect`. No feature flag, no store change, no API change.

## Open Questions

None.
