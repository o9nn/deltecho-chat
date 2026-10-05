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

test("frontend esbuild compiles colocated global SCSS, not only CSS modules", () => {
  const src = readFileSync(
    new URL("../packages/frontend/bin/build-frontend-ts.mjs", import.meta.url),
    "utf8",
  );
  assert.match(
    src,
    /filter:\s*\/\\.scss\$\//,
    "sass plugin must load every .scss import, including Live2DAvatar.scss",
  );
  assert.match(
    src,
    /endsWith\(["']\.module\.scss["']\)\s*\?\s*["']local-css["']\s*:\s*["']css["']/,
    "CSS modules stay hashed; global Live2D/hub SCSS must use the css loader",
  );

  const globalScssHosts = [
    "Live2DAvatar.tsx",
    "AICompanionHub.tsx",
    "VideoCalibrationLab.tsx",
  ];
  for (const file of globalScssHosts) {
    const tsx = readFileSync(
      new URL(
        `../packages/frontend/src/components/AICompanionHub/${file}`,
        import.meta.url,
      ),
      "utf8",
    );
    assert.match(
      tsx,
      /import ["'][^"']+\.scss["']/,
      `${file} must keep its colocated SCSS import`,
    );
    assert.doesNotMatch(
      tsx,
      /import ["'][^"']+\.module\.scss["']/,
      `${file} uses global SCSS class names, not CSS modules`,
    );
  }
});

test("GitHub Pages install must skip the unused Electron binary download", () => {
  const workflow = parseYaml(
    readFileSync(
      new URL("../.github/workflows/deploy-preview.yml", import.meta.url),
      "utf8",
    ),
  );
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
