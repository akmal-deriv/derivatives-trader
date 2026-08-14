## Context

The mobile Duration action sheet renders its End time tab via `DayInput` in
`packages/trader/src/AppV2/Components/TradeParameters/Duration/day.tsx`. The Date and Time
triggers are `@deriv-com/quill-ui` `TextField` components in `readOnly` mode with an
`onClick` that opens a full-screen picker (`ActionSheet.Root` → `DaysDatepicker` /
`EndTimePicker`). Each field currently sets both a `leftIcon` (calendar/clock) and a
`rightIcon` (down chevron). The chevron is purely decorative — it has no click handler and
the field, not the icon, is what opens the picker.

## Goals / Non-Goals

**Goals:**

- Remove the trailing down-chevron from the Date and Time fields in the End time tab.
- Preserve all existing behaviour: tap-to-open pickers, leading icons, `readOnly`/`disabled` states, values.

**Non-Goals:**

- No change to the desktop End time control (`duration-end-time-desktop.tsx`).
- No change to picker behaviour, the Ticks/Time tabs, or any store/state logic.
- No change to leading icons.

## Decisions

- **Delete the `rightIcon` prop on both `TextField`s (day.tsx lines 249 and 265) rather than
  replacing the icon or attaching a handler.** The issue supersedes its original framing
  ("arrows don't respond to clicks"): the fields are already tappable and open their pickers,
  so the correct fix is to drop the misleading affordance, not make it clickable. Alternatives
  considered: (a) swap the chevron for a different glyph — rejected, still implies an
  affordance the control doesn't have; (b) make the chevron itself clickable — rejected, the
  whole field already handles the tap.
- **Remove the `LabelPairedChevronDownMdRegularIcon` import (day.tsx line 6).** It is used
  only for these two `rightIcon`s; leaving it would be an unused import and fail lint.
  Verified: the symbol appears only on lines 6, 249, 265 of `day.tsx`.

## Risks / Trade-offs

- [Unused-import lint error if the import is left behind] → Remove the import in the same change; run ESLint.
- [Regression in tap-to-open or leading icons] → `day.tsx` has no dedicated test today (it is
  mocked in `duration.spec.tsx`). Add a focused test that renders `DayInput`, asserts neither
  field renders a chevron, asserts the leading calendar/clock icons remain, and asserts a tap
  still triggers the picker open.

## Migration Plan

Pure front-end visual change; no data, API, or config migration. Ships with the normal build.
Rollback is reverting the single-file diff.
