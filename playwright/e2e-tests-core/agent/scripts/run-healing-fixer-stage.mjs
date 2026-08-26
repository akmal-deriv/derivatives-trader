#!/usr/bin/env node
/**
 * Run the LLM fixer for one group and package its git diff as a fixer artifact.
 */
import childProcess from "node:child_process";
import fs from "node:fs";
import { FIXER_ARTIFACT_DIR, HEALING_DIFF_PATHSPEC } from "./healing-diff-utils.mjs";

const run = (label, command, args, options = {}) => {
  console.log(`\n== ${label} ==`);
  const result = childProcess.spawnSync(command, args, {
    encoding: "utf8",
    stdio: "inherit",
    ...options,
  });
  return result.status || 0;
};

const requireSuccess = (label, command, args, options = {}) => {
  const status = run(label, command, args, options);
  if (status !== 0) process.exit(status);
};

const hasCodeChanges = () => {
  const diff = (args) =>
    childProcess.spawnSync("git", args, {
      encoding: "utf8",
      stdio: "ignore",
    });

  const unstaged = diff(["diff", "--quiet", "--", ...HEALING_DIFF_PATHSPEC]);
  const staged = diff(["diff", "--cached", "--quiet", "--", ...HEALING_DIFF_PATHSPEC]);

  for (const result of [unstaged, staged]) {
    if (result.status !== 0 && result.status !== 1) {
      throw new Error(`git diff failed with status ${result.status}`);
    }
  }

  return unstaged.status === 1 || staged.status === 1;
};

const diffToFile = (args, file) => {
  const result = childProcess.spawnSync("git", args, {
    encoding: "utf8",
    stdio: "pipe",
  });

  fs.writeFileSync(file, result.stdout || "");
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(`git ${args.join(" ")} failed with status ${result.status}: ${result.stderr || ""}`);
  }
};

const configureGitIdentity = () => {
  const name = process.env.GIT_COMMITTER_NAME || "Claude AI";
  const email = process.env.GIT_COMMITTER_EMAIL || "claude-ai@users.noreply.github.com";
  requireSuccess("Configure git user.name", "git", ["config", "user.name", name]);
  requireSuccess("Configure git user.email", "git", ["config", "user.email", email]);
};

const writeFixerArtifact = ({ hasChanges, llmStatus }) => {
  console.log("\n== Write fixer artifact ==");
  fs.rmSync(FIXER_ARTIFACT_DIR, { recursive: true, force: true });
  fs.mkdirSync(FIXER_ARTIFACT_DIR, { recursive: true });
  diffToFile(
    ["diff", "--binary", "--", ...HEALING_DIFF_PATHSPEC],
    `${FIXER_ARTIFACT_DIR}/unstaged.patch`,
  );
  diffToFile(
    ["diff", "--cached", "--binary", "--", ...HEALING_DIFF_PATHSPEC],
    `${FIXER_ARTIFACT_DIR}/staged.patch`,
  );

  const metadata = {
    groupId: process.env.GROUP_ID,
    candidateFile: process.env.CANDIDATE_FILE,
    hasChanges,
    llmSucceeded: llmStatus === 0,
    llmOutcome: llmStatus === 0 ? "success" : "failure",
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(`${FIXER_ARTIFACT_DIR}/metadata.json`, JSON.stringify(metadata, null, 2) + "\n");

  for (const fileName of ["pr-body.md", "no-change.md", "triage.md"]) {
    const source = `playwright/agent/.healing/${fileName}`;
    if (fs.existsSync(source) && fs.statSync(source).isFile()) {
      fs.copyFileSync(source, `${FIXER_ARTIFACT_DIR}/${fileName}`);
    }
  }
};

requireSuccess("Install healing agent dependencies", "npm", ["ci", "--prefix", "playwright/e2e-tests-core/agent"]);
configureGitIdentity();

const llmStatus = run("Run LLM fixer", "bash", ["playwright/e2e-tests-core/agent/scripts/run-healer-agent.sh"]);
let hasChanges = false;
try {
  hasChanges = hasCodeChanges();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

try {
  writeFixerArtifact({ hasChanges, llmStatus });
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `has_changes=${hasChanges ? "true" : "false"}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `llm_outcome=${llmStatus === 0 ? "success" : "failure"}\n`);
}

process.exit(llmStatus);
