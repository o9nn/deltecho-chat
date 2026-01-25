/**
 * Tests for PixiLive2DRenderer
 *
 * Since the actual Live2D rendering requires a browser environment with
 * canvas support, these tests focus on the API contract and mock behavior.
 */

import {
  PixiLive2DRenderer,
  PARAM_IDS,
} from "../adapters/pixi-live2d-renderer";
import type { CubismAdapterConfig } from "../adapters/cubism-adapter";

// Mock the dynamic imports for Node.js environment
jest.mock("pixi.js", () => ({
  Application: jest.fn().mockImplementation(() => ({
    stage: {
      addChild: jest.fn(),
    },
    view: {
      width: 400,
      height: 400,
    },
    ticker: {},
    destroy: jest.fn(),
  })),
}));

jest.mock("pixi-live2d-display-lipsyncpatch", () => ({
  Live2DModel: {
    registerTicker: jest.fn(),
    from: jest.fn().mockResolvedValue({
      x: 0,
      y: 0,
      scale: { x: 1, y: 1, set: jest.fn() },
      anchor: { x: 0.5, y: 0.5, set: jest.fn() },
      internalModel: {
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
    }),
  },
}));

describe("PixiLive2DRenderer", () => {
  let renderer: PixiLive2DRenderer;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    renderer = new PixiLive2DRenderer();
    // Create a mock canvas element
    mockCanvas = {
      width: 400,
      height: 400,
      parentElement: { clientWidth: 400, clientHeight: 400 },
      getContext: jest.fn(),
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

describe("createPixiLive2DRenderer", () => {
  it("should create a new renderer instance", async () => {
    const { createPixiLive2DRenderer } =
      await import("../adapters/pixi-live2d-renderer");
    const renderer = createPixiLive2DRenderer();
    expect(renderer).toBeInstanceOf(PixiLive2DRenderer);
  });
});
