import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { copyLive2dCore } from "./copy-live2d-core.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function fixture(fn) {
  const destination = mkdtempSync(resolve(tmpdir(), "dte-core-selection-"));
  try {
    return fn(destination);
  } finally {
    rmSync(destination, { recursive: true, force: true });
  }
}

test("unset/default selection preserves the existing Cubism core bytes exactly", () =>
  fixture((destination) => {
    const result = copyLive2dCore({ destination, backend: "cubism" });
    assert.equal(result.backend, "cubism");
    assert.deepEqual(
      readFileSync(resolve(destination, "live2dcubismcore.min.js")),
      readFileSync(
        resolve(root, "packages/frontend/static/live2dcubismcore.min.js"),
      ),
    );
  }));

test("Purism package contains reviewed real v5 bytes and binds native adapter, not a test fixture", () =>
  fixture((destination) => {
    const result = copyLive2dCore({ destination, backend: "purism" });
    const output = readFileSync(
      resolve(destination, "live2dcubismcore.min.js"),
    );
    const vendor = readFileSync(
      resolve(root, "third_party/purism-core/1.1.0/core-v5.js"),
    );
    assert.deepEqual(output.subarray(0, vendor.length), vendor);
    assert.match(
      output.toString(),
      /installDtePurismCubism4\(globalThis\.PurismCore\)/,
    );
    assert.equal(result.hostAbi, "v5");
    assert.match(
      readFileSync(resolve(destination, "purism-core.LICENSE"), "utf8"),
      /MIT License/,
    );
    assert.equal(existsSync(resolve(destination, "fixture.moc3")), false);
    assert.equal(existsSync(resolve(destination, "core-v6.js")), false);
  }));

test("switching back to default replaces a prior Purism core rather than retaining it", () =>
  fixture((destination) => {
    copyLive2dCore({ destination, backend: "purism" });
    copyLive2dCore({ destination, backend: "cubism" });
    assert.deepEqual(
      readFileSync(resolve(destination, "live2dcubismcore.min.js")),
      readFileSync(
        resolve(root, "packages/frontend/static/live2dcubismcore.min.js"),
      ),
    );
    assert.equal(
      JSON.parse(readFileSync(resolve(destination, "live2d-core-runtime.json")))
        .backend,
      "cubism",
    );
  }));

test("invalid backend fails before creating any output and cannot silently fall back", () =>
  fixture((destination) => {
    const absent = resolve(destination, "not-created");
    assert.throws(
      () => copyLive2dCore({ destination: absent, backend: "purism-v6" }),
      /Unsupported/,
    );
    assert.equal(existsSync(absent), false);
  }));
