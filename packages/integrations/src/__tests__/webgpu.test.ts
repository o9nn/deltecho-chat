/**
 * WebGPU Inference Engine Tests
 */

import {
  WebGPUInferenceEngine,
  DEFAULT_WEBGPU_CONFIG,
} from "../webgpu/index.js";
import type { WebGPUConfig, InferenceRequest } from "../webgpu/index.js";

// Mock the WebGPU API
const mockBuffer = {
  mapAsync: jest.fn().mockResolvedValue(undefined),
  getMappedRange: jest.fn().mockReturnValue(new ArrayBuffer(1024)),
  unmap: jest.fn(),
  destroy: jest.fn(),
  size: 1024,
  usage: 0,
  label: "mock-buffer",
};

const mockCommandEncoder = {
  beginComputePass: jest.fn().mockReturnValue({
    setPipeline: jest.fn(),
    setBindGroup: jest.fn(),
    dispatchWorkgroups: jest.fn(),
    end: jest.fn(),
  }),
  copyBufferToBuffer: jest.fn(),
  finish: jest.fn().mockReturnValue({}),
};

const mockDevice = {
  createShaderModule: jest.fn().mockReturnValue({}),
  createBuffer: jest.fn().mockReturnValue(mockBuffer),
  createComputePipeline: jest.fn().mockReturnValue({
    getBindGroupLayout: jest.fn().mockReturnValue({}),
  }),
  createBindGroup: jest.fn().mockReturnValue({}),
  createBindGroupLayout: jest.fn().mockReturnValue({}),
  createPipelineLayout: jest.fn().mockReturnValue({}),
  createCommandEncoder: jest.fn().mockReturnValue(mockCommandEncoder),
  queue: {
    submit: jest.fn(),
    writeBuffer: jest.fn(),
    onSubmittedWorkDone: jest.fn().mockResolvedValue(undefined),
  },
  destroy: jest.fn(),
  // Use a promise that never resolves to prevent device from being nullified
  lost: new Promise<{ message: string }>(() => {}),
  limits: {
    maxBufferSize: 1024 * 1024 * 1024,
    maxStorageBufferBindingSize: 1024 * 1024 * 512,
    maxComputeWorkgroupsPerDimension: 65535,
    maxComputeInvocationsPerWorkgroup: 256,
    maxComputeWorkgroupSizeX: 256,
    maxComputeWorkgroupSizeY: 256,
    maxComputeWorkgroupSizeZ: 64,
    maxBindGroups: 4,
    maxDynamicStorageBuffersPerPipelineLayout: 8,
  },
  features: new Set(["shader-f16"]),
};

const mockAdapter = {
  requestDevice: jest.fn().mockResolvedValue(mockDevice),
  requestAdapterInfo: jest.fn().mockResolvedValue({
    device: "Mock GPU",
    vendor: "Mock Vendor",
    description: "Mock Driver",
  }),
  limits: {
    maxBufferSize: 1024 * 1024 * 1024,
    maxStorageBufferBindingSize: 1024 * 1024 * 512,
    maxComputeWorkgroupsPerDimension: 65535,
    maxComputeInvocationsPerWorkgroup: 256,
    maxComputeWorkgroupSizeX: 256,
    maxComputeWorkgroupSizeY: 256,
    maxComputeWorkgroupSizeZ: 64,
    maxBindGroups: 4,
    maxDynamicStorageBuffersPerPipelineLayout: 8,
  },
  features: new Set(["shader-f16"]),
};

// Setup global navigator.gpu mock
Object.defineProperty(global, "navigator", {
  value: {
    gpu: {
      requestAdapter: jest.fn().mockResolvedValue(mockAdapter),
    },
  },
  writable: true,
});

describe("WebGPUInferenceEngine", () => {
  const mockConfig: WebGPUConfig = {
    model: {
      id: "test-model",
      type: "phi-3",
    },
    debug: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Restore the mock after clearing
    (navigator.gpu as any).requestAdapter.mockResolvedValue(mockAdapter);
  });

  describe("static methods", () => {
    it("should check WebGPU support", async () => {
      const supported = await WebGPUInferenceEngine.isSupported();
      expect(supported).toBe(true);
    });

    it("should return false when navigator.gpu is missing", async () => {
      const originalNavigator = global.navigator;
      Object.defineProperty(global, "navigator", { value: {}, writable: true });

      const supported = await WebGPUInferenceEngine.isSupported();
      expect(supported).toBe(false);

      Object.defineProperty(global, "navigator", {
        value: originalNavigator,
        writable: true,
      });
    });

    it("should get device capabilities", async () => {
      const capabilities = await WebGPUInferenceEngine.getCapabilities();

      expect(capabilities).not.toBeNull();
      expect(capabilities!.name).toBe("Mock GPU");
      expect(capabilities!.vendor).toBe("Mock Vendor");
      expect(capabilities!.limits).toBeDefined();
      expect(capabilities!.limits.maxBufferSize).toBe(1024 * 1024 * 1024);
    });
  });

  describe("constructor", () => {
    it("should create an engine with config", () => {
      const engine = new WebGPUInferenceEngine(mockConfig);
      expect(engine).toBeInstanceOf(WebGPUInferenceEngine);
    });

    it("should merge with default config", () => {
      const engine = new WebGPUInferenceEngine(mockConfig);
      expect(engine).toBeDefined();
    });
  });

  describe("initialization", () => {
    it("should initialize WebGPU device", async () => {
      const engine = new WebGPUInferenceEngine(mockConfig);
      await engine.initialize();

      expect(navigator.gpu?.requestAdapter).toHaveBeenCalled();
      expect(mockAdapter.requestDevice).toHaveBeenCalled();
    });
  });

  describe("model loading", () => {
    it("should load a model with progress callback", async () => {
      const engine = new WebGPUInferenceEngine(mockConfig);
      const progressCallback = jest.fn();

      await engine.loadModel(progressCallback);

      expect(engine.isModelLoaded()).toBe(true);
      expect(engine.getModelId()).toBe("test-model");
      expect(progressCallback).toHaveBeenCalled();

      // Check final progress is ready
      const finalCall =
        progressCallback.mock.calls[progressCallback.mock.calls.length - 1][0];
      expect(finalCall.stage).toBe("ready");
      expect(finalCall.progress).toBe(100);
    });

    it("should emit model_ready event", async () => {
      const engine = new WebGPUInferenceEngine(mockConfig);
      const eventListener = jest.fn();

      engine.addEventListener(eventListener);
      await engine.loadModel();

      const readyEvents = eventListener.mock.calls.filter(
        (call) => call[0].type === "model_ready",
      );
      expect(readyEvents.length).toBe(1);
      expect(readyEvents[0][0].modelId).toBe("test-model");
    });
  });

  describe("inference", () => {
    let engine: WebGPUInferenceEngine;

    beforeEach(async () => {
      engine = new WebGPUInferenceEngine(mockConfig);
      await engine.loadModel();
    });

    it("should generate text from prompt", async () => {
      const request: InferenceRequest = {
        prompt: "Hello, world!",
      };

      const result = await engine.generate(request);

      expect(result.text).toBeDefined();
      expect(result.outputTokens).toBeGreaterThan(0);
      expect(result.inputTokens).toBeGreaterThan(0);
      expect(result.generationTimeMs).toBeGreaterThan(0);
      expect(result.tokensPerSecond).toBeGreaterThan(0);
      expect(["completed", "max_tokens", "stop_sequence"]).toContain(
        result.finishReason,
      );
    });

    it("should call onToken callback for streaming", async () => {
      const onToken = jest.fn();

      const request: InferenceRequest = {
        prompt: "Test prompt",
        onToken,
      };

      await engine.generate(request);

      expect(onToken).toHaveBeenCalled();
    });

    it("should emit inference events", async () => {
      const eventListener = jest.fn();
      engine.addEventListener(eventListener);

      await engine.generate({ prompt: "Test" });

      const startEvents = eventListener.mock.calls.filter(
        (c) => c[0].type === "inference_start",
      );
      const completeEvents = eventListener.mock.calls.filter(
        (c) => c[0].type === "inference_complete",
      );

      expect(startEvents.length).toBe(1);
      expect(completeEvents.length).toBe(1);
    });

    it("should support system message and chat history", async () => {
      const request: InferenceRequest = {
        prompt: "What is the meaning of life?",
        systemMessage: "You are a helpful assistant.",
        chatHistory: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi there!" },
        ],
      };

      const result = await engine.generate(request);
      expect(result.text).toBeDefined();
    });
  });

  describe("chat method", () => {
    it("should provide simplified chat interface", async () => {
      const engine = new WebGPUInferenceEngine(mockConfig);
      await engine.loadModel();

      const response = await engine.chat("Hello!", [], "You are helpful.");
      expect(typeof response).toBe("string");
    });
  });

  describe("memory management", () => {
    it("should report memory usage", async () => {
      const engine = new WebGPUInferenceEngine(mockConfig);
      await engine.loadModel();

      const usage = engine.getMemoryUsage();

      expect(usage.gpuMemoryUsed).toBeGreaterThanOrEqual(0);
      expect(usage.gpuMemoryAvailable).toBeGreaterThan(0);
      expect(usage.cpuMemoryUsed).toBeGreaterThanOrEqual(0);
      expect(usage.kvCacheSize).toBeGreaterThanOrEqual(0);
    });
  });

  describe("unload", () => {
    it("should unload model and release resources", async () => {
      const engine = new WebGPUInferenceEngine(mockConfig);
      await engine.loadModel();

      expect(engine.isModelLoaded()).toBe(true);

      await engine.unload();

      expect(engine.isModelLoaded()).toBe(false);
      expect(engine.getModelId()).toBeNull();
    });
  });

  describe("event listeners", () => {
    it("should add and remove event listeners", async () => {
      const engine = new WebGPUInferenceEngine(mockConfig);
      const listener = jest.fn();

      engine.addEventListener(listener);
      await engine.loadModel();

      expect(listener).toHaveBeenCalled();

      engine.removeEventListener(listener);
    });
  });
});

describe("DEFAULT_WEBGPU_CONFIG", () => {
  it("should have sensible defaults", () => {
    expect(DEFAULT_WEBGPU_CONFIG.debug).toBe(false);
    expect(DEFAULT_WEBGPU_CONFIG.maxContextLength).toBe(4096);
    expect(DEFAULT_WEBGPU_CONFIG.maxTokens).toBe(512);
    expect(DEFAULT_WEBGPU_CONFIG.temperature).toBe(0.7);
    expect(DEFAULT_WEBGPU_CONFIG.topP).toBe(0.9);
    expect(DEFAULT_WEBGPU_CONFIG.topK).toBe(40);
    expect(DEFAULT_WEBGPU_CONFIG.repetitionPenalty).toBe(1.1);
    expect(DEFAULT_WEBGPU_CONFIG.streaming).toBe(true);
    expect(DEFAULT_WEBGPU_CONFIG.quantization).toBe("int4");
    expect(DEFAULT_WEBGPU_CONFIG.cacheShaders).toBe(true);
    expect(DEFAULT_WEBGPU_CONFIG.batchSize).toBe(1);
  });
});
