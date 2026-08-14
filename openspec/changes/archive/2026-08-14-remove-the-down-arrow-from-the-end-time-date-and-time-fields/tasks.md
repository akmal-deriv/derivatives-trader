## 1. Remove the chevron icons

- [x] 1.1 In `packages/trader/src/AppV2/Components/TradeParameters/Duration/day.tsx`, delete the `rightIcon={<LabelPairedChevronDownMdRegularIcon fill='var(--color-text-primary)' />}` prop from the **Date** `TextField` (currently line 249).
- [x] 1.2 In the same file, delete the `rightIcon={<LabelPairedChevronDownMdRegularIcon fill='var(--color-text-primary)' />}` prop from the **Time** `TextField` (currently line 265).
- [x] 1.3 Remove `LabelPairedChevronDownMdRegularIcon` from the `@deriv/quill-icons` import (currently line 6), leaving `LabelPairedCalendarSmRegularIcon` and `LabelPairedClockThreeSmRegularIcon` intact.
- [x] 1.4 Confirm the leading `leftIcon` on both fields (calendar and clock) and the `onClick` tap-to-open handlers are unchanged.

## 2. Tests

- [x] 2.1 Add `packages/trader/src/AppV2/Components/TradeParameters/Duration/__tests__/day.spec.tsx` that renders `DayInput` with mocked stores/hooks.
- [x] 2.2 Assert neither the Date nor the Time field renders a chevron icon (mock `@deriv/quill-icons` so `LabelPairedChevronDownMdRegularIcon` would be detectable if rendered, and assert it is absent).
- [x] 2.3 Assert the leading calendar and clock icons still render.
- [x] 2.4 Assert tapping the Date field opens the date picker and tapping the Time field opens the time picker (existing behaviour preserved).

## 3. Verification

- [x] 3.1 Run `npm run test:jest -- packages/trader/src/AppV2/Components/TradeParameters/Duration` and confirm the new and existing Duration tests pass.
- [x] 3.2 Run ESLint on the changed file (`npm run test:eslint-all` or the trader workspace lint) to confirm no unused-import error remains.
- [x] 3.3 Manually verify in responsive/mobile: open Duration → End time tab; confirm no chevron on either field, leading icons present, and both fields still open their pickers.
