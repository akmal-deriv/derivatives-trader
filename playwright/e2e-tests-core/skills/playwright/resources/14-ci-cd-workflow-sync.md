---
title: CI/CD Workflow Sync — Engine & Callers
description: Full reference for keeping the reusable e2e-test-runner.yml engine in sync with all caller workflows, planner.json, and shared scripts
parent_skill: playwright
---

### Overview

The **reusable engine** (`e2e-test-runner.yml`) defines the `workflow_call` interface (inputs + secrets). All **caller workflows** must stay in sync with it. A mismatch causes silent failures or GitHub Actions validation errors.

---

### Sync Rules

- **Any change to the engine's inputs or secrets** (add, remove, rename, change type/default) **MUST be propagated to every caller** that invokes `e2e-test-runner.yml`
- **Any change to `.github/planner.json` plan keys** (add, remove, rename) **MUST be reflected in the `plan-runner.yml` dropdown options** (`workflow_dispatch` choices) — a plan that exists in JSON but not in the dropdown cannot be triggered manually, and vice versa
- **Any change to shared scripts** (`scripts/slack-parse-results.sh`, `scripts/slack-notify.sh`, `scripts/env-cipher.sh`) — verify the engine still calls them with the correct arguments and environment variables
- **After any workflow change**: review all callers and the engine to confirm the full call chain is consistent before considering the task complete
- **`claude-test-impact.yml` also calls `e2e-test-runner.yml`** (Jobs 3+4: execute-impacted-desktop/mobile) — it is a caller and must stay in sync with the engine interface
- **Changes to `scripts/trace-test-impact.sh` or `scripts/claude-analyse-impact.sh`** — verify `claude-test-impact.yml` still calls them with the correct env vars (CHANGED_FILES, ANTHROPIC_API_KEY, CLAUDE_MODEL, T3_MAX_TESTS, GITHUB_BASE_REF, GITHUB_OUTPUT, RUNNER_TEMP)

---

### Files in Scope for Sync Checks

| Role        | File                                                                                                                                                             |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine      | `.github/workflows/e2e-test-runner.yml`                                                                                                                          |
| Callers     | `.github/workflows/daily-cron-tests.yml`, `.github/workflows/plan-runner.yml`, `.github/workflows/custom-runner.yml`, `.github/workflows/claude-test-impact.yml` |
| Plan config | `.github/planner.json`                                                                                                                                           |
| Scripts     | `scripts/slack-parse-results.sh`, `scripts/slack-notify.sh`, `scripts/env-cipher.sh`, `scripts/trace-test-impact.sh`, `scripts/claude-analyse-impact.sh`         |
