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

test("GitHub Pages install must skip the unused Electron binary download", () => {
  const workflow = loadWorkflow("../.github/workflows/deploy-preview.yml");
  const installStep = (workflow.jobs?.build?.steps ?? []).find(
    (step) =>
      step?.name === "Install Dependencies" &&
      step?.run === "pnpm install --frozen-lockfile",
  );
  assert.ok(installStep, "Pages workflow must keep a frozen-lockfile install");
  const skip = installStep.env?.ELECTRON_SKIP_BINARY_DOWNLOAD;
  assert.ok(
    skip === 1 || skip === "1",
    "Pages install must skip Electron so a GitHub 503 cannot fail the static preview",
  );
});

function loadWorkflow(relPath) {
  return parseYaml(readFileSync(new URL(relPath, import.meta.url), "utf8"));
}

function stepRun(step) {
  return typeof step?.run === "string" ? step.run : "";
}

function buildsCoreLoggerExport(run) {
  return (
    run.includes("build:type-deps") ||
    run.includes("pnpm --filter=deep-tree-echo-core build")
  );
}

function buildsAvatarPackage(run) {
  return (
    run.includes("build:type-deps") ||
    run.includes("pnpm --filter=@deltecho/avatar build")
  );
}

test("Release frontend jobs emit core logger dist before bundling avatar source", () => {
  const workflow = loadWorkflow("../.github/workflows/release.yml");
  const appBuild = /pnpm build:browser|target-electron build|pnpm build:tauri/;
  for (const name of ["build-browser", "build-electron", "build-tauri"]) {
    const steps = workflow.jobs?.[name]?.steps ?? [];
    const appIdx = steps.findIndex((step) => appBuild.test(stepRun(step)));
    assert.ok(appIdx >= 0, `${name} must keep an app build step`);
    const depIdx = steps.findIndex((step) =>
      buildsCoreLoggerExport(stepRun(step)),
    );
    assert.ok(
      depIdx >= 0 && depIdx < appIdx,
      `${name} must build deep-tree-echo-core (or type-deps) before the app so avatar can resolve deep-tree-echo-core/logger`,
    );
  }
});

test("Release package job builds avatar before orchestrator tsc", () => {
  const workflow = loadWorkflow("../.github/workflows/release.yml");
  const steps = workflow.jobs?.["build-packages"]?.steps ?? [];
  const depStep = steps.find(
    (step) => step?.name === "Build Workspace Dependencies",
  );
  const run = stepRun(depStep);
  assert.ok(run.length > 0, "build-packages must keep a workspace dep build");
  assert.ok(
    buildsAvatarPackage(run),
    "build-packages must compile @deltecho/avatar so orchestrator tsc can resolve it",
  );
  const avatarAt = run.indexOf("@deltecho/avatar build");
  const orchestratorAt = run.indexOf("deep-tree-echo-orchestrator build");
  if (!run.includes("build:type-deps")) {
    assert.ok(
      avatarAt >= 0 && orchestratorAt > avatarAt,
      "explicit avatar build must precede the orchestrator build",
    );
  }
});
