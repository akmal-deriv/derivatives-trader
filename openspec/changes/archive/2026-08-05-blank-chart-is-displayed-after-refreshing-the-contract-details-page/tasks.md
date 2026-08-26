## Open Questions

1. **Name of the new config flag on `useSmartChartsAdapter`.**
    - **(a) `is_connection_opened`** — RECOMMENDED. Matches the `isConnectionOpened` prop already passed to `SmartChart` and reads as a readiness gate independent of any single store field.
    - (b) `is_socket_opened` — mirrors the `common` store field name exactly, but couples the hook's public API to a store implementation detail.
    - (c) `enabled` — generic React-Query-style gate; less descriptive of what it gates.
    - **Default used below: (a) `is_connection_opened`.** A reviewer may swap the name; the behavior is unaffected.

## 1. Reproduce (Red)

- [x] 1.1 In `packages/trader/src/Modules/SmartChart/Hooks/__tests__/useSmartChartsAdapter.spec.ts`, add a failing test: mount the hook with `activeSymbols: []` and `is_connection_opened: false`, assert `getActiveSymbols`/`WS.activeSymbols` (mocked) is NOT called and `isLoading` stays `true`. Run it against current code to capture the red (currently the fetch fires regardless).
- [x] 1.2 Add a second failing test: with `is_connection_opened` starting `false` then re-rendered as `true`, assert the initial fetch fires exactly once after the transition. Capture the red.

## 2. Fix (Green)

- [x] 2.1 In `packages/trader/src/Modules/SmartChart/Hooks/useSmartChartsAdapter.ts`, add `is_connection_opened?: boolean` to `UseSmartChartsAdapterConfig` and destructure it in the hook body.
- [x] 2.2 In the mount-fetch effect (`useSmartChartsAdapter.ts:161-168`), only fire the initial `fetchChartData()` when the connection is open — treat `is_connection_opened === undefined` as open (backward compatible) and `false` as closed. Add `is_connection_opened` to the effect's dependency array so a `false → true` transition triggers the one-time fetch (still guarded by `hasFetchedRef`).
- [x] 2.3 Ensure `isLoading` remains `true` while the gate is closed (do not clear the loader), so `ReplayChart`'s `if (!chartData || !chartData.tradingTimes) return <Loader/>` guard shows the loader, not a blank chart.
- [x] 2.4 In `packages/trader/src/Modules/Contract/Containers/replay-chart.tsx`, pass `is_connection_opened: is_socket_opened` into the existing `useSmartChartsAdapter({...})` call (`is_socket_opened` is already destructured from `common`).
- [x] 2.5 In `packages/trader/src/AppV2/Containers/Chart/trade-chart.tsx`, pass `is_connection_opened: is_socket_opened` into its `useSmartChartsAdapter({...})` call (`is_socket_opened` already destructured from `common`).

## 3. Verify

- [x] 3.1 Re-run the tests from section 1 and confirm they now pass (green); cite the red→green in the PR/commit body per the project's proof-of-red convention.
- [x] 3.2 Update/extend `packages/trader/src/Modules/Contract/Containers/__tests__/replay-chart.spec.tsx` to cover: with `is_socket_opened: false` the loader is shown and no fetch occurs; with `is_socket_opened: true` the chart renders once reference data resolves.
- [x] 3.3 Run `npm run test:jest -- packages/trader/src/Modules/SmartChart/Hooks/__tests__/useSmartChartsAdapter.spec.ts` and `npm run test:jest -- packages/trader/src/Modules/Contract/Containers/__tests__/replay-chart.spec.tsx`; confirm both pass.
- [x] 3.4 Run `npm run test:eslint-all` (or the trader-scoped lint) on the changed files.
- [ ] 3.5 Manual check: start the trader dev server, open a Contract Details page, hard-refresh, and confirm the chart loads (no blank chart, no stuck loader) and the console shows no failed `active_symbols` request. _(Not run in this unattended implementation environment — requires a live dev server + browser. Covered at the unit level by the socket-gate tests in 1.1/1.2/3.2.)_

## 4. Documentation

- [x] 4.1 Confirm whether any user-facing/dev docs reference the chart's fetch-on-mount behavior; if none, state "no docs affected" in the final report per the Documentation-Is-Part-of-Done principle.
