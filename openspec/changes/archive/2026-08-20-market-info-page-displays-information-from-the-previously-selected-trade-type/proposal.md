## Why

When a trader switches trade type and symbol on the strip, then reopens the market selector and opens the Market Info page, the info screen can still show the previously selected trade type's market instead of the currently selected one (issue [#1173](https://github.com/deriv-com/derivatives-trader/issues/1173)). The selector's browse trade type (`selected_trade_type`) is a `useState` initialised once from the store's `contract_type` at first mount and never re-synced when the store moves on — so after a strip switch the selector still browses the old trade type's symbols, and the Market Info page opened from that list reflects the old trade type/market.

## What Changes

- **Re-sync the selector's browse trade type to the live store `contract_type` whenever the store's `contract_type` changes.** `useMarketSelection` keeps `selected_trade_type` as local state (the user can still browse a tab different from the active trade during a session) but resets it to `getTradeTypeForContractType(contract_type)` whenever the store's `contract_type` changes, so the selector and its Market Info screen always reflect the active trade context on reopen. A browse-tab pick (`handleSelectTradeType`) only changes the local state, not the store, so voluntary browsing of a different tab is preserved until the strip moves.
- **Re-seed the whole browse state on every selector open/close cycle, not only on a `contract_type` change.** The hook stays mounted across cycles, so a trade type the user browsed to but never committed (e.g. selected trade type is Accumulators, the user browses Turbos, picks no market, and closes) would otherwise reappear on the next open. `useMarketSelection` now takes the shell's `is_open` and re-seeds the browse trade type, market category, favourites tab and info state from the live `contract_type` as the selector closes — so the reopened selector shows the currently selected trade type from its first render.
- **Clear stale info-screen state when the active trade type changes.** When `contract_type` changes, any in-flight `info_symbol`/`info_trade_type` is cleared so the Market Info page can never render data resolved from a stale trade type. (In practice the strip is only switchable while the selector is closed, so `info_symbol` is already null; this is belt-and-suspenders.)
- No changes to the API, routing, store shape, persistence, or the device shells' structure. The fix lives in the shared `useMarketSelection` hook, so it covers both the desktop popover and the mobile modal (the mobile shell calls the hook before its `!isOpen` early return, so its state persists across opens the same way).

## Capabilities

### New Capabilities

- `market-info-sync`: The contract that the market-selector's browse trade type and Market Info screen always reflect the currently selected trade type and market — never a previously selected one — across selector open/close cycles and trade-type switches. Covers the resync of browse trade type to the live store `contract_type` and the clearing of stale info-screen state on trade-type change.

### Modified Capabilities

<!-- None: openspec/specs/ contains no existing spec describing the market-selector's trade-type/info-screen sync behaviour. -->

## Impact

- **Code (state resync — the fix):**
    - `packages/trader/src/AppV2/Hooks/useMarketSelection.ts` — the `selected_trade_type` `useState` (lines 37-39) and `info_symbol`/`info_trade_type` state (lines 43-45): add a `useEffect` keyed on the store's `contract_type` that resets `selected_trade_type` to `getTradeTypeForContractType(contract_type) ?? AVAILABLE_CONTRACTS[0]` and clears `info_symbol`/`info_trade_type` whenever `contract_type` changes. The existing lazy initialiser stays as the mount-time seed.
- **Device shells (no structural change expected):**
    - `packages/trader/src/AppV2/Components/MarketSelection/market-selection-desktop.tsx` — verify the resync holds while the popover is closed (the hook stays mounted via `MarketSelection`/`MarketTabs`).
    - `packages/trader/src/AppV2/Components/MarketSelection/market-selection-mobile.tsx` — verify the resync holds across the `!isOpen` early return (the hook is called before it, so state persists).
- **Tests:**
    - `packages/trader/src/AppV2/Hooks/__tests__/useMarketSelection.spec.tsx` — add a regression test that changing the mocked store `contract_type` (e.g. `rise_fall` → `accumulator`) while the selector is closed, then reading `current_trade_type`/`info_item`, yields the new trade type (not the previous one), and that `info_symbol` is cleared on the change.
    - `packages/trader/src/AppV2/Components/MarketSelection/__tests__/market-info-screen.spec.tsx` — no change expected (the info screen already keys off its `item`/`default_trade_type` props; the fix is upstream in the hook).
- **Consumers:** `MarketTabs` (`packages/trader/src/AppV2/Components/MarketTabs/market-tabs.tsx`) mounts the selector; no API change.
- No API, dependency, store-shape, routing, translation, or persistence changes. No feature flag required (the resync is a correctness fix; opt-out is not desirable).
