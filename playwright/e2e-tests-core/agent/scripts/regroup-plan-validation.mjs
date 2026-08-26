#!/usr/bin/env node
import fs from "node:fs";
import { pathToFileURL } from "node:url";

export const extractJsonObject = (value) => {
  const raw = String(value || "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("No JSON object found in model output.");
  return JSON.parse(candidate.slice(start, end + 1));
};

const normalizeString = (value) => String(value ?? "").trim();

export const buildRegroupValidationContext = ({ groups }) => ({
  groupIds: groups.map((group) => group.item.group_id),
});

export const validateRegroupPlan = (plan, context) => {
  const errors = [];
  if (!context || typeof context !== "object" || Array.isArray(context)) {
    errors.push("Context must be a JSON object.");
    return { valid: false, errors };
  }

  const validGroupIds = new Set((context.groupIds || []).map(normalizeString));
  const seen = new Set();

  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    errors.push("Plan must be a JSON object.");
    return { valid: false, errors };
  }

  const outputGroups = Array.isArray(plan.groups) ? plan.groups : [];
  if (!Array.isArray(plan.groups)) {
    errors.push("Plan must contain a groups array.");
  } else if (outputGroups.length === 0) {
    errors.push("Plan groups array must not be empty.");
  }

  for (const [index, group] of outputGroups.entries()) {
    const path = `groups[${index}]`;
    if (!group || typeof group !== "object" || Array.isArray(group)) {
      errors.push(`${path} must be an object.`);
      continue;
    }

    if (!Array.isArray(group.groupIds) || group.groupIds.length === 0) {
      errors.push(`${path}.groupIds must be a non-empty array.`);
    }

    for (const groupId of group.groupIds || []) {
      const normalizedGroupId = normalizeString(groupId);
      if (!normalizedGroupId) {
        errors.push(`${path}.groupIds contains an empty group id.`);
      } else if (!validGroupIds.has(normalizedGroupId)) {
        errors.push(`${path}.groupIds contains unknown group id: ${normalizedGroupId}.`);
      } else if (seen.has(normalizedGroupId)) {
        errors.push(`${path}.groupIds contains duplicate group id: ${normalizedGroupId}.`);
      } else {
        seen.add(normalizedGroupId);
      }
    }
  }

  for (const groupId of validGroupIds) {
    if (!seen.has(groupId)) errors.push(`Missing group id: ${groupId}.`);
  }

  return { valid: errors.length === 0, errors };
};

const readArg = (args, name) => {
  const index = args.indexOf(name);
  return index === -1 ? "" : args[index + 1] || "";
};

const runCli = () => {
  const args = process.argv.slice(2);
  const contextPath = readArg(args, "--context");
  const planPath = readArg(args, "--plan");

  if (!contextPath || !planPath) {
    console.error("Usage: node regroup-plan-validation.mjs --context <context.json> --plan <plan.json|->");
    process.exit(2);
  }

  let context;
  let plan;

  try {
    context = JSON.parse(fs.readFileSync(contextPath, "utf8"));
  } catch (error) {
    console.error(`Failed to read validation context: ${error.message}`);
    process.exit(2);
  }

  try {
    const planText = planPath === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(planPath, "utf8");
    plan = extractJsonObject(planText);
  } catch (error) {
    console.log(JSON.stringify({ valid: false, errors: [`Plan is not parseable JSON: ${error.message}`] }, null, 2));
    process.exit(1);
  }

  const result = validateRegroupPlan(plan, context);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.valid ? 0 : 1);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
