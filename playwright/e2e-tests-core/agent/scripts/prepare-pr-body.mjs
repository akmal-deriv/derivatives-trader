#!/usr/bin/env node
/**
 * Ensure the healing PR body exists and append the passing verification note.
 */
import fs from "node:fs";
import childProcess from "node:child_process";

const defaultSubmodulePath = "playwright/e2e-tests-core";
const submodulePath = (process.env.PW_HEALER_SUBMODULE_PATH || "").trim() || defaultSubmodulePath;

fs.mkdirSync("playwright/agent/.healing", { recursive: true });
const verificationPath = "playwright/agent/.healing/deterministic-verification.json";

if (!fs.existsSync("playwright/agent/.healing/pr-body.md") || !fs.readFileSync("playwright/agent/.healing/pr-body.md", "utf8").trim()) {
  fs.writeFileSync(
    "playwright/agent/.healing/pr-body.md",
    [
      "Automated Playwright healing changes from TestDino UI Change failures.",
      "",
      "The agent made code changes but did not write a detailed PR body. Review the diff and uploaded healing artifact before merging.",
      "",
    ].join("\n"),
  );
}

const readVerification = () => {
  if (!fs.existsSync(verificationPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(verificationPath, "utf8"));
  } catch {
    return {};
  }
};

const verification = readVerification();
const verificationPassed = verification.passed === true;
const blockedByUnrelatedFailure =
  verification.repairLikelyValid === true &&
  verification.reason === "blocked_by_unrelated_failure";

const lines = ["", "> [!NOTE]"];
if (verificationPassed && process.env.VERIFY_URL) {
  lines.push(`> Playwright verification passed for this fix: [Run Playwright verification](${process.env.VERIFY_URL}).`);
} else if (verificationPassed) {
  lines.push("> Playwright verification passed for this fix.");
} else if (blockedByUnrelatedFailure && process.env.VERIFY_URL) {
  lines.push(`> Playwright verification did not pass because it was blocked by an unrelated downstream failure: [Run Playwright verification](${process.env.VERIFY_URL}).`);
} else if (blockedByUnrelatedFailure) {
  lines.push("> Playwright verification did not pass because it was blocked by an unrelated downstream failure.");
} else {
  lines.push("> Playwright verification did not pass; review the verification output before merging.");
}

if (process.env.VERIFY_TARGETS) {
  lines.push(`> Verification target(s): \`${process.env.VERIFY_TARGETS}\``);
}

fs.appendFileSync("playwright/agent/.healing/pr-body.md", `${lines.join("\n")}\n`);

const resetIgnoredSubmodulePointers = () => {
  console.log("\n== Reset ignored submodule pointers ==");
  childProcess.spawnSync("git", ["status", "--short"], { stdio: "inherit" });
  const result = childProcess.spawnSync(
    "git",
    ["restore", "--source=HEAD", "--staged", "--worktree", "--", submodulePath],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    const failureDetail = result.status === null
      ? `signal ${result.signal || "unknown"}`
      : `status ${result.status}`;
    console.error(`Failed to reset ${submodulePath} submodule pointer with ${failureDetail}.`);
    process.exit(result.status || 1);
  }
  childProcess.spawnSync("git", ["status", "--short"], { stdio: "inherit" });
};

resetIgnoredSubmodulePointers();
