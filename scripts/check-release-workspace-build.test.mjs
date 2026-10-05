import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parse as parseYaml } from "yaml";

const workflow = parseYaml(
  readFileSync(
    new URL("../.github/workflows/release.yml", import.meta.url),
    "utf8",
  ),
);

function job(name) {
  const found = workflow.jobs?.[name];
  assert.ok(found, `release.yml must keep job ${name}`);
  return found;
}

function stepRun(step) {
  return typeof step?.run === "string" ? step.run : "";
}

function jobRunText(jobName) {
  return (job(jobName).steps ?? []).map(stepRun).join("\n---\n");
}

function mustBuildTypeDepsBefore(jobName, laterNeedle, laterLabel) {
  const combined = jobRunText(jobName);
  const typeDepsIdx = combined.indexOf("build:type-deps");
  const laterIdx = combined.indexOf(laterNeedle);
  assert.ok(
    typeDepsIdx >= 0,
    `${jobName} must compile workspace type deps so deep-tree-echo-core/logger exists`,
  );
  assert.ok(laterIdx >= 0, `${jobName} must keep ${laterLabel}`);
  assert.ok(
    typeDepsIdx < laterIdx,
    `${jobName} must run build:type-deps before ${laterLabel}`,
  );
}

test("Release browser install skips unused Electron and builds type deps first", () => {
  const jobDef = job("build-browser");
  const install = (jobDef.steps ?? []).find(
    step => stepRun(step).trim() === "pnpm install --frozen-lockfile",
  );
  assert.ok(install, "Release build-browser must keep a frozen-lockfile install");
  const skip = install.env?.ELECTRON_SKIP_BINARY_DOWNLOAD;
  assert.ok(
    skip === 1 || skip === "1",
    "Release browser install must skip Electron so a GitHub 503 cannot fail a browser-only job",
  );
  mustBuildTypeDepsBefore(
    "build-browser",
    "pnpm build:browser",
    "pnpm build:browser",
  );
});

test("Release Electron and Tauri compile core/avatar before the app bundle", () => {
  mustBuildTypeDepsBefore(
    "build-electron",
    "pnpm --filter=@deltachat-desktop/target-electron build",
    "target-electron build",
  );
  mustBuildTypeDepsBefore("build-tauri", "pnpm build:tauri", "pnpm build:tauri");
});

test("Release orchestrator pack builds avatar before orchestrator tsc", () => {
  const combined = jobRunText("build-packages");
  assert.match(
    combined,
    /@deltecho\/avatar/,
    "Release build-packages must compile @deltecho/avatar",
  );
  const avatarIdx = combined.indexOf("@deltecho/avatar");
  const orchestratorIdx = combined.indexOf(
    "pnpm --filter=deep-tree-echo-orchestrator build",
  );
  assert.ok(orchestratorIdx >= 0, "Release must still build the orchestrator");
  assert.ok(
    avatarIdx >= 0 && avatarIdx < orchestratorIdx,
    "Release must compile @deltecho/avatar before orchestrator tsc",
  );
  mustBuildTypeDepsBefore(
    "build-packages",
    "pnpm --filter=deep-tree-echo-orchestrator build",
    "orchestrator build",
  );
});
