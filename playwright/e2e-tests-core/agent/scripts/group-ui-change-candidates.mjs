#!/usr/bin/env node
/**
 * Split TestDino UI Change candidates into deterministic groups for one-PR-per-fix workflows.
 *
 * Input:
 *   TESTDINO_UI_CHANGE_CANDIDATES_PATH  default playwright/agent/.healing/ui-change-candidates.json
 *
 * Output:
 *   TESTDINO_UI_CHANGE_GROUPS_DIR       default playwright/agent/.healing/groups
 *   TESTDINO_UI_CHANGE_MATRIX_PATH      default playwright/agent/.healing/groups/matrix.json
 *
 * When GITHUB_OUTPUT is set, writes:
 *   group_count=<n>
 *   matrix={"include":[...]}
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const {
  TESTDINO_UI_CHANGE_CANDIDATES_PATH = "playwright/agent/.healing/ui-change-candidates.json",
  TESTDINO_UI_CHANGE_GROUPS_DIR = "playwright/agent/.healing/groups",
  TESTDINO_UI_CHANGE_MATRIX_PATH,
  GITHUB_OUTPUT,
} = process.env;

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const appendGithubOutput = (key, value) => {
  if (!GITHUB_OUTPUT) return;
  const delimiter = `gh-output-${key}-${crypto.randomUUID()}`;
  fs.appendFileSync(GITHUB_OUTPUT, `${key}<<${delimiter}\n${String(value)}\n${delimiter}\n`);
};

const readJson = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`Failed to read ${filePath}: ${error.message}`);
  }
};

const normalizeWhitespace = (value) => String(value || "").replace(/\s+/g, " ").trim();
const shortHash = (value) => crypto.createHash("sha256").update(value).digest("hex").slice(0, 12);
const slugify = (value) =>
  normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "ui-change";

const firstPresent = (...values) => values.find((value) => normalizeWhitespace(value));

const assertInsideHealingDir = (directory) => {
  const healingBase = path.resolve("playwright/agent/.healing");
  const resolved = path.resolve(directory);
  const relative = path.relative(healingBase, resolved);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) return resolved;
  throw new Error(`Refusing to delete outside healing dir: ${resolved}`);
};

const candidateSignatureParts = (candidate) => {
  const details = candidate?.details || {};
  const error = details.error || {};
  const location = error.sourceLocation;
  const locationPart = location?.file && location?.line ? `${location.file}:${location.line}` : null;
  const providedParts = Array.isArray(details.grouping?.signatureParts) ? details.grouping.signatureParts : [];

  const evidenceParts = [
    ...providedParts,
    locationPart,
    error.locator,
  ]
    .map(normalizeWhitespace)
    .filter(Boolean);

  if (evidenceParts.length > 0) {
    return [
      ...evidenceParts,
      error.message,
      candidate?.testCase?.error_type,
    ]
      .map(normalizeWhitespace)
      .filter(Boolean)
      .filter((part, index, parts) => parts.indexOf(part) === index);
  }

  return [
    candidate?.testCase?.fullTitle || candidate?.testCase?.title,
    candidate?.spec?.filePath || candidate?.spec?.name || candidate?.spec?.fileName,
    candidate?.testCase?.browserId,
    error.message,
    candidate?.testCase?.error_type,
  ]
    .map(normalizeWhitespace)
    .filter(Boolean);
};

const groupTitle = (group) => {
  const first = group.candidates[0] || {};
  const sourceLocation = first.details?.error?.sourceLocation;
  const file = sourceLocation?.file || first.spec?.filePath || first.spec?.fileName;
  const locator = first.details?.error?.locator;
  const message = first.details?.error?.message;
  const title = first.testCase?.title || first.testCase?.fullTitle;
  return firstPresent(message, locator, file, title, "UI Change");
};

const safeOutputDir = assertInsideHealingDir(TESTDINO_UI_CHANGE_GROUPS_DIR);
fs.rmSync(safeOutputDir, { recursive: true, force: true });
const outputDir = safeOutputDir;
fs.mkdirSync(outputDir, { recursive: true });

const inputPath = path.resolve(TESTDINO_UI_CHANGE_CANDIDATES_PATH);
const input = readJson(inputPath);
const candidates = Array.isArray(input.candidates) ? input.candidates : [];
const groupsBySignature = new Map();

for (const candidate of candidates) {
  const signatureParts = candidateSignatureParts(candidate);
  const signature = signatureParts.join("\n") || JSON.stringify(candidate.testCase || candidate);
  const id = `ui-change-${shortHash(signature)}`;
  if (!groupsBySignature.has(signature)) {
    groupsBySignature.set(signature, {
      id,
      signature,
      signatureParts,
      candidates: [],
    });
  }
  groupsBySignature.get(signature).candidates.push(candidate);
}

const groups = [...groupsBySignature.values()].sort((left, right) => {
  const leftRun = Number(left.candidates[0]?.run?.counter) || 0;
  const rightRun = Number(right.candidates[0]?.run?.counter) || 0;
  if (rightRun !== leftRun) return rightRun - leftRun;
  return left.id.localeCompare(right.id);
});

const matrix = { include: [] };

for (const [index, group] of groups.entries()) {
  const title = normalizeWhitespace(groupTitle(group));
  const slug = slugify(title);
  const groupNumber = String(index + 1).padStart(3, "0");
  const fileName = `${groupNumber}-${group.id}-${slug}.json`;
  const filePath = path.join(outputDir, fileName);
  const relativeFilePath = path.relative(process.cwd(), filePath);

  const groupJson = {
    ...input,
    group: {
      id: group.id,
      index: index + 1,
      count: group.candidates.length,
      title,
      signatureParts: group.signatureParts,
    },
    count: group.candidates.length,
    candidates: group.candidates,
  };

  fs.writeFileSync(filePath, JSON.stringify(groupJson, null, 2) + "\n");

  matrix.include.push({
    group_id: group.id,
    group_index: index + 1,
    candidate_count: group.candidates.length,
    candidate_file: relativeFilePath,
    branch: `claude/playwright-healing-${group.id}`,
    title_suffix: title.slice(0, 80),
  });
}

const matrixPath = path.resolve(TESTDINO_UI_CHANGE_MATRIX_PATH || path.join(outputDir, "matrix.json"));
fs.writeFileSync(matrixPath, JSON.stringify(matrix, null, 2) + "\n");

if (GITHUB_OUTPUT) {
  appendGithubOutput("group_count", groups.length);
  appendGithubOutput("matrix", JSON.stringify(matrix));
}

console.log(`Grouped ${candidates.length} candidate(s) into ${groups.length} deterministic group(s).`);
console.log(`Wrote ${path.relative(process.cwd(), matrixPath) || matrixPath}.`);
for (const item of matrix.include) {
  console.log(`- ${item.group_id}: ${item.candidate_count} candidate(s), ${item.candidate_file}`);
}
