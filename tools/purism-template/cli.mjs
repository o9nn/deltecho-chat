#!/usr/bin/env node
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  existsSync,
} from "node:fs";
import { resolve, dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { compileTemplate, createEchoSeed } from "./templates.mjs";
import { encodeMoc3 } from "./moc3-writer.mjs";
import { encodeAtlas } from "./atlas.mjs";
import { createMotionClip, createPhysics3 } from "./dynamics.mjs";

export function buildTemplate(template, output) {
  const spec = compileTemplate(template);
  const name = template.name ?? "Template";
  if (!/^[A-Za-z][A-Za-z0-9_-]{0,62}$/.test(name))
    throw new Error("invalid template name");
  const destination = resolve(output);
  if (existsSync(destination))
    throw new Error("output already exists; use a new directory");
  mkdirSync(dirname(destination), { recursive: true });
  const staging = mkdtempSync(join(dirname(destination), ".purism-template-"));
  const writeJson = (file, data) =>
    writeFileSync(join(staging, file), JSON.stringify(data, null, 2) + "\n");
  try {
    writeFileSync(join(staging, `${name}.moc3`), encodeMoc3(spec));
    writeFileSync(join(staging, "atlas.png"), encodeAtlas(spec.meshes));
    writeJson("source.template.json", template);
    const parameterIds = new Set(spec.parameters.map((p) => p.id));
    const tracks = [];
    const addTrack = (parameter, keys) => {
      if (parameterIds.has(parameter))
        tracks.push({
          parameter,
          keys: keys.map(([time, value]) => ({ time, value })),
        });
    };
    addTrack("ParamAngleZ", [
      [0, 0],
      [1, 8],
      [2, 0],
      [3, -8],
      [4, 0],
    ]);
    addTrack("ParamBreath", [
      [0, 0],
      [2, 1],
      [4, 0],
    ]);
    addTrack("ParamEyeLOpen", [
      [0, 1],
      [1.7, 1],
      [1.85, 0],
      [2, 1],
      [4, 1],
    ]);
    addTrack("ParamEyeROpen", [
      [0, 1],
      [1.7, 1],
      [1.85, 0],
      [2, 1],
      [4, 1],
    ]);
    addTrack("ParamMouthOpenY", [
      [0, 0],
      [0.7, 0.8],
      [1.3, 0],
      [2.4, 0.6],
      [2.8, 0],
      [4, 0],
    ]);
    if (tracks.length)
      writeJson(
        "idle.motion3.json",
        createMotionClip(
          { name: "TemplateIdle", duration: 4, loop: true, tracks },
          spec.parameters,
        ),
      );
    const hasPhysics =
      parameterIds.has("ParamAngleZ") && parameterIds.has("ParamHairSwing");
    if (hasPhysics)
      writeJson(
        "ribbon.physics3.json",
        createPhysics3({
          input: "ParamAngleZ",
          output: "ParamHairSwing",
          frequency: 2,
          damping: 0.7,
        }),
      );
    const refs = { Moc: `${name}.moc3`, Textures: ["atlas.png"] };
    if (tracks.length) refs.Motions = { Idle: [{ File: "idle.motion3.json" }] };
    if (hasPhysics) refs.Physics = "ribbon.physics3.json";
    const groups = [];
    const eyes = ["ParamEyeLOpen", "ParamEyeROpen"].filter((p) =>
      parameterIds.has(p),
    );
    if (eyes.length)
      groups.push({ Target: "Parameter", Name: "EyeBlink", Ids: eyes });
    if (parameterIds.has("ParamMouthOpenY"))
      groups.push({
        Target: "Parameter",
        Name: "LipSync",
        Ids: ["ParamMouthOpenY"],
      });
    writeJson(`${name}.model3.json`, {
      Version: 3,
      FileReferences: refs,
      Groups: groups,
      HitAreas: [],
    });
    const files = [
      `${name}.moc3`,
      "atlas.png",
      "source.template.json",
      `${name}.model3.json`,
      ...(tracks.length ? ["idle.motion3.json"] : []),
      ...(hasPhysics ? ["ribbon.physics3.json"] : []),
    ];
    writeJson("construction.json", {
      format: "purism-template-construction/v1",
      source: "original procedural geometry; no imported model/art bytes",
      compiler: "tools/purism-template",
      evaluatorTarget: "PurismCore v1.1.0 v5",
      compatibility:
        "restricted MOC3 subset; official Cubism/Editor compatibility not inferred",
      parameterCount: spec.parameters.length,
      meshCount: spec.meshes.length,
      keyformCount: spec.meshes.reduce((n, m) => n + m.keyforms.length, 0),
      files: Object.fromEntries(
        files.map((file) => {
          const bytes = readFileSync(join(staging, file));
          return [
            file,
            {
              bytes: bytes.length,
              sha256: createHash("sha256").update(bytes).digest("hex"),
            },
          ];
        }),
      ),
    });
    renameSync(staging, destination);
    return {
      directory: destination,
      model: join(destination, `${name}.model3.json`),
      meshes: spec.meshes.length,
      parameters: spec.parameters.length,
    };
  } catch (e) {
    rmSync(staging, { recursive: true, force: true });
    throw e;
  }
}
function main(args) {
  if (args[0] === "example") {
    process.stdout.write(JSON.stringify(createEchoSeed(), null, 2) + "\n");
    return;
  }
  if (args[0] !== "build")
    throw new Error(
      "Usage: node cli.mjs example | build --out NEW_DIR [--config FILE]",
    );
  let config, output;
  for (let i = 1; i < args.length; i += 2) {
    if (!args[i + 1]) throw new Error("missing option value");
    if (args[i] === "--config") config = args[i + 1];
    else if (args[i] === "--out") output = args[i + 1];
    else throw new Error(`unknown option ${args[i]}`);
  }
  if (!output) throw new Error("--out is required");
  const template = config
    ? JSON.parse(readFileSync(config, "utf8"))
    : createEchoSeed();
  console.log(JSON.stringify(buildTemplate(template, output), null, 2));
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    console.error(
      JSON.stringify({ event: "template_compile_error", error: e.message }),
    );
    process.exitCode = 1;
  }
}
