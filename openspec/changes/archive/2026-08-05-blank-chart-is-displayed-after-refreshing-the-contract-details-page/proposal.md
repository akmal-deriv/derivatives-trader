## Why

Refreshing the Contract Details page renders a permanently blank chart (issue [#933](https://github.com/deriv-com/derivatives-trader/issues/933)). On a hard refresh the chart's SmartCharts adapter fetches its reference data (`active_symbols` + `trading_times`) on mount, before the WebSocket connection is fully open. The request fails, the adapter falls back to empty data, and the render guard in `replay-chart.tsx` (`if (!chartData || !chartData.tradingTimes) return <Loader/>`) never clears — leaving the user stuck on a loader/blank chart with no recovery.

## What Changes

- Gate the SmartCharts adapter's initial reference-data fetch on WebSocket readiness. `useSmartChartsAdapter` gains an `is_connection_opened` config flag; the mount-time `fetchChartData()` runs only once the socket is open, and re-runs reactively when the socket transitions from closed to open (so a refresh that mounts the chart before the socket is ready still loads once it connects).
- While the connection is not yet open, the hook keeps `isLoading` true (loader shown) instead of firing a request that will fail — no behavioral regression for the trade chart, which already mounts after the socket is open.
- Wire the existing `common.is_socket_opened` observable into `useSmartChartsAdapter` from both call sites that render on the contract-details/replay path (`replay-chart.tsx`) and the trade chart (`trade-chart.tsx`).
- Add regression tests proving the adapter does not fetch until the connection is open and does fetch once it opens.

## Capabilities

### New Capabilities

- `contract-details-chart`: The chart on the Contract Details / contract-replay page must wait for the WebSocket connection to be established before requesting reference data, and must render successfully after a page refresh.

### Modified Capabilities

<!-- None. openspec/specs/ contains no existing capabilities to modify. -->

## Impact

- **Code (behavior):** `packages/trader/src/Modules/SmartChart/Hooks/useSmartChartsAdapter.ts` (gate initial fetch on connection readiness).
- **Code (wiring):** `packages/trader/src/Modules/Contract/Containers/replay-chart.tsx` and `packages/trader/src/AppV2/Containers/Chart/trade-chart.tsx` (pass `is_socket_opened` into the hook). Also consumed by the AppV2 Contract Details page via `packages/trader/src/AppV2/Containers/Chart/contract-details-chart.tsx`, which renders `ReplayChart`.
- **State dependency:** `common.is_socket_opened` observable in `packages/core/src/Stores/common-store.js` (existing; no change).
- **Tests:** `packages/trader/src/Modules/SmartChart/Hooks/__tests__/useSmartChartsAdapter.spec.ts` and `packages/trader/src/Modules/Contract/Containers/__tests__/replay-chart.spec.tsx`.
- **No API, dependency, or WebSocket-protocol changes.** Reuses the existing socket-readiness flag; no new requests introduced.
