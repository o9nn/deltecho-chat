import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

test("agent-facing TypeScript CLIs use tsx on this Node ESM tree", () => {
  for (const name of ["start:bot", "memory:lever"]) {
    const script = pkg.scripts?.[name];
    assert.equal(typeof script, "string", `${name} must be defined`);
    assert.match(
      script,
      /\btsx\b/,
      `${name} must use tsx; ts-node fails with ERR_UNKNOWN_FILE_EXTENSION`,
    );
    assert.doesNotMatch(
      script,
      /\bts-node\b/,
      `${name} must not call ts-node on this ESM tree`,
    );
  }

  for (const rel of ["../bin/dte-memory-lever.ts", "../bin/deltecho-bot.ts"]) {
    const source = readFileSync(new URL(rel, import.meta.url), "utf8");
    assert.match(source, /^#!.*\btsx\b/m, `${rel} shebang must use tsx`);
    assert.doesNotMatch(
      source,
      /\bts-node\b/,
      `${rel} must not mention ts-node on this ESM tree`,
    );
  }
});
