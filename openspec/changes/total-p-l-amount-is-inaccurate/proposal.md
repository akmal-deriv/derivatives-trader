## Why

In the desktop positions sidebar flyout, the Open tab's "Total P/L" summary bar is wrong in two ways: it stays visible after every contract has expired (showing "0 open positions" with a non-zero total), and its total includes the profit/loss of already-closed contracts that belong on the Closed tab. This double-counts settled contracts and shows users a P/L that does not match the sum of the cards actually listed in the Open tab (issue #1057).

## What Changes

- Hide the Open tab's `PositionsDrawerFooter` summary bar whenever there are no open positions, so only the empty-portfolio message is shown (currently it hides only when there are zero positions of any kind).
- Compute the Open tab "Total P/L" from the open positions listed in that tab only, excluding closed/settled contracts, so the total equals the sum of the visible position cards.
- Add co-located tests covering the empty-open-positions and mixed open/closed scenarios for the drawer footer.

No breaking changes: this is a display-logic correction in a single AppV2 component; store data and the Closed tab are untouched.

## Capabilities

### New Capabilities

- `positions-drawer`: The desktop positions sidebar flyout, specifically the Open tab's summary footer that reports the count of open positions and their combined Total P/L.

### Modified Capabilities

<!-- None: openspec/specs/ contains no existing specs for this area. -->

## Impact

- Code: `packages/trader/src/AppV2/Components/Layout/PositionsDrawer/positions-drawer-content.tsx` (`PositionsDrawerFooter`). Rendered via `positions-drawer-tabs.tsx` (Open tab, `activeTab === 0`).
- Store data consumed (unchanged): `portfolio.active_positions` (open contracts, filtered by absence of `end_time`) and `portfolio.all_positions` (all contracts) from `packages/core/src/Stores/portfolio-store.js`.
- Tests: new `packages/trader/src/AppV2/Components/Layout/PositionsDrawer/__tests__/positions-drawer-content.spec.tsx`.
- No API, dependency, routing, or Closed-tab changes.
