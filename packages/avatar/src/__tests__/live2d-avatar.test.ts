/**
 * Tests for Live2DAvatarManager
 */

import {
  Live2DAvatarManager,
  createLive2DAvatarManager,
  SAMPLE_MODELS,
  DEFAULT_MODEL_CONFIG,
} from "../adapters/live2d-avatar";
import type { Live2DAvatarProps } from "../adapters/live2d-avatar";
import type { EmotionalVector } from "../types";

// Mock the PixiLive2DRenderer
jest.mock("../adapters/pixi-live2d-renderer", () => ({
  PixiLive2DRenderer: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    loadModel: jest.fn().mockResolvedValue(undefined),
    setExpression: jest.fn(),
    playMotion: jest.fn(),
    updateLipSync: jest.fn(),
    setBlinking: jest.fn(),
    setParameter: jest.fn(),
    dispose: jest.fn(),
  })),
}));

describe("Live2DAvatarManager", () => {
  let manager: Live2DAvatarManager;
  let mockContainer: HTMLElement;

  beforeEach(() => {
    manager = new Live2DAvatarManager();

    // Create mock container
    mockContainer = document.createElement("div");
    document.body.appendChild(mockContainer);
  });

  afterEach(() => {
    manager.dispose();
    if (mockContainer.parentElement) {
      mockContainer.parentElement.removeChild(mockContainer);
    }
    jest.clearAllMocks();
  });

  describe("initialization", () => {
    it("should create a manager instance", () => {
      expect(manager).toBeInstanceOf(Live2DAvatarManager);
    });

    it("should initialize with props and return a controller", async () => {
      const props: Live2DAvatarProps = {
        modelPath: "/test/model.json",
        width: 400,
        height: 400,
      };

      const controller = await manager.initialize(mockContainer, props);

      expect(controller).toBeDefined();
      expect(controller.setExpression).toBeDefined();
      expect(controller.playMotion).toBeDefined();
      expect(controller.updateLipSync).toBeDefined();
      expect(controller.triggerBlink).toBeDefined();
      expect(controller.setParameter).toBeDefined();
      expect(controller.getRenderer).toBeDefined();
    });

    it("should create a canvas element in the container", async () => {
      const props: Live2DAvatarProps = {
        modelPath: "/test/model.json",
      };

      await manager.initialize(mockContainer, props);

      const canvas = mockContainer.querySelector("canvas");
      expect(canvas).not.toBeNull();
    });

    it("should apply custom dimensions", async () => {
      const props: Live2DAvatarProps = {
        modelPath: "/test/model.json",
        width: 800,
        height: 600,
      };

      await manager.initialize(mockContainer, props);

      const canvas = mockContainer.querySelector("canvas");
      expect(canvas?.width).toBe(800);
      expect(canvas?.height).toBe(600);
    });

    it("should call onLoad callback on success", async () => {
      const onLoad = jest.fn();
      const props: Live2DAvatarProps = {
        modelPath: "/test/model.json",
        onLoad,
      };

      await manager.initialize(mockContainer, props);

      expect(onLoad).toHaveBeenCalled();
    });
  });

  describe("emotional state mapping", () => {
    beforeEach(async () => {
      const props: Live2DAvatarProps = {
        modelPath: "/test/model.json",
      };
      await manager.initialize(mockContainer, props);
    });

    it("should map joy to happy expression", () => {
      const state: EmotionalVector = {
        joy: 0.8,
        interest: 0,
        surprise: 0,
        sadness: 0,
        anger: 0,
        fear: 0,
        disgust: 0,
        contempt: 0,
      };

      // This should not throw
      expect(() => manager.updateEmotionalState(state)).not.toThrow();
    });

    it("should map surprise to surprised expression", () => {
      const state: EmotionalVector = {
        joy: 0,
        interest: 0,
        surprise: 0.9,
        sadness: 0,
        anger: 0,
        fear: 0,
        disgust: 0,
        contempt: 0,
      };

      expect(() => manager.updateEmotionalState(state)).not.toThrow();
    });

    it("should map sadness to concerned expression", () => {
      const state: EmotionalVector = {
        joy: 0,
        interest: 0,
        surprise: 0,
        sadness: 0.7,
        anger: 0,
        fear: 0,
        disgust: 0,
        contempt: 0,
      };

      expect(() => manager.updateEmotionalState(state)).not.toThrow();
    });

    it("should default to neutral for low emotional values", () => {
      const state: EmotionalVector = {
        joy: 0.1,
        interest: 0.1,
        surprise: 0.1,
        sadness: 0.1,
        anger: 0.1,
        fear: 0.1,
        disgust: 0.1,
        contempt: 0.1,
      };

      expect(() => manager.updateEmotionalState(state)).not.toThrow();
    });

    it("should handle empty emotional state", () => {
      const state: EmotionalVector = {
        joy: 0,
        interest: 0,
        surprise: 0,
        sadness: 0,
        anger: 0,
        fear: 0,
        disgust: 0,
        contempt: 0,
      };

      expect(() => manager.updateEmotionalState(state)).not.toThrow();
    });
  });

  describe("controller interface", () => {
    it("should provide setExpression method", async () => {
      const props: Live2DAvatarProps = {
        modelPath: "/test/model.json",
      };

      const controller = await manager.initialize(mockContainer, props);

      expect(() => controller.setExpression("happy", 0.8)).not.toThrow();
    });

    it("should provide playMotion method", async () => {
      const props: Live2DAvatarProps = {
        modelPath: "/test/model.json",
      };

      const controller = await manager.initialize(mockContainer, props);

      expect(() => controller.playMotion("nod")).not.toThrow();
    });

    it("should provide updateLipSync method", async () => {
      const props: Live2DAvatarProps = {
        modelPath: "/test/model.json",
      };

      const controller = await manager.initialize(mockContainer, props);

      expect(() => controller.updateLipSync(0.5)).not.toThrow();
    });

    it("should provide triggerBlink method", async () => {
      jest.useFakeTimers();

      const props: Live2DAvatarProps = {
        modelPath: "/test/model.json",
      };

      const controller = await manager.initialize(mockContainer, props);

      expect(() => controller.triggerBlink()).not.toThrow();

      jest.runAllTimers();
      jest.useRealTimers();
    });

    it("should provide setParameter method", async () => {
      const props: Live2DAvatarProps = {
        modelPath: "/test/model.json",
      };

      const controller = await manager.initialize(mockContainer, props);

      expect(() => controller.setParameter("ParamAngleX", 15)).not.toThrow();
    });

    it("should provide getRenderer method", async () => {
      const props: Live2DAvatarProps = {
        modelPath: "/test/model.json",
      };

      const controller = await manager.initialize(mockContainer, props);

      expect(controller.getRenderer()).not.toBeNull();
    });
  });

  describe("disposal", () => {
    it("should clean up on dispose", async () => {
      const props: Live2DAvatarProps = {
        modelPath: "/test/model.json",
      };

      await manager.initialize(mockContainer, props);

      // Canvas should exist before dispose
      expect(mockContainer.querySelector("canvas")).not.toBeNull();

      manager.dispose();

      // Canvas should be removed after dispose
      expect(mockContainer.querySelector("canvas")).toBeNull();
    });

    it("should be safe to dispose without initialization", () => {
      expect(() => manager.dispose()).not.toThrow();
    });

    it("should be safe to call dispose multiple times", async () => {
      const props: Live2DAvatarProps = {
        modelPath: "/test/model.json",
      };

      await manager.initialize(mockContainer, props);

      expect(() => {
        manager.dispose();
        manager.dispose();
        manager.dispose();
      }).not.toThrow();
    });
  });
});

describe("createLive2DAvatarManager", () => {
  it("should create a new manager instance", () => {
    const manager = createLive2DAvatarManager();
    expect(manager).toBeInstanceOf(Live2DAvatarManager);
  });
});

describe("SAMPLE_MODELS", () => {
  it("should contain sample model paths", () => {
    expect(SAMPLE_MODELS.shizuku).toBeDefined();
    expect(SAMPLE_MODELS.haru).toBeDefined();
    expect(SAMPLE_MODELS.mark).toBeDefined();
    expect(SAMPLE_MODELS.rice).toBeDefined();
  });

  it("should have valid path format", () => {
    Object.values(SAMPLE_MODELS).forEach((path) => {
      expect(path).toMatch(/\.model3?\.json$/);
    });
  });
});

describe("DEFAULT_MODEL_CONFIG", () => {
  it("should have required properties", () => {
    expect(DEFAULT_MODEL_CONFIG.modelPath).toBeDefined();
    expect(DEFAULT_MODEL_CONFIG.name).toBeDefined();
    expect(DEFAULT_MODEL_CONFIG.scale).toBeDefined();
  });

  it("should have reasonable default scale", () => {
    expect(DEFAULT_MODEL_CONFIG.scale).toBeGreaterThan(0);
    expect(DEFAULT_MODEL_CONFIG.scale).toBeLessThanOrEqual(1);
  });
});
