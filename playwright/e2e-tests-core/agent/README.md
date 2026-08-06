# TestDino Playwright Healing Agent

This agent finds recent failed TestDino test cases, groups related failures, asks an LLM to update Playwright tests, and opens one PR per fix.

## Default Flow

1. Collect recent failed TestDino candidates via the public API (`/test-runs` + `/context`).
2. Group similar issues together using deterministic code.
3. Run AI regrouping to verify groups and merge related issues.
4. Run the healer agent for each final grouped issue; the healer agent has access to source code, TestDino MCP, and read-only GitHub PR and release context to aid error validation and fixing.
5. Run deterministic Playwright verification, and open one PR for each verified fix.
6. Upload grouped candidates and healing summaries as workflow artifacts.
7. Write aggregate counts and a per-group outcome table to the GitHub Step Summary.
8. Post created PR links back into the original failing-test Slack threads, then post an aggregate summary linking those threads to the configured healing Slack channel.

## Files

```text
agent
|-- README.md
|-- docs
|   |-- workflow-template.yaml        # consuming-repo caller workflow template
|-- prompts
|   |-- fix-testdino-ui-change.md     # fixer prompt
|   |-- regroup-testdino-ui-change.md # AI grouping prompt
|-- scripts
|   |-- run-llm-agent.sh              # shared LLM runner
|   |-- slack-utils.mjs               # shared Slack helpers
|   |-- workflow-facing scripts       # see Workflow Steps below
```

The reusable workflow implementation lives at `.github/workflows/playwright-healing-reusable.yaml` in this repository and is called by consuming repositories.

## Workflow Steps

`collect-ui-change-groups`

1. Setup: checkout, checkout submodules, and set up Node.js & Test LLM Connection.
2. Prepare healing matrix with `prepare-healing-matrix.mjs`.
   2.1. `find-testdino-ui-changes.mjs` collects recent failed TestDino candidates from `/context` and attaches Slack thread metadata when available.
   2.2. `group-ui-change-candidates.mjs` builds deterministic candidate groups.
   2.3. `run-regrouping-agent.mjs` lets the LLM merge related deterministic groups.
   2.4. `prepare-healing-matrix.mjs` writes `group_count` and `matrix` GitHub outputs.
3. Upload grouped candidates.

`heal-ui-change-group`

4. Setup: checkout, checkout submodules, download grouped candidates, set up Node.js, and install dependencies.
5. Run healing fixer with `run-healing-fixer-stage.mjs`.
   5.1. `run-healer-agent.sh` builds the fixer prompt and invokes the shared LLM runner.
   5.2. `download-testdino-artifacts.mjs --urls-json` downloads screenshots/error-context from MCP signed blob URLs (public API alone usually has no downloadable URL).
   5.3. Package the fixer output as staged/unstaged patches and metadata for the next job.
6. Upload fixer artifact.

`verify-and-create-pr`

7. Setup: checkout, checkout submodules, download grouped candidates, download fixer artifact, and set up Node.js.
8. Apply fixer patch with `apply-fixer-artifact.mjs`.
9. Run Playwright verification.
   9.1. Prepare verification environment when the fixer produced changes: install dependencies, install Playwright browsers, and decrypt env files.
   9.2. Run Playwright verification with `run-healed-playwright-tests.mjs`.
   9.3. Clean up decrypted Playwright env files.
10. Prepare PR body with `prepare-pr-body.mjs` when verification passes or the repair is likely valid but blocked by an unrelated downstream failure.
11. Create pull request.
12. Write group outcome with `write-healing-outcome.mjs`.
    12.1. `slack-utils.mjs` provides shared Slack and candidate Slack-thread helpers for the PR thread reply.
13. Upload group outcome.

`summarize-healing-results`

14. Setup: checkout, checkout submodules, set up Node.js, and download group outcomes.
15. Build healing summary with `build-healing-summary.mjs`.
16. Upload aggregate healing summary.
17. Post Slack summary and teardown with `post-summary-and-teardown.mjs`.

Shared helpers:

- `run-llm-agent.sh` wraps the configured LLM CLI and optional TestDino MCP access for prompt-specific agent scripts.

## Prerequisites

Consuming repositories that enable daily Playwright healing must have access to a compatible self-hosted runner. The workflow expects the configured runner label, such as `github-hosted-playwright01`, to be available to the repository and able to install dependencies, run Playwright Chromium verification, decrypt Playwright env files, and create pull requests.

## Required GitHub Settings

Required secrets:

- `TESTDINO_ACCESS_TOKEN` — user PAT with `td_pat_` prefix (public API + MCP)
- `LITELLM_API_KEY`
- `LITELLM_API_URL`
- `CLIENT_ID_GHAPP`
- `PRIVATE_KEY_GHAPP`
- `AUTO_OPS_BOT_TOKEN`

Required caller inputs or values:

- `TESTDINO_PROJECT_ID`
- `TESTDINO_BRANCH` — template value: `main`

Optional caller inputs or values:

- `TESTDINO_ENVIRONMENT` is optional; leave empty to skip environment filtering (CI runs are often tagged `unmapped`, not `staging`);
- `lookback_hours` defaults to `24`
- `run_counters` defaults to empty, which inspects recent runs by lookback
- `create_pr` defaults to `true`; scheduled runs always pass `true`
- `use_pinned_submodule` defaults to `false`; when `false`, the workflow runs `e2e-tests-core` healer scripts from the `master` branch
- `playwright_runner` defaults to `github-hosted-playwright01`
- `summary_runner` defaults to `ubuntu-latest`
- `node_version` defaults to `24.15.0`
- `pw_healer_submodule_path` defaults to `playwright/e2e-tests-core`
- Optional `PW_HEALER_LLM_MODEL` defaults to `claude-sonnet-4-6`
- Optional `PW_HEALER_CUSTOM_VARIABLES` JSON object is used to pass any additional variables. The fixer currently receives only `knownIssues` as untrusted operator context for dedupe and triage routing. Example:
    ```json
    {
        "knownIssues": [
            "There is a known issue with the userAgent for the mobile KYC POI/POA tests, causing the QR code to show and tests to fail. Already tracked; do not create Playwright fixes for matching failures with no new scope or symptom. Write no-change.md."
        ]
    }
    ```
- Optional `PLAYWRIGHT_HEALING_SLACK_CHANNEL_ID` posts aggregate Slack summaries when set; there is no default channel, so aggregate Slack posts are skipped when this is unset
- Optional `PLAYWRIGHT_HEALING_SLACK_CC` appends a Slack mention to the aggregate summary; defaults to `<!subteam^S0AP2400XLZ>` (qa_automation_ops slack handle) when unset

## Schedule Playwright Auto Healer In Your Repo

1. Ensure this repository's reusable workflow is accessible to the consuming repository in GitHub Actions settings. Private consuming repositories must be allowed to call `deriv-com/e2e-tests-core/.github/workflows/playwright-healing-reusable.yaml`.
2. Add the caller workflow:

    ```sh
    mkdir -p .github/workflows
    cp playwright/e2e-tests-core/agent/docs/workflow-template.yaml .github/workflows/playwright-healing.yaml
    ```

3. Make sure this agent folder is available at `playwright/e2e-tests-core/agent`.
4. Add the required secrets and variables.
5. Adjust the caller inputs for branch, environment, runner labels, and product defaults if the repo differs.
6. Keep `playwright/agent/.healing/` gitignored.
7. Update the cron schedule if needed.

## Workflow Notes

- Scheduled workflows run from the default branch.
- The template caller hardcodes `testdino_branch: main` and leaves `testdino_environment` empty (no env filter); set an environment only when TestDino run metadata matches that value.
- By default, the workflow updates the `e2e-tests-core` submodule from the branch configured in `.gitmodules`. Manual debug runs can set `use_pinned_submodule=true` to use the consuming repo's pinned submodule commit instead.
- TestDino collection uses fixed workflow defaults for non-caller knobs: max runs `100` and public API pacing `80` requests per minute. Failed-run list pagination is treated as complete (no counter-gap backfill).
- Candidate grouping happens before matrix jobs start. Matrix preparation collects TestDino failures, builds deterministic groups, lets AI regrouping merge groups that look like one root cause, then publishes the final groups to fixer jobs.
- TestDino public API and MCP both use `TESTDINO_ACCESS_TOKEN` (`td_pat_`). Public API base path: `https://api.testdino.com/api/v1/public/{projectId}/...` — see https://docs.testdino.com/api-reference/overview.
- The fixer discovers release context at runtime by querying recent GitHub production release tags (`production_YYYYMMDD_N` format) and inspecting the PRs they contain. It also searches for recent open or closed PRs that touch the failing spec, page object, helper, or locator source — including healer-authored and QA/human-authored test-fix PRs.
- When no matching failing test cases are found, the workflow ends after matrix preparation without uploading healing artifacts, running matrix jobs, or posting a summary.
- The fixer starts with `debug_testcase`, then uses `get_testcase_details` (artifact flags) and passes returned blob URLs to `download-testdino-artifacts.mjs --urls-json` when screenshots or error context are needed.
- Matrix preparation, the healer matrix, deterministic Playwright verification, and PR creation run on `github-hosted-playwright01`.
- The matrix-preparation and fixer-stage scripts install agent-local dependencies with `npm ci --prefix playwright/e2e-tests-core/agent` so Claude Code and TestDino MCP are resolved from `agent/package-lock.json`.
- The LLM fixer step has a 15-minute timeout so one slow group does not block the first matrix stage indefinitely.
- The workflow checks for staged and unstaged tracked code changes while excluding `playwright/agent/.healing`.
- The fixer job passes changes to the Playwright runner through per-group `staged.patch` and `unstaged.patch` artifacts named with the group id.
- Deterministic Playwright verification runs before PR creation. A PR is created when verification passes, or when the verifier marks the repair as likely valid and the remaining failure is an unrelated downstream blocker. Same-failure and pre-candidate verification failures block PR creation and are reported as triage while preserving the underlying verification failure label in the summary.
- The GitHub Step Summary shows aggregate counts and a per-group outcome table; the `playwright-healing-summary` artifact contains full per-group details.
- Slack notifications are sent only for scheduled runs or manual runs with `create_pr=true`. The Playwright test workflow must upload `_playwright-slack-thread-desktop` and/or `_playwright-slack-thread-mobile` artifacts for failed runs. When a PR is created, the PR link is sent to the original failing test's Slack thread and the aggregate healing summary is posted to the configured Slack channel; triage outcomes remain available in the GitHub Step Summary and `playwright-healing-summary` artifact.

## Local Commands

Collect and group candidates:

```sh
node playwright/e2e-tests-core/agent/scripts/find-testdino-ui-changes.mjs
node playwright/e2e-tests-core/agent/scripts/group-ui-change-candidates.mjs
node playwright/e2e-tests-core/agent/scripts/run-regrouping-agent.mjs
```

Run the fixer for one group:

```sh
TESTDINO_UI_CHANGE_CANDIDATES_PATH="playwright/agent/.healing/groups/<group>.json" \
  playwright/e2e-tests-core/agent/scripts/run-healer-agent.sh
```

Download artifacts for one test case (preferred: MCP signed URLs via `--urls-json`, because the public API often returns only `blobKey`):

```sh
# 1) From get_testcase_details (include_artifacts / include_screenshots), write URLs to mcp-urls.json
# 2) Download only allowlisted testdinostr.blob.core.windows.net URLs:
node playwright/e2e-tests-core/agent/scripts/download-testdino-artifacts.mjs \
  --testcase-id test_case_... \
  --urls-json playwright/agent/.healing/artifacts/<testcase_id>/mcp-urls.json
```
