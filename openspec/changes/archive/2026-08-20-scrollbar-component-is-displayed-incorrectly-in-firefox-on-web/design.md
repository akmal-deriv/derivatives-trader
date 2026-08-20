## Context

See proposal.md for motivation (issue #993). Specs for observable behavior: `specs/themed-scrollbars/spec.md`.

The shared component is `ThemedScrollbars` in `packages/components/src/components/themed-scrollbars/`. Styling lives entirely in `themed-scrollbars.scss` under BEM block `.dc-themed-scrollbars`. Firefox does not implement `::-webkit-scrollbar*`; it only honors the standard properties `scrollbar-width` and `scrollbar-color`.

Current SCSS (relevant rules):

```scss
.dc-themed-scrollbars {
    /* Firefox only */
    scrollbar-color: var(--color-interactive-active) var(--color-surface-primary);
    scrollbar-width: thin;

    &__autohide {
        &::-webkit-scrollbar-thumb { display: none; }
        &--is-hovered {
            &::-webkit-scrollbar-thumb { display: unset; }
        }
    }
    &--hidden-scrollbar {
        &::-webkit-scrollbar { display: none !important; }
    }
    &::-webkit-scrollbar { width: 5px; height: 5px; background-color: transparent; … }
    &::-webkit-scrollbar-track { background-color: transparent; }
    &::-webkit-scrollbar-thumb {
        border-radius: 10px;
        background-color: var(--color-interactive-active);
    }
}
```

Three concrete gaps vs WebKit (inferred from code):

1. **Track color** — Firefox uses `var(--color-surface-primary)` as the second `scrollbar-color` value, while WebKit track is `transparent`. That paints an opaque gutter in both light (`--brand-white`) and dark (`--brand-black`) themes. The account-switcher override already corrected this locally with `transparent` (`account-switcher.scss:246`).
2. **Autohide** — Only WebKit thumb `display` is toggled. Firefox keeps `scrollbar-color` / `scrollbar-width: thin` always on, so the thumb never hides.
3. **Hidden mode** — `--hidden-scrollbar` only sets `::-webkit-scrollbar { display: none }`. Firefox still shows a thin themed bar.

Separately, AppV2 defines `@mixin themed-scrollbar` in `market-selection.scss:151-164` with **only** `::-webkit-scrollbar*` rules (thumb `var(--semantic-color-slate-solid-surface-frame-mid)`, transparent track). Applied to market list/discovery/desktop/info scroll panels. In Firefox those panels get the OS default scrollbar.

Tokens used by the shared component (`packages/shared/src/styles/tokens/semantic.scss`):

| Token                        | Light                          | Dark                                      |
| ---------------------------- | ------------------------------ | ----------------------------------------- |
| `--color-interactive-active` | `lighten($color-neutral, 25%)` | `lighten($color-black, 16%)` → ~`#323738` |
| `--color-surface-primary`    | `--brand-white`                | `--brand-black`                           |

Theme class is on `document.body` (`theme--light` / `theme--dark` via `ui-store.js`), so CSS variables already swap correctly; no JS theme branching is required.

## Goals / Non-Goals

**Goals:**

- Make `.dc-themed-scrollbars` Firefox styling match WebKit: transparent track, same thumb token, thin width.
- Wire autohide and hidden modes through standard scrollbar properties so Firefox respects them.
- Give `@mixin themed-scrollbar` equivalent Firefox rules so AppV2 market panels stay themed.
- Lock the class-name contract with a co-located Jest test; document the manual Firefox visual check.

**Non-Goals:**

- No custom JS scrollbar library, no canvas/div fake scrollbars.
- No redesign of thumb width/radius/colors beyond matching existing WebKit tokens.
- No sweep of every ad-hoc `overflow-y: auto` in AppV2 (duration picker, accumulator stats, positions drawer list, etc.) unless it already uses `ThemedScrollbars` or `@mixin themed-scrollbar`. Those can follow up if product flags them.
- No change to `ThemedScrollbars` public props or export path.
- No Playwright visual snapshot (not present in repo for this component; out of scope).

## Decisions

1. **Fix track to `transparent` on the shared component (KISS, matches WebKit + account-switcher precedent).**
    - Change base rule to:
      `scrollbar-color: var(--color-interactive-active) transparent;`
      `scrollbar-width: thin;`
    - Alternative considered: introduce a dedicated `--color-scrollbar-track` token — rejected (YAGNI); WebKit already uses literal `transparent`, and account-switcher already chose `transparent`.

2. **Implement Firefox autohide by clearing standard properties when not hovered.**
    - On `__autohide` (without `--is-hovered`):
      `scrollbar-width: none;` and/or `scrollbar-color: transparent transparent;`
    - On `__autohide--is-hovered`: restore
      `scrollbar-width: thin;`
      `scrollbar-color: var(--color-interactive-active) transparent;`
    - Keep existing WebKit `display: none` / `unset` rules so Chrome/Safari behavior is unchanged.
    - Alternative considered: always-visible thin bar in Firefox only — rejected; violates the autohide default (`autohide = true` in `themed-scrollbars.tsx:24`) and the parity requirement.

3. **Implement Firefox hidden mode with `scrollbar-width: none`.**
    - On `--hidden-scrollbar`:
      `scrollbar-width: none;`
      (optionally `scrollbar-color: transparent transparent;` for older Firefox)
    - Keep the WebKit `display: none !important` rule.
    - Alternative considered: `scrollbar-width: none` only at the root and rely on cascade — rejected; default state must remain `thin`, so the modifier must override explicitly.

4. **Extend `@mixin themed-scrollbar` with Firefox properties using the same tokens the mixin already uses for WebKit.**

    ```scss
    @mixin themed-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: var(--semantic-color-slate-solid-surface-frame-mid) transparent;
        // existing ::-webkit-scrollbar* rules unchanged
    }
    ```

    - One mixin change covers all four call sites (list, discovery, desktop, info).
    - Alternative considered: switch those panels to `<ThemedScrollbars>` — rejected for this bugfix; markup/layout changes are broader than needed and the mixin already encodes a slightly different thumb token (slate frame-mid vs interactive-active).

5. **Test the class contract, not computed Firefox styles.**
    - Co-locate `packages/components/src/components/themed-scrollbars/__tests__/themed-scrollbars.spec.tsx`.
    - Assert root has `dc-themed-scrollbars`; default `autohide` adds `dc-themed-scrollbars__autohide`; hover path (mock `useHover` or fire events if feasible) adds `--is-hovered`; `is_scrollbar_hidden` adds `--hidden-scrollbar`.
    - SCSS visual correctness in real Firefox is a manual verification step (tasks.md), because Jest/jsdom does not apply Firefox scrollbar metrics.
    - Alternative considered: stylelint custom rule or screenshot test — rejected; no existing pattern in this package, high setup cost for a CSS two-liner fix.

6. **Do not touch the account-switcher override.**
    - It already sets `scrollbar-color: var(--color-text-secondary) transparent` (different thumb token by design). After the base track fix it remains a valid local thumb-color override.

## Risks / Trade-offs

- [Firefox `scrollbar-width: none` still reserves no gutter, but some OS/Firefox versions show overlay scrollbars on scroll regardless] → Acceptable; matches how other AppV2 rules already use `scrollbar-width: none` (market tabs, trade types, positions, guide). Behavior is still better than today's always-visible wrong-colored bar.
- [Autohide in Firefox cannot perfectly mimic WebKit `display: none` on the thumb only while keeping a track] → Standard properties hide the whole scrollbar; that is the closest supported equivalent and is what the rest of the codebase already uses for "hide scrollbar".
- [AppV2 panels not on the mixin keep OS scrollbars in Firefox] → Scoped non-goal; document as follow-up if QA finds more surfaces on the issue screenshots.
- [Changing base `scrollbar-color` track to transparent may slightly change the look of always-visible (`autohide={false}`) scrollbars that previously showed a solid surface-colored gutter in Firefox] → That gutter was the bug; transparent is the intended WebKit-matched design.
- [No automated cross-browser visual regression] → Mitigated by explicit manual Firefox light/dark checklist in tasks.md and by locking class hooks so autohide/hidden wiring cannot regress silently.

## Migration Plan

Pure CSS (+ one component test). No feature flag, no data migration, no consumer code changes.

1. Land SCSS fixes in `@deriv/components` and the AppV2 mixin.
2. Land the co-located Jest spec.
3. Verify manually in Firefox (light + dark) on a known `ThemedScrollbars` surface (e.g. desktop app shell / dropdown list) and a market-selection panel.

Rollback: revert the SCSS/test commit. No persisted state to clean up.

## Open Questions

See `tasks.md` (scope of non-mixin AppV2 overflow surfaces; whether duration `time-grid-picker` should be included). Recommended defaults are applied so implementation can proceed without blockers.
