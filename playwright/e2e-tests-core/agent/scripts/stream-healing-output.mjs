#!/usr/bin/env node
/**
 * Parse claude --output-format stream-json and emit human-readable live output.
 * Receives JSONL on stdin; writes readable lines to stdout.
 */
import readline from "node:readline";

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
const suppressToolOutput = process.env.LLM_AGENT_SUPPRESS_TOOL_OUTPUT === "true";

const preview = (value, max = 120) => {
  const s = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return s.length <= max ? s : `${s.slice(0, max)}…`;
};

for await (const line of rl) {
  if (!line.trim()) continue;
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    continue;
  }

  if (event.type === "assistant") {
    for (const block of event.message?.content ?? []) {
      if (block.type === "text" && block.text) {
        process.stdout.write(block.text);
      } else if (block.type === "tool_use" && !suppressToolOutput) {
        console.log(`\n[→ ${block.name} ${preview(block.input)}]`);
      }
    }
  }
}
