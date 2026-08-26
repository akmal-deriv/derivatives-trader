#!/usr/bin/env node
/**
 * Orchestrate TestDino collection, grouping, AI regrouping, and matrix publishing.
 */
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const {
  TESTDINO_UI_CHANGE_MATRIX_PATH = "playwright/agent/.healing/groups/matrix.json",
  GITHUB_OUTPUT,
} = process.env;

const run = (label, command, args, options = {}) => {
  console.log(`\n== ${label} ==`);
  const result = childProcess.spawnSync(command, args, {
    encoding: "utf8",
    stdio: "inherit",
    ...options,
  });

  if (result.status !== 0) {
    console.error(`${label} failed with status ${result.status}.`);
    process.exit(result.status || 1);
  }
};

const nodeScript = (label, script) => {
  const env = { ...process.env };
  delete env.GITHUB_OUTPUT;
  run(label, "node", [`playwright/e2e-tests-core/agent/scripts/${script}`], { env });
};

const appendGithubOutput = (key, value) => {
  if (!GITHUB_OUTPUT) {
    throw new Error("Missing GITHUB_OUTPUT.");
  }
  const delimiter = `gh-output-${key}-${crypto.randomUUID()}`;
  fs.appendFileSync(GITHUB_OUTPUT, `${key}<<${delimiter}\n${String(value)}\n${delimiter}\n`);
};

const publishMatrix = () => {
  console.log("\n== Publish healing matrix ==");
  const matrixPath = path.resolve(TESTDINO_UI_CHANGE_MATRIX_PATH);
  let matrix;
  try {
    matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
  } catch (error) {
    console.error(`Failed to read ${matrixPath}: ${error.message}`);
    process.exit(1);
  }

  const include = Array.isArray(matrix.include) ? matrix.include : [];
  try {
    appendGithubOutput("group_count", include.length);
    appendGithubOutput("matrix", JSON.stringify({ include }));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  console.log(`Published ${include.length} healing group(s) from ${path.relative(process.cwd(), matrixPath) || matrixPath}.`);
};

nodeScript("Find TestDino UI Change failures", "find-testdino-ui-changes.mjs");
nodeScript("Build healing matrix", "group-ui-change-candidates.mjs");
run("Install healing agent dependencies", "npm", ["ci", "--prefix", "playwright/e2e-tests-core/agent"]);
nodeScript("AI regroup healing matrix", "run-regrouping-agent.mjs");
publishMatrix();
