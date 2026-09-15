#!/usr/bin/env node
/**
 * Derive Melody tile-map.json from the shipped mesh-map.json.
 *
 * Node cannot import the extensionless automesh graph, so this delegates
 * to Jest (ts-jest) which already compiles tile-map.ts.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const result = spawnSync(
  "pnpm",
  ["exec", "jest", "--runInBand", "--forceExit", "src/__tests__/tile-map.test.ts"],
  {
    cwd: join(here, ".."),
    env: { ...process.env, WRITE_TILE_MAP: "1" },
    stdio: "inherit",
  },
);
process.exit(result.status ?? 1);
