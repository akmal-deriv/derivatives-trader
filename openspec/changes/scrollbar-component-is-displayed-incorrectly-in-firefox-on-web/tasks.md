## Open Questions

1. **Scope of AppV2 overflow surfaces beyond `@mixin themed-scrollbar`.**
   Several AppV2 panels use bare `overflow-y: auto` with only WebKit scrollbar rules (or none), e.g. `time-grid-picker.scss`, `accumulator-stats.scss`, positions drawer list. Issue #993 screenshots were not fetchable in this environment, so the exact surface is inferred from the shared component + the themed mixin.
    - (a) **RECOMMENDED** — Fix `.dc-themed-scrollbars` and `@mixin themed-scrollbar` only (covers `ThemedScrollbars` consumers + market selection family). Leave other ad-hoc overflow panels for a follow-up if QA still sees the bug there.
    - (b) Also add Firefox `scrollbar-color` / `scrollbar-width` to every AppV2 panel that already has WebKit thumb styling (time-grid-picker, accumulator expanded stats, etc.).
      Proceeding with (a).

2. **Autohide Firefox mechanism.**
    - (a) **RECOMMENDED** — On `__autohide` without hover use `scrollbar-width: none`; on `__autohide--is-hovered` restore `scrollbar-width: thin` + themed `scrollbar-color`. Closest standard-property equivalent to WebKit thumb hide.
    - (b) Leave Firefox scrollbars always visible (track-color fix only).
      Proceeding with (a).

## 1. Fix shared ThemedScrollbars Firefox styles

- [x] 1.1 In `packages/components/src/components/themed-scrollbars/themed-scrollbars.scss`, change the base Firefox rule from `scrollbar-color: var(--color-interactive-active) var(--color-surface-primary)` to `scrollbar-color: var(--color-interactive-active) transparent`, keeping `scrollbar-width: thin`.
- [x] 1.2 In the same file, under `&__autohide` (not hovered), add Firefox hide rules: `scrollbar-width: none` (and `scrollbar-color: transparent transparent` if needed for older Firefox). Keep the existing `::-webkit-scrollbar-thumb { display: none }` rule.
- [x] 1.3 In the same file, under `&__autohide--is-hovered`, restore Firefox visibility: `scrollbar-width: thin` and `scrollbar-color: var(--color-interactive-active) transparent`. Keep the existing WebKit `display: unset` rule.
- [x] 1.4 In the same file, under `&--hidden-scrollbar`, add `scrollbar-width: none` (and transparent `scrollbar-color` if needed) alongside the existing `::-webkit-scrollbar { display: none !important }` rule.
- [x] 1.5 Confirm no TypeScript/prop changes are required in `packages/components/src/components/themed-scrollbars/themed-scrollbars.tsx` — class names `dc-themed-scrollbars`, `__autohide`, `__autohide--is-hovered`, and `--hidden-scrollbar` already cover the new CSS.

## 2. Fix AppV2 themed-scrollbar mixin for Firefox

- [x] 2.1 In `packages/trader/src/AppV2/Components/MarketSelection/market-selection.scss`, extend `@mixin themed-scrollbar` with `scrollbar-width: thin` and `scrollbar-color: var(--semantic-color-slate-solid-surface-frame-mid) transparent`, leaving the existing `::-webkit-scrollbar*` rules unchanged.
- [x] 2.2 Confirm the four mixin call sites pick up the change with no further edits: `styles/_market-selection-list.scss`, `styles/_market-discovery.scss`, `styles/_market-selection-desktop.scss`, `styles/_market-info.scss`.

## 3. Tests

- [x] 3.1 Create `packages/components/src/components/themed-scrollbars/__tests__/themed-scrollbars.spec.tsx` using `render` from `@testing-library/react`, targeting `data-testid="dt_themed_scrollbars"`.
- [x] 3.2 Assert default render: root has classes `dc-themed-scrollbars` and `dc-themed-scrollbars__autohide` (autohide defaults to true).
- [x] 3.3 Assert `autohide={false}` does not add `dc-themed-scrollbars__autohide`.
- [x] 3.4 Assert `is_scrollbar_hidden` adds `dc-themed-scrollbars--hidden-scrollbar`.
- [x] 3.5 Assert `is_bypassed` renders children without the scrollbar wrapper element.
- [x] 3.6 Optionally mock `useHover` (from `packages/components/src/hooks/use-hover`) to assert `dc-themed-scrollbars__autohide--is-hovered` is applied when hovered; skip if the hook mock is disproportionately complex — class wiring is already covered by the SCSS selectors tied to that class name.

## 4. Verify

- [x] 4.1 Run `npm run test:jest -- packages/components/src/components/themed-scrollbars/__tests__/themed-scrollbars.spec.tsx` and confirm all cases pass.
- [x] 4.2 Run stylelint on the touched SCSS (`packages/components/src/components/themed-scrollbars/themed-scrollbars.scss` and `packages/trader/src/AppV2/Components/MarketSelection/market-selection.scss`) via `npm run test:stylelint` or the package-equivalent, and fix any new findings.
- [x] 4.3 Manually verify in **Firefox** (web), **light theme**: open a scrollable `ThemedScrollbars` surface (e.g. long dropdown list or desktop app shell content) and a market-selection panel — thin themed thumb, no opaque surface-colored gutter; with default autohide, thumb hidden until hover; with hidden mode (tabs/mobile-dialog), no bar.
- [x] 4.4 Manually verify the same surfaces in **Firefox**, **dark theme** — thumb uses dark interactive-active token, track still transparent, autohide/hidden unchanged.
- [x] 4.5 Spot-check **Chrome** (or Safari) on the same surfaces to confirm WebKit rules are unchanged (no regression from the new standard-property rules).
- [x] 4.6 Spot-check account switcher list still shows its intentional thumb color override (`packages/core/src/sass/app/_common/components/account-switcher.scss` `scrollbar-color: var(--color-text-secondary) transparent`).
