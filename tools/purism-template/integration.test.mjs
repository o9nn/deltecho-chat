import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { compileTemplate, createEchoSeed } from "./templates.mjs";
import { encodeMoc3 } from "./moc3-writer.mjs";
import { buildTemplate } from "./cli.mjs";
import { loadPurismRuntime, inspectModel } from "./runtime.mjs";
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-5, `${a} != ${b}`);

test("new EchoSeed MOC3 loads and all six independent parameters move actual native geometry", () => {
  const temp = mkdtempSync(resolve(tmpdir(), "dte-generated-native-"));
  try {
    const runtime = loadPurismRuntime(resolve(temp, "runtime"));
    const template = createEchoSeed(),
      spec = compileTemplate(template),
      bytes = encodeMoc3(spec);
    assert.equal(bytes.subarray(0, 4).toString(), "MOC3");
    const neutral = inspectModel(runtime, bytes);
    assert.deepEqual(
      neutral.parameterIds,
      template.parameters.map((p) => p.id),
    );
    assert.deepEqual(
      neutral.drawableIds,
      template.meshes.map((m) => m.id),
    );
    assert.equal(neutral.lastError, 0);
    assert.equal(neutral.nativeRenderOrderAlias, true);
    for (const p of template.parameters) {
      const pose = inspectModel(runtime, bytes, {
        [p.id]: p.default === p.min ? p.max : p.min,
      });
      assert.notDeepEqual(
        pose.positions,
        neutral.positions,
        `${p.id} failed to move actual vertices`,
      );
      assert.equal(pose.lastError, 0);
    }
    const head = neutral.drawableIds.indexOf("Head");
    const expectedHead = spec.meshes[head].positions.flat();
    neutral.positions[head].forEach((v, i) => near(v, expectedHead[i]));
    // Exact endpoints and their tensor interpolation are both native, not a JS renderer substitute.
    const eyeIndex = neutral.drawableIds.indexOf("EyeL");
    const eye = spec.meshes[eyeIndex];
    const zero = inspectModel(runtime, bytes, {
      ParamEyeLOpen: 0,
      ParamAngleZ: -20,
    });
    zero.positions[eyeIndex].forEach((v, i) =>
      near(v, eye.keyforms[0].positions.flat()[i]),
    );
    const low = inspectModel(runtime, bytes, {
      ParamEyeLOpen: 0,
      ParamAngleZ: 0,
    });
    const high = inspectModel(runtime, bytes, {
      ParamEyeLOpen: 1,
      ParamAngleZ: 0,
    });
    const middle = inspectModel(runtime, bytes, {
      ParamEyeLOpen: 0.5,
      ParamAngleZ: 0,
    });
    middle.positions[eyeIndex].forEach((v, i) =>
      near(v, (low.positions[eyeIndex][i] + high.positions[eyeIndex][i]) / 2),
    );
    if (process.env.PURISM_TEMPLATE_REPORT) {
      const out = resolve(process.env.PURISM_TEMPLATE_REPORT);
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(
        out,
        JSON.stringify(
          {
            passed: true,
            source: "original procedural geometry",
            mocBytes: bytes.length,
            parameters: neutral.parameterIds,
            meshes: neutral.drawableIds,
            nativeLastError: neutral.lastError,
            allParametersMovedVertices: true,
            tensorInterpolationVerified: true,
            nativeRenderOrderAlias: neutral.nativeRenderOrderAlias,
          },
          null,
          2,
        ) + "\n",
      );
    }
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
test("compiler emits deterministic source, texture, MOC3, model3, motion3 and physics3 with exact hashes", () => {
  const temp = mkdtempSync(resolve(tmpdir(), "dte-template-package-"));
  try {
    const a = buildTemplate(createEchoSeed(), resolve(temp, "a"));
    const b = buildTemplate(createEchoSeed(), resolve(temp, "b"));
    const model = JSON.parse(readFileSync(a.model));
    assert.equal(model.Version, 3);
    assert.ok(existsSync(resolve(a.directory, model.FileReferences.Moc)));
    assert.ok(existsSync(resolve(a.directory, model.FileReferences.Physics)));
    assert.ok(
      existsSync(
        resolve(a.directory, model.FileReferences.Motions.Idle[0].File),
      ),
    );
    const inventory = JSON.parse(
      readFileSync(resolve(a.directory, "construction.json")),
    );
    for (const [name, meta] of Object.entries(inventory.files)) {
      const first = readFileSync(resolve(a.directory, name)),
        second = readFileSync(resolve(b.directory, name));
      assert.deepEqual(first, second, `non-deterministic resource ${name}`);
      assert.equal(
        createHash("sha256").update(first).digest("hex"),
        meta.sha256,
      );
      assert.equal(first.length, meta.bytes);
    }
    const png = readFileSync(resolve(a.directory, "atlas.png"));
    assert.deepEqual(
      [...png.subarray(0, 8)],
      [137, 80, 78, 71, 13, 10, 26, 10],
    );
    assert.equal(png.readUInt32BE(16), 72);
    assert.equal(png.readUInt32BE(20), 8);
    assert.throws(
      () => buildTemplate(createEchoSeed(), a.directory),
      /already exists/,
    );
    const invalid = createEchoSeed();
    invalid.name = "../bad";
    assert.throws(
      () => buildTemplate(invalid, resolve(temp, "invalid")),
      /invalid template name/,
    );
    assert.equal(existsSync(resolve(temp, "invalid")), false);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
