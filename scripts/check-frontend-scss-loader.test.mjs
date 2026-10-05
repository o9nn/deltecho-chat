import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const buildScript = readFileSync(
  new URL("../packages/frontend/bin/build-frontend-ts.mjs", import.meta.url),
  "utf8",
);

test("frontend esbuild loads sidecar .scss imports, not only CSS modules", () => {
  const plugin = buildScript.match(/const sassPlugin = \{[\s\S]*?\n\};/);
  assert.ok(plugin, "sassPlugin must be defined in build-frontend-ts.mjs");
  assert.match(
    plugin[0],
    /filter:\s*\/\\.scss\$\//,
    "sassPlugin must onLoad every .scss file so Live2DAvatar.scss can enter the main bundle",
  );
  assert.doesNotMatch(
    plugin[0],
    /filter:\s*\/\\.module\\.scss\$\//,
    "restricting the loader to .module.scss leaves sidecar stylesheets without a loader",
  );
  assert.match(
    plugin[0],
    /local-css/,
    "CSS modules must keep the local-css loader",
  );
  assert.match(
    plugin[0],
    /["']css["']/,
    "plain .scss imports need the global css loader",
  );
});
