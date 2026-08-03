import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

/**
 * Determine the target environment and load the corresponding .env file.
 *
 * Set TEST_ENV before running Playwright to select the environment:
 *   TEST_ENV=staging npx playwright test      → loads .env.staging
 *   TEST_ENV=production npx playwright test   → loads .env.production
 *
 * Defaults to 'staging' if TEST_ENV is not set.
 */
const VALID_ENVS = ['staging', 'production'] as const;
type ValidEnv = (typeof VALID_ENVS)[number];

const testEnvRaw = process.env.TEST_ENV || 'staging';
if (!(VALID_ENVS as readonly string[]).includes(testEnvRaw)) {
    throw new Error(`Invalid TEST_ENV: '${testEnvRaw}'. Expected one of: ${VALID_ENVS.join(', ')}`);
}
const testEnv: ValidEnv = testEnvRaw as ValidEnv;
const envFile = path.resolve(__dirname, 'playwright', `.env.${testEnv}`);

if (!fs.existsSync(envFile)) {
    const message =
        `Environment file not found: ${envFile}\n` +
        `TEST_ENV is '${testEnv}' (default: 'staging'). Ensure playwright/.env.${testEnv} exists.\n` +
        `Copy playwright/.env.example to playwright/.env.${testEnv} and fill in credentials.`;

    if (process.env.CI) {
        // Hard fail in CI — tests must never run without credentials
        throw new Error(message);
    }
    // Warn locally — allows tsc, IDE language servers, and type-checks to
    // proceed in a fresh checkout before the developer has created the env file.
    // Tests will still fail at runtime due to missing env vars.
    console.warn(`⚠️  ${message}`);
}

dotenv.config({ path: envFile });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    testDir: './playwright/tests',

    /* Global test timeout */
    timeout: 600000,

    /* Timeout for each assertion */
    expect: {
        timeout: 45000,
    },

    /* Run tests in files in parallel */
    fullyParallel: true,

    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,

    /* Retry on CI only */
    retries: process.env.CI ? 1 : 0,

    /* Configure workers */
    workers: process.env.CI ? 6 : undefined,

    /* Reporter — all output inside playwright/test-results/ */
    reporter: [
        ['list'],
        ['html', { outputFolder: './playwright/playwright-report' }],
        ['json', { outputFile: './playwright/playwright-report/results.json' }],
        /* Live-streams results to TestDino as the run progresses — only enabled when a token is set. */
        ...(process.env.TESTDINO_TOKEN
            ? [
                  [
                      '@testdino/playwright',
                      { token: process.env.TESTDINO_TOKEN, serverUrl: 'https://reporter.testdino.com' },
                  ] as [string, object],
              ]
            : []),
    ],

    use: {
        /* Base URL — override with BASE_URL env var for different environments */
        baseURL: process.env.BASE_URL || 'https://staging-dtrader.deriv.com',

        /* Grant geolocation permission up front so the browser location-sharing
         * popup is never shown to the test runner, and pin deterministic mock
         * coordinates so geolocation-aware tests (e.g. KYC flows) behave
         * identically across all browser projects.
         */
        permissions: ['geolocation'],
        geolocation: { latitude: 0, longitude: 0 },

        /* Headless in CI, headed locally */
        headless: !!process.env.CI,

        /* Collect trace/screenshot/video on failure */
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',

        /* Launch options — browser-specific args are set per project below */
        launchOptions: {
            slowMo: 0,
        },

        /* Timeouts */
        navigationTimeout: 45000,
        actionTimeout: 45000,

        /* User agent */
        userAgent: 'Playwright-Agent/deriv/1.9',
    },

    /* Configure projects for major browsers */
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1536, height: 864 },
                userAgent: `${devices['Desktop Chrome'].userAgent} Playwright-Agent/deriv/1.9`,
                launchOptions: {
                    args: [
                        '--no-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-web-security',
                        '--disable-features=VizDisplayCompositor',
                        // KYC capture flows require a camera device even when tests upload files.
                        '--use-fake-ui-for-media-stream',
                        '--use-fake-device-for-media-stream',
                    ],
                },
            },
        },
        {
            name: 'chromium-mobile',
            use: {
                ...devices['Pixel 7'],
                viewport: { width: 412, height: 915 },
                userAgent: `${devices['Pixel 7'].userAgent} Playwright-Agent/deriv/1.9`,
                launchOptions: {
                    args: [
                        '--no-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-web-security',
                        '--disable-features=VizDisplayCompositor',
                        // KYC capture flows require a camera device even when tests upload files.
                        '--use-fake-ui-for-media-stream',
                        '--use-fake-device-for-media-stream',
                    ],
                },
            },
        },
        {
            name: 'firefox',
            use: {
                ...devices['Desktop Firefox'],
                viewport: { width: 1536, height: 864 },
                userAgent: `${devices['Desktop Firefox'].userAgent} Playwright-Agent/deriv/1.9`,
                launchOptions: {
                    firefoxUserPrefs: {
                        'media.navigator.streams.fake': true,
                        'media.navigator.permission.disabled': true,
                    },
                },
            },
        },
        {
            name: 'webkit',
            use: {
                ...devices['Desktop Safari'],
                viewport: { width: 1536, height: 864 },
                userAgent: `${devices['Desktop Safari'].userAgent} Playwright-Agent/deriv/1.9`,
            },
        },
        {
            name: 'webkit-mobile',
            use: {
                ...devices['iPhone 15 Plus'],
                userAgent: `${devices['iPhone 15 Plus'].userAgent} Playwright-Agent/deriv/1.9`,
            },
        },
    ],

    /* Output directory for test artifacts (screenshots, traces, videos) */
    outputDir: './playwright/test-results',

    /* Run local dev server before tests (only when START_SERVER=true) */
    webServer:
        process.env.START_SERVER === 'true'
            ? {
                  command: process.env.SERVER_COMMAND || 'npm run dev',
                  url: process.env.SERVER_URL || 'http://localhost:3000',
                  reuseExistingServer: !process.env.CI,
                  timeout: 120000,
              }
            : undefined,
});
