import {
  Live2DAvatarManager,
  type Live2DAvatarProps,
} from "../adapters/live2d-avatar";
import { PixiLive2DRenderer } from "../adapters/pixi-live2d-renderer";

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
  PixiLive2DRenderer: jest.fn(),
}));

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

type RendererDouble = {
  initialize: jest.Mock<Promise<void>, [unknown]>;
  loadModel: jest.Mock<Promise<void>, [unknown]>;
  dispose: jest.Mock<void, []>;
  setParameter: jest.Mock<void, [string, number]>;
  addFrameListener: jest.Mock<void, [(deltaTime: number) => void]>;
  removeFrameListener: jest.Mock<void, [(deltaTime: number) => void]>;
  addParameterObserver: jest.Mock<boolean, [() => void]>;
  removeParameterObserver: jest.Mock<void, [() => void]>;
};

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const flushMicrotasks = async (count = 8): Promise<void> => {
  for (let index = 0; index < count; index++) {
    await Promise.resolve();
  }
};

const createRenderer = (
  initialize: Promise<void> = Promise.resolve(),
): RendererDouble => ({
  initialize: jest.fn().mockReturnValue(initialize),
  loadModel: jest.fn().mockResolvedValue(undefined),
  dispose: jest.fn(),
  setParameter: jest.fn(),
  addFrameListener: jest.fn(),
  removeFrameListener: jest.fn(),
  addParameterObserver: jest.fn().mockReturnValue(true),
  removeParameterObserver: jest.fn(),
});

const rendererConstructor = PixiLive2DRenderer as unknown as jest.Mock;

describe("Live2DAvatarManager initialization lifecycle", () => {
  let manager: Live2DAvatarManager;
  let container: HTMLElement;

  beforeEach(() => {
    manager = new Live2DAvatarManager();
    container = document.createElement("div");
    document.body.appendChild(container);
    rendererConstructor.mockReset();
  });

  afterEach(() => {
    manager.dispose();
    container.remove();
    jest.clearAllMocks();
  });

  it.each(["resolve", "reject"] as const)(
    "isolates a stale initialize that later %ss",
    async (settlement) => {
      const firstInitialization = deferred<void>();
      const rendererA = createRenderer(firstInitialization.promise);
      const rendererB = createRenderer();
      rendererConstructor
        .mockImplementationOnce(() => rendererA)
        .mockImplementationOnce(() => rendererB);

      const onLoadA = jest.fn();
      const onErrorA = jest.fn();
      const onLoadB = jest.fn();
      const onErrorB = jest.fn();
      const propsA: Live2DAvatarProps = {
        modelPath: "/models/a.model3.json",
        onLoad: onLoadA,
        onError: onErrorA,
      };
      const propsB: Live2DAvatarProps = {
        modelPath: "/models/b.model3.json",
        onLoad: onLoadB,
        onError: onErrorB,
      };

      const initializeA = manager.initialize(container, propsA);
      await flushMicrotasks();
      expect(rendererA.initialize).toHaveBeenCalledTimes(1);
      const canvasA = (
        rendererA.initialize.mock.calls[0][0] as {
          canvas: HTMLCanvasElement;
        }
      ).canvas;

      const controllerB = await manager.initialize(container, propsB);
      const rendererBCurrent = controllerB.getRenderer();
      const canvasB = (
        rendererB.initialize.mock.calls[0][0] as {
          canvas: HTMLCanvasElement;
        }
      ).canvas;
      expect(rendererBCurrent).toBe(rendererB);
      expect(rendererB.loadModel).toHaveBeenCalledTimes(1);
      expect(rendererB.loadModel).toHaveBeenCalledWith(
        expect.objectContaining({ modelPath: propsB.modelPath }),
      );
      expect(onLoadB).toHaveBeenCalledTimes(1);
      expect(rendererB.addFrameListener).toHaveBeenCalledTimes(2);
      expect(rendererB.addParameterObserver).toHaveBeenCalledTimes(1);

      if (settlement === "resolve") {
        firstInitialization.resolve(undefined);
      } else {
        firstInitialization.reject(new Error("stale renderer A failed"));
      }
      const staleController = await initializeA;

      expect(staleController.getRenderer()).toBe(rendererB);
      expect(rendererA.dispose).toHaveBeenCalledTimes(1);
      expect(rendererB.dispose).not.toHaveBeenCalled();
      expect(rendererB.loadModel).toHaveBeenCalledTimes(1);
      expect(onLoadA).not.toHaveBeenCalled();
      expect(onErrorA).not.toHaveBeenCalled();
      expect(onErrorB).not.toHaveBeenCalled();
      expect(container.contains(canvasA)).toBe(false);
      expect(container.contains(canvasB)).toBe(true);
      expect(container.querySelectorAll("canvas")).toHaveLength(1);
      expect(rendererB.addFrameListener).toHaveBeenCalledTimes(2);
      expect(rendererB.addParameterObserver).toHaveBeenCalledTimes(1);
    },
  );

  it("suppresses callbacks and eventually releases local resources when disposed while pending", async () => {
    const initialization = deferred<void>();
    const renderer = createRenderer(initialization.promise);
    rendererConstructor.mockImplementationOnce(() => renderer);
    const onLoad = jest.fn();
    const onError = jest.fn();

    const pending = manager.initialize(container, {
      modelPath: "/models/pending.model3.json",
      onLoad,
      onError,
    });
    await flushMicrotasks();
    expect(renderer.initialize).toHaveBeenCalledTimes(1);
    const canvas = (
      renderer.initialize.mock.calls[0][0] as {
        canvas: HTMLCanvasElement;
      }
    ).canvas;

    manager.dispose();
    expect(container.contains(canvas)).toBe(true);

    initialization.resolve(undefined);
    const cancelledController = await pending;

    expect(cancelledController.getRenderer()).toBeNull();
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(container.contains(canvas)).toBe(false);
    expect(onLoad).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(renderer.loadModel).not.toHaveBeenCalled();
    expect(renderer.addFrameListener).not.toHaveBeenCalled();
    expect(renderer.addParameterObserver).not.toHaveBeenCalled();
  });

  it("cleans a current initialization failure once and reports it to its owner", async () => {
    const failure = new Error("current renderer failed");
    const renderer = createRenderer(Promise.reject(failure));
    rendererConstructor.mockImplementationOnce(() => renderer);
    const onLoad = jest.fn();
    const onError = jest.fn();

    await expect(
      manager.initialize(container, {
        modelPath: "/models/failure.model3.json",
        onLoad,
        onError,
      }),
    ).rejects.toThrow(failure);

    expect(onLoad).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(failure);
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(renderer.loadModel).not.toHaveBeenCalled();
    expect(renderer.addFrameListener).not.toHaveBeenCalled();
    expect(renderer.addParameterObserver).not.toHaveBeenCalled();
    expect(container.querySelector("canvas")).toBeNull();

    manager.dispose();
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
  });
});
