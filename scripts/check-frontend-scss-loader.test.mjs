import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(
  new URL("../packages/frontend/bin/build-frontend-ts.mjs", import.meta.url),
  "utf8",
);

test("frontend esbuild compiles component SCSS, not only CSS modules", () => {
  assert.match(
    source,
    /filter:\s*\/\\.scss\$\//,
    "sass plugin must load plain .scss so Live2DAvatar.scss can bundle",
  );
  assert.match(
    source,
    /loader:\s*args\.path\.endsWith\("\.module\.scss"\) \? "local-css" : "css"/,
    "plain component SCSS must use the global css loader",
  );
  assert.match(
    readFileSync(
      new URL(
        "../packages/frontend/src/components/AICompanionHub/Live2DAvatar.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    /import ["']\.\/Live2DAvatar\.scss["']/,
    "Live2D Failed overlay styles stay imported from the avatar component",
  );
});
