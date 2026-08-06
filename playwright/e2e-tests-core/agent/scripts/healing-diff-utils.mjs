export const FIXER_ARTIFACT_DIR = "playwright/agent/.healing/fix";

export const HEALING_DIFF_PATHSPEC = [
  ".",
  ":(exclude)playwright/agent/.healing",
  ":(exclude)playwright/e2e-tests-core",
  ":(exclude)playwright/e2e-tests-core/**",
];

export const HEALING_GIT_APPLY_EXCLUDE_ARGS = [
  "--exclude=playwright/e2e-tests-core",
  "--exclude=playwright/e2e-tests-core/**",
];
