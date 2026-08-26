import { MailiskClient } from 'mailisk';

// ─────────────────────────────────────────────────────────────────────────────
// Supported Mailisk domains
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Supported Mailisk email domains.
 * - `webapps`   → default for all web-app test scenarios
 * - `mobileapps` → only when explicitly required for mobile-app test scenarios
 */
export type MailiskDomain = 'webapps' | 'mobileapps';

/** Fully-qualified Mailisk namespace strings. */
export const MAILISK_NAMESPACES = {
    webapps: 'webapps',
    mobileapps: 'mobileapps',
} as const satisfies Record<MailiskDomain, string>;

// ─────────────────────────────────────────────────────────────────────────────
// Response types (mirrors the Mailisk API schema)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Represents a single email address entry (sender / recipient).
 */
export interface MailiskEmailAddress {
    /** The raw email address string. */
    address: string;
    /** Optional display name associated with the address. */
    name?: string;
}

/**
 * Metadata for a file attached to an email.
 */
export interface MailiskEmailAttachment {
    /** Unique identifier for the attachment (used with the Get Attachment API). */
    id: string;
    /** Original filename of the attachment. */
    filename: string;
    /** MIME content-type of the attachment (e.g. `"application/pdf"`). */
    content_type: string;
    /** Size of the attachment in bytes. */
    size: number;
}

/**
 * A single email message as returned by the Mailisk Search Inbox API.
 *
 * Derived from the library's `Email` type (via `MailiskSearchResult['data'][number]`)
 * so it stays in sync automatically without requiring a manual cast.
 *
 * @see https://docs.mailisk.com/api-reference/search-inbox.html#typescript-type
 */
export type MailiskEmail = MailiskSearchResult['data'][number];

/**
 * Full response envelope from the Mailisk Search Inbox API.
 *
 * Aliased directly from the library's inferred return type so that our
 * interface stays in sync with the client without requiring a cast.
 * Using `Awaited<ReturnType<...>>` avoids the `as unknown as` double-cast
 * that would otherwise be needed when the library does not export its
 * response interface.
 */
export type MailiskSearchResult = Awaited<ReturnType<MailiskClient['searchInbox']>>;

// ─────────────────────────────────────────────────────────────────────────────
// Search filter parameters
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Query parameters accepted by the Mailisk Search Inbox endpoint.
 *
 * All fields are optional. When omitted the API applies its own defaults
 * (e.g. `from_timestamp` defaults to 15 minutes ago, `wait` defaults to `true`
 * in the Node library).
 *
 * @see https://docs.mailisk.com/api-reference/search-inbox.html#query
 */
export interface MailiskSearchFilters {
    /**
     * Maximum number of emails to return (1–20).
     * @default 10 (API default)
     */
    limit?: number;

    /**
     * Number of emails to skip — useful for pagination.
     * @default 0
     */
    offset?: number;

    /**
     * Only return emails received **at or after** this Unix timestamp (seconds).
     * Set to `0` to disable the default 15-minute recency filter and return all
     * historical emails.
     * @default Math.floor(Date.now() / 1000) - 900  (15 minutes ago)
     */
    from_timestamp?: number;

    /**
     * Only return emails received **at or before** this Unix timestamp (seconds).
     */
    to_timestamp?: number;

    /**
     * Filter by recipient address prefix.
     * E.g. `"john"` matches `"john@..."` but not `"notjohn@..."`.
     */
    to_addr_prefix?: string;

    /**
     * Filter by sender address substring (case-insensitive).
     * E.g. `"@deriv"` matches `"noreply@deriv.com"`.
     */
    from_addr_includes?: string;

    /**
     * Filter by subject substring (case-insensitive).
     * E.g. `"verify"` matches `"Please verify your email"`.
     */
    subject_includes?: string;

    /**
     * When `true` (the default in the Node library) the request blocks until at
     * least one matching email is found. Set to `false` to return immediately
     * even if the inbox is empty.
     * @default true
     */
    wait?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Request-level options
// ─────────────────────────────────────────────────────────────────────────────

/**
 * HTTP-level options forwarded to the underlying Mailisk client request.
 */
export interface MailiskRequestOptions {
    /**
     * Maximum time (milliseconds) to wait for at least one email when `wait`
     * is `true`.
     * @default 300_000  (5 minutes)
     */
    timeout?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// OTP extraction result
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result returned by {@link MailiskUtils.extractOtp}.
 */
export interface OtpExtractionResult {
    /** The 6-digit OTP string extracted from the email. */
    otp: string;
    /** The email from which the OTP was extracted. */
    sourceEmail: MailiskEmail;
}

/**
 * Result returned by {@link MailiskUtils.extractRedirectUrl}.
 */
export interface RedirectUrlExtractionResult {
    /** The full redirect URL extracted from the email. */
    redirectUrl: string;
    /** The email from which the URL was extracted. */
    sourceEmail: MailiskEmail;
}

// ─────────────────────────────────────────────────────────────────────────────
// MailiskUtils
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Utility class for interacting with the Mailisk email testing service.
 *
 * Wraps the official `mailisk-node` client to provide strongly-typed,
 * project-aware helpers for retrieving emails and extracting structured data
 * (OTPs, etc.) from them.
 *
 * **Supported domains**
 * - `webapps.mailisk.net`   — default for all web-app test scenarios
 * - `mobileapps.mailisk.net` — only when explicitly required for mobile tests
 *
 * @example
 * ```typescript
 * // Retrieve the latest email sent to john@webapps.mailisk.net
 * const result = await MailiskUtils.searchInbox('webapps', {
 *     to_addr_prefix: 'john',
 *     subject_includes: 'verify',
 * });
 * const email = result.data[0];
 *
 * // Extract a 6-digit OTP from that email
 * const { otp } = await MailiskUtils.extractOtp('webapps', {
 *     to_addr_prefix: 'john',
 *     subject_includes: 'verify',
 * });
 * console.log('OTP:', otp);
 * ```
 */
export class MailiskUtils {
    // ── Private state ──────────────────────────────────────────────────────

    /** Singleton Mailisk client instance (lazy-initialised). */
    private static _client: MailiskClient | null = null;

    /**
     * Regex used to extract a 6-digit OTP from email content.
     * Matches exactly 6 consecutive digits surrounded by word boundaries.
     */
    private static readonly OTP_REGEX = /\b(\d{6})\b/;

    // ── Client initialisation ──────────────────────────────────────────────

    /**
     * Returns the singleton {@link MailiskClient}, initialising it on first
     * call using `MAILISK_API_KEY` from the environment.
     *
     * @throws {Error} If `MAILISK_API_KEY` is not set in the environment.
     * @returns The initialised Mailisk client.
     */
    private static getClient(): MailiskClient {
        if (this._client) {
            return this._client;
        }

        const apiKey = process.env.MAILISK_API_KEY;
        if (!apiKey) {
            throw new Error(
                '[MailiskUtils] MAILISK_API_KEY is not set. ' + 'Add it to your .env file before using MailiskUtils.'
            );
        }

        this._client = new MailiskClient({ apiKey });
        return this._client;
    }

    // ── Core search ────────────────────────────────────────────────────────

    /**
     * Searches the inbox of the given Mailisk namespace and returns matching
     * emails.
     *
     * By default the underlying library blocks until at least one email
     * arrives (`wait: true`) and applies a 15-minute recency window. Both
     * behaviours can be overridden via `filters`.
     *
     * @param domain  - The Mailisk domain to search (`'webapps'` or `'mobileapps'`).
     * @param filters - Optional query filters (recipient prefix, subject, timestamps, etc.).
     * @param options - Optional HTTP-level options (e.g. custom `timeout`).
     * @returns A {@link MailiskSearchResult} containing the matched emails and pagination info.
     *
     * @throws {Error} If `MAILISK_API_KEY` is missing.
     * @throws {Error} If the Mailisk API returns an error response.
     *
     * @example
     * ```typescript
     * // Wait up to 2 minutes for a verification email to john@webapps.mailisk.net
     * const result = await MailiskUtils.searchInbox(
     *     'webapps',
     *     { to_addr_prefix: 'john', subject_includes: 'verify' },
     *     { timeout: 120_000 }
     * );
     * console.log('Emails found:', result.total_count);
     * console.log('First email subject:', result.data[0]?.subject);
     * ```
     */
    static async searchInbox(
        domain: MailiskDomain,
        filters: MailiskSearchFilters = {},
        options: MailiskRequestOptions = {}
    ): Promise<MailiskSearchResult> {
        const client = this.getClient();
        const namespace = MAILISK_NAMESPACES[domain];

        // Build the filter object — only include defined keys so we don't
        // accidentally override Mailisk's sensible defaults with `undefined`.
        const queryFilters: Record<string, unknown> = {};

        if (filters.limit !== undefined) queryFilters['limit'] = filters.limit;
        if (filters.offset !== undefined) queryFilters['offset'] = filters.offset;
        if (filters.from_timestamp !== undefined) queryFilters['from_timestamp'] = filters.from_timestamp;
        if (filters.to_timestamp !== undefined) queryFilters['to_timestamp'] = filters.to_timestamp;
        if (filters.to_addr_prefix !== undefined) queryFilters['to_addr_prefix'] = filters.to_addr_prefix;
        if (filters.from_addr_includes !== undefined) queryFilters['from_addr_includes'] = filters.from_addr_includes;
        if (filters.subject_includes !== undefined) queryFilters['subject_includes'] = filters.subject_includes;
        if (filters.wait !== undefined) queryFilters['wait'] = filters.wait;

        // Build request options — only include timeout when explicitly provided.
        const requestOptions: Record<string, unknown> = {};
        if (options.timeout !== undefined) requestOptions['timeout'] = options.timeout;

        // Delegate to the official Mailisk client.
        // MailiskSearchResult is aliased from the library's return type, so no
        // cast is needed — the types are identical by construction.
        return client.searchInbox(
            namespace,
            queryFilters as Parameters<MailiskClient['searchInbox']>[1],
            requestOptions as Parameters<MailiskClient['searchInbox']>[2]
        );
    }

    // ── Convenience helpers ────────────────────────────────────────────────

    /**
     * Returns the **most recent** email from the inbox that matches the given
     * filters, or `null` if no email is found.
     *
     * This is a convenience wrapper around {@link searchInbox} that returns
     * only the first (newest) email from the result set.
     *
     * @param domain  - The Mailisk domain to search.
     * @param filters - Optional query filters.
     * @param options - Optional HTTP-level options.
     * @returns The most recent matching {@link MailiskEmail}, or `null`.
     *
     * @example
     * ```typescript
     * const email = await MailiskUtils.getLatestEmail('webapps', {
     *     to_addr_prefix: 'john',
     * });
     * if (email) {
     *     console.log('Subject:', email.subject);
     *     console.log('Body:', email.text);
     * }
     * ```
     */
    static async getLatestEmail(
        domain: MailiskDomain,
        filters: MailiskSearchFilters = {},
        options: MailiskRequestOptions = {}
    ): Promise<MailiskEmail | null> {
        const result = await this.searchInbox(domain, filters, options);
        return result.data[0] ?? null;
    }

    // ── OTP extraction ─────────────────────────────────────────────────────

    /**
     * Waits for an email matching the given filters and extracts a 6-digit OTP
     * from its content (plain-text body checked first, then HTML body).
     *
     * The OTP regex used is `/\b(\d{6})\b/` — it matches the **first**
     * occurrence of exactly 6 consecutive digits surrounded by word boundaries.
     *
     * @param domain  - The Mailisk domain to search (`'webapps'` or `'mobileapps'`).
     * @param filters - Query filters to narrow down the target email (e.g.
     *                  `to_addr_prefix`, `subject_includes`). It is strongly
     *                  recommended to supply at least `to_addr_prefix` so that
     *                  only emails addressed to the test account are considered.
     * @param options - Optional HTTP-level options (e.g. custom `timeout`).
     * @returns An {@link OtpExtractionResult} containing the OTP string and the
     *          source email.
     *
     * @throws {Error} If no matching email is found within the timeout period.
     * @throws {Error} If the email is found but contains no 6-digit OTP.
     *
     * @example
     * ```typescript
     * const { otp, sourceEmail } = await MailiskUtils.extractOtp('webapps', {
     *     to_addr_prefix: 'john',
     *     subject_includes: 'verification code',
     * });
     * console.log('OTP:', otp);           // e.g. "123456"
     * console.log('From:', sourceEmail.from.address);
     * ```
     */
    static async extractOtp(
        domain: MailiskDomain,
        filters: MailiskSearchFilters = {},
        options: MailiskRequestOptions = {}
    ): Promise<OtpExtractionResult> {
        const result = await this.searchInbox(domain, filters, options);

        if (result.data.length === 0) {
            throw new Error(
                `[MailiskUtils.extractOtp] No emails found in namespace "${MAILISK_NAMESPACES[domain]}" ` +
                    `matching filters: ${JSON.stringify(filters)}`
            );
        }

        // Iterate through returned emails (newest first) and find the first
        // one that contains a valid 6-digit OTP.
        for (const email of result.data) {
            const otp = this._extractOtpFromEmail(email);
            if (otp !== null) {
                return { otp, sourceEmail: email };
            }
        }

        throw new Error(
            `[MailiskUtils.extractOtp] Found ${result.data.length} email(s) in namespace ` +
                `"${MAILISK_NAMESPACES[domain]}" but none contained a 6-digit OTP. ` +
                `Subjects checked: [${result.data.map(e => `"${e.subject ?? '(no subject)'}"`).join(', ')}]`
        );
    }

    // ── Redirect URL extraction ────────────────────────────────────────────

    /**
     * Waits for the V1 signup redirect email and extracts the redirect URL from it.
     *
     * V1 signup emails (subject: "One more step to create your account") contain a
     * redirect URL instead of an OTP. The URL looks like:
     *   `https://hub.deriv.com/tradershub/redirect?action=signup&code=XXXXXXXX&...`
     *
     * Extraction strategy:
     *   1. Search HTML body for an `href` attribute containing the redirect URL
     *   2. Fall back to a plain-text URL regex if no href is found
     *
     * @param domain  - The Mailisk domain to search (`'webapps'` or `'mobileapps'`).
     * @param filters - Query filters to narrow down the target email. It is strongly
     *                  recommended to supply at least `to_addr_prefix` and
     *                  `from_timestamp` to avoid stale emails from previous runs.
     * @param options - Optional HTTP-level options (e.g. custom `timeout`).
     * @returns A {@link RedirectUrlExtractionResult} containing the redirect URL
     *          and the source email.
     *
     * @throws {Error} If no matching email is found within the timeout period.
     * @throws {Error} If the email is found but contains no redirect URL.
     *
     * @example
     * ```typescript
     * const testStartTimestamp = Math.floor(Date.now() / 1000);
     *
     * // ... trigger the V1 signup email by submitting the V2 signup form ...
     *
     * const { redirectUrl } = await MailiskUtils.extractRedirectUrl('webapps', {
     *     to_addr_prefix: emailLocalPart,
     *     subject_includes: 'One more step',
     *     from_timestamp: testStartTimestamp,
     * }, { timeout: 180_000 });
     *
     * await page.goto(redirectUrl);
     * ```
     */
    static async extractRedirectUrl(
        domain: MailiskDomain,
        filters: MailiskSearchFilters = {},
        options: MailiskRequestOptions = {}
    ): Promise<RedirectUrlExtractionResult> {
        const result = await this.searchInbox(domain, filters, options);

        if (result.data.length === 0) {
            throw new Error(
                `[MailiskUtils.extractRedirectUrl] No emails found in namespace "${MAILISK_NAMESPACES[domain]}" ` +
                    `matching filters: ${JSON.stringify(filters)}`
            );
        }

        // Iterate through returned emails (newest first) and find the first
        // one that contains a valid redirect URL.
        for (const email of result.data) {
            const redirectUrl = this._extractRedirectUrlFromEmail(email);
            if (redirectUrl !== null) {
                return { redirectUrl, sourceEmail: email };
            }
        }

        throw new Error(
            `[MailiskUtils.extractRedirectUrl] Found ${result.data.length} email(s) in namespace ` +
                `"${MAILISK_NAMESPACES[domain]}" but none contained a redirect URL. ` +
                `Subjects checked: [${result.data.map(e => `"${e.subject ?? '(no subject)'}"`).join(', ')}]`
        );
    }

    // ── Private helpers ────────────────────────────────────────────────────

    /**
     * Attempts to extract a redirect URL from a single email's content.
     *
     * Extraction strategy:
     *   1. HTML body: search for `href` attributes pointing to any `*.deriv.com` URL
     *   2. Plain-text body: search for any `https://` URL on `*.deriv.com`
     *
     * Matches any flow (signup, withdrawal, deposit, account changes, etc.) on both
     * staging and production Deriv domains.
     *
     * @param email - The email to search.
     * @returns The redirect URL string if found, or `null` if no match.
     */
    private static _extractRedirectUrlFromEmail(email: MailiskEmail): string | null {
        // Strategy 1: extract href URL from HTML body
        // Matches any href pointing to a *.deriv.com URL (staging or production, any path/flow)
        if (typeof email.html === 'string' && email.html.length > 0) {
            const hrefRegex = /href=["']((https?:\/\/[a-z0-9-]+\.deriv\.com\/[^"'\s]*))/i;
            const hrefMatch = hrefRegex.exec(email.html);
            if (hrefMatch && hrefMatch[1] !== undefined) {
                // Decode HTML entities (e.g. &amp; → &) that email clients encode
                return hrefMatch[1].replace(/&amp;/gi, '&');
            }
        }

        // Strategy 2: extract plain-text URL
        if (typeof email.text === 'string' && email.text.length > 0) {
            const urlRegex = /(https?:\/\/[a-z0-9-]+\.deriv\.com\/\S+)/i;
            const urlMatch = urlRegex.exec(email.text);
            if (urlMatch && urlMatch[1] !== undefined) {
                return urlMatch[1];
            }
        }

        return null;
    }

    /**
     * Attempts to extract a 6-digit OTP from a single email's content.
     *
     * Search order:
     * 1. Plain-text body (`text`)
     * 2. HTML body (`html`) — useful when no plain-text alternative is provided
     *
     * @param email - The email to search.
     * @returns The OTP string if found, or `null` if no match.
     */
    private static _extractOtpFromEmail(email: MailiskEmail): string | null {
        // Prefer plain-text body — it is cleaner and less likely to contain
        // spurious 6-digit sequences from HTML markup.
        const sources = [email.text, email.html].filter((s): s is string => typeof s === 'string' && s.length > 0);

        for (const source of sources) {
            const match = this.OTP_REGEX.exec(source);
            // match[1] is the first capture group — guaranteed to be a string
            // when the regex matched, but TypeScript types it as string|undefined.
            if (match && match[1] !== undefined) {
                return match[1];
            }
        }

        return null;
    }
}
