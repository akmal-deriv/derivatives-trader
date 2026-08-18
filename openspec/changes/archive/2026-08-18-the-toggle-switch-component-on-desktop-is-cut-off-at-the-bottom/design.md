## Context

See `proposal.md` for motivation (issue #1164 — desktop Manual trading clips the Allow equals toggle).

**Current layout (inferred from code):**

- Non-minimized Allow equals renders label + Quill `<ToggleSwitch />` inside `.allow-equals__wrapper` (`allow-equals.tsx`).
- `.allow-equals__wrapper` sets a fixed `height: var(--core-size-1100)` → **22px** (`allow-equals.scss`).
- Quill UI `.toggle-switch` is `height: var(--core-size-1400)` → **28px** (`@deriv-com/quill-ui` `toggle-switch.css`); the knob is `--core-size-1000` (20px) and the track uses `--size-generic-sm` (`--core-size-1200` = 24px). The button is therefore **6px taller** than its row.
- Manual trading panel: `.trade-params__scrollable { overflow-y: hidden }` (`trade-parameters.scss`). Anything that overflows the scrollable column is clipped — matching the screenshot.
- Automated trading panel: `:has(.automation-actions) .trade-params__scrollable { overflow-y: auto }`. Overflow is scrollable rather than hard-clipped, so the same undersized row does not present as a cut-off toggle — matching the issue note that Automated trading looks fine.

Token values from `@deriv-com/quill-tokens` `quill.css`: `--core-size-1100: 22px`, `--core-size-1400: 28px`.

## Goals / Non-Goals

**Goals:**

- Make the non-minimized Allow equals row tall enough that the Quill toggle is never bottom-clipped on Manual trading.
- Prefer the smallest local CSS change; keep TSX, store wiring, and panel overflow policy untouched unless the local fix is insufficient.
- Preserve existing spacing rhythm with neighbouring trade-param rows as much as possible (row grows by ~6px only).

**Non-Goals:**

- Changing `.trade-params__scrollable` overflow for Manual trading (that policy exists so the Buy button hugs content; flipping it would be a broader layout change and is not required once the row fits its child).
- Restyling or forking the Quill `ToggleSwitch` itself.
- Changing mobile minimized Allow equals (`TextField` path) or automation lock/disabled behaviour.
- Redesigning the Allow equals label/tooltip interaction.

## Decisions

**Decision: Fix at the Allow equals row — set `.allow-equals__wrapper` height to `var(--core-size-1400)`.**

Match the row height to the Quill toggle button token (`--core-size-1400` / 28px). Keep `display: flex`, `align-items: center`, horizontal padding, and RTL knob overrides as they are. Using the same design token the switch uses keeps the row in lockstep if Quill ever retunes the switch size via tokens.

- Alternative considered: `min-height: var(--core-size-1400)` with `height: auto`. Also viable; slightly looser if content grows. Prefer explicit `height: var(--core-size-1400)` for parity with the current “fixed row height” pattern unless QA prefers auto-sizing.
- Alternative considered: remove the fixed height entirely and let the flex row size to the switch. Acceptable and arguably cleaner long-term, but a slightly larger visual delta vs. neighbouring rows that still use fixed heights; the token match is the minimal, intentional bump.
- Alternative considered: change `.trade-params__scrollable` to `overflow-y: auto` (or `visible`) on Manual trading. Rejected as primary fix — it changes panel scroll behaviour and Buy-button hugging for every trade type, and only masks the real mismatch (row shorter than its child). The Manual/Auto difference is diagnostic evidence, not the preferred lever.
- Alternative considered: scale down the Quill toggle via CSS overrides. Rejected — fights the design system, risks hit-target and knob/track misalignment, and is harder to maintain across Quill upgrades.

**Decision: No TypeScript / component API change.**

The bug is pure CSS sizing. `allow-equals.tsx` already structures the row correctly; only the SCSS height token needs updating.

**Decision: Regression coverage via existing unit suite + manual desktop check.**

Jest/RTL does not assert computed layout against design tokens reliably in jsdom. Keep behaviour tests green in `allow-equals.spec.tsx`. Primary verification is a desktop Manual trading visual check (Rise/Fall → Allow equals fully visible; spot-check Automated trading for no regression). Optionally document the expected height relationship in a short SCSS comment so the next editor knows why `--core-size-1400` is intentional.

## Risks / Trade-offs

- **[Risk] Row grows ~6px and slightly shifts content below Allow equals (Payout info, Buy button).** → Mitigation: growth is small and only on the Allow equals row; Manual panel still hugs content. Visual QA on Rise/Fall desktop is enough to confirm spacing still looks balanced.
- **[Risk] Other clipped toggles exist elsewhere with the same undersized-wrapper pattern.** → Mitigation: scoped to issue #1164 (Allow equals under Stake). A quick grep shows `.allow-equals__wrapper` is the only trade-param row pinning `height: var(--core-size-1100)` around a Quill toggle; no drive-by refactors in this change.
- **[Risk] Quill later changes toggle height away from `--core-size-1400`.** → Mitigation: both sides use design tokens from the same system; if Quill renames the token, both the library CSS and this row need a coordinated update. Comment in SCSS points at the toggle token.

## Migration Plan

Pure front-end CSS change. No feature flag, no data migration. Deploy with the normal trader bundle. Rollback is a one-line revert of the height token in `allow-equals.scss`.

## Open Questions

None that block implementation. Assumption: matching the row to `--core-size-1400` is preferred over removing the fixed height; implementers may choose `min-height` if visual QA prefers natural sizing, as long as the toggle is fully unclipped (spec scenarios still hold).
