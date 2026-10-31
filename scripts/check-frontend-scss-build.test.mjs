import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import { sassPlugin } from "../packages/frontend/bin/sass-plugin.mjs";

const requireFrontend = createRequire(
  new URL("../packages/frontend/package.json", import.meta.url),
);
const esbuild = requireFrontend("esbuild");

async function withFixture(callback) {
  const fixtureDir = await mkdtemp(path.join(tmpdir(), "deltecho-scss-"));
  try {
    await callback(fixtureDir);
  } finally {
    await rm(fixtureDir, { recursive: true, force: true });
  }
}

function fixtureBuildOptions(fixtureDir, entryPoint, write = true) {
  return {
    absWorkingDir: fixtureDir,
    bundle: true,
    entryPoints: [entryPoint],
    format: "esm",
    logLevel: "silent",
    outfile: path.join(fixtureDir, "dist", "bundle.mjs"),
    platform: "browser",
    plugins: [sassPlugin],
    write,
  };
}

test("frontend Sass plugin bundles plain SCSS globally and CSS modules locally", async () => {
  await withFixture(async (fixtureDir) => {
    await writeFile(
      path.join(fixtureDir, "entry.mjs"),
      [
        'import "./plain.scss";',
        'import styles from "./scoped.module.scss";',
        "export { styles };",
      ].join("\n"),
    );
    await writeFile(
      path.join(fixtureDir, "plain.scss"),
      ".plain-sentinel { color: rebeccapurple; }\n",
    );
    await writeFile(
      path.join(fixtureDir, "scoped.module.scss"),
      ".scoped-sentinel { color: seagreen; }\n",
    );

    await esbuild.build(fixtureBuildOptions(fixtureDir, "entry.mjs"));

    const css = await readFile(
      path.join(fixtureDir, "dist", "bundle.css"),
      "utf8",
    );
    const bundle = await import(
      `${pathToFileURL(path.join(fixtureDir, "dist", "bundle.mjs")).href}?test`
    );

    assert.match(
      css,
      /\.plain-sentinel\s*\{/,
      "plain SCSS must remain global CSS",
    );
    assert.ok(bundle.styles["scoped-sentinel"], "CSS module export must exist");
    assert.notEqual(
      bundle.styles["scoped-sentinel"],
      "scoped-sentinel",
      "CSS module class must be scope-transformed",
    );
    assert.match(
      css,
      new RegExp(
        `\\.${bundle.styles["scoped-sentinel"].replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        )}\\s*\\{`,
      ),
      "emitted CSS must use the exported scoped class name",
    );
  });
});

test("frontend Sass plugin forwards invalid SCSS as an esbuild build failure", async () => {
  await withFixture(async (fixtureDir) => {
    await writeFile(
      path.join(fixtureDir, "broken-entry.mjs"),
      'import "./broken.scss";\n',
    );
    await writeFile(
      path.join(fixtureDir, "broken.scss"),
      ".broken { color: ; }\n",
    );

    await assert.rejects(
      esbuild.build(fixtureBuildOptions(fixtureDir, "broken-entry.mjs", false)),
      (error) => {
        assert.ok(error.errors?.length, "esbuild must report the Sass failure");
        return true;
      },
    );
  });
});
