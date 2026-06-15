# e2e-tests-core

Shared end-to-end test utilities, common scripts, and integration helpers for projects using the `e2e-tests-core` submodule.

## Overview

This repository contains reusable test infrastructure for E2E suites across consuming applications. It is intended to be included via `git submodule` into other repositories, such as `home-app`, so teams can share utilities across projects.

## What’s included

- `scripts/` — helper scripts for environment setup, Git config, secret handling, parsing results, Slack notifications, and pre-push checks.
- `utils/` — TypeScript helpers for test data generation, feature flags, navigation, QA scripting, social account flows, API helpers, and shared app utilities.
- `skills/` — Claude Code skill definitions (`.claude/skills/` in consuming repos symlink here so skills stay in sync automatically).
- `agent/` — reusable TestDino UI Change automation scripts, prompts, and API docs for scheduled AI-assisted fixes in consuming repos.

## Playwright healing reusable workflow

`e2e-tests-core` hosts the shared Playwright healing implementation as a reusable GitHub Actions workflow:

```text
.github/workflows/playwright-healing-reusable.yml
```

Consuming repositories should keep only a thin caller workflow, using `agent/docs/workflow-template.yaml` as the starting point. The reusable workflow runs in the caller repository context, so it checks out the caller repo, initialises the `e2e-tests-core` repo, runs the healing agent, verifies the generated Playwright changes, and creates PRs only after verification passes.

Caller workflows must grant enough permissions for the shared workflow:

```yaml
permissions:
    actions: write
    contents: write
    pull-requests: write
```

The reusable workflow accepts these inputs:

| Input                  | Default                      | Purpose                                                                          |
| ---------------------- | ---------------------------- | -------------------------------------------------------------------------------- |
| `lookback_hours`       | `24`                         | Hours of TestDino runs to inspect.                                               |
| `run_counters`         | empty                        | Optional comma-separated TestDino run counters to inspect.                       |
| `create_pr`            | `true`                       | Whether verified fixes should create pull requests.                              |
| `testdino_branch`      | `main`                       | TestDino branch to inspect.                                                      |
| `testdino_environment` | `staging`                    | TestDino environment to inspect and decrypt Playwright env files for.            |
| `runner_label`         | `github-hosted-playwright01` | Runner used for Playwright verification and PR creation.                         |
| `testdino_project_id`  | empty                        | Optional override; otherwise `vars.TESTDINO_PROJECT_ID` is used.                 |
| `notify_slack`         | `true`                       | Whether to post Slack notifications when PRs are created.                        |
| `slack_channel_id`     | empty                        | Optional override; otherwise `vars.PLAYWRIGHT_HEALING_SLACK_CHANNEL_ID` is used. |
| `e2e_tests_core_ref`   | `main`                       | Ref to checkout for shared Playwright healing automation scripts.                |

Use `secrets: inherit` or map these secrets explicitly from the caller repository:

- `ANTHROPIC_API_KEY`
- `TESTDINO_ACCESS_TOKEN`
- `TESTDINO_MCP_PAT`
- `E2E_TESTS_CORE_PAT`
- `ENV_ENCRYPTION_KEY`
- `PLAYWRIGHT_HEALING_PR_CREATE_TOKEN` (optional; falls back to `github.token`)
- `AUTO_OPS_BOT_TOKEN` (optional; only needed for Slack notifications)

The caller repository must also provide `vars.TESTDINO_PROJECT_ID` unless it passes `testdino_project_id`, and may provide `vars.PLAYWRIGHT_HEALING_SLACK_CHANNEL_ID` unless it passes `slack_channel_id`.

## Typical submodule workflow

### Add the shared core once

```bash
git submodule add https://github.com/deriv-core/e2e-tests-core.git playwright/e2e-tests-core
```

This registers the submodule and creates a `playwright/e2e-tests-core/` folder inside the consuming repository. Commit the resulting `.gitmodules` file and submodule reference:

```bash
git add .gitmodules playwright/e2e-tests-core
git commit -m "Add e2e-tests-core submodule"
```

### Clone a repo that already has the submodule

```bash
# Clone and initialise submodules in one step
git clone --recurse-submodules <consumer-repo-url>

# Or if already cloned
git submodule update --init --recursive
```

> **Important:** Always clone with `--recurse-submodules` (or run `git submodule update --init --recursive` after cloning). The consuming repo's `.claude/skills/` entries are symlinks that point into `playwright/e2e-tests-core/skills/` — if the submodule is not initialised, those symlinks will be dangling and Claude Code will not be able to load the skills.

### Pull updates from the shared repo

```bash
git submodule update --remote playwright/e2e-tests-core
```

Then commit the updated reference in the consumer repo:

```bash
git add playwright/e2e-tests-core
git commit -m "Update e2e-tests-core submodule to latest"
```

### Automatically pull submodule updates with `git pull`

To avoid manually running `git submodule update` after every `git pull`, enable the `submodule.recurse` config option:

```bash
# For this repo only
git config submodule.recurse true

# Or globally for all repos
git config --global submodule.recurse true
```

Once set, `git pull` will automatically update all submodules in sync with the consumer repo's pinned reference.

## Playwright env file setup (`git-setup-auto-pull.sh`)

After cloning (or whenever the submodule needs a manual sync), run the one-time setup script to decrypt the Playwright env files and install a git hook that keeps them up to date automatically.

You need `ENV_ENCRYPTION_KEY` — it is stored in LastPass. Ask a teammate if you don't have access.

### Step 1 — Persist the key in your shell profile

This is required for the `post-merge` git hook to decrypt env files automatically on every `git pull` without any manual steps.

```bash
echo "export ENV_ENCRYPTION_KEY='your-passphrase'" >> ~/.zshrc
source ~/.zshrc
```

To verify it is set correctly:

```bash
echo $ENV_ENCRYPTION_KEY
```

### Step 2 — Initialise and update the submodule

```bash
git submodule update --init --recursive
git submodule update --remote --merge playwright/e2e-tests-core
```

### Step 3 — Run the setup script (from project root)

```bash
./playwright/e2e-tests-core/scripts/git-setup-auto-pull.sh
```

This will:

- Install a `post-merge` git hook so `playwright/.env.staging` and `playwright/.env.production` are auto-decrypted on every `git pull`
- Pull the latest `e2e-tests-core` submodule
- Decrypt `playwright/.env.staging` and `playwright/.env.production` from their committed `.enc` files

Once set up, every `git pull` will automatically decrypt the env files — no manual steps needed.

---

## Repository structure

```text
scripts/
  env-cipher.sh                  # Encrypt/decrypt .env.* ↔ .env.*.enc
  git-setup-auto-pull.sh         # One-time setup: submodule + post-merge hook + decrypt
  github-summary-testdino.js     # Publishes TestDino run summary to GitHub Actions
  slack-notify-testdino.js       # Sends Slack notifications with TestDino results
  slack-id-map.json              # Maps notify targets to Slack user/group IDs
  claude-analyse-impact.sh       # Analyses test impact for a given change
  trace-test-impact.sh           # Traces which tests are affected by file changes
  v2_create_account.js           # QA script: create account via API
  v2_poi_poa.js                  # QA script: set POI/POA status via API
  v2_topup.js                    # QA script: top up wallet via API

utils/
  accountCreationRunner.ts       # createAccountV2viaJS, topupAccountViaJS, changePoiPoaStatusViaJS
  coinGeckoUtils.ts              # CoinGecko price helpers
  clientId.ts                    # Client ID utilities
  dataFactory.ts                 # Test data generators (emails, profiles, etc.)
  featureFlags.ts                # Feature flag enable/disable helpers
  index.ts                       # Barrel export — import all utils from here
  mailisk.ts                     # Mailisk email inbox helpers
  navigationUtils.ts             # waitForDerivApiSettled and navigation helpers
  qaScriptRunner.ts              # QA script runner (account creation, topup, KYC)
  socialAccountScriptRunner.ts   # addSocialAccount, removeSocialAccount, checkSocialAccount
  xanoAuth.ts                    # Xano authentication helpers
```

## Usage notes

- `scripts/` files are generally shell helpers invoked from consuming repos or CI pipelines.
- `utils/` files are shared TypeScript modules for test code and automation.
- The repo does not enforce a single package manager or test runner; consuming projects should import and use the shared code according to their own build setup.

## Best practices

- Do not edit files inside `playwright/e2e-tests-core/` directly in a consuming repository — changes should be made in the source repo and pulled in via `git submodule update --remote`.
- Run `git submodule update --remote` regularly to keep consumer projects aligned with the shared core.
- When contributing a fix or new utility, raise a PR against `deriv-core/e2e-tests-core` and pull the update into consuming repos once merged.

## Contact and ownership

If you have questions about the shared core or want to propose improvements, contact the e2e infrastructure team or the maintainers of the consuming repository.
