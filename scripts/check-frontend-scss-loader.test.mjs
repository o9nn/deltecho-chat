import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const buildFrontendTs = readFileSync(
  new URL("../packages/frontend/bin/build-frontend-ts.mjs", import.meta.url),
  "utf8",
);

test("esbuild compiles colocated .scss, not only CSS modules", () => {
  assert.match(
    buildFrontendTs,
    /filter:\s*\/\\.\s*scss\$\//,
    "sass plugin must load every .scss file; a *.module.scss-only filter fails Live2DAvatar.scss on the main.tsx graph",
  );
  assert.doesNotMatch(
    buildFrontendTs,
    /filter:\s*\/\\\.module\\\.scss\$\//,
    'a module-only onLoad filter leaves import "./Live2DAvatar.scss" with no loader',
  );
  assert.match(
    buildFrontendTs,
    /local-css/,
    "CSS modules must keep the hashed local-css loader",
  );
  assert.match(
    buildFrontendTs,
    /loader:\s*args\.path\.endsWith\("\.module\.scss"\)\s*\?\s*"local-css"\s*:\s*"css"/,
    "plain .scss must compile as global css so overlay containment ships in bundle.css",
  );
});

test("pnpm check refuses a module-only sass filter", () => {
  assert.match(
    pkg.scripts?.check ?? "",
    /\bcheck:frontend-scss-loader\b/,
    "root check must run the frontend SCSS loader contract",
  );
  assert.equal(
    pkg.scripts?.["check:frontend-scss-loader"],
    "node --test ./scripts/check-frontend-scss-loader.test.mjs",
  );
});
