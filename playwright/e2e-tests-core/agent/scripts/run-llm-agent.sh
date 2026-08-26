#!/usr/bin/env bash
set -euo pipefail

# Shared LLM CLI runner for Playwright healing agents.
#
# Reads prompt text from stdin and invokes an LLM command.
#
# Env:
#   LLM_AGENT_USE_TESTDINO_MCP    true to configure TestDino MCP for Claude.
#   LLM_AGENT_ALLOWED_TOOLS       optional Claude Code allowed tools override.
#   LLM_AGENT_SUPPRESS_TOOL_OUTPUT true to hide tool-use markers from parsed output.
#   LITELLM_API_KEY / LITELLM_API_URL for LiteLLM.
#   LITELLM_MODEL                LiteLLM explicit model, default claude-sonnet-4-6.
#   TESTDINO_ACCESS_TOKEN / TESTDINO_MCP_CONFIG_PATH for MCP.

DEFAULT_TESTDINO_MCP_ALLOWED_TOOLS="mcp__TestDino__get_testcase_details,mcp__TestDino__debug_testcase,mcp__TestDino__get_run_details,mcp__TestDino__list_testcase,Bash(node .e2e-tests-core/agent/scripts/download-testdino-artifacts.mjs:*),Bash(node playwright/e2e-tests-core/agent/scripts/download-testdino-artifacts.mjs:*),Bash(gh pr view:*),Bash(gh pr diff:*),Bash(gh pr list:*),Bash(gh release:*),Bash(git tag:*),Bash(git log:*)"
GENERATED_MCP_CONFIG_PATH=""
AGENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLAUDE_BIN="${AGENT_DIR}/node_modules/.bin/claude"
TESTDINO_MCP_BIN="${AGENT_DIR}/node_modules/.bin/testdino-mcp"
LLM_MODEL="${LITELLM_MODEL:-claude-sonnet-4-6}"

cleanup() {
  if [[ -n "${GENERATED_MCP_CONFIG_PATH}" && -f "${GENERATED_MCP_CONFIG_PATH}" ]]; then
    rm -f "${GENERATED_MCP_CONFIG_PATH}"
  fi
}
trap cleanup EXIT

if [[ ! -x "${CLAUDE_BIN}" ]]; then
  echo "Missing Claude Code CLI at ${CLAUDE_BIN}. Run npm ci --prefix ${AGENT_DIR} first." >&2
  exit 1
fi

export CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS="1"

if [[ -n "${LITELLM_API_KEY:-}" ]]; then
  export ANTHROPIC_API_KEY="${LITELLM_API_KEY}"
  export ANTHROPIC_AUTH_TOKEN="${LITELLM_API_KEY}"
fi

if [[ -n "${LITELLM_API_URL:-}" ]]; then
  export ANTHROPIC_BASE_URL="${LITELLM_API_URL}"
  export ANTHROPIC_API_URL="${LITELLM_API_URL}"
fi

LLM_CMD_ARRAY=("${CLAUDE_BIN}" -p --verbose --model "${LLM_MODEL}" --permission-mode acceptEdits)

TESTDINO_MCP_CONFIG_PATH_ARG=""
if [[ "${LLM_AGENT_USE_TESTDINO_MCP:-false}" == "true" ]]; then
  TESTDINO_MCP_TOKEN="${TESTDINO_ACCESS_TOKEN:-}"
  if [[ -z "${TESTDINO_MCP_TOKEN}" ]]; then
    echo "TESTDINO_ACCESS_TOKEN is required when LLM_AGENT_USE_TESTDINO_MCP=true." >&2
    exit 1
  fi

  if [[ -n "${TESTDINO_MCP_CONFIG_PATH:-}" ]]; then
    TESTDINO_MCP_CONFIG_PATH_ARG="${TESTDINO_MCP_CONFIG_PATH}"
  else
    GENERATED_MCP_CONFIG_PATH="$(mktemp "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/testdino-mcp.XXXXXX.json")"
    MCP_CONFIG_PATH="${GENERATED_MCP_CONFIG_PATH}" TESTDINO_PAT_VALUE="${TESTDINO_MCP_TOKEN}" TESTDINO_MCP_BIN="${TESTDINO_MCP_BIN}" node -e '
const fs = require("node:fs");
const configPath = process.env.MCP_CONFIG_PATH;
const token = process.env.TESTDINO_PAT_VALUE;
const command = process.env.TESTDINO_MCP_BIN;
const config = {
  mcpServers: {
    TestDino: {
      command,
      args: [],
      env: {
        TESTDINO_PAT: token
      }
    }
  }
};
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
'
    chmod 600 "${GENERATED_MCP_CONFIG_PATH}"
    TESTDINO_MCP_CONFIG_PATH_ARG="${GENERATED_MCP_CONFIG_PATH}"
  fi

  if [[ -n "${TESTDINO_MCP_CONFIG_PATH_ARG}" && " ${LLM_CMD_ARRAY[*]} " != *" --mcp-config "* ]]; then
    LLM_CMD_ARRAY+=(--mcp-config "${TESTDINO_MCP_CONFIG_PATH_ARG}")
  fi

  if [[ -n "${TESTDINO_MCP_CONFIG_PATH_ARG}" && " ${LLM_CMD_ARRAY[*]} " != *" --allowedTools "* ]]; then
    LLM_CMD_ARRAY+=(--allowedTools "${DEFAULT_TESTDINO_MCP_ALLOWED_TOOLS}")
  fi
fi

if [[ -n "${LLM_AGENT_ALLOWED_TOOLS:-}" && " ${LLM_CMD_ARRAY[*]} " != *" --allowedTools "* ]]; then
  LLM_CMD_ARRAY+=(--allowedTools "${LLM_AGENT_ALLOWED_TOOLS}")
fi

set +e
"${LLM_CMD_ARRAY[@]}" --output-format stream-json | \
  node "${AGENT_DIR}/scripts/stream-healing-output.mjs"
pipeline_status=("${PIPESTATUS[@]}")
claude_exit="${pipeline_status[0]}"
stream_exit="${pipeline_status[1]}"
if [[ "${stream_exit}" -ne 0 ]]; then
  echo "Warning: stream-healing-output.mjs exited with status ${stream_exit}; preserving Claude exit status ${claude_exit}." >&2
fi
exit "$claude_exit"
