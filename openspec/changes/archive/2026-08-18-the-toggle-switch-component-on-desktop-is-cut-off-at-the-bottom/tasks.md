## Open Questions

None blocking implementation. Assumption (also noted in `design.md`): set `.allow-equals__wrapper` to `height: var(--core-size-1400)` to match the Quill toggle button. `min-height: var(--core-size-1400)` with `height: auto` is an acceptable alternate if visual QA prefers natural sizing, as long as the toggle is fully unclipped.

## 1. Fix Allow equals row height

- [x] 1.1 In `packages/trader/src/AppV2/Components/TradeParameters/AllowEquals/allow-equals.scss`, change `.allow-equals__wrapper` from `height: var(--core-size-1100)` (22px) to `height: var(--core-size-1400)` (28px) so the row is at least as tall as the Quill `.toggle-switch` button.
- [x] 1.2 Add a short SCSS comment above that height rule noting it must stay ≥ the Quill toggle height (`--core-size-1400`) to avoid the Manual-trading bottom clip (issue #1164).
- [x] 1.3 Leave `display: flex`, `align-items: center`, padding, width, RTL direction, and `.toggle-switch__knob` RTL overrides unchanged.

## 2. Regression / behaviour tests

- [x] 2.1 Run `npm run test:jest -- packages/trader/src/AppV2/Components/TradeParameters/AllowEquals/__tests__/allow-equals.spec.tsx` and confirm existing toggle behaviour cases stay green (render on/off, click calls `onChange`, disabled when market closed, minimized field path).
- [x] 2.2 If a low-cost assertion is practical without brittle computed-style checks in jsdom, extend `allow-equals.spec.tsx` to assert the non-minimized wrapper renders with the toggle (`button.toggle-switch` / `aria-pressed`) inside `.allow-equals__wrapper`; otherwise rely on 2.1 + manual QA and note that in the PR.

## 3. Verify

- [x] 3.1 Manual desktop check per issue #1164: Manual trading tab → Rise/Fall → Allow equals under Stake → full toggle (track + knob) visible, no bottom clip; toggle still works on/off.
- [x] 3.2 Spot-check Automated trading tab with Rise/Fall → Allow equals still fully visible (no regression).
- [x] 3.3 Spot-check mobile / minimized Allow equals still shows the Yes/- field (unaffected path).
- [x] 3.4 Run stylelint on the touched SCSS (`npm run test:stylelint` or package-scoped equivalent) and fix any issues introduced by the edit.
