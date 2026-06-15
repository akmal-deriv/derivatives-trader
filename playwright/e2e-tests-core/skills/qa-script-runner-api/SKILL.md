---
name: qa-script-runner-api
description: Standalone QA Script Runner operations using any available tool (curl, Playwright MCP, fetch, Python requests). Creates accounts, tops up wallets, changes POI/POA status via direct API calls — no Playwright test context required. Staging only.
version: 1.0.0
last_updated: 2026-02-24
---

# QA Script Runner — API Skill

## Overview

This skill enables you to execute QA Script Runner API operations using **any API tool** — curl, Python `requests`, JavaScript `fetch`, Node.js `https`, Playwright MCP, or any HTTP client. No Playwright test context or `APIRequestContext` is required.

Use this when you need to create accounts, top up wallets, or change KYC status outside of a running Playwright test — for example during exploration, debugging, data setup, CI pipelines, or scripting.

> ⚠️ **STAGING ONLY** — The QA Script Runner API only supports staging environments. Never use these operations against production.

### When to Use This Skill

| Use this skill when...                                               | Use the `playwright` skill (resource 07) instead when...                |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| You need to create an account outside a Playwright test              | You're writing a Playwright `.spec.ts` test that needs account creation |
| You're exploring a flow and need a pre-configured account            | You need `APIRequestContext` from Playwright fixtures                   |
| You're writing a Python/bash/CI script for data setup                | You're importing `createAccountUsingAPI` in a test file                 |
| You need to call the API via curl, Python, fetch, or any HTTP client | You're working inside the `e2e-deriv-home` test framework               |

---

## [CRITICAL] Always Ask Before Executing

> ⚠️ **NEVER execute any QA Script Runner operation without asking the user first.** Always present the available options and get explicit confirmation before running any API call.

### For Account Creation (`v2_create_account.js`)

Before creating any account, **always ask the user**:

1. **Account type**: `real` or `demo`?
2. **Configuration level**: Basic (defaults) or tailor-made (custom options)?

If the user chooses **tailor-made**, present this options table and ask which they want to configure:

| Option                   | Values                                                                                                     | Default        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- | -------------- |
| **Country**              | Any 2-letter ISO code (e.g. `al`, `gb`, `de`, `ng`)                                                        | `al` (Albania) |
| **Wallet currency**      | `USD`, `BTC`, `TRX`, or comma-separated (e.g. `USD,BTC`)                                                   | `USD`          |
| **POI status**           | `approved`, `rejected` (+ rejection reason)                                                                | none           |
| **POA status**           | `approved`, `rejected` (+ rejection reason)                                                                | none           |
| **Trading setup**        | Tops up 2000 USD + transfers 1000 to Options                                                               | off            |
| **MT5 accounts**         | `standard`, `financial`, `swap-free`, `zero-spread`, `gold`, `crypto`, or `all`                            | none           |
| **cTrader accounts**     | `1`–`5` or `all`                                                                                           | none           |
| **Financial assessment** | Requires employment status (`full_time`, `part_time`, `self_employed`, `unemployed`, `retired`, `student`) | off            |
| **Custom user details**  | First name, last name, DOB, phone, address, city                                                           | auto-generated |

If the user chooses **basic**, confirm the defaults before executing:

- _"I'll create a basic `<type>` account with country `al` (Albania) and USD wallet. Proceed?"_

### For Top Up (`v2_topup.js`)

Before topping up, **always ask**:

1. **Which account?** (email or wallet ID)
2. **Currency and amount?**

### For POI/POA Change (`v2_poi_poa.js`)

Before changing KYC status, **always ask**:

1. **Which account?** (email or client ID)
2. **What to change?** POI, POA, or both?
3. **Status**: `approved` or `rejected`? (If rejected, which reason?)

### Why This Matters

Assuming defaults wastes time and resources — creating the wrong account type means starting over. Always confirm with the user first.

---

## Prerequisites

### Environment Variables

These must be available in `.env` at the project root:

| Variable                    | Required | Description                                                                             |
| --------------------------- | -------- | --------------------------------------------------------------------------------------- |
| `QA_SCRIPT_RUNNER_URL`      | ✅       | Full API endpoint URL (e.g. `https://qa172.deriv.dev/qa-script-runner-service/execute`) |
| `QA_SCRIPT_RUNNER_USERNAME` | ✅       | Basic auth username                                                                     |
| `QA_SCRIPT_RUNNER_PASSWORD` | ✅       | Basic auth password                                                                     |
| `MAILISK_API_KEY`           | ✅       | Used as `--apikey` arg for M2M credential decryption                                    |
| `TEST_PASSWORD`             | ✅       | Default password for created accounts                                                   |

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

QA_URL = os.environ["QA_SCRIPT_RUNNER_URL"]
QA_USER = os.environ["QA_SCRIPT_RUNNER_USERNAME"]
QA_PASS = os.environ["QA_SCRIPT_RUNNER_PASSWORD"]
API_KEY = os.environ["MAILISK_API_KEY"]
TEST_PWD = os.environ["TEST_PASSWORD"]
```

**Node.js:**

```javascript
import { config } from 'dotenv';
const result = config(); // loads .env from project root
if (result.error) {
    console.error('ERROR: .env file not found. Ask user to confirm env var source.');
    process.exit(1);
}
const { QA_SCRIPT_RUNNER_URL, QA_SCRIPT_RUNNER_USERNAME, QA_SCRIPT_RUNNER_PASSWORD, MAILISK_API_KEY, TEST_PASSWORD } =
    process.env;
```

---

## API Structure

### Single Endpoint

| Field            | Value                                                                       |
| ---------------- | --------------------------------------------------------------------------- |
| **URL**          | Value of `QA_SCRIPT_RUNNER_URL` from `.env` (this IS the full endpoint)     |
| **Method**       | `POST`                                                                      |
| **Auth**         | HTTP Basic Auth (`QA_SCRIPT_RUNNER_USERNAME` : `QA_SCRIPT_RUNNER_PASSWORD`) |
| **Content-Type** | `application/json`                                                          |
| **Response**     | Plain text (not JSON)                                                       |

### Payload Format

Every request uses the **same endpoint** with the **same structure**. The `script_name` field determines which operation to run, and `args` is a **flat CLI-style string array**:

```json
{
    "script_name": "<script-name>.js",
    "args": ["--flag1", "value1", "--flag2", "value2"]
}
```

### Available Scripts

| Script Name            | Purpose                                              |
| ---------------------- | ---------------------------------------------------- |
| `v2_create_account.js` | Create a test account (demo or real)                 |
| `v2_topup.js`          | Top up a wallet with a specified currency and amount |
| `v2_poi_poa.js`        | Change POI/POA verification status                   |

---

## Script 1: Create Account (`v2_create_account.js`)

### Arguments Reference

#### Mandatory Arguments

| Arg          | Type     | Description                                                                                                                                                                       |
| ------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--email`    | `string` | Email address. Must use `@webapps.mailisk.net` (or `@mobileapps.mailisk.net` only when explicitly required). Format: `drvtstqa_<prefix>_<timestamp>_<random>@webapps.mailisk.net` |
| `--password` | `string` | Account password. Use `TEST_PASSWORD` from `.env`                                                                                                                                 |
| `--country`  | `string` | 2-letter ISO country code, lowercase. Default: `al` (Albania)                                                                                                                     |
| `--type`     | `string` | Account type: `real` or `demo`                                                                                                                                                    |
| `--apikey`   | `string` | Value of `MAILISK_API_KEY` from `.env`. Used for M2M credential decryption                                                                                                        |

#### Optional Arguments — User Details (Real Accounts Only)

| Arg           | Type     | Default        | Description                          |
| ------------- | -------- | -------------- | ------------------------------------ |
| `--firstname` | `string` | Auto-generated | First name                           |
| `--lastname`  | `string` | Auto-generated | Last name                            |
| `--dob`       | `string` | Auto-generated | Date of birth in `YYYY-MM-DD` format |
| `--phone`     | `string` | Auto-generated | Phone number                         |
| `--address`   | `string` | Auto-generated | Street address                       |
| `--city`      | `string` | Auto-generated | City                                 |

#### Optional Arguments — KYC (Real Accounts Only)

| Arg                       | Type     | Values                                     | Description                                                 |
| ------------------------- | -------- | ------------------------------------------ | ----------------------------------------------------------- |
| `--poi`                   | `string` | `approved`, `rejected`                     | POI (Proof of Identity) status                              |
| `--poi_rejection_reasons` | `string` | `NAME_MISMATCH`, `EXPIRED`, `DOB_MISMATCH` | **Required** when `--poi` is `rejected`. Single reason only |
| `--poa`                   | `string` | `approved`, `rejected`                     | POA (Proof of Address) status                               |
| `--poa_rejection_reasons` | `string` | `ADDRESS_MISMATCH`                         | **Required** when `--poa` is `rejected`. Single reason only |

#### Optional Arguments — Wallet & Trading (Real Accounts Only)

| Arg                | Type               | Description                                                                |
| ------------------ | ------------------ | -------------------------------------------------------------------------- |
| `--walletCurrency` | `string`           | Wallet currency(ies), comma-separated. E.g. `USD` or `USD,BTC,TRX`         |
| `--trading`        | _(flag, no value)_ | Enable trading setup: tops up 2000 USD + transfers 1000 to Options account |

#### Optional Arguments — Financial (Real Accounts Only)

| Arg                   | Type               | Values                                                                        | Description                                                     |
| --------------------- | ------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `--employment_status` | `string`           | `full_time`, `part_time`, `self_employed`, `unemployed`, `retired`, `student` | Employment status                                               |
| `--fa`                | _(flag, no value)_ | —                                                                             | Submit financial assessment. **Requires** `--employment_status` |
| `--tax_id`            | `string`           | —                                                                             | Tax identification number                                       |
| `--tax_residence`     | `string`           | —                                                                             | Tax residence country code (2-letter ISO)                       |

#### Optional Arguments — MT5 (Real Accounts Only)

| Arg                | Type               | Description                                                                                                                                              |
| ------------------ | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--mt5_onboarding` | _(flag, no value)_ | Call MT5 onboarding API. Should be set before `--mt5`                                                                                                    |
| `--mt5_routing`    | _(flag, no value)_ | Call MT5 routing APIs. Should be set before `--mt5`                                                                                                      |
| `--mt5`            | `string string`    | **Two positional values**: `<types> <password>`. Types: `standard`, `financial`, `swap-free`, `zero-spread`, `gold`, `crypto` (comma-separated) or `all` |

#### Optional Arguments — cTrader (Real Accounts Only)

| Arg         | Type     | Description                                  |
| ----------- | -------- | -------------------------------------------- |
| `--ctrader` | `string` | Number of cTrader accounts: `1`–`5` or `all` |

#### Optional Arguments — Other

| Arg       | Type               | Description            |
| --------- | ------------------ | ---------------------- |
| `--debug` | _(flag, no value)_ | Enable verbose logging |

> **Note on flags**: Arguments marked as _(flag, no value)_ are boolean flags — include them in the args array as a single string without a following value. E.g. `"--trading"`, `"--debug"`, `"--fa"`.

> **Note on `--mt5`**: This is special — it takes **two** positional values after it in the args array: `"--mt5", "standard,financial", "<YOUR_MT5_PASSWORD>"`. Never use example passwords — generate unique credentials per account.

### Response

Plain text. Key fields to extract via regex:

- `Email: <email>` — actual email used
- `Session Token: <token>` — session token
- `client_id: <uuid>` — client ID (real accounts)
- `Wallet ID: <id>` — wallet ID (real accounts with wallet)
- Look for `Account creation completed successfully` to confirm success

---

## Script 2: Top Up Wallet (`v2_topup.js`)

### Arguments Reference

| Arg           | Required       | Type     | Description                                                      |
| ------------- | -------------- | -------- | ---------------------------------------------------------------- |
| `--apikey`    | ✅ Mandatory   | `string` | Value of `MAILISK_API_KEY`                                       |
| `--currency`  | ✅ Mandatory   | `string` | Currency code (e.g. `USD`, `BTC`, `TRX`)                         |
| `--amount`    | ✅ Mandatory   | `string` | Amount to top up (positive number, as string)                    |
| `--wallet_id` | ⚠️ Conditional | `string` | Wallet UUID. **Required** if `--email`/`--password` not provided |
| `--email`     | ⚠️ Conditional | `string` | Account email. **Required** if `--wallet_id` not provided        |
| `--password`  | ⚠️ Conditional | `string` | Account password. **Required** with `--email`                    |
| `--debug`     | ❌ Optional    | _(flag)_ | Enable verbose logging                                           |

> **Identity rule**: Either `--wallet_id` OR (`--email` + `--password`) must be provided. `--wallet_id` takes precedence.

### Response

Plain text. Look for `Top-up completed successfully!` to confirm success.

---

## Script 3: Change POI/POA Status (`v2_poi_poa.js`)

### Arguments Reference

| Arg                       | Required       | Type     | Description                                                                         |
| ------------------------- | -------------- | -------- | ----------------------------------------------------------------------------------- |
| `--apikey`                | ✅ Mandatory   | `string` | Value of `MAILISK_API_KEY`                                                          |
| `--client_id`             | ⚠️ Conditional | `string` | Client UUID. **Required** if `--email`/`--password` not provided                    |
| `--email`                 | ⚠️ Conditional | `string` | Account email. **Required** if `--client_id` not provided                           |
| `--password`              | ⚠️ Conditional | `string` | Account password. **Required** with `--email`                                       |
| `--poi`                   | ❌ Optional    | `string` | POI status: `approved` or `rejected`                                                |
| `--poi_rejection_reasons` | ❌ Optional    | `string` | **Required** when `--poi` is `rejected`: `NAME_MISMATCH`, `EXPIRED`, `DOB_MISMATCH` |
| `--poa`                   | ❌ Optional    | `string` | POA status: `approved` or `rejected`                                                |
| `--poa_rejection_reasons` | ❌ Optional    | `string` | **Required** when `--poa` is `rejected`: `ADDRESS_MISMATCH`                         |
| `--debug`                 | ❌ Optional    | _(flag)_ | Enable verbose logging                                                              |

> **Identity rule**: Either `--client_id` OR (`--email` + `--password`) must be provided.
> **Action rule**: At least one of `--poi` or `--poa` must be specified.

### Response

Plain text. Look for `POI/POA status update completed successfully!` to confirm success.

---

## Execution Methods

### Method 1: curl

> ⚠️ **Use `jq` for safe JSON construction** — never interpolate shell variables directly inside JSON strings. This prevents breakage when values contain quotes, backslashes, or special characters.

```bash
source .env

EMAIL="drvtstqa_explore_$(date +%s)_$((RANDOM % 999999))@webapps.mailisk.net"

# ─── Create a demo account ───
jq -n \
  --arg email "$EMAIL" \
  --arg password "$TEST_PASSWORD" \
  --arg apikey "$MAILISK_API_KEY" \
  '{
    script_name: "v2_create_account.js",
    args: ["--email", $email, "--password", $password, "--country", "al", "--type", "demo", "--apikey", $apikey]
  }' | curl -s -X POST "${QA_SCRIPT_RUNNER_URL}" \
    -u "${QA_SCRIPT_RUNNER_USERNAME}:${QA_SCRIPT_RUNNER_PASSWORD}" \
    -H "Content-Type: application/json" \
    -d @-

# ─── Create a real account with KYC approved and USD wallet ───
EMAIL="drvtstqa_explore_$(date +%s)_$((RANDOM % 999999))@webapps.mailisk.net"

jq -n \
  --arg email "$EMAIL" \
  --arg password "$TEST_PASSWORD" \
  --arg apikey "$MAILISK_API_KEY" \
  '{
    script_name: "v2_create_account.js",
    args: ["--email", $email, "--password", $password, "--country", "al", "--type", "real", "--apikey", $apikey, "--walletCurrency", "USD", "--poi", "approved", "--poa", "approved"]
  }' | curl -s -X POST "${QA_SCRIPT_RUNNER_URL}" \
    -u "${QA_SCRIPT_RUNNER_USERNAME}:${QA_SCRIPT_RUNNER_PASSWORD}" \
    -H "Content-Type: application/json" \
    -d @-

# ─── Top up a wallet by wallet ID ───
jq -n \
  --arg apikey "$MAILISK_API_KEY" \
  --arg wallet_id "YOUR_WALLET_ID_HERE" \
  '{
    script_name: "v2_topup.js",
    args: ["--apikey", $apikey, "--currency", "USD", "--amount", "1000", "--wallet_id", $wallet_id]
  }' | curl -s -X POST "${QA_SCRIPT_RUNNER_URL}" \
    -u "${QA_SCRIPT_RUNNER_USERNAME}:${QA_SCRIPT_RUNNER_PASSWORD}" \
    -H "Content-Type: application/json" \
    -d @-

# ─── Change POI/POA status ───
jq -n \
  --arg apikey "$MAILISK_API_KEY" \
  --arg email "user@webapps.mailisk.net" \
  --arg password "$TEST_PASSWORD" \
  '{
    script_name: "v2_poi_poa.js",
    args: ["--apikey", $apikey, "--email", $email, "--password", $password, "--poi", "approved", "--poa", "approved"]
  }' | curl -s -X POST "${QA_SCRIPT_RUNNER_URL}" \
    -u "${QA_SCRIPT_RUNNER_USERNAME}:${QA_SCRIPT_RUNNER_PASSWORD}" \
    -H "Content-Type: application/json" \
    -d @-
```

### Method 2: Python (`requests`)

```python
import requests
import time
import random
import os
from dotenv import load_dotenv

load_dotenv()

QA_URL = os.environ["QA_SCRIPT_RUNNER_URL"]
QA_USER = os.environ["QA_SCRIPT_RUNNER_USERNAME"]
QA_PASS = os.environ["QA_SCRIPT_RUNNER_PASSWORD"]
API_KEY = os.environ["MAILISK_API_KEY"]
TEST_PWD = os.environ["TEST_PASSWORD"]


def call_qa_script(script_name: str, args: list[str]) -> str:
    """Execute a QA Script Runner script and return the response text."""
    response = requests.post(
        QA_URL,
        auth=(QA_USER, QA_PASS),
        json={"script_name": script_name, "args": args},
        timeout=120,
    )
    response.raise_for_status()
    return response.text


# ─── Create a demo account ───
email = f"drvtstqa_explore_{int(time.time())}_{random.randint(0, 999999)}@webapps.mailisk.net"
result = call_qa_script("v2_create_account.js", [
    "--email", email,
    "--password", TEST_PWD,
    "--country", "al",
    "--type", "demo",
    "--apikey", API_KEY,
])
print(f"Demo account: {email}")
print(result)


# ─── Create a real account with KYC + wallet ───
email = f"drvtstqa_real_{int(time.time())}_{random.randint(0, 999999)}@webapps.mailisk.net"
result = call_qa_script("v2_create_account.js", [
    "--email", email,
    "--password", TEST_PWD,
    "--country", "al",
    "--type", "real",
    "--apikey", API_KEY,
    "--walletCurrency", "USD",
    "--poi", "approved",
    "--poa", "approved",
])
print(f"Real account: {email}")
print(result)


# ─── Create a real account with trading + MT5 ───
email = f"drvtstqa_mt5_{int(time.time())}_{random.randint(0, 999999)}@webapps.mailisk.net"
result = call_qa_script("v2_create_account.js", [
    "--email", email,
    "--password", TEST_PWD,
    "--country", "al",
    "--type", "real",
    "--apikey", API_KEY,
    "--walletCurrency", "USD",
    "--poi", "approved",
    "--poa", "approved",
    "--trading",
    "--mt5_onboarding",
    "--mt5_routing",
    "--mt5", "standard,financial", "<YOUR_MT5_PASSWORD>",  # Never use example passwords; generate unique credentials per account
])
print(f"MT5 account: {email}")
print(result)


# ─── Top up a wallet ───
result = call_qa_script("v2_topup.js", [
    "--apikey", API_KEY,
    "--currency", "USD",
    "--amount", "5000",
    "--email", email,
    "--password", TEST_PWD,
])
print(result)


# ─── Change POI/POA status ───
result = call_qa_script("v2_poi_poa.js", [
    "--apikey", API_KEY,
    "--email", email,
    "--password", TEST_PWD,
    "--poi", "rejected",
    "--poi_rejection_reasons", "NAME_MISMATCH",
])
print(result)


# ─── Extract values from response using regex ───
import re
from typing import Optional

def extract_field(response: str, field: str) -> Optional[str]:
    """Extract a field value from the plain-text API response."""
    match = re.search(rf"{field}:\s*([^\s\n]+)", response)
    return match.group(1) if match else None

# Example: extract session token and wallet ID
session_token = extract_field(result, "Session Token")
wallet_id = extract_field(result, "Wallet ID")
client_id = extract_field(result, "client_id")
```

### Method 3: JavaScript `fetch` (Playwright MCP / browser)

> ⚠️ When using Playwright MCP's `browser_evaluate` or `browser_run_code`, `process.env` is **undefined** in the browser context. You must read the values from `.env` first (e.g. via `read_file` or `execute_command`), then inject them as **string literals** into the script.

**Step 1: Read the required values from `.env`** (before running the browser script):

```bash
# Via execute_command or read_file — extract each value
grep '^QA_SCRIPT_RUNNER_URL=' .env | cut -d'=' -f2
grep '^QA_SCRIPT_RUNNER_USERNAME=' .env | cut -d'=' -f2
grep '^QA_SCRIPT_RUNNER_PASSWORD=' .env | cut -d'=' -f2
grep '^MAILISK_API_KEY=' .env | cut -d'=' -f2
grep '^TEST_PASSWORD=' .env | cut -d'=' -f2
```

**Step 2: Inject the values as string literals into the browser script:**

```javascript
async page => {
    // ⚠️ INJECTED from .env — do NOT use process.env here (it is undefined in browser context)
    const url = 'INJECTED_QA_SCRIPT_RUNNER_URL'; // Replace with actual value from Step 1
    const auth = btoa('INJECTED_USERNAME:INJECTED_PASSWORD'); // Replace with actual values from Step 1
    const apiKey = 'INJECTED_MAILISK_API_KEY'; // Replace with actual value from Step 1
    const password = 'INJECTED_TEST_PASSWORD'; // Replace with actual value from Step 1
    const email = `drvtstqa_explore_${Date.now()}_${Math.floor(Math.random() * 999999)}@webapps.mailisk.net`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
            script_name: 'v2_create_account.js',
            args: [
                '--email',
                email,
                '--password',
                password,
                '--country',
                'al',
                '--type',
                'real',
                '--apikey',
                apiKey,
                '--walletCurrency',
                'USD',
                '--poi',
                'approved',
                '--poa',
                'approved',
            ],
        }),
    });
    return await response.text();
};
```

### Method 4: Node.js `https` (via `execute_command`)

```bash
source .env && node -e "
const https = require('https');
const url = new URL(process.env.QA_SCRIPT_RUNNER_URL);
const auth = Buffer.from(process.env.QA_SCRIPT_RUNNER_USERNAME + ':' + process.env.QA_SCRIPT_RUNNER_PASSWORD).toString('base64');
const body = JSON.stringify({
  script_name: 'v2_create_account.js',
  args: [
    '--email', 'drvtstqa_explore_' + Date.now() + '_' + Math.floor(Math.random() * 999999) + '@webapps.mailisk.net',
    '--password', process.env.TEST_PASSWORD,
    '--country', 'al',
    '--type', 'demo',
    '--apikey', process.env.MAILISK_API_KEY
  ]
});
const req = https.request({
  hostname: url.hostname,
  port: url.port || 443,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Basic ' + auth,
    'Content-Length': Buffer.byteLength(body)
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data));
});
req.write(body);
req.end();
"
```

---

## Email Format Rules

- All emails **must** use the format: `drvtstqa_<prefix>_<timestamp>_<random>@webapps.mailisk.net`
- Always use `@webapps.mailisk.net` domain by default
- Use `@mobileapps.mailisk.net` **only** when explicitly required for mobile app scenarios
- The `<prefix>` should describe the purpose (e.g. `explore`, `setup`, `debug`, `mt5`)

---

## Common Recipes

### Create a fully configured real account (curl)

```bash
source .env
EMAIL="drvtstqa_explore_$(date +%s)_$((RANDOM % 999999))@webapps.mailisk.net"

jq -n \
  --arg email "$EMAIL" \
  --arg password "$TEST_PASSWORD" \
  --arg apikey "$MAILISK_API_KEY" \
  '{
    script_name: "v2_create_account.js",
    args: ["--email", $email, "--password", $password, "--country", "al", "--type", "real", "--apikey", $apikey, "--walletCurrency", "USD", "--trading", "--poi", "approved", "--poa", "approved"]
  }' | curl -s -X POST "${QA_SCRIPT_RUNNER_URL}" \
    -u "${QA_SCRIPT_RUNNER_USERNAME}:${QA_SCRIPT_RUNNER_PASSWORD}" \
    -H "Content-Type: application/json" \
    -d @-

echo "Email: ${EMAIL} | Password: ${TEST_PASSWORD}"
```

### Create a fully configured real account (Python)

```python
import requests, time, random, os
from dotenv import load_dotenv

load_dotenv()

email = f"drvtstqa_explore_{int(time.time())}_{random.randint(0, 999999)}@webapps.mailisk.net"

result = requests.post(
    os.environ["QA_SCRIPT_RUNNER_URL"],
    auth=(os.environ["QA_SCRIPT_RUNNER_USERNAME"], os.environ["QA_SCRIPT_RUNNER_PASSWORD"]),
    json={
        "script_name": "v2_create_account.js",
        "args": [
            "--email", email,
            "--password", os.environ["TEST_PASSWORD"],
            "--country", "al",
            "--type", "real",
            "--apikey", os.environ["MAILISK_API_KEY"],
            "--walletCurrency", "USD",
            "--trading",
            "--poi", "approved",
            "--poa", "approved",
        ],
    },
    timeout=120,
)
print(f"Email: {email}")
print(result.text)
```

### Create account with MT5 (Python)

```python
email = f"drvtstqa_mt5_{int(time.time())}_{random.randint(0, 999999)}@webapps.mailisk.net"

result = requests.post(
    os.environ["QA_SCRIPT_RUNNER_URL"],
    auth=(os.environ["QA_SCRIPT_RUNNER_USERNAME"], os.environ["QA_SCRIPT_RUNNER_PASSWORD"]),
    json={
        "script_name": "v2_create_account.js",
        "args": [
            "--email", email,
            "--password", os.environ["TEST_PASSWORD"],
            "--country", "al",
            "--type", "real",
            "--apikey", os.environ["MAILISK_API_KEY"],
            "--walletCurrency", "USD",
            "--poi", "approved",
            "--poa", "approved",
            "--mt5_onboarding",
            "--mt5_routing",
            "--mt5", "all", "<YOUR_MT5_PASSWORD>",  # Never use example passwords; generate unique credentials per account
        ],
    },
    timeout=120,
)
print(result.text)
```

### Reject POI then approve it (Python)

```python
email = "drvtstqa_explore_1234567890_123456@webapps.mailisk.net"  # Use the email from account creation

# Step 1: Reject
requests.post(
    os.environ["QA_SCRIPT_RUNNER_URL"],
    auth=(os.environ["QA_SCRIPT_RUNNER_USERNAME"], os.environ["QA_SCRIPT_RUNNER_PASSWORD"]),
    json={
        "script_name": "v2_poi_poa.js",
        "args": [
            "--apikey", os.environ["MAILISK_API_KEY"],
            "--email", email,
            "--password", os.environ["TEST_PASSWORD"],
            "--poi", "rejected",
            "--poi_rejection_reasons", "NAME_MISMATCH",
        ],
    },
    timeout=60,
)

# Step 2: Approve
requests.post(
    os.environ["QA_SCRIPT_RUNNER_URL"],
    auth=(os.environ["QA_SCRIPT_RUNNER_USERNAME"], os.environ["QA_SCRIPT_RUNNER_PASSWORD"]),
    json={
        "script_name": "v2_poi_poa.js",
        "args": [
            "--apikey", os.environ["MAILISK_API_KEY"],
            "--email", email,
            "--password", os.environ["TEST_PASSWORD"],
            "--poi", "approved",
        ],
    },
    timeout=60,
)
```

---

## Important Notes

### Payload Structure

- The API uses a **single endpoint** — the `QA_SCRIPT_RUNNER_URL` value IS the full URL
- The `script_name` field determines which operation to run
- The `args` field is a **flat string array** of CLI-style flags and values
- Boolean flags (`--trading`, `--fa`, `--debug`, `--mt5_onboarding`, `--mt5_routing`) are standalone — they do NOT take a value
- The `--mt5` flag is special: it takes TWO positional values: `"--mt5", "<types>", "<password>"`

### Authentication

- Uses HTTP Basic Auth: `Authorization: Basic base64(username:password)`
- The `--apikey` arg in the payload is the `MAILISK_API_KEY` — used for M2M credential decryption inside the scripts, NOT for HTTP authentication

### Response Format

- All responses are **plain text** (not JSON)
- Parse key values using regex: `Email:\s*([^\s\n]+)`, `Session Token:\s*([^\s\n]+)`, etc.
- Check for success confirmation strings to verify completion

---

## Troubleshooting

| Issue                  | Solution                                                                    |
| ---------------------- | --------------------------------------------------------------------------- |
| `401 Unauthorized`     | Check `QA_SCRIPT_RUNNER_USERNAME` and `QA_SCRIPT_RUNNER_PASSWORD` in `.env` |
| `Connection refused`   | Verify `QA_SCRIPT_RUNNER_URL` is correct and accessible                     |
| Account creation fails | Add `"--debug"` to the args array for verbose logging                       |
| KYC options ignored    | KYC, currency, trading options only work with `"--type", "real"`            |
| Email already exists   | Generate a new email with a different timestamp                             |
| MT5 creation fails     | Ensure `--mt5_onboarding` and `--mt5_routing` are included before `--mt5`   |

---

## 🔗 Related Skills

- **[playwright](../playwright/SKILL.md)** (resource 07 — qa-script-runner) — Playwright-integrated version using `APIRequestContext` (for use inside `.spec.ts` tests)
- **[qa-mailisk-api](../qa-mailisk-api/SKILL.md)** — Retrieve emails/OTPs via direct API calls (pairs well with account creation)
- **[playwright](../playwright/SKILL.md)** (resource 06 — data-factory) — Generate test data (emails, profiles) in the correct format
