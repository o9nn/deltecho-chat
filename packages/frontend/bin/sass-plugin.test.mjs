import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import { sassPlugin } from "./sass-plugin.mjs";

const companionHub = path.join(
  fileURLToPath(new URL("..", import.meta.url)),
  "src/components/AICompanionHub",
);

test("frontend esbuild compiles colocated plain SCSS, not only CSS modules", async () => {
  const pluginSource = readFileSync(
    new URL("./sass-plugin.mjs", import.meta.url),
    "utf8",
  );
  assert.match(pluginSource, /filter:\s*\/\\.scss\$\//);
  assert.match(pluginSource, /local-css/);
  assert.match(pluginSource, /"css"/);

  const result = await esbuild.build({
    stdin: {
      contents: `
        import "./Live2DAvatar.scss";
        import "./VideoCalibrationLab.scss";
        import "./MemoryVisualization.scss";
      `,
      resolveDir: companionHub,
      loader: "js",
    },
    bundle: true,
    write: false,
    outfile: "bundle.js",
    plugins: [sassPlugin],
    logLevel: "silent",
  });

  const css = result.outputFiles.map((file) => file.text).join("\n");
  assert.match(css, /\.live2d-avatar-container/);
  assert.match(css, /\.live2d-error-overlay/);
  assert.match(css, /\.memory-visualization/);
});
