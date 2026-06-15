---
title: Mailisk - Email & OTP Testing
description: Email retrieval, OTP extraction, search filters, and Mailisk usage in tests
parent_skill: playwright
---

## 📬 Mailisk Email Testing Utility

### Overview

`MailiskUtils` is a strongly-typed utility class that wraps the official `mailisk` Node.js client to provide project-aware helpers for retrieving emails and extracting structured data (OTPs, etc.) from them during test execution.

**Location**: `utils/mailisk.ts`

**Supported domains**:

- `webapps.mailisk.net` — **default** for all web-app test scenarios
- `mobileapps.mailisk.net` — only when explicitly required for mobile-app test scenarios

**Required env var**: `MAILISK_API_KEY` must be set in `.env`

### Quick Start

```typescript
import { MailiskUtils } from '../utils/index';

// Wait for and extract a 6-digit OTP from an email
const { otp, sourceEmail } = await MailiskUtils.extractOtp('webapps', {
    to_addr_prefix: 'signup-abc123', // local part of the test email
    subject_includes: 'verification', // optional subject filter
    from_timestamp: testStartTimestamp, // only emails after test started
});
console.log('OTP:', otp); // e.g. "123456"

// Search inbox and get all matching emails
const result = await MailiskUtils.searchInbox('webapps', {
    to_addr_prefix: 'signup-abc123',
    limit: 5,
});
console.log('Emails found:', result.total_count);

// Get just the latest email
const email = await MailiskUtils.getLatestEmail('webapps', {
    to_addr_prefix: 'signup-abc123',
});
if (email) {
    console.log('Subject:', email.subject);
    console.log('Body:', email.text);
}
```

### Key Methods

| Method                                                    | Description                                                                               |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `MailiskUtils.searchInbox(domain, filters?, options?)`    | Full inbox search — returns `MailiskSearchResult` with `data[]`, `total_count`, `options` |
| `MailiskUtils.getLatestEmail(domain, filters?, options?)` | Returns the most recent matching email or `null`                                          |
| `MailiskUtils.extractOtp(domain, filters?, options?)`     | Waits for email, extracts 6-digit OTP — throws if not found                               |

### Search Filters (`MailiskSearchFilters`)

| Filter               | Type      | Description                                                           |
| -------------------- | --------- | --------------------------------------------------------------------- |
| `to_addr_prefix`     | `string`  | Filter by recipient address prefix (e.g. `"john"` matches `john@...`) |
| `from_addr_includes` | `string`  | Filter by sender address substring                                    |
| `subject_includes`   | `string`  | Filter by subject substring (case-insensitive)                        |
| `from_timestamp`     | `number`  | Only emails received at or after this Unix timestamp (seconds)        |
| `to_timestamp`       | `number`  | Only emails received at or before this Unix timestamp (seconds)       |
| `limit`              | `number`  | Max emails to return (1–20)                                           |
| `offset`             | `number`  | Pagination offset                                                     |
| `wait`               | `boolean` | Block until at least one email arrives (default: `true`)              |

### Request Options (`MailiskRequestOptions`)

| Option    | Type     | Description                                                           |
| --------- | -------- | --------------------------------------------------------------------- |
| `timeout` | `number` | Max ms to wait for email when `wait: true` (default: 300,000 = 5 min) |

### OTP Extraction

`extractOtp()` uses a context-aware regex to find the first 6-digit OTP in the email, avoiding false positives from reference numbers or transaction IDs (CWE-20):

1. Checks plain-text body first (`email.text`)
2. Falls back to HTML body (`email.html`)
3. Tries keyword-anchored pattern first: `/(?:code|otp|verification|password)[^\d]*(\d{6})/i`
4. Falls back to word-boundary pattern only if no keyword match: `/\b(\d{6})\b/`
5. Iterates all returned emails (newest first) until a match is found
6. Throws a descriptive error if no OTP is found

```typescript
const { otp, sourceEmail } = await MailiskUtils.extractOtp(
    'webapps',
    {
        to_addr_prefix: emailLocalPart,
        from_timestamp: testStartTimestamp, // ← always set this to avoid stale OTPs
    },
    { timeout: 180_000 }
);
```

### Best Practices

1. **Always set `from_timestamp`** to `Math.floor(Date.now() / 1000)` captured before the test action — prevents stale OTPs from previous runs being picked up.
2. **Always set `to_addr_prefix`** to the local part of the test email — prevents picking up emails from other parallel tests.
3. **Use `generateEmailWithPrefix()`** from `DataFactory` for traceability — the prefix appears in the Mailisk inbox.
4. **Set a reasonable `timeout`** — 2–3 minutes is typical for transactional emails.
5. **Never use `mobileapps` domain** unless explicitly required for mobile test scenarios.
6. **Never exceed 64 characters in the email local part** — this is a hard limit enforced by RFC 5321.

### Usage in Tests

```typescript
import { test } from '../../fixtures/fixtures';
import { DataFactory } from '../../utils/dataFactory';
import { MailiskUtils } from '../../utils/index';

test('signup with OTP verification', async ({ signupPage }) => {
    // Capture timestamp BEFORE triggering the email
    const testStartTimestamp = Math.floor(Date.now() / 1000);

    const email = DataFactory.generateEmailWithPrefix('signup');
    const emailLocalPart = email.split('@')[0];

    await signupPage.goto();
    await signupPage.clickSignUp();
    await signupPage.enterEmail(email);
    await signupPage.submitEmailForm();

    // Wait for OTP — only emails after test started, only for this email
    const { otp } = await MailiskUtils.extractOtp(
        'webapps',
        {
            to_addr_prefix: emailLocalPart,
            from_timestamp: testStartTimestamp,
        },
        { timeout: 180_000 }
    );

    await signupPage.enterOtp(otp);
    await signupPage.submitOtp();
});
```

---

### Using Mailisk to Unblock Yourself During Page Exploration

When exploring flows that require OTP verification (e.g. signup, email change) using Playwright MCP, you can use the Mailisk API directly to retrieve the OTP and continue through the flow.

**Rules for exploration emails:**

- Always use the **same email format** as `DataFactory` generates: `drvtstqa_<prefix>_<timestamp>_<random>@webapps.mailisk.net`
- Always use the **`webapps` namespace** — never `mobileapps` during exploration
- Capture a `from_timestamp` before triggering the email send
- Email local part must NEVER exceed 64 characters — this is a hard limit enforced by RFC 5321

**Exploration workflow for OTP-gated flows:**

```typescript
// 1. Generate an email in the DataFactory format for exploration
const exploreEmail = `drvtstqa_explore_${Date.now()}_${Math.floor(Math.random() * 999999)}@webapps.mailisk.net`;
const emailLocalPart = exploreEmail.split('@')[0];
const testStartTimestamp = Math.floor(Date.now() / 1000);

// 2. Use Playwright MCP to navigate and enter the email in the UI
// ... (browser_navigate, browser_click, browser_type, etc.)

// 3. Retrieve the OTP via Mailisk to continue the flow
const { otp } = await MailiskUtils.extractOtp(
    'webapps',
    {
        to_addr_prefix: emailLocalPart,
        from_timestamp: testStartTimestamp,
    },
    { timeout: 180_000 }
);

// 4. Enter the OTP in the UI and continue exploring the next screen
// ... (browser_type with otp, browser_click to submit, browser_snapshot)
```

**Why this matters:**

- Many flows are OTP-gated — without retrieving the OTP you cannot explore screens beyond the OTP step
- Using the correct email format ensures Mailisk routes the email to the right namespace
- Using `from_timestamp` prevents picking up stale OTPs from previous exploration sessions

### Environment Setup

Add to `.env`:

```bash
MAILISK_API_KEY=<set-this-in-.env>
```

The API key is available in LastPass under the **Mailisk Api Key** entry.

---
