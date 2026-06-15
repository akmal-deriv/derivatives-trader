---
name: gap-to-playwright
description: Use when a test gap is discovered manually — from live app exploration, QA testing, code review, PR feedback, or any source other than src/ analysis. Guides adding the gap to all required files (flow.md, coverage.md, catalog.md, _index.md, Page Object, spec file) and implementing the test. Do NOT use when the gap already exists in coverage.md (use flow-to-playwright instead) or when the gap was found via src/ analysis (use src-to-flow instead).
version: 1.0.0
last_updated: 2026-05-25
---

# Gap-to-Playwright Skill

## 🎯 When to Use This Skill

Use this skill when:

- ✅ You discovered a missing test while manually exploring the live app
- ✅ A QA, code review, or PR comment surfaced a behaviour that has no test coverage
- ✅ A bug was filed and you want to add a regression test for it
- ✅ You noticed a country-specific, account-state-specific, or flag-specific UI variation that is untested
- ✅ A gap was identified through any means **other than** running `src-to-flow`

**Do NOT use this skill for:**

- ❌ A gap already documented as a **numbered flow row** in `coverage.md` Section 1 (i.e. the flow is documented but not yet automated) — use `flow-to-playwright` instead
- ❌ A gap found via `src/` source analysis with **no flow docs existing yet** — use `src-to-flow` instead (it generates the full docs suite)
- ❌ Fixing a failing test — use the `playwright` skill instead
- ❌ Generating flow docs for an entire module from scratch — use `src-to-flow` instead

> **Note on G-\* gap rows:** A G-\* row in `coverage.md` Section 2 is NOT a numbered flow — it is an undocumented gap. If you discovered a gap manually and it coincides with an existing G-\* entry, **continue using this skill**. Step 3a contains instructions for retiring the G-\* row as part of promoting it to a proper numbered flow.

> **In short:** This skill fills the gap between "I found something untested while using the app" and "the test exists, the docs are updated, and \_index.md is accurate". It collapses the full pipeline (document → implement → sync) into a single workflow.

---

## 🚨 Always Load the `playwright` Skill Alongside This Skill

**Before reading any files or writing any code, load BOTH skills:**

```
use_skill("gap-to-playwright")   ← governs WHAT files to update and in what order
use_skill("playwright")          ← governs HOW to write high-quality Page Objects and tests
```

The `playwright` skill provides the authoritative rules from `playwright/CLAUDE.md` and `playwright/.clinerules` — TypeScript standards, POM patterns, locator strategy, assertion format, tag requirements, and more. Missing these rules will introduce violations.

---

## 🔗 Position in the Pipeline

```
Manual discovery (live app / QA / code review / bug report)
     │
     │  [gap-to-playwright skill]  ← YOU ARE HERE
     ▼
Step 1-3: Document the gap
  playwright/flows/<module>/flow.md     ← add the new flow section
  playwright/flows/<module>/coverage.md ← add coverage row + update analysis date
  playwright/flows/<module>/catalog.md  ← add journey index entry + code snippet + POM reference
     │
Step 4: Implement the test
  playwright/pages/<Module>Page.ts      ← add any new locators + methods
  playwright/tests/<module>/<spec>.ts   ← write/update the spec file
     │
Step 5: Sync totals
  playwright/flows/_index.md            ← update flow counts + grand total
```

All 6 files must be updated before the task is considered complete.

---

## 📋 6-Step Protocol (Steps 0–5)

---

### Step 0 — Gather Gap Details

Before doing anything else, collect the following from the user or the context:

1. **Module** — which feature area does this gap belong to? (e.g. `onboarding`, `auth`, `cashier`)
2. **Gap description** — what behaviour is missing coverage? Be specific: country, account state, UI variation, error path, etc.
3. **Evidence** — how was it discovered? (live app observation, bug report, PR comment, code review)
4. **Entry point** — where does the flow start? (URL, page, account state)
5. **Key assertion** — what is the single most important thing the test must verify?

If any of these are missing, use `AskUserQuestion` to collect them before proceeding.

---

### Step 1 — Read Existing Flow Docs and Find the Next Flow ID

**Run this before exploring the app or writing any code.**

```bash
# Read all three flow doc files for the module
cat "playwright/flows/<module>/flow.md"
cat "playwright/flows/<module>/coverage.md"
cat "playwright/flows/<module>/catalog.md"
```

Extract:

| Item                          | Where to look                                                                    |
| ----------------------------- | -------------------------------------------------------------------------------- |
| **Highest existing flow ID**  | `flow.md` — every `## Flow N` heading (H2). Next ID = `max(N) + 1`               |
| **Highest existing gap ID**   | `coverage.md` Section 2 — every `G-*` row                                        |
| **Last coverage row number**  | `coverage.md` Section 1 — count existing numbered rows                           |
| **Existing POM method names** | `catalog.md` Section 3 — avoid naming conflicts                                  |
| **Existing spec files**       | `playwright/tests/<module>/` — check if a spec file for this flow already exists |

> **Rule:** If a spec file already exists and partially covers this gap, append the new test to it rather than creating a new file.

Also check `playwright/flows/_index.md` for the current totals to know what to increment in Step 5:

```bash
grep "<module>" playwright/flows/_index.md
grep "Total" playwright/flows/_index.md
```

> **New module:** If `playwright/flows/<module>/` does not exist yet, create the directory and copy the template files from `playwright/flows/_conventions/`. Start numbering at Flow 1. In Step 5 add a new module row to `_index.md` (totals `1 | 1 | 1`) rather than incrementing an existing one.

---

### Step 2 — Understand the Behaviour

Understand exactly what the UI does before writing a single line of documentation or code.

**Two paths — choose based on what is available:**

#### Path A: Source code available (`src/`)

Search the source first — it is faster, works offline, and gives ground-truth locators:

```bash
# Find the component(s) responsible for this behaviour
grep -r "data-testid" src/features/<module> --include="*.tsx" -n | grep -i "<keyword>"
grep -r "<keyword>" src/features/<module> --include="*.tsx" -n | head -20
```

Read the relevant component files in full. Look for:

- `data-testid` values on the element(s) involved
- Conditional rendering (`{flag && <Section />}`) that gates the feature
- Translation keys → resolve in `src/messages/en.json` for exact copy

#### Path B: Source not available or insufficient

Use Playwright MCP to observe the live app:

1. Navigate to the entry point on staging
2. Reach the UI state where the gap manifests
3. Take a snapshot to capture element roles, test IDs, and visible text
4. Record every `data-testid` attribute relevant to the assertion

**Never guess `data-testid` values.** If they cannot be found in `src/` or via MCP snapshot, mark them `🔍 Verify on staging` in the catalog.

---

### Step 3 — Document the Gap (3 files)

Update the three flow doc files. **All three must be updated in the same pass** — never update one without the others.

#### 3a — `flow.md`

Add a new `## Flow N` section after the last existing numbered flow (before the Gap Flows section if one exists):

```markdown
## Flow N — <descriptive name> · `<spec-file-name>.spec.ts`

> <One-sentence context — what makes this flow distinct, e.g. country-specific behaviour, account state gate>

| #   | Step | Action | Expected Result | Test Data |
| --- | ---- | ------ | --------------- | --------- |
| 1   | ...  | ...    | ...             | ...       |
```

Rules:

- **Expected Result** must be assertable — use exact UI text from `en.json` where known; write `[verify on staging]` when uncertain
- **No TypeScript** in `flow.md` — method names and code belong in `catalog.md`
- **No tag lists** in `flow.md` — tags (e.g. `@staging`, `@desktop`) belong in `catalog.md` only

If the gap was previously listed as `G-*` in coverage.md, retire the `G-*` entry:

1. Replace the `G-*` row in Section 1 of coverage.md with the new numbered flow row
2. Remove the row from Section 2 (Gaps)
3. Remove the row from Section 3 (Priority List)
4. If `G-*` had a step table in the "Gap Flows" section of flow.md, move it to a proper `## Flow N` section

#### 3b — `coverage.md`

Add a new numbered row to Section 1 and update the analysis date:

```markdown
**Analysis date:** <today YYYY-MM-DD>
```

New row format (add the row with pending indicators first, then update to `✅` after Step 4 is complete):

```markdown
| N | <Journey description> | ⬜ | ⬜ | <Notes — e.g. `@staging`, country-specific, account state required> |
```

Once the spec passes in Step 4, update both columns to `✅`:

```markdown
| N | <Journey description> | ✅ | ✅ | <Notes> |
```

- Desktop and Mobile columns should be `✅` once the test is written and passing (set them after completing Step 4)
- Add a link to the flow.md anchor: `Full details → [flow.md — Flow N](./flow.md#flow-n--anchor)`

#### 3c — `catalog.md`

Three additions:

**Section 1 — Journey Index:** add one row:

```markdown
| Flow N | `<module>/<spec-file>.spec.ts` | `@desktop @mobile @<feature-tag> [@staging]` |
```

**Section 2 — Flow Details:** add a new `### Flow N` subsection with a TypeScript code block showing the full method chain. Use real `data-testid` locators discovered in Step 2. Flag anything unverified with `// 🔍 Verify on staging`.

**Section 3 — POM Method Reference:** add rows for any new methods that will be added to the Page Object:

```markdown
| <What the step does> | `<pageName>.<methodName>()` |
```

Also update the `Last updated` line in the catalog header:

```markdown
> Created: ... | Last updated: <today YYYY-MM-DD> (<brief change note>)
```

---

> **Partial failure between Step 3 and Step 4:** If you complete documentation (Step 3) but cannot implement the test — for example because a required `data-testid` does not exist on staging yet — do NOT leave the `coverage.md` row with `✅`. Mark it `⬜` and add a note like `[blocked: data-testid missing on staging]`. Either revert the doc changes until the locator is confirmed, or add the spec with `test.skip("TODO: <reason>")` and a tracking comment. Do not leave documentation that implies coverage exists when it does not.

---

### Step 4 — Implement the Test (2 files)

#### 4a — Page Object (`playwright/pages/<Module>Page.ts`)

Read the existing Page Object first. Only add what is genuinely missing:

```bash
cat playwright/pages/<Module>Page.ts
```

Add in the correct section:

- **LOCATORS section** — new getter properties for any new `data-testid` elements
- **ACTIONS section** — new interaction methods (clicks, fills, navigation)
- **VERIFICATIONS section** — new `verify*` methods with `expect()` assertions

Every new getter must use the locator fallback chain: `getByTestId` → `getByRole` → `getByLabel` → `getByPlaceholder` → CSS.

Every new `verify*` method:

- Must use `expect(..., 'descriptive message').toBeVisible()` or `toHaveText()`
- Must NOT use `waitFor({ state: 'visible' })` — always use `expect()`

#### 4b — Spec File (`playwright/tests/<module>/<spec>.spec.ts`)

**File naming:** spec files must start with the module-appropriate prefix matching the existing pattern in `playwright/tests/<module>/`. For onboarding, use `tier1-` or `tier2-` prefix matching the country's tier; for other modules use `verify-`.

Follow the test skeleton exactly:

```typescript
/**
 * @name     <Human-readable name>
 * @id       flow-N
 * @flow     playwright/flows/<module>/flow.md#flow-n--anchor
 * @coverage playwright/flows/<module>/coverage.md
 * @env      <env vars required, e.g. TEST_PASSWORD, MAILISK_API_KEY>
 *
 * <Optional: one-sentence description of what makes this flow distinct>
 */
import { test } from '../../fixtures/fixtures';
// Add other imports as needed: HomePage, DataFactory, MailiskUtils, etc.

test.describe('<Feature> — <Flow name>', { tag: ['@desktop', '@mobile', '@<feature-tag>'] }, () => {
    // Validate env vars that are NOT consumed by loginHelpers.login() in beforeAll
    // (loginHelpers validates TEST_PASSWORD and TEST_EMAIL internally — no need to guard those here)
    test.beforeAll(async () => {
        // Guard env vars this spec needs that loginHelpers does NOT validate internally.
        // Example: if (!process.env.MAILISK_API_KEY) throw new Error("MAILISK_API_KEY is not set in playwright/.env.staging");
        // Remove this block entirely if this spec only needs TEST_EMAIL / TEST_PASSWORD.
    });

    test.beforeEach(async ({ page, signupPage /* or loginPage */ }) => {
        // Seed state / navigate to entry point
    });

    test('VERIFY <specific observable outcome>', async ({
        /* fixtures */
    }) => {
        // Test body — all interactions through Page Object methods
        // Every expect() must have a descriptive message as the second argument
    });
});
```

Rules (enforced by `playwright` skill):

- Import `test` from `../../fixtures/fixtures` — never from `@playwright/test`
- Destructure all page objects from the test function — never instantiate manually
- Every `expect()` must have a descriptive message
- No `waitForTimeout()` — use `expect(...).toBeVisible()` or network/state conditions
- No `page.goto()` for in-app navigation — click UI elements
- Tags on `test.describe()` only — never on individual `test()`
- `@staging` tag required when the test uses Mailisk, `createAccountV2viaJS`, or any QA-only resource

---

### Step 5 — Sync `_index.md`

Update `playwright/flows/_index.md` in three places:

**1. Coverage Summary table:**

- **Existing module** — increment the module row: `| <old+1> | <old+1> | <old+1> |`
- **New module** — add a new row: `| \`<module>\` | 1 | 1 | 1 |`

And update the Total row accordingly.

**2. Module section:**

- **Existing module** — add the new flow row to the module's flow table:
    ```markdown
    | Flow N | <Priority> | <Description> | <User State> | `automated` |
    ```
- **New module** — create a new module section with a heading and a flow table containing this single row.

**3. Grand Total row** — increment Total Flows, Documented, and Automated each by 1.

> **Note:** If the gap was previously a `documented` (not `automated`) entry in `_index.md`, change its status from `documented` → `automated` rather than adding a new row. In that case only the Automated count increments (Total and Documented stay the same).

---

## ✅ Post-Implementation Checklist

Before reporting the task as complete:

- [ ] **Step 0** — gap description, module, entry point, and key assertion were all confirmed before starting
- [ ] **Step 1** — existing flow docs were read in full; next flow ID was determined from `max(existing) + 1`
- [ ] **Step 2** — the behaviour was verified in `src/` or via live MCP snapshot; no `data-testid` was guessed
- [ ] **`flow.md`** — new `## Flow N` section added with step table; no TypeScript or tag lists in this file
- [ ] **`coverage.md`** — new row added to Section 1 with `⬜` markers; analysis date updated to today (`YYYY-MM-DD`); Desktop and Mobile columns updated to `✅` after test passes
- [ ] **`catalog.md`** — Journey Index row + Section 2 code snippet + Section 3 POM reference all added; `Last updated` header updated
- [ ] **Page Object** — only missing locators/methods were added; existing methods were not rewritten
- [ ] **Spec file** — imports `test` from fixtures (not `@playwright/test`); all `expect()` calls have messages; tags on `describe()` only
- [ ] **`_index.md`** — module row and Total row both updated
- [ ] **If gap was previously `G-*`** — the gap row was retired from `coverage.md` Section 2 and Section 3; the `G-*` step table in `flow.md` was promoted to a proper `## Flow N` section
- [ ] **Test passes** — run `npx playwright test <path/to/spec.ts> --headed --project=chromium` and confirm it passes before closing the task

---

## ⚠️ Common Mistakes

| Mistake                                                              | Fix                                                                                                                                          |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Updating `flow.md` but not `coverage.md` or `catalog.md`             | All three flow doc files are always updated together — adding a flow section to one means adding the corresponding row/snippet to the others |
| Forgetting `_index.md`                                               | `_index.md` tracks every flow across all modules — always update it last, after all other files are done                                     |
| Guessing `data-testid` values                                        | Always verify in `src/` or via MCP snapshot; flag unverified IDs with `// 🔍 Verify on staging` in the catalog                               |
| Calling a Page Object helper with the wrong argument count or type   | Read the helper's signature in the Page Object file before calling — argument counts and semantics vary across modules                       |
| Leaving a `G-*` gap row in `coverage.md` after implementing the test | Retire the gap: remove from Section 2 and Section 3; replace with a numbered flow row in Section 1                                           |
| Adding new POM methods to the wrong section                          | LOCATORS → getters only; ACTIONS → clicks/fills/navigation; VERIFICATIONS → `verify*` methods with assertions                                |
| Using `waitFor({ state: 'visible' })` instead of `expect()`          | Always use `expect(locator, 'message').toBeVisible()` — never `locator.waitFor(...)`                                                         |
| Putting the `@staging` tag on individual `test()` calls              | Tags go on `test.describe()` only                                                                                                            |
| Importing `test` from `@playwright/test`                             | Always import from `../../fixtures/fixtures` (adjust depth for the file's location)                                                          |
| Not running the test before closing the task                         | A test that was never run may have a silent error. Always run with `--headed --project=chromium` and confirm it passes                       |

---

## 🗂️ Invocation Examples

```
/gap-to-playwright                                                          ← prompts for module + gap details
Follow gap-to-playwright skill for module: onboarding — Brazil shows a special disclaimer on the Terms step that has no test coverage
Follow gap-to-playwright skill for module: cashier — deposit success overlay after iframe interaction is not tested
Follow gap-to-playwright skill for module: auth — OTP resend countdown does not have a dedicated test
Follow gap-to-playwright skill for module: profile — tax information section is untested (found in PR review)
```

---

## 🔄 Decision Tree — Which Skill to Use

```
I found a missing test. What do I use?
    │
    ├─ The gap is a numbered flow row in coverage.md Section 1 (documented, not yet automated)
    │     └─ → use flow-to-playwright skill
    │
    ├─ The gap is a G-* row in coverage.md Section 2 AND you found it manually
    │     └─ → use gap-to-playwright skill (Step 3a retires the G-* entry)
    │
    ├─ I found the gap by reading src/ source code and there are no flow docs yet
    │     └─ → use src-to-flow skill first, then flow-to-playwright
    │
    ├─ I found the gap manually, then confirmed it by reading src/
    │     └─ → still use gap-to-playwright skill (discovery method wins — src/ is just
    │           used for locators in Step 2 Path A, not to change which skill to use)
    │
    └─ I found the gap manually (live app, QA, code review, bug report)
          └─ → use gap-to-playwright skill  ← YOU ARE HERE
```

> **Rule:** The deciding factor is _how the gap was discovered_, not _how it was subsequently verified_. If you found the gap manually and then used `src/` to confirm it, stay on `gap-to-playwright` — `src/` is just a tool in Step 2 Path A.
