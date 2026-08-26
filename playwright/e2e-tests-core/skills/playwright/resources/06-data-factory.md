---
title: Data Factory - Test Data Generation
description: Email generation, user profiles, addresses, and test data best practices
parent_skill: playwright
---

## 🏭 Data Factory: Test Data Generation

### Overview

The `DataFactory` class provides utilities for generating realistic test data using the faker library. It follows a focused implementation approach - only implementing what's needed right now, with clear expansion points for future requirements.

**Location**: `utils/dataFactory.ts`

**Exported from**: `utils/index.ts`

### Quick Start

```typescript
import { DataFactory } from '../utils/dataFactory';

// Generate unique email (required format for Deriv)
const email = DataFactory.generateEmail();
// Returns: drvtstqa_1708164000000@webapps.mailisk.net

// Generate email with prefix (recommended for test organization)
const kycEmail = DataFactory.generateEmailWithPrefix('kyc_test');
// Returns: drvtstqa_kyc_test_1708164000000@webapps.mailisk.net

// Generate complete user profile
const user = DataFactory.generateUserProfile();
// Returns: { salutation, firstName, lastName, email, phone, dateOfBirth, address }
```

### Key Features

- ✅ **Email Generation**: Millisecond timestamp for uniqueness
- ✅ **Input Validation**: Batch operations validate count (1-50) with clear error messages
- ✅ **Configurable Constants**: EMAIL_PREFIX, EMAIL_DOMAIN, MAX_EMAIL_COUNT for easy maintenance
- ✅ **Personal Information**: Names, DOB (18-80 years), phone numbers
- ✅ **Address Information**: Street, city, state, country, zip code
- ✅ **Complete Profiles**: All-in-one user profile generation
- ✅ **Batch Generation**: Multiple emails/profiles at once with validation
- ✅ **Type-Safe**: Full TypeScript support with improved type handling
- ✅ **Faker-Powered**: Realistic data from faker library

### Common Use Cases

#### 1. Account Creation with Data Factory

```typescript
test('create account with generated data', async ({ request }) => {
    const email = DataFactory.generateEmailWithPrefix('test');

    const account = await createAccountV2(request, 'al', 'demo', {
        email: email,
    });

    console.log('Created account:', account.email);
});
```

#### 2. Form Filling

```typescript
test('fill registration form', async ({ page }) => {
    const user = DataFactory.generateUserProfile();

    await page.fill('[name="firstName"]', user.firstName);
    await page.fill('[name="lastName"]', user.lastName);
    await page.fill('[name="email"]', user.email);
    await page.fill('[name="phone"]', user.phone);
    await page.fill('[name="dateOfBirth"]', user.dateOfBirth);
});
```

#### 3. Multiple Test Accounts

```typescript
test('P2P trading scenario', async ({ request }) => {
    const buyerEmail = DataFactory.generateEmailWithPrefix('p2p_buyer');
    const sellerEmail = DataFactory.generateEmailWithPrefix('p2p_seller');

    const buyer = await createAccountV2(request, 'al', 'demo', {
        email: buyerEmail,
    });

    const seller = await createAccountV2(request, 'al', 'demo', {
        email: sellerEmail,
    });
});
```

### Best Practices

1. **Use Prefixes**: Always use `generateEmailWithPrefix()` for better test organization
2. **Complete Profiles**: Use `generateUserProfile()` when you need multiple fields
3. **Batch Generation**: Use `generateMultipleEmails()` for multiple accounts
4. **Store Data**: Save generated data in variables for reuse in the same test

### Available Methods

- `generateEmail()` - Basic unique email with millisecond timestamp
- `generateEmailWithPrefix(prefix)` - Email with custom prefix + millisecond timestamp
- `generateMultipleEmails(count)` - Batch email generation (1-50, validated)
- `generateFirstName()` - Random first name
- `generateLastName()` - Random last name
- `generateFullName()` - Random full name
- `generateSalutation()` - Random title (Mr., Mrs., etc.)
- `generateDateOfBirth()` - DOB in YYYY-MM-DD format (18-80 years)
- `generatePhone()` - Random phone number
- `generateAlbanianPhoneNumber()` - Albanian phone number (9 digits, no country code, format: 696######)
- `generateAddress()` - Street address
- `generateCity()` - City name
- `generateAlbanianCity()` - Albanian city name (e.g., Tirana, Durres, Vlore)
- `generateState()` - State name
- `generateCountryCode()` - ISO country code (e.g., 'US', 'GB')
- `generateZipCode()` - Postal code
- `generateCompanyName()` - Company name
- `generateCompanyRegistrationNumber()` - Company registration number (format: REG######)
- `generateCompleteAddress()` - Complete address object
- `generateUserProfile()` - Complete user profile with all fields
- `generateSocialEmail()` - Social (OAuth) login email (format: `drvtst_social_<epoch>@gmail.com`)

### Constants

| Constant                | Value                      | Description                                                 |
| ----------------------- | -------------------------- | ----------------------------------------------------------- |
| `DEFAULT_EMAIL_DOMAIN`  | `'webapps.mailisk.net'`    | Default email domain for web-app tests                      |
| `MOBILE_EMAIL_DOMAIN`   | `'mobileapps.mailisk.net'` | Mobile-app email domain (use only when explicitly required) |
| `MAX_EMAIL_COUNT`       | `50`                       | Maximum emails in batch generation                          |
| `MAX_LOCAL_PART_LENGTH` | `64`                       | RFC 5321 hard limit for email local part                    |

### Types

```typescript
/** Supported email domain types */
type EmailDomain = 'webapps.mailisk.net' | 'mobileapps.mailisk.net';

/** Complete address structure */
interface Address {
    street: string;
    city: string;
    state: string;
    countryCode: string;
    zipCode: string;
}

/** Complete user profile structure */
interface UserProfile {
    salutation: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    address: Address;
}
```

---
