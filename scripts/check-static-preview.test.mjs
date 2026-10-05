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

test("release browser-only install must skip the unused Electron binary download", () => {
  const steps = frozenLockfileInstallSteps(
    "../.github/workflows/release.yml",
  ).filter(({ jobName }) => jobName === "build-browser");
  assert.ok(
    steps.length > 0,
    "release.yml build-browser must keep a frozen-lockfile install",
  );
  for (const { step } of steps) {
    const skip = step.env?.ELECTRON_SKIP_BINARY_DOWNLOAD;
    assert.ok(
      skip === 1 || skip === "1",
      "release.yml build-browser must skip Electron; packaging jobs stay unskipped",
    );
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
