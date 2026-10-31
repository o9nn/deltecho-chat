import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import vm from "node:vm";
import { encodeMoc3 } from "./moc3-writer.mjs";

const root = resolve(import.meta.dirname, "..", "..");
const corePath = resolve(root, "third_party/purism-core/1.1.0/core-v5.js");

function createRuntime() {
  const quietConsole = Object.freeze({
    debug() {},
    error() {},
    info() {},
    log() {},
    warn() {},
  });
  const context = vm.createContext({
    ArrayBuffer,
    Buffer,
    Float32Array,
    Int32Array,
    TextDecoder,
    TextEncoder,
    Uint8Array,
    WebAssembly,
    __dirname: dirname(corePath),
    __filename: corePath,
    console: quietConsole,
    process,
    require: createRequire(import.meta.url),
  });
  vm.runInContext(readFileSync(corePath, "utf8"), context, {
    filename: corePath,
    timeout: 20_000,
  });
  return context;
}

function evaluate(context, source) {
  return vm.runInContext(source, context, { timeout: 20_000 });
}

function runtimeArrayBuffer(bytes) {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
}

function triangle(x, opacity = 1, order = 4) {
  return {
    positions: [
      [x, 0],
      [x + 1, 0],
      [x, 1],
    ],
    opacity,
    order,
  };
}

function newTensorSpec() {
  return {
    canvas: { width: 10, height: 10, pixelsPerUnit: 1 },
    parameters: [
      { id: "ParamA", min: 0, max: 1, default: 0 },
      { id: "ParamB", min: 0, max: 1, default: 0 },
    ],
    meshes: [
      {
        id: "TensorTriangle",
        positions: [
          [0, 0],
          [1, 0],
          [0, 1],
        ],
        uvs: [
          [0, 0],
          [1, 0],
          [0, 1],
        ],
        indices: [0, 1, 2],
        texture: 2,
        order: 4,
        bindings: [
          { parameter: "ParamA", keys: [0, 1] },
          { parameter: "ParamB", keys: [0, 1] },
        ],
        // Binding 0 is least significant: 00, 10, 01, 11.
        keyforms: [
          triangle(10, 0.2, 1),
          triangle(20, 0.4, 2),
          triangle(30, 0.6, 3),
          triangle(40, 0.8, 4),
        ],
      },
      {
        id: "IndependentQuad",
        positions: [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ],
        uvs: [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ],
        indices: [0, 1, 2, 0, 2, 3],
        texture: 3,
        order: 9,
        bindings: [],
        keyforms: [
          {
            positions: [
              [-1, -1],
              [1, -1],
              [1, 1],
              [-1, 1],
            ],
            opacity: 1,
            order: 9,
          },
        ],
      },
    ],
  };
}

test("encodeMoc3 creates fresh version-1 MOC3 data accepted by real Purism v5 WASM", () => {
  const bytes = encodeMoc3(newTensorSpec());
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "MOC3");
  assert.equal(bytes[4], 1, "the bounded writer emits MOC3 version 1 / 3.0");
  assert.equal(bytes[5], 0, "the binary is little endian");
  assert.ok(
    bytes.length > 2064,
    "runtime section workspace precedes serialized data",
  );

  const context = createRuntime();
  context.generatedMoc = runtimeArrayBuffer(bytes);
  const result = evaluate(
    context,
    `(() => {
      const moc = PurismCore.Moc.fromArrayBuffer(generatedMoc);
      if (!moc) return { moc: false };
      const model = PurismCore.Model.fromMoc(moc);
      if (!model) { moc._release(); return { moc: true, model: false }; }
      try {
        model.update();
        const failures = [];
        const seen = new Set();
        const scan = (value, label) => {
          if (!value || typeof value !== "object" || seen.has(value)) return;
          seen.add(value);
          if (ArrayBuffer.isView(value)) {
            for (let index = 0; index < value.length; index++) {
              if (!Number.isFinite(value[index])) failures.push(label + "[" + index + "]");
            }
            return;
          }
          if (Array.isArray(value)) {
            value.forEach((entry, index) => scan(entry, label + "[" + index + "]"));
            return;
          }
          for (const [key, entry] of Object.entries(value)) scan(entry, label + "." + key);
        };
        scan(model, "model");
        return {
          moc: true,
          model: true,
          parameterCount: model.parameters.count,
          drawableCount: model.drawables.count,
          parameterIds: Array.from(model.parameters.ids),
          drawableIds: Array.from(model.drawables.ids),
          textures: Array.from(model.drawables.textureIndices),
          vertexCounts: Array.from(model.drawables.vertexCounts),
          indexCounts: Array.from(model.drawables.indexCounts),
          quadIndices: Array.from(model.drawables.indices[1]),
          renderOrders: Array.from(model.renderOrders),
          finite: failures.length === 0,
          lastError: model.getLastError(),
        };
      } finally {
        model.release();
        moc._release();
      }
    })()`,
  );

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    moc: true,
    model: true,
    parameterCount: 2,
    drawableCount: 2,
    parameterIds: ["ParamA", "ParamB"],
    drawableIds: ["TensorTriangle", "IndependentQuad"],
    textures: [2, 3],
    vertexCounts: [3, 4],
    indexCounts: [3, 6],
    quadIndices: [0, 1, 2, 0, 2, 3],
    renderOrders: [0, 1],
    finite: true,
    lastError: 0,
  });
});

test("Purism v5 evaluates the new ArtMesh mixed-radix tensor and interpolates vertices", () => {
  const context = createRuntime();
  context.generatedMoc = runtimeArrayBuffer(encodeMoc3(newTensorSpec()));
  const snapshots = evaluate(
    context,
    `(() => {
      const moc = PurismCore.Moc.fromArrayBuffer(generatedMoc);
      if (!moc) throw new Error("generated bytes did not revive as MOC3");
      const model = PurismCore.Model.fromMoc(moc);
      if (!model) { moc._release(); throw new Error("generated MOC did not create a model"); }
      try {
        const a = model.parameters.ids.indexOf("ParamA");
        const b = model.parameters.ids.indexOf("ParamB");
        const points = [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0.5]];
        return points.map(([av, bv]) => {
          model.parameters.values[a] = av;
          model.parameters.values[b] = bv;
          model.update();
          return {
            a: av,
            b: bv,
            x: model.drawables.vertexPositions[0][0],
            opacity: model.drawables.opacities[0],
            drawOrder: model.drawables.drawOrders[0],
            finite: model.drawables.vertexPositions.every((positions) =>
              Array.from(positions).every(Number.isFinite),
            ),
            lastError: model.getLastError(),
          };
        });
      } finally {
        model.release();
        moc._release();
      }
    })()`,
  );

  const observed = JSON.parse(JSON.stringify(snapshots));
  assert.deepEqual(
    observed.map(({ a, b, x, drawOrder, finite, lastError }) => ({
      a,
      b,
      x,
      drawOrder,
      finite,
      lastError,
    })),
    [
      { a: 0, b: 0, x: 10, drawOrder: 1, finite: true, lastError: 0 },
      { a: 1, b: 0, x: 20, drawOrder: 2, finite: true, lastError: 0 },
      { a: 0, b: 1, x: 30, drawOrder: 3, finite: true, lastError: 0 },
      { a: 1, b: 1, x: 40, drawOrder: 4, finite: true, lastError: 0 },
      { a: 0.5, b: 0.5, x: 25, drawOrder: 2, finite: true, lastError: 0 },
    ],
  );
  assert.ok(Math.abs(observed[0].opacity - 0.2) < 1e-6);
  assert.ok(Math.abs(observed[4].opacity - 0.5) < 1e-6);
});

test("unbound and single-key meshes use finite neutral keyforms in Purism v5", () => {
  const singleAxis = {
    canvas: { width: 4, height: 4, pixelsPerUnit: 2 },
    parameters: [{ id: "ParamHold", min: -1, max: 1, default: 0 }],
    meshes: [
      {
        id: "SingleKeyTriangle",
        positions: [
          [0, 0],
          [1, 0],
          [0, 1],
        ],
        uvs: [
          [0, 0],
          [1, 0],
          [0, 1],
        ],
        indices: [0, 1, 2],
        texture: 0,
        order: 0,
        bindings: [{ parameter: "ParamHold", keys: [0] }],
        keyforms: [triangle(7)],
      },
    ],
  };
  const context = createRuntime();
  context.generatedMoc = runtimeArrayBuffer(encodeMoc3(singleAxis));
  const result = evaluate(
    context,
    `(() => {
      const moc = PurismCore.Moc.fromArrayBuffer(generatedMoc);
      if (!moc) throw new Error("single-key MOC did not revive");
      const model = PurismCore.Model.fromMoc(moc);
      if (!model) { moc._release(); throw new Error("single-key MOC had no model"); }
      try {
        const parameter = model.parameters.ids.indexOf("ParamHold");
        const values = [];
        for (const value of [-1, 0, 1]) {
          model.parameters.values[parameter] = value;
          model.update();
          values.push({
            x: model.drawables.vertexPositions[0][0],
            finite: Array.from(model.drawables.vertexPositions[0]).every(Number.isFinite),
            lastError: model.getLastError(),
          });
        }
        return values;
      } finally {
        model.release();
        moc._release();
      }
    })()`,
  );
  assert.deepEqual(JSON.parse(JSON.stringify(result)), [
    { x: 7, finite: true, lastError: 0 },
    { x: 7, finite: true, lastError: 0 },
    { x: 7, finite: true, lastError: 0 },
  ]);
});

test("encodeMoc3 rejects corrupt, ambiguous, and unsafe template input before producing bytes", () => {
  const valid = newTensorSpec();
  const cases = [
    [
      "duplicate parameter IDs",
      () => ({
        ...valid,
        parameters: [valid.parameters[0], { ...valid.parameters[0] }],
      }),
      /duplicate parameter id/,
    ],
    [
      "unknown binding reference",
      () => ({
        ...valid,
        meshes: [
          {
            ...valid.meshes[0],
            bindings: [{ parameter: "Missing", keys: [0, 1] }],
          },
        ],
      }),
      /unknown parameter/,
    ],
    [
      "wrong keyform tensor size",
      () => ({
        ...valid,
        meshes: [{ ...valid.meshes[0], keyforms: [triangle(0)] }],
      }),
      /keyforms length must equal binding key product/,
    ],
    [
      "non-finite position",
      () => ({
        ...valid,
        meshes: [
          {
            ...valid.meshes[0],
            positions: [
              [Infinity, 0],
              [1, 0],
              [0, 1],
            ],
          },
        ],
      }),
      /must be finite/,
    ],
    [
      "out-of-range triangle index",
      () => ({
        ...valid,
        meshes: [{ ...valid.meshes[0], indices: [0, 1, 3] }],
      }),
      /must be an integer/,
    ],
    [
      "nonascending keys",
      () => ({
        ...valid,
        meshes: [
          {
            ...valid.meshes[0],
            bindings: [{ parameter: "ParamA", keys: [0, 0] }],
          },
        ],
      }),
      /strictly ascending/,
    ],
  ];

  for (const [label, makeSpec, expected] of cases)
    assert.throws(() => encodeMoc3(makeSpec()), expected, label);
});
