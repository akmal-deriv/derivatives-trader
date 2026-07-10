#!/usr/bin/env node
/**
 * Publish a TestDino test-run summary to $GITHUB_STEP_SUMMARY.
 *
 * Required env vars (set per-repo via GitHub Actions variables):
 *   TESTDINO_ACCESS_TOKEN  Read-only Project PAT (`tdp_…`, scope: public-api). Secret.
 *   TESTDINO_PROJECT_ID    e.g. project_xxxxxxxxxxxx. Repo variable.
 *   TESTDINO_ORG_ID        e.g. org_xxxxxxxxxxxx. Repo variable.
 *   TESTDINO_RUN_ID        e.g. test_run_xxxxxxxxxxxx
 *                          (set by the upstream `tdpw upload` step)
 *
 * Optional env vars:
 *   TESTDINO_RUN_URL       Full UI URL of the run (used as link target).
 *                          Falls back to the project test-runs index.
 *   GITHUB_STEP_SUMMARY    Path to the summary file. If unset, output goes to stdout.
 *
 * Behaviour:
 *   - Always writes the "View TestDino Report" link.
 *   - Fetches run stats via the public API and renders a stats table.
 *   - If failed > 0, renders a Failed Tests table with deep links per case.
 *   - On any API/auth/network failure the script exits 0 with a fallback note —
 *     it must never fail the calling workflow job.
 *
 * Requires: Node 18+ (built-in `fetch`).
 */

const fs = require('node:fs');

const {
    TESTDINO_ACCESS_TOKEN,
    TESTDINO_PROJECT_ID,
    TESTDINO_RUN_ID,
    TESTDINO_RUN_URL,
    TESTDINO_ORG_ID,
    GITHUB_STEP_SUMMARY,
} = process.env;

const PROJECT_RE = /^project_[a-zA-Z0-9_-]+$/;
const RUN_RE = /^test_run_[a-zA-Z0-9_-]+$/;
const ORG_RE = /^org_[a-zA-Z0-9_-]+$/;

// Validate that the URL parses and uses http(s) so a malformed env var can't break out of Markdown link syntax.
const isSafeUrl = u => {
    try {
        return ['https:', 'http:'].includes(new URL(u).protocol);
    } catch {
        return false;
    }
};

const fallbackUrl =
    ORG_RE.test(TESTDINO_ORG_ID ?? '') && PROJECT_RE.test(TESTDINO_PROJECT_ID ?? '')
        ? `https://app.testdino.com/${TESTDINO_ORG_ID}/projects/${TESTDINO_PROJECT_ID}/test-runs`
        : 'https://app.testdino.com';
const linkUrl = isSafeUrl(TESTDINO_RUN_URL) ? TESTDINO_RUN_URL : fallbackUrl;

const lines = [];
const write = line => lines.push(line);
const flush = () => {
    const out = lines.join('\n') + '\n';
    if (GITHUB_STEP_SUMMARY) fs.appendFileSync(GITHUB_STEP_SUMMARY, out);
    else process.stdout.write(out);
};

const formatDuration = ms => {
    const total = Number(ms) / 1000;
    if (!Number.isFinite(total) || total <= 0) return '0s';
    const m = Math.floor(total / 60);
    const s = total - m * 60;
    return m > 0 ? `${m}m ${Math.round(s)}s` : `${s.toFixed(1)}s`;
};

// Escape Markdown-sensitive characters from API-supplied text to prevent link/HTML injection in table cells.
const sanitizeMd = text =>
    String(text ?? '')
        .replace(/\r?\n/g, ' ')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/[|\[\]()`]/g, '\\$&');

const main = async () => {
    write(`### 🚀 [View TestDino Report](${linkUrl})`);
    write('');

    if (!TESTDINO_ACCESS_TOKEN || !TESTDINO_PROJECT_ID) {
        write('_TestDino summary unavailable (missing token or project ID)._');
        return;
    }

    if (!TESTDINO_RUN_ID) {
        write(
            '_TestDino summary unavailable — no run ID was produced. This usually means the `tdpw upload` step was skipped or failed (e.g. browser install failure, no test report generated)._'
        );
        return;
    }

    if (!PROJECT_RE.test(TESTDINO_PROJECT_ID) || !RUN_RE.test(TESTDINO_RUN_ID)) {
        write('_TestDino summary unavailable (invalid project/run ID format)._');
        return;
    }

    const api = `https://api.testdino.com/api/public/v1/${TESTDINO_PROJECT_ID}/test-runs/${TESTDINO_RUN_ID}?include=errors,specs`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    let res;
    let body;
    try {
        res = await fetch(api, {
            headers: { Authorization: `Bearer ${TESTDINO_ACCESS_TOKEN}` },
            signal: controller.signal,
        });
        body = await res.json().catch(() => null);
    } catch (err) {
        const msg = err.name === 'AbortError' ? 'request timed out' : sanitizeMd(err.message);
        write(`_Could not fetch TestDino run details from API (network error: ${msg})._`);
        return;
    } finally {
        clearTimeout(timer);
    }

    if (!res.ok || !body?.success) {
        const code = res?.status ?? '000';
        const msg = sanitizeMd(body?.error?.message ?? body?.error?.code ?? 'unknown error');
        write(`_Could not fetch TestDino run details from API (HTTP ${code}: ${msg})._`);
        return;
    }

    const data = body.data ?? {};
    const stats = data.testStats ?? {};
    const total = stats.total ?? 0;
    const passed = stats.passed ?? 0;
    const failed = stats.failed ?? 0;
    const flaky = stats.flaky ?? 0;
    const skipped = stats.skipped ?? 0;
    const timedOut = stats.timedOut ?? 0;
    const duration = formatDuration(data.duration ?? 0);

    write('#### Test Results Summary');
    write('');
    write('| Total 🧪 | Passed ✅ | Failed ❌ | Flaky 🌀 | Skipped ⏭️ | Timed out ⏱️ | Duration ⏳ |');
    write('|---|---|---|---|---|---|---|');
    write(`| ${total} | ${passed} | ${failed} | ${flaky} | ${skipped} | ${timedOut} | ${duration} |`);

    if (failed > 0) {
        const runUrl = isSafeUrl(TESTDINO_RUN_URL) ? TESTDINO_RUN_URL.replace(/\/+$/, '') : '';
        const failedCases = [];
        const seen = new Set();
        for (const spec of data.specs ?? []) {
            const specPath = spec.filePath || spec.fileName || spec.name || '';
            for (const tc of spec.testCases ?? []) {
                if (tc.status !== 'failed') continue;
                const key = tc.id || tc.fullTitle;
                if (seen.has(key)) continue;
                seen.add(key);
                failedCases.push({ id: tc.id, title: tc.title, spec: specPath });
            }
        }

        if (failedCases.length > 0) {
            const MAX_ROWS = 100;
            const displayed = failedCases.slice(0, MAX_ROWS);
            write('');
            write('#### Failed Tests ❌');
            write('');
            write('| # | Test | Spec |');
            write('|---|---|---|');
            displayed.forEach((tc, i) => {
                const title = sanitizeMd(tc.title);
                const spec = sanitizeMd(tc.spec);
                const cell = runUrl && tc.id ? `[${title}](${runUrl}/${encodeURIComponent(tc.id)})` : title;
                write(`| ${i + 1} | ${cell} | ${spec} |`);
            });
            if (failedCases.length > MAX_ROWS) {
                write(`| … | _${failedCases.length - MAX_ROWS} more — [see full report](${linkUrl})_ | |`);
            }
        } else {
            write('');
            write(`_Failed test titles unavailable in API response — see [TestDino report](${linkUrl}) for details._`);
        }
    }
};

main()
    .catch(err => {
        write(`_TestDino summary failed: ${sanitizeMd(err?.message ?? String(err))}_`);
    })
    .finally(flush);
