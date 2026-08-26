## Context

The contract-replay chart is rendered by `ReplayChart` (`packages/trader/src/Modules/Contract/Containers/replay-chart.tsx`), used both by the classic contract-replay container and by the AppV2 Contract Details page (`AppV2/Containers/Chart/contract-details-chart.tsx` → `ReplayChart`). `ReplayChart` calls `useSmartChartsAdapter({ activeSymbols: [] })` — it deliberately does not pre-fetch `active_symbols`, so the adapter fetches them itself.

Current fetch flow in `useSmartChartsAdapter.ts`:

- On mount, an effect fires `fetchChartData()` once via `hasFetchedRef` (`useSmartChartsAdapter.ts:161-168`), unconditionally.
- `fetchChartData` → `smartChartsAdapter.getChartData([])` → because `prefetchedActiveSymbols` is empty, `getChartData` calls `services.getActiveSymbols()` (`Adapters/index.ts:359-361`) → `WS.activeSymbols('brief')` (`Adapters/services.ts:105`), in parallel with `services.getTradingTimes()`.
- On a hard refresh, this runs before the WebSocket is open. `WS.activeSymbols` fails/times out; `services.getActiveSymbols` catches and returns `[]`; `getChartData` returns empty `activeSymbols`/`tradingTimes`.
- Back in the hook, `chartData.tradingTimes` stays effectively empty, and `ReplayChart` guard `if (!chartData || !chartData.tradingTimes) return <Loader/>` (`replay-chart.tsx:136`) never clears → permanent blank/loader.

The app already tracks connection readiness: `common.is_socket_opened` (set in `packages/core/src/Stores/common-store.js:158`) and is already consumed by SmartChart via `isConnectionOpened={is_socket_opened}` in both `replay-chart.tsx:165` and `trade-chart.tsx:260`. The bug is that the adapter's _own_ reference-data fetch does not consult it.

## Goals / Non-Goals

**Goals:**

- Prevent the adapter from requesting reference data before the WebSocket connection is open.
- Ensure the chart loads after a Contract Details page refresh once the connection is established.
- Reuse the existing `is_socket_opened` readiness signal; no new WS requests or protocol changes.
- No regression for the trade chart, which mounts after the socket is already open.

**Non-Goals:**

- Changing the transport/subscription layers (`transport.ts`) or `services.ts` request logic. SmartChart already gates its own `getQuotes`/`subscribeQuotes` traffic via `isConnectionOpened`; only the eager reference-data fetch needs gating.
- Adding retry/backoff or timeout tuning in `services.ts`.
- Refactoring how `active_symbols` is sourced (React Query vs WS) for either chart.

## Decisions

### Decision 1: Gate the initial fetch inside `useSmartChartsAdapter`, reactive on connection state

Add an `is_connection_opened?: boolean` field to `UseSmartChartsAdapterConfig`. Change the mount-fetch effect so the initial `fetchChartData()` fires only when `is_connection_opened` is `true` (or `undefined`, to preserve current behavior for any caller that does not pass it). Add `is_connection_opened` to the effect's dependency array so that a `false → true` transition triggers the first fetch exactly once (still guarded by `hasFetchedRef`). While the gate is closed, keep `isLoading` true so `ReplayChart` shows its loader rather than a blank chart.

**Why:** The hook is the single choke point for the eager reference-data fetch and already owns `isLoading`/`hasFetchedRef`. Gating here fixes both call sites with one change and keeps the fix reactive via MobX (`is_socket_opened` is observable; both callers are `observer()` components).

**Alternatives considered:**

- _Gate inside `services.getActiveSymbols` / `transport.send` by polling socket readiness._ Rejected — the services/transport layers have no access to the store, would need their own readiness source and a polling/await loop, and it is lower-level than the actual defect (an eager mount fetch).
- _Use `WS.wait('active_symbols')` / `WS.wait(...)` before fetching._ Rejected — `wait` (`socket_base.js:164`) delegates to `deriv_api.expectResponse`, which is about awaiting a response type, not a clean "connection open" gate; `is_socket_opened` is the established, already-consumed readiness signal.
- _Block only in `ReplayChart` (skip rendering the adapter until open)._ Rejected — the hook must be called unconditionally (React hooks rules); gating inside the hook is the correct place.

### Decision 2: Wire `is_socket_opened` from both call sites

`replay-chart.tsx` and `trade-chart.tsx` already destructure `is_socket_opened` from `common`. Pass it as `is_connection_opened` into their `useSmartChartsAdapter(...)` calls. The AppV2 Contract Details page inherits the fix through `ReplayChart`.

**Why:** Keeps the readiness source (the `common` store) at the component boundary, consistent with how `isConnectionOpened` is already passed to `SmartChart`.

## Risks / Trade-offs

- **[A caller omits `is_connection_opened`]** → Default behavior is preserved: when the field is `undefined`, the gate is treated as open so the fetch still fires on mount (no regression for any other/future caller). Only explicit `false` defers the fetch.
- **[Socket never opens]** → The chart stays on the loader, which is strictly better than the current permanent blank chart and matches the "connection unavailable" state the rest of the app shows. Out of scope to add a timeout/error CTA here.
- **[Effect re-runs on `is_connection_opened` changes]** → `hasFetchedRef` ensures the initial fetch happens exactly once; the language-change branch is unaffected because it only runs after `hasFetchedRef` is set.

## Migration Plan

Pure front-end behavioral fix. No data migration, no feature flag. Deploy is a standard build; rollback is reverting the commit. Verify by hard-refreshing the Contract Details page and confirming the chart loads.

## Open Questions

None. See the (single) low-stakes default recorded in `tasks.md` under Open Questions regarding the config field name.
