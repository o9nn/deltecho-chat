import test from "node:test";
import assert from "node:assert/strict";
import {
  ellipse,
  grid,
  ribbon,
  compileTemplate,
  createEchoSeed,
} from "./templates.mjs";

test("primitives build actual indexed geometry and bounded UVs", () => {
  for (const shape of [ellipse(), grid(), ribbon()]) {
    assert.equal(shape.positions.length, shape.uvs.length);
    assert.ok(shape.positions.every((p) => p.every(Number.isFinite)));
    assert.ok(shape.indices.every((i) => i >= 0 && i < shape.positions.length));
    assert.equal(shape.indices.length % 3, 0);
    assert.ok(shape.uvs.every((p) => p.every((v) => v >= 0 && v <= 1)));
  }
  assert.equal(grid({ rows: 3, columns: 2 }).positions.length, 12);
  assert.equal(grid({ rows: 3, columns: 2 }).indices.length, 36);
});
test("tensor keyforms combine drivers with first parameter fastest", () => {
  const t = {
    format: "purism-template/v1",
    parameters: [
      { id: "X", min: 0, max: 1, default: 0 },
      { id: "Y", min: 0, max: 1, default: 0 },
    ],
    meshes: [
      {
        id: "Quad",
        shape: "grid",
        geometry: { size: [2, 2], columns: 1, rows: 1 },
        drivers: [
          { kind: "translateX", parameter: "X", amount: 2 },
          { kind: "translateY", parameter: "Y", amount: 3 },
        ],
      },
    ],
  };
  const m = compileTemplate(t).meshes[0];
  assert.deepEqual(
    m.keyforms.map((k) => k.positions[0]),
    [
      [-1, -1],
      [1, -1],
      [-1, 2],
      [1, 2],
    ],
  );
  assert.deepEqual(m.positions[0], [-1, -1]);
});
test("procedural character changes actual geometry through documented parameters", () => {
  const c = compileTemplate(createEchoSeed());
  assert.equal(c.parameters.length, 6);
  assert.equal(c.meshes.length, 9);
  for (const m of c.meshes) {
    assert.equal(
      m.keyforms.length,
      m.bindings.reduce((n, b) => n * b.keys.length, 1),
    );
    assert.ok(
      m.keyforms.every((k) => k.positions.length === m.positions.length),
    );
  }
  const eye = c.meshes.find((m) => m.id === "EyeL");
  assert.notDeepEqual(eye.keyforms[0].positions, eye.keyforms[1].positions);
  const narrow = compileTemplate(createEchoSeed({ headWidth: 0.4 }));
  assert.notDeepEqual(
    c.meshes.find((m) => m.id === "Head").positions,
    narrow.meshes.find((m) => m.id === "Head").positions,
  );
});
test("construction is isolated and input config is not mutated", () => {
  const t = createEchoSeed();
  const before = JSON.stringify(t);
  const a = compileTemplate(t),
    b = compileTemplate(t);
  a.meshes[0].positions[0][0] = 123;
  a.parameters[0].keys[0] = 999;
  assert.notEqual(a.meshes[0].positions[0][0], b.meshes[0].positions[0][0]);
  assert.equal(JSON.stringify(t), before);
});
test("unsupported operations and invalid data fail explicitly", () => {
  const bad = (change) => {
    const t = createEchoSeed();
    change(t);
    assert.throws(() => compileTemplate(t));
  };
  bad((t) => {
    t.meshes[0].shape = "__proto__";
  });
  bad((t) => {
    t.meshes[0].drivers[0].kind = "execute";
  });
  bad((t) => {
    t.meshes[0].drivers[0].parameter = "Missing";
  });
  bad((t) => {
    t.parameters[0].keys = [-20, 20, 0];
  });
  bad((t) => {
    t.meshes[0].geometry.radius = [NaN, 1];
  });
  bad((t) => {
    t.meshes[1].id = t.meshes[0].id;
  });
  bad((t) => {
    t.meshes[0].color = "javascript:1";
  });
  assert.throws(() => createEchoSeed({ headWidth: Infinity }));
  assert.throws(() => ellipse({ segments: 100000 }));
});
