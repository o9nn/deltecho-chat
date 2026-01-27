import { build } from "esbuild";
import { gatherBuildInfo } from "../../../bin/lib/gather-version-info.js";
import { stat } from "fs/promises";

const BuildInfoString = JSON.stringify(await gatherBuildInfo());

// Check if we're building for Cloudflare containers (bundle all deps)
const isCloudflare = process.env.CLOUDFLARE_BUILD === "true";
console.log(`CLOUDFLARE_BUILD=${process.env.CLOUDFLARE_BUILD}, isCloudflare=${isCloudflare}`);

// Banner to inject a proper require function that handles Node.js built-ins
// This is needed because esbuild's ESM output creates a require shim that doesn't
// properly handle Node.js built-in modules when bundling CommonJS packages
const requireShimBanner = `
import { createRequire as __createRequire } from 'module';
const require = __createRequire(import.meta.url);
`;

const result = await build({
  bundle: true,
  sourcemap: true,
  format: "esm",
  platform: "node",
  outfile: "dist/server.js",
  entryPoints: ["src/index.ts"],
  treeShaking: false,
  metafile: true, // Enable metafile for size analysis
  // Inject the require shim for Cloudflare builds
  banner: isCloudflare ? { js: requireShimBanner } : undefined,
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
