## Why

In the mobile (AppV2) Duration action sheet's **End time** tab, the Date and Time trigger fields each render a downward chevron on the right. A down chevron is the affordance for an inline dropdown, but tapping either field opens a separate full-screen picker action sheet — no inline dropdown ever appears. The icon misrepresents the control's behaviour and was flagged during a bug hunt on dtrader.deriv.com responsive web ([issue #1068](https://github.com/deriv-com/derivatives-trader/issues/1068)).

## What Changes

- Remove the trailing down-chevron icon (`rightIcon`) from the **Date** field in the End time tab.
- Remove the trailing down-chevron icon (`rightIcon`) from the **Time** field in the End time tab.
- Drop the now-unused `LabelPairedChevronDownMdRegularIcon` import.
- Keep the leading calendar (`LabelPairedCalendarSmRegularIcon`) and clock (`LabelPairedClockThreeSmRegularIcon`) icons unchanged.
- Keep tap-to-open behaviour unchanged — this is a visual-only change; both fields still open their pickers exactly as today.

## Capabilities

### New Capabilities

- `duration-end-time-fields`: The appearance and interaction affordances of the Date and Time trigger fields in the mobile Duration action sheet's End time tab.

### Modified Capabilities

<!-- None. openspec/specs/ contains no existing spec for the duration end-time fields. -->

## Impact

- **Code:** `packages/trader/src/AppV2/Components/TradeParameters/Duration/day.tsx` — remove the two `rightIcon` props (lines 249, 265) and the unused `LabelPairedChevronDownMdRegularIcon` import (line 6).
- **Tests:** `packages/trader/src/AppV2/Components/TradeParameters/Duration/__tests__/` — `day.tsx` currently has no dedicated test (it is mocked in `duration.spec.tsx`); add a focused test asserting no chevron renders while tap-to-open still works.
- **Scope:** Mobile / responsive web only. The desktop End time control (`duration-end-time-desktop.tsx`) is a different component and is out of scope.
- **No behavioural, API, dependency, or store changes.**
