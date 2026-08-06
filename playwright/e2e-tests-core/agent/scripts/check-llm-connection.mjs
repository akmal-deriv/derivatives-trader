#!/usr/bin/env node
/**
 * Check whether the configured LiteLLM route can run the same Claude Code CLI
 * path used by the healing agents.
 */
import childProcess from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const {
  LITELLM_API_KEY,
  LITELLM_API_URL,
} = process.env;
const LITELLM_MODEL = process.env.LITELLM_MODEL || "claude-sonnet-4-6";

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const apiKey = LITELLM_API_KEY || "";
const apiUrl = LITELLM_API_URL || "";

if (!apiKey) {
  fail("LLM connection check failed: missing LITELLM_API_KEY.");
}

if (!apiUrl) {
  fail("LLM connection check failed: missing LITELLM_API_URL.");
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const llmRunnerPath = path.join(scriptDir, "run-llm-agent.sh");

const result = childProcess.spawnSync("bash", [llmRunnerPath], {
  input: "Reply with exactly: OK\n",
  encoding: "utf8",
  stdio: ["pipe", "pipe", "pipe"],
  env: {
    ...process.env,
    LLM_AGENT_USE_TESTDINO_MCP: "false",
  },
  timeout: 300_000,
});

if (result.error) {
  fail(`LLM connection check failed: ${result.error.message}`);
}

if (result.status !== 0) {
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.stdout) process.stderr.write(result.stdout);
  fail(`LLM connection check failed for model '${LITELLM_MODEL}'.`);
}

console.log(`LLM connection check passed for model '${LITELLM_MODEL}'.`);
