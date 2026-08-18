## Why

On desktop Manual trading, the Rise/Fall **Allow equals** row clips the bottom of its Quill `ToggleSwitch` ([issue #1164](https://github.com/deriv-com/derivatives-trader/issues/1164)). The row is fixed at `--core-size-1100` (22px) while the switch button is `--core-size-1400` (28px), and Manual mode's trade-params scroll container uses `overflow-y: hidden`, so the 6px overhang is cut off. The same control looks fine on the Automated trading tab because that container uses `overflow-y: auto`.

## What Changes

- Raise the desktop Allow equals row (`.allow-equals__wrapper`) so its height is at least the Quill `ToggleSwitch` button height (`--core-size-1400` / 28px), ending the bottom clip on Manual trading.
- Keep label, tooltip, toggle behaviour, disabled/locked states, and mobile/minimized variants unchanged.
- Cover the layout fix with a focused regression assertion (or a documented style-level check) so a future shrink of the row height is caught.

No breaking changes. No store, API, or dependency changes.

## Capabilities

### New Capabilities

- `allow-equals-toggle`: Desktop layout of the Allow equals trade-parameter row (label + Quill `ToggleSwitch`) so the full switch is visible without bottom clipping on Manual trading.

### Modified Capabilities

<!-- None. openspec/specs/ has no existing spec for Allow equals or the trade-params toggle row. -->

## Impact

- **Code:** `packages/trader/src/AppV2/Components/TradeParameters/AllowEquals/allow-equals.scss` — `.allow-equals__wrapper` currently sets `height: var(--core-size-1100)` (22px); update so the row fits the Quill toggle (`height: var(--core-size-1400)` on the button in `@deriv-com/quill-ui` `toggle-switch.css`).
- **Component (unchanged behaviour):** `packages/trader/src/AppV2/Components/TradeParameters/AllowEquals/allow-equals.tsx` — desktop non-minimized branch renders the title + `<ToggleSwitch />` inside `.allow-equals__wrapper`.
- **Clip context (unchanged, explains Manual-only symptom):** `packages/trader/src/AppV2/Components/TradeParameters/trade-parameters.scss` — `.trade-params__scrollable` is `overflow-y: hidden` by default and only becomes `overflow-y: auto` when the panel has `.automation-actions` (Automated trading tab).
- **Tests:** `packages/trader/src/AppV2/Components/TradeParameters/AllowEquals/__tests__/allow-equals.spec.tsx` — extend or add a layout/regression check as needed; existing toggle behaviour tests stay green.
- **Scope:** Desktop (and any non-minimized) Allow equals row used under Stake for Rise/Fall (and Rise/Fall Equal). Mobile minimized field is a `TextField`, not this toggle row. Automated trading tab already appears unclipped and should remain so.
- **No API, store, analytics, or package dependency changes.**
