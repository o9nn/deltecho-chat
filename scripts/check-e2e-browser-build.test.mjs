/* eslint-disable no-console */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { parse as parseYaml } from "yaml";
import { gatherBuildInfo } from "../bin/lib/gather-version-info.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const frontendRequire = createRequire(
  new URL("../packages/frontend/package.json", import.meta.url),
);
const esbuild = frontendRequire("esbuild");
const { compile } = frontendRequire("sass");

const read = (rel) => readFileSync(path.join(root, rel), "utf8");

const BROWSER_BUILD_WORKFLOWS = [
  [".github/workflows/ci22.yml", "Build for E2E"],
  [".github/workflows/deploy-preview.yml", "Build Browser Target"],
  [".github/workflows/ci.yml", "Build for E2E"],
  [".github/workflows/test-edit-message.yml", "Build for E2E"],
];

const PLAIN_SCSS_IMPORTERS = [
  "packages/frontend/src/components/AICompanionHub/Live2DAvatar.tsx",
  "packages/frontend/src/components/AICompanionHub/AICompanionHub.tsx",
  "packages/frontend/src/components/AICompanionHub/VideoCalibrationLab.tsx",
];

test("esbuild sass plugin compiles plain .scss, not only CSS modules", () => {
  const source = read("packages/frontend/bin/build-frontend-ts.mjs");
  assert.match(
    source,
    /filter:\s*\/\\.scss\$\//,
    "sass plugin must load every .scss file the chat path imports",
  );
  assert.doesNotMatch(
    source,
    /filter:\s*\/\\.module\\.scss\$\//,
    "a module-only filter leaves Live2DAvatar.scss without a loader",
  );
  assert.match(source, /endsWith\("\.module\.scss"\)/);
  assert.match(source, /\? "local-css" : "css"/);

  for (const rel of PLAIN_SCSS_IMPORTERS) {
    assert.match(
      read(rel),
      /import\s+["']\.\/[^"']+\.scss["']/,
      `${rel} must keep its colocated SCSS import on the browser graph`,
    );
  }
});

test("plain Live2D SCSS compiles and esbuild can bundle it as global CSS", async () => {
  const scssPath = path.join(
    root,
    "packages/frontend/src/components/AICompanionHub/Live2DAvatar.scss",
  );
  const { css } = compile(scssPath);
  assert.match(css, /live2d-avatar/);

  const dir = mkdtempSync(path.join(tmpdir(), "e2e-browser-scss-"));
  const entry = path.join(dir, "entry.js");
  const outfile = path.join(dir, "out.js");
  writeFileSync(entry, `import ${JSON.stringify(scssPath)};\n`, "utf8");
  try {
    await esbuild.build({
      entryPoints: [entry],
      bundle: true,
      write: true,
      outfile,
      logLevel: "silent",
      plugins: [
        {
          name: "sass",
          setup(build) {
            build.onLoad({ filter: /\.scss$/ }, (args) => {
              const compiled = compile(args.path);
              const loader = args.path.endsWith(".module.scss")
                ? "local-css"
                : "css";
              return { contents: compiled.css, loader };
            });
          },
        },
      ],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("browser E2E/Pages builds pass VERSION_INFO_GIT_REF like Cloudflare", () => {
  for (const [rel, stepName] of BROWSER_BUILD_WORKFLOWS) {
    const doc = parseYaml(read(rel));
    const jobs = Object.values(doc.jobs || {});
    const step = jobs
      .flatMap((job) => job.steps || [])
      .find((s) => s.name === stepName);
    assert.ok(step, `${rel} must have step ${stepName}`);
    assert.match(
      String(step.run || ""),
      /pnpm build:browser/,
      `${rel} ${stepName} must run the browser target`,
    );
    assert.equal(
      step.env?.VERSION_INFO_GIT_REF,
      "${{ github.sha }}",
      `${rel} ${stepName} must pin VERSION_INFO_GIT_REF so untagged clones do not announce git describe Error`,
    );
  }
});

test("version gatherer uses git describe --always and does not misspell manually", () => {
  const source = read("bin/lib/gather-version-info.js");
  assert.match(source, /\['describe',\s*'--tags',\s*'--always'\]/);
  assert.doesNotMatch(source, /\['describe',\s*'--tags'\]/);
  assert.match(source, /VERSION_INFO_GIT_REF manually/);
  assert.doesNotMatch(source, /manualy/);
});

test("VERSION_INFO_GIT_REF is used when set", async () => {
  const prev = process.env.VERSION_INFO_GIT_REF;
  process.env.VERSION_INFO_GIT_REF = "e5950146-test-ref";
  try {
    const info = await gatherBuildInfo();
    assert.equal(info.GIT_REF, "e5950146-test-ref");
  } finally {
    if (prev === undefined) delete process.env.VERSION_INFO_GIT_REF;
    else process.env.VERSION_INFO_GIT_REF = prev;
  }
});

test("untagged work trees still produce a git ref without logging Error", async () => {
  const prev = process.env.VERSION_INFO_GIT_REF;
  delete process.env.VERSION_INFO_GIT_REF;
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => {
    logs.push(args.map(String).join(" "));
  };
  try {
    const info = await gatherBuildInfo();
    assert.ok(info.GIT_REF);
    assert.notEqual(info.GIT_REF, "unknown");
    assert.equal(
      logs.some((line) => /No names found|Error:/.test(line)),
      false,
      `untagged describe must not announce Error; got ${logs.join(" | ")}`,
    );
  } finally {
    console.log = originalLog;
    if (prev === undefined) delete process.env.VERSION_INFO_GIT_REF;
    else process.env.VERSION_INFO_GIT_REF = prev;
  }
});
