import { Live2DAvatarManager } from "../adapters/live2d-avatar";

// Native callbacks/values here are explicit fixtures, not live Cubism evidence.
jest.mock("../adapters/pixi-live2d-renderer", () => ({
  PARAM_IDS: {
    PARAM_MOUTH_OPEN_Y: "ParamMouthOpenY",
    PARAM_MOUTH_FORM: "ParamMouthForm",
    PARAM_EYE_L_OPEN: "ParamEyeLOpen",
    PARAM_EYE_R_OPEN: "ParamEyeROpen",
    PARAM_BROW_L_Y: "ParamBrowLY",
    PARAM_BROW_R_Y: "ParamBrowRY",
    PARAM_BODY_ANGLE_X: "ParamBodyAngleX",
    PARAM_BODY_ANGLE_Y: "ParamBodyAngleY",
    PARAM_BODY_ANGLE_Z: "ParamBodyAngleZ",
    PARAM_ANGLE_X: "ParamAngleX",
    PARAM_ANGLE_Y: "ParamAngleY",
    PARAM_ANGLE_Z: "ParamAngleZ",
  },
  PixiLive2DRenderer: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    loadModel: jest.fn().mockResolvedValue(undefined),
    setExpression: jest.fn(),
    setNamedExpression: jest.fn().mockReturnValue(true),
    playMotion: jest.fn(),
    updateLipSync: jest.fn(),
    setParameter: jest.fn(),
    getParameter: jest.fn().mockReturnValue(0),
    getParameterRange: jest.fn().mockReturnValue({ min: -30, max: 30 }),
    addFrameListener: jest.fn(),
    removeFrameListener: jest.fn(),
    addParameterObserver: jest.fn().mockReturnValue(true),
    removeParameterObserver: jest.fn(),
    setAnimationSpeed: jest.fn(),
    setVisualVitality: jest.fn(),
    focusEyes: jest.fn(),
    dispose: jest.fn(),
  })),
}));

interface RendererFixture {
  addParameterObserver: jest.Mock;
  addFrameListener: jest.Mock;
  getParameter: jest.Mock;
  setParameter: jest.Mock;
}

describe("Live2D native observation timing", () => {
  let manager: Live2DAvatarManager;
  let container: HTMLDivElement;
  let time: number;
  let epoch: number;
  beforeEach(() => {
    time = 100;
    epoch = 1000;
    jest.spyOn(performance, "now").mockImplementation(() => time);
    jest.spyOn(Date, "now").mockImplementation(() => epoch);
    manager = new Live2DAvatarManager();
    container = document.createElement("div");
    document.body.appendChild(container);
  });
  afterEach(() => {
    manager.dispose();
    container.remove();
    jest.restoreAllMocks();
  });
  async function load() {
    const controller = await manager.initialize(container, {
      modelPath: "/fixture.model3.json",
    });
    const renderer = controller.getRenderer()! as unknown as RendererFixture;
    const observe = renderer.addParameterObserver.mock
      .calls[0][0] as () => void;
    const metabolic = renderer.addFrameListener.mock.calls[0][0] as (
      dt: number,
    ) => void;
    return { controller, renderer, observe, metabolic };
  }

  it("records target write time rather than creating both timestamps at readback", async () => {
    const { controller, observe } = await load();
    controller.updateCognitiveState({ mode: "Scientific Genius" });
    time = 225;
    epoch = 1125;
    observe();
    expect(controller.getLastExpressionExperience()).toBeNull();
    time = 350;
    epoch = 1250;
    observe();
    expect(controller.getLastExpressionExperience()?.predicted.timestamp).toBe(
      1000,
    );
    expect(controller.getLastExpressionExperience()?.actual.timestamp).toBe(
      1250,
    );
    expect(
      controller.getEmbodimentDiagnostics().observationClock,
    ).toMatchObject({
      elapsedMs: 250,
      nativeUpdatesSinceWrite: 2,
      writtenAt: 1000,
    });
  });

  it("times a metabolic rewrite between native callbacks from the latest actual write", async () => {
    const { controller, renderer, observe, metabolic } = await load();
    controller.updateCognitiveState({ mode: "Scientific Genius" });
    observe();
    time = 300;
    epoch = 1200;
    metabolic(2);
    const writes = Object.fromEntries(
      renderer.setParameter.mock.calls.map(([id, value]) => [id, value]),
    );
    time = 325;
    epoch = 1225;
    observe();
    const experience = controller.getLastExpressionExperience()!;
    expect(experience.predicted.timestamp).toBe(1200);
    for (const [id, value] of Object.entries(experience.predicted.params))
      expect(value).toBe(writes[id]);
    expect(
      controller.getEmbodimentDiagnostics().observationClock,
    ).toMatchObject({
      elapsedMs: 25,
      nativeUpdatesSinceWrite: 1,
    });
  });

  it("does not turn a pause or ticker callback into extra native updates", async () => {
    const { controller, observe } = await load();
    controller.updateCognitiveState({ mode: "Idle" });
    observe();
    time = 10_100;
    epoch = 50; // Wall clock rollback does not alter duration.
    observe();
    expect(
      controller.getEmbodimentDiagnostics().observationClock,
    ).toMatchObject({
      elapsedMs: 10_000,
      nativeUpdatesSinceWrite: 2,
    });
  });

  it("does not expose timing when native membership supplies no measurement", async () => {
    const { controller, renderer, observe } = await load();
    renderer.getParameter.mockReturnValue(undefined);
    controller.updateCognitiveState({ mode: "Idle" });
    observe();
    observe();
    expect(controller.getEmbodimentDiagnostics()).toMatchObject({
      status: "unavailable",
      observationClock: null,
    });
    expect(controller.getLastExpressionExperience()).toBeNull();
  });

  it("returns detached timing and clears it under manual control, lock, replacement and disposal", async () => {
    const { controller, observe } = await load();
    const sample = () => {
      controller.updateCognitiveState({ mode: "Idle" });
      observe();
      observe();
    };
    sample();
    controller.getEmbodimentDiagnostics().observationClock!.elapsedMs = 999;
    expect(
      controller.getEmbodimentDiagnostics().observationClock!.elapsedMs,
    ).not.toBe(999);
    controller.setParameter("ParamAngleX", 3);
    expect(controller.getEmbodimentDiagnostics().observationClock).toBeNull();
    sample();
    controller.updateCognitiveState(
      { mode: "Idle" },
      { presentationLocked: true },
    );
    expect(controller.getEmbodimentDiagnostics().observationClock).toBeNull();
    sample();
    await manager.initialize(container, {
      modelPath: "/replacement.model3.json",
    });
    expect(controller.getEmbodimentDiagnostics().observationClock).toBeNull();
    manager.dispose();
    expect(controller.getEmbodimentDiagnostics()).toMatchObject({
      status: "disposed",
      observationClock: null,
    });
  });

  it("clears the previous sampled clock on canonical authority revocation without resetting calibration", async () => {
    const { controller, observe } = await load();
    controller.updateCognitiveState({
      mode: "Scientific Genius",
      coreSelf: {
        initialized: true,
        ledgerHead: "a",
        projectedStateDigest: "b",
        acceptedEventCount: 1,
        pendingProposalCount: 0,
      },
    });
    observe();
    observe();
    expect(
      controller.getEmbodimentDiagnostics().observationClock,
    ).not.toBeNull();
    const count = controller.getEmbodimentDiagnostics().sampleCount;
    controller.updateCognitiveState({ mode: "Idle" });
    expect(controller.getEmbodimentDiagnostics().observationClock).toBeNull();
    expect(controller.getEmbodimentDiagnostics().sampleCount).toBe(count);
  });
});
