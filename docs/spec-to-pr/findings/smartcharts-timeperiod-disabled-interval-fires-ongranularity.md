# SmartCharts fires `onGranularity` for intervals it renders as disabled

**Class:** report-upstream — related to issue #1037.

**Source:** `@deriv-com/smartcharts-champion@1.10.1` (pinned via the root `package.json` `overrides`
block) — `src/components/Timeperiod.tsx`, `onIntervalClick`, recovered from
`dist/smartcharts.js.map`. Styling side: `dist/smartcharts.css`,
`.sc-interval__item--disabled span { opacity: .32; pointer-events: none }`.

**Root cause:** `TimeperiodItemComponent` marks an interval disabled when

```ts
is_disabled = (is_tick && chartTypeId !== 'line') || (!is_tick && allowTickChartTypeOnly);
```

but `onIntervalClick` only early-returns for `isLoading` and for the _first_ branch:

```ts
const onIntervalClick = (chart_type_id: string, key: string, interval: TGranularity) => {
    if (isLoading) return;
    if (key === 'tick' && chart_type_id !== 'line') {
        return;
    }
    changeGranularity(interval);
};
```

The second branch — a non-tick interval while `allowTickChartTypeOnly` is set — falls through to
`changeGranularity(interval)`, so a greyed-out interval still emits `onGranularity`. The CSS cannot
stop it either: `pointer-events: none` is applied to the inner `<span>`, while `onClick` sits on the
wrapping `Tooltip` element, which still receives the click. Keyboard and programmatic activation are
unguarded in both layers.

**Fix at the source:** add the missing early return to `onIntervalClick` so it mirrors `is_disabled`
in full — reject a non-tick interval while `allowTickChartTypeOnly` is set — and move
`pointer-events: none` from `.sc-interval__item--disabled span` up to
`.sc-interval__item--disabled` itself. Then upgrade
`@deriv-com/smartcharts-champion` (and the root `overrides` pin) to the release carrying it.

**Why our code must not change:** it does not — the guard added for issue #1037 lives on our own
`onGranularity` callback boundary in `packages/trader/src/AppV2/Containers/Chart/trade-chart.tsx`,
derived from the same value we pass as `allowTickChartTypeOnly`. It validates input at our boundary
rather than patching, shimming, or restyling the library, and it stays correct whether or not
upstream lands the fix. Once upstream ships, the guard becomes redundant and can age out; the
library is not patched, vendored, or pinned to broken behaviour here.

**Related observation, worth raising in the same upstream report:** `src/components/Chart.tsx` does
`const ToolbarWidget = React.useCallback(toolbarWidget, [t.lang]);`, so the consumer's
`toolbarWidget` render prop is pinned to the first render and only replaced when the language
changes; `TimeperiodStore.updateProps` likewise retains the `onGranularity` callback that render
produced. Any consumer state read inside those callbacks is therefore frozen at mount. This is not
worked around in our code either — our callback simply closes over nothing that changes (the
trade-type flag is read from a ref, `updateGranularity` is `action.bound`), which is correct
regardless of how long the chart holds the reference.
