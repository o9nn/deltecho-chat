#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const vendorRoot = resolve(root, "third_party/purism-core");
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function copyLive2dCore({
  destination,
  backend = process.env.DELTECHO_CUBISM_CORE || "cubism",
}) {
  if (!["cubism", "purism"].includes(backend)) {
    throw new Error(
      `Unsupported DELTECHO_CUBISM_CORE: ${backend}; choose cubism or purism`,
    );
  }
  let bytes;
  let metadata;
  let license;
  if (backend === "purism") {
    const provenance = JSON.parse(
      readFileSync(resolve(vendorRoot, "1.1.0/provenance.json"), "utf8"),
    );
    const verified = (name) => {
      const value = readFileSync(resolve(vendorRoot, name));
      const expected = provenance.files[name];
      if (
        !expected ||
        digest(value) !== expected.sha256 ||
        value.length !== expected.bytes
      ) {
        throw new Error(
          `Purism vendor integrity mismatch: ${name}; no fallback`,
        );
      }
      return value;
    };
    const core = verified("1.1.0/core-v5.js");
    license = verified("1.1.0/LICENSE");
    const adapter = readFileSync(
      resolve(root, "scripts/purism-cubism4-adapter.js"),
    );
    bytes = Buffer.concat([
      core,
      Buffer.from("\n"),
      adapter,
      Buffer.from("\ninstallDtePurismCubism4(globalThis.PurismCore);\n"),
    ]);
    metadata = {
      backend,
      release: provenance.release,
      hostAbi: "v5",
      sourceRevision: provenance.source_revision,
      upstreamCoreSha256: digest(core),
      packagedCoreSha256: digest(bytes),
      license: "MIT; see purism-core.LICENSE",
      modelRights:
        "Independent; runtime license is not character/export approval",
    };
  } else {
    bytes = readFileSync(
      resolve(root, "packages/frontend/static/live2dcubismcore.min.js"),
    );
    metadata = {
      backend,
      packagedCoreSha256: digest(bytes),
      selection: "unchanged existing default",
    };
  }
  // Validate everything before writing. Invalid selections/vendor bytes fail the build.
  mkdirSync(destination, { recursive: true });
  writeFileSync(resolve(destination, "live2dcubismcore.min.js"), bytes);
  writeFileSync(
    resolve(destination, "live2d-core-runtime.json"),
    `${JSON.stringify(metadata, null, 2)}\n`,
  );
  if (license)
    writeFileSync(resolve(destination, "purism-core.LICENSE"), license);
  return metadata;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const destination = resolve(
    process.argv[2] || resolve(root, "packages/frontend/html-dist"),
  );
  try {
    console.log(JSON.stringify(copyLive2dCore({ destination })));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
