import { build } from "esbuild";
import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, "dist");
await mkdir(out, { recursive: true });
await build({
  entryPoints: [join(root, "src/broker.ts")],
  outfile: join(out, "broker.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  legalComments: "none",
  logLevel: "warning",
});
await build({
  entryPoints: [join(root, "src/client.ts")],
  outfile: join(out, "client.js"),
  bundle: true,
  platform: "browser",
  format: "esm",
  target: "es2022",
  minify: true,
  legalComments: "none",
  logLevel: "warning",
});
await copyFile(join(root, "src/index.html"), join(out, "index.html"));
console.log(
  "AIRI presentation broker bundled (no daemon or model asset embedded).",
);
