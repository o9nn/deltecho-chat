import assert from "node:assert/strict";
import test from "node:test";

import {
  createMotionClip,
  createPhysics3,
  createSpring,
  sampleClip,
} from "./dynamics.mjs";

const PARAMETERS = ["ParamAngleX", "ParamAngleY", "ParamHairSwing"];

function assertClose(actual, expected, epsilon = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`,
  );
}

function assertStandardPhysics3Shape(physics) {
  assert.equal(physics.Version, 3);
  assert.equal(physics.Meta.PhysicsSettingCount, 1);
  assert.equal(physics.Meta.TotalInputCount, 1);
  assert.equal(physics.Meta.TotalOutputCount, 1);
  assert.equal(physics.Meta.VertexCount, 2);
  assert.equal(physics.Meta.Fps, 30);
  assert.deepEqual(physics.Meta.EffectiveForces, {
    Gravity: { X: 0, Y: -1 },
    Wind: { X: 0, Y: 0 },
  });
  assert.equal(physics.PhysicsSettings.length, 1);

  const [setting] = physics.PhysicsSettings;
  assert.equal(setting.Id, "PhysicsSetting1");
  assert.equal(setting.Input.length, 1);
  assert.equal(setting.Output.length, 1);
  assert.equal(setting.Vertices.length, 2);
  assert.deepEqual(setting.Normalization, {
    Position: { Minimum: -10, Default: 0, Maximum: 10 },
    Angle: { Minimum: -30, Default: 0, Maximum: 30 },
  });

  for (const endpoint of [
    setting.Input[0].Source,
    setting.Output[0].Destination,
  ]) {
    assert.equal(endpoint.Target, "Parameter");
    assert.equal(typeof endpoint.Id, "string");
    assert.ok(endpoint.Id.length > 0);
  }
  for (const vertex of setting.Vertices) {
    assert.ok(Number.isFinite(vertex.Position.X));
    assert.ok(Number.isFinite(vertex.Position.Y));
    assert.ok(Number.isFinite(vertex.Mobility));
    assert.ok(Number.isFinite(vertex.Delay));
    assert.ok(Number.isFinite(vertex.Acceleration));
    assert.ok(Number.isFinite(vertex.Radius));
  }
}

test("createMotionClip emits standard linear motion3 curves and sampleClip interpolates them", () => {
  const clip = createMotionClip(
    {
      name: "lean-and-tilt",
      duration: 2,
      loop: false,
      tracks: [
        {
          parameter: "ParamAngleX",
          keys: [
            { time: 0, value: -10 },
            { time: 1, value: 10 },
            { time: 2, value: 0 },
          ],
        },
        {
          parameter: "ParamAngleY",
          keys: [{ time: 0.5, value: 3 }],
        },
      ],
    },
    PARAMETERS,
  );

  assert.equal(clip.name, "lean-and-tilt");
  assert.equal(Object.prototype.propertyIsEnumerable.call(clip, "name"), false);
  assert.deepEqual(clip.Meta, {
    Duration: 2,
    Fps: 30,
    Loop: false,
    AreBeziersRestricted: true,
    CurveCount: 2,
    TotalSegmentCount: 2,
    TotalPointCount: 4,
    UserDataCount: 0,
    TotalUserDataSize: 0,
  });
  assert.deepEqual(clip.Curves[0], {
    Target: "Parameter",
    Id: "ParamAngleX",
    Segments: [0, -10, 0, 1, 10, 0, 2, 0],
  });

  assert.deepEqual(sampleClip(clip, 0), { ParamAngleX: -10, ParamAngleY: 3 });
  assert.deepEqual(sampleClip(clip, 0.5), { ParamAngleX: 0, ParamAngleY: 3 });
  assert.deepEqual(sampleClip(clip, 1.5), { ParamAngleX: 5, ParamAngleY: 3 });
});

test("sampleClip has pure seek semantics with clamped non-looping and wrapped looping boundaries", () => {
  const once = createMotionClip(
    {
      name: "once",
      duration: 2,
      loop: false,
      tracks: [
        {
          parameter: "ParamAngleX",
          keys: [
            { time: 0, value: 0 },
            { time: 2, value: 20 },
          ],
        },
      ],
    },
    PARAMETERS,
  );
  assert.equal(sampleClip(once, -20).ParamAngleX, 0);
  assert.equal(sampleClip(once, 20).ParamAngleX, 20);

  const loop = createMotionClip(
    {
      name: "loop",
      duration: 2,
      loop: true,
      tracks: [
        {
          parameter: "ParamAngleX",
          keys: [
            { time: 0, value: 0 },
            { time: 2, value: 20 },
          ],
        },
      ],
    },
    PARAMETERS,
  );
  assertClose(sampleClip(loop, 2.5).ParamAngleX, 5);
  assert.equal(sampleClip(loop, -0.5).ParamAngleX, 15);
  assert.equal(sampleClip(loop, 2).ParamAngleX, 0);
});

test("createMotionClip rejects unknown parameters, non-finite values, duplicate tracks, and duplicate key times", () => {
  const base = {
    name: "invalid",
    duration: 1,
    loop: false,
    tracks: [
      {
        parameter: "ParamAngleX",
        keys: [
          { time: 0, value: 0 },
          { time: 1, value: 1 },
        ],
      },
    ],
  };

  assert.throws(
    () =>
      createMotionClip(
        { ...base, tracks: [{ ...base.tracks[0], parameter: "ParamMissing" }] },
        PARAMETERS,
      ),
    /not in parameters/,
  );
  assert.throws(
    () => createMotionClip({ ...base, duration: Number.NaN }, PARAMETERS),
    /finite number/,
  );
  assert.throws(
    () =>
      createMotionClip(
        {
          ...base,
          tracks: [{ ...base.tracks[0], keys: [{ time: 0, value: Infinity }] }],
        },
        PARAMETERS,
      ),
    /finite number/,
  );
  assert.throws(
    () =>
      createMotionClip(
        { ...base, tracks: [base.tracks[0], base.tracks[0]] },
        PARAMETERS,
      ),
    /duplicate parameter track/,
  );
  assert.throws(
    () =>
      createMotionClip(
        {
          ...base,
          tracks: [
            {
              ...base.tracks[0],
              keys: [
                { time: 0, value: 0 },
                { time: 0, value: 1 },
              ],
            },
          ],
        },
        PARAMETERS,
      ),
    /strictly increasing times/,
  );
  assert.throws(
    () =>
      sampleClip({ Meta: { Duration: 1, Loop: false }, Curves: [] }, Infinity),
    /finite number/,
  );
});

test("createPhysics3 emits a valid standard Cubism Physics3 pendulum setting", () => {
  const physics = createPhysics3({
    input: "ParamAngleZ",
    output: "ParamHairSwing",
    frequency: 8,
    damping: 0.25,
  });

  assertStandardPhysics3Shape(JSON.parse(JSON.stringify(physics)));
  const [setting] = physics.PhysicsSettings;
  assert.deepEqual(setting.Input[0], {
    Source: { Target: "Parameter", Id: "ParamAngleZ" },
    Weight: 100,
    Type: "Angle",
    Reflect: false,
  });
  assert.deepEqual(setting.Output[0], {
    Destination: { Target: "Parameter", Id: "ParamHairSwing" },
    VertexIndex: 1,
    Scale: 1,
    Weight: 100,
    Type: "Angle",
    Reflect: false,
  });
  assert.equal(setting.Vertices[1].Delay, 1 / 8);
  assert.equal(setting.Vertices[1].Mobility, 0.75);
});

test("createPhysics3 rejects invalid endpoint identifiers and non-finite or out-of-bounds controls", () => {
  assert.throws(
    () => createPhysics3({ input: "", output: "ParamHairSwing" }),
    /non-empty string/,
  );
  assert.throws(
    () => createPhysics3({ input: "ParamAngleZ", output: "" }),
    /non-empty string/,
  );
  assert.throws(
    () =>
      createPhysics3({
        input: "ParamAngleZ",
        output: "ParamHairSwing",
        frequency: Infinity,
      }),
    /finite number/,
  );
  assert.throws(
    () =>
      createPhysics3({
        input: "ParamAngleZ",
        output: "ParamHairSwing",
        frequency: 0,
      }),
    /greater than zero/,
  );
  assert.throws(
    () =>
      createPhysics3({
        input: "ParamAngleZ",
        output: "ParamHairSwing",
        damping: -0.01,
      }),
    /between 0 and 1/,
  );
});

test("createSpring uses caller-provided time, bounds a large delta, resets, and keeps instances independent", () => {
  const spring = createSpring({
    frequency: 2,
    damping: 1,
    position: 0,
    velocity: 0,
  });
  const initial = spring.snapshot();
  assert.deepEqual(initial, { position: 0, velocity: 0 });

  const advanced = spring.step(1, 0.1);
  assert.ok(advanced.position > 0 && advanced.position < 1);
  assert.ok(Number.isFinite(advanced.velocity));

  const boundedA = createSpring({ frequency: 2, damping: 1 });
  const boundedB = createSpring({ frequency: 2, damping: 1 });
  assert.deepEqual(boundedA.step(5, 10), boundedB.step(5, 0.25));

  const independent = createSpring({ frequency: 2, damping: 1 });
  independent.step(1, 0.1);
  assert.deepEqual(createSpring({ frequency: 2, damping: 1 }).snapshot(), {
    position: 0,
    velocity: 0,
  });
  assert.deepEqual(spring.reset(), initial);
});

test("createSpring validates all finite inputs and rejects reverse time", () => {
  assert.throws(
    () => createSpring({ frequency: 0, damping: 1 }),
    /greater than zero/,
  );
  assert.throws(
    () => createSpring({ frequency: 1, damping: Number.NaN }),
    /finite number/,
  );
  assert.throws(
    () => createSpring({ frequency: 1, damping: 1, position: Infinity }),
    /finite number/,
  );

  const spring = createSpring({ frequency: 1, damping: 0.5 });
  assert.throws(() => spring.step(Number.NaN, 0.1), /finite number/);
  assert.throws(() => spring.step(0, -0.1), /must not be negative/);
});

test("spring rejects overflow without poisoning its last finite state", () => {
  const spring = createSpring({ frequency: 2, damping: 0.5, position: 1e308 });
  const previous = spring.snapshot();
  assert.throws(() => spring.step(-1e308, 0.1), /finite number/);
  assert.deepEqual(spring.snapshot(), previous);
});
