/**
 * Data Factory for Test Data Generation
 *
 * This factory provides utilities for generating test data using faker library.
 * Only implements what is needed - will be expanded as requirements grow.
 *
 * Data can be generated using either faker or custom functions.
 * The factory will be improved over time as new requirements emerge.
 *
 * @example
 * import { DataFactory } from '../utils/dataFactory';
 *
 * // Generate email with millisecond timestamp
 * const email = DataFactory.generateEmail();
 * // Returns: drvtstqa_1708164000000@webapps.mailisk.net
 *
 * // Generate complete user profile
 * const user = DataFactory.generateUserProfile();
 */

import { faker } from '@faker-js/faker';

/**
 * Supported email domains for test account generation.
 *
 * - `'webapps.mailisk.net'` — default domain, used for all standard test accounts
 * - `'mobileapps.mailisk.net'` — used only for mobile app test scenarios when explicitly required
 */
export type EmailDomain = 'webapps.mailisk.net' | 'mobileapps.mailisk.net';

/**
 * Address interface for type-safe address objects
 */
export interface Address {
    street: string;
    city: string;
    state: string;
    countryCode: string;
    zipCode: string;
}

/**
 * User profile interface for type-safe user objects
 */
export interface UserProfile {
    salutation: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    address: Address;
}

/**
 * Data Factory class for generating test data
 *
 * All methods are static - no need to instantiate the class.
 * Uses faker library for realistic data generation.
 */
export class DataFactory {
    // Constants for email generation
    private static readonly EMAIL_PREFIX = 'drvtstqa';
    /** Default email domain — always use this unless explicitly told to use mobileapps */
    static readonly DEFAULT_EMAIL_DOMAIN: EmailDomain = 'webapps.mailisk.net';
    /** Mobile app email domain — only use when explicitly required for mobile app test scenarios */
    static readonly MOBILE_EMAIL_DOMAIN: EmailDomain = 'mobileapps.mailisk.net';
    private static readonly MAX_EMAIL_COUNT = 50;
    /** RFC 5321: local part of an email must not exceed 64 characters */
    private static readonly MAX_LOCAL_PART_LENGTH = 64;

    /**
     * Ensures the local part of an email does not exceed 64 characters (RFC 5321).
     *
     * If the local part exceeds the limit, an error is thrown — this indicates a bug
     * in the email generation logic that must be fixed at the source.
     *
     * @param {string} localPart - The local part of the email (before the @)
     * @returns {string} The validated local part
     * @throws {Error} If the local part exceeds 64 characters
     */
    private static validateLocalPartLength(localPart: string): string {
        if (localPart.length > this.MAX_LOCAL_PART_LENGTH) {
            throw new Error(
                `Email local part exceeds ${this.MAX_LOCAL_PART_LENGTH} characters ` +
                    `(got ${localPart.length}): "${localPart}". ` +
                    'Shorten the prefix or use generateEmail() instead.'
            );
        }
        return localPart;
    }

    /**
     * Truncates a prefix so the full local part stays within 64 characters.
     *
     * The local part format is: `drvtstqa_<prefix>_<timestamp>`
     * - `drvtstqa_` = 9 chars
     * - `_<timestamp>` = 14 chars (underscore + 13-digit timestamp)
     * - Total overhead = 23 chars → max prefix length = 64 - 23 = 41 chars
     *
     * @param {string} prefix - The original prefix
     * @returns {string} The prefix, truncated if necessary
     */
    private static truncatePrefixForEmail(prefix: string): string {
        // drvtstqa_ (9) + _ (1) + 13-digit timestamp (13) = 23 overhead
        const OVERHEAD = 23;
        const maxPrefixLength = this.MAX_LOCAL_PART_LENGTH - OVERHEAD;

        if (prefix.length > maxPrefixLength) {
            return prefix.slice(0, maxPrefixLength);
        }
        return prefix;
    }

    /**
     * Generates a unique email address for testing.
     *
     * Format: `drvtstqa_<timestamp>@<domain>`
     *
     * This format is required for Deriv test accounts and ensures uniqueness
     * through millisecond timestamp-based generation.
     *
     * @param {EmailDomain} [domain] - Email domain to use. Defaults to `'webapps.mailisk.net'`.
     *   Only pass `'mobileapps.mailisk.net'` when explicitly required for mobile app test scenarios.
     * @returns {string} Unique email address in the required format
     *
     * @example
     * // Default (webapps) — use this in almost all cases
     * const email = DataFactory.generateEmail();
     * console.log(email); // drvtstqa_1708164000000@webapps.mailisk.net
     *
     * @example
     * // Mobile domain — only when explicitly required
     * const mobileEmail = DataFactory.generateEmail('mobileapps.mailisk.net');
     * console.log(mobileEmail); // drvtstqa_1708164000000@mobileapps.mailisk.net
     */
    static generateEmail(domain: EmailDomain = DataFactory.DEFAULT_EMAIL_DOMAIN): string {
        const timestamp = Date.now();
        const localPart = `${this.EMAIL_PREFIX}_${timestamp}`;

        // Belt-and-suspenders: validate the final local part length (RFC 5321)
        this.validateLocalPartLength(localPart);

        return `${localPart}@${domain}`;
    }

    /**
     * Generates a unique email address with a custom prefix.
     *
     * Useful when you need to identify emails by test type or scenario.
     *
     * @param {string} prefix - Custom prefix to add before timestamp (alphanumeric, hyphens, underscores only)
     * @param {EmailDomain} [domain] - Email domain to use. Defaults to `'webapps.mailisk.net'`.
     *   Only pass `'mobileapps.mailisk.net'` when explicitly required for mobile app test scenarios.
     * @returns {string} Unique email address with custom prefix
     * @throws {Error} If prefix contains invalid characters
     *
     * @example
     * // Default (webapps) — use this in almost all cases
     * const email = DataFactory.generateEmailWithPrefix('kyc_test');
     * console.log(email); // drvtstqa_kyc_test_1708164000000@webapps.mailisk.net
     *
     * @example
     * // Mobile domain — only when explicitly required
     * const mobileEmail = DataFactory.generateEmailWithPrefix('mobile_test', 'mobileapps.mailisk.net');
     * console.log(mobileEmail); // drvtstqa_mobile_test_1708164000000@mobileapps.mailisk.net
     */
    static generateEmailWithPrefix(prefix: string, domain: EmailDomain = DataFactory.DEFAULT_EMAIL_DOMAIN): string {
        // Validate prefix contains only safe characters
        if (!/^[\w-]+$/.test(prefix)) {
            throw new Error(
                'Invalid prefix: must contain only alphanumeric characters, hyphens, and underscores. ' +
                    `Received: "${prefix}"`
            );
        }

        // Truncate prefix if needed to keep local part ≤ 64 chars (RFC 5321)
        const safePrefix = this.truncatePrefixForEmail(prefix);

        const timestamp = Date.now();
        const localPart = `${this.EMAIL_PREFIX}_${safePrefix}_${timestamp}`;

        // Belt-and-suspenders: validate the final local part length
        this.validateLocalPartLength(localPart);

        return `${localPart}@${domain}`;
    }

    /**
     * Generates multiple unique email addresses.
     *
     * Useful for tests that need multiple accounts.
     *
     * @param {number} count - Number of emails to generate (must be a positive integer, 1-50)
     * @param {EmailDomain} [domain] - Email domain to use. Defaults to `'webapps.mailisk.net'`.
     *   Only pass `'mobileapps.mailisk.net'` when explicitly required for mobile app test scenarios.
     * @returns {string[]} Array of unique email addresses
     * @throws {Error} If count is not a positive integer, less than 1, or greater than 50
     *
     * @example
     * // Default (webapps) — use this in almost all cases
     * const emails = DataFactory.generateMultipleEmails(3);
     * console.log(emails);
     * // [
     * //   'drvtstqa_1708164000000@webapps.mailisk.net',
     * //   'drvtstqa_1708164000001@webapps.mailisk.net',
     * //   'drvtstqa_1708164000002@webapps.mailisk.net'
     * // ]
     *
     * @example
     * // Mobile domain — only when explicitly required
     * const mobileEmails = DataFactory.generateMultipleEmails(2, 'mobileapps.mailisk.net');
     */
    static generateMultipleEmails(count: number, domain: EmailDomain = DataFactory.DEFAULT_EMAIL_DOMAIN): string[] {
        // Validate count is a positive integer
        if (!Number.isInteger(count)) {
            throw new Error('Count must be a positive integer');
        }
        if (count < 1) {
            throw new Error('Count must be at least 1');
        }
        if (count > this.MAX_EMAIL_COUNT) {
            throw new Error(`Count too large (max ${this.MAX_EMAIL_COUNT})`);
        }

        const emails: string[] = [];
        const baseTimestamp = Date.now();

        for (let i = 0; i < count; i++) {
            const localPart = `${this.EMAIL_PREFIX}_${baseTimestamp + i}`;

            // Belt-and-suspenders: validate the final local part length (RFC 5321)
            this.validateLocalPartLength(localPart);

            emails.push(`${localPart}@${domain}`);
        }

        return emails;
    }

    // ============================================
    // PERSONAL INFORMATION
    // ============================================

    /**
     * Generates a random first name
     *
     * @returns {string} Random first name
     *
     * @example
     * const firstName = DataFactory.generateFirstName();
     * console.log(firstName); // "John"
     */
    static generateFirstName(): string {
        return faker.person.firstName();
    }

    /**
     * Generates a random last name
     *
     * @returns {string} Random last name
     *
     * @example
     * const lastName = DataFactory.generateLastName();
     * console.log(lastName); // "Smith"
     */
    static generateLastName(): string {
        return faker.person.lastName();
    }

    /**
     * Generates a random full name
     *
     * @returns {string} Random full name
     *
     * @example
     * const fullName = DataFactory.generateFullName();
     * console.log(fullName); // "John Smith"
     */
    static generateFullName(): string {
        return faker.person.fullName();
    }

    /**
     * Generates a random salutation/title
     *
     * @returns {string} Random salutation (Mr., Mrs., Ms., Dr., etc.)
     *
     * @example
     * const salutation = DataFactory.generateSalutation();
     * console.log(salutation); // "Mr."
     */
    static generateSalutation(): string {
        return faker.person.prefix();
    }

    /**
     * Generates a random date of birth
     * Returns date in YYYY-MM-DD format suitable for forms
     * Age range: 18-80 years old
     *
     * @returns {string} Date of birth in YYYY-MM-DD format
     *
     * @example
     * const dob = DataFactory.generateDateOfBirth();
     * console.log(dob); // "1990-05-15"
     */
    static generateDateOfBirth(): string {
        const date = faker.date.birthdate({ min: 18, max: 80, mode: 'age' });
        return date.toISOString().slice(0, 10);
    }

    /**
     * Generates a random phone number
     *
     * @returns {string} Random phone number
     *
     * @example
     * const phone = DataFactory.generatePhone();
     * console.log(phone); // "+1-555-123-4567"
     */
    static generatePhone(): string {
        return faker.phone.number();
    }

    // ============================================
    // ADDRESS INFORMATION
    // ============================================

    /**
     * Generates a random street address
     *
     * @returns {string} Random street address
     *
     * @example
     * const address = DataFactory.generateAddress();
     * console.log(address); // "123 Main Street"
     */
    static generateAddress(): string {
        return faker.location.streetAddress();
    }

    /**
     * Generates a random city name
     *
     * @returns {string} Random city name
     *
     * @example
     * const city = DataFactory.generateCity();
     * console.log(city); // "New York"
     */
    static generateCity(): string {
        return faker.location.city();
    }

    /**
     * Generates a random state name
     *
     * @returns {string} Random state name
     *
     * @example
     * const state = DataFactory.generateState();
     * console.log(state); // "California"
     */
    static generateState(): string {
        return faker.location.state();
    }

    /**
     * Generates a random ISO country code (e.g., 'US', 'GB', 'FR')
     *
     * Returns 2-letter ISO 3166-1 alpha-2 country codes suitable for backend APIs
     * and form submissions that expect country codes rather than full country names.
     *
     * @returns {string} Random ISO country code
     *
     * @example
     * const countryCode = DataFactory.generateCountryCode();
     * console.log(countryCode); // "US"
     */
    static generateCountryCode(): string {
        return faker.location.countryCode('alpha-2');
    }

    /**
     * Generates a random postal/zip code
     *
     * @returns {string} Random postal code
     *
     * @example
     * const zipCode = DataFactory.generateZipCode();
     * console.log(zipCode); // "12345"
     */
    static generateZipCode(): string {
        return faker.location.zipCode();
    }

    /**
     * Generates a complete address object
     *
     * @returns {Address} Complete address with all fields
     *
     * @example
     * const address = DataFactory.generateCompleteAddress();
     * console.log(address);
     * // {
     * //   street: "123 Main Street",
     * //   city: "New York",
     * //   state: "New York",
     * //   countryCode: "US",
     * //   zipCode: "10001"
     * // }
     */
    static generateCompleteAddress(): Address {
        return {
            street: faker.location.streetAddress(),
            city: faker.location.city(),
            state: faker.location.state(),
            countryCode: faker.location.countryCode('alpha-2'),
            zipCode: faker.location.zipCode(),
        };
    }

    // ============================================
    // USER PROFILE
    // ============================================

    /**
     * Generates a complete user profile with all personal information
     *
     * Uses generateFullName() for consistency with the standalone method.
     *
     * @returns {UserProfile} Complete user profile
     *
     * @example
     * const user = DataFactory.generateUserProfile();
     * console.log(user);
     * // {
     * //   salutation: "Mr.",
     * //   firstName: "John",
     * //   lastName: "Smith",
     * //   fullName: "John Smith",
     * //   email: "drvtstqa_1708164000000@webapps.mailisk.net",
     * //   phone: "+1-555-123-4567",
     * //   dateOfBirth: "1990-05-15",
     * //   address: { ... }
     * // }
     */
    static generateUserProfile(): UserProfile {
        const firstName = this.generateFirstName();
        const lastName = this.generateLastName();

        return {
            salutation: this.generateSalutation(),
            firstName,
            lastName,
            fullName: `${firstName} ${lastName}`,
            email: this.generateEmail(),
            phone: this.generatePhone(),
            dateOfBirth: this.generateDateOfBirth(),
            address: this.generateCompleteAddress(),
        };
    }

    // ============================================
    // IDENTITY DOCUMENT GENERATION
    // ============================================

    /**
     * Generates a valid South African ID number (13-digit Luhn-compliant).
     *
     * South African ID format: YYMMDD SSSS C R Z
     *   - YYMMDD: date of birth (6 digits)
     *   - SSSS:   gender sequence (4 digits; 0000–4999 = female, 5000–9999 = male)
     *   - C:      citizenship (0 = SA citizen, 1 = permanent resident)
     *   - R:      race digit (deprecated; always 8)
     *   - Z:      Luhn check digit
     *
     * The generated ID always represents an SA citizen (C=0) with a random gender sequence.
     *
     * @param dateOfBirth - Optional DOB in `YYYY-MM-DD` format. When provided the SA ID's
     *   encoded date matches exactly, preventing form cross-validation failures. When omitted
     *   a random date between 1950–2006 is used (original behaviour, backwards-compatible).
     * @returns {string} A valid 13-digit South African ID number.
     *
     * @example
     * // Random date (backwards-compatible):
     * const saId = DataFactory.generateSouthAfricanId();
     * console.log(saId); // e.g. "9001235199086"
     *
     * // Anchored to a user profile DOB to avoid SA form cross-validation failures:
     * const saId = DataFactory.generateSouthAfricanId(userProfile.dateOfBirth);
     */
    static generateSouthAfricanId(dateOfBirth?: string): string {
        let yy: string;
        let mm: string;
        let dd: string;

        if (dateOfBirth) {
            // Derive the SA ID date portion from the provided DOB so it matches the form.
            const [fullYear, month, day] = dateOfBirth.split('-');
            yy = fullYear!.slice(-2); // last 2 digits of the year (e.g. "1990" → "90")
            mm = month!.padStart(2, '0');
            dd = day!.padStart(2, '0');
        } else {
            // Original behaviour: random date 1950–2006 (18–74 years old at time of writing).
            const year = faker.number.int({ min: 50, max: 99 }); // YY (1950–1999) or 00–06 (2000–2006)
            const month = faker.number.int({ min: 1, max: 12 });
            const daysInMonth = new Date(2000 + year, month, 0).getDate();
            const day = faker.number.int({ min: 1, max: daysInMonth });
            yy = String(year % 100).padStart(2, '0');
            mm = String(month).padStart(2, '0');
            dd = String(day).padStart(2, '0');
        }

        // Gender sequence: random 4-digit number
        const sequence = faker.number.int({ min: 0, max: 9999 });
        const ssss = String(sequence).padStart(4, '0');

        // Citizenship: 0 = SA citizen
        const citizenship = '0';
        // Race digit: deprecated, always 8
        const race = '8';

        // Build the first 12 digits
        const partial = `${yy}${mm}${dd}${ssss}${citizenship}${race}`;

        // Compute Luhn check digit
        const checkDigit = this._luhnCheckDigit(partial);

        return `${partial}${checkDigit}`;
    }

    /**
     * Computes the Luhn algorithm check digit for a numeric string.
     *
     * @param {string} numStr - Numeric string (without the check digit).
     * @returns {number} The single check digit (0–9).
     */
    private static _luhnCheckDigit(numStr: string): number {
        let sum = 0;
        let isOdd = true; // The rightmost digit of the partial number is at an "odd" position

        // Iterate right-to-left
        for (let i = numStr.length - 1; i >= 0; i--) {
            let digit = parseInt(numStr[i]!, 10);

            if (isOdd) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }

            sum += digit;
            isOdd = !isOdd;
        }

        return (10 - (sum % 10)) % 10;
    }

    // ============================================
    // COMPANY INFORMATION
    // ============================================

    /**
     * Generates a random company name with a timestamp suffix for uniqueness.
     *
     * Returns one of 10 predefined company names with a timestamp appended to guarantee
     * uniqueness in parallel CI environments where multiple workers may select the same
     * base name simultaneously.
     *
     * Format: `<CompanyName> <timestamp>`
     *
     * @returns {string} Random company name with timestamp suffix
     *
     * @example
     * const companyName = DataFactory.generateCompanyName();
     * console.log(companyName); // "Tech Solutions Ltd. 1710582000000"
     */
    static generateCompanyName(): string {
        const companyNames = [
            'Tech Solutions Ltd.',
            'Global Trading Co.',
            'Digital Ventures Inc.',
            'Innovation Partners LLC',
            'Enterprise Systems Ltd.',
            'Smart Business Group',
            'Future Technologies Corp.',
            'Prime Consulting Services',
            'Advanced Solutions Inc.',
            'Strategic Partners Ltd.',
        ];

        const baseName = companyNames[Math.floor(Math.random() * companyNames.length)]!;
        // Add timestamp to guarantee uniqueness in parallel CI runs
        return `${baseName} ${Date.now()}`;
    }

    /**
     * Generates a random company registration number.
     *
     * Format: REG###### (9 characters total: "REG" prefix + 6 random digits)
     *
     * @returns {string} Random company registration number (format: REG######)
     *
     * @example
     * const regNumber = DataFactory.generateCompanyRegistrationNumber();
     * console.log(regNumber); // "REG123456"
     */
    static generateCompanyRegistrationNumber(): string {
        const randomNumber = Math.floor(Math.random() * 900000) + 100000;
        return `REG${randomNumber}`;
    }

    /**
     * Generates a random Albanian mobile phone number (without country code).
     *
     * Albanian mobile numbers start with 69 followed by 7 additional digits.
     * This generator uses the 696 prefix (one of the valid mobile prefixes in Albania)
     * and generates 6 random digits to complete the 9-digit mobile number.
     *
     * Format: 696###### (9 digits total)
     *
     * Note: Albania is used as the default test country for Partners signup because
     * it is a Tier 1 country that allows partner account creation without additional
     * verification requirements, making it ideal for automated testing.
     *
     * @returns {string} Random Albanian mobile phone number (9 digits, no country code)
     *
     * @example
     * const phone = DataFactory.generateAlbanianPhoneNumber();
     * console.log(phone); // "696123456"
     */
    static generateAlbanianPhoneNumber(): string {
        // Generate 6 random digits to complete the 9-digit mobile number
        const randomDigits = Math.floor(Math.random() * 1000000)
            .toString()
            .padStart(6, '0');
        return `696${randomDigits}`;
    }

    /**
     * Generates a random Albanian city name.
     *
     * Returns one of the major cities in Albania. Albania is used as the default
     * test country for Partners signup because it is a Tier 1 country that allows
     * partner account creation without additional verification requirements.
     *
     * @returns {string} Random Albanian city name
     *
     * @example
     * const city = DataFactory.generateAlbanianCity();
     * console.log(city); // "Tirana"
     */
    static generateAlbanianCity(): string {
        const cities = ['Tirana', 'Durres', 'Vlore', 'Shkoder', 'Fier', 'Korce', 'Elbasan', 'Berat'];
        // Safe: index is always within bounds (0 to length-1)
        return cities[Math.floor(Math.random() * cities.length)]!;
    }

    // ============================================
    // SOCIAL LOGIN EMAIL GENERATION
    // ============================================

    /**
     * Generates a unique Gmail address for social (OAuth) login tests.
     *
     * Social login tests (Mock Social Login / Google OAuth) require a real-looking
     * Gmail address — not a Mailisk address — because the Ory Mock IDP validates
     * the email domain. The address is registered via `addSocialAccount()` before
     * the test and cleaned up via `removeSocialAccount()` in `afterEach`.
     *
     * Format: `drvtst_social_<epoch>_<random>@gmail.com`
     *
     * The epoch timestamp combined with a random suffix guarantees uniqueness
     * even when two parallel workers start at the exact same millisecond.
     * This mirrors the pattern used by `generateEmail()` and `generateEmailWithPrefix()`.
     *
     * @returns {string} A unique Gmail address for social login testing.
     *
     * @example
     * const email = DataFactory.generateSocialEmail();
     * console.log(email); // "drvtst_social_1741672800000_427@gmail.com"
     */
    static generateSocialEmail(): string {
        const epoch = Date.now();
        // Add a random suffix (0–999) to prevent collisions between parallel workers
        // that may start at the exact same millisecond
        const random = Math.floor(Math.random() * 1000);
        return `drvtst_social_${epoch}_${random}@gmail.com`;
    }

    // ============================================
    // ============================================
    // DERIV API DASHBOARD — TEST DATA GENERATORS
    // ============================================

    /**
     * Generate a unique, valid application name for Deriv API Dashboard tests.
     *
     * Format: `{adjective} {noun} App`
     * - Sanitized: only alphanumeric characters and spaces (no special chars)
     * - Truncated to `maxLength` characters (default 48 — the API max)
     * - Unique per call via faker's random word generation
     *
     * Rules enforced:
     * - Only alphanumeric + spaces (no Binary/Deriv — avoid forbidden words in test names)
     * - Max 48 characters (API validation limit)
     *
     * @param suffix - Optional suffix to append before sanitizing (default: 'App')
     * @param maxLength - Maximum character length (default: 48)
     * @returns A unique, sanitized application name
     *
     * @example
     * ```ts
     * const appName = DataFactory.generateAppName();
     * // Returns e.g. "Gentle River App"
     * ```
     */
    static generateAppName(suffix: string = 'App', maxLength: number = 48): string {
        const raw = `${faker.word.adjective()} ${faker.word.noun()} ${suffix}`;
        return raw.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, maxLength);
    }

    /**
     * Generate a unique, valid API token name for Deriv API Dashboard tests.
     *
     * Format: `{adjective} {noun} Token`
     * - Sanitized: only alphanumeric characters and spaces
     * - Truncated to `maxLength` characters (default 32 — the token name max)
     *
     * Rules enforced:
     * - Only alphanumeric + spaces
     * - Min 2 chars, max 32 chars (token validation limits)
     *
     * @param maxLength - Maximum character length (default: 32)
     * @returns A unique, sanitized token name
     *
     * @example
     * ```ts
     * const tokenName = DataFactory.generateTokenName();
     * // Returns e.g. "Happy Stream Token"
     * ```
     */
    static generateTokenName(maxLength: number = 32): string {
        const raw = `${faker.word.adjective()} ${faker.word.noun()} Token`;
        return raw.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, maxLength);
    }

    /**
     * Generate a valid Albania TIN for tax information tests.
     *
     * Format: `{letter}{8 digits}{letter}` (e.g. "A00100000B")
     * This matches the Albania TIN validation pattern accepted by the tax information form.
     *
     * @returns A valid Albania TIN string
     *
     * @example
     * const tin = DataFactory.generateAlbaniaTin();
     * // Returns e.g. "K38271654M"
     */
    static generateAlbaniaTin(): string {
        const letter = () => faker.string.alpha({ length: 1, casing: 'upper' });
        const digits = faker.string.numeric(8);
        return `${letter()}${digits}${letter()}`;
    }

    /**
     * Generate a random "other" reason description for the tax no-TIN form.
     * Produces a short sentence capped at 100 characters.
     * @example
     * const reason = DataFactory.generateTaxOtherReason();
     * // Returns e.g. "No tax identification issued for my current situation."
     */
    static generateTaxOtherReason(): string {
        return faker.lorem.sentence({ min: 5, max: 10 }).slice(0, 100);
    }

    // ============================================
    // FUTURE EXPANSION AREA
    // ============================================
    // Add new data generation methods here as needed:
    // - generatePassword()
    // - generateTradingAccount()
    // - generateKYCData()
    // - generateFinancialData()
    // etc.
}

// ============================================
// PAYMENT AGENT CONSTANTS
// ============================================

/**
 * Full 7 display labels exactly as they appear in the Payment Agent currency dropdown.
 *
 * @example
 * await expect(page.getByRole('option')).toHaveCount(PAYMENT_AGENT_CURRENCY_LABELS.length);
 */
export const PAYMENT_AGENT_CURRENCY_LABELS = [
    'USD',
    'BTC',
    'ETH',
    'LTC',
    'USDC (Ethereum)',
    'USDT (Ethereum)',
    'USDT (TRON)',
] as const;
