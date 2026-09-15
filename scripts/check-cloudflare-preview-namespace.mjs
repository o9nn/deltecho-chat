#!/usr/bin/env node
/**
 * Guard the Durable Object namespace used by Cloudflare preview deploys.
 *
 * Workers Builds (root wrangler.jsonc) and GitHub Actions on main
 * (packages/target-browser/wrangler.jsonc default) both upload onto live
 * script deltecho-chat-preview. That script's remote class is
 * DeltEchoContainer. A v2 rename onto DeltEchoApp fails Cloudflare API 10074.
 * PR deploys use --env preview, which binds DeltEchoApp on a separate script.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function parseJsonc(path) {
  const raw = readFileSync(path, "utf8");
  const stripped = raw
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  return JSON.parse(stripped);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function classNames(config) {
  const fromContainers = (config.containers || []).map(c => c.class_name);
  const fromBindings = (config.durable_objects?.bindings || []).map(
    b => b.class_name,
  );
  return [...fromContainers, ...fromBindings];
}

function hasRenameToApp(migrations) {
  return (migrations || []).some(migration =>
    (migration.renamed_classes || []).some(
      rename =>
        rename.from === "DeltEchoContainer" && rename.to === "DeltEchoApp",
    ),
  );
}

const workerSource = readFileSync(
  join(repoRoot, "packages/target-browser/cloudflare/worker.ts"),
  "utf8",
);
assert(
  /export class DeltEchoContainer /.test(workerSource),
  "worker.ts must export DeltEchoContainer",
);
assert(
  /export class DeltEchoApp /.test(workerSource),
  "worker.ts must export DeltEchoApp so leftover App objects do not 10064",
);

const root = parseJsonc(join(repoRoot, "wrangler.jsonc"));
assert(
  root.name === "deltecho-chat-preview",
  "root wrangler.jsonc must target deltecho-chat-preview",
);
assert(
  classNames(root).every(name => name === "DeltEchoContainer"),
  "root wrangler.jsonc must bind DeltEchoContainer to match the live script",
);
assert(
  !hasRenameToApp(root.migrations),
  "root wrangler.jsonc must not rename DeltEchoContainer to DeltEchoApp (10074)",
);
assert(
  root.migrations?.length === 1 &&
    root.migrations[0].tag === "v1" &&
    root.migrations[0].new_sqlite_classes?.[0] === "DeltEchoContainer",
  "root wrangler.jsonc must keep only the already-applied v1 DeltEchoContainer migration",
);

const packageConfig = parseJsonc(
  join(repoRoot, "packages/target-browser/wrangler.jsonc"),
);
assert(
  classNames(packageConfig).every(name => name === "DeltEchoContainer"),
  "target-browser default wrangler must bind DeltEchoContainer for main deploys",
);
assert(
  !hasRenameToApp(packageConfig.migrations),
  "target-browser default wrangler must not rename DeltEchoContainer to DeltEchoApp",
);

const preview = packageConfig.env?.preview;
assert(preview, "target-browser wrangler must keep env.preview for PR deploys");
assert(
  classNames(preview).every(name => name === "DeltEchoApp"),
  "env.preview must bind DeltEchoApp on deltecho-chat-preview-preview",
);
assert(
  !hasRenameToApp(preview.migrations),
  "env.preview must not replay a Container→App rename",
);
assert(
  preview.migrations?.[0]?.new_sqlite_classes?.[0] === "DeltEchoApp",
  "env.preview v1 must create DeltEchoApp rather than rename onto it",
);

console.log("cloudflare preview namespace check passed");
