---
title: Husky Git Hooks
description: Full reference for Husky git hooks — post-merge, post-rewrite, pre-rebase, pre-push checks, phases, bypass rules, and AI assistant constraints
parent_skill: playwright
---

### Overview

The project uses **Husky** to enforce code quality checks and automate dependency management via git hooks. Husky is installed automatically via the `prepare` script on `npm install` — no manual setup needed.

There are **four** git hooks:

- **post-merge** — `npm install` + auto-decrypt after merge-style pulls
- **post-rewrite** — `npm install` + auto-decrypt after rebase-style pulls
- **pre-rebase** — snapshots `.env` files before rebase for diff comparison (only on remote-tracking rebases, skips interactive/local-branch rebases)
- **pre-push** — code quality guardrails

Together, post-merge + post-rewrite ensure `npm install` and env decryption run on **every** pull regardless of strategy (merge, rebase, fast-forward).

`scripts/setup-git-config.sh` registers the `theirs-env` merge driver in local git config — called by `prepare` (on `npm install`) and by the post-merge hook as a safety net.

There is no pre-commit hook (to avoid slowing down frequent commits).

---

### Post-Merge Hook — Conditional `npm install`

- After every `git pull` or `git merge`, the **post-merge** hook runs `npm install` to sync dependencies and ensure Husky hooks are installed
- **Conditional** — only runs when `package-lock.json` changed in the merge; skips on the ~90% of pulls that don't touch dependencies
- **`npm install` (not `npm ci`)** — faster (~5-15s), installs in-place without deleting `node_modules`, preserves locally-installed debug tools. Good enough for an e2e test repo where exact dep pinning is less critical. For a fully clean install, run `rm -rf node_modules && npm ci` manually
- **Local packages preserved** — unlike `npm ci`, `npm install` does not delete `node_modules`, so locally-installed debug tools are preserved
- **CI-safe** — skips automatically in CI environments (`CI=true`) where `npm ci` is already part of the pipeline
- **Error-resilient** — if `npm install` fails (e.g. network issue), the hook shows a user-friendly message with manual recovery steps; the merge is never affected since post-merge hooks run after the merge completes

---

### Post-Rewrite Hook — Conditional `npm install` (rebase pulls)

- After every `git pull --rebase` (or when `pull.rebase=true`), the **post-rewrite** hook runs `npm install` to sync dependencies
- Only fires for `rebase` rewrites — skips `amend` (git commit --amend) to avoid unnecessary installs
- **Conditional** — only runs when `package-lock.json` changed in the rebased commits; skips on the ~90% of pulls that don't touch dependencies
- Same behavior as the post-merge hook: conditional install, CI-safe, error-resilient
- **Together with post-merge**, this ensures `npm install` runs on **every** pull regardless of strategy

---

### Pre-Push Hook — Code Quality Checks

#### Phase 1: Blockers (push is rejected)

| Check                      | What it catches                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| **Rebase check**           | Feature branch is behind `origin/master` — must rebase before pushing (skipped on master/main) |
| **Plaintext `.env` files** | Committed `.env`, `.env.staging`, or `.env.production` — these must never be pushed            |
| **TypeScript type-check**  | `tsc --noEmit` — catches compile errors before they reach CI                                   |
| **`.only()` in tests**     | `test.only()` or `describe.only()` left in `.spec.ts` files                                    |
| **Dangerous patterns**     | Dangerous JS patterns like dynamic code execution or innerHTML assignments in `.ts` files      |

> **Fail-fast**: If any Phase 1 blocker is found, the push is rejected immediately — Phase 2 and 3 are skipped.

#### `.gitignore` Prerequisite — Validate Rule Order Before Relying on the Hook

The plaintext `.env` blocker only works as a last-resort safety net. The primary defence is the `.gitignore` file. If the `.gitignore` rules are in the wrong order, a catch-all negation (e.g. `!playwright/`) can silently re-include `.env.*` files — or, in the opposite direction, can silently exclude `.env.*.enc` files so encrypted copies are never committed.

**Required rule sequence in `.gitignore`** (order is mandatory — later rules override earlier ones):

```gitignore
# Playwright env files — never commit plaintext
playwright/.env.*
# Allow encrypted env files
!playwright/.env.*.enc
```

**Validate the rules are present and in the correct order** before wiring up the hook or after any `.gitignore` edit:

```bash
# Both lines must be present and plaintext-exclusion must come BEFORE the encrypted-file exception
grep -n 'playwright/.env' .gitignore
# Expected output (line numbers will vary, but order must be preserved):
#   N:  playwright/.env.*
#   M:  !playwright/.env.*.enc    ← M must be greater than N
```

If either line is missing, or if `!playwright/.env.*.enc` appears **before** `playwright/.env.*`, the hook's plaintext check can be bypassed without warning. Correct the `.gitignore` first, then verify with a `git status` that `.env.staging` is untracked and `.env.staging.enc` is tracked.

#### Phase 2: Warnings (push continues)

| Check                       | What it catches                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Hardcoded secrets**       | Heuristic scan for API keys, bearer tokens, passwords, private keys in `.ts` files (may have false positives)  |
| **`waitForTimeout()`**      | Explicit timeouts in `.spec.ts` files — prefer `expect().toBeVisible()` or `waitForLoadState()`                |
| **Bare assertions**         | `expect(el).toBeVisible()` without a descriptive message — should be `expect(el, 'description').toBeVisible()` |
| **Tags on `test()`**        | Tags placed on individual `test()` calls instead of `test.describe()` — tags MUST only go on `test.describe()` |
| **Missing screen-size tag** | `test.describe()` with tags but missing `@desktop` or `@mobile`                                                |

#### Phase 3: Environment reminder (always shown on every push)

- **Every push** displays the env file reminder and asks the developer to confirm encrypted files are up to date — the developer must type `y` to proceed
- This prompt appears **on every push**, not just when env files changed — because `.env.staging` and `.env.production` are gitignored, git cannot detect changes to them
- **The prompt is mandatory for all environments** — there is no automatic bypass
- If `/dev/tty` is not available (e.g. CI), the push is **rejected** — CI workflows should use `git push --no-verify` to bypass

---

### Bypassing

```bash
git push --no-verify  # CI only — use sparingly, guardrails exist for a reason
```

> `--no-verify` is intended for **CI pipelines only** (where no interactive terminal is available). Developers and AI assistants should always run the full pre-push hook.

---

### npm scripts

| Script              | Description                                                   |
| ------------------- | ------------------------------------------------------------- |
| `npm run prepare`   | Installs Husky hooks (runs automatically after `npm install`) |
| `npm run pre-push`  | Runs pre-push checks manually (useful for testing the script) |
| `npm run typecheck` | Runs `tsc --noEmit` for full TypeScript type-checking         |

---

### Rules for AI Assistants

- **AI assistants cannot push directly** — the pre-push hook requires an interactive TTY prompt that AI terminals cannot provide. **Never suggest `--no-verify`** as a workaround. Instead, ask the user to run the exact push command in their own terminal. Always provide the full command including the remote and branch name, e.g.: _"Please run `git push -u origin chore/my-branch` in your terminal and follow the prompts."_ If the hook fails with actual code issues (not the TTY prompt), fix those issues first, then ask the user to push again with the same exact command.
- **Never remove or modify `.husky/pre-push`** unless the user explicitly requests it
- When adding new `.ts` files, ensure they pass `tsc --noEmit` — the pre-push hook will reject the push otherwise
- When adding new test files, ensure no `.only()` calls are left — the pre-push hook catches these
