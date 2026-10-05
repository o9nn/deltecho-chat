import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const IMPORT_RE =
  /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g;
const TYPE_ONLY_RE = /^(?:import|export)\s+type\b/;

export function frontendEntryPath(repoRoot = repoRootFromHere()) {
  return path.join(repoRoot, "packages/frontend/src/main.tsx");
}

export function findPlainScssImportsInFrontendBundle(
  entryPath = frontendEntryPath(),
) {
  const queue = [path.resolve(entryPath)];
  const seen = new Set();
  /** @type {{ file: string, spec: string }[]} */
  const hits = [];

  while (queue.length > 0) {
    const file = queue.pop();
    if (!file || seen.has(file)) continue;
    seen.add(file);
    const text = readFileSync(file, "utf8");
    for (const spec of collectModuleSpecifiers(text)) {
      if (spec.endsWith(".scss") && !spec.endsWith(".module.scss")) {
        hits.push({
          file: path.relative(path.dirname(entryPath), file),
          spec,
        });
        continue;
      }
      const next = resolveLocalModule(file, spec);
      if (next) queue.push(next);
    }
  }

  return hits;
}

function collectModuleSpecifiers(text) {
  const specs = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || TYPE_ONLY_RE.test(trimmed)) continue;
    IMPORT_RE.lastIndex = 0;
    let match;
    while ((match = IMPORT_RE.exec(line))) {
      specs.push(match[1]);
    }
  }
  return specs;
}

function resolveLocalModule(fromFile, spec) {
  if (!spec.startsWith(".")) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.mjs`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

function repoRootFromHere() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}
