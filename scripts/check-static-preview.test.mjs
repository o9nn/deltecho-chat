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

function readWorkflow(name) {
  return parseYaml(
    readFileSync(
      new URL(`../.github/workflows/${name}`, import.meta.url),
      "utf8",
    ),
  );
}

function frozenInstallSteps(job) {
  return (job?.steps ?? []).filter(
    (step) =>
      typeof step?.run === "string" &&
      step.run.includes("pnpm install --frozen-lockfile"),
  );
}

function assertInstallSkipsElectron(workflowFile, jobName, reason) {
  const workflow = readWorkflow(workflowFile);
  const steps = frozenInstallSteps(workflow.jobs?.[jobName]);
  assert.ok(
    steps.length > 0,
    `${workflowFile} ${jobName} must keep a frozen-lockfile install`,
  );
  for (const step of steps) {
    const skip = step.env?.ELECTRON_SKIP_BINARY_DOWNLOAD;
    assert.ok(skip === 1 || skip === "1", reason);
  }
}

test("GitHub Pages install must skip the unused Electron binary download", () => {
  assertInstallSkipsElectron(
    "deploy-preview.yml",
    "build",
    "Pages install must skip Electron so a GitHub 503 cannot fail the static preview",
  );
});

test("browser-only CI and deploy installs must skip the unused Electron binary download", () => {
  const reason =
    "browser-only install must skip Electron so a GitHub 503 cannot fail CI or deploy";
  assertInstallSkipsElectron("ci.yml", "check-and-test", reason);
  assertInstallSkipsElectron("ci22.yml", "check-and-test", reason);
  assertInstallSkipsElectron("deploy-cloudflare.yml", "deploy", reason);
  assertInstallSkipsElectron(
    "test-edit-message.yml",
    "test-edit-message",
    reason,
  );
  assertInstallSkipsElectron("release.yml", "build-browser", reason);
});

test("Electron release packaging must still download the Electron binary", () => {
  const steps = frozenInstallSteps(
    readWorkflow("release.yml").jobs?.["build-electron"],
  );
  assert.ok(
    steps.length > 0,
    "release.yml build-electron must keep a frozen-lockfile install",
  );
  for (const step of steps) {
    assert.ok(
      step.env?.ELECTRON_SKIP_BINARY_DOWNLOAD == null,
      "Electron packaging install must not skip the Electron binary",
    );
  }
});
