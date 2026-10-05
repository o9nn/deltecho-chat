import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const buildScript = readFileSync(
  new URL("../packages/frontend/bin/build-frontend-ts.mjs", import.meta.url),
  "utf8",
);

test("frontend esbuild compiles plain .scss imports from the main bundle", () => {
  assert.match(
    buildScript,
    /onLoad\(\s*\{\s*filter:\s*\/\\.scss\$\//,
    "sass plugin must load all .scss files; Live2DAvatar.tsx imports Live2DAvatar.scss and is reachable from main.tsx",
  );
  assert.doesNotMatch(
    buildScript,
    /filter:\s*\/\\.module\\.scss\$\//,
    "a module-only sass filter leaves plain .scss imports without a loader and fails pnpm build:browser",
  );
});
