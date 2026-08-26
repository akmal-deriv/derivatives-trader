# Agent Skills Catalog

**Last Updated**: June 5, 2026
**Total Skills**: 9

This directory contains specialized agent skills that provide focused instructions for specific tasks in the e2e-deriv-home project.

---

## Skills Overview

| Skill                                                   | Description                                                                                                                                                                         | Primary Use Case                                                                                                |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [playwright](./playwright/SKILL.md)                     | Core testing skill: Playwright patterns, POM, fixtures, DataFactory, QA Script Runner, Mailisk, NavigationUtils                                                                     | Writing tests, page objects, fixtures, locators, assertions, test data, account creation, email/OTP, navigation |
| [src-to-flow](./src-to-flow/SKILL.md)                   | Analyses `src/` source code and generates flow.md, catalog.md, and coverage.md for a feature                                                                                        | Documenting app flows from Next.js source code (home-app)                                                       |
| [src-to-flow-partners](./src-to-flow-partners/SKILL.md) | Analyses `lib/features/` Flutter/Dart source and generates flow.md, catalog.md, and coverage.md for a feature                                                                       | Documenting app flows from Flutter source code (partners-app)                                                   |
| [flow-to-playwright](./flow-to-playwright/SKILL.md)     | Converts flow.md / catalog.md / coverage.md documents into Playwright test files                                                                                                    | Implementing coverage gaps as tests                                                                             |
| [qa-github-issues](./qa-github-issues/SKILL.md)         | Creates GitHub issues from Playwright test failures via GitHub MCP                                                                                                                  | Reporting test failures to GitHub                                                                               |
| [qa-pr-review](./qa-pr-review/SKILL.md)                 | Sends a formatted PR review request to the QA Slack channel via Slack MCP                                                                                                           | Requesting PR reviews from the team                                                                             |
| [qa-script-runner-api](./qa-script-runner-api/SKILL.md) | Standalone QA Script Runner operations via curl/fetch/Playwright MCP                                                                                                                | Account creation outside Playwright tests (staging only)                                                        |
| [qa-mailisk-api](./qa-mailisk-api/SKILL.md)             | Standalone Mailisk email retrieval via curl/fetch/Playwright MCP                                                                                                                    | OTP extraction outside Playwright tests                                                                         |
| [gap-to-playwright](./gap-to-playwright/SKILL.md)       | Guides documenting and implementing a test gap found manually (live app, QA, code review, bug report) — updates flow.md, coverage.md, catalog.md, Page Object, spec, and \_index.md | Adding a test for a gap discovered outside `src/` analysis                                                      |

---

## Skill Architecture

The **playwright** skill is the single comprehensive reference for all Playwright test development. It contains everything needed to write tests, including:

- Test structure and organization
- Page Object patterns and locator strategies
- Assertions with descriptive messages
- Fixtures and test setup
- **DataFactory** — test data generation (emails, profiles, addresses)
- **QA Script Runner** — account creation, wallet topup, POI/POA changes (staging only)
- **Mailisk** — email retrieval and OTP extraction
- **NavigationUtils** — API settlement after page state changes

The two **standalone API skills** (`qa-script-runner-api` and `qa-mailisk-api`) cover the same APIs but for use **outside** Playwright test context — e.g., via curl, Python requests, fetch, or Playwright MCP browser tools.

```
┌─────────────────────────────────────────────────────┐
│              PLAYWRIGHT TEST CONTEXT                 │
│                                                      │
│  playwright/SKILL.md (Core Skill)                    │
│      ├─→ DataFactory — test data generation          │
│      ├─→ QA Script Runner — account setup (staging)  │
│      ├─→ Mailisk — email/OTP retrieval               │
│      └─→ NavigationUtils — API settlement            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              STANDALONE CONTEXT                      │
│  (curl, fetch, Playwright MCP — no test runner)      │
│                                                      │
│  qa-script-runner-api/SKILL.md                       │
│      └─→ Same API, via curl/fetch/MCP                │
│                                                      │
│  qa-mailisk-api/SKILL.md                             │
│      └─→ Same API, via curl/fetch/MCP                │
└─────────────────────────────────────────────────────┘
```

---

## Decision Tree: Which Skill Do I Need?

| I need to...                                                            | Use                                                            |
| ----------------------------------------------------------------------- | -------------------------------------------------------------- |
| Write a new test                                                        | [playwright](./playwright/SKILL.md)                            |
| Generate test data (emails, names, addresses)                           | [playwright](./playwright/SKILL.md) — DataFactory section      |
| Create a test account (staging, inside a test)                          | [playwright](./playwright/SKILL.md) — QA Script Runner section |
| Retrieve an OTP or verification email (inside a test)                   | [playwright](./playwright/SKILL.md) — Mailisk section          |
| Wait for API data to settle after navigation                            | [playwright](./playwright/SKILL.md) — NavigationUtils section  |
| Document flows from `src/` source code (home-app, Next.js)              | [src-to-flow](./src-to-flow/SKILL.md)                          |
| Document flows from `lib/features/` source code (partners-app, Flutter) | [src-to-flow-partners](./src-to-flow-partners/SKILL.md)        |
| Convert flow docs into Playwright test files                            | [flow-to-playwright](./flow-to-playwright/SKILL.md)            |
| Create GitHub issues for failing tests                                  | [qa-github-issues](./qa-github-issues/SKILL.md)                |
| Request a PR review on Slack                                            | [qa-pr-review](./qa-pr-review/SKILL.md)                        |
| Create an account outside a Playwright test (curl, MCP)                 | [qa-script-runner-api](./qa-script-runner-api/SKILL.md)        |
| Retrieve an OTP outside a Playwright test (curl, MCP)                   | [qa-mailisk-api](./qa-mailisk-api/SKILL.md)                    |
| Handle a test gap found manually (live app, QA, bug report, PR comment) | [gap-to-playwright](./gap-to-playwright/SKILL.md)              |

---

## Audit History

| Date       | Action            | Details                                                                                     |
| ---------- | ----------------- | ------------------------------------------------------------------------------------------- |
| 2026-02-19 | Initial Audit     | Audited all skills against Claude best practices                                            |
| 2026-02-19 | Catalog Created   | Created this master index for skill discovery                                               |
| 2026-02-24 | Standalone Skills | Added qa-script-runner-api and qa-mailisk-api skills                                        |
| 2026-02-27 | Consolidation     | Merged data_factory, qa_script_runner, mailisk into playwright skill; added NavigationUtils |
| 2026-04-17 | New Skill         | Added flow-to-playwright skill                                                              |
| 2026-04-21 | New Skill         | Added src-to-flow skill                                                                     |
| 2026-04-23 | New Skill         | Added qa-github-issues skill                                                                |
| 2026-05-04 | Reorganisation    | Moved skills/ to project root (removed .agents wrapper)                                     |
| 2026-05-04 | New Skill         | Added qa-pr-review skill                                                                    |
| 2026-05-25 | New Skill         | Added gap-to-playwright skill                                                               |
| 2026-06-05 | New Skill         | Added src-to-flow-partners skill (Flutter/partners-app variant of src-to-flow)              |

**Last Audit**: June 5, 2026

---

**Maintained by**: QA Automation Team
