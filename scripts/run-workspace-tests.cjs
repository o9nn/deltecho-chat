#!/usr/bin/env node
/*
 * Deterministic CI test runner for the deltecho-chat workspace.
 *
 * pnpm -r test can keep GitHub Actions open when mixed Jest, Mocha, and
 * Vitest packages leave async handles or when recursive traversal overlaps
 * package output. This runner executes the known test-bearing packages one at
 * a time, with inherited output and a per-package timeout, so CI fails fast on
 * genuine blockers and exits cleanly when the suites pass.
 */
const { spawnSync } = require("node:child_process");

const packages = [
  "deep-tree-echo-core",
  "@deltecho/eventa",
  "@deltachat-desktop/shared",
  "@deltecho/sys6-triality",
  "@deltecho/voice",
  "@deltecho/avatar",
  "@deltecho/dove9",
  "@deltecho/cognitive",
  "@deltecho/discord",
  "@deltecho/integrations",
  "deep-tree-echo-orchestrator",
  "@deltachat-desktop/frontend",
  "deep-tree-echo-mcp",
  "@deltecho/reasoning",
  "@deltecho/telegram",
];

const perPackageTimeoutMs =
  Number.parseInt(process.env.DELTECHO_TEST_TIMEOUT_MS || "", 10) || 600_000;

for (const pkg of packages) {
  console.log(`\n=== [deltecho-test] ${pkg} ===`);
  const result = spawnSync("pnpm", ["--filter", pkg, "test"], {
    cwd: process.cwd(),
    env: { ...process.env, CI: process.env.CI || "true" },
    stdio: "inherit",
    timeout: perPackageTimeoutMs,
  });

  if (result.error) {
    console.error(
      `\n[deltecho-test] ${pkg} failed to execute: ${result.error.message}`,
    );
    if (result.error.code === "ETIMEDOUT") {
      console.error(
        `[deltecho-test] ${pkg} exceeded ${perPackageTimeoutMs} ms.`,
      );
    }
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(
      `\n[deltecho-test] ${pkg} failed with exit code ${result.status}.`,
    );
    process.exit(result.status || 1);
  }
}

console.log("\n=== [deltecho-test] all workspace test packages passed ===");

// Explicitly terminate the runner after a fully successful pass. Some package
// test frameworks leave benign handles in their own child processes; although
// each child is executed serially, GitHub Actions can still keep the parent step
// open if inherited stdio or signal forwarding leaves a dangling descriptor.
process.exit(0);
