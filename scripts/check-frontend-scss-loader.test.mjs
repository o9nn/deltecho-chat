import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const frontendDir = fileURLToPath(
  new URL("../packages/frontend/", import.meta.url),
);
const require = createRequire(
  new URL("../packages/frontend/package.json", import.meta.url),
);
const esbuild = require("esbuild");
const { compile } = require("sass");

function sassPlugin() {
  return {
    name: "sass",
    setup(build) {
      build.onLoad({ filter: /\.scss$/ }, (args) => {
        const { css } = compile(args.path);
        return {
          contents: css,
          loader: args.path.endsWith(".module.scss") ? "local-css" : "css",
        };
      });
    },
  };
}

test("frontend esbuild compiles colocated non-module Live2DAvatar.scss", async () => {
  const source = readFileSync(
    new URL("../packages/frontend/bin/build-frontend-ts.mjs", import.meta.url),
    "utf8",
  );
  assert.match(
    source,
    /filter:\s*\/\\.scss\$\//,
    "sassPlugin must load every .scss file, not only .module.scss",
  );
  assert.match(
    source,
    /loader:\s*args\.path\.endsWith\("\.module\.scss"\) \? "local-css" : "css"/,
    "plain .scss must use the css loader so Pages/Cloudflare build:browser can bundle Live2DAvatar.tsx",
  );

  const dir = await mkdtemp(path.join(tmpdir(), "dte-scss-loader-"));
  const entry = path.join(dir, "entry.js");
  const scss = path.join(
    frontendDir,
    "src/components/AICompanionHub/Live2DAvatar.scss",
  );
  await writeFile(entry, `import ${JSON.stringify(scss)};\n`, "utf8");
  try {
    const result = await esbuild.build({
      absWorkingDir: frontendDir,
      entryPoints: [entry],
      bundle: true,
      write: false,
      outfile: path.join(dir, "out.js"),
      logLevel: "silent",
      plugins: [sassPlugin()],
    });
    const css = result.outputFiles.map((file) => file.text).join("\n");
    assert.match(
      css,
      /live2d-error-overlay/,
      "compiled Live2DAvatar.scss must keep overlay containment selectors",
    );
    assert.equal(result.errors.length, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
