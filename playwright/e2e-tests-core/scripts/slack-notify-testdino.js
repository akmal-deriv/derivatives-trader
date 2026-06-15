#!/usr/bin/env node
// Requires: Node.js 18+  (uses built-in fetch)
const fs = require('fs');
const path = require('path');

// Sends a Playwright test result notification to Slack.
//
// Required env vars:
//   SLACK_OAUTH_TOKEN   — Slack Bot OAuth token
//   SLACK_CHANNEL_ID    — Target Slack channel ID
//   GITHUB_RUN_URL      — GitHub Actions run URL
//
// Optional env vars (TestDino stats):
//   TESTDINO_RUN_ID       — TestDino run ID (to fetch stats)
//   TESTDINO_RUN_URL      — TestDino run URL (for button)
//   TESTDINO_ACCESS_TOKEN — TestDino read-only token
//   TESTDINO_PROJECT_ID   — TestDino project ID
//
// Run context:
//   TEST_ENV    — e.g. staging / production
//   TEST_SUITE  — e.g. smoke / regression
//   PLATFORM    — e.g. desktop / mobile
//   MODULE      — e.g. all / auth / cashier
//   EVENT_NAME  — github.event_name
//   ACTOR       — github.actor (used as key for self-mention lookup in slack-id-map.json)
//   NOTIFY      — skip | self | team-web-app-v2 | regression-team-{1-4} (workflow_dispatch only)
//   BRANCH      — github.ref_name

// ── Helpers ──────────────────────────────────────────────────────────────────

// Returns process.env[key] or fallback if unset.
function env(key, fallback = '') {
    return process.env[key] ?? fallback;
}

// Wraps fetch with an AbortController timeout; clears the timer whether the request succeeds or throws.
async function fetchWithTimeout(url, options, timeoutMs = 10_000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: ctrl.signal });
    } finally {
        clearTimeout(t);
    }
}

// ── Resolve mention for failure thread ───────────────────────────────────────

// Reads slack-id-map.json from the scripts directory; returns {} on any error.
function loadSlackIdMap() {
    try {
        const mapPath = path.join(__dirname, 'slack-id-map.json');
        return JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    } catch {
        return {};
    }
}

// Resolves the Slack mention for the failure thread; returns null if no mention should be posted.
async function resolveMention(notify, moduleName, actor) {
    if (notify === 'skip') return null;

    const map = loadSlackIdMap();

    if (notify === 'self') {
        const userId = map.users?.[actor];
        if (userId) return `<@${userId}>`;
        const fallbackId = map.fallback?.id;
        console.warn(
            `⚠️ No Slack ID found for GitHub actor "${actor}" — falling back to ${map.fallback?.name ?? 'default'}`
        );
        return fallbackId ? `<!subteam^${fallbackId}>` : null;
    }

    if (notify && map.notify_teams?.[notify]) return `<!subteam^${map.notify_teams[notify]}>`;

    // Cron / no notify input — fall back to module-based subteam
    const subteamId = map.module_teams?.[moduleName];
    return subteamId ? `<!subteam^${subteamId}>` : null;
}

// ── Fetch stats from TestDino ─────────────────────────────────────────────────

const PROJECT_RE = /^project_[a-zA-Z0-9_-]+$/;
const RUN_RE = /^test_run_[a-zA-Z0-9_-]+$/;

// Fetches test run data from the TestDino API; returns null if env vars are missing, IDs are invalid, or the API errors.
async function fetchTestDinoRun() {
    const runId = env('TESTDINO_RUN_ID');
    const token = env('TESTDINO_ACCESS_TOKEN');
    const projectId = env('TESTDINO_PROJECT_ID');

    if (!runId || !token || !projectId) return null;

    if (!PROJECT_RE.test(projectId) || !RUN_RE.test(runId)) {
        console.warn('⚠️ Invalid TESTDINO_PROJECT_ID or TESTDINO_RUN_ID — skipping TestDino fetch.');
        return null;
    }

    try {
        const res = await fetchWithTimeout(
            `https://api.testdino.com/api/public/v1/${projectId}/test-runs/${runId}?include=errors,specs`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) {
            console.warn(`⚠️ TestDino API returned HTTP ${res.status}`);
            return null;
        }
        const json = await res.json();
        return json?.data ?? null;
    } catch (err) {
        console.warn(`⚠️ Failed to fetch TestDino run: ${err.message}`);
        return null;
    }
}

// Extracts stats from a TestDino run data object; returns null if total is 0.
function extractStats(data) {
    const stats = data?.testStats;
    if (!stats) return null;
    const result = {
        total: stats.total ?? 0,
        passed: stats.passed ?? 0,
        failed: stats.failed ?? 0,
        flaky: stats.flaky ?? 0,
        skipped: stats.skipped ?? 0,
        timedOut: stats.timedOut ?? 0,
    };
    if (result.total === 0) return null;
    return result;
}

// Extracts failed test case titles from a TestDino run data object.
function extractFailedTests(data) {
    const failedCases = [];
    const seen = new Set();
    for (const spec of data?.specs ?? []) {
        for (const tc of spec.testCases ?? []) {
            if (tc.status !== 'failed') continue;
            const key = tc.id || tc.fullTitle;
            if (seen.has(key)) continue;
            seen.add(key);
            failedCases.push({ id: tc.id, title: tc.title ?? tc.fullTitle ?? 'Unknown test' });
        }
    }
    return failedCases;
}

// ── Build Slack payload ───────────────────────────────────────────────────────

// Builds the Slack chat.postMessage Block Kit payload; omits the actions block when buttons is empty.
function buildPayload({ channel, title, stats, buttons, context, color }) {
    let statsText;
    let contextPrefix;

    if (stats) {
        const { total, passed, failed, flaky, skipped, timedOut } = stats;
        statsText = `:white_check_mark:  Passed: ${passed}  ·  :x:  Failed: ${failed}`;
        if (flaky > 0) statsText += `  ·  :cyclone:  Flaky: ${flaky}`;
        if (skipped > 0) statsText += `  ·  :fast_forward:  Skipped: ${skipped}`;
        if (timedOut > 0) statsText += `  ·  :hourglass_flowing_sand:  Timed out: ${timedOut}`;
        contextPrefix = `Total: ${total}  ·  `;
    } else {
        statsText = `⚠️ Stats unavailable — TestDino did not return results for this run.`;
        contextPrefix = '';
    }

    const repo = env('GITHUB_REPOSITORY');
    const contextText = `${contextPrefix}Triggered by: ${context.triggeredBy} on ${context.branch} branch${repo ? `  ·  Project: ${repo}` : ''}`;

    return {
        channel,
        attachments: [
            {
                color,
                blocks: [
                    { type: 'header', text: { type: 'plain_text', text: title } },
                    { type: 'section', text: { type: 'mrkdwn', text: statsText } },
                    ...(buttons.length > 0 ? [{ type: 'actions', elements: buttons }] : []),
                    { type: 'context', elements: [{ type: 'plain_text', text: contextText }] },
                ],
            },
        ],
    };
}

// ── Main ──────────────────────────────────────────────────────────────────────

// Posts the Slack notification, adds a :tada: reaction on all-pass, or threads a mention on failure.
async function main() {
    const token = env('SLACK_OAUTH_TOKEN');
    const channel = env('SLACK_CHANNEL_ID');

    if (!token || !channel) {
        console.warn('⚠️ SLACK_OAUTH_TOKEN or SLACK_CHANNEL_ID not set — skipping notification.');
        process.exit(0);
    }

    const testEnv = env('TEST_ENV', 'staging');
    const testSuite = env('TEST_SUITE', 'smoke');
    const platform = env('PLATFORM', 'all');
    const moduleName = env('MODULE', 'all');
    const eventName = env('EVENT_NAME');
    const actor = env('ACTOR');
    const notify = env('NOTIFY');
    const branch = env('BRANCH');
    const githubRunUrl = env('GITHUB_RUN_URL');
    const testdinoRunUrl = env('TESTDINO_RUN_URL');

    const isHttpsUrl = url => {
        try {
            return new URL(url).protocol === 'https:';
        } catch {
            return false;
        }
    };
    if (githubRunUrl && !isHttpsUrl(githubRunUrl))
        console.warn('⚠️ GITHUB_RUN_URL is not a valid https URL — button will be omitted.');
    if (testdinoRunUrl && !isHttpsUrl(testdinoRunUrl))
        console.warn('⚠️ TESTDINO_RUN_URL is not a valid https URL — button will be omitted.');

    if (notify === 'skip') {
        console.log('ℹ️ notify=skip — skipping Slack notification.');
        process.exit(0);
    }

    const triggeredBy = eventName === 'schedule' ? 'Scheduled' : actor;
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    const title = `:playwright:  Playwright Test Results (${cap(testEnv)} · ${cap(testSuite)} · ${cap(platform)}${moduleName !== 'all' ? ` · ${cap(moduleName)}` : ''})`;

    const runData = await fetchTestDinoRun();
    const stats = extractStats(runData);
    const hasIssues = stats !== null && (stats.failed > 0 || stats.timedOut > 0);
    const color = stats === null ? '#ecb22e' : !hasIssues ? '#2eb886' : '#e01e5a';

    const buttons = [];
    if (testdinoRunUrl && isHttpsUrl(testdinoRunUrl)) {
        buttons.push({
            type: 'button',
            text: { type: 'plain_text', text: ':testdino:  View TestDino' },
            style: 'primary',
            url: testdinoRunUrl,
        });
    }
    if (githubRunUrl && isHttpsUrl(githubRunUrl)) {
        buttons.push({
            type: 'button',
            text: { type: 'plain_text', text: ':github_logo:  View GitHub' },
            url: githubRunUrl,
        });
    }

    const payload = buildPayload({
        channel,
        title,
        stats,
        buttons,
        context: { triggeredBy, branch },
        color,
    });

    console.log(`Sending Slack notification to channel ${channel}...`);

    const res = await fetchWithTimeout('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        console.log(`::warning::Slack notification failed — HTTP ${res.status}`);
        process.exit(0);
    }

    const json = await res.json();
    if (!json.ok) {
        console.log(`::warning::Slack notification failed — ${json.error ?? 'unknown'}`);
        return;
    }

    console.log('✅ Slack notification sent successfully.');

    const ts = json.ts;

    if (stats && !hasIssues) {
        try {
            const reactionRes = await fetchWithTimeout('https://slack.com/api/reactions.add', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ channel, timestamp: ts, name: 'tada' }),
            });
            if (!reactionRes.ok) {
                console.log(`::warning::Slack reaction failed — HTTP ${reactionRes.status}`);
            } else {
                const reactionJson = await reactionRes.json();
                if (!reactionJson.ok)
                    console.log(`::warning::Slack reaction failed — ${reactionJson.error ?? 'unknown'}`);
            }
        } catch (err) {
            console.log(`::warning::Slack reaction failed — ${err.message}`);
        }
    }

    if (hasIssues) {
        const failedTests = extractFailedTests(runData);
        if (failedTests.length > 0) {
            const MAX = 10;
            const runUrl = testdinoRunUrl ? testdinoRunUrl.replace(/\/+$/, '') : '';
            const displayed = failedTests.slice(0, MAX);
            const lines = displayed.map(tc => {
                const link = runUrl && tc.id ? `<${runUrl}/${encodeURIComponent(tc.id)}|${tc.title}>` : tc.title;
                return `• ${link}`;
            });
            if (failedTests.length > MAX) {
                lines.push(`_...and ${failedTests.length - MAX} more. <${testdinoRunUrl || ''}|See full report>_`);
            }
            const failuresText = `:x:  *Failed Tests (${failedTests.length})*\n${lines.join('\n')}`;
            try {
                const failuresRes = await fetchWithTimeout('https://slack.com/api/chat.postMessage', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        channel,
                        thread_ts: ts,
                        text: failuresText,
                        unfurl_links: false,
                        unfurl_media: false,
                    }),
                });
                if (!failuresRes.ok) {
                    console.log(`::warning::Slack failures thread failed — HTTP ${failuresRes.status}`);
                } else {
                    const failuresJson = await failuresRes.json();
                    if (!failuresJson.ok)
                        console.log(`::warning::Slack failures thread failed — ${failuresJson.error ?? 'unknown'}`);
                }
            } catch (err) {
                console.log(`::warning::Slack failures thread failed — ${err.message}`);
            }
        }

        const mention = await resolveMention(notify, moduleName, actor);
        if (mention !== null) {
            try {
                const threadRes = await fetchWithTimeout('https://slack.com/api/chat.postMessage', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        channel,
                        thread_ts: ts,
                        text: `:firefighter:  Failures detected - ${mention} please investigate!`,
                    }),
                });
                if (!threadRes.ok) {
                    console.log(`::warning::Slack thread reply failed — HTTP ${threadRes.status}`);
                } else {
                    const threadJson = await threadRes.json();
                    if (!threadJson.ok)
                        console.log(`::warning::Slack thread reply failed — ${threadJson.error ?? 'unknown'}`);
                }
            } catch (err) {
                console.log(`::warning::Slack thread reply failed — ${err.message}`);
            }
        }
    }
}

main().catch(err => {
    console.log(`::warning::Slack notification failed — ${err.message}`);
    process.exit(0);
});
