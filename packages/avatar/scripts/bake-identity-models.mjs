#!/usr/bin/env node
/**
 * Bake a complete Cubism package per identity.
 *
 * Each folder owns its own `*_t03.moc3` / model3 / mesh-map. Melody never
 * loads Miara's model path.
 */
import {
  cpSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../..");
const modelsRoot = join(repoRoot, "frontend/static/models");
const miaraDir = join(modelsRoot, "miara");
const melodyStillAtlas = join(
  repoRoot,
  "frontend/static/images/avatar/identities/melody-atlas.png",
);
const melodyStill = join(
  repoRoot,
  "frontend/static/images/avatar/identities/melody.webp",
);
const paintScript = join(here, "paint-identity-texture.py");

function identityStem(identity) {
  return identity === "miara" ? "miara_pro_t03" : `${identity}_t03`;
}

function copyIdentityTree(destDir, identity) {
  mkdirSync(destDir, { recursive: true });
  const stem = identityStem(identity);
  copyFileSync(join(miaraDir, "miara_pro_t03.moc3"), join(destDir, `${stem}.moc3`));
  copyFileSync(
    join(miaraDir, "miara_pro_t03.cdi3.json"),
    join(destDir, `${stem}.cdi3.json`),
  );
  cpSync(join(miaraDir, "expressions"), join(destDir, "expressions"), {
    recursive: true,
  });
  cpSync(join(miaraDir, "motion"), join(destDir, "motion"), {
    recursive: true,
  });
  for (const leftover of [
    "miara_pro_t03.moc3",
    "miara_pro_t03.cdi3.json",
    `${identity}.model3.json`,
    `${identity}.physics3.json`,
  ]) {
    const path = join(destDir, leftover);
    if (existsSync(path)) unlinkSync(path);
  }
}

function writeModel3(destDir, identity, textureFile) {
  const stem = identityStem(identity);
  const model = JSON.parse(
    readFileSync(join(miaraDir, "miara_pro_t03.model3.json"), "utf8"),
  );
  model.FileReferences.Moc = `${stem}.moc3`;
  model.FileReferences.DisplayInfo = `${stem}.cdi3.json`;
  model.FileReferences.Physics = `${stem}.physics3.json`;
  model.FileReferences.Textures = [textureFile];
  writeFileSync(
    join(destDir, `${stem}.model3.json`),
    `${JSON.stringify(model, null, 2)}\n`,
  );
}

function writeReadme(destDir, title, body) {
  writeFileSync(join(destDir, "README.md"), `# ${title}\n\n${body.trim()}\n`);
}

async function bakePhysics(destPath, profileId) {
  const physicsMod = await import(
    pathToFileURL(join(here, "../src/automesh/physics.ts")).href
  );
  const source = JSON.parse(
    readFileSync(join(miaraDir, "miara_pro_t03.physics3.json"), "utf8"),
  );
  const profile =
    profileId === "melody"
      ? physicsMod.MELODY_PHYSICS_RETARGET
      : physicsMod.GROVE_PHYSICS_RETARGET;
  const baked = physicsMod.retargetPhysics3Document(source, profile);
  writeFileSync(destPath, `${JSON.stringify(baked, null, 2)}\n`);
}

function bakeMelodyTexture(destDir) {
  const textureDir = join(destDir, "textures");
  mkdirSync(textureDir, { recursive: true });
  if (!existsSync(melodyStillAtlas)) {
    throw new Error(`Melody atlas missing: ${melodyStillAtlas}`);
  }
  const official = join(miaraDir, "miara_pro_t03.4096/texture_00.png");
  const dest = join(textureDir, "texture_00.png");
  const meshMap = join(destDir, "mesh-map.json");
  if (existsSync(paintScript) && existsSync(meshMap) && existsSync(melodyStill)) {
    const result = spawnSync(
      "python3",
      [
        paintScript,
        "melody",
        official,
        melodyStill,
        melodyStillAtlas,
        meshMap,
        dest,
      ],
      { encoding: "utf8" },
    );
    if (result.status === 0) {
      console.log(
        "[bake-identity-models] melody region paint",
        result.stdout.trim(),
      );
      return;
    }
    console.warn(
      "[bake-identity-models] melody region paint failed; compositing atlas",
      result.stderr || result.stdout,
    );
  }
  const py = `
from pathlib import Path
from PIL import Image
official = Image.open(${JSON.stringify(official)}).convert("RGBA")
atlas = Image.open(${JSON.stringify(melodyStillAtlas)}).convert("RGBA")
atlas = atlas.resize(official.size, Image.Resampling.LANCZOS)
# Sparse automesh islands sit on the official UV layout. Keep unpainted
# islands so the mesh does not collapse into floating fragments.
official.paste(atlas, (0, 0), atlas)
official.save(${JSON.stringify(dest)}, optimize=True)
print(Path(${JSON.stringify(dest)}).stat().st_size)
`;
  const result = spawnSync("python3", ["-c", py], { encoding: "utf8" });
  if (result.status !== 0) {
    console.warn(
      "[bake-identity-models] melody composite failed; copying atlas",
      result.stderr || result.stdout,
    );
    copyFileSync(melodyStillAtlas, dest);
    return;
  }
  console.log("[bake-identity-models] melody texture bytes", result.stdout.trim());
}

function bakeGroveTexture(destDir) {
  const textureDir = join(destDir, "textures");
  mkdirSync(textureDir, { recursive: true });
  const official = join(miaraDir, "miara_pro_t03.4096/texture_00.png");
  const dest = join(textureDir, "texture_00.png");
  const meshMap = join(destDir, "mesh-map.json");
  if (existsSync(paintScript) && existsSync(meshMap)) {
    const result = spawnSync(
      "python3",
      [paintScript, "grove", official, meshMap, dest],
      { encoding: "utf8" },
    );
    if (result.status === 0) {
      console.log(
        "[bake-identity-models] grove region recast",
        result.stdout.trim(),
      );
      return;
    }
    console.warn(
      "[bake-identity-models] grove region recast failed",
      result.stderr || result.stdout,
    );
  }
  const py = `
from pathlib import Path
try:
    from PIL import Image, ImageEnhance
except ImportError:
    raise SystemExit("no-pillow")
src = Path(${JSON.stringify(official)})
dst = Path(${JSON.stringify(dest)})
im = Image.open(src).convert("RGBA")
pixels = im.load()
w, h = im.size
for y in range(h):
    for x in range(w):
        pr, pg, pb, pa = pixels[x, y]
        if pa < 8:
            continue
        # rotate RGB toward green/moss
        nr = int(pr * 0.42 + pg * 0.38 + pb * 0.20)
        ng = int(pr * 0.18 + pg * 0.62 + pb * 0.20)
        nb = int(pr * 0.12 + pg * 0.28 + pb * 0.40)
        pixels[x, y] = (min(255, nr), min(255, ng), min(255, nb), pa)
im.save(dst, optimize=True)
print(dst.stat().st_size)
`;
  const result = spawnSync("python3", ["-c", py], { encoding: "utf8" });
  if (result.status !== 0) {
    console.warn(
      "[bake-identity-models] grove texture python failed; copying official texture",
      result.stderr || result.stdout,
    );
    copyFileSync(official, dest);
    return;
  }
  console.log(
    "[bake-identity-models] grove texture bytes",
    result.stdout.trim(),
  );
}

async function main() {
  if (!existsSync(join(miaraDir, "miara_pro_t03.moc3"))) {
    throw new Error(`Miara model missing under ${miaraDir}`);
  }

  const melodyDir = join(modelsRoot, "melody");
  const groveDir = join(modelsRoot, "deep-tree-echo");
  copyIdentityTree(melodyDir, "melody");
  copyIdentityTree(groveDir, "deep-tree-echo");

  await bakePhysics(join(melodyDir, "melody_t03.physics3.json"), "melody");
  await bakePhysics(
    join(groveDir, "deep-tree-echo_t03.physics3.json"),
    "grove",
  );

  bakeMelodyTexture(melodyDir);
  bakeGroveTexture(groveDir);

  writeModel3(melodyDir, "melody", "textures/texture_00.png");
  writeModel3(groveDir, "deep-tree-echo", "textures/texture_00.png");

  writeReadme(
    melodyDir,
    "Melody Cubism package",
    `
Complete Live2D model for the Melody identity.

- \`melody_t03.model3.json\` — Melody's Cubism entry (\`sourceModel\` in mesh-map)
- \`melody_t03.moc3\` — Melody mesh (replace this file to sculpt her figure)
- \`mesh-map.json\` — ArtMesh UV-island index (region + motion/physics bindings)
- \`textures/texture_00.png\` — official 4096 atlas, region-tinted from Melody still
- \`melody_t03.physics3.json\` — heavier ponytail, damped fairy cloth, musical wings

Regenerate the index with \`pnpm --filter=@deltecho/avatar index:mesh-map\`, then
\`pnpm --filter=@deltecho/avatar bake:identity-models\`.
`,
  );
  writeReadme(
    groveDir,
    "Deep Tree Echo Cubism package",
    `
Complete Live2D model for the Deep Tree Echo identity.

- \`deep-tree-echo_t03.model3.json\` — Deep Tree Echo's Cubism entry
- \`deep-tree-echo_t03.moc3\` — grove mesh (replace this file to sculpt her figure)
- \`mesh-map.json\` — ArtMesh UV-island index for this model
- \`textures/texture_00.png\` — moss/grove recast of character islands only
- \`deep-tree-echo_t03.physics3.json\` — slower hair, living wings

Regenerate with \`pnpm --filter=@deltecho/avatar bake:identity-models\`.
`,
  );

  writeReadme(
    modelsRoot,
    "Avatar Cubism models",
    `
Each identity has its own folder so mesh, texture, and physics can converge independently:

- \`miara/\` — official baked package + source \`mesh-map.json\`
- \`deep-tree-echo/\` — grove texture + living-wing physics
- \`melody/\` — region-tinted 4096 atlas + aria-style physics

\`mesh-map.json\` indexes each \`ArtMeshN\` UV island to a body region and the
physics/motion parameters that drive it. Rebuild with
\`pnpm --filter=@deltecho/avatar index:mesh-map\`.

Each identity has its own \`*_t03.moc3\`. Sculpt that file in Cubism Editor;
it does not affect the other identities.
`,
  );

  console.log("[bake-identity-models] wrote", melodyDir, "and", groveDir);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
