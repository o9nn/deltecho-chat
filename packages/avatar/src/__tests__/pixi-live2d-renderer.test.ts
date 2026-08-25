/**
 * Tests for PixiLive2DRenderer
 *
 * Since the actual Live2D rendering requires a browser environment with
 * canvas support, these tests focus on the API contract and mock behavior.
 */

import { Live2DModel } from "pixi-live2d-display-lipsyncpatch/cubism4";
import {
  PixiLive2DRenderer,
  PARAM_IDS,
  loadCubism4Settings,
} from "../adapters/pixi-live2d-renderer";
import { FIGURE_BOUNDS_PAD } from "../adapters/live2d-figure-bounds";
import type { CubismAdapterConfig } from "../adapters/cubism-adapter";

// Mock the dynamic imports for Node.js environment
const installUnsafeEval = jest.fn();

jest.mock("@pixi/unsafe-eval", () => ({
  install: (...args: unknown[]) => installUnsafeEval(...args),
}));

jest.mock("pixi.js", () => ({
  Application: jest.fn().mockImplementation(() => {
    const onceFns: Array<() => void> = [];
    return {
      stage: {
        addChild: jest.fn(),
      },
      view: {
        width: 400,
        height: 400,
        clientWidth: 400,
        clientHeight: 400,
      },
      ticker: {
        addOnce: (cb: () => void) => {
          onceFns.push(cb);
        },
        flushOnce: () => {
          const queued = onceFns.splice(0, onceFns.length);
          for (const fn of queued) fn();
        },
      },
      screen: { width: 400, height: 400 },
      renderer: {
        resize: jest.fn(),
        width: 400,
        height: 400,
        resolution: 1,
        extract: {
          pixels: jest.fn(() => new Uint8Array(400 * 400 * 4)),
        },
      },
      destroy: jest.fn(),
    };
  }),
}));

jest.mock("pixi-live2d-display-lipsyncpatch/cubism4", () => ({
  cubism4Ready: jest.fn().mockResolvedValue(undefined),
  Live2DModel: {
    registerTicker: jest.fn(),
    from: jest.fn().mockImplementation(() => {
      const scale = {
        x: 1,
        y: 1,
        set(x: number, y?: number) {
          this.x = x;
          this.y = y ?? x;
        },
      };
      return Promise.resolve({
        x: 0,
        y: 0,
        width: 800,
        height: 1600,
        scale,
        anchor: { x: 0.5, y: 0.5, set: jest.fn() },
        internalModel: {
          motionManager: {
            startMotion: jest.fn().mockResolvedValue(true),
            stopAllMotions: jest.fn(),
          },
          coreModel: {
            setParameterValueById: jest.fn(),
            getParameterValueById: jest.fn().mockReturnValue(0),
            setPartOpacityById: jest.fn(),
          },
        },
        expression: jest.fn(),
        motion: jest.fn().mockResolvedValue(true),
        speak: jest.fn(),
        stopSpeaking: jest.fn(),
        destroy: jest.fn(),
      });
    }),
  },
}));

describe("PixiLive2DRenderer", () => {
  let renderer: PixiLive2DRenderer;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    installUnsafeEval.mockClear();
    renderer = new PixiLive2DRenderer();
    // Create a mock canvas element
    mockCanvas = {
      width: 400,
      height: 400,
      parentElement: { clientWidth: 400, clientHeight: 400 },
      getContext: jest.fn(),
      style: { filter: "" },
    } as unknown as HTMLCanvasElement;

    // Mock document.getElementById
    jest.spyOn(document, "getElementById").mockReturnValue(mockCanvas);
  });

  afterEach(() => {
    renderer.dispose();
    jest.clearAllMocks();
  });

  describe("initialization", () => {
    it("should create a renderer instance", () => {
      expect(renderer).toBeInstanceOf(PixiLive2DRenderer);
    });

    it("should not be initialized before calling initialize()", () => {
      expect(renderer.isInitialized()).toBe(false);
    });

    it("should initialize with valid config", async () => {
      const config: CubismAdapterConfig = {
        canvas: mockCanvas,
        model: {
          modelPath: "/test/model.json",
          name: "Test Model",
        },
      };

      await renderer.initialize(config);
      expect(renderer.isInitialized()).toBe(true);
      expect(installUnsafeEval).toHaveBeenCalled();
      const cubism4 = await import("pixi-live2d-display-lipsyncpatch/cubism4");
      expect(cubism4.cubism4Ready).toHaveBeenCalled();
      expect((window as Window & { PIXI?: unknown }).PIXI).toBeDefined();
    });

    it("should throw if canvas element not found by ID", async () => {
      jest.spyOn(document, "getElementById").mockReturnValue(null);

      const config: CubismAdapterConfig = {
        canvas: "non-existent-canvas",
        model: {
          modelPath: "/test/model.json",
          name: "Test Model",
        },
      };

      await expect(renderer.initialize(config)).rejects.toThrow(
        "Canvas element not found",
      );
    });
  });

  describe("expression handling", () => {
    beforeEach(async () => {
      const config: CubismAdapterConfig = {
        canvas: mockCanvas,
        model: {
          modelPath: "/test/model.json",
          name: "Test Model",
        },
      };
      await renderer.initialize(config);
      await renderer.loadModel(config.model);
    });

    it("should track current expression", () => {
      expect(renderer.getExpression()).toBe("neutral");

      renderer.setExpression("happy", 0.8);
      expect(renderer.getExpression()).toBe("happy");
    });

    it("should handle all expression types", () => {
      const expressions = [
        "neutral",
        "happy",
        "thinking",
        "curious",
        "surprised",
        "concerned",
        "focused",
        "playful",
        "contemplative",
        "empathetic",
      ] as const;

      for (const expression of expressions) {
        renderer.setExpression(expression, 0.7);
        expect(renderer.getExpression()).toBe(expression);
      }
    });

    it("plays the shipped Miara Cubism expression for happy", async () => {
      const fromMock = Live2DModel.from as jest.Mock;
      const model = await fromMock.mock.results.at(-1)?.value;
      renderer.setExpression("happy", 0.8);
      expect(model.expression).toHaveBeenCalledWith("JOY_01_BroadSmile");
      expect(renderer.setNamedExpression("SURPRISE_01_Startled")).toBe(true);
      expect(model.expression).toHaveBeenCalledWith("SURPRISE_01_Startled");
    });
  });

  describe("lip sync", () => {
    beforeEach(async () => {
      const config: CubismAdapterConfig = {
        canvas: mockCanvas,
        model: {
          modelPath: "/test/model.json",
          name: "Test Model",
        },
      };
      await renderer.initialize(config);
      await renderer.loadModel(config.model);
    });

    it("should accept audio levels from 0 to 1", () => {
      expect(() => renderer.updateLipSync(0)).not.toThrow();
      expect(() => renderer.updateLipSync(0.5)).not.toThrow();
      expect(() => renderer.updateLipSync(1)).not.toThrow();
    });

    it("should clamp audio levels outside 0-1 range", () => {
      expect(() => renderer.updateLipSync(-0.5)).not.toThrow();
      expect(() => renderer.updateLipSync(1.5)).not.toThrow();
    });
  });

  describe("parameter control", () => {
    beforeEach(async () => {
      const config: CubismAdapterConfig = {
        canvas: mockCanvas,
        model: {
          modelPath: "/test/model.json",
          name: "Test Model",
        },
      };
      await renderer.initialize(config);
      await renderer.loadModel(config.model);
    });

    it("should allow setting custom parameters", () => {
      expect(() =>
        renderer.setParameter(PARAM_IDS.PARAM_ANGLE_X, 15),
      ).not.toThrow();
    });

    it("should return undefined for parameters on null model", async () => {
      renderer.dispose();
      const newRenderer = new PixiLive2DRenderer();
      expect(newRenderer.getParameter(PARAM_IDS.PARAM_ANGLE_X)).toBeUndefined();
    });
  });

  describe("outfit wardrobe", () => {
    beforeEach(async () => {
      const config: CubismAdapterConfig = {
        canvas: mockCanvas,
        model: {
          modelPath: "/test/model.json",
          name: "Test Model",
        },
      };
      await renderer.initialize(config);
      await renderer.loadModel(config.model);
    });

    it("hides casual accessory parts by matching Cubism part ids", async () => {
      const core = renderer.getModel()?.internalModel.coreModel as unknown as {
        getPartCount: jest.Mock;
        getPartId: jest.Mock;
        setPartOpacityByIndex: jest.Mock;
        setPartOpacityById: jest.Mock;
      };
      Object.assign(core, {
        getPartCount: jest.fn(() => 3),
        getPartId: jest.fn(
          (index: number) =>
            ["PartFairy", "PartWaterSurface", "PartChestClothLRotation"][index],
        ),
        setPartOpacityByIndex: jest.fn(),
      });
      renderer.applyOutfit({ id: "casual" });
      expect(core.setPartOpacityByIndex).toHaveBeenCalledWith(0, 0);
      expect(core.setPartOpacityByIndex).toHaveBeenCalledWith(1, 0);
      expect(core.setPartOpacityByIndex).toHaveBeenCalledWith(2, 1);
      expect(renderer.getAppliedOutfit()?.id).toBe("casual");
    });

    it("hue-rotates the canvas for clothing colorways", () => {
      renderer.applyOutfit({ id: "rose" });
      expect(mockCanvas.style.filter).toBe("hue-rotate(310deg)");
      renderer.applyOutfit({ id: "official" });
      expect(mockCanvas.style.filter).toBe("");
    });
  });

  describe("motion playback", () => {
    beforeEach(async () => {
      const config: CubismAdapterConfig = {
        canvas: mockCanvas,
        model: {
          modelPath: "/test/model.json",
          name: "Test Model",
        },
      };
      await renderer.initialize(config);
      await renderer.loadModel(config.model);
    });

    it("should play all motion types without error", () => {
      const motions = [
        "idle",
        "talking",
        "nodding",
        "shaking_head",
        "tilting_head",
        "breathing",
        "wave",
        "nod",
        "shake",
        "thinking",
      ] as const;

      for (const motion of motions) {
        expect(() => renderer.playMotion(motion)).not.toThrow();
      }
    });
  });

  describe("blinking", () => {
    beforeEach(async () => {
      const config: CubismAdapterConfig = {
        canvas: mockCanvas,
        model: {
          modelPath: "/test/model.json",
          name: "Test Model",
        },
      };
      await renderer.initialize(config);
      await renderer.loadModel(config.model);
    });

    it("should handle blink state changes", () => {
      expect(() => renderer.setBlinking(true)).not.toThrow();
      expect(() => renderer.setBlinking(false)).not.toThrow();
    });

    it("should trigger and clean up a tracked manual blink", () => {
      jest.useFakeTimers();
      expect(() => renderer.triggerBlink(75)).not.toThrow();
      renderer.dispose();
      expect(() => jest.runOnlyPendingTimers()).not.toThrow();
      jest.useRealTimers();
    });
  });

  describe("disposal", () => {
    it("should clean up resources on dispose", async () => {
      const config: CubismAdapterConfig = {
        canvas: mockCanvas,
        model: {
          modelPath: "/test/model.json",
          name: "Test Model",
        },
      };
      await renderer.initialize(config);
      await renderer.loadModel(config.model);

      renderer.dispose();

      expect(renderer.isInitialized()).toBe(false);
      expect(renderer.getModel()).toBeNull();
      expect(renderer.getApplication()).toBeNull();
    });

    it("should resize the existing view without creating a new app", async () => {
      const config: CubismAdapterConfig = {
        canvas: mockCanvas,
        model: {
          modelPath: "/test/model.json",
          name: "Test Model",
        },
      };
      await renderer.initialize(config);
      await renderer.loadModel(config.model);
      const appBefore = renderer.getApplication();
      renderer.resize(640, 1080, 0.5);
      expect(renderer.getApplication()).toBe(appBefore);
      expect(renderer.getModel()?.x).toBe(200);
      expect(renderer.getModel()?.y).toBe(200);
      // 800x1600 model in a 400x400 view at 50% fill → 0.125
      expect(renderer.getModel()?.scale.x).toBeCloseTo(0.125);
    });

    it("scales to drawable bounds so empty canvas padding does not shrink the figure", async () => {
      const cubism4 = await import("pixi-live2d-display-lipsyncpatch/cubism4");
      (cubism4.Live2DModel.from as jest.Mock).mockImplementationOnce(() => {
        const scale = {
          x: 1,
          y: 1,
          set(x: number, y?: number) {
            this.x = x;
            this.y = y ?? x;
          },
        };
        return Promise.resolve({
          x: 0,
          y: 0,
          width: 800,
          height: 1600,
          scale,
          anchor: { x: 0.5, y: 0.5, set: jest.fn() },
          internalModel: {
            width: 800,
            height: 1600,
            getDrawableIDs: () => ["body"],
            getDrawableBounds: () => ({
              x: 200,
              y: 400,
              width: 400,
              height: 800,
            }),
            motionManager: {
              startMotion: jest.fn().mockResolvedValue(true),
              stopAllMotions: jest.fn(),
            },
            coreModel: {
              setParameterValueById: jest.fn(),
              getParameterValueById: jest.fn().mockReturnValue(0),
            },
          },
          expression: jest.fn(),
          motion: jest.fn().mockResolvedValue(true),
          speak: jest.fn(),
          stopSpeaking: jest.fn(),
          destroy: jest.fn(),
        });
      });
      const config: CubismAdapterConfig = {
        canvas: mockCanvas,
        model: {
          modelPath: "/test/model.json",
          name: "Test Model",
          scale: 1,
        },
      };
      await renderer.initialize(config);
      await renderer.loadModel(config.model);
      // Padded tight figure in a 400x400 view at fill 1 → height-limited
      expect(renderer.getModel()?.scale.x).toBeCloseTo(
        400 / (800 * FIGURE_BOUNDS_PAD),
      );
    });

    it("ignores water and canvas-sized planes so the figure fills the view", async () => {
      const cubism4 = await import("pixi-live2d-display-lipsyncpatch/cubism4");
      (cubism4.Live2DModel.from as jest.Mock).mockImplementationOnce(() => {
        const scale = {
          x: 1,
          y: 1,
          set(x: number, y?: number) {
            this.x = x;
            this.y = y ?? x;
          },
        };
        const drawables = [
          { id: "body", x: 200, y: 200, width: 400, height: 800 },
          { id: "WaterSurface1", x: 0, y: 1000, width: 800, height: 600 },
          { id: "ArtMeshBg", x: 0, y: 0, width: 800, height: 1600 },
        ];
        return Promise.resolve({
          x: 0,
          y: 0,
          width: 800,
          height: 1600,
          scale,
          anchor: { x: 0.5, y: 0.5, set: jest.fn() },
          internalModel: {
            width: 800,
            height: 1600,
            getDrawableIDs: () => drawables.map((drawable) => drawable.id),
            getDrawableBounds: (index: number) => drawables[index],
            motionManager: {
              startMotion: jest.fn().mockResolvedValue(true),
              stopAllMotions: jest.fn(),
            },
            coreModel: {
              setParameterValueById: jest.fn(),
              getParameterValueById: jest.fn().mockReturnValue(0),
            },
          },
          expression: jest.fn(),
          motion: jest.fn().mockResolvedValue(true),
          speak: jest.fn(),
          stopSpeaking: jest.fn(),
          destroy: jest.fn(),
        });
      });
      const config: CubismAdapterConfig = {
        canvas: mockCanvas,
        model: {
          modelPath: "/test/model.json",
          name: "Test Model",
          scale: 1,
        },
      };
      await renderer.initialize(config);
      await renderer.loadModel(config.model);
      expect(renderer.getNativeSize()).toEqual({
        width: 400 * FIGURE_BOUNDS_PAD,
        height: 800 * FIGURE_BOUNDS_PAD,
      });
      expect(renderer.getModel()?.scale.x).toBeCloseTo(
        400 / (800 * FIGURE_BOUNDS_PAD),
      );
    });

    it("enlarges a half-size figure from the visible pixels", async () => {
      const config: CubismAdapterConfig = {
        canvas: mockCanvas,
        model: {
          modelPath: "/test/model.json",
          name: "Test Model",
          scale: 1,
        },
      };
      await renderer.initialize(config);
      await renderer.loadModel(config.model);
      const app = renderer.getApplication() as unknown as {
        ticker: { flushOnce: () => void };
        renderer: { extract: { pixels: jest.Mock } };
      };
      const pixels = new Uint8Array(400 * 400 * 4);
      for (let y = 100; y < 300; y++) {
        for (let x = 150; x < 250; x++) {
          pixels[(y * 400 + x) * 4 + 3] = 255;
        }
      }
      app.renderer.extract.pixels.mockReturnValue(pixels);
      expect(renderer.getModel()?.scale.x).toBeCloseTo(0.25);
      app.ticker.flushOnce();
      app.ticker.flushOnce();
      expect(renderer.getModel()?.scale.x).toBeCloseTo(0.5);
    });

    it("contain-fits the full figure inside the view", async () => {
      const config: CubismAdapterConfig = {
        canvas: mockCanvas,
        model: {
          modelPath: "/test/model.json",
          name: "Test Model",
          scale: 1,
        },
      };
      await renderer.initialize(config);
      await renderer.loadModel(config.model);
      // 800x1600 in 400x400 at fill 1 → limited by height: 400/1600 = 0.25
      expect(renderer.getModel()?.scale.x).toBeCloseTo(0.25);
      expect(renderer.getModel()?.x).toBe(200);
      expect(renderer.getModel()?.y).toBe(200);
      expect(renderer.getNativeSize()).toEqual({ width: 800, height: 1600 });
    });

    it("should be safe to call dispose multiple times", () => {
      expect(() => {
        renderer.dispose();
        renderer.dispose();
        renderer.dispose();
      }).not.toThrow();
    });
  });

  describe("PARAM_IDS", () => {
    it("should export all standard Live2D parameter IDs", () => {
      expect(PARAM_IDS.PARAM_MOUTH_OPEN_Y).toBe("ParamMouthOpenY");
      expect(PARAM_IDS.PARAM_MOUTH_FORM).toBe("ParamMouthForm");
      expect(PARAM_IDS.PARAM_EYE_L_OPEN).toBe("ParamEyeLOpen");
      expect(PARAM_IDS.PARAM_EYE_R_OPEN).toBe("ParamEyeROpen");
      expect(PARAM_IDS.PARAM_BROW_L_Y).toBe("ParamBrowLY");
      expect(PARAM_IDS.PARAM_BROW_R_Y).toBe("ParamBrowRY");
      expect(PARAM_IDS.PARAM_ANGLE_X).toBe("ParamAngleX");
      expect(PARAM_IDS.PARAM_ANGLE_Y).toBe("ParamAngleY");
      expect(PARAM_IDS.PARAM_ANGLE_Z).toBe("ParamAngleZ");
    });
  });
});

describe("loadCubism4Settings", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("attaches the source URL to fetched Cubism 4 settings", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        Version: 3,
        FileReferences: {
          Moc: "miara.moc3",
          Textures: ["texture_00.png"],
        },
      }),
    }) as unknown as typeof fetch;

    const settings = await loadCubism4Settings(
      "file:///app/models/miara.model3.json",
    );
    expect(settings).toMatchObject({
      url: "file:///app/models/miara.model3.json",
      FileReferences: { Moc: "miara.moc3" },
    });
  });

  it("falls back to the model path when fetch fails", async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error("blocked"));
    await expect(
      loadCubism4Settings("/models/miara.model3.json"),
    ).resolves.toBe("/models/miara.model3.json");
  });
});

describe("createPixiLive2DRenderer", () => {
  it("should create a new renderer instance", async () => {
    const { createPixiLive2DRenderer } = await import(
      "../adapters/pixi-live2d-renderer"
    );
    const renderer = createPixiLive2DRenderer();
    expect(renderer).toBeInstanceOf(PixiLive2DRenderer);
  });
});
