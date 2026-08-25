import {
  CubismEditorBridge,
  assignAtlasFromDrawables,
  cloneMelodyLandmarks,
  cubismEditorRequest,
  drawableMatchesHints,
  fitSimilarity,
  applySimilarity,
  mapPoint,
  mappingResidual,
  parseCubismEditorMessage,
  resolveAutomeshMapping,
  projectPhotoOntoAtlas,
  trainAutomeshMapping,
  uvCentroid,
  warpRasterToAtlas,
  MELODY_PARAMETER_PROFILE,
} from "../automesh";

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

  it("reprojects a photo through drawable triangles onto atlas islands", () => {
    const photo = {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray([
        200, 10, 10, 255, 200, 10, 10, 255, 200, 10, 10, 255, 200, 10, 10, 255,
      ]),
    };
    const landmarks = cloneMelodyLandmarks().map((item) =>
      item.id === "mouth"
        ? { ...item, source: { x: 0.5, y: 0.5 } }
        : item,
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
    const request = cubismEditorRequest("GetCurrentModelUID", {}, {
      requestId: "13",
    });
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
        queueMicrotask(() =>
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
