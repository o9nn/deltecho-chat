import {
  CubismEditorBridge,
  assignAtlasFromDrawables,
  cloneMelodyLandmarks,
  cubismEditorRequest,
  drawableMatchesHints,
  figureFromDrawables,
  fitSimilarity,
  applySimilarity,
  isEnvironmentDrawable,
  mapPoint,
  mappingResidual,
  modelDestForLandmark,
  parseCubismEditorMessage,
  resolveAutomeshMapping,
  projectPhotoOntoAtlas,
  trainAutomeshMapping,
  uvCentroid,
  punchOpaqueBackground,
  warpRasterToAtlas,
  MELODY_PARAMETER_PROFILE,
  MELODY_MESH_DEFORM,
  MELODY_PHYSICS_RETARGET,
  applyMeshDeform,
  applyPhysicsRetarget,
  classifyPhysicsSettingName,
  namePhysicsSettings,
  snapshotPhysicsRig,
  retargetPhysics3Document,
} from "../automesh";

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

describe("automesh mapping", () => {
  it("maps landmark source points onto their atlas targets", () => {
    const landmarks = cloneMelodyLandmarks();
    const mouth = landmarks.find((item) => item.id === "mouth");
    expect(mouth).toBeDefined();
    const mapped = mapPoint(landmarks, mouth!.source, "sourceToAtlas");
    expect(mapped.x).toBeCloseTo(mouth!.atlas.x, 5);
    expect(mapped.y).toBeCloseTo(mouth!.atlas.y, 5);
  });

  it("warps a solid sample so the mouth atlas pixel keeps the source color", () => {
    const landmarks = cloneMelodyLandmarks();
    const source = {
      width: 4,
      height: 4,
      data: new Uint8ClampedArray(4 * 4 * 4),
    };
    for (let index = 0; index < source.data.length; index += 4) {
      source.data[index] = 10;
      source.data[index + 1] = 20;
      source.data[index + 2] = 30;
      source.data[index + 3] = 255;
    }
    const mouth = landmarks.find((item) => item.id === "mouth")!;
    const sx = Math.round(mouth.source.x * 3);
    const sy = Math.round(mouth.source.y * 3);
    const srcIndex = (sy * 4 + sx) * 4;
    source.data[srcIndex] = 200;
    source.data[srcIndex + 1] = 40;
    source.data[srcIndex + 2] = 80;
    source.data[srcIndex + 3] = 255;

    const atlas = warpRasterToAtlas(source, landmarks, 8, 8);
    const ax = Math.min(7, Math.round(mouth.atlas.x * 8 - 0.5));
    const ay = Math.min(7, Math.round(mouth.atlas.y * 8 - 0.5));
    const atlasIndex = (ay * 8 + ax) * 4;
    expect(atlas.data[atlasIndex + 3]).toBeGreaterThan(0);
  });

  it("punches edge-connected backdrop but keeps interior dark clothing", () => {
    const width = 5;
    const raster = {
      width,
      height: 5,
      data: new Uint8ClampedArray(5 * 5 * 4),
    };
    const setPixel = (
      x: number,
      y: number,
      r: number,
      g: number,
      b: number,
    ) => {
      const index = (y * width + x) * 4;
      raster.data[index] = r;
      raster.data[index + 1] = g;
      raster.data[index + 2] = b;
      raster.data[index + 3] = 255;
    };
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const edge = x === 0 || y === 0 || x === 4 || y === 4;
        const ring = x === 1 || y === 1 || x === 3 || y === 3;
        if (edge) setPixel(x, y, 0, 0, 0);
        else if (ring) setPixel(x, y, 200, 80, 160);
        else setPixel(x, y, 8, 8, 8);
      }
    }
    const punched = punchOpaqueBackground(raster);
    expect(punched.data[3]).toBe(0);
    expect(punched.data[(2 * 5 + 2) * 4 + 3]).toBe(255);
    expect(punched.data[(2 * 5 + 1) * 4]).toBe(200);
  });

  it("fits an identity similarity transform", () => {
    const points = [
      { x: 0.2, y: 0.3 },
      { x: 0.8, y: 0.3 },
      { x: 0.5, y: 0.7 },
    ];
    const transform = fitSimilarity(points, points);
    expect(transform.scale).toBeCloseTo(1, 5);
    expect(transform.rotation).toBeCloseTo(0, 5);
    const mapped = applySimilarity(transform, points[0]!);
    expect(mapped.x).toBeCloseTo(0.2, 5);
    expect(mapped.y).toBeCloseTo(0.3, 5);
  });

  it("assigns atlas UVs from inspected Cubism drawables", () => {
    const landmarks = cloneMelodyLandmarks();
    const next = assignAtlasFromDrawables(landmarks, [
      {
        id: "PartMouth",
        bounds: { x: 0, y: 0, width: 10, height: 10 },
        uvCentroid: { x: 0.41, y: 0.45 },
      },
    ]);
    expect(next.find((item) => item.id === "mouth")?.atlas).toEqual({
      x: 0.41,
      y: 0.45,
    });
    expect(drawableMatchesHints("PartHairFront", ["hairfront"])).toBe(true);
    expect(uvCentroid([0, 0, 1, 0, 1, 1, 0, 1])).toEqual({ x: 0.5, y: 0.5 });
  });

  it("trains a persistable Melody mapping", () => {
    const mapping = trainAutomeshMapping({ identity: "melody" });
    expect(mapping.identity).toBe("melody");
    expect(mapping.landmarks.length).toBeGreaterThanOrEqual(15);
    expect(mapping.parameters?.ParamMouthForm).toBe(
      MELODY_PARAMETER_PROFILE.ParamMouthForm,
    );
    expect(mapping.residual).toBeGreaterThanOrEqual(0);
    expect(resolveAutomeshMapping(mapping)?.identity).toBe("melody");
    expect(resolveAutomeshMapping({ version: 2 })).toBeNull();
    expect(mappingResidual(mapping.landmarks)).toBeCloseTo(mapping.residual, 5);
  });

  it("fits unnamed ArtMesh landmarks onto the character figure", () => {
    const drawables = [
      {
        id: "ArtMesh12",
        bounds: { x: 10, y: 20, width: 80, height: 160 },
        uvs: [0.1, 0.1, 0.2, 0.1, 0.1, 0.2],
      },
      {
        id: "ArtMesh200",
        bounds: { x: 0, y: 0, width: 400, height: 400 },
        uvs: [0.7, 0.1, 0.95, 0.1, 0.7, 0.4],
      },
    ];
    expect(isEnvironmentDrawable(drawables[1]!)).toBe(true);
    const figure = figureFromDrawables(drawables);
    expect(figure?.width).toBeCloseTo(80 * 1.16, 5);
    expect(figure?.height).toBeCloseTo(160 * 1.16, 5);
    const dest = modelDestForLandmark(
      {
        id: "hairline",
        label: "Hairline",
        source: { x: 0.5, y: 0.1 },
        atlas: { x: 0.4, y: 0.16 },
        drawableHints: ["hairfront"],
      },
      drawables,
    );
    expect(dest.x).toBeCloseTo(figure!.x + 0.5 * figure!.width, 5);
    expect(dest.y).toBeCloseTo(figure!.y + 0.1 * figure!.height, 5);
  });

  it("inverts Y when fitting a still onto Cubism vertex positions", () => {
    const dest = modelDestForLandmark(
      {
        id: "hairline",
        label: "Hairline",
        source: { x: 0.5, y: 0.1 },
        atlas: { x: 0.4, y: 0.16 },
        drawableHints: ["hairfront"],
      },
      [
        {
          id: "ArtMesh1",
          bounds: { x: 0, y: 0, width: 1, height: 1 },
          positions: [0, 0, 100, 0, 0, 200, 100, 200],
          uvs: [0.1, 0.1, 0.2, 0.1, 0.1, 0.2, 0.2, 0.2],
        },
      ],
    );
    expect(dest.x).toBeCloseTo(50, 5);
    expect(dest.y).toBeCloseTo(192.8, 5);
  });

  it("reprojects a photo through drawable triangles onto atlas islands", () => {
    const photo = {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray([
        200, 10, 10, 255, 200, 10, 10, 255, 200, 10, 10, 255, 200, 10, 10, 255,
      ]),
    };
    const landmarks = cloneMelodyLandmarks().map((item) =>
      item.id === "mouth" ? { ...item, source: { x: 0.5, y: 0.5 } } : item,
    );
    const drawables = [
      {
        id: "PartMouth",
        bounds: { x: 0, y: 0, width: 1, height: 1 },
        positions: [0, 0, 1, 0, 0, 1],
        uvs: [0, 0, 1, 0, 0, 1],
        indices: [0, 1, 2],
      },
    ];
    const atlas = projectPhotoOntoAtlas({
      photo,
      drawables,
      landmarks,
      atlasWidth: 4,
      atlasHeight: 4,
    });
    const index = (1 * 4 + 1) * 4;
    expect(atlas.data[index]).toBeGreaterThan(100);
    expect(atlas.data[index + 3]).toBe(255);
  });
});

describe("cubism editor bridge", () => {
  it("builds and parses External API envelopes", () => {
    const request = cubismEditorRequest(
      "GetCurrentModelUID",
      {},
      {
        requestId: "13",
      },
    );
    expect(request.Type).toBe("Request");
    expect(request.Method).toBe("GetCurrentModelUID");
    expect(parseCubismEditorMessage(JSON.stringify(request))?.Method).toBe(
      "GetCurrentModelUID",
    );
    expect(parseCubismEditorMessage("not-json")).toBeNull();
  });

  it("registers a plugin and reads the open model UID", async () => {
    const sent: string[] = [];
    let onMessage: ((event: { data?: string }) => void) | undefined;
    const bridge = new CubismEditorBridge(() => ({
      send: (data) => {
        sent.push(data);
        const request = JSON.parse(data) as {
          Method: string;
          RequestId: string;
        };
        const dataPayload =
          request.Method === "RegisterPlugin"
            ? { Token: "tok-1" }
            : { ModelUID: "model-9" };
        queueMicrotask(
          () =>
            onMessage?.({
              data: JSON.stringify({
                Type: "Response",
                Method: request.Method,
                RequestId: request.RequestId,
                Data: dataPayload,
              }),
            }),
        );
      },
      close: () => undefined,
      addEventListener: (type, listener) => {
        if (type === "message") onMessage = listener;
      },
    }));

    const registered = await bridge.connect(22033, "Deltecho Automesh");
    expect(registered.Data.Token).toBe("tok-1");
    expect(await bridge.getCurrentModelUID()).toBe("model-9");
    expect(sent[0]).toContain("RegisterPlugin");
    bridge.disconnect();
  });
});

describe("identity mesh deform", () => {
  const figure = { x: 0, y: 0, width: 1, height: 1 };

  it("crops the waist and shortens the fairy hem toward a miniskirt", () => {
    const positions = new Float32Array([
      0.62,
      0.49, // waist
      0.5,
      0.2, // hem
    ]);
    applyMeshDeform(positions, figure, MELODY_MESH_DEFORM);
    expect(positions[0]).toBeLessThan(0.62);
    expect(positions[0]).toBeGreaterThan(0.5);
    expect(positions[3]).toBeGreaterThan(0.2);
  });

  it("spreads wing vertices without widening the torso column", () => {
    const positions = new Float32Array([
      0.05,
      0.55, // left wing
      0.5,
      0.55, // torso
    ]);
    applyMeshDeform(positions, figure, MELODY_MESH_DEFORM);
    expect(positions[0]).toBeLessThan(0.05);
    expect(positions[2]).toBeCloseTo(0.5, 3);
  });
});

describe("identity physics retarget", () => {
  it("classifies official Miara physics dictionary names", () => {
    expect(classifyPhysicsSettingName("Twin tail")).toBe("hair");
    expect(classifyPhysicsSettingName("Sleeve Left")).toBe("cloth");
    expect(classifyPhysicsSettingName("Fairy wings fluctuate")).toBe("wings");
    expect(classifyPhysicsSettingName("Right hair accessory")).toBe(
      "accessory",
    );
    expect(classifyPhysicsSettingName("Move Bust X")).toBeNull();
  });

  it("scales hair and damps cloth from a Miara snapshot", () => {
    const rig = {
      settings: namePhysicsSettings([
        {
          baseParticleIndex: 0,
          particleCount: 1,
          baseOutputIndex: 0,
          outputCount: 1,
        },
        {
          baseParticleIndex: 1,
          particleCount: 1,
          baseOutputIndex: 1,
          outputCount: 1,
        },
      ]),
      particles: [
        { mobility: 1, delay: 1, acceleration: 1, radius: 1 },
        { mobility: 1, delay: 1, acceleration: 1, radius: 1 },
      ],
      outputs: [
        { angleScale: 1, weight: 1 },
        { angleScale: 1, weight: 1 },
      ],
    };
    expect(rig.settings[0]?.name).toBe("Twin tail");
    expect(rig.settings[1]?.name).toBe("Front hair");
    const clothRig = {
      settings: [
        {
          name: "Sleeve Left",
          baseParticleIndex: 0,
          particleCount: 1,
          baseOutputIndex: 0,
          outputCount: 1,
        },
      ],
      particles: [{ mobility: 1, delay: 1, acceleration: 1, radius: 1 }],
      outputs: [{ angleScale: 1, weight: 1 }],
    };
    const snapshot = snapshotPhysicsRig(clothRig);
    applyPhysicsRetarget(clothRig, snapshot, MELODY_PHYSICS_RETARGET);
    expect(clothRig.particles[0].mobility).toBeCloseTo(
      MELODY_PHYSICS_RETARGET.groups.cloth.mobility ?? 1,
    );
    expect(clothRig.outputs[0].angleScale).toBeCloseTo(
      MELODY_PHYSICS_RETARGET.groups.cloth.angleScale ?? 1,
    );
  });

  it("bakes a physics3 document so identity folders can ship their own motion", () => {
    const document = {
      Meta: {
        PhysicsDictionary: [{ Name: "Twin tail" }, { Name: "Sleeve Left" }],
      },
      PhysicsSettings: [
        {
          Vertices: [{ Mobility: 1, Delay: 1, Acceleration: 1, Radius: 10 }],
          Output: [{ Scale: 1, Weight: 100 }],
        },
        {
          Vertices: [{ Mobility: 1, Delay: 1, Acceleration: 1, Radius: 10 }],
          Output: [{ Scale: 1, Weight: 100 }],
        },
      ],
    };
    const baked = retargetPhysics3Document(document, MELODY_PHYSICS_RETARGET);
    expect(baked.PhysicsSettings?.[0].Vertices?.[0].Delay).toBeCloseTo(
      MELODY_PHYSICS_RETARGET.groups.hair.delay ?? 1,
    );
    expect(baked.PhysicsSettings?.[1].Vertices?.[0].Mobility).toBeCloseTo(
      MELODY_PHYSICS_RETARGET.groups.cloth.mobility ?? 1,
    );
  });

  it("ships dedicated Cubism packages for Melody and Deep Tree Echo", () => {
    const models = join(process.cwd(), "../frontend/static/models");
    expect(existsSync(join(models, "melody/melody_t03.model3.json"))).toBe(
      true,
    );
    expect(existsSync(join(models, "melody/melody_t03.moc3"))).toBe(true);
    expect(existsSync(join(models, "melody/textures/texture_00.png"))).toBe(
      true,
    );
    expect(existsSync(join(models, "melody/mesh-map.json"))).toBe(true);
    expect(existsSync(join(models, "melody/pose-map.json"))).toBe(true);
    expect(existsSync(join(models, "melody/avatar-mesh-map.json"))).toBe(
      true,
    );
    expect(existsSync(join(models, "miara/mesh-map.json"))).toBe(true);
    const melodyMap = JSON.parse(
      readFileSync(join(models, "melody/mesh-map.json"), "utf8"),
    );
    expect(melodyMap.identity).toBe("melody");
    expect(melodyMap.sourceModel).toBe(
      "models/melody/melody_t03.model3.json",
    );
    expect(melodyMap.regions.legL).toEqual(
      expect.arrayContaining(["ArtMesh91", "ArtMesh87"]),
    );
    expect(melodyMap.regions.legR).toEqual(
      expect.arrayContaining(["ArtMesh100", "ArtMesh152"]),
    );
    expect(melodyMap.regions.armL).toEqual(
      expect.arrayContaining(["ArtMesh16", "ArtMesh158"]),
    );
    expect(melodyMap.regions.armR).toEqual(
      expect.arrayContaining(["ArtMesh80", "ArtMesh117"]),
    );
    expect(melodyMap.regions.skirt).toHaveLength(14);
    expect(melodyMap.regions.arms).toBeUndefined();
    expect(melodyMap.regions.legs).toBeUndefined();
    const textureStats = JSON.parse(
      readFileSync(join(models, "melody/textures/texture-stats.json"), "utf8"),
    );
    const character = textureStats.character ?? textureStats;
    expect(character.purple).toBeGreaterThan(character.teal);
    expect(character.mean[0]).toBeGreaterThan(40);
    const hair = textureStats.hairPixels;
    expect(hair).toBeDefined();
    expect(hair.purple).toBeGreaterThan(hair.teal);
    expect(hair.mean[2]).toBeGreaterThan(hair.mean[1]);
    expect(hair.mean[0]).toBeGreaterThan(70);
    expect(textureStats.regions.legL.opaque).toBeGreaterThan(1000);
    expect(textureStats.regions.legR.opaque).toBeGreaterThan(1000);
    expect(textureStats.regions.armL.opaque).toBeGreaterThan(1000);
    expect(textureStats.regions.armR.opaque).toBeGreaterThan(1000);
    expect(textureStats.regions.skirt.opaque).toBeGreaterThan(1000);
    expect(
      existsSync(
        join(models, "deep-tree-echo/deep-tree-echo_t03.model3.json"),
      ),
    ).toBe(true);
    expect(
      existsSync(join(models, "deep-tree-echo/textures/texture_00.png")),
    ).toBe(true);
  });
});
