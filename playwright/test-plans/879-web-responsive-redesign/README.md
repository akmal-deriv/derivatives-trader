# Test Plan — DTrader Web Responsive Redesign

> **Issue:** [deriv-com/derivatives-trader#879](https://github.com/deriv-com/derivatives-trader/issues/879)
> **Purpose:** Manual coverage for the redesign epic, to be executed by QA on the staging build below before the changes merge into `staging-dtrader.deriv.com`. Once merged, promote the confirmed flows into `playwright/flows/trade/` for automation (see [Next Steps](#next-steps)).
> **Status:** Draft — written against the pre-merge preview build. Re-verify every case once the feature branch lands on staging; UI details may shift.

---

## Scope

6 user stories, each owned by a different engineer:

| #   | Story                                                      | Owner         | Suite file                                                                   |
| --- | ---------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------- |
| 1   | Expandable chart with inline indicator management          | @behnam-deriv | [`01-chart-indicators.md`](./01-chart-indicators.md)                         |
| 2   | Unified wheel picker for duration                          | @farabi-deriv | [`02-duration-selection.md`](./02-duration-selection.md)                     |
| 3   | Simplified stake selection                                 | @farabi-deriv | [`03-stake-selection.md`](./03-stake-selection.md)                           |
| 4   | Simplified trade parameter interactions across trade types | @farabi-deriv | [`04-trade-parameter-interactions.md`](./04-trade-parameter-interactions.md) |
| 5   | Market selection & discovery redesign                      | @nijil-deriv  | [`05-market-selection-discovery.md`](./05-market-selection-discovery.md)     |
| 6   | Multiple trade tabs                                        | @nijil-deriv  | [`06-multiple-trade-tabs.md`](./06-multiple-trade-tabs.md)                   |

**Key principle (from the issue):** production parity — every redesigned interaction must produce the same trade parameters, validation, and contract behavior as current production. A case that looks right visually but changes underlying values/limits is a bug, not a nit.

---

## Test Environment

| Item                                        | Value                                                                                         |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Preview build                               | `https://redesign-trade-selection.derivatives-trader.pages.dev`                               |
| Production baseline (for parity comparison) | `https://dtrader.deriv.com`                                                                   |
| Desktop viewport                            | ≥ 1280×800                                                                                    |
| Mobile viewport                             | 500×850 (matches `chromium-mobile` Playwright project — Pixel 5 class)                        |
| Auth states to cover                        | Logged out (guest/public), logged in — Real, logged in — Demo                                 |
| Accounts                                    | Use staging Real + Demo accounts; low-balance Real account for insufficient-balance Buy cases |

**Confirmed structural divergence between viewports** — cross-checked against the Figma source ([canvas "🚧 Multiple tab + market selector"](https://www.figma.com/design/1epDdGowM1nQDyRydALZWI/branch/zkhQsTI8PMKJX7k1N2QBJ1/Deriv-Trader-V2---Main-Layout?node-id=17806-249073)):

- **Duration**: mobile uses a single bottom sheet with a unified `Time` tab (hr/min/sec in one 3-column wheel). Desktop keeps **separate** `Seconds` / `Minutes` / `Hours` tabs — **confirmed intentional by Figma** (see the "Quick picks and custom UI update" section: desktop explicitly keeps a 5-tab left nav `Ticks/Seconds/Minutes/Hours/End time`, each with `Quick picks`/`Custom` sub-tabs). The "unify into one wheel" part of story #2 is mobile-only by design, not a gap.
- **Stake**: mobile's stake sheet shows a **Save** button. Figma confirms this is **not** a leftover — the `Save` button belongs specifically to the **Custom** (manual numeric entry) sub-tab; `Quick picks` (preset chips) apply instantly with no Save. Desktop splits these into two literal sub-tabs (chips vs. custom+Save); mobile's preview build shows chips and the custom input combined on one screen with a single Save button, which still needs confirming — does tapping a _chip_ on mobile also require pressing Save, or only manual entry? (see `STAKE-04`/`STAKE-16`).
- **Market selection**: mobile shows trade types as a horizontal tab strip; desktop groups them in a left sidebar under `Directional` / `Growth based` / `Digit based` headers. Same data, different chrome — verify both group correctly. Figma has dedicated sections for the Featured/Info/Add-to-favourites flow, a Derived-market filter page, a Favourites page, a Market Closed scenario, and a Market Search scenario (incl. an empty-results state) — all in scope, not incidental.
- **Multiple tabs**: Figma confirms a hard limit of **4 tabs**, with an explicit toast: _"You can open up to 4 tabs at a time. Close one to add another."_ — see `TABS-14`.

---

## Entry Criteria

- Preview build reachable and rendering the redesigned trade page (chart, param bar, Buy button visible)
- At least one staging Real and one Demo account available with a topped-up balance

## Exit Criteria

- Every `P0`/`P1` case across all 6 suites executed at least once per viewport
- All failures logged with: suite, case ID, viewport, actual vs. expected, screenshot
- No open `P0` defects

## Priority Legend

| Priority | Meaning                                                      |
| -------- | ------------------------------------------------------------ |
| P0       | Blocking — breaks a trade flow or violates production parity |
| P1       | High — core redesigned behavior, must work before merge      |
| P2       | Medium — secondary paths, validation edge cases              |
| P3       | Low — cosmetic / nice-to-have                                |

## Status Legend (fill in during execution)

`⬜ Not run` · `✅ Pass` · `❌ Fail` · `🟡 Blocked`

---

## Execution Progress (last updated 2026-08-04)

Manual execution against the preview build, logged in as Demo account (shared staging QA account — see environmental note in Suite 6), both viewports unless noted.

| Suite                            | Status         | Result                                                                                                                                                                                                               |
| -------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Chart & Indicators           | ✅ Done        | Story appears **not implemented** in this build — indicator management is still the legacy modal only, no on-chart chips anywhere, mobile lacks an Indicators entry point at all. See suite file for full breakdown. |
| 2 — Duration Selection           | ✅ Done        | Strong pass — 13/16 cases confirmed, matched Figma exactly (range helpers, gated Save, validation copy). 2 P2 cases deprioritized for time; DUR-13 didn't apply to this architecture.                                |
| 3 — Stake Selection              | ⬜ Not started | Next up.                                                                                                                                                                                                             |
| 4 — Trade Parameter Interactions | ⬜ Not started |                                                                                                                                                                                                                      |
| 5 — Market Selection & Discovery | ⬜ Not started |                                                                                                                                                                                                                      |
| 6 — Multiple Trade Tabs          | ✅ Done        | Mostly solid, but **2 P0 defects found**: Stake doesn't reliably persist per-tab (TABS-03), and desktop doesn't enforce the Figma 4-tab max while mobile does (TABS-14). See suite file.                             |

**Defects found so far (worth filing before merge):**

1. Suite 6 / TABS-03 — Stake not reliably retained per-tab (P0)
2. Suite 6 / TABS-14 — 4-tab max not enforced on desktop (P0)
3. Suite 1 — chart/indicator redesign (story #1) not present in this build at all (blocks the whole suite until @behnam-deriv's build/Figma is available)

**To resume:** pick up with Suite 3 (Stake Selection), then Suite 4, then Suite 5. Browser session was left logged into the Demo account on desktop viewport.

---

## Open Questions / Risks Carried Across Suites

1. ~~Stake "Save" button removal~~ — **resolved via Figma**: Save is scoped to the Custom entry tab, not a removed feature. Remaining question: does mobile's combined chips+input sheet require Save even for a pure chip tap? (`STAKE-04`/`STAKE-16`)
2. ~~Duration unification desktop scope~~ — **resolved via Figma**: desktop intentionally keeps 5 separate tabs; unification is mobile-only.
3. Chart indicator chip management (story #1) could not be confirmed through accessibility-tree exploration or in the linked Figma canvas (which is scoped to stories #5/#6, not #1). `01-chart-indicators.md` cases are still written from the issue description only — get the Figma link/section for @behnam-deriv's chart work specifically before executing that suite.
4. Confirm whether the "Stats" ticker row added above Accumulators params (barometer of recent ticks) is in scope of story #4 or a separate change — not mentioned explicitly in the issue text, and not present in the reviewed Figma canvas (which doesn't cover story #4 either — get @farabi-deriv's Figma link for stories #2/#3/#4 to close this out).
5. Confirm exact custom-duration step granularity beyond the one sample seen (Seconds custom range: 15–60s) for Minutes/Hours/Ticks, and confirm per-trade-type/per-market range differences match production.

## Figma Coverage Note

The Figma link shared for this plan (`node-id=17806-249073`) points at canvas **"🚧 Multiple tab + market selector"**, which covers stories #5 (Market Selection & Discovery) and #6 (Multiple Trade Tabs) directly, plus incidentally covers the desktop Duration/Stake `Quick picks`/`Custom` pattern (stories #2/#3) since those components appear inside the same mockups. It does **not** cover story #1 (chart/indicators) or story #4 (trade parameter interactions beyond duration/stake). Ask @behnam-deriv and @farabi-deriv for their respective Figma sections/branches before treating `01-chart-indicators.md` or `04-trade-parameter-interactions.md` as Figma-verified.

## Next Steps

- Execute this plan against the preview build; update the Status column inline in each suite file (or duplicate the tables into a spreadsheet/TestDino run if the team wants shared tracking).
- Once the branch merges to `staging-dtrader.deriv.com`, re-run `src-to-flow-dtrader` / `flow-to-playwright-dtrader` against the confirmed behavior to promote passing flows into `playwright/flows/trade/` and generate specs under `playwright/tests/trade/`.
- Do not automate a case until its manual result is `✅ Pass` on staging — the preview build is pre-merge and may still change.
