#!/usr/bin/env node
/**
 * Run the narrowest deterministic Playwright verification for an auto-healed
 * TestDino UI Change group.
 *
 * Target selection intentionally does not rely on agent-written metadata:
 *   1. changed Playwright spec/test files from git diff
 *   2. candidate spec files from the TestDino group JSON
 *   3. spec-like source locations from candidate error details
 */

import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { HEALING_DIFF_PATHSPEC } from "./healing-diff-utils.mjs";

const {
  GH_TOKEN,
  GITHUB_OUTPUT,
  GITHUB_REPOSITORY,
  GITHUB_RUN_ATTEMPT,
  GITHUB_RUN_ID,
  GITHUB_API_URL = "https://api.github.com",
  GITHUB_SERVER_URL,
  JOB_NAME,
  TESTDINO_UI_CHANGE_CANDIDATES_PATH = "playwright/agent/.healing/ui-change-candidates.json",
  PLAYWRIGHT_HEALING_VERIFICATION_OUTPUT = "playwright/agent/.healing/deterministic-verification.json",
  PLAYWRIGHT_HEALING_RESULTS_JSON = "playwright/playwright-report/results.json",
  VERIFY_STEP_NAME = "Run Playwright verification",
} = process.env;

const SPEC_RE = /\.(?:spec|test)\.[cm]?[jt]sx?$/;
let trackedSpecFilesCache = null;

const normalizePath = (value) => {
  let normalized = String(value || "").trim().replace(/\\/g, "/");
  if (!normalized) return "";
  normalized = normalized.replace(/^.*?\/home\/runner\/work\/[^/]+\/[^/]+\//, "");
  normalized = normalized.replace(/^.*?\/playwright\//, "playwright/");
  normalized = normalized.replace(/^\.\//, "");
  normalized = path.posix.normalize(normalized);
  if (normalized === ".." || normalized.startsWith("../")) return "";
  return normalized;
};

const unique = (values) => [...new Set(values.filter(Boolean))];
const normalizeWhitespace = (value) => String(value || "").replace(/\s+/g, " ").trim();
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const stripAnsi = (value) => String(value || "").replace(/\u001b\[[0-9;]*m/g, "");
const normalizeSignatureText = (value) =>
  normalizeWhitespace(stripAnsi(value)).toLowerCase();

const compactForOutput = (value, maxLength = 500) => {
  const compacted = normalizeWhitespace(stripAnsi(value));
  return compacted.length > maxLength ? `${compacted.slice(0, maxLength)}...` : compacted;
};

const isSpecFile = (filePath) =>
  filePath.startsWith("playwright/") &&
  !filePath.includes("/e2e-tests-core/") &&
  SPEC_RE.test(filePath) &&
  fs.existsSync(filePath);

const trackedSpecFiles = () => {
  if (trackedSpecFilesCache) return trackedSpecFilesCache;
  const output = execFileSync("git", ["ls-files", "playwright"], { encoding: "utf8" });
  trackedSpecFilesCache = output
    .split(/\r?\n/)
    .map(normalizePath)
    .filter(isSpecFile);
  return trackedSpecFilesCache;
};

const resolveSpecFiles = (value) => {
  const normalized = normalizePath(value);
  if (!SPEC_RE.test(normalized)) return [];
  if (isSpecFile(normalized)) return [normalized];

  const basename = path.posix.basename(normalized);
  const suffix = normalized.includes("/") ? `/${normalized}` : `/${basename}`;
  return trackedSpecFiles().filter((filePath) =>
    path.posix.basename(filePath) === basename || filePath.endsWith(suffix),
  );
};

const writeOutput = (key, value) => {
  if (!GITHUB_OUTPUT) return;
  const delimiter = `gh-output-${key}-${crypto.randomUUID()}`;
  fs.appendFileSync(GITHUB_OUTPUT, `${key}<<${delimiter}\n${String(value)}\n${delimiter}\n`);
};

const captureVerificationUrl = async () => {
  const runUrl = GITHUB_SERVER_URL && GITHUB_REPOSITORY && GITHUB_RUN_ID
    ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`
    : "";

  if (!GH_TOKEN || !GITHUB_REPOSITORY || !GITHUB_RUN_ID || !GITHUB_RUN_ATTEMPT || !JOB_NAME) {
    writeOutput("url", runUrl);
    return;
  }

  try {
    const jobsUrl = new URL(
      `/repos/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}/attempts/${GITHUB_RUN_ATTEMPT}/jobs`,
      GITHUB_API_URL,
    );
    jobsUrl.searchParams.set("per_page", "100");
    const response = await fetch(jobsUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${GH_TOKEN}`,
        "User-Agent": "playwright-healing-workflow",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}: ${(await response.text()).slice(0, 300)}`);
    }

    const data = await response.json();
    const job = data.jobs?.find((candidate) => candidate.name === JOB_NAME);
    const step = job?.steps?.find((candidate) => candidate.name === VERIFY_STEP_NAME);

    if (job?.html_url && step?.number) {
      writeOutput("url", `${job.html_url}#step:${step.number}:1`);
    } else if (job?.html_url) {
      writeOutput("url", job.html_url);
    } else {
      writeOutput("url", runUrl);
    }
  } catch (error) {
    console.warn(`Could not resolve Playwright verification step URL: ${error.message}`);
    writeOutput("url", runUrl);
  }
};

const writeJson = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
};

const readCandidateJson = () => {
  if (!fs.existsSync(TESTDINO_UI_CHANGE_CANDIDATES_PATH)) return null;
  return JSON.parse(fs.readFileSync(TESTDINO_UI_CHANGE_CANDIDATES_PATH, "utf8"));
};

const gitChangedFiles = () => {
  const unstagedOutput = execFileSync(
    "git",
    ["diff", "--name-only", "--", ...HEALING_DIFF_PATHSPEC],
    { encoding: "utf8" },
  );
  const stagedOutput = execFileSync(
    "git",
    ["diff", "--cached", "--name-only", "--", ...HEALING_DIFF_PATHSPEC],
    { encoding: "utf8" },
  );
  return unique([...unstagedOutput.split(/\r?\n/), ...stagedOutput.split(/\r?\n/)])
    .map(normalizePath)
    .filter(Boolean);
};

const candidateSpecs = (candidateJson) => {
  const candidates = Array.isArray(candidateJson?.candidates) ? candidateJson.candidates : [];
  return candidates.flatMap((candidate) => [
    candidate?.spec?.filePath,
    candidate?.spec?.fileName,
    candidate?.spec?.name,
  ]).flatMap(resolveSpecFiles);
};

const candidateSourceLocationSpecs = (candidateJson) => {
  const candidates = Array.isArray(candidateJson?.candidates) ? candidateJson.candidates : [];
  return candidates
    .map((candidate) => candidate?.details?.error?.sourceLocation?.file)
    .flatMap(resolveSpecFiles);
};

const candidateTestTitles = (candidateJson) => {
  const candidates = Array.isArray(candidateJson?.candidates) ? candidateJson.candidates : [];
  return unique(candidates.map((candidate) =>
    normalizeWhitespace(candidate?.testCase?.title || candidate?.testCase?.fullTitle),
  ));
};

const candidateFailureSignatures = (candidateJson) => {
  const candidates = Array.isArray(candidateJson?.candidates) ? candidateJson.candidates : [];
  const groupSignatureParts = Array.isArray(candidateJson?.group?.signatureParts)
    ? candidateJson.group.signatureParts
    : [];

  return candidates.map((candidate) => {
    const error = candidate?.details?.error || {};
    const sourceLocation = error?.sourceLocation || {};
    const title = normalizeWhitespace(candidate?.testCase?.title || candidate?.testCase?.fullTitle);
    const fragments = unique([
      error?.message,
      error?.locator,
      error?.assertion,
      ...groupSignatureParts,
    ]
      .flatMap((value) => String(value || "").split(/\r?\n/))
      .map(normalizeSignatureText)
      .filter((value) => value.length >= 20));

    return {
      title,
      normalizedTitle: normalizeSignatureText(title),
      sourceFile: normalizePath(sourceLocation?.file),
      sourceLine: Number(sourceLocation?.line) || null,
      fragments,
    };
  }).filter((signature) =>
    signature.normalizedTitle || signature.sourceFile || signature.fragments.length > 0,
  );
};

const readPlaywrightResults = () => {
  if (!fs.existsSync(PLAYWRIGHT_HEALING_RESULTS_JSON)) return null;
  try {
    return JSON.parse(fs.readFileSync(PLAYWRIGHT_HEALING_RESULTS_JSON, "utf8"));
  } catch (error) {
    console.warn(`Could not parse Playwright JSON report at ${PLAYWRIGHT_HEALING_RESULTS_JSON}: ${error.message}`);
    return null;
  }
};

const errorsFromResult = (result) => {
  const errors = Array.isArray(result?.errors) ? result.errors : [];
  if (errors.length > 0) return errors;
  return result?.error ? [result.error] : [];
};

const errorTextFromResult = (result) => {
  return errorsFromResult(result).map((error) => [
    error?.message,
    error?.stack,
    error?.snippet,
    error?.value,
  ].filter(Boolean).join("\n")).join("\n\n");
};

const errorLocationsFromResult = (result) => {
  return errorsFromResult(result)
    .map((error) => error?.location)
    .filter(Boolean)
    .map((location) => ({
      file: normalizePath(location.file),
      line: Number(location.line) || null,
      column: Number(location.column) || null,
    }));
};

const collectFailedTests = (suite, inheritedTitles = []) => {
  if (!suite || typeof suite !== "object") return [];
  const currentTitles = [...inheritedTitles, suite.title].filter(Boolean);
  const nestedSuites = Array.isArray(suite.suites)
    ? suite.suites.flatMap((child) => collectFailedTests(child, currentTitles))
    : [];
  const specs = Array.isArray(suite.specs) ? suite.specs : [];
  const specFailures = specs.flatMap((spec) => {
    const tests = Array.isArray(spec.tests) ? spec.tests : [];
    return tests.flatMap((test) => {
      const results = Array.isArray(test.results) ? test.results : [];
      const failedResults = results.filter((result) =>
        ["failed", "timedOut", "interrupted"].includes(result?.status),
      );
      const testFailed = ["unexpected", "failed", "timedOut", "interrupted"].includes(test?.status) ||
        (!test?.status && failedResults.length > 0);
      if (!testFailed) return [];

      const result = failedResults.at(-1);
      if (!result) return [];

      const titleParts = unique([
        ...currentTitles,
        spec.title,
        test.title,
      ].filter(Boolean).map(normalizeWhitespace));
      const errorText = errorTextFromResult(result);
      return [{
        title: normalizeWhitespace(spec.title || test.title || titleParts.at(-1)),
        fullTitle: titleParts.join(" > "),
        file: normalizePath(spec.file),
        line: Number(spec.line) || null,
        projectName: test.projectName || null,
        status: result.status,
        retry: result.retry ?? null,
        errorText,
        normalizedErrorText: normalizeSignatureText(errorText),
        errorLocations: errorLocationsFromResult(result),
      }];
    });
  });

  return [...nestedSuites, ...specFailures];
};

const sourceLocationMatches = (failedTest, signature) => {
  if (!signature.sourceFile) return false;
  const locations = [
    { file: failedTest.file, line: failedTest.line },
    ...failedTest.errorLocations,
  ];
  return locations.some((location) => {
    if (!location.file || location.file !== signature.sourceFile) return false;
    if (!signature.sourceLine || !location.line) return true;
    return Math.abs(Number(location.line) - Number(signature.sourceLine)) <= 2;
  });
};

const titleMatches = (failedTest, signature) => {
  if (!signature.normalizedTitle) return true;
  const fullTitle = normalizeSignatureText(failedTest.fullTitle || failedTest.title);
  return fullTitle.includes(signature.normalizedTitle) || signature.normalizedTitle.includes(fullTitle);
};

const failureMatchesCandidateSignature = (failedTest, signature) => {
  if (!titleMatches(failedTest, signature)) return false;
  if (sourceLocationMatches(failedTest, signature)) return true;
  return signature.fragments.some((fragment) => failedTest.normalizedErrorText.includes(fragment));
};

const downstreamFailureEvidence = (failedTests, signatures) => {
  const evidence = [];
  for (const failedTest of failedTests) {
    for (const signature of signatures) {
      if (!titleMatches(failedTest, signature)) continue;
      if (!signature.sourceFile || !signature.sourceLine) continue;

      const locations = [
        { file: failedTest.file, line: failedTest.line },
        ...failedTest.errorLocations,
      ];
      const downstreamLocation = locations.find((location) =>
        location.file === signature.sourceFile &&
        Number(location.line) > Number(signature.sourceLine) + 2,
      );

      if (downstreamLocation) {
        evidence.push({
          title: failedTest.fullTitle || failedTest.title,
          candidateSourceFile: signature.sourceFile,
          candidateSourceLine: signature.sourceLine,
          failureFile: downstreamLocation.file,
          failureLine: downstreamLocation.line,
          projectName: failedTest.projectName,
        });
      }
    }
  }
  return evidence;
};

const classifyFailedVerification = (candidateJson) => {
  const report = readPlaywrightResults();
  if (!report) {
    return {
      reason: "playwright_test_failed",
      repairLikelyValid: false,
      reportAvailable: false,
      failedTests: [],
      originalFailureStillPresent: false,
    };
  }

  const failedTests = collectFailedTests(report);
  const signatures = candidateFailureSignatures(candidateJson);
  const matchingFailures = failedTests.filter((failedTest) =>
    signatures.some((signature) => failureMatchesCandidateSignature(failedTest, signature)),
  );
  const summarizedFailures = failedTests.map((failedTest) => ({
    title: failedTest.fullTitle || failedTest.title,
    file: failedTest.file || null,
    line: failedTest.line || null,
    projectName: failedTest.projectName,
    status: failedTest.status,
    retry: failedTest.retry,
    error: compactForOutput(failedTest.errorText),
    errorLocations: failedTest.errorLocations,
  }));

  if (matchingFailures.length > 0) {
    return {
      reason: "same_failure_still_present",
      repairLikelyValid: false,
      reportAvailable: true,
      failedTests: summarizedFailures,
      originalFailureStillPresent: true,
      originalFailureMatches: matchingFailures.map((failedTest) => ({
        title: failedTest.fullTitle || failedTest.title,
        file: failedTest.file || null,
        line: failedTest.line || null,
        projectName: failedTest.projectName,
        error: compactForOutput(failedTest.errorText),
      })),
    };
  }

  const downstreamEvidence = downstreamFailureEvidence(failedTests, signatures);
  if (downstreamEvidence.length > 0) {
    return {
      reason: "blocked_by_unrelated_failure",
      repairLikelyValid: true,
      reportAvailable: true,
      failedTests: summarizedFailures,
      originalFailureStillPresent: false,
      downstreamFailureEvidence: downstreamEvidence,
    };
  }

  if (failedTests.length > 0 && signatures.length > 0) {
    return {
      reason: "verification_failed_before_candidate_step",
      repairLikelyValid: false,
      reportAvailable: true,
      failedTests: summarizedFailures,
      originalFailureStillPresent: false,
    };
  }

  return {
    reason: "playwright_test_failed",
    repairLikelyValid: false,
    reportAvailable: true,
    failedTests: summarizedFailures,
    originalFailureStillPresent: false,
  };
};

const playwrightBin = fs.existsSync("node_modules/.bin/playwright")
  ? "node_modules/.bin/playwright"
  : "npx";
const playwrightArgsPrefix = playwrightBin === "npx" ? ["playwright"] : [];

const candidateJson = readCandidateJson();
const changedFiles = gitChangedFiles();
const changedSpecFiles = unique(changedFiles.filter(isSpecFile));
const candidateSpecFiles = unique(candidateSpecs(candidateJson).filter(isSpecFile));
const sourceLocationSpecFiles = unique(candidateSourceLocationSpecs(candidateJson).filter(isSpecFile));
const candidateTitles = candidateTestTitles(candidateJson);
const primaryTargets = unique([...changedSpecFiles, ...candidateSpecFiles]);
const targets = primaryTargets.length > 0 ? primaryTargets : sourceLocationSpecFiles;
const grepPattern = candidateTitles.length > 0
  ? candidateTitles.map(escapeRegExp).join("|")
  : "";
const commandArgs = [...playwrightArgsPrefix, "test", ...(grepPattern ? ["--grep", grepPattern] : []), ...targets];
const changedAndCandidateSpecsDiffer =
  changedSpecFiles.length > 0 &&
  candidateSpecFiles.length > 0 &&
  (
    changedSpecFiles.some((filePath) => !candidateSpecFiles.includes(filePath)) ||
    candidateSpecFiles.some((filePath) => !changedSpecFiles.includes(filePath))
  );

const baseResult = {
  candidateFile: TESTDINO_UI_CHANGE_CANDIDATES_PATH,
  changedFiles,
  changedSpecFiles,
  candidateSpecFiles,
  sourceLocationSpecFiles,
  candidateTitles,
  targets,
  grepPattern: grepPattern || null,
  changedAndCandidateSpecsDiffer,
  command: targets.length > 0 ? [playwrightBin, ...commandArgs].join(" ") : null,
  resultsJson: PLAYWRIGHT_HEALING_RESULTS_JSON,
  passed: false,
  reason: null,
  repairLikelyValid: false,
  originalFailureStillPresent: null,
  exitCode: null,
  generatedAt: new Date().toISOString(),
};

const isPrEligible = (result) =>
  result.passed === true ||
  (result.repairLikelyValid === true && result.reason === "blocked_by_unrelated_failure");

if (targets.length === 0) {
  const result = {
    ...baseResult,
    reason: "no_playwright_test_targets",
    prEligible: false,
  };
  writeJson(PLAYWRIGHT_HEALING_VERIFICATION_OUTPUT, result);
  writeOutput("passed", "false");
  writeOutput("pr_eligible", "false");
  writeOutput("reason", result.reason);
  writeOutput("repair_likely_valid", "false");
  writeOutput("targets", "");
  writeOutput("changed_candidate_specs_differ", changedAndCandidateSpecsDiffer ? "true" : "false");
  await captureVerificationUrl();
  console.error("No deterministic Playwright test targets could be derived from the diff or candidate JSON.");
  process.exit(0);
}

console.log(`Running deterministic Playwright verification for ${targets.length} target(s):`);
for (const target of targets) console.log(`- ${target}`);
if (baseResult.command) console.log(`Command: ${baseResult.command}`);
fs.rmSync(PLAYWRIGHT_HEALING_RESULTS_JSON, { force: true });

const run = spawnSync(playwrightBin, commandArgs, {
  encoding: "utf8",
  stdio: "inherit",
});

const passed = run.status === 0;
const failureClassification = passed
  ? {
      reason: "passed",
      repairLikelyValid: true,
      originalFailureStillPresent: false,
      reportAvailable: fs.existsSync(PLAYWRIGHT_HEALING_RESULTS_JSON),
      failedTests: [],
    }
  : classifyFailedVerification(candidateJson);
const result = {
  ...baseResult,
  passed,
  reason: failureClassification.reason,
  repairLikelyValid: failureClassification.repairLikelyValid,
  originalFailureStillPresent: failureClassification.originalFailureStillPresent,
  reportAvailable: failureClassification.reportAvailable,
  failedTests: failureClassification.failedTests,
  originalFailureMatches: failureClassification.originalFailureMatches || [],
  downstreamFailureEvidence: failureClassification.downstreamFailureEvidence || [],
  exitCode: run.status,
};
result.prEligible = isPrEligible(result);

writeJson(PLAYWRIGHT_HEALING_VERIFICATION_OUTPUT, result);
writeOutput("passed", passed ? "true" : "false");
writeOutput("pr_eligible", result.prEligible ? "true" : "false");
writeOutput("reason", result.reason);
writeOutput("repair_likely_valid", result.repairLikelyValid ? "true" : "false");
writeOutput("targets", targets.join(" "));
writeOutput("changed_candidate_specs_differ", changedAndCandidateSpecsDiffer ? "true" : "false");
await captureVerificationUrl();

if (!passed) {
  console.error(`Deterministic Playwright verification failed with exit code ${run.status}.`);
}
