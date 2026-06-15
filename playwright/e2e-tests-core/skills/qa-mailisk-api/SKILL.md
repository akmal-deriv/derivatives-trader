---
name: qa-mailisk-api
description: Retrieves emails from Mailisk inboxes and extracts structured data (OTPs, links, etc.) using any API tool (curl, Python requests, fetch, Playwright MCP). No Playwright test context required.
version: 1.0.0
last_updated: 2026-02-24
---

# Mailisk — API Skill

## Overview

This skill enables you to retrieve emails, extract OTPs, and search Mailisk inboxes using **any API tool** — curl, Python `requests`, JavaScript `fetch`, Node.js `https`, Playwright MCP, or any HTTP client. No Playwright test context or `MailiskUtils` import is required.

Use this when you need to read transactional emails outside of a running Playwright test — for example during exploration, debugging, account setup, CI pipelines, or scripting.

### When to Use This Skill

| Use this skill when...                                                       | Use the `mailisk` skill instead when...                               |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| You need to retrieve an OTP outside a Playwright test                        | You're writing a Playwright `.spec.ts` test that needs OTP extraction |
| You're exploring a flow and need to read a verification email                | You need `MailiskUtils` from the project utilities                    |
| You're writing a Python/bash/CI script that needs email data                 | You're importing from `utils/mailisk.ts` in a test file               |
| You need to call the Mailisk API via curl, Python, fetch, or any HTTP client | You're working inside the `e2e-deriv-home` test framework             |

---

## Prerequisites

### Environment Variable

| Variable          | Required | Description                        |
| ----------------- | -------- | ---------------------------------- |
| `MAILISK_API_KEY` | ✅       | Mailisk API key for authentication |

### Environment Variable Sourcing

> ⚠️ **[CRITICAL]** Always read environment variables from the **`.env` file** at the project root first. If `.env` is missing or a required variable is not set, **ask the user** before falling back to system environment variables. Never silently use system env vars — the user must confirm the source.

**Priority order:**

1. **`.env` file** (default) — read from `<project_root>/.env`
2. **Ask the user** — if `.env` is missing or a variable is not found
3. **System environment variables** — only after user explicitly confirms

**Bash:**

```bash
# Always source .env first — fail loudly if missing
if [ -f .env ]; then
  source .env
else
  echo "ERROR: .env file not found. Please create it or confirm env var source."
  exit 1
fi
```

**Python:**

```python
from dotenv import load_dotenv
import os
import sys

# Always load .env first
if not load_dotenv():
    print("WARNING: .env file not found or empty. Ask user to confirm env var source.")
    sys.exit(1)

API_KEY = os.environ["MAILISK_API_KEY"]
```

**Node.js:**

```javascript
import { config } from 'dotenv';
const result = config(); // loads .env from project root
if (result.error) {
    console.error('ERROR: .env file not found. Ask user to confirm env var source.');
    process.exit(1);
}
const { MAILISK_API_KEY } = process.env;
```

---

## API Reference

**Base URL**: `https://api.mailisk.com`

**Authentication**: Header `X-Api-Key: <MAILISK_API_KEY>`

### Namespaces (Domains)

| Namespace    | Email domain              | When to use                                                |
| ------------ | ------------------------- | ---------------------------------------------------------- |
| `webapps`    | `@webapps.mailisk.net`    | **Default** — all web-app scenarios                        |
| `mobileapps` | `@mobileapps.mailisk.net` | **Only** when explicitly required for mobile-app scenarios |

> ⚠️ Always use `webapps` unless explicitly told otherwise.

---

### Search Inbox Endpoint

**URL**: `GET https://api.mailisk.com/api/emails/{namespace}/inbox`

#### Query Parameters

| Parameter            | Type      | Required    | Description                                                                                                                            |
| -------------------- | --------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `to_addr_prefix`     | `string`  | ❌ Optional | Filter by recipient address prefix (e.g. `drvtstqa_explore_123` matches `drvtstqa_explore_123@...`). This is the local part before `@` |
| `from_timestamp`     | `number`  | ❌ Optional | Only emails received at or after this Unix timestamp (seconds). **Strongly recommended** to avoid stale results                        |
| `to_timestamp`       | `number`  | ❌ Optional | Only emails received at or before this Unix timestamp (seconds)                                                                        |
| `from_addr_includes` | `string`  | ❌ Optional | Filter by sender address substring (e.g. `noreply@deriv.com`)                                                                          |
| `subject_includes`   | `string`  | ❌ Optional | Filter by subject substring (case-insensitive)                                                                                         |
| `wait`               | `boolean` | ❌ Optional | If `true`, long-polls until at least one email arrives (up to server timeout). **Recommended** when expecting an email                 |
| `limit`              | `number`  | ❌ Optional | Max emails to return (1–20, default: 10)                                                                                               |
| `offset`             | `number`  | ❌ Optional | Pagination offset                                                                                                                      |

#### Response Schema

```json
{
    "total_count": 1,
    "options": {
        "limit": 1,
        "offset": 0
    },
    "data": [
        {
            "id": "email-id",
            "from": { "address": "noreply@deriv.com", "name": "Deriv" },
            "to": [{ "address": "user@webapps.mailisk.net" }],
            "cc": [],
            "bcc": [],
            "subject": "Your verification code",
            "html": "<html>...<b>123456</b>...</html>",
            "text": "Your verification code is 123456",
            "received_date": "2026-02-24T10:00:00Z",
            "received_timestamp": 1771920000,
            "expires_timestamp": 1772006400,
            "headers": {},
            "attachments": []
        }
    ]
}
```

---

## Execution Methods

### Method 1: curl

```bash
source .env

# ─── Search inbox for recent emails to a specific address ───
curl -s -G "https://api.mailisk.com/api/emails/webapps/inbox" \
  -H "X-Api-Key: ${MAILISK_API_KEY}" \
  --data-urlencode "to_addr_prefix=drvtstqa_explore_1708761600000" \
  --data-urlencode "from_timestamp=$(( $(date +%s) - 300 ))" \
  --data-urlencode "wait=true" \
  --data-urlencode "limit=1"

# ─── Extract 6-digit OTP from email ───
# Context-aware pattern: match 6 digits preceded by OTP-related keywords.
# Falls back to any 6-digit sequence only if no keyword-anchored match is found.
OTP=$(curl -s -G "https://api.mailisk.com/api/emails/webapps/inbox" \
  -H "X-Api-Key: ${MAILISK_API_KEY}" \
  --data-urlencode "to_addr_prefix=YOUR_EMAIL_PREFIX" \
  --data-urlencode "from_timestamp=YOUR_TIMESTAMP" \
  --data-urlencode "wait=true" \
  --data-urlencode "limit=1" \
  | jq -r '.data[0].text' \
  | grep -oiP '(?:code|otp|verification|password)[^\d]*\K\d{6}' \
  | head -1)
echo "OTP: ${OTP}"

# ─── Full OTP extraction with fallback to HTML body ───
RESPONSE=$(curl -s -G "https://api.mailisk.com/api/emails/webapps/inbox" \
  -H "X-Api-Key: ${MAILISK_API_KEY}" \
  --data-urlencode "to_addr_prefix=YOUR_EMAIL_PREFIX" \
  --data-urlencode "from_timestamp=YOUR_TIMESTAMP" \
  --data-urlencode "wait=true" \
  --data-urlencode "limit=1")

# Try context-aware extraction first; fall back to any 6-digit sequence
OTP=$(echo "$RESPONSE" | jq -r '.data[0].text // empty' | grep -oiP '(?:code|otp|verification|password)[^\d]*\K\d{6}' | head -1)
if [ -z "$OTP" ]; then
  OTP=$(echo "$RESPONSE" | jq -r '.data[0].html // empty' | grep -oiP '(?:code|otp|verification|password)[^\d]*\K\d{6}' | head -1)
fi
if [ -z "$OTP" ]; then
  # Last resort: any 6-digit number (may match reference IDs — verify manually)
  OTP=$(echo "$RESPONSE" | jq -r '.data[0].text // .data[0].html // empty' | grep -oE '\b[0-9]{6}\b' | head -1)
fi
echo "OTP: ${OTP}"

# ─── Search by subject ───
curl -s -G "https://api.mailisk.com/api/emails/webapps/inbox" \
  -H "X-Api-Key: ${MAILISK_API_KEY}" \
  --data-urlencode "subject_includes=verification" \
  --data-urlencode "from_timestamp=$(( $(date +%s) - 600 ))" \
  --data-urlencode "limit=5"
```

### Method 2: Python (`requests`)

```python
import requests
import re
import time
import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.environ["MAILISK_API_KEY"]
BASE_URL = "https://api.mailisk.com/api"
HEADERS = {"X-Api-Key": API_KEY}


def search_inbox(
    namespace: str = "webapps",
    to_addr_prefix: Optional[str] = None,
    from_timestamp: Optional[int] = None,
    subject_includes: Optional[str] = None,
    wait: bool = False,
    limit: int = 1,
) -> dict:
    """Search Mailisk inbox and return the JSON response."""
    params = {"limit": limit}
    if to_addr_prefix:
        params["to_addr_prefix"] = to_addr_prefix
    if from_timestamp is not None:
        params["from_timestamp"] = from_timestamp
    if subject_includes:
        params["subject_includes"] = subject_includes
    if wait:
        params["wait"] = "true"

    response = requests.get(
        f"{BASE_URL}/emails/{namespace}/inbox",
        headers=HEADERS,
        params=params,
        timeout=120,
    )
    response.raise_for_status()
    return response.json()


def extract_otp(email_data: dict) -> Optional[str]:
    """Extract a 6-digit OTP from an email's text or HTML body.

    Uses a context-aware pattern first (keyword-anchored) to avoid false
    positives from reference numbers, transaction IDs, or timestamps that
    happen to be 6 digits. Falls back to any 6-digit sequence as a last resort.
    """
    # Context-aware: 6 digits preceded by OTP-related keywords
    CONTEXT_PATTERN = re.compile(
        r"(?:code|otp|verification|password)[^\d]*(\d{6})", re.IGNORECASE
    )
    # Last-resort fallback: any word-boundary-delimited 6-digit number
    FALLBACK_PATTERN = re.compile(r"\b(\d{6})\b")

    for field in ("text", "html"):
        body = email_data.get(field) or ""
        match = CONTEXT_PATTERN.search(body)
        if match:
            return match.group(1)

    # Fallback — may match reference IDs; verify manually if OTP is unexpected
    for field in ("text", "html"):
        body = email_data.get(field) or ""
        match = FALLBACK_PATTERN.search(body)
        if match:
            return match.group(1)

    return None


# ─── Retrieve OTP for a specific email ───
from_ts = int(time.time()) - 300  # 5 minutes ago
result = search_inbox(
    to_addr_prefix="drvtstqa_explore_1708761600000_123456",
    from_timestamp=from_ts,
    wait=True,
    limit=1,
)

if result["data"]:
    email = result["data"][0]
    otp = extract_otp(email)
    print(f"OTP: {otp}")
    print(f"Subject: {email['subject']}")
    print(f"From: {email['from']['address']}")
    print(f"Received: {email['received_date']}")
else:
    print("No emails found")


# ─── Search by subject ───
result = search_inbox(
    subject_includes="verification",
    from_timestamp=int(time.time()) - 600,
    limit=5,
)
for email in result["data"]:
    print(f"  [{email['received_date']}] {email['subject']}")


# ─── Full workflow: create account then retrieve OTP ───
import random

from_ts = int(time.time())
email_addr = f"drvtstqa_signup_{from_ts}_{random.randint(0, 999999)}@webapps.mailisk.net"
email_prefix = email_addr.split("@")[0]

# ... trigger account creation or email send here ...

result = search_inbox(
    to_addr_prefix=email_prefix,
    from_timestamp=from_ts,
    wait=True,
    limit=1,
)
if result["data"]:
    otp = extract_otp(result["data"][0])
    print(f"Email: {email_addr}")
    print(f"OTP: {otp}")


# ─── Debug: view full email content ───
result = search_inbox(
    to_addr_prefix="YOUR_EMAIL_PREFIX",
    from_timestamp=int(time.time()) - 900,
    limit=1,
)
if result["data"]:
    email = result["data"][0]
    print(f"Subject: {email['subject']}")
    print(f"From: {email['from']['address']}")
    print(f"Text preview: {(email.get('text') or 'N/A')[:200]}")
    print(f"Has HTML: {email.get('html') is not None}")
```

### Method 3: JavaScript `fetch` (Playwright MCP / browser)

> ⚠️ When using Playwright MCP's `browser_evaluate` or `browser_run_code`, `process.env` is **undefined** in the browser context. You must read the values from `.env` first (e.g. via `read_file` or `execute_command`), then inject them as **string literals** into the script.

**Step 1: Read the API key from `.env`** (before running the browser script):

```bash
# Via execute_command or read_file — extract the value
grep '^MAILISK_API_KEY=' .env | cut -d'=' -f2
```

**Step 2: Inject the value as a string literal into the browser script:**

```javascript
async page => {
    // ⚠️ INJECTED from .env — do NOT use process.env here (it is undefined in browser context)
    const apiKey = 'INJECTED_MAILISK_API_KEY'; // Replace with actual value from Step 1
    const namespace = 'webapps';
    const toAddrPrefix = 'drvtstqa_explore_1708761600000_123456';
    const fromTimestamp = Math.floor(Date.now() / 1000) - 300;

    const url = new URL(`https://api.mailisk.com/api/emails/${namespace}/inbox`);
    url.searchParams.set('to_addr_prefix', toAddrPrefix);
    url.searchParams.set('from_timestamp', fromTimestamp.toString());
    url.searchParams.set('wait', 'true');
    url.searchParams.set('limit', '1');

    const response = await fetch(url.toString(), {
        headers: { 'X-Api-Key': apiKey },
    });
    const result = await response.json();

    if (result.data && result.data.length > 0) {
        const email = result.data[0];
        const text = email.text || email.html || '';
        // Context-aware first; fall back to any 6-digit sequence
        const match = text.match(/(?:code|otp|verification|password)[^\d]*(\d{6})/i) || text.match(/\b(\d{6})\b/);
        return {
            otp: match ? match[1] : null,
            subject: email.subject,
            from: email.from?.address,
            received: email.received_date,
        };
    }
    return { error: 'No emails found' };
};
```

### Method 4: Node.js `https` (via `execute_command`)

```bash
source .env && node -e "
const https = require('https');
const apiKey = process.env.MAILISK_API_KEY;
const prefix = 'YOUR_EMAIL_PREFIX';
const fromTs = Math.floor(Date.now() / 1000) - 300;

const url = new URL('https://api.mailisk.com/api/emails/webapps/inbox');
url.searchParams.set('to_addr_prefix', prefix);
url.searchParams.set('from_timestamp', fromTs.toString());
url.searchParams.set('wait', 'true');
url.searchParams.set('limit', '1');

https.get(url.toString(), {
  headers: { 'X-Api-Key': apiKey }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const result = JSON.parse(data);
    if (result.data && result.data.length > 0) {
      const email = result.data[0];
      const text = email.text || email.html || '';
      // Context-aware first; fall back to any 6-digit sequence
      const match = text.match(/(?:code|otp|verification|password)[^\d]*(\d{6})/i)
                 || text.match(/\b(\d{6})\b/);
      console.log('OTP:', match ? match[1] : 'NOT FOUND');
      console.log('Subject:', email.subject);
    } else {
      console.log('No emails found');
    }
  });
});
"
```

---

## OTP Extraction Patterns

Deriv emails use a **6-digit numeric OTP**. The OTP appears in both the `text` and `html` body of the email. Always try `text` first, then fall back to `html`.

### Regex Patterns by Language

Use the **context-aware pattern** (primary) and fall back to the word-boundary pattern only if the primary finds nothing. The bare `\b\d{6}\b` pattern matches any 6-digit sequence — reference numbers, transaction IDs, and timestamps are common false-positive sources (CWE-20).

| Language    | Primary (context-aware)                                                                 | Fallback (last resort)            |
| ----------- | --------------------------------------------------------------------------------------- | --------------------------------- |
| Bash (grep) | `grep -oiP '(?:code\|otp\|verification\|password)[^\d]*\K\d{6}'`                        | `grep -oE '\b[0-9]{6}\b'`         |
| Python      | `re.search(r"(?:code\|otp\|verification\|password)[^\d]*(\d{6})", text, re.IGNORECASE)` | `re.search(r"\b(\d{6})\b", text)` |
| JavaScript  | `text.match(/(?:code\|otp\|verification\|password)[^\d]*(\d{6})/i)`                     | `text.match(/\b(\d{6})\b/)`       |

### Extraction Strategy

1. **Try `text` body first** — cleaner, no HTML tags to interfere
2. **Fall back to `html` body** — some emails may only have HTML content
3. **Use the context-aware pattern** — anchors on keywords (`code`, `otp`, `verification`, `password`) immediately before the 6-digit sequence to avoid matching reference numbers, transaction IDs, or timestamps
4. **Fall back to word-boundary pattern only as last resort** — if no keyword-anchored match is found; note in the caller that the result may need manual verification
5. **Take the first match** — the OTP is typically the first keyword-anchored 6-digit number in the email body

### Example: Robust OTP Extraction (Python)

```python
import re
from typing import Optional

# Context-aware: 6 digits preceded by OTP-related keywords
_CONTEXT_RE = re.compile(
    r"(?:code|otp|verification|password)[^\d]*(\d{6})", re.IGNORECASE
)
# Last-resort fallback: any word-boundary-delimited 6-digit number
_FALLBACK_RE = re.compile(r"\b(\d{6})\b")

def extract_otp(email_data: dict) -> Optional[str]:
    """Extract a 6-digit OTP from an email, trying text body first, then HTML.

    Uses context-aware matching to avoid false positives from reference
    numbers or transaction IDs that are also 6 digits (CWE-20).
    """
    for pattern in (_CONTEXT_RE, _FALLBACK_RE):
        for field in ("text", "html"):
            body = email_data.get(field) or ""
            match = pattern.search(body)
            if match:
                return match.group(1)
    return None
```

### Example: Robust OTP Extraction (Bash)

```bash
# Try context-aware extraction first (keyword-anchored)
OTP=$(echo "$RESPONSE" | jq -r '.data[0].text // empty' | grep -oiP '(?:code|otp|verification|password)[^\d]*\K\d{6}' | head -1)
if [ -z "$OTP" ]; then
  OTP=$(echo "$RESPONSE" | jq -r '.data[0].html // empty' | grep -oiP '(?:code|otp|verification|password)[^\d]*\K\d{6}' | head -1)
fi
# Last resort: any 6-digit number (may match reference IDs — verify manually)
if [ -z "$OTP" ]; then
  OTP=$(echo "$RESPONSE" | jq -r '.data[0].text // .data[0].html // empty' | grep -oE '\b[0-9]{6}\b' | head -1)
fi
```

### Example: Robust OTP Extraction (JavaScript)

```javascript
function extractOtp(emailData) {
    const text = emailData.text || emailData.html || '';
    // Context-aware first; fall back to any 6-digit sequence (CWE-20 guard)
    const match = text.match(/(?:code|otp|verification|password)[^\d]*(\d{6})/i) || text.match(/\b(\d{6})\b/);
    return match ? match[1] : null;
}
```

---

## Best Practices

### Always use `to_addr_prefix` + `from_timestamp`

```bash
# ✅ Correct — scoped to specific email and time window
curl -s -G ".../emails/webapps/inbox" \
  --data-urlencode "to_addr_prefix=drvtstqa_explore_123" \
  --data-urlencode "from_timestamp=$(( $(date +%s) - 300 ))"

# ❌ Wrong — may pick up stale emails from previous sessions
curl -s -G ".../emails/webapps/inbox"
```

### Capture timestamp BEFORE triggering email send

```bash
# ✅ Correct order
FROM_TIMESTAMP=$(date +%s)
# ... trigger email send (e.g. via UI or API) ...
# ... then search with from_timestamp=$FROM_TIMESTAMP
```

```python
# ✅ Correct order in Python
from_ts = int(time.time())
# ... trigger email send ...
result = search_inbox(to_addr_prefix=prefix, from_timestamp=from_ts, wait=True)
```

### Use `wait=true` for long-polling

When you expect an email to arrive soon, use `wait=true` to block until it arrives (up to the server timeout). This avoids polling loops.

### Email format must match DataFactory pattern

All emails should follow: `drvtstqa_<prefix>_<timestamp>_<random>@webapps.mailisk.net`

Email local part must NEVER exceed 64 characters (RFC 5321 limit). If your prefix is too long, it will be truncated to fit. Always verify the generated email matches this format for traceability.

The `to_addr_prefix` should be the local part (everything before `@`).

---

## Troubleshooting

| Issue              | Solution                                                          |
| ------------------ | ----------------------------------------------------------------- |
| `401 Unauthorized` | Check `MAILISK_API_KEY` in `.env`                                 |
| No emails found    | Verify `to_addr_prefix` matches the email local part exactly      |
| Wrong OTP          | Use `from_timestamp` to scope to current session only             |
| Timeout            | Increase wait time or check if email was actually sent            |
| Domain mismatch    | Ensure email domain matches namespace (`webapps` vs `mobileapps`) |

---

## 🔗 Related Skills

- **[playwright](../playwright/SKILL.md)** (resource 08 — mailisk) — Playwright-integrated version using `MailiskUtils` (for use inside `.spec.ts` tests)
- **[qa-script-runner-api](../qa-script-runner-api/SKILL.md)** — Create accounts that trigger verification emails (via any API tool)
- **[playwright](../playwright/SKILL.md)** (resource 06 — data-factory) — Generate emails in the correct format for Mailisk

## API Documentation

- **Search Inbox**: https://docs.mailisk.com/api-reference/search-inbox.html
- **Full API Reference**: https://docs.mailisk.com/api-reference/
