import { build } from "esbuild";
import { gatherBuildInfo } from "../../../bin/lib/gather-version-info.js";
import { stat, writeFile, unlink } from "fs/promises";

const BuildInfoString = JSON.stringify(await gatherBuildInfo());

// Check if we're building for Cloudflare containers (bundle all deps)
const isCloudflare = process.env.CLOUDFLARE_BUILD === "true";
console.log(`CLOUDFLARE_BUILD=${process.env.CLOUDFLARE_BUILD}, isCloudflare=${isCloudflare}`);

// Create a polyfill file for ESM compatibility when bundling CommonJS packages
// This is needed because:
// 1. esbuild's ESM output creates a require shim that doesn't properly handle Node.js built-ins
// 2. Some CommonJS packages (like write-file-atomic) use __filename and __dirname which don't exist in ESM
const polyfillPath = "src/__esm_polyfills.js";
if (isCloudflare) {
  await writeFile(
    polyfillPath,
    `// ESM polyfills for CommonJS compatibility
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Create require function for CommonJS modules
globalThis.require = createRequire(import.meta.url);

// Create __filename and __dirname for CommonJS modules that use them
// Using globalThis to make them available globally
globalThis.__filename = fileURLToPath(import.meta.url);
globalThis.__dirname = dirname(globalThis.__filename);
`
  );
}

try {
  const result = await build({
    bundle: true,
    sourcemap: true,
    format: "esm",
    platform: "node",
    outfile: "dist/server.js",
    entryPoints: ["src/index.ts"],
    treeShaking: false,
    metafile: true, // Enable metafile for size analysis
    // Inject the polyfills at the start of the bundle for Cloudflare builds
    inject: isCloudflare ? [polyfillPath] : undefined,
    plugins: isCloudflare
      ? []
      : [
          {
            name: "bundle shared",
            setup(build) {
              build.onResolve({ filter: /.*/ }, (args) => {
                if (
                  args.kind === "import-statement" &&
                  !args.path.startsWith(".") &&
                  !args.path.startsWith("@deltachat-desktop/shared")
                ) {
                  return { external: true };
                }
              });
            },
          },
        ],
    define: {
      BUILD_INFO_JSON_STRING: `"${BuildInfoString.replace(/"/g, '\\"')}"`,
    },
  });

  // Output file size information
  const serverJsStats = await stat("dist/server.js");
  const serverJsSize = (serverJsStats.size / 1024 / 1024).toFixed(2);
  console.log(`Built dist/server.js: ${serverJsSize}MB`);

  // Show external dependencies if any (for debugging)
  if (result.metafile) {
    const outputs = result.metafile.outputs;
    for (const [file, info] of Object.entries(outputs)) {
      if (file.endsWith(".js")) {
        console.log(`  ${file}: ${(info.bytes / 1024 / 1024).toFixed(2)}MB`);
        if (info.imports && info.imports.length > 0) {
          const externalImports = info.imports.filter((i) => i.external);
          if (externalImports.length > 0) {
            console.log(`  External imports: ${externalImports.map((i) => i.path).join(", ")}`);
          }
        }
      }
    }
  }

  console.log(BuildInfoString);
} finally {
  // Clean up the polyfill file
  if (isCloudflare) {
    try {
      await unlink(polyfillPath);
    } catch {
      // Ignore errors if file doesn't exist
    }
  }
}
