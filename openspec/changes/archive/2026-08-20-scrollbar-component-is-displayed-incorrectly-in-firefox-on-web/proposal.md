## Why

On web Firefox, the shared `ThemedScrollbars` component (and AppV2 surfaces that reuse the same themed-scrollbar look) renders a scrollbar that does not match Chrome/Safari or the approved light/dark design. The Firefox path uses different track colors, ignores autohide/hidden modes that only target `::-webkit-scrollbar*`, and AppV2 scroll areas that only style WebKit fall back to the unthemed OS scrollbar (issue #993).

## What Changes

- Align Firefox scrollbar styling on `.dc-themed-scrollbars` with the WebKit rules: thin thumb using the interactive-active token, **transparent** track (not surface-primary), so light and dark themes match other browsers.
- Make autohide and hidden-scrollbar modes work in Firefox via `scrollbar-color` / `scrollbar-width`, not only `::-webkit-scrollbar*` pseudo-elements.
- Extend the AppV2 `@mixin themed-scrollbar` (market selection and related panels) with the same Firefox `scrollbar-color` / `scrollbar-width` pair so native `overflow` lists are not left on the OS default scrollbar in Firefox.
- Add a co-located component test that locks the CSS class contract for default, autohide, and hidden modes (visual Firefox check remains manual).

No breaking API changes: `ThemedScrollbars` props and class names stay the same; this is a CSS parity fix.

## Capabilities

### New Capabilities

- `themed-scrollbars`: Shared themed native scrollbar used by `ThemedScrollbars` (`.dc-themed-scrollbars`) and the AppV2 `@mixin themed-scrollbar`, including Firefox vs WebKit styling, autohide, and hidden modes across light and dark themes.

### Modified Capabilities

<!-- None: openspec/specs/ has no existing themed-scrollbars (or scrollbar) spec. -->

## Impact

- Code (primary): `packages/components/src/components/themed-scrollbars/themed-scrollbars.scss` — Firefox `scrollbar-color` / `scrollbar-width`, autohide, and `--hidden-scrollbar`.
- Code (component contract, if tests need class hooks only): `packages/components/src/components/themed-scrollbars/themed-scrollbars.tsx` (no prop/API change expected).
- Code (AppV2 shared look): `packages/trader/src/AppV2/Components/MarketSelection/market-selection.scss` (`@mixin themed-scrollbar`), consumed by `styles/_market-discovery.scss`, `styles/_market-selection-desktop.scss`, `styles/_market-info.scss`, `styles/_market-selection-list.scss`.
- Existing local override that already does the right Firefox track color stays valid: `packages/core/src/sass/app/_common/components/account-switcher.scss` (`.dc-themed-scrollbars { scrollbar-color: … transparent; }`).
- Consumers unchanged in behavior beyond visuals: `app-contents.jsx`, dropdowns, data-table/list, notifications, contract audit, positions drawer dropdown height override, etc.
- Tests: new `packages/components/src/components/themed-scrollbars/__tests__/themed-scrollbars.spec.tsx`.
- No API, store, routing, or dependency changes.
