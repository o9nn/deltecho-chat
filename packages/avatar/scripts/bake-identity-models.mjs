#!/usr/bin/env node
/**
 * Clone the official Miara Cubism package into per-identity folders and
 * bake texture + physics for Deep Tree Echo and Melody.
 *
 * Topology (`.moc3`) stays shared. Each folder is a complete loadable model.
 */
import {
  cpSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
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

const SHARED_FILES = ["miara_pro_t03.moc3", "miara_pro_t03.cdi3.json"];

function copySharedTree(destDir) {
  mkdirSync(destDir, { recursive: true });
  for (const file of SHARED_FILES) {
    copyFileSync(join(miaraDir, file), join(destDir, file));
  }
  cpSync(join(miaraDir, "expressions"), join(destDir, "expressions"), {
    recursive: true,
  });
  cpSync(join(miaraDir, "motion"), join(destDir, "motion"), {
    recursive: true,
  });
}

function writeModel3(destDir, fileName, physicsFile, textureFile) {
  const model = JSON.parse(
    readFileSync(join(miaraDir, "miara_pro_t03.model3.json"), "utf8"),
  );
  model.FileReferences.Physics = physicsFile;
  model.FileReferences.Textures = [textureFile];
  writeFileSync(join(destDir, fileName), `${JSON.stringify(model, null, 2)}\n`);
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
  const py = `
from pathlib import Path
try:
    from PIL import Image, ImageEnhance
except ImportError:
    raise SystemExit("no-pillow")
src = Path(${JSON.stringify(official)})
dst = Path(${JSON.stringify(dest)})
im = Image.open(src).convert("RGBA")
im = im.resize((2048, 2048), Image.Resampling.LANCZOS)
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
  copySharedTree(melodyDir);
  copySharedTree(groveDir);

  await bakePhysics(join(melodyDir, "melody.physics3.json"), "melody");
  await bakePhysics(join(groveDir, "deep-tree-echo.physics3.json"), "grove");

  bakeMelodyTexture(melodyDir);
  bakeGroveTexture(groveDir);

  writeModel3(
    melodyDir,
    "melody.model3.json",
    "melody.physics3.json",
    "textures/texture_00.png",
  );
  writeModel3(
    groveDir,
    "deep-tree-echo.model3.json",
    "deep-tree-echo.physics3.json",
    "textures/texture_00.png",
  );

  writeReadme(
    melodyDir,
    "Melody Cubism package",
    `
Complete Live2D model for the Melody identity.

- \`miara_pro_t03.moc3\` — official Miara topology (Cubism Editor owns mesh edits)
- \`textures/texture_00.png\` — triangle-reprojected Melody atlas
- \`melody.physics3.json\` — heavier ponytail, damped fairy cloth, musical wings

Regenerate with \`pnpm --filter=@deltecho/avatar bake:identity-models\`.
`,
  );
  writeReadme(
    groveDir,
    "Deep Tree Echo Cubism package",
    `
Complete Live2D model for the Deep Tree Echo identity.

- \`miara_pro_t03.moc3\` — official Miara topology (Cubism Editor owns mesh edits)
- \`textures/texture_00.png\` — moss/grove recast of the official atlas
- \`deep-tree-echo.physics3.json\` — slower hair, living wings

Regenerate with \`pnpm --filter=@deltecho/avatar bake:identity-models\`.
`,
  );

  writeReadme(
    modelsRoot,
    "Avatar Cubism models",
    `
Each identity has its own folder so mesh, texture, and physics can converge independently:

- \`miara/\` — official baked package
- \`deep-tree-echo/\` — grove texture + living-wing physics
- \`melody/\` — Melody atlas + aria-style physics

All three currently share Miara \`.moc3\` topology. Sculpt per-character meshes in Cubism Editor and replace the \`.moc3\` in that folder.
`,
  );

  console.log("[bake-identity-models] wrote", melodyDir, "and", groveDir);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
