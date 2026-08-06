#!/usr/bin/env node
/**
 * Download selected TestDino artifacts for one test case.
 *
 * Public API: https://docs.testdino.com/api-reference/overview
 * Base path:  {TESTDINO_BASE_URL}/api/v1/public/{projectId}/...
 *
 * Preferred path (fixer): pass authenticated blob URLs from TestDino MCP
 * (`get_testcase_details` with include_artifacts / include_screenshots) via
 * `--urls-json`. The public API often returns only `blobKey` with `url: null`,
 * so MCP URLs are required for actual file downloads.
 *
 * This intentionally avoids general-purpose URL fetching. It downloads only
 * artifact URLs from the allowlisted TestDino blob host.
 */

import fs from "node:fs";
import path from "node:path";
import { once } from "node:events";

const {
  TESTDINO_ACCESS_TOKEN,
  TESTDINO_PROJECT_ID,
  TESTDINO_BASE_URL = "https://api.testdino.com",
  TESTDINO_ARTIFACTS_DIR = "playwright/agent/.healing/artifacts",
} = process.env;

const ALLOWED_HOSTS = new Set(["testdinostr.blob.core.windows.net"]);
const PUBLIC_API_PREFIX = "/api/v1/public";
const DEFAULT_CONTENT_TYPES = new Set(["image/png", "image/jpeg", "text/markdown", "text/plain"]);
const VIDEO_CONTENT_TYPES = new Set(["video/webm", "video/mp4"]);
const TRACE_CONTENT_TYPES = new Set(["application/zip"]);

const usage = () => {
  console.error(`Usage:
  node playwright/e2e-tests-core/agent/scripts/download-testdino-artifacts.mjs --testcase-id <test_case_id> [options]

Options:
  --project-id <project_id>       Defaults to TESTDINO_PROJECT_ID
  --out-dir <path>                Defaults to TESTDINO_ARTIFACTS_DIR/<testcase-id>
  --urls-json <path>              MCP/API artifact URL list (preferred). Skips public API lookup.
  --include-videos                Also download video artifacts
  --include-traces                Also download trace zip artifacts when supported
  --max-bytes <bytes>             Per-artifact download cap, default 25000000

--urls-json accepted shapes:
  [{ "name": "screenshot", "url": "https://testdinostr.blob.core.windows.net/...", "contentType": "image/png" }]
  { "artifacts": [ ... ] }   or   { "urls": [ ... ] }
  full get_testcase_details / public API detail payload (attachments with url fields)
`);
};

const parseArgs = (argv) => {
  const args = {
    testcaseId: "",
    projectId: TESTDINO_PROJECT_ID || "",
    outDir: "",
    urlsJsonPath: "",
    includeVideos: false,
    includeTraces: false,
    maxBytes: 25_000_000,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--testcase-id") args.testcaseId = argv[++i] || "";
    else if (arg === "--project-id") args.projectId = argv[++i] || "";
    else if (arg === "--out-dir") args.outDir = argv[++i] || "";
    else if (arg === "--urls-json") args.urlsJsonPath = argv[++i] || "";
    else if (arg === "--include-videos") args.includeVideos = true;
    else if (arg === "--include-traces") args.includeTraces = true;
    else if (arg === "--max-bytes") args.maxBytes = Number.parseInt(argv[++i] || "", 10);
    else if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.outDir && args.testcaseId) args.outDir = path.join(TESTDINO_ARTIFACTS_DIR, args.testcaseId);
  return args;
};

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const safeName = (value) =>
  String(value || "artifact")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "artifact";

const extensionFor = (contentType, fallbackPath) => {
  if (contentType === "image/png") return ".png";
  if (contentType === "image/jpeg") return ".jpg";
  if (contentType === "text/markdown") return ".md";
  if (contentType === "text/plain") return ".txt";
  if (contentType === "video/webm") return ".webm";
  if (contentType === "video/mp4") return ".mp4";
  if (contentType === "application/zip") return ".zip";
  try {
    const ext = path.extname(new URL(fallbackPath).pathname);
    return ext && ext.length <= 8 ? ext : ".bin";
  } catch {
    return ".bin";
  }
};

const redactedUrl = (value) => {
  const url = new URL(value);
  url.search = "";
  return url.toString();
};

const assertAllowedArtifactUrl = (value) => {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error(`Artifact URL must use https: ${redactedUrl(value)}`);
  if (!ALLOWED_HOSTS.has(url.hostname)) throw new Error(`Artifact host is not allowlisted: ${url.hostname}`);
  return url;
};

const assertInsideDirectory = (baseDir, candidatePath) => {
  const base = path.resolve(baseDir);
  const candidate = path.resolve(candidatePath);
  const relative = path.relative(base, candidate);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) return candidate;
  throw new Error(`Output path must stay within ${base}`);
};

const inferContentType = ({ name, contentType, url }) => {
  const explicit = contentType || null;
  if (explicit && explicit !== "application/octet-stream" && explicit !== "") return explicit;

  const lowerName = String(name || "").toLowerCase();
  let pathname = "";
  try {
    pathname = new URL(url || "").pathname.toLowerCase();
  } catch {
    pathname = String(url || "").toLowerCase();
  }

  if (lowerName.includes("error-context") || pathname.endsWith(".md")) return "text/markdown";
  if (lowerName.includes("screenshot") || pathname.endsWith(".png")) return "image/png";
  if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) return "image/jpeg";
  if (lowerName.includes("video") || pathname.endsWith(".webm")) return "video/webm";
  if (pathname.endsWith(".mp4")) return "video/mp4";
  if (lowerName.includes("trace") || pathname.endsWith(".zip")) return "application/zip";
  if (pathname.endsWith(".txt")) return "text/plain";
  return explicit || "application/octet-stream";
};

const normalizeEntry = (item, defaults = {}) => {
  if (typeof item === "string") {
    return {
      name: defaults.name || "artifact",
      path: item,
      contentType: inferContentType({ name: defaults.name, url: item }),
      attemptNumber: defaults.attemptNumber || 1,
      attemptStatus: defaults.attemptStatus || null,
      source: defaults.source || "urls-json",
      blobKey: null,
    };
  }
  if (!item || typeof item !== "object") return null;
  const rawPath = item.path || item.url || item.href || null;
  const name = item.name || defaults.name || "artifact";
  return {
    ...item,
    name,
    path: rawPath,
    contentType: inferContentType({
      name,
      contentType: item.contentType || item.content_type || item.mimeType || null,
      url: rawPath,
    }),
    attemptNumber: item.attemptNumber || defaults.attemptNumber || 1,
    attemptStatus: item.attemptStatus || defaults.attemptStatus || null,
    source: item.source || defaults.source || "urls-json",
    blobKey: item.blobKey || item.blob_key || null,
  };
};

const requestJson = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${TESTDINO_ACCESS_TOKEN}` },
      signal: controller.signal,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const message = body?.error?.message || body?.message || body?.error?.code || body?.error || res.statusText;
      throw new Error(`HTTP ${res.status}: ${message}`);
    }
    if (body?.success === false) {
      const message = body?.error?.message || body?.message || body?.error?.code || body?.error || "request failed";
      throw new Error(`HTTP ${res.status}: ${message}`);
    }
    if (body?.success === true && "data" in body) return body.data;
    if (Array.isArray(body?.items)) return body.items;
    return body;
  } finally {
    clearTimeout(timer);
  }
};

const pushAttachmentList = (entries, attachments, defaults = {}) => {
  if (!Array.isArray(attachments)) return;
  for (const attachment of attachments) {
    const entry = normalizeEntry(attachment, defaults);
    if (entry) entries.push(entry);
  }
};

const artifactEntries = (detail) => {
  const entries = [];
  const attempts = Array.isArray(detail?.overview?.attempts)
    ? detail.overview.attempts
    : Array.isArray(detail?.attempts)
      ? detail.attempts
      : Array.isArray(detail?.otherAttempts)
        ? detail.otherAttempts
        : [];

  // Context API / MCP may expose assets as an array or as { attachments: [...] }.
  if (Array.isArray(detail?.assets)) {
    pushAttachmentList(entries, detail.assets, {
      attemptNumber: 1,
      attemptStatus: detail.status || null,
      source: "assets",
    });
  } else if (detail?.assets && typeof detail.assets === "object") {
    pushAttachmentList(entries, detail.assets.attachments, {
      attemptNumber: 1,
      attemptStatus: detail.status || null,
      source: "assets.attachments",
    });
  }

  pushAttachmentList(entries, detail?.attachments, {
    attemptNumber: 1,
    attemptStatus: detail.status || null,
    source: "attachments",
  });

  for (const [attemptIndex, attempt] of attempts.entries()) {
    const attemptNumber =
      attempt.retryNumber === undefined && attempt.attempt_index === undefined
        ? attemptIndex + 1
        : Number(attempt.retryNumber ?? attempt.attempt_index) + 1;
    const attachments = Array.isArray(attempt?.attachments)
      ? attempt.attachments
      : Array.isArray(attempt?.assets)
        ? attempt.assets
        : [];
    pushAttachmentList(entries, attachments, {
      attemptNumber,
      attemptStatus: attempt.status || null,
      source: "attempt.attachments",
    });
  }

  return entries;
};

/** Walk arbitrary MCP JSON and collect allowlisted blob URLs not already listed. */
const collectBlobUrlsDeep = (value, found = new Map(), trail = {}) => {
  if (value == null) return found;
  if (typeof value === "string") {
    if (!value.startsWith("https://")) return found;
    try {
      const hostname = new URL(value).hostname;
      if (ALLOWED_HOSTS.has(hostname) && !found.has(value)) {
        found.set(
          value,
          normalizeEntry(value, {
            name: trail.name || "artifact",
            attemptNumber: trail.attemptNumber || 1,
            source: "deep-scan",
          }),
        );
      }
    } catch {
      // ignore non-URL strings
    }
    return found;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectBlobUrlsDeep(item, found, trail);
    return found;
  }
  if (typeof value === "object") {
    const nextTrail = {
      name: value.name || trail.name,
      attemptNumber:
        value.attemptNumber ||
        (value.attempt_index != null ? Number(value.attempt_index) + 1 : trail.attemptNumber),
    };
    for (const child of Object.values(value)) collectBlobUrlsDeep(child, found, nextTrail);
  }
  return found;
};

const entriesFromUrlsJson = (payload) => {
  let listPayload = payload;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    if (Array.isArray(payload.artifacts)) listPayload = payload.artifacts;
    else if (Array.isArray(payload.urls)) listPayload = payload.urls;
    else if (payload.data && typeof payload.data === "object") {
      // MCP / API success envelope
      const nested = entriesFromUrlsJson(payload.data);
      if (nested.length > 0) return nested;
      listPayload = payload.data;
    }
  }

  if (Array.isArray(listPayload)) {
    return listPayload.map((item) => normalizeEntry(item)).filter(Boolean);
  }

  const fromShape = artifactEntries(listPayload);
  if (fromShape.some((entry) => entry.path)) return fromShape;

  // Last resort: any allowlisted blob URL anywhere in the MCP payload.
  const deep = [...collectBlobUrlsDeep(payload).values()];
  return deep.length > 0 ? deep : fromShape;
};

const contentTypesFor = ({ includeVideos, includeTraces }) => {
  const types = new Set(DEFAULT_CONTENT_TYPES);
  if (includeVideos) for (const type of VIDEO_CONTENT_TYPES) types.add(type);
  if (includeTraces) for (const type of TRACE_CONTENT_TYPES) types.add(type);
  return types;
};

const downloadArtifact = async (artifact, outputPath, maxBytes) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  const tempPath = `${outputPath}.tmp-${process.pid}-${Date.now()}`;
  try {
    const res = await fetch(artifact.path, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    if (!res.body) throw new Error("Artifact response did not include a body.");

    const reportedLength = Number(res.headers.get("content-length") || 0);
    if (reportedLength > maxBytes) {
      throw new Error(`Artifact exceeds max size (${reportedLength} > ${maxBytes})`);
    }

    let bytes = 0;
    const output = fs.createWriteStream(tempPath, { flags: "wx" });
    try {
      for await (const chunk of res.body) {
        bytes += chunk.byteLength;
        if (bytes > maxBytes) {
          output.destroy();
          throw new Error(`Artifact exceeds max size (${bytes} > ${maxBytes})`);
        }
        if (!output.write(Buffer.from(chunk))) await once(output, "drain");
      }
      output.end();
      await once(output, "finish");
    } catch (error) {
      output.destroy();
      throw error;
    }

    fs.renameSync(tempPath, outputPath);
    return bytes;
  } finally {
    clearTimeout(timer);
    fs.rmSync(tempPath, { force: true });
  }
};

const loadEntries = async (args) => {
  if (args.urlsJsonPath) {
    const resolved = path.resolve(args.urlsJsonPath);
    if (!fs.existsSync(resolved)) throw new Error(`--urls-json file not found: ${resolved}`);
    const payload = JSON.parse(fs.readFileSync(resolved, "utf8"));
    return {
      detail: payload?.data && typeof payload.data === "object" ? payload.data : payload,
      entries: entriesFromUrlsJson(payload),
      source: "urls-json",
    };
  }

  if (!TESTDINO_ACCESS_TOKEN) fail("Missing TESTDINO_ACCESS_TOKEN (required without --urls-json).");
  if (!TESTDINO_ACCESS_TOKEN.startsWith("td_pat_")) {
    fail("TESTDINO_ACCESS_TOKEN must be a public API PAT with the td_pat_ prefix.");
  }
  if (!args.projectId) fail("Missing --project-id or TESTDINO_PROJECT_ID.");

  const detailUrl = new URL(
    `${PUBLIC_API_PREFIX}/${args.projectId}/test-cases/${encodeURIComponent(args.testcaseId)}`,
    TESTDINO_BASE_URL,
  );
  let detail;
  try {
    detail = await requestJson(detailUrl);
  } catch (error) {
    const contextUrl = new URL(`${PUBLIC_API_PREFIX}/${args.projectId}/context`, TESTDINO_BASE_URL);
    contextUrl.searchParams.set("caseId", args.testcaseId);
    contextUrl.searchParams.set("detail", "default");
    console.warn(`test-cases detail failed (${error.message}); trying /context fallback.`);
    detail = await requestJson(contextUrl);
  }
  return { detail, entries: artifactEntries(detail), source: "public-api" };
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.testcaseId) fail("Missing --testcase-id.");
  if (!Number.isFinite(args.maxBytes) || args.maxBytes <= 0) fail("--max-bytes must be a positive number.");
  args.outDir = assertInsideDirectory(TESTDINO_ARTIFACTS_DIR, args.outDir);

  const { detail, entries, source } = await loadEntries(args);
  const allowedContentTypes = contentTypesFor(args);

  fs.mkdirSync(args.outDir, { recursive: true });

  const manifest = {
    projectId: args.projectId || null,
    testcaseId: args.testcaseId,
    title: detail?.title || detail?.overview?.title || detail?.test?.title || null,
    source,
    downloadedAt: new Date().toISOString(),
    outputDir: path.resolve(args.outDir),
    artifacts: [],
  };

  let downloadCount = 0;
  for (const artifact of entries) {
    const contentType = artifact.contentType || "application/octet-stream";
    const rawPath = artifact.path || "";
    const manifestEntry = {
      name: artifact.name || null,
      contentType,
      attemptNumber: artifact.attemptNumber || null,
      attemptStatus: artifact.attemptStatus || null,
      source: artifact.source || source,
      downloaded: false,
      skippedReason: null,
      path: null,
      sourceUrlNoQuery: null,
      bytes: null,
    };

    try {
      if (!rawPath || rawPath === "Not Supported") {
        if (artifact.blobKey) {
          manifestEntry.skippedReason = "blob_url_unavailable";
        } else {
          manifestEntry.skippedReason = "missing_or_unsupported_url";
        }
      } else if (!allowedContentTypes.has(contentType)) {
        manifestEntry.skippedReason = `content_type_not_allowed:${contentType}`;
      } else {
        const url = assertAllowedArtifactUrl(rawPath);
        const ext = extensionFor(contentType, rawPath);
        const fileName = `${String(artifact.attemptNumber || 1).padStart(2, "0")}-${safeName(artifact.name)}-${downloadCount + 1}${ext}`;
        const outputPath = path.join(args.outDir, fileName);
        const bytes = await downloadArtifact({ ...artifact, path: url.toString() }, outputPath, args.maxBytes);
        manifestEntry.downloaded = true;
        manifestEntry.path = outputPath;
        manifestEntry.sourceUrlNoQuery = redactedUrl(url.toString());
        manifestEntry.bytes = bytes;
        downloadCount += 1;
      }
    } catch (error) {
      manifestEntry.skippedReason = error instanceof Error ? error.message : String(error);
    }

    manifest.artifacts.push(manifestEntry);
  }

  const manifestPath = path.join(args.outDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

  console.log(`Downloaded ${downloadCount} artifact(s) for ${args.testcaseId} (source=${source}).`);
  console.log(`Manifest: ${manifestPath}`);
  for (const artifact of manifest.artifacts) {
    if (artifact.downloaded) console.log(`- ${artifact.contentType}: ${artifact.path}`);
    else console.log(`- skipped ${artifact.contentType}: ${artifact.skippedReason}`);
  }

  if (source === "public-api" && downloadCount === 0 && entries.some((entry) => entry.blobKey && !entry.path)) {
    console.warn(
      "Public API returned blobKey without signed URLs. Re-run with --urls-json from MCP get_testcase_details (include_artifacts / include_screenshots).",
    );
  }
};

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
