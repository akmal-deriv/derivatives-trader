---
title: Project Structure & Architecture
description: Folder organization, configuration files, architecture principles, and LLM navigation guide
parent_skill: playwright
---

## 📁 Project Structure & Architecture

### Folder Organization

```
home-app/                            # deriv-com/home-app — Next.js 15 trading platform
├── 📂 playwright/                   # All Playwright test files
│   ├── 📂 fixtures/
│   │   └── fixtures.ts              # Extended test fixtures — import test from here, NOT from @playwright/test
│   ├── 📂 pages/                    # Page Object Models (POM)
│   │   ├── LoginPage.ts             # Login page (email entry step via Ory Kratos)
│   │   ├── EnterPasswordPage.ts     # Password entry step (separate page via Ory Kratos)
│   │   └── HomePage.ts              # Authenticated home dashboard
│   ├── 📂 utils/                    # Shared test utilities
│   │   ├── dataFactory.ts           # Test data generation (emails, profiles)
│   │   ├── featureFlags.ts          # Enable/disable feature flags in localStorage
│   │   ├── navigationUtils.ts       # waitForDerivApiSettled + goBackAndExpectUrl
│   │   └── index.ts                 # Barrel export — import { DataFactory, NavigationUtils } from "../utils"
│   ├── 📂 tests/                    # Test specifications (Playwright default name)
│   │   ├── _examples/               # Example tests demonstrating patterns
│   │   ├── auth/                    # Auth flow tests (mirrors src/app/(auth)/)
│   │   ├── dashboard/               # Dashboard redirections tests (mirrors src/features/dashboard/)
│   │   ├── onboarding/              # Signup / onboarding tests (mirrors src/app/onboarding/)
│   │   ├── portfolio/               # Wallet / transfer tests (mirrors src/app/portfolio/)
│   │   ├── profile/                 # Profile / personal details tests (mirrors src/app/profile/)
│   │   ├── cfd/
│   │   │   ├── mt5/                 # MT5 account creation & management tests
│   │   │   └── ctrader/             # cTrader account tests
│   │   ├── options/                 # Options trading tests
│   │   ├── cashier/                 # Deposit / withdraw tests
│   │   └── kyc/                     # KYC / POI / POA tests
│   ├── 📂 flows/                    # Journey documentation (catalog, coverage, spec per feature)
│   │   ├── README.md
│   │   ├── _conventions/            # Fixture reference, test conventions, utils reference
│   │   ├── auth/                    # Auth flow docs
│   │   ├── cashier/
│   │   ├── cfd/
│   │   ├── dashboard/               # Dashboard redirections flow docs (mirrors src/features/dashboard/)
│   │   ├── onboarding/              # Signup / onboarding flow docs (mirrors src/app/onboarding/)
│   │   ├── portfolio/               # Transfer flow docs (mirrors src/app/portfolio/)
│   │   ├── profile/                 # Profile flow docs (mirrors src/app/profile/)
│   │   ├── kyc/
│   │   └── ... (dbot, dtrader, p2p, partners)
│   ├── 📂 test-data/                # Static files for upload tests
│   │   ├── documents/               # PDF files (.gitkeep — add real files when needed)
│   │   └── images/                  # Image files (.gitkeep — add real files when needed)
│   ├── 📂 test-results/             # ALL output: screenshots, traces, videos, HTML report, JSON (gitignored)
│   │   ├── html-report/
│   │   └── results.json
│   ├── 📄 .env.staging              # Staging credentials (gitignored — never commit)
│   └── 📄 .env.production           # Production credentials (gitignored — never commit)
├── 📂 .agent/skills/
│   └── playwright/
│       ├── SKILL.md                 # Orchestrator: load first, then read resources/ based on task
│       └── resources/               # 11 focused resource files (POM, test-writing, data-factory, etc.)
├── 📄 playwright.config.ts          # testDir: ./playwright/tests | TEST_ENV=staging|production
├── 📄 tsconfig.json                 # Single tsconfig for Next.js + Playwright (types: ["node"])
└── 📄 package.json
```

### [CRITICAL] Test Folder Naming — Must Mirror `src/app/` Structure

When creating a **new test folder** under `playwright/tests/`, the folder name **MUST mirror the corresponding route segment in `src/app/`**.

| `src/app/` route          | `playwright/tests/` folder     |
| ------------------------- | ------------------------------ |
| `src/app/(auth)/`         | `playwright/tests/auth/`       |
| `src/app/cfds/`           | `playwright/tests/cfd/`        |
| `src/app/portfolio/`      | `playwright/tests/portfolio/`  |
| `src/app/deposit/`        | `playwright/tests/cashier/`    |
| `src/app/profile/`        | `playwright/tests/profile/`    |
| `src/app/onboarding/`     | `playwright/tests/onboarding/` |
| `src/features/dashboard/` | `playwright/tests/dashboard/`  |

**Rule**: Before creating a new folder under `playwright/tests/`, check `src/app/` for the matching route segment and use that name. Never invent a folder name that has no corresponding `src/app/` counterpart.

> **Example**: Auth tests belong in `playwright/tests/auth/` because the source lives in `src/app/(auth)/`. A folder like `tests/home/login/` was wrong because `src/app/(auth)/` is the true spec — it was moved to `tests/auth/`.

---

### 🎯 Folder Purposes & Responsibilities

#### 📂 `playwright/pages/` - Page Object Models

**Purpose**: Encapsulate page-specific logic and element selectors

- **Contains**: Class-based page representations with locator getters
- **Responsibility**: Hide implementation details, expose user actions
- **Example**: `LoginPage.ts` with modern locator strategies and user workflows
- **Best Practice**: One file per major page/component, use robust selector chains

#### 📂 `playwright/tests/` - Test Specifications

**Purpose**: Actual test scenarios and assertions, organised by feature area

- **Contains**: Test files organised in feature subfolders
- **Responsibility**: Define test cases, assertions, and expected behaviors
- **Naming Convention**: `[feature].spec.ts` (e.g., `login.spec.ts`, `placeholder.spec.ts`)
- **Organization**: Group related tests using `test.describe()` blocks

#### 📂 `playwright/fixtures/` - Test Fixtures & Setup

**Purpose**: Reusable test setup, teardown, and shared utilities

- **Contains**: Custom fixtures extending base Playwright functionality
- **Usage**: Import `test` from `../fixtures/fixtures` — NOT from `@playwright/test` directly
- **Current fixtures**: `loginPage`, `enterPasswordPage`, `homePage`

#### 📂 `playwright/utils/` - Shared Utilities

**Purpose**: Common helper functions used across multiple tests

- **Contains**: `dataFactory`, `featureFlags`, `navigationUtils`, `index`
- **Import**: `import { DataFactory, NavigationUtils } from "../utils"`

#### 📂 `playwright/test-data/` - Static Test Files

**Purpose**: Store reusable static files needed for file upload tests (e.g. KYC/POI/POA document verification flows)

- **Contains**: PDF documents and image files (JPG/PNG) for upload scenarios
- **Sub-folders**:
    - `documents/` — PDF files: passports, utility bills, bank statements
    - `images/` — Image files: ID cards, selfies (JPG/PNG)
- **Naming Convention**: `sample-<document-type>.<ext>` (e.g. `sample-passport.pdf`, `sample-id-card.jpg`)
- **Rules**:
    - ✅ Only generic, non-PII sample files — never real personal documents
    - ✅ Keep files small (under 1 MB each)
    - ✅ Reference via `path.join(__dirname, '../../test-data/...')` — never hardcode absolute paths
    - ✅ All files are tracked in git
    - ❌ Never commit real personal documents or PII

**Usage in tests:**

```typescript
import path from 'path';

// ✅ Correct — resolves relative to test file location
const filePath = path.join(__dirname, '../../test-data/documents/sample-passport.pdf');
await page.setInputFiles('input[type="file"]', filePath);
```

#### 📂 Output Directories

- **`playwright/test-results/`**: ALL output — screenshots, traces, videos, HTML report, JSON (gitignored)
- **View HTML report**: `npx playwright show-report playwright/test-results/html-report`

### 🔧 Configuration Files

#### `playwright.config.ts` - Main Configuration

```typescript
// Key settings:
testDir:   "./playwright/tests"
outputDir: "./playwright/test-results"
reporter:  HTML → playwright/test-results/html-report
           JSON → playwright/test-results/results.json

// Environment loading:
// TEST_ENV=staging npx playwright test      → loads playwright/.env.staging
// TEST_ENV=production npx playwright test   → loads playwright/.env.production
// Defaults to 'staging'

// Projects:
// chromium    (1728×1117 desktop)
// chromium-mobile  (Pixel 5, 500×850)
```

#### `playwright/.env.staging` / `playwright/.env.production` - Credentials

```bash
# Required variables (gitignored — never commit)
TEST_EMAIL=your-test-email@example.com
TEST_PASSWORD=your-secure-password

# Optional — overrides playwright.config.ts default
# BASE_URL=https://staging-trading.deriv.com/dashboard
```

#### `package.json` - Project Dependencies

```json
{
    "scripts": {
        "test": "playwright test",
        "test:headed": "playwright test --headed",
        "test:ui": "playwright test --ui",
        "report": "playwright show-report playwright/test-results/html-report"
    }
}
```

### 🏗️ Architecture Principles

#### 1. **Separation of Concerns**

- **Pages**: UI interactions and element definitions
- **Tests**: Business logic and assertions
- **Fixtures**: Setup and shared state
- **Utils**: Pure utility functions

#### 2. **Dependency Flow**

```
Tests → Pages → Utils
  ↓
Fixtures (optional)
```

#### 3. **Reusability Hierarchy**

- **Most Reusable**: Utils (pure functions)
- **Moderately Reusable**: Pages (feature-specific)
- **Least Reusable**: Tests (scenario-specific)

#### 4. **Configuration Strategy**

- **Environment Variables**: Secrets and environment-specific values (`playwright/.env.*`)
- **Config Files**: Technical settings (`playwright.config.ts`)
- **Constants**: Hardcoded values that rarely change

### 🚀 How Other LLMs Can Navigate This Project

#### **For Test Creation**:

1. Check `playwright/tests/` for similar existing tests
2. Use `playwright/pages/` classes for page interactions
3. Import `test` from `playwright/fixtures/fixtures.ts` — NOT `@playwright/test`
4. Import utilities from `playwright/utils/` (`DataFactory`, `NavigationUtils`, `enableFeatureFlags`)

#### **For Page Object Updates**:

1. Update relevant class in `playwright/pages/`
2. Use modern locator strategies (see resource 02-page-object-model)
3. Register new POM as a fixture in `playwright/fixtures/fixtures.ts`

#### **For New Features**:

1. Create new page object in `playwright/pages/`
2. Add spec file in `playwright/tests/[feature]/`
3. Register page object as a fixture in `playwright/fixtures/fixtures.ts`
4. Update utilities in `playwright/utils/` only if needed in 2+ tests

#### **For Debugging**:

1. Check `playwright/test-results/` for screenshots, traces and videos
2. Run `npx playwright show-report playwright/test-results/html-report`
3. Use `NavigationUtils.waitForDerivApiSettled(page)` after every page state change
4. Use `npx playwright test --debug` for interactive debugging

#### **Auth Flow Notes**:

- Login is **2-step** via Ory Kratos: `LoginPage` (email) → `EnterPasswordPage` (password)
- After successful login, user lands on the home dashboard — use `HomePage` to verify
- Base URL defaults to `https://staging-trading.deriv.com/dashboard` — set `BASE_URL` in env to override
