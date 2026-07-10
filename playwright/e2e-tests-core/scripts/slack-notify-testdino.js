#!/usr/bin/env node
// Requires: Node.js 18+  (uses built-in fetch)
const fs = require('fs');
const path = require('path');

// Two modes controlled by MODE env var:
//
//   MODE=collect  — fetch TestDino stats and write a result JSON artifact.
//                   Called once per matrix platform job.
//
//   MODE=notify   — read all _result-*.json artifacts from RESULTS_DIR,
//                   then send one Slack message (single platform) or a
//                   summary + per-platform failure threads (multi-platform).
//                   Called once from the aggregated notify job.
//
// ── collect env vars ─────────────────────────────────────────────────────────
//   RESULT_OUTPUT_PATH    — path to write the result JSON
//   TESTDINO_RUN_ID       — TestDino run ID
//   TESTDINO_RUN_URL      — TestDino run URL
//   TESTDINO_ACCESS_TOKEN — TestDino read-only token
//   TESTDINO_PROJECT_ID   — TestDino project ID
//   TEST_ENV / TEST_SUITE / PLATFORM / MODULE / EVENT_NAME / ACTOR / NOTIFY / BRANCH / GITHUB_RUN_URL
//
// ── notify env vars ──────────────────────────────────────────────────────────
//   SLACK_OAUTH_TOKEN          — Slack Bot OAuth token
//   SLACK_CHANNEL_ID           — Target Slack channel ID
//   RESULTS_DIR                — Directory containing _result-*.json files
//   GITHUB_RUN_URL             — GitHub Actions run URL
//   SLACK_THREAD_METADATA_PATH — Optional path to write parent thread metadata JSON

// ── Helpers ──────────────────────────────────────────────────────────────────

function env(key, fallback = '') {
    return process.env[key] ?? fallback;
}

async function fetchWithTimeout(url, options, timeoutMs = 10_000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: ctrl.signal });
    } finally {
        clearTimeout(t);
    }
}

function writeJsonFile(filePath, data) {
    if (!filePath) return;
    const resolved = path.resolve(filePath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, `${JSON.stringify(data, null, 2)}\n`);
}

function githubRunIdFromUrl(value) {
    const match = String(value || '').match(/\/actions\/runs\/(\d+)/);
    return match ? match[1] : null;
}

const isHttpsUrl = url => {
    try {
        return new URL(url).protocol === 'https:';
    } catch {
        return false;
    }
};

// ── Slack ID map ──────────────────────────────────────────────────────────────

function loadSlackIdMap() {
    try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, 'slack-id-map.json'), 'utf8'));
    } catch {
        return {};
    }
}

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
    const subteamId = map.module_teams?.[moduleName];
    return subteamId ? `<!subteam^${subteamId}>` : null;
}

// ── TestDino ──────────────────────────────────────────────────────────────────

const PROJECT_RE = /^project_[a-zA-Z0-9_-]+$/;
const RUN_RE = /^test_run_[a-zA-Z0-9_-]+$/;

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

function extractStats(data) {
    const s = data?.testStats;
    if (!s) return null;
    const result = {
        total: s.total ?? 0,
        passed: s.passed ?? 0,
        failed: s.failed ?? 0,
        flaky: s.flaky ?? 0,
        skipped: s.skipped ?? 0,
        timedOut: s.timedOut ?? 0,
    };
    return result.total === 0 ? null : result;
}

function extractFailedTests(data) {
    const out = [];
    const seen = new Set();
    for (const spec of data?.specs ?? []) {
        for (const tc of spec.testCases ?? []) {
            if (tc.status !== 'failed') continue;
            const key = tc.id || tc.fullTitle;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ id: tc.id, title: tc.title ?? tc.fullTitle ?? 'Unknown test' });
        }
    }
    return out;
}

// ── Slack helpers ─────────────────────────────────────────────────────────────

async function postMessage(token, payload) {
    const res = await fetchWithTimeout('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error ?? 'unknown Slack error');
    return json;
}

async function fetchSlackPermalink({ token, channel, messageTs }) {
    if (!messageTs) return null;
    const url = new URL('https://slack.com/api/chat.getPermalink');
    url.searchParams.set('channel', channel);
    url.searchParams.set('message_ts', messageTs);
    try {
        const res = await fetchWithTimeout(url, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return null;
        const json = await res.json();
        return json.ok ? json.permalink || null : null;
    } catch {
        return null;
    }
}

function hasIssues(stats) {
    return stats !== null && (stats.failed > 0 || stats.timedOut > 0);
}

function colorFor(stats) {
    if (!stats) return '#ecb22e';
    return hasIssues(stats) ? '#e01e5a' : '#2eb886';
}

function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

const PLATFORM_EMOJI = {
    chromium: ':chrome_browser:',
    'chromium-mobile': ':chrome_browser:',
    firefox: ':firefox-1:',
    webkit: ':safari:',
    'webkit-mobile': ':safari:',
};

function formatPlatform(s) {
    return s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function platformLabel(s) {
    const emoji = PLATFORM_EMOJI[s.toLowerCase()] ?? '';
    return emoji ? `${emoji} *${formatPlatform(s)}*` : `*${formatPlatform(s)}*`;
}

function buildStatsText(stats) {
    if (!stats) return '⚠️ Stats unavailable — TestDino did not return results for this run.';
    const { passed, failed, flaky, skipped, timedOut } = stats;
    let text = `:white_check_mark:  Passed: ${passed}`;
    if (failed > 0) text += `  ·  :x:  Failed: ${failed}`;
    if (flaky > 0) text += `  ·  :cyclone:  Flaky: ${flaky}`;
    if (skipped > 0) text += `  ·  :fast_forward:  Skipped: ${skipped}`;
    if (timedOut > 0) text += `  ·  :hourglass_flowing_sand:  Timed out: ${timedOut}`;
    return text;
}

function buildPerPlatformStatsText(results) {
    const fmt = r => {
        const s = r.stats;
        const icon = !s ? ':warning:' : hasIssues(s) ? ':x:' : ':white_check_mark:';
        const fraction = s ? `${s.passed}/${s.total}` : '?/?';
        return `${icon} *${formatPlatform(r.platform)}:* ${fraction}`;
    };
    const desktop = results.filter(r => !r.platform.includes('mobile')).map(fmt);
    const mobile = results.filter(r => r.platform.includes('mobile')).map(fmt);
    return [desktop.join('   |   '), mobile.join('   |   ')].filter(Boolean).join('\n');
}

function buildMainPayload({ channel, title, stats, buttons, contextText, color }) {
    return {
        channel,
        attachments: [
            {
                color,
                blocks: [
                    { type: 'header', text: { type: 'plain_text', text: title } },
                    { type: 'section', text: { type: 'mrkdwn', text: buildStatsText(stats) } },
                    ...(buttons.length > 0 ? [{ type: 'actions', elements: buttons }] : []),
                    { type: 'context', elements: [{ type: 'plain_text', text: contextText }] },
                ],
            },
        ],
    };
}

function buildButtons(githubRunUrl, testdinoRunUrl) {
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
    return buttons;
}

function buildFailuresText(failedTests, testdinoRunUrl) {
    const MAX = 10;
    const runUrl = testdinoRunUrl ? testdinoRunUrl.replace(/\/+$/, '') : '';
    const lines = failedTests.slice(0, MAX).map(tc => {
        const link = runUrl && tc.id ? `<${runUrl}/${encodeURIComponent(tc.id)}|${tc.title}>` : tc.title;
        return `• ${link}`;
    });
    if (failedTests.length > MAX)
        lines.push(`_...and ${failedTests.length - MAX} more. <${testdinoRunUrl || ''}|See full report>_`);
    return lines.join('\n');
}

async function addReaction(token, channel, ts) {
    try {
        await fetchWithTimeout('https://slack.com/api/reactions.add', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel, timestamp: ts, name: 'tada' }),
        });
    } catch (err) {
        console.log(`::warning::Slack reaction failed — ${err.message}`);
    }
}

// ── MODE=collect ──────────────────────────────────────────────────────────────

async function runCollect() {
    const outputPath = env('RESULT_OUTPUT_PATH');
    if (!outputPath) {
        console.warn('⚠️ RESULT_OUTPUT_PATH not set — skipping result artifact write.');
        return;
    }

    const runData = await fetchTestDinoRun();
    if (!runData)
        console.warn('⚠️ TestDino run data unavailable — result artifact will have no stats or failed tests.');
    const result = {
        schemaVersion: 1,
        platform: env('PLATFORM', 'unknown'),
        testEnv: env('TEST_ENV', 'staging'),
        testSuite: env('TEST_SUITE', 'smoke'),
        module: env('MODULE', 'all'),
        eventName: env('EVENT_NAME'),
        actor: env('ACTOR'),
        notify: env('NOTIFY'),
        branch: env('BRANCH'),
        githubRunUrl: env('GITHUB_RUN_URL') || null,
        testdinoRunId: env('TESTDINO_RUN_ID') || null,
        testdinoRunUrl: env('TESTDINO_RUN_URL') || null,
        stats: extractStats(runData),
        failedTests: runData ? extractFailedTests(runData) : [],
        createdAt: new Date().toISOString(),
    };

    writeJsonFile(outputPath, result);
    console.log(`✅ Result artifact written to ${outputPath}`);
}

// ── MODE=notify ───────────────────────────────────────────────────────────────

function loadResults(resultsDir) {
    if (!fs.existsSync(resultsDir)) return [];
    return fs
        .readdirSync(resultsDir)
        .filter(f => f.startsWith('_result-') && f.endsWith('.json'))
        .map(f => {
            try {
                return JSON.parse(fs.readFileSync(path.join(resultsDir, f), 'utf8'));
            } catch {
                return null;
            }
        })
        .filter(Boolean);
}

function aggregateStats(results) {
    const withStats = results.filter(r => r.stats !== null);
    if (withStats.length === 0) return null;
    return withStats.reduce(
        (acc, r) => ({
            total: acc.total + r.stats.total,
            passed: acc.passed + r.stats.passed,
            failed: acc.failed + r.stats.failed,
            flaky: acc.flaky + r.stats.flaky,
            skipped: acc.skipped + r.stats.skipped,
            timedOut: acc.timedOut + r.stats.timedOut,
        }),
        { total: 0, passed: 0, failed: 0, flaky: 0, skipped: 0, timedOut: 0 }
    );
}

async function runSingleNotify({ token, channel, result, githubRunUrl, slackThreadMetadataPath }) {
    const {
        platform,
        testEnv,
        testSuite,
        module: moduleName,
        eventName,
        actor,
        notify,
        branch,
        stats,
        failedTests = [],
        testdinoRunUrl,
    } = result;
    const triggeredBy = eventName === 'schedule' ? 'Scheduled' : actor;
    const repo = env('GITHUB_REPOSITORY');

    const title = `:playwright:  Playwright Test Results (${cap(testEnv)} · ${cap(testSuite)} · ${cap(platform)}${moduleName !== 'all' ? ` · ${cap(moduleName)}` : ''})`;
    const contextText = `${stats ? `Total: ${stats.total}  ·  ` : ''}Triggered by: ${triggeredBy} on ${branch} branch${repo ? `  ·  Project: ${repo}` : ''}`;
    const payload = buildMainPayload({
        channel,
        title,
        stats,
        buttons: buildButtons(githubRunUrl, testdinoRunUrl),
        contextText,
        color: colorFor(stats),
    });

    console.log(`Sending single-platform Slack notification to channel ${channel}...`);
    const json = await postMessage(token, payload);
    const ts = json.ts;
    console.log('✅ Slack notification sent.');

    const slackPermalink = await fetchSlackPermalink({ token, channel, messageTs: ts });

    if (stats && !hasIssues(stats)) {
        await addReaction(token, channel, ts);
    }

    if (hasIssues(stats)) {
        writeJsonFile(slackThreadMetadataPath, {
            schemaVersion: 1,
            channel,
            threadTs: ts,
            messageTs: ts,
            permalink: slackPermalink,
            testdinoRunId: result.testdinoRunId || null,
            testdinoRunUrl: testdinoRunUrl || null,
            githubRunId: githubRunIdFromUrl(githubRunUrl),
            githubRunUrl: githubRunUrl || null,
            testEnv,
            testSuite,
            platform,
            module: moduleName,
            branch,
            failedTests,
            createdAt: new Date().toISOString(),
        });

        if (failedTests.length > 0) {
            try {
                await postMessage(token, {
                    channel,
                    thread_ts: ts,
                    text: buildFailuresText(failedTests, testdinoRunUrl),
                    unfurl_links: false,
                    unfurl_media: false,
                });
            } catch (err) {
                console.log(`::warning::Slack failures thread failed — ${err.message}`);
            }
        }

        const mention = await resolveMention(notify, moduleName, actor);
        if (mention !== null) {
            try {
                await postMessage(token, {
                    channel,
                    thread_ts: ts,
                    text: `:firefighter:  Failures detected - ${mention} please investigate!`,
                });
            } catch (err) {
                console.log(`::warning::Slack mention thread failed — ${err.message}`);
            }
        }
    }
}

async function runMultiNotify({ token, channel, results, githubRunUrl, slackThreadMetadataPath }) {
    const { testEnv, testSuite, module: moduleName, eventName, actor, notify, branch } = results[0];
    const aggregated = aggregateStats(results);
    const triggeredBy = eventName === 'schedule' ? 'Scheduled' : actor;
    const repo = env('GITHUB_REPOSITORY');

    const title = `:playwright:  Playwright Test Results (${cap(testEnv)} · ${cap(testSuite)} · ${results.length} platforms${moduleName !== 'all' ? ` · ${cap(moduleName)}` : ''})`;
    const contextText = `Triggered by: ${triggeredBy} on ${branch} branch${repo ? `  ·  Project: ${repo}` : ''}`;
    const perPlatformText = buildPerPlatformStatsText(results);

    // GitHub button only in summary — per-platform TestDino links go in threads
    const summaryButtons = buildButtons(githubRunUrl, null);
    const payload = {
        channel,
        attachments: [
            {
                color: colorFor(aggregated),
                blocks: [
                    { type: 'header', text: { type: 'plain_text', text: title } },
                    { type: 'section', text: { type: 'mrkdwn', text: perPlatformText } },
                    ...(summaryButtons.length > 0 ? [{ type: 'actions', elements: summaryButtons }] : []),
                    { type: 'context', elements: [{ type: 'plain_text', text: contextText }] },
                ],
            },
        ],
    };

    console.log(`Sending multi-platform summary Slack notification to channel ${channel}...`);
    const json = await postMessage(token, payload);
    const ts = json.ts;
    console.log('✅ Summary Slack notification sent.');

    const slackPermalink = await fetchSlackPermalink({ token, channel, messageTs: ts });

    if (aggregated && !hasIssues(aggregated)) {
        await addReaction(token, channel, ts);
    }

    // One thread reply per failing platform
    for (const result of results.filter(r => hasIssues(r.stats))) {
        const { platform, failedTests = [], testdinoRunUrl, stats } = result;
        if (failedTests.length === 0) continue;

        const statsLine = stats ? buildStatsText(stats) : 'Stats unavailable';
        const failuresBody = buildFailuresText(failedTests, testdinoRunUrl);
        const threadButtons = buildButtons(null, testdinoRunUrl);
        const threadPayload = {
            channel,
            thread_ts: ts,
            unfurl_links: false,
            unfurl_media: false,
            text: `${platformLabel(platform)}\n${statsLine}`,
            blocks: [
                { type: 'section', text: { type: 'mrkdwn', text: platformLabel(platform) } },
                { type: 'divider' },
                { type: 'section', text: { type: 'mrkdwn', text: `${statsLine}\n\n${failuresBody}` } },
                ...(threadButtons.length > 0 ? [{ type: 'actions', elements: threadButtons }] : []),
            ],
        };

        try {
            await postMessage(token, threadPayload);
        } catch (err) {
            console.log(`::warning::Slack thread reply for ${platform} failed — ${err.message}`);
        }
    }

    if (hasIssues(aggregated)) {
        writeJsonFile(slackThreadMetadataPath, {
            schemaVersion: 1,
            channel,
            threadTs: ts,
            messageTs: ts,
            permalink: slackPermalink,
            githubRunId: githubRunIdFromUrl(githubRunUrl),
            githubRunUrl: githubRunUrl || null,
            testEnv,
            testSuite,
            module: moduleName,
            branch,
            platforms: results.map(r => r.platform),
            createdAt: new Date().toISOString(),
        });

        const mention = await resolveMention(notify, moduleName, actor);
        if (mention !== null) {
            try {
                await postMessage(token, {
                    channel,
                    thread_ts: ts,
                    text: `:firefighter:  Failures detected - ${mention} please investigate!`,
                });
            } catch (err) {
                console.log(`::warning::Slack mention thread failed — ${err.message}`);
            }
        }
    }
}

async function runNotify() {
    const token = env('SLACK_OAUTH_TOKEN');
    const channel = env('SLACK_CHANNEL_ID');
    const githubRunUrl = env('GITHUB_RUN_URL');
    const slackThreadMetadataPath = env('SLACK_THREAD_METADATA_PATH');

    if (!token || !channel) {
        console.warn('⚠️ SLACK_OAUTH_TOKEN or SLACK_CHANNEL_ID not set — skipping notification.');
        return;
    }

    const resultsDir = env('RESULTS_DIR');
    let results;

    if (resultsDir) {
        // New multi-platform path: load artifacts written by collect mode
        results = loadResults(resultsDir);
        if (results.length === 0) {
            console.warn('⚠️ No result artifacts found — sending fallback Slack notification.');
            const githubRunUrl = env('GITHUB_RUN_URL');
            const fallbackBlocks = [
                { type: 'header', text: { type: 'plain_text', text: ':warning:  Playwright — Results Unavailable' } },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: 'No test result artifacts were collected. All matrix jobs may have crashed or been cancelled before uploading results.',
                    },
                },
                ...(githubRunUrl && isHttpsUrl(githubRunUrl)
                    ? [
                          {
                              type: 'actions',
                              elements: [
                                  {
                                      type: 'button',
                                      text: { type: 'plain_text', text: ':github_logo:  View GitHub' },
                                      url: githubRunUrl,
                                  },
                              ],
                          },
                      ]
                    : []),
            ];
            await postMessage(token, { channel, attachments: [{ color: '#FF0000', blocks: fallbackBlocks }] });
            return;
        }
    } else {
        // Legacy path: build a single result inline from env vars (backward compatibility)
        const notify = env('NOTIFY');
        if (notify === 'skip') {
            console.log('ℹ️ notify=skip — skipping Slack notification.');
            return;
        }
        const runData = await fetchTestDinoRun();
        results = [
            {
                schemaVersion: 1,
                platform: env('PLATFORM', 'all'),
                testEnv: env('TEST_ENV', 'staging'),
                testSuite: env('TEST_SUITE', 'smoke'),
                module: env('MODULE', 'all'),
                eventName: env('EVENT_NAME'),
                actor: env('ACTOR'),
                notify,
                branch: env('BRANCH'),
                githubRunUrl: githubRunUrl || null,
                testdinoRunId: env('TESTDINO_RUN_ID') || null,
                testdinoRunUrl: env('TESTDINO_RUN_URL') || null,
                stats: extractStats(runData),
                failedTests: runData ? extractFailedTests(runData) : [],
            },
        ];
    }

    if (results[0].notify === 'skip') {
        console.log('ℹ️ notify=skip — skipping Slack notification.');
        return;
    }

    if (results.length === 1) {
        await runSingleNotify({ token, channel, result: results[0], githubRunUrl, slackThreadMetadataPath });
    } else {
        await runMultiNotify({ token, channel, results, githubRunUrl, slackThreadMetadataPath });
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    const mode = env('MODE', 'notify');
    if (mode === 'collect') {
        await runCollect();
    } else if (mode === 'notify') {
        await runNotify();
    } else {
        console.warn(`⚠️ Unknown MODE="${mode}" — expected "collect" or "notify".`);
    }
}

main().catch(err => {
    console.log(`::warning::slack-notify-testdino failed — ${err.message}`);
    process.exit(0);
});
