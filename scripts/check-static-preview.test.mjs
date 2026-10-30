import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parse as parseYaml } from "yaml";
import { validateStaticPreview } from "./check-static-preview.mjs";

const html = readFileSync(
  new URL(
    "../packages/target-browser/static-pages/index.html",
    import.meta.url,
  ),
  "utf8",
);

test("public preview abstains from reporting unobserved autonomy and Live2D state", () => {
  assert.deepEqual(validateStaticPreview(html), []);
});

test("a fabricated ESN or DAO score fails the public release gate", () => {
  const tampered = html.replace(
    '<div class="label">ESN autognosis</div>\n          <div class="value">not connected</div>',
    '<div class="label">ESN autognosis</div>\n          <div class="value">0.94</div>',
  );
  assert.match(validateStaticPreview(tampered).join(" "), /numeric telemetry/);
  assert.match(
    validateStaticPreview(
      `${html}\n<script>window.fake = { daoConsensus: 0.88 }</script>`,
    ).join(" "),
    /fabricate autonomy/,
  );
});

test("all four evidence cards must disclose unavailability", () => {
  const tampered = html.replace(
    'data-evidence-state="unavailable"',
    'data-evidence-state="verified"',
  );
  assert.match(validateStaticPreview(tampered).join(" "), /marked unavailable/);
});

test("an unavailable marker cannot hide misleading visible scientific status", () => {
  const misleadingEvidence = html.replace(
    '<div class="label">Scientific insight</div>\n          <div class="value">not connected</div>',
    '<div class="label">Scientific insight</div>\n          <div class="value">verified</div>',
  );
  assert.match(
    validateStaticPreview(misleadingEvidence).join(" "),
    /values must remain unavailable/,
  );

  const misleadingMode = html.replace(
    '<div class="label">Autonomy mode</div>\n              <div class="value">not connected</div>',
    '<div class="label">Autonomy mode</div>\n              <div class="value">scientific genius</div>',
  );
  assert.match(
    validateStaticPreview(misleadingMode).join(" "),
    /status cards must abstain/,
  );
});

test("a CSS illustration cannot masquerade as a Cubism renderer or FPS source", () => {
  const tampered = html
    .replace("live2d: false", "live2d: true")
    .replace('illustration: "css-only"', 'illustration: "Live2D"');
  assert.match(validateStaticPreview(tampered).join(" "), /non-Cubism/);
  assert.match(
    validateStaticPreview(`${html}\nrequestAnimationFrame(() => {})`).join(" "),
    /frame data/,
  );
});

const BROWSER_ONLY_INSTALL_WORKFLOWS = [
  "../.github/workflows/deploy-preview.yml",
  "../.github/workflows/ci.yml",
  "../.github/workflows/ci22.yml",
  "../.github/workflows/deploy-cloudflare.yml",
  "../.github/workflows/test-edit-message.yml",
];

function frozenLockfileInstallSteps(workflowRelPath) {
  const workflow = parseYaml(
    readFileSync(new URL(workflowRelPath, import.meta.url), "utf8"),
  );
  const steps = [];
  for (const [jobName, job] of Object.entries(workflow.jobs ?? {})) {
    for (const step of job.steps ?? []) {
      if (step?.run?.trim() === "pnpm install --frozen-lockfile") {
        steps.push({ jobName, step });
      }
    }
  }
  return steps;
}

function assertBrowserInstallSkipsElectron(workflowRelPath) {
  const steps = frozenLockfileInstallSteps(workflowRelPath);
  assert.ok(
    steps.length > 0,
    `${workflowRelPath} must keep a frozen-lockfile install`,
  );
  for (const { jobName, step } of steps) {
    const skip = step.env?.ELECTRON_SKIP_BINARY_DOWNLOAD;
    assert.ok(
      skip === 1 || skip === "1",
      `${workflowRelPath} job ${jobName} must skip Electron so a GitHub 503 cannot fail a browser-only install`,
    );
  }
}

test("GitHub Pages install must skip the unused Electron binary download", () => {
  assertBrowserInstallSkipsElectron("../.github/workflows/deploy-preview.yml");
});

test("browser-only CI and deploy installs must skip the unused Electron binary download", () => {
  for (const workflowRelPath of BROWSER_ONLY_INSTALL_WORKFLOWS) {
    assertBrowserInstallSkipsElectron(workflowRelPath);
  }
});

test("cloud-agent browser install must skip the unused Electron binary download", () => {
  const installScript = readFileSync(
    new URL("./cloud-agent-install.sh", import.meta.url),
    "utf8",
  );
  assert.match(
    installScript,
    /ELECTRON_SKIP_BINARY_DOWNLOAD=1\s+pnpm install --frozen-lockfile/,
    "cloud-agent-install.sh must skip Electron so a GitHub 503 cannot fail the browser environment",
  );
});

const RELEASE_WORKFLOW_PATH = "../.github/workflows/release.yml";
const RELEASE_PREREQUISITES = [
  "pnpm run build:type-deps",
  "pnpm --filter=@deltecho/avatar build",
  "pnpm --filter=deep-tree-echo-orchestrator build",
];

function releaseWorkflow() {
  return parseYaml(
    readFileSync(new URL(RELEASE_WORKFLOW_PATH, import.meta.url), "utf8"),
  );
}

function stepIndex(steps, predicate, description) {
  const index = steps.findIndex(predicate);
  assert.notEqual(index, -1, description);
  return index;
}

function assertReleasePrerequisitesBeforeBuild(jobName, appBuildCommand) {
  const steps = releaseWorkflow().jobs?.[jobName]?.steps ?? [];
  const installIndex = stepIndex(
    steps,
    (step) => step?.run?.trim() === "pnpm install --frozen-lockfile",
    `release ${jobName} must install with the frozen lockfile`,
  );
  const prerequisiteIndex = stepIndex(
    steps,
    (step) =>
      typeof step?.run === "string" &&
      RELEASE_PREREQUISITES.every((command) => step.run.includes(command)),
    `release ${jobName} must build type dependencies, avatar, and orchestrator`,
  );
  const appBuildIndex = stepIndex(
    steps,
    (step) => step?.run?.trim() === appBuildCommand,
    `release ${jobName} must retain its application build`,
  );

  assert.ok(
    installIndex < prerequisiteIndex,
    `release ${jobName} must build workspace prerequisites after installation`,
  );
  assert.ok(
    prerequisiteIndex < appBuildIndex,
    `release ${jobName} must build workspace prerequisites before the application`,
  );
}

test("release application builds establish workspace prerequisites before compiling", () => {
  assertReleasePrerequisitesBeforeBuild(
    "build-electron",
    "pnpm --filter=@deltachat-desktop/target-electron build",
  );
  assertReleasePrerequisitesBeforeBuild("build-browser", "pnpm build:browser");
  assertReleasePrerequisitesBeforeBuild("build-tauri", "pnpm build:tauri");
});

test("release package build establishes avatar before orchestrator", () => {
  const steps = releaseWorkflow().jobs?.["build-packages"]?.steps ?? [];
  const workspaceBuildIndex = stepIndex(
    steps,
    (step) =>
      typeof step?.run === "string" &&
      RELEASE_PREREQUISITES.every((command) => step.run.includes(command)),
    "release package build must build type dependencies, avatar, and orchestrator",
  );
  const corePackIndex = stepIndex(
    steps,
    (step) => step?.name === "Pack Core",
    "release package build must retain Core packaging",
  );
  assert.ok(
    workspaceBuildIndex < corePackIndex,
    "release package prerequisites must complete before packaging artifacts",
  );
});

test("release skips Electron download only for its browser build", () => {
  const jobs = releaseWorkflow().jobs ?? {};
  const browserInstallIndex = stepIndex(
    jobs["build-browser"]?.steps ?? [],
    (step) => step?.run?.trim() === "pnpm install --frozen-lockfile",
    "release browser job must install dependencies",
  );
  const browserInstall = jobs["build-browser"].steps[browserInstallIndex];
  assert.equal(
    browserInstall.env?.ELECTRON_SKIP_BINARY_DOWNLOAD,
    "1",
    "release browser install must skip an unused Electron download",
  );

  for (const jobName of ["build-electron", "build-tauri"]) {
    const installIndex = stepIndex(
      jobs[jobName]?.steps ?? [],
      (step) => step?.run?.trim() === "pnpm install --frozen-lockfile",
      `release ${jobName} must install dependencies`,
    );
    assert.equal(
      jobs[jobName].steps[installIndex].env?.ELECTRON_SKIP_BINARY_DOWNLOAD,
      undefined,
      `release ${jobName} must keep Electron binary downloads enabled for packaging`,
    );
  }
});
