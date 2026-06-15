---
title: QA Script Runner - Staging Account Management
description: Account creation, wallet topup, POI/POA status changes via QA Script Runner in tests
parent_skill: playwright
---

## 🏗️ QA Script Runner: Staging Account Management

> ⚠️ **STAGING ONLY** — All QA Script Runner functions call the QA Script Runner API which only supports staging environments. **Never use these utilities in production tests.**

**Location**: `utils/qaScriptRunner.ts`  
**Exported from**: `utils/index.ts`

### What It Provides

The QA Script Runner utility consolidates all staging-only account management tasks into a single module with three functions:

| Function               | Description                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `createAccountV2()`    | Create a Deriv test account with full configuration (KYC, wallet, trading, MT5, cTrader) |
| `topupAccount()`       | Top up a wallet with a specified currency and amount                                     |
| `changePoiPoaStatus()` | Update POI/POA verification status for an existing account                               |

### Import

```typescript
import { createAccountV2, topupAccount, changePoiPoaStatus } from '../utils';
```

### Quick Examples

```typescript
// Create a demo account
const account = await createAccountV2(request, 'al', 'demo');

// Create a real account with USD wallet and approved KYC
const account = await createAccountV2(request, 'al', 'real', {
    currency: 'USD',
    kyc: {
        poi: { status: 'approved' },
        poa: { status: 'approved' },
    },
});

// Top up a wallet
await topupAccount(request, 'USD', 1000, {
    email: account.email,
    password: account.password,
});

// Change POI/POA status on an existing account
await changePoiPoaStatus(request, {
    email: account.email,
    password: account.password,
    poi: { status: 'approved' },
    poa: { status: 'approved' },
});
```

### Key Rules

- Always use `'al'` (Albania) as the default country for `createAccountUsingAPI`
- Email local part must NEVER exceed 64 characters
- All emails must use `@webapps.mailisk.net` domain
- KYC rejection requires `rejectionReasons` (accepts a single `string` — the API only supports one reason at a time)
- `topupAccount` requires either `walletId` OR (`email` + `password`)
- `changePoiPoaStatus` requires either `clientId` OR (`email` + `password`)
- Enable `debug: true` during troubleshooting

---
