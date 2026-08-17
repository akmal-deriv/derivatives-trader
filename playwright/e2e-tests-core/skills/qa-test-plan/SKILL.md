---
name: qa-test-plan
description: Given a GitHub issue in deriv-com/derivatives-trader, research the issue + its fix PR and post a reusable, GitHub-native manual QA test-plan checklist as a comment. Use when the user asks for a "test plan", "test checklist", or "checklist for testing" for a QA-tracked issue. Do NOT use for Playwright/e2e test authoring — use flow-to-playwright-dtrader / gap-to-playwright / src-to-flow instead.
version: 1.0.0
last_updated: 2026-08-17
---

# QA Test Plan Generator

Produce a manual QA test plan as a GitHub comment for a tracked issue in `deriv-com/derivatives-trader`.

## When to use

The user gives a GitHub issue URL (or number) and asks for a **test plan** / **test checklist** / "checklist so we can mark it off while testing". These issues are typically labelled `bughunt`, type `Bug`, and sitting in the **"Options Trading Web App (In QA)"** project column.

## Prerequisites

- `gh` CLI authenticated to deriv-com/derivatives-trader (the GitHub MCP tools may return "Bad credentials"; `gh` is the reliable path).
- Read access to the repo to view issues, PRs, diffs, and comments.

## Workflow

Follow in order. Research before writing anything.

### 1. Read the issue

```bash
gh issue view <number> --repo deriv-com/derivatives-trader                 # title, body, labels, assignees, project
gh issue view <number> --repo deriv-com/derivatives-trader --comments      # screenshot + Slack context often live here
```

Capture: **what's broken**, the **expected result**, the reporter's **reproduction steps**, and the **scope** (mobile vs desktop, AppV1 vs AppV2, which component).

### 2. Find and read the fix PR

```bash
gh pr list --repo deriv-com/derivatives-trader --search "<number>" --state all
```

Also try keywords from the issue title. A PR whose branch/body matches the issue's symptom is the fix PR — confirm `Closes #<n>` in its body.

Read it fully — the diff is ground truth, the description is secondary:

```bash
gh pr view <number> --repo deriv-com/derivatives-trader           # description, root cause, scope notes
gh pr diff <number> --repo deriv-com/derivatives-trader            # the ACTUAL code change — read this carefully
gh pr view <number> --repo deriv-com/derivatives-trader --comments # bot review (severity table) + Cloudflare deploy
```

- Extract the **QA test link** from the `cloudflare-workers-and-pages` bot deploy comment: the **Branch Preview URL** (`https://<branch>.derivatives-trader.pages.dev`) and the **Preview URL**. Prefer the branch preview URL — **no build step needed**.
- If no PR is linked/found, ask the user which PR is the fix (or whether to write the plan from the issue alone, with no QA link section). Don't guess.

### 3. Map the issue to the documented flows (for solid, authoritative coverage)

This repo keeps a journey-spec system in `playwright/flows/`. It is the single best source for _solid_ regression coverage — these are plain-English, step-by-step flows with expected results and Desktop/Mobile platform breakdowns, kept in sync by the `_orchestrator.md` process. A plan built only from the issue+diff can miss real user journeys; the flows supply the authoritative ones.

Index first:

```bash
cat playwright/flows/_index.md          # module → flow table: id, priority, status, user state
```

Then load the matching module's flow + coverage + catalog:

```bash
cat playwright/flows/<module>/flow.md      # step tables: # | Step | Action | Expected Result | Platform
cat playwright/flows/<module>/coverage.md  # Section 1 (Desktop/Mobile ✅/❌), Section 2 (gaps), Section 3 (priority)
cat playwright/flows/<module>/catalog.md   # journey id → spec file + tags (@production/@smoke/@desktop/@mobile) for the e2e command
```

**Mapping the issue to a module/flow:**

- Match on the **component path** from the PR diff (e.g. `AppV2/Components/TradeParameters/Duration/` → `trade` module; `ChartMaximizeButton` + a Turbos barrier issue → `trade` module, Turbos flows 10.1–10.4).
- Match on **trade type / feature keyword** (barrier → Higher/Lower, Touch/No Touch, Turbos; duration → trade Duration; market picker → `market-selection`).
- Match on **user state** from the issue (authenticated/funded, mobile/desktop, market closed, EU account) against the flow's "User State" column in `_index.md`.
- Modules in this repo: `trade`, `positions`, `reports`, `notifications`, `auth`, `automation`, `feed`, `market-selection`.

**What to fold into the plan from the flows:**

- The relevant flow's **step table** → a "Related user journey (from `playwright/flows/...`)" section that turns the documented steps into manual checkboxes. Example for the Turbos barrier issue: Flow 10.1 "buy Up → verify in positions" steps where Barrier visibility is part of the expected result.
- The flow's **Expected Result** column → concrete pass criteria for each step (e.g. "Barrier visible" appears as an expected result on the contract-details verification step — use it as a checkbox).
- **Coverage gaps** from `coverage.md` Section 1 (the ✅/❌ matrix) and Section 2/3 → for each mapped flow, state whether it's `automated` (e2e exists) or a `documented` gap (manual-only). If the issue's platform column is ❌, say so explicitly — **e2e coverage is lacking on that platform, so manual QA is the only backstop**.
- **Platform split** (Both/Desktop/Mobile) → the issue says "mobile web view", so pull the Mobile-column expected results specifically; still spot-check Desktop for out-of-scope regressions.
- **Spec file + tags from `catalog.md`** → for the automated-test section, give the runnable command, not just the flow number. Example: `npx playwright test playwright/tests/trade/turbos/verify-turbos.spec.ts --grep "@mobile"` for a Turbos mobile issue. Tags (`@production`, `@smoke`, `@desktop`, `@mobile`) let QA scope the run to the issue's platform without re-running the whole suite.

**When the flows don't map:** some bugs are pure component polish (e.g. calendar whitespace #1076, chevron removal #1068) with no dedicated flow. In that case skip the flow section and say so — "No documented flow covers this — component-level visual fix; plan derived from the diff only". Don't force a flow mapping where none fits.

### 4. Build the plan from the diff + flows

Write the plan around **what the diff actually changes**, enriched by the mapped flow's steps. Derive sections from:

- The issue's own reproduction steps → a "reproduce the original bug (confirm fixed)" section with pass/fail criteria.
- The diff → the primary fix verification (the exact visual/behavior that should now be different).
- What the diff **preserves** → regression sections (e.g. if `onClick` handlers are untouched, verify tap-to-open still works).
- The mapped flow's step table → a "Related user journey" section with the authoritative expected results as checkboxes.
- The flow's coverage status → a note on whether e2e backs this up (automated), or whether it's manual-only (documented gap / ❌ on the issue's platform) — so QA knows manual testing is the only safety net.
- The PR's stated **out-of-scope** items → a section confirming they weren't accidentally touched (e.g. desktop component untouched).
- Any **bot review nits** → an optional, clearly-marked non-blocking follow-up item.

### 5. Structure (use this skeleton, adapt specifics to the change)

In order:

1. **Title** + Fix PR number + status (In QA) + change type.
2. **Summary** — what was broken, root cause from the PR, what the fix does, in plain language. End with a **Scope** line (which files, mobile vs desktop, what's out of scope).
3. **QA test link (from PR #X deploy)** — Cloudflare Branch Preview URL + Preview URL.
4. **Entry / Exit criteria** — the QA Definition-of-Done gates (see step 4a below).
5. **Environment & setup** — mobile/responsive, viewport sizes, browsers, confirm deployed commit vs production.
6. **Steps to reach the affected screen** — from the issue's repro steps.
7. **Primary fix verification (pass/fail)** — the specific thing the diff changes. Tag 🔴/🟠.
8. **Functional / regression sections** — adapt to the change (e.g. "Tap-to-open behaviour", "Month navigation — height stability", "Maximize button appearance"). Tag each section 🔴/🟠/🟡/🟢.
9. **Accessibility (a11y)** — see step 4b below; always present.
10. **Related user journey (from `playwright/flows/...`)** — only when a flow maps (see step 3): the documented steps as checkboxes with the flow's Expected Result column as pass criteria; note coverage status (automated vs documented gap) and tags (`@production`/`@smoke`).
11. **Cross-device / cross-browser** — Chrome Android, Safari iOS, devtools emulation, Samsung Internet, desktop narrow window.
12. **Out-of-scope confirmation** — the component the PR explicitly did not touch.
13. **Edge cases** — long strings, RTL/Arabic, dark/light theme, narrow viewport, rotate, small height.
14. **Negative / defensive** — rapid tapping, background/resume, network latency, switching states.
15. **Automated test (Playwright e2e only)** — for each mapped flow, give the **spec file** + **tags** from `catalog.md` and a runnable command (`npx playwright test <spec> --grep "<tag>"`); then **coverage status** — pull the ✅/❌ from `coverage.md` Section 1 for the affected platform(s). State explicitly whether e2e already covers this happy path (automated) or whether coverage is **lacking** (documented gap / ❌ on the issue's platform) so manual QA knows it's the only backstop. Do NOT list the PR's unit tests here. **`N/A` surface exception:** if the affected surface is status `N/A` in `_index.md` (e.g. SmartCharts canvas — "not automatable"), say "no e2e applies — manual-only" and **don't fabricate a runnable command**; point only at the _indirect_ flows that touch it (e.g. trade-buy journeys where "Barrier visible"/"Entry spot" is an expected result). Do not propose a `gap-to-playwright` follow-up for an `N/A` surface — it's not automatable by design.
16. **Sign-off** — must-pass criteria, screenshot request, "move out of In QA".
17. **Notes for tester** — the 1–2 things most likely to break and the single biggest risk (mandatory `>` blockquote).

### 5a. Risk tagging

Tag every section header with a risk badge so QA spends time on what matters:

| Tag         | Meaning                                      | When to use                                                                               |
| ----------- | -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 🔴 Critical | Core path / money / data loss / a11y blocker | The fix touches purchase, balance, contract state, or a WCAG-failing contrast/focus issue |
| 🟠 High     | Likely regression with workaround            | The fix touches a primary user journey the flow covers; failure degrades trading          |
| 🟡 Medium   | Edge cases / non-blocking                    | Off-path flows, rare states, cosmetic polish                                              |
| 🟢 Low      | Cosmetic only                                | Pure visual, no journey impact                                                            |

Score each section Criticality × Likelihood. The **Primary fix verification** and **Accessibility** sections are 🔴 or 🟠 by default.

### 5b. Entry / Exit criteria

State both explicitly near the top of the plan (structure item 4). These are the QA Definition-of-Done gates:

**Entry (start QA only when):**

- [ ] Fix PR deployed to a Cloudflare Pages preview (link above loads, correct commit)
- [ ] PR CI / existing e2e green on the affected platform
- [ ] The mapped flow's automated e2e (if any) passes on the issue's platform
- [ ] Issue reproduction confirmed on production/current build (so you have a before state)

**Exit (QA is done only when):**

- [ ] All 🔴 Critical and 🟠 High sections pass on the issue's platform
- [ ] No new 🔴/🟠 defects open against this issue
- [ ] Accessibility section passes (no new WCAG AA contrast or focus regressions)
- [ ] The issue's stated Expected Result is verified (acceptance criterion)
- [ ] Full regression on the affected platform green (or the missing coverage noted as manual-only)

If exit criteria aren't met → do not move out of "In QA"; file a follow-up and keep the issue open.

### 5c. Accessibility (a11y) section

Always present — even for "purely visual" fixes, a11y is where regressions hide. Derive the specific checks from the diff:

- **Opacity / transparency / blur change** (e.g. #1119 `blur 8px → 1px`) → **color contrast**: the glyph/icon stroke stays ≥ 4.5:1 (WCAG AA) over light AND dark chart backgrounds, busy content, and the disabled state. Contrast risk is the #1 a11y regression for transparency changes.
- **Icon removal / tap-target change** (e.g. #1068 chevron removed) → **tap-target size** (≥ 44×44px on mobile), **keyboard reachability** (Tab reaches the field, visible focus ring), and **focus management** (when the picker opens, focus moves into it and returns on close).
- **Calendar / grid changes** (e.g. #1076) → **keyboard arrow navigation** across the grid, **screen-reader announcement** of the focused date / month navigation, **role="grid"/gridcell** present, no focus trap.
- **Any interactive control** → ARIA label/name not lost by the change, no new orphaned icon with no accessible name, visible focus indicator on the fixed control.

Checklist the a11y section against: keyboard nav, focus management, ARIA roles/labels, color contrast, screen reader (VoiceOver/TalkBack on one real device), and the disabled state. Mark this section 🔴 if the fix touched contrast or tap-targets, 🟠 otherwise.

### 6. Format rules

- Every actionable item is a **GitHub checkbox**: `- [ ]`.
- Use **bold** for field/control names the tester will look for.
- Reference real values from the diff (test IDs like `dt_date_input`, exact CSS like `blur(8px) → blur(1px)`, exact component paths) — specificity makes the plan verifiable.
- Tag every section header with its risk badge (🔴/🟠/🟡/🟢).
- Keep it skimmable: section headers with `###`, no walls of text.
- The **Notes for tester** block at the end is a `>` blockquote and is **mandatory**.

### 7. Post the comment

```bash
gh issue comment <number> --repo deriv-com/derivatives-trader --body-file /tmp/issue_<number>_comment.md
```

Return the comment URL to the user. If revising a comment you already posted, **edit in place** via the API rather than posting a duplicate:

```bash
gh api -X PATCH /repos/deriv-com/derivatives-trader/issues/comments/<comment_id> -F body=@/tmp/issue_<number>_comment.md --jq '.html_url'
```

## Pitfalls to avoid

- **Don't write "Build the QA branch"** — the PR is deployed to Cloudflare Pages. Pull the preview URL from the PR's deploy comment and use it.
- **Don't write the plan from the issue body alone** — read the PR diff. The issue describes the symptom; the PR diff is the ground truth for what to test. The issue's "expected result" is sometimes vaguer than what the fix actually delivers.
- **Don't invent the QA link** — it must come from the `cloudflare-workers-and-pages` bot comment on the PR.
- **Don't omit the out-of-scope section** — regressions most often come from an untouched sibling component (e.g. the desktop version of the same control). Confirm it's unchanged.
- **Don't paste a generic template** — adapt every section to the actual diff. A calendar-height fix, a chevron-removal fix, and a chart-button-transparency fix share the skeleton but not the specifics.
- **Don't force a flow mapping where none fits** — pure component-polish bugs (calendar whitespace, chevron removal) have no dedicated flow; say "No documented flow covers this" and derive from the diff instead of shoehorning an unrelated journey.
- **Don't skip the flows when they DO fit** — for trade-type/barrier/duration/market bugs, the flow's step table + Expected Result column is more authoritative than anything you'd invent. A solid plan layers the diff's visual fix _on top of_ the documented journey's expected results.
- If a PR review bot flagged a **low-priority nit**, include it as an _optional, non-blocking_ item — never as a sign-off blocker.
- **Don't skip the Accessibility section, even for "purely visual" fixes.** A blur/opacity change (#1119) is a contrast risk; an icon removal (#1068) is a tap-target/focus risk; a calendar resize (#1076) is a keyboard/screen-reader risk. These are the regressions a visual plan most often misses — a11y is where they hide.
- **Don't leave Entry/Exit implicit.** A plan without exit criteria leaves "is QA done?" subjective — the explicit exit gates (all 🔴/🟠 pass, no new 🔴/🟠 defects, a11y clean, acceptance criterion verified) are what let QA move the issue out of "In QA" defensibly.
- **The automated-test section is Playwright e2e only — not unit tests.** Give the runnable command (spec file + `--grep` tag) and the coverage status; don't list the PR's Jest/Vitest cases. A QA reviewer reading the issue needs to know which e2e to kick off, not which unit assertions the dev added.
- **Always state coverage status explicitly, even when it's good news.** If the affected flow's platform column is ✅, say "e2e covers the happy path — manual QA focuses on the visual fix + edge cases". If it's ❌, say "no e2e on this platform — manual QA is the only backstop, treat the regression section as mandatory". Silent omission reads as "covered" when it isn't.
- **When e2e coverage is lacking for the fix, suggest a follow-up.** If the issue's symptom (e.g. negative barrier overlap) isn't asserted in any flow, propose adding it — point at the `gap-to-playwright` skill (for a manual-gap-found flow) or `src-to-flow-dtrader` (if it's a new user journey), and mark it as an out-of-this-PR follow-up so it doesn't block sign-off. **But never propose a follow-up for an `N/A` surface** (e.g. SmartCharts canvas) — it's not automatable by design; say "no e2e applies — manual-only" and point only at the indirect flows that touch it. Don't fabricate a runnable e2e command for a surface that has none.

## Examples of good "Notes for tester" lines

- _"The two things most likely to break are (1) an empty icon slot/gap where the chevron was, and (2) tap-to-open regressing if the `onClick` handler was disturbed."_
- _"If the barrier is still fully hidden, the blur change wasn't enough and the fix may need a layout/z-index follow-up (out of scope of this PR)."_
- _"Prioritize the month-navigation height-stability and day-tile-shape sections — if the selection pill turns into an oval on short months, that's the `align-content: flex-start` override being lost."_
