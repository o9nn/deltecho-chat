import { LLMService, CognitiveFunctionType } from "../LLMService";
import {
  unifiedLLMService,
  CognitiveFunction as UnifiedCognitiveFunction,
} from "../UnifiedLLMService";
import { multiModalProcessor } from "../../multimodal/MultiModalProcessor";

// This package runs native ESM tests; Jest exposes its API on import.meta.
const jest = (import.meta as ImportMeta & { jest: typeof globalThis.jest })
  .jest;

describe("LLMService", () => {
  let llmService: LLMService;

  beforeEach(() => {
    llmService = new LLMService();

    jest.restoreAllMocks();

    // Mock fetch for all tests to avoid real API calls
    global.fetch = (() => {
      const mockFn: any = (...args: any[]) => {
        mockFn.calls.push(args);
        return mockFn.mockReturnValue;
      };
      mockFn.calls = [];
      mockFn.mockReturnValue = Promise.resolve({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Mocked response" } }],
        }),
      });
      mockFn.mockReset = function () {
        this.calls = [];
      };
      mockFn.mockResolvedValue = function (value: any) {
        this.mockReturnValue = Promise.resolve(value);
        return this;
      };
      mockFn.mockResolvedValueOnce = function (value: any) {
        this.mockReturnValue = Promise.resolve(value);
        return this;
      };
      return mockFn;
    })();
  });

  describe("initialization", () => {
    it("should initialize with default general function", () => {
      const functions = llmService.getAllFunctions();
      expect(functions.length).toBeGreaterThanOrEqual(1);

      const generalFunc = functions.find(
        (f) => f.id === CognitiveFunctionType.GENERAL,
      );
      expect(generalFunc).toBeDefined();
      expect(generalFunc?.name).toBe("General Processing");
    });

    it("should have default configuration values", () => {
      const functions = llmService.getAllFunctions();
      const generalFunc = functions.find(
        (f) => f.id === CognitiveFunctionType.GENERAL,
      );

      expect(generalFunc?.config.model).toBe("gpt-4");
      expect(generalFunc?.config.temperature).toBe(0.7);
      expect(generalFunc?.config.maxTokens).toBe(1000);
    });
  });

  describe("setFunctionConfig", () => {
    it("should configure a cognitive function with API key", () => {
      llmService.setFunctionConfig(CognitiveFunctionType.COGNITIVE_CORE, {
        apiKey: "test-api-key",
        apiEndpoint: "https://api.test.com/v1/chat",
        model: "gpt-4-turbo",
      });

      expect(
        llmService.isFunctionConfigured(CognitiveFunctionType.COGNITIVE_CORE),
      ).toBe(true);
    });

    it("should update existing function configuration", () => {
      llmService.setFunctionConfig(CognitiveFunctionType.GENERAL, {
        apiKey: "initial-key",
      });

      llmService.setFunctionConfig(CognitiveFunctionType.GENERAL, {
        apiKey: "updated-key",
        temperature: 0.9,
      });

      const functions = llmService.getAllFunctions();
      const generalFunc = functions.find(
        (f) => f.id === CognitiveFunctionType.GENERAL,
      );

      expect(generalFunc?.config.apiKey).toBe("updated-key");
      expect(generalFunc?.config.temperature).toBe(0.9);
    });

    it("should create new function if not exists", () => {
      llmService.setFunctionConfig(CognitiveFunctionType.AFFECTIVE_CORE, {
        apiKey: "affective-key",
      });

      const functions = llmService.getAllFunctions();
      const affectiveFunc = functions.find(
        (f) => f.id === CognitiveFunctionType.AFFECTIVE_CORE,
      );

      expect(affectiveFunc).toBeDefined();
      expect(affectiveFunc?.name).toBe("Affective Core");
    });
  });

  describe("setConfig", () => {
    it("should set general function config for backward compatibility", () => {
      llmService.setConfig({
        apiKey: "general-api-key",
        model: "gpt-3.5-turbo",
      });

      expect(
        llmService.isFunctionConfigured(CognitiveFunctionType.GENERAL),
      ).toBe(true);
    });
  });

  describe("getAllFunctions", () => {
    it("should return all configured functions", () => {
      llmService.setFunctionConfig(CognitiveFunctionType.COGNITIVE_CORE, {
        apiKey: "key1",
      });
      llmService.setFunctionConfig(CognitiveFunctionType.AFFECTIVE_CORE, {
        apiKey: "key2",
      });
      llmService.setFunctionConfig(CognitiveFunctionType.RELEVANCE_CORE, {
        apiKey: "key3",
      });

      const functions = llmService.getAllFunctions();
      expect(functions.length).toBeGreaterThanOrEqual(4); // 3 new + 1 default general
    });
  });

  describe("getActiveFunctions", () => {
    it("should return only functions with API keys", () => {
      llmService.setFunctionConfig(CognitiveFunctionType.COGNITIVE_CORE, {
        apiKey: "key1",
      });
      llmService.setFunctionConfig(CognitiveFunctionType.AFFECTIVE_CORE, {
        apiKey: "",
      });
      llmService.setFunctionConfig(CognitiveFunctionType.RELEVANCE_CORE, {
        apiKey: "key3",
      });

      const activeFunctions = llmService.getActiveFunctions();
      expect(activeFunctions.length).toBe(2);
      expect(
        activeFunctions.some(
          (f) => f.id === CognitiveFunctionType.COGNITIVE_CORE,
        ),
      ).toBe(true);
      expect(
        activeFunctions.some(
          (f) => f.id === CognitiveFunctionType.RELEVANCE_CORE,
        ),
      ).toBe(true);
    });

    it("should return empty array when no functions have API keys", () => {
      const activeFunctions = llmService.getActiveFunctions();
      expect(activeFunctions.length).toBe(0);
    });
  });

  describe("isFunctionConfigured", () => {
    it("should return true for configured functions", () => {
      llmService.setFunctionConfig(CognitiveFunctionType.COGNITIVE_CORE, {
        apiKey: "test-key",
      });

      expect(
        llmService.isFunctionConfigured(CognitiveFunctionType.COGNITIVE_CORE),
      ).toBe(true);
    });

    it("should return false for unconfigured functions", () => {
      expect(
        llmService.isFunctionConfigured(CognitiveFunctionType.SEMANTIC_MEMORY),
      ).toBe(false);
    });

    it("should return false for functions without API key", () => {
      llmService.setFunctionConfig(CognitiveFunctionType.EPISODIC_MEMORY, {
        apiKey: "",
        model: "gpt-4",
      });

      expect(
        llmService.isFunctionConfigured(CognitiveFunctionType.EPISODIC_MEMORY),
      ).toBe(false);
    });
  });

  describe("generateResponse", () => {
    it("should reject when no API key configured", async () => {
      await expect(llmService.generateResponse("Hello")).rejects.toThrow(
        /MODEL_NOT_CONFIGURED/,
      );
      expect((global.fetch as any).calls).toHaveLength(0);
    });

    it("should generate response with configured API key", async () => {
      llmService.setConfig({ apiKey: "test-key" });
      const response = await llmService.generateResponse("Hello");

      // Should return the mocked response
      expect(response).toBe("Mocked response");
    });

    it("should reject an empty provider response", async () => {
      llmService.setConfig({ apiKey: "test-key" });
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [] }),
      });

      await expect(llmService.generateResponse("Hello")).rejects.toThrow(
        /LLM_NO_RESPONSE/,
      );
    });

    it("should reject blank provider completion content", async () => {
      llmService.setConfig({ apiKey: "test-key" });
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "   " } }] }),
      });

      await expect(llmService.generateResponse("Hello")).rejects.toThrow(
        /LLM_NO_RESPONSE/,
      );
    });

    it("should propagate provider failure instead of returning canned speech", async () => {
      llmService.setConfig({ apiKey: "test-key" });
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => "provider unavailable",
      });

      await expect(llmService.generateResponse("Hello")).rejects.toThrow(
        /OpenAI API error \(503\): provider unavailable/,
      );
    });
  });

  describe("generateReflection", () => {
    it("should reject when neither Unified nor legacy reflection is configured", async () => {
      await expect(
        llmService.generateReflection("Reflect honestly"),
      ).rejects.toThrow(
        /MODEL_NOT_CONFIGURED: Reflection requires a configured LLM service/,
      );
    });

    it("should return the configured legacy provider response", async () => {
      llmService.setConfig({ apiKey: "test-key" });
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Provider-backed reflection" } }],
        }),
      });

      await expect(
        llmService.generateReflection("Reflect honestly"),
      ).resolves.toBe("Provider-backed reflection");
    });

    it("should propagate legacy general-provider failures", async () => {
      llmService.setConfig({ apiKey: "test-key" });
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 502,
        text: async () => "reflection upstream failure",
      });

      await expect(
        llmService.generateReflection("Reflect honestly"),
      ).rejects.toThrow(
        /OpenAI API error \(502\): reflection upstream failure/,
      );
    });

    it("should reject a Unified reflection when every configured provider fails", async () => {
      jest
        .spyOn(unifiedLLMService, "isConfigured")
        .mockImplementation(
          (functionType: UnifiedCognitiveFunction) =>
            functionType === UnifiedCognitiveFunction.GENERAL,
        );
      jest.spyOn(unifiedLLMService, "generateParallel").mockResolvedValue({
        responses: new Map(),
        integratedResponse: "I'm unable to generate a response at this time.",
        processingTimeMs: 1,
        insights: {
          dominantPerspective: UnifiedCognitiveFunction.GENERAL,
          confidenceLevel: 0,
        },
      });

      await expect(
        llmService.generateReflection("Reflect honestly"),
      ).rejects.toThrow(/REFLECTION_PROVIDER_FAILURE/);
    });

    it.each([
      ["Provider-backed Unified reflection", true],
      ["   ", false],
    ])(
      "validates integrated Unified reflection content %j",
      async (content, valid) => {
        jest.spyOn(unifiedLLMService, "isConfigured").mockReturnValue(true);
        jest.spyOn(unifiedLLMService, "generateParallel").mockResolvedValue({
          responses: new Map([
            [
              UnifiedCognitiveFunction.COGNITIVE_CORE,
              {
                content: "Controlled provider fixture",
                finishReason: "stop",
                usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
                model: "test-model",
                provider: "test-provider",
              },
            ],
          ]),
          integratedResponse: content as string,
          processingTimeMs: 1,
          insights: {
            dominantPerspective: UnifiedCognitiveFunction.COGNITIVE_CORE,
            confidenceLevel: 1,
          },
        });
        if (valid) {
          await expect(
            llmService.generateReflection("Reflect honestly"),
          ).resolves.toBe(content);
        } else {
          await expect(
            llmService.generateReflection("Reflect honestly"),
          ).rejects.toThrow(/REFLECTION_NO_RESPONSE/);
        }
      },
    );
  });

  describe("analyzeImage", () => {
    it("should return a genuine vision processor description", async () => {
      jest.spyOn(multiModalProcessor, "analyzeImage").mockResolvedValue({
        description: "A red cube on a white surface.",
      });

      await expect(llmService.analyzeImage("full-image-fixture")).resolves.toBe(
        "A red cube on a white surface.",
      );
      expect(multiModalProcessor.analyzeImage).toHaveBeenCalledWith(
        "full-image-fixture",
      );
      expect((global.fetch as any).calls).toHaveLength(0);
    });

    it("should reject vision processor failures without sending image data to a text LLM", async () => {
      jest
        .spyOn(multiModalProcessor, "analyzeImage")
        .mockRejectedValue(
          new Error("Anthropic API key required for image analysis"),
        );
      llmService.setConfig({ apiKey: "text-only-test-key" });

      await expect(
        llmService.analyzeImage("full-image-fixture"),
      ).rejects.toThrow(/Anthropic API key required for image analysis/);
      expect((global.fetch as any).calls).toHaveLength(0);
    });

    it("should reject an empty vision description", async () => {
      jest.spyOn(multiModalProcessor, "analyzeImage").mockResolvedValue({
        description: "   ",
      });

      await expect(
        llmService.analyzeImage("full-image-fixture"),
      ).rejects.toThrow(/VISION_NO_RESPONSE/);
    });
  });

  describe("generateResponseWithFunction", () => {
    beforeEach(() => {
      llmService.setFunctionConfig(CognitiveFunctionType.COGNITIVE_CORE, {
        apiKey: "cognitive-key",
      });
      llmService.setFunctionConfig(CognitiveFunctionType.AFFECTIVE_CORE, {
        apiKey: "affective-key",
      });
    });

    it("should use specific function when configured", async () => {
      const response = await llmService.generateResponseWithFunction(
        CognitiveFunctionType.COGNITIVE_CORE,
        "Test input",
      );

      // Should return the mocked response
      expect(response).toBe("Mocked response");
      expect((global.fetch as any).calls.length).toBeGreaterThan(0);
    });

    it("should use affective core for emotional processing", async () => {
      const response = await llmService.generateResponseWithFunction(
        CognitiveFunctionType.AFFECTIVE_CORE,
        "Test input",
      );

      // Should return the mocked response
      expect(response).toBe("Mocked response");
      expect((global.fetch as any).calls.length).toBeGreaterThan(0);
    });

    it("should fall back to general function when specific not configured", async () => {
      llmService.setConfig({ apiKey: "general-key" });

      const response = await llmService.generateResponseWithFunction(
        CognitiveFunctionType.SEMANTIC_MEMORY,
        "Test input",
      );

      // Should return the mocked response
      expect(response).toBe("Mocked response");
      expect((global.fetch as any).calls.length).toBeGreaterThan(0);
    });

    it("should track usage statistics", async () => {
      const initialFunctions = llmService.getAllFunctions();
      const cognitiveFunc = initialFunctions.find(
        (f) => f.id === CognitiveFunctionType.COGNITIVE_CORE,
      );
      const initialRequestCount = cognitiveFunc?.usage.requestCount || 0;

      await llmService.generateResponseWithFunction(
        CognitiveFunctionType.COGNITIVE_CORE,
        "Test input",
      );

      const updatedFunctions = llmService.getAllFunctions();
      const updatedCognitiveFunc = updatedFunctions.find(
        (f) => f.id === CognitiveFunctionType.COGNITIVE_CORE,
      );

      expect(updatedCognitiveFunc?.usage.requestCount).toBe(
        initialRequestCount + 1,
      );
      expect(updatedCognitiveFunc?.usage.lastUsed).toBeGreaterThan(0);
    });
  });

  describe("configured-provider parallel fallback", () => {
    it("calls the real general-provider path after specialized processing fails", async () => {
      llmService.setConfig({ apiKey: "general-test-key" });
      llmService.setFunctionConfig(CognitiveFunctionType.COGNITIVE_CORE, {
        apiKey: "specialized-test-key",
      });
      jest
        .spyOn(llmService, "generateParallelResponses")
        .mockRejectedValue(
          new Error("Controlled specialized-provider failure"),
        );
      const result =
        await llmService.generateFullParallelResponse("Test request");
      expect(result.insights.processingMethod).toBe("fallback_single_function");
      expect(result.integratedResponse).toBe("Mocked response");
      expect((global.fetch as any).calls).toHaveLength(1);
      expect((global.fetch as any).calls[0][1].headers.Authorization).toBe(
        "Bearer general-test-key",
      );
    });

    it("still rejects if specialized failure has no configured general provider", async () => {
      llmService.setFunctionConfig(CognitiveFunctionType.COGNITIVE_CORE, {
        apiKey: "specialized-test-key",
      });
      jest
        .spyOn(llmService, "generateParallelResponses")
        .mockRejectedValue(
          new Error("Controlled specialized-provider failure"),
        );
      await expect(
        llmService.generateFullParallelResponse("Test request"),
      ).rejects.toThrow(/MODEL_NOT_CONFIGURED/);
      expect((global.fetch as any).calls).toHaveLength(0);
    });
  });

  describe("CognitiveFunctionType enum", () => {
    it("should have all expected function types", () => {
      expect(CognitiveFunctionType.COGNITIVE_CORE).toBe("cognitive_core");
      expect(CognitiveFunctionType.AFFECTIVE_CORE).toBe("affective_core");
      expect(CognitiveFunctionType.RELEVANCE_CORE).toBe("relevance_core");
      expect(CognitiveFunctionType.SEMANTIC_MEMORY).toBe("semantic_memory");
      expect(CognitiveFunctionType.EPISODIC_MEMORY).toBe("episodic_memory");
      expect(CognitiveFunctionType.PROCEDURAL_MEMORY).toBe("procedural_memory");
      expect(CognitiveFunctionType.CONTENT_EVALUATION).toBe(
        "content_evaluation",
      );
      expect(CognitiveFunctionType.GENERAL).toBe("general");
    });
  });
});
