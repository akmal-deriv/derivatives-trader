/**
 * CoinGecko public API utilities for live cryptocurrency exchange rate fetching.
 *
 * Uses the free CoinGecko v3 API (no API key required).
 * API endpoint: https://api.coingecko.com/api/v3/simple/price
 *
 * Used in transfer tests to validate the "You'll receive" converted amount shown
 * in the Review & Confirm panel against the current market rate, within a ±2% tolerance
 * to account for Deriv's spread and latency between rate fetch and UI render.
 *
 * Rate limiting: The free CoinGecko API enforces a rate limit (~30 calls/min). This
 * utility automatically retries on HTTP 429 responses with increasing delays plus
 * random jitter (up to 5 retries: 15s, 30s, 45s, 60s, 75s base delays + 0–5s jitter)
 * before failing the test.
 *
 * In-process caching: To reduce redundant API calls within a single Playwright worker,
 * fetched rates are cached in-memory with a configurable TTL (default: 60s). Multiple
 * tests in the same worker that request the same coin within the TTL window will reuse
 * the cached rate without hitting the API again.
 *
 * @example
 * const rate = await CoinGeckoUtils.fetchUsdToCryptoRate('bitcoin');
 * // rate = 0.000011967 (i.e. 1 USD = 0.000011967 BTC)
 *
 * CoinGeckoUtils.assertWithinTolerance(expected, actual, 0.02, 'BTC received amount');
 */

/**
 * Shape of an in-process cached exchange rate entry.
 * Used by the rateCache Map to store fetched crypto→USD rates with a TTL.
 */
interface CachedRate {
    readonly rate: number;
    readonly fetchedAt: number;
}

export class CoinGeckoUtils {
    private static readonly BASE_URL = 'https://api.coingecko.com/api/v3/simple/price';

    /** Maximum number of retry attempts on HTTP 429 (rate limit) responses. */
    private static readonly MAX_RETRIES = 5;

    /**
     * Base retry delays in milliseconds for each attempt (1-indexed).
     * Increased from 3 retries to 5, with longer base delays to survive sustained
     * rate-limiting when many parallel Playwright workers hit CoinGecko simultaneously.
     *   Retry 1: 15s, Retry 2: 30s, Retry 3: 45s, Retry 4: 60s, Retry 5: 75s
     * Each delay also gets 0–5s of random jitter added to break thundering-herd patterns.
     */
    private static readonly RETRY_DELAYS_MS: readonly number[] = [15_000, 30_000, 45_000, 60_000, 75_000];

    /** Maximum random jitter added to each retry delay (in milliseconds). */
    private static readonly JITTER_MAX_MS = 5_000;

    /** Default TTL for in-process rate cache entries (in milliseconds). */
    private static readonly CACHE_TTL_MS = 60_000;

    /**
     * In-process rate cache. Stores fetched crypto→USD rates keyed by coinGeckoId.
     * Each entry includes the rate and the timestamp when it was fetched.
     * This cache is per-worker (Playwright workers run in separate processes),
     * so it eliminates redundant calls within a single worker's sequential test runs.
     */
    private static readonly rateCache = new Map<string, CachedRate>();

    /**
     * Map of wallet display names (as used in TransferPage/tests) to CoinGecko coin IDs.
     * Extend this map when new crypto wallets are added to the platform.
     */
    static readonly WALLET_TO_COINGECKO_ID: Record<string, string> = {
        Bitcoin: 'bitcoin',
        Ethereum: 'ethereum',
        Tether: 'tether',
        Litecoin: 'litecoin',
        Solana: 'solana',
        Dogecoin: 'dogecoin',
        BNB: 'binancecoin',
        Cardano: 'cardano',
        TRX: 'tron',
        'USDT (Tron)': 'tether',
        'USDT (Ethereum)': 'tether',
        'USDC (Ethereum)': 'usd-coin',
        // Add more mappings here as new crypto wallets are supported
    };

    /**
     * Map of wallet display names to their ISO currency codes.
     * Used to parse the numeric value from strings like "0.00014014 BTC (15s)".
     */
    static readonly WALLET_TO_CURRENCY_CODE: Record<string, string> = {
        Bitcoin: 'BTC',
        Ethereum: 'ETH',
        Tether: 'USDT',
        Litecoin: 'LTC',
        Solana: 'SOL',
        Dogecoin: 'DOGE',
        BNB: 'BNB',
        Cardano: 'ADA',
        TRX: 'TRX',
        'USDT (Tron)': 'USDT',
        'USDT (Ethereum)': 'USDT',
        'USDC (Ethereum)': 'USDC',
        'US Dollar': 'USD',
    };

    /**
     * Sleep for the given number of milliseconds.
     *
     * @param ms - Duration to wait in milliseconds
     */
    private static sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Generate a random jitter value between 0 and JITTER_MAX_MS.
     * Uses Math.random() intentionally — this is not a security context,
     * jitter is only used for retry delay randomization.
     *
     * @returns Random jitter in milliseconds
     */
    private static getJitterMs(): number {
        // eslint-disable-next-line no-restricted-properties -- jitter for retry delay, not security
        return Math.floor(Math.random() * CoinGeckoUtils.JITTER_MAX_MS);
    }

    /**
     * Fetch the current USD price of a cryptocurrency from CoinGecko.
     *
     * Returns a cached rate if one exists and is within the TTL window (default 60s).
     * Otherwise, fetches from the API and caches the result.
     *
     * Automatically retries up to MAX_RETRIES times on HTTP 429 (rate limit) responses
     * using the fixed delay schedule defined in RETRY_DELAYS_MS plus random jitter.
     * All other non-OK statuses are thrown immediately without retrying.
     *
     * @param coinGeckoId - CoinGecko coin ID, e.g. "bitcoin", "ethereum", "litecoin"
     * @returns The price of 1 unit of the coin in USD (e.g. 83412.45 for BTC)
     * @throws Error if the API call fails, all retries are exhausted, or the coin ID is not found
     *
     * @example
     * const btcPriceInUsd = await CoinGeckoUtils.fetchCryptoToUsdRate('bitcoin');
     * // Returns e.g. 83412.45
     */
    static async fetchCryptoToUsdRate(coinGeckoId: string): Promise<number> {
        // Check in-process cache first — avoids redundant API calls within the same worker
        const cached = CoinGeckoUtils.rateCache.get(coinGeckoId);
        if (cached && Date.now() - cached.fetchedAt < CoinGeckoUtils.CACHE_TTL_MS) {
            console.log(
                `[CoinGeckoUtils] Using cached rate for "${coinGeckoId}": $${cached.rate} ` +
                    `(age: ${((Date.now() - cached.fetchedAt) / 1000).toFixed(1)}s, TTL: ${CoinGeckoUtils.CACHE_TTL_MS / 1000}s)`
            );
            return cached.rate;
        }

        const url = `${CoinGeckoUtils.BASE_URL}?ids=${encodeURIComponent(coinGeckoId)}&vs_currencies=usd`;

        let lastError: Error | undefined;

        for (let attempt = 0; attempt <= CoinGeckoUtils.MAX_RETRIES; attempt++) {
            // On retry attempts, wait before the next request using the configured delay schedule + jitter
            if (attempt > 0) {
                const baseDelayMs =
                    CoinGeckoUtils.RETRY_DELAYS_MS[attempt - 1] ??
                    CoinGeckoUtils.RETRY_DELAYS_MS[CoinGeckoUtils.RETRY_DELAYS_MS.length - 1] ??
                    75_000;
                const jitterMs = CoinGeckoUtils.getJitterMs();
                const totalDelayMs = baseDelayMs + jitterMs;
                console.warn(
                    `[CoinGeckoUtils] Rate limited (HTTP 429) for coin "${coinGeckoId}". ` +
                        `Retrying in ${(totalDelayMs / 1000).toFixed(1)}s ` +
                        `(base: ${baseDelayMs / 1000}s + jitter: ${(jitterMs / 1000).toFixed(1)}s) ` +
                        `(attempt ${attempt}/${CoinGeckoUtils.MAX_RETRIES})...`
                );
                await CoinGeckoUtils.sleep(totalDelayMs);
            }

            let response: Response;
            try {
                response = await fetch(url);
            } catch (err) {
                throw new Error(
                    `[CoinGeckoUtils] Failed to reach CoinGecko API for coin "${coinGeckoId}". ` +
                        `Network error: ${err instanceof Error ? err.message : String(err)}`
                );
            }

            // Retry on 429 (rate limited) — all other errors fail immediately
            if (response.status === 429) {
                lastError = new Error(
                    `[CoinGeckoUtils] CoinGecko API returned HTTP 429 (rate limited) for coin "${coinGeckoId}". ` +
                        `URL: ${url}`
                );
                continue;
            }

            if (!response.ok) {
                throw new Error(
                    `[CoinGeckoUtils] CoinGecko API returned HTTP ${response.status} for coin "${coinGeckoId}". ` +
                        `URL: ${url}`
                );
            }

            const data = (await response.json()) as Record<string, { usd?: number }>;

            const price = data[coinGeckoId]?.usd;
            if (typeof price !== 'number' || price <= 0) {
                throw new Error(
                    `[CoinGeckoUtils] Could not parse USD price for coin "${coinGeckoId}" from CoinGecko response. ` +
                        `Response: ${JSON.stringify(data)}`
                );
            }

            // Cache the fetched rate for subsequent calls within this worker
            CoinGeckoUtils.rateCache.set(coinGeckoId, { rate: price, fetchedAt: Date.now() });
            console.log(`[CoinGeckoUtils] Fetched and cached rate for "${coinGeckoId}": $${price}`);

            return price;
        }

        // All retries exhausted — throw the last 429 error with context
        const totalWaitSec = CoinGeckoUtils.RETRY_DELAYS_MS.reduce((sum, ms) => sum + ms, 0) / 1000;
        throw new Error(
            `[CoinGeckoUtils] CoinGecko API rate limit (HTTP 429) persisted after ${CoinGeckoUtils.MAX_RETRIES} retries ` +
                `for coin "${coinGeckoId}". Total wait time: ~${totalWaitSec}s (plus jitter). ` +
                `Consider reducing the number of parallel test workers or adding delays between tests. ` +
                `Last error: ${lastError?.message ?? 'unknown'}`
        );
    }

    /**
     * Fetch the current USD → Crypto rate (i.e. how much crypto 1 USD buys).
     *
     * This is the inverse of the crypto → USD price:
     *   1 USD = 1 / (cryptoToUsdRate) crypto units
     *
     * @param coinGeckoId - CoinGecko coin ID, e.g. "bitcoin"
     * @returns How much of the crypto 1 USD buys (e.g. 0.000011967 BTC per USD)
     *
     * @example
     * const usdToBtcRate = await CoinGeckoUtils.fetchUsdToCryptoRate('bitcoin');
     * // 1 USD = 0.000011967 BTC
     */
    static async fetchUsdToCryptoRate(coinGeckoId: string): Promise<number> {
        const cryptoToUsd = await CoinGeckoUtils.fetchCryptoToUsdRate(coinGeckoId);
        return 1 / cryptoToUsd;
    }

    /**
     * Resolve the CoinGecko coin ID from a wallet display name.
     *
     * @param walletName - Wallet display name, e.g. "Bitcoin", "Ethereum"
     * @returns CoinGecko coin ID, e.g. "bitcoin"
     * @throws Error if the wallet name is not mapped (add it to WALLET_TO_COINGECKO_ID)
     *
     * @example
     * const id = CoinGeckoUtils.getCoinGeckoId('Bitcoin'); // "bitcoin"
     * const id = CoinGeckoUtils.getCoinGeckoId('Ethereum'); // "ethereum"
     */
    static getCoinGeckoId(walletName: string): string {
        const id = CoinGeckoUtils.WALLET_TO_COINGECKO_ID[walletName];
        if (!id) {
            throw new Error(
                `[CoinGeckoUtils] No CoinGecko ID mapped for wallet "${walletName}". ` +
                    `Add it to CoinGeckoUtils.WALLET_TO_COINGECKO_ID in utils/coinGeckoUtils.ts.`
            );
        }
        return id;
    }

    /**
     * Parse the numeric amount from a "You'll receive" string like "0.00014014 BTC (15s)".
     * Strips the currency code and any trailing text (e.g. countdown timer "(15s)").
     *
     * @param receivedText - Raw text from the UI, e.g. "0.00014014 BTC (15s)" or "0.00014014 BTC"
     * @returns Parsed numeric value, e.g. 0.00014014
     * @throws Error if no numeric value can be parsed from the string
     *
     * @example
     * CoinGeckoUtils.parseReceivedAmount('0.00014014 BTC (15s)'); // 0.00014014
     * CoinGeckoUtils.parseReceivedAmount('0.00014014 BTC');       // 0.00014014
     */
    static parseReceivedAmount(receivedText: string): number {
        // Match the first numeric token (integer or decimal) in the string
        const match = receivedText.trim().match(/^[\d.]+/);
        if (!match) {
            throw new Error(
                `[CoinGeckoUtils] Cannot parse numeric amount from "You'll receive" text: "${receivedText}". ` +
                    `Expected format: "0.00014014 BTC (15s)"`
            );
        }
        const parsed = parseFloat(match[0]);
        if (isNaN(parsed) || parsed <= 0) {
            throw new Error(
                `[CoinGeckoUtils] Parsed amount is not a positive number from text: "${receivedText}". ` +
                    `Parsed: ${parsed}`
            );
        }
        return parsed;
    }

    /**
     * Extract the numeric value from a currency-formatted string by stripping all
     * non-numeric characters except digits and the decimal point.
     *
     * Unlike {@link parseReceivedAmount} (which matches only a leading numeric token),
     * this method strips currency symbols, commas, whitespace, and currency codes from
     * anywhere in the string — making it suitable for transaction list amounts, banner
     * amounts, and other UI text where the number may not be at the start.
     *
     * Includes a NaN guard: throws a descriptive error if the result is not a finite number.
     *
     * @param text  - Raw UI text containing a numeric value, e.g. "15.50 USD", "$15.50", "0.001234 BTC"
     * @param label - Context label for the error message if parsing fails
     * @returns The parsed numeric value
     * @throws Error if the text does not contain a parseable number
     *
     * @example
     * CoinGeckoUtils.parseNumericFromText('15.50 USD', 'banner amount');   // 15.50
     * CoinGeckoUtils.parseNumericFromText('0.001234 BTC', 'received');     // 0.001234
     * CoinGeckoUtils.parseNumericFromText('$1,234.56', 'total');           // 1234.56
     */
    static parseNumericFromText(text: string, label: string): number {
        const stripped = text.replace(/[^0-9.]/g, '');
        const parsed = parseFloat(stripped);
        if (!Number.isFinite(parsed)) {
            throw new Error(
                `[CoinGeckoUtils] Cannot parse a finite number from text "${text}" for "${label}". ` +
                    `Stripped text: "${stripped}", parsed: ${parsed}.`
            );
        }
        return parsed;
    }

    /**
     * Assert that the actual amount is within the expected tolerance of the market rate.
     *
     * The tolerance check computes the deviation as a percentage:
     *   deviation = |actual - expected| / expected
     *
     * The assertion passes if deviation ≤ toleranceFraction.
     *
     * @param expected         - Expected amount (calculated from market rate)
     * @param actual           - Actual amount shown in the app
     * @param toleranceFraction - Maximum allowed deviation as a fraction (e.g. 0.02 = 2%)
     * @param label            - Description label for the assertion error message
     * @throws Error (assertion failure) if the deviation exceeds the tolerance
     *
     * @example
     * // 1 USD at BTC rate 83412, expected = 0.000011990, actual from UI = 0.000011850
     * CoinGeckoUtils.assertWithinTolerance(0.000011990, 0.000011850, 0.02, 'BTC received');
     */
    static assertWithinTolerance(expected: number, actual: number, toleranceFraction: number, label: string): void {
        // Guard against NaN/non-finite inputs — parseFloat on unexpected UI text (e.g. "Loading...",
        // "--", or empty string) produces NaN, which would cause a confusing deviation=NaN error.
        if (!Number.isFinite(expected) || !Number.isFinite(actual)) {
            throw new Error(
                `[CoinGeckoUtils] Cannot compare non-finite values for "${label}". ` +
                    `expected=${expected}, actual=${actual}. ` +
                    `The UI text may not contain a valid number, or the expected amount could not be parsed.`
            );
        }
        if (expected === 0) {
            throw new Error(
                `[CoinGeckoUtils] Expected amount is zero for "${label}" — cannot compute percentage deviation. ` +
                    `actual=${actual}, expected=${expected}.`
            );
        }

        const deviation = Math.abs(actual - expected) / expected;
        const tolerancePct = (toleranceFraction * 100).toFixed(1);
        const deviationPct = (deviation * 100).toFixed(4);

        if (deviation > toleranceFraction) {
            throw new Error(
                `CoinGeckoUtils rate check failed for "${label}": ` +
                    `actual=${actual}, expected≈${expected.toFixed(8)} (market rate), ` +
                    `deviation=${deviationPct}% exceeds allowed ±${tolerancePct}%. ` +
                    `This may indicate the app is using an incorrect exchange rate or ` +
                    `the market moved significantly between the API fetch and UI render.`
            );
        }
    }
}
