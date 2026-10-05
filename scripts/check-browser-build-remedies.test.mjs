import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parse as parseYaml } from "yaml";

const frontendBuild = readFileSync(
  new URL("../packages/frontend/bin/build-frontend-ts.mjs", import.meta.url),
  "utf8",
);

const versionInfo = readFileSync(
  new URL("../bin/lib/gather-version-info.js", import.meta.url),
  "utf8",
);

const BROWSER_BUILD_WORKFLOWS = [
  "../.github/workflows/deploy-preview.yml",
  "../.github/workflows/ci.yml",
  "../.github/workflows/ci22.yml",
  "../.github/workflows/deploy-cloudflare.yml",
  "../.github/workflows/test-edit-message.yml",
  "../.github/workflows/release.yml",
];

const COLOCATED_SCSS_IMPORTERS = [
  "../packages/frontend/src/components/AICompanionHub/Live2DAvatar.tsx",
  "../packages/frontend/src/components/AICompanionHub/VideoCalibrationLab.tsx",
];

function browserBuildSteps(workflowRelPath) {
  const workflow = parseYaml(
    readFileSync(new URL(workflowRelPath, import.meta.url), "utf8"),
  );
  const steps = [];
  for (const [jobName, job] of Object.entries(workflow.jobs ?? {})) {
    for (const step of job.steps ?? []) {
      if (typeof step?.run === "string" && step.run.includes("build:browser")) {
        steps.push({ jobName, step });
      }
    }
  }
  return steps;
}

test("frontend esbuild compiles colocated SCSS, not only CSS modules", () => {
  assert.match(
    frontendBuild,
    /filter:\s*\/\\?\.scss\$\//,
    "sass plugin must load every .scss file on the production bundle",
  );
  assert.doesNotMatch(
    frontendBuild,
    /filter:\s*\/\\?\.module\\.scss\$\//,
    "module-only filter leaves Live2DAvatar.scss and VideoCalibrationLab.scss unloaded",
  );
  assert.match(
    frontendBuild,
    /local-css/,
    "CSS modules must keep hashed local class names",
  );
  assert.match(
    frontendBuild,
    /["']css["']/,
    "plain component SCSS must compile as global CSS",
  );
});

test("chat-path features still import colocated SCSS that the loader must compile", () => {
  for (const rel of COLOCATED_SCSS_IMPORTERS) {
    const source = readFileSync(new URL(rel, import.meta.url), "utf8");
    assert.match(
      source,
      /import\s+["']\.\/[^"']+\.scss["']/,
      `${rel} must keep its colocated SCSS import so Pages cannot silently drop overlay styles`,
    );
    assert.doesNotMatch(
      source,
      /import\s+["']\.\/[^"']+\.module\.scss["']/,
      `${rel} uses global SCSS, not a CSS module`,
    );
  }
});

test("version gathering uses git describe --always so missing tags are not an Error", () => {
  assert.match(
    versionInfo,
    /describe['",\s]+--tags['",\s]+--always/,
    "git describe must pass --always; Pages clones have no tags",
  );
  assert.match(
    versionInfo,
    /VERSION_INFO_GIT_REF manually/,
    "the announced hint must spell VERSION_INFO_GIT_REF correctly",
  );
  assert.doesNotMatch(versionInfo, /manualy/);
});

test("every browser-target CI job sets VERSION_INFO_GIT_REF", () => {
  for (const workflowRelPath of BROWSER_BUILD_WORKFLOWS) {
    const steps = browserBuildSteps(workflowRelPath);
    assert.ok(
      steps.length > 0,
      `${workflowRelPath} must keep a build:browser step`,
    );
    for (const { jobName, step } of steps) {
      assert.ok(
        step.env?.VERSION_INFO_GIT_REF,
        `${workflowRelPath} job ${jobName} announced missing VERSION_INFO_GIT_REF on Pages/CI22`,
      );
    }
  }
});
