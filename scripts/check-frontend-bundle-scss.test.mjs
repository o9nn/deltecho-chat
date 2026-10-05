import assert from "node:assert/strict";
import { test } from "node:test";
import { findPlainScssImportsInFrontendBundle } from "./check-frontend-bundle-scss.mjs";

test("frontend esbuild graph must not import plain SCSS", () => {
  const hits = findPlainScssImportsInFrontendBundle();
  assert.deepEqual(
    hits,
    [],
    `esbuild only loads .module.scss; plain imports break pnpm build:browser: ${JSON.stringify(hits)}`,
  );
});
