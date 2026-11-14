/**
 * Tests for PixiLive2DRenderer
 *
 * Since the actual Live2D rendering requires a browser environment with
 * canvas support, these tests focus on the API contract and mock behavior.
 * The timer fixtures mirror installed native API ordering, not actual Cubism
 * motion/physics outputs, painted frames, performance, or OS visibility.
 */

import { Application, Ticker, UPDATE_PRIORITY } from "pixi.js";
import { Live2DModel } from "pixi-live2d-display-lipsyncpatch/cubism4";
import {
  PixiLive2DRenderer,
  isSoftwareWebGLRenderer,
  PARAM_IDS,
  loadCubism4Settings,
} from "../adapters/pixi-live2d-renderer";
import { FIGURE_BOUNDS_PAD } from "../adapters/live2d-figure-bounds";
import type { CubismAdapterConfig } from "../adapters/cubism-adapter";
import { MELODY_IDENTITY_RIG } from "../automesh";

// Mock the dynamic imports for Node.js environment
const installUnsafeEval = jest.fn();

jest.mock("@pixi/unsafe-eval", () => ({
  install: (...args: unknown[]) => installUnsafeEval(...args),
}));

jest.mock("pixi.js", () => ({
  UPDATE_PRIORITY: { NORMAL: 0, LOW: -25, UTILITY: -50 },
  Ticker: { shared: { started: true } },
  Application: jest
    .fn()
    .mockImplementation(
      (options: { resolution?: number; autoStart?: boolean }) => {
        type Listener = {
          callback: (delta: number) => void;
          context: unknown;
          priority: number;
          once: boolean;
        };
        const listeners: Listener[] = [];
        const trace: string[] = [];
        const ticker = {
          started: options.autoStart !== false,
          speed: 1,
          maxFPS: 0,
          deltaMS: 0,
          listeners,
          trace,
          start: jest.fn(() => {
            ticker.started = true;
          }),
          stop: jest.fn(() => {
            ticker.started = false;
          }),
          add: jest.fn((callback, context = null, priority = 0): unknown => {
            listeners.push({ callback, context, priority, once: false });
            return ticker;
          }),
          addOnce: jest.fn(
            (callback, context = null, priority = 0): unknown => {
              listeners.push({ callback, context, priority, once: true });
              return ticker;
            },
          ),
          remove: jest.fn((callback, context = null): unknown => {
            for (let i = listeners.length - 1; i >= 0; i--) {
              if (
                listeners[i].callback === callback &&
                listeners[i].context === context
              )
                listeners.splice(i, 1);
            }
            return ticker;
          }),
          dispatch: (dt = 20) => {
            if (!ticker.started) return;
            ticker.deltaMS = dt * ticker.speed;
            const queued = [...listeners].sort(
              (a, b) => b.priority - a.priority,
            );
            for (const listener of queued) {
              if (!listeners.includes(listener)) continue;
              listener.callback.call(
                listener.context,
                ticker.deltaMS / (1000 / 60),
              );
              if (listener.once)
                ticker.remove(listener.callback, listener.context);
            }
          },
          flushOnce: () => ticker.dispatch(),
        };
        const children: Array<{ _render?: (renderer: unknown) => void }> = [];
        const app = {
          stage: {
            children,
            addChild: jest.fn((child) => {
              children.push(child);
            }),
            removeChildren: jest.fn(() => children.splice(0)),
          },
          view: {
            width: 400,
            height: 400,
            clientWidth: 400,
            clientHeight: 400,
          },
          ticker,
          screen: { width: 400, height: 400 },
          renderer: {
            resize: jest.fn(),
            width: 400,
            height: 400,
            resolution: options.resolution ?? 1,
            extract: {
              pixels: jest.fn(() => {
                trace.push("pixels");
                return new Uint8Array(400 * 400 * 4);
              }),
            },
          },
          render: jest.fn(() => {
            trace.push("render");
            for (const child of children) child._render?.(app.renderer);
            trace.push("rendered");
          }),
          destroy: jest.fn(() => {
            ticker.stop();
            listeners.splice(0);
          }),
        };
        ticker.add(app.render, app, -25);
        return app;
      },
    ),
}));

jest.mock("pixi-live2d-display-lipsyncpatch/cubism4", () => ({
  cubism4Ready: jest.fn().mockResolvedValue(undefined),
  Live2DModel: {
    registerTicker: jest.fn(),
    from: jest.fn().mockImplementation((_source, options) => {
      const ticker = options.ticker;
      const events = new Map<string, Set<() => void>>();
      const scale = {
        x: 1,
        y: 1,
        set(x: number, y?: number) {
          this.x = x;
          this.y = y ?? x;
        },
      };
      const model = {
        x: 0,
        y: 0,
        width: 800,
        height: 1600,
        deltaTime: 0,
        elapsedTime: 0,
        scale,
        anchor: { x: 0.5, y: 0.5, set: jest.fn() },
        automator: {
          ticker,
          autoUpdate: options.autoUpdate,
        },
        internalModel: {
          on: jest.fn((event: string, listener: () => void) => {
            if (!events.has(event)) events.set(event, new Set());
            events.get(event)!.add(listener);
          }),
          off: jest.fn((event: string, listener: () => void) => {
            events.get(event)?.delete(listener);
          }),
          update: jest.fn((_dt: number, _now: number) => {
            ticker.trace.push("internal-update");
            for (const listener of events.get("beforeModelUpdate") ?? [])
              listener();
            model.internalModel.coreModel.update();
            model.internalModel.coreModel.loadParameters();
          }),
          motionManager: {
            startMotion: jest.fn().mockResolvedValue(true),
            stopAllMotions: jest.fn(),
          },
          coreModel: {
            setParameterValueById: jest.fn(),
            getParameterValueById: jest.fn().mockReturnValue(0),
            setPartOpacityById: jest.fn(),
            update: jest.fn(() => {
              ticker.trace.push("core-update");
            }),
            loadParameters: jest.fn(),
          },
        },
        update: jest.fn((dt: number) => {
          ticker.trace.push("timer-update");
          model.deltaTime += dt;
          model.elapsedTime += dt;
        }),
        _render: jest.fn((_renderer) => {
          if (model.deltaTime !== 0) {
            model.internalModel.update(model.deltaTime, model.elapsedTime);
            model.deltaTime = 0;
          }
          ticker.trace.push("native-draw");
        }),
        expression: jest.fn(),
        motion: jest.fn().mockResolvedValue(true),
        speak: jest.fn(),
        stopSpeaking: jest.fn(),
        destroy: jest.fn(() => {
          model.automator.autoUpdate = false;
          ticker.remove(onTickerUpdate);
          events.clear();
        }),
      };
      const onTickerUpdate = () => model.update(ticker.deltaMS);
      if (options.autoUpdate) ticker.add(onTickerUpdate);
      return Promise.resolve(model);
    }),
  },
}));

const mockNativeFrom = (Live2DModel.from as jest.Mock).getMockImplementation()!;
type FixtureModel = Awaited<ReturnType<typeof mockNativeFrom>>;
type FixtureTicker = {
  started: boolean;
  speed: number;
  deltaMS: number;
  start: jest.Mock;
  stop: jest.Mock;
  add: jest.Mock;
  remove: jest.Mock;
  dispatch: (dt?: number) => void;
  flushOnce: () => void;
  trace: string[];
  listeners: Array<{
    callback: () => void;
    context: unknown;
    priority: number;
  }>;
};

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
    jest.restoreAllMocks();
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

    it("caps only software-WebGL renderers while retaining the same Pixi ticker", async () => {
      const context = {
        getExtension: jest.fn(() => ({ UNMASKED_RENDERER_WEBGL: 0x9246 })),
        getParameter: jest.fn(() => "ANGLE (Vulkan SwiftShader Device)"),
        RENDERER: 0x1f01,
      };
      (mockCanvas.getContext as jest.Mock).mockReturnValue(context);
      expect(isSoftwareWebGLRenderer(mockCanvas)).toBe(true);
      await renderer.initialize({
        canvas: mockCanvas,
        model: { modelPath: "/test/model.json", name: "Test Model" },
      });
      const app = (
        renderer as unknown as { app: { ticker: { maxFPS: number } } }
      ).app;
      expect(app.ticker.maxFPS).toBe(30);
      context.getParameter.mockReturnValue("ANGLE (NVIDIA RTX 4000)");
      expect(isSoftwareWebGLRenderer(mockCanvas)).toBe(false);
    });

    it("limits software backing-store DPR without overriding an explicit quality preference", async () => {
      const originalDpr = Object.getOwnPropertyDescriptor(
        window,
        "devicePixelRatio",
      );
      Object.defineProperty(window, "devicePixelRatio", {
        configurable: true,
        value: 2,
      });
      (mockCanvas.getContext as jest.Mock).mockReturnValue({
        getExtension: jest.fn(() => ({ UNMASKED_RENDERER_WEBGL: 0x9246 })),
        getParameter: jest.fn(() => "ANGLE (Vulkan SwiftShader Device)"),
        RENDERER: 0x1f01,
      });
      try {
        const model = { modelPath: "/test/model.json", name: "Test Model" };
        await renderer.initialize({ canvas: mockCanvas, model });
        const app = (
          renderer as unknown as {
            app: { renderer: { resolution: number; resize: jest.Mock } };
          }
        ).app;
        expect(app.renderer.resolution).toBe(1);
        expect(app.renderer.resize).toHaveBeenCalledWith(400, 400);

        const explicitlyHighResolution = new PixiLive2DRenderer();
        try {
          await explicitlyHighResolution.initialize({
            canvas: mockCanvas,
            model,
            pixelRatio: 2,
          });
          const preferred = (
            explicitlyHighResolution as unknown as {
              app: { renderer: { resolution: number } };
            }
          ).app;
          expect(preferred.renderer.resolution).toBe(2);
        } finally {
          explicitlyHighResolution.dispose();
        }
      } finally {
        if (originalDpr)
          Object.defineProperty(window, "devicePixelRatio", originalDpr);
      }
    });

    it("does not cap hardware, unavailable, or uninspectable WebGL", async () => {
      expect(isSoftwareWebGLRenderer(mockCanvas)).toBe(false);
      (mockCanvas.getContext as jest.Mock).mockReturnValue({
        getExtension: jest.fn(() => null),
        getParameter: jest.fn(() => "NVIDIA GeForce RTX 4000"),
        RENDERER: 0x1f01,
      });
      await renderer.initialize({
        canvas: mockCanvas,
        model: { modelPath: "/test/model.json", name: "Test Model" },
      });
      const app = (
        renderer as unknown as { app: { ticker: { maxFPS: number } } }
      ).app;
      expect(app.ticker.maxFPS).toBe(0);
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

  describe("native clock ownership (API-ordering mocks, not performance)", () => {
    const configFor = (canvas: HTMLCanvasElement): CubismAdapterConfig => ({
      canvas,
      model: { modelPath: "/test/model.json", name: "Test Model", scale: 1 },
    });
    const tickerFor = (instance = renderer) =>
      instance.getApplication()!.ticker as unknown as FixtureTicker;
    const modelFor = () => renderer.getModel() as unknown as FixtureModel;
    const visibility = (hidden: boolean) => {
      jest.spyOn(document, "hidden", "get").mockReturnValue(hidden);
      jest
        .spyOn(document, "visibilityState", "get")
        .mockReturnValue(hidden ? "hidden" : "visible");
      document.dispatchEvent(new Event("visibilitychange"));
    };
    const queuedLayout = () =>
      tickerFor().listeners.find(
        ({ priority }) => priority === UPDATE_PRIORITY.UTILITY,
      )!;
    const addBounds = () => {
      const bounds = jest.fn(() => {
        tickerFor().trace.push("bounds");
        return { x: 200, y: 400, width: 400, height: 800 };
      });
      Object.assign(modelFor().internalModel, {
        getDrawableIDs: () => ["body"],
        getDrawableBounds: bounds,
      });
      return bounds;
    };

    it("retains explicit private autoUpdate and forwards scaled ticker time in the model elapsed domain only", async () => {
      visibility(false);
      const config = configFor(mockCanvas);
      await renderer.initialize(config);
      await renderer.loadModel(config.model);
      const ticker = tickerFor();
      const model = modelFor();
      expect(Application).toHaveBeenLastCalledWith(
        expect.objectContaining({ autoStart: false, sharedTicker: false }),
      );
      expect(Live2DModel.registerTicker).not.toHaveBeenCalled();
      expect(Live2DModel.from).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({
          ticker,
          autoUpdate: true,
          autoFocus: true,
          autoHitTest: true,
        }),
      );
      expect(model.automator.ticker).toBe(ticker);
      expect(model.automator.ticker).not.toBe(Ticker.shared);
      expect(model.automator.autoUpdate).toBe(true);
      expect(model.update).not.toHaveBeenCalled();
      expect(model.internalModel.coreModel.update).not.toHaveBeenCalled();
      const captured: Array<[number, number]> = [];
      const original = model.internalModel.update;
      model.internalModel.update = jest.fn((dt: number, now: number) => {
        captured.push([dt, now]);
        original.call(model.internalModel, dt, now);
      });
      jest.spyOn(performance, "now").mockReturnValue(987654321);
      renderer.setAnimationSpeed(0.5);
      ticker.dispatch(20);
      ticker.dispatch(20);
      expect(model.update.mock.calls).toEqual([[10], [10]]);
      expect(captured).toEqual([
        [10, 10],
        [10, 20],
      ]);
      expect(model.deltaTime).toBe(0);
      expect(model.elapsedTime).toBe(20);
      expect(model.internalModel.coreModel.update).toHaveBeenCalledTimes(2);
      expect(
        model.internalModel.coreModel.loadParameters,
      ).toHaveBeenCalledTimes(2);
      expect(ticker.trace.slice(0, 6)).toEqual([
        "timer-update",
        "render",
        "internal-update",
        "core-update",
        "native-draw",
        "rendered",
      ]);
      expect(
        ticker.listeners.filter(
          ({ priority }) => priority === UPDATE_PRIORITY.UTILITY,
        ),
      ).toHaveLength(0);
    });

    it("measures bounds after native render and reads only the following painted framebuffer", async () => {
      visibility(false);
      const config = configFor(mockCanvas);
      await renderer.initialize(config);
      await renderer.loadModel(config.model);
      const ticker = tickerFor();
      const model = modelFor();
      const bounds = addBounds();
      const extract = renderer.getApplication()!.renderer.extract
        .pixels as jest.Mock;
      expect(model.scale.x).toBeCloseTo(0.25);
      expect(bounds).not.toHaveBeenCalled();
      expect(ticker.add).toHaveBeenCalledWith(
        expect.any(Function),
        renderer,
        UPDATE_PRIORITY.UTILITY,
      );
      ticker.dispatch();
      expect(bounds).toHaveBeenCalledTimes(1);
      expect(ticker.trace.indexOf("bounds")).toBeGreaterThan(
        ticker.trace.indexOf("rendered"),
      );
      expect(model.scale.x).toBeCloseTo(400 / (800 * FIGURE_BOUNDS_PAD));
      expect(extract).not.toHaveBeenCalled();
      ticker.dispatch();
      expect(extract.mock.calls).toEqual([[]]);
      expect(ticker.trace.at(-1)).toBe("pixels");
      expect(model.internalModel.coreModel.update).toHaveBeenCalledTimes(2);
    });

    it("waits for consumed native time rather than treating any ticker callback as a render", async () => {
      visibility(false);
      const config = configFor(mockCanvas);
      await renderer.initialize(config);
      await renderer.loadModel(config.model);
      const layout = queuedLayout();
      const bounds = addBounds();
      layout.callback.call(layout.context);
      modelFor().update(20);
      layout.callback.call(layout.context);
      expect(bounds).not.toHaveBeenCalled();
      expect(modelFor().internalModel.coreModel.update).not.toHaveBeenCalled();
      tickerFor().dispatch(20);
      expect(bounds).toHaveBeenCalledTimes(1);
      expect(modelFor().internalModel.coreModel.update).toHaveBeenCalledTimes(
        1,
      );
    });

    it("honors hidden-before-initialization and resumes queued layout without hidden native stepping", async () => {
      visibility(true);
      const config = configFor(mockCanvas);
      await renderer.initialize(config);
      const ticker = tickerFor();
      expect(ticker.started).toBe(false);
      expect(ticker.start).not.toHaveBeenCalled();
      await renderer.loadModel(config.model);
      const model = modelFor();
      const bounds = addBounds();
      const layout = queuedLayout();
      ticker.dispatch(10000);
      layout.callback.call(layout.context);
      expect(ticker.started).toBe(false);
      expect(model.elapsedTime).toBe(0);
      expect(model.update).not.toHaveBeenCalled();
      expect(bounds).not.toHaveBeenCalled();
      visibility(false);
      ticker.dispatch(20);
      expect(model.elapsedTime).toBe(20);
      expect(bounds).toHaveBeenCalledTimes(1);
      ticker.dispatch(20);
      expect(model.internalModel.coreModel.update).toHaveBeenCalledTimes(2);
    });

    it("pauses/resumes native ownership and leaves scheduled visible-fill idle while hidden", async () => {
      visibility(false);
      const config = configFor(mockCanvas);
      await renderer.initialize(config);
      await renderer.loadModel(config.model);
      const ticker = tickerFor();
      const model = modelFor();
      const extract = renderer.getApplication()!.renderer.extract
        .pixels as jest.Mock;
      ticker.dispatch(20);
      const fill = queuedLayout();
      visibility(true);
      ticker.dispatch(10000);
      fill.callback.call(fill.context);
      expect(model.elapsedTime).toBe(20);
      expect(model.internalModel.coreModel.update).toHaveBeenCalledTimes(1);
      expect(extract).not.toHaveBeenCalled();
      expect(model.automator.autoUpdate).toBe(true);
      visibility(false);
      ticker.dispatch(20);
      expect(ticker.started).toBe(true);
      expect(model.elapsedTime).toBe(40);
      expect(extract.mock.calls).toEqual([[]]);
    });

    it("cancels queued layout/native listeners and prevents visibility restart after unmount", async () => {
      visibility(false);
      const config = configFor(mockCanvas);
      await renderer.initialize(config);
      await renderer.loadModel(config.model);
      const ticker = tickerFor();
      const model = modelFor();
      const app = renderer.getApplication()!;
      const layout = queuedLayout();
      renderer.dispose();
      expect(ticker.remove).toHaveBeenCalledWith(layout.callback, renderer);
      layout.callback.call(layout.context);
      visibility(true);
      visibility(false);
      ticker.dispatch(20);
      expect(ticker.started).toBe(false);
      expect(model.automator.autoUpdate).toBe(false);
      expect(model.update).not.toHaveBeenCalled();
      expect(app.renderer.extract.pixels).not.toHaveBeenCalled();
      expect(ticker.listeners).toHaveLength(0);
    });

    it("cancels the prior generation and retains stage/reload fit and custom expression/motion mix", async () => {
      visibility(false);
      const config = {
        ...configFor(mockCanvas),
        expressions: { happy: "custom-happy" },
        motions: { wave: { group: "CustomWave", index: 3 } },
      };
      await renderer.initialize(config);
      await renderer.loadModel({ ...config.model, offset: { x: 7, y: -3 } });
      const ticker = tickerFor();
      const previous = modelFor();
      const stale = queuedLayout();
      await renderer.loadModel({ ...config.model, offset: { x: 7, y: -3 } });
      const model = modelFor();
      stale.callback.call(stale.context);
      expect(previous.destroy).toHaveBeenCalledTimes(1);
      expect(previous.automator.autoUpdate).toBe(false);
      expect(ticker.remove).toHaveBeenCalledWith(stale.callback, renderer);
      expect(renderer.getApplication()!.stage.children).toEqual([model]);
      renderer.setExpression("happy", 0.8);
      renderer.playMotion("wave", 3);
      expect(model.expression).toHaveBeenCalledWith("custom-happy");
      expect(model.motion).toHaveBeenCalledWith("CustomWave", 3, 3);
      ticker.dispatch();
      expect(model.x).toBe(207);
      expect(model.y).toBe(197);
      expect(model.automator.autoUpdate).toBe(true);
      expect(previous.update).not.toHaveBeenCalled();
    });

    it("adds no layout timer and leaves another avatar's private ticker running on disposal", async () => {
      visibility(false);
      const config = configFor(mockCanvas);
      await renderer.initialize(config);
      const other = new PixiLive2DRenderer();
      try {
        await other.initialize(config);
        await other.loadModel(config.model);
        const timer = jest.spyOn(window, "setTimeout");
        await renderer.loadModel(config.model);
        expect(timer).not.toHaveBeenCalled();
        const otherTicker = tickerFor(other);
        const otherModel = other.getModel() as unknown as FixtureModel;
        expect(tickerFor()).not.toBe(otherTicker);
        renderer.dispose();
        expect(otherTicker.started).toBe(true);
        otherTicker.dispatch();
        expect(otherModel.elapsedTime).toBe(20);
      } finally {
        other.dispose();
      }
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

    it("excludes Cubism cached virtual parameters from real rig readback", () => {
      const core = renderer.getModel()!.internalModel.coreModel;
      Object.assign(core, {
        getParameterCount: () => 1,
        getParameterIndex: (id: string) => (id === "ParamAngleX" ? 0 : 1),
      });
      (core.getParameterValueById as jest.Mock).mockReturnValue(0.8);
      expect(renderer.getParameter("ParamAngleX")).toBe(0.8);
      expect(renderer.getParameter("ParamGhost")).toBeUndefined();
      expect(core.getParameterValueById).toHaveBeenCalledTimes(1);
      (core.getParameterValueById as jest.Mock).mockReturnValue(NaN);
      expect(renderer.getParameter("ParamAngleX")).toBeUndefined();
    });

    it("abstains when parameter membership cannot be established", () => {
      expect(renderer.getParameter("ParamAngleX")).toBeUndefined();
    });

    it("observes final parameters before Cubism restores saved values and cleans up on model reload", async () => {
      const old = renderer.getModel()!.internalModel;
      Object.assign(old.coreModel, {
        getParameterCount: () => 1,
        getParameterIndex: () => 0,
      });
      const observed: Array<number | undefined> = [];
      const observer = () =>
        observed.push(renderer.getParameter("ParamAngleX"));
      expect(renderer.addParameterObserver(observer)).toBe(true);
      expect(renderer.addParameterObserver(observer)).toBe(true);
      const callbacks = (old.on as jest.Mock).mock.calls.filter(
        ([event]) => event === "beforeModelUpdate",
      );
      // Wardrobe also uses the native event; the observation hook is last.
      const observe = callbacks.at(-1)![1];
      (old.coreModel.getParameterValueById as jest.Mock).mockReturnValue(12);
      observe(); // motion/expression/physics values consumed by model.update()
      (old.coreModel.getParameterValueById as jest.Mock).mockReturnValue(0); // loadParameters()
      expect(observed).toEqual([12]);
      expect(renderer.getParameter("ParamAngleX")).toBe(0);
      await renderer.loadModel({
        modelPath: "/test/second.model3.json",
        name: "second",
      });
      expect(old.off).toHaveBeenCalledWith("beforeModelUpdate", observe);
      const next = renderer.getModel()!.internalModel;
      expect(next.on).toHaveBeenCalledWith("beforeModelUpdate", observe);
      renderer.removeParameterObserver(observer);
      expect(next.off).toHaveBeenCalledWith("beforeModelUpdate", observe);
      renderer.dispose();
      observe();
      expect(observed).toEqual([12]);
    });

    it("abstains without a removable native event and isolates observer exceptions", () => {
      const internal = renderer.getModel()!.internalModel;
      const on = internal.on;
      internal.on = undefined;
      expect(renderer.addParameterObserver(jest.fn())).toBe(false);
      internal.on = on;
      renderer.addParameterObserver(() => {
        throw new Error("diagnostic failed");
      });
      const next = jest.fn();
      renderer.addParameterObserver(next);
      const hook = (internal.on as jest.Mock).mock.calls.at(-1)![1];
      expect(() => hook()).not.toThrow();
      expect(next).toHaveBeenCalledTimes(1);
      renderer.dispose();
      hook();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("reports ranges only for genuine native parameters with a finite nonzero span", () => {
      const core = renderer.getModel()!.internalModel.coreModel;
      const min = jest.fn(() => -30);
      const max = jest.fn(() => 30);
      Object.assign(core, {
        getParameterCount: () => 1,
        getParameterIndex: (id: string) => (id === "ParamAngleX" ? 0 : 1),
        getParameterMinimumValue: min,
        getParameterMaximumValue: max,
      });
      expect(renderer.getParameterRange("ParamAngleX")).toEqual({
        min: -30,
        max: 30,
      });
      expect(renderer.getParameterRange("ParamGhost")).toBeUndefined();
      expect(min).toHaveBeenCalledTimes(1);
      max.mockReturnValue(-30);
      expect(renderer.getParameterRange("ParamAngleX")).toBeUndefined();
      max.mockReturnValue(Infinity);
      expect(renderer.getParameterRange("ParamAngleX")).toBeUndefined();
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

    it("keeps an explicit Melody hue of 0 on the aria preset", () => {
      renderer.applyOutfit({
        id: "aria",
        hueShift: 0,
        hiddenGroups: ["water", "background", "chestCloth"],
      });
      expect(mockCanvas.style.filter).toBe("");
      expect(renderer.getAppliedOutfit()?.hueShift).toBe(0);
      expect(renderer.getAppliedOutfit()?.hiddenGroups).toEqual(
        expect.arrayContaining(["chestCloth"]),
      );
    });
  });

  describe("identity rig", () => {
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

    it("deforms vertices after Cubism update without re-scaling baked physics", () => {
      const positions = new Float32Array([0.5, 0.2]);
      const particles = [{ mobility: 1, delay: 1, acceleration: 1, radius: 1 }];
      const outputs = [{ angleScale: 1, weight: 1 }];
      const model = renderer.getModel() as unknown as {
        internalModel: {
          update: (dt: number, now: number) => void;
          getDrawableIDs: () => string[];
          getDrawableBounds: (
            index: number,
            box?: { x: number; y: number; width: number; height: number },
          ) => { x: number; y: number; width: number; height: number };
          physics: {
            _physicsRig: {
              settings: Array<{
                baseParticleIndex: number;
                particleCount: number;
                baseOutputIndex: number;
                outputCount: number;
              }>;
              particles: typeof particles;
              outputs: typeof outputs;
            };
          };
          coreModel: {
            getDrawableVertexPositions: (index: number) => Float32Array;
            getDrawableCount: () => number;
          };
        };
      };
      let cubismUpdated = false;
      model.internalModel.update = () => {
        cubismUpdated = true;
        positions[0] = 0.5;
        positions[1] = 0.2;
      };
      model.internalModel.getDrawableIDs = () => ["ArtMesh0"];
      model.internalModel.getDrawableBounds = () => ({
        x: 0,
        y: 0,
        width: 1,
        height: 1,
      });
      model.internalModel.physics = {
        _physicsRig: {
          settings: [
            {
              baseParticleIndex: 0,
              particleCount: 1,
              baseOutputIndex: 0,
              outputCount: 1,
            },
          ],
          particles,
          outputs,
        },
      };
      model.internalModel.coreModel.getDrawableVertexPositions = () =>
        positions;
      model.internalModel.coreModel.getDrawableCount = () => 1;

      renderer.applyIdentityRig(MELODY_IDENTITY_RIG);
      expect(particles[0].mobility).toBe(1);
      model.internalModel.update(16, 0);
      expect(cubismUpdated).toBe(true);
      expect(positions[1]).toBeGreaterThan(0.2);

      renderer.clearIdentityRig();
      expect(particles[0].mobility).toBe(1);
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
      (cubism4.Live2DModel.from as jest.Mock).mockImplementationOnce(
        async (...args) => {
          const model = await mockNativeFrom(...args);
          Object.assign(model.internalModel, {
            width: 800,
            height: 1600,
            getDrawableIDs: () => ["body"],
            getDrawableBounds: () => ({
              x: 200,
              y: 400,
              width: 400,
              height: 800,
            }),
          });
          return model;
        },
      );
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
      expect(renderer.getModel()?.scale.x).toBeCloseTo(0.25);
      (
        renderer.getApplication()!.ticker as unknown as FixtureTicker
      ).dispatch();
      // Padded tight figure in a 400x400 view at fill 1 → height-limited
      expect(renderer.getModel()?.scale.x).toBeCloseTo(
        400 / (800 * FIGURE_BOUNDS_PAD),
      );
    });

    it("ignores water and canvas-sized planes so the figure fills the view", async () => {
      const cubism4 = await import("pixi-live2d-display-lipsyncpatch/cubism4");
      (cubism4.Live2DModel.from as jest.Mock).mockImplementationOnce(
        async (...args) => {
          const model = await mockNativeFrom(...args);
          const drawables = [
            { id: "body", x: 200, y: 200, width: 400, height: 800 },
            { id: "WaterSurface1", x: 0, y: 1000, width: 800, height: 600 },
            { id: "ArtMeshBg", x: 0, y: 0, width: 800, height: 1600 },
          ];
          Object.assign(model.internalModel, {
            width: 800,
            height: 1600,
            getDrawableIDs: () => drawables.map((drawable) => drawable.id),
            getDrawableBounds: (index: number) => drawables[index],
          });
          return model;
        },
      );
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
      (
        renderer.getApplication()!.ticker as unknown as FixtureTicker
      ).dispatch();
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
