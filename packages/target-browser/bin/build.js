import { build } from "esbuild";
import { gatherBuildInfo } from "../../../bin/lib/gather-version-info.js";

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

await build({
  bundle: true,
  sourcemap: true,
  format: "esm",
  platform: "node",
  outfile: "dist/server.js",
  entryPoints: ["src/index.ts"],
  treeShaking: false,
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

console.log(BuildInfoString);
