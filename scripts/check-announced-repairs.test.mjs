import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parse as parseYaml } from "yaml";

const buildScript = readFileSync(
  new URL("../packages/frontend/bin/build-frontend-ts.mjs", import.meta.url),
  "utf8",
);
const versionInfo = readFileSync(
  new URL("../bin/lib/gather-version-info.js", import.meta.url),
  "utf8",
);
const memoryViz = readFileSync(
  new URL(
    "../packages/frontend/src/components/AICompanionHub/MemoryVisualization.tsx",
    import.meta.url,
  ),
  "utf8",
);
const frontendPkg = JSON.parse(
  readFileSync(
    new URL("../packages/frontend/package.json", import.meta.url),
    "utf8",
  ),
);

test("frontend esbuild loads sidecar .scss imports, not only CSS modules", () => {
  const plugin = buildScript.match(/const sassPlugin = \{[\s\S]*?\n\};/);
  assert.ok(plugin, "sassPlugin must be defined in build-frontend-ts.mjs");
  assert.match(
    plugin[0],
    /filter:\s*\/\\.scss\$\//,
    "sassPlugin must onLoad every .scss file so Live2DAvatar.scss can enter the main bundle",
  );
  assert.doesNotMatch(
    plugin[0],
    /filter:\s*\/\\.module\\.scss\$\//,
    "restricting the loader to .module.scss leaves sidecar stylesheets without a loader",
  );
  assert.match(
    plugin[0],
    /local-css/,
    "CSS modules must keep the local-css loader",
  );
  assert.match(
    plugin[0],
    /["']css["']/,
    "plain .scss imports need the global css loader",
  );

  const globalScssHosts = [
    "Live2DAvatar.tsx",
    "AICompanionHub.tsx",
    "VideoCalibrationLab.tsx",
    "MemoryVisualization.tsx",
  ];
  for (const file of globalScssHosts) {
    const tsx = readFileSync(
      new URL(
        `../packages/frontend/src/components/AICompanionHub/${file}`,
        import.meta.url,
      ),
      "utf8",
    );
    assert.match(
      tsx,
      /import ["'][^"']+\.scss["']/,
      `${file} must keep its colocated SCSS import`,
    );
    assert.doesNotMatch(
      tsx,
      /import ["'][^"']+\.module\.scss["']/,
      `${file} uses global SCSS class names, not CSS modules`,
    );
  }
});

test("Pages and Cloudflare pass VERSION_INFO_GIT_REF into build:browser", () => {
  for (const workflowRelPath of [
    "../.github/workflows/deploy-preview.yml",
    "../.github/workflows/deploy-cloudflare.yml",
  ]) {
    const workflow = parseYaml(
      readFileSync(new URL(workflowRelPath, import.meta.url), "utf8"),
    );
    const steps = Object.values(workflow.jobs ?? {}).flatMap(
      (job) => job.steps ?? [],
    );
    const buildStep = steps.find(
      (step) =>
        step?.name === "Build Browser Target" &&
        String(step?.run ?? "").includes("pnpm build:browser"),
    );
    assert.ok(buildStep, `${workflowRelPath} must keep Build Browser Target`);
    assert.equal(
      buildStep.env?.VERSION_INFO_GIT_REF,
      "${{ github.sha }}",
      `${workflowRelPath} must pin GIT_REF so untagged clones do not announce git describe failure`,
    );
  }
});

test("untagged describe uses --always instead of throwing No names found", () => {
  assert.match(
    versionInfo,
    /describe',\s*'--tags',\s*'--always'/,
    "git describe must keep --always so a tagless Pages checkout is not an Error",
  );
  assert.doesNotMatch(
    versionInfo,
    /describe',\s*'--tags'\]/,
    "describe --tags without --always re-announces fatal: No names found",
  );
});

test("memory graph announces load failure and keeps Retry", () => {
  assert.match(memoryViz, /Consciousness graph failed to load/);
  assert.match(memoryViz, /setLoadError/);
  assert.match(memoryViz, /setLoadAttempt/);
  assert.match(memoryViz, /three-spritetext/);
  assert.ok(frontendPkg.dependencies["3d-force-graph"]);
  assert.ok(frontendPkg.dependencies["three-spritetext"]);
});
