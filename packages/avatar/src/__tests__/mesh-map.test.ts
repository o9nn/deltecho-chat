import {
  IDENTITY_MODEL3_PATHS,
  KNOWN_CHEST_CLOTH_IDS,
  KNOWN_WING_IDS,
  REGION_MOTION_BINDINGS,
  buildIdentityMeshMap,
  classifyDrawable,
  figureCentroidFromPositions,
  identityCubismStem,
  identityModel3Path,
  isEnvironmentUv,
  regionCounts,
  regionForDrawable,
  uvIslandBox,
} from "../automesh";

describe("mesh-map region classifier", () => {
  it("keeps known wardrobe ids on their Cubism parts", () => {
    expect(
      classifyDrawable({
        id: KNOWN_CHEST_CLOTH_IDS[0],
        uv: { x: 0.3, y: 0.3, w: 0.1, h: 0.1 },
        figure: { x: 0, y: 0.1 },
        area: 0.01,
      }),
    ).toBe("chestCloth");
    expect(
      classifyDrawable({
        id: KNOWN_WING_IDS[0],
        uv: { x: 0.3, y: 0.3, w: 0.1, h: 0.1 },
        figure: { x: 0, y: 0.1 },
        area: 0.01,
      }),
    ).toBe("wings");
  });

  it("treats right/lower atlas sheets as environment, not left-packed figure islands", () => {
    expect(isEnvironmentUv({ x: 0.01, y: 0.4, w: 0.08, h: 0.2 })).toBe(false);
    expect(isEnvironmentUv({ x: 0.9, y: 0.2, w: 0.08, h: 0.2 })).toBe(true);
    expect(isEnvironmentUv({ x: 0.65, y: 0.25, w: 0.2, h: 0.2 })).toBe(true);
    expect(isEnvironmentUv({ x: 0.3, y: 0.25, w: 0.12, h: 0.12 })).toBe(false);
    expect(
      classifyDrawable({
        id: "ArtMesh4",
        uv: { x: 0.9, y: 0.05, w: 0.08, h: 0.1 },
        figure: { x: 0.8, y: 0.4 },
        area: 0.008,
      }),
    ).toBe("environment");
    expect(
      classifyDrawable({
        id: "ArtMesh0",
        uv: { x: 0.056, y: 0.002, w: 0.027, h: 0.038 },
        figure: { x: -0.016, y: 0.458 },
        area: 0.001,
      }),
    ).toBe("hair");
  });

  it("bands Y-up figure space into hair, face, body, skirt, and legs", () => {
    expect(
      classifyDrawable({
        id: "ArtMesh210",
        uv: { x: 0.3, y: 0.2, w: 0.15, h: 0.15 },
        figure: { x: 0, y: 0.48 },
        area: 0.02,
      }),
    ).toBe("hair");
    expect(
      classifyDrawable({
        id: "ArtMesh11",
        uv: { x: 0.32, y: 0.28, w: 0.08, h: 0.08 },
        figure: { x: 0.01, y: 0.28 },
        area: 0.006,
      }),
    ).toBe("face");
    expect(
      classifyDrawable({
        id: "ArtMesh12",
        uv: { x: 0.34, y: 0.4, w: 0.1, h: 0.12 },
        figure: { x: 0.02, y: 0.1 },
        area: 0.012,
      }),
    ).toBe("body");
    expect(
      classifyDrawable({
        id: "ArtMesh13",
        uv: { x: 0.33, y: 0.55, w: 0.12, h: 0.1 },
        figure: { x: 0, y: -0.04 },
        area: 0.012,
      }),
    ).toBe("skirt");
    expect(
      classifyDrawable({
        id: "ArtMesh14",
        uv: { x: 0.35, y: 0.7, w: 0.08, h: 0.14 },
        figure: { x: 0.03, y: -0.28 },
        area: 0.011,
      }),
    ).toBe("legL");
    expect(
      classifyDrawable({
        id: "ArtMesh15",
        uv: { x: 0.35, y: 0.7, w: 0.08, h: 0.14 },
        figure: { x: -0.08, y: -0.28 },
        area: 0.011,
      }),
    ).toBe("legR");
  });

  it("pins official Cubism limb parts to left/right legs and arms", () => {
    expect(
      classifyDrawable({
        id: "ArtMesh91",
        uv: { x: 0.2, y: 0.2, w: 0.05, h: 0.05 },
        figure: { x: 0.2, y: 0.5 },
        area: 0.002,
      }),
    ).toBe("legL");
    expect(
      classifyDrawable({
        id: "ArtMesh100",
        uv: { x: 0.2, y: 0.2, w: 0.05, h: 0.05 },
        figure: { x: -0.2, y: 0.5 },
        area: 0.002,
      }),
    ).toBe("legR");
    expect(
      classifyDrawable({
        id: "ArtMesh16",
        uv: { x: 0.2, y: 0.2, w: 0.05, h: 0.05 },
        figure: { x: 0, y: 0.5 },
        area: 0.002,
      }),
    ).toBe("armL");
    expect(
      classifyDrawable({
        id: "ArtMesh80",
        uv: { x: 0.2, y: 0.2, w: 0.05, h: 0.05 },
        figure: { x: 0, y: 0.5 },
        area: 0.002,
      }),
    ).toBe("armR");
    expect(
      classifyDrawable({
        id: "ArtMesh84",
        uv: { x: 0.2, y: 0.2, w: 0.05, h: 0.05 },
        figure: { x: 0, y: 0.5 },
        area: 0.002,
      }),
    ).toBe("skirt");
  });

  it("marks compact ear-level islands as headset", () => {
    expect(
      classifyDrawable({
        id: "ArtMesh210",
        uv: { x: 0.28, y: 0.22, w: 0.04, h: 0.04 },
        figure: { x: 0.1, y: 0.42 },
        area: 0.0016,
      }),
    ).toBe("headset");
  });

  it("builds a durable identity index with motion bindings", () => {
    const meshMap = buildIdentityMeshMap({
      identity: "melody",
      sourceModel: IDENTITY_MODEL3_PATHS.melody,
      figure: { x: -0.24, y: -0.57, w: 0.55, h: 1.23 },
      drawables: [
        {
          id: "ArtMesh76",
          index: 76,
          uv: { x: 0.4, y: 0.4, w: 0.05, h: 0.05 },
          figure: { x: 0, y: 0.12 },
          area: 0.0025,
          opacity: 1,
          renderOrder: 10,
        },
        {
          id: "ArtMesh210",
          uvs: [0.3, 0.2, 0.4, 0.2, 0.35, 0.3],
          positions: [0, 0.48, 0.02, 0.5, -0.02, 0.46],
        },
      ],
    });
    expect(meshMap.version).toBe(1);
    expect(meshMap.identity).toBe("melody");
    expect(meshMap.sourceModel).toBe("models/melody/melody_t03.model3.json");
    expect(identityModel3Path("melody")).toBe(IDENTITY_MODEL3_PATHS.melody);
    expect(identityCubismStem("melody")).toBe("melody_t03");
    expect(identityCubismStem("miara")).toBe("miara_pro_t03");
    expect(regionForDrawable(meshMap, "ArtMesh76")).toBe("chestCloth");
    expect(regionForDrawable(meshMap, "ArtMesh210")).toBe("hair");
    expect(regionCounts(meshMap).chestCloth).toBe(1);
    expect(regionCounts(meshMap).hair).toBe(1);
    expect(
      meshMap.motions.find((binding) => binding.region === "hair")?.parameters,
    ).toEqual(expect.arrayContaining(["ParamHairFront", "HairFrontShake"]));
    expect(REGION_MOTION_BINDINGS).toHaveLength(14);
  });

  it("reads UV islands and Y-up centroids from live inspect buffers", () => {
    const uv = uvIslandBox([0.2, 0.3, 0.4, 0.3, 0.3, 0.5]);
    expect(uv).toEqual({ x: 0.2, y: 0.3, w: 0.2, h: 0.2 });
    expect(figureCentroidFromPositions([0, 0.4, 0.2, 0.6])).toEqual({
      x: 0.1,
      y: 0.5,
    });
  });
});
