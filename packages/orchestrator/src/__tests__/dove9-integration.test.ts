import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { LLMService } from "deep-tree-echo-core";
import {
  Dove9Integration,
  Dove9IntegrationConfig,
} from "../dove9-integration.js";
import { EmailMessage } from "../dovecot-interface/milter-server.js";

function mockedParallelResult(integratedResponse: string) {
  return {
    processing: {} as Record<string, string>,
    integratedResponse,
    insights: { processingMethod: "single_function" },
  };
}

function mockConfiguredLlm(integratedResponse: string) {
  return jest
    .spyOn(LLMService.prototype, "generateFullParallelResponse")
    .mockResolvedValue(mockedParallelResult(integratedResponse));
}

function blockNetworkRequests(): () => number {
  const fetchMock = jest
    .spyOn(globalThis, "fetch")
    .mockRejectedValue(new Error("Network access is forbidden in this test"));
  return () => fetchMock.mock.calls.length;
}

// Helper to create a complete EmailMessage
function createTestEmail(overrides: Partial<EmailMessage> = {}): EmailMessage {
  return {
    messageId: `test-${Date.now()}@example.com`,
    from: "user@example.com",
    to: ["test-bot@localhost"],
    cc: [],
    bcc: [],
    subject: "Test Subject",
    body: "Test body content",
    headers: new Map<string, string>(),
    attachments: [],
    receivedAt: new Date(),
    ...overrides,
  };
}

describe("Dove9Integration", () => {
  let integration: Dove9Integration;
  let networkRequestCount: () => number;
  const testConfig: Partial<Dove9IntegrationConfig> = {
    enabled: true,
    stepDuration: 50,
    maxConcurrentProcesses: 10,
    botEmailAddress: "test-bot@localhost",
    enableTriadicLoop: true,
  };

  beforeEach(() => {
    networkRequestCount = blockNetworkRequests();
    integration = new Dove9Integration(testConfig);
  });

  afterEach(async () => {
    await integration.stop();
    jest.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create integration with provided config", () => {
      expect(integration).toBeDefined();
      expect(integration.isRunning()).toBe(false);
    });

    it("should create integration with default config", () => {
      const defaultIntegration = new Dove9Integration();
      expect(defaultIntegration).toBeDefined();
      expect(defaultIntegration.isRunning()).toBe(false);
    });
  });

  describe("initialize", () => {
    it("should initialize Dove9 system", async () => {
      await integration.initialize();
      expect(integration.getDove9System()).not.toBeNull();
    });

    it("should not initialize when disabled", async () => {
      const disabledIntegration = new Dove9Integration({ enabled: false });
      await disabledIntegration.initialize();
      expect(disabledIntegration.getDove9System()).toBeNull();
    });
  });

  describe("start and stop", () => {
    it("should start the integration", async () => {
      await integration.start();
      expect(integration.isRunning()).toBe(true);
    });

    it("should stop the integration", async () => {
      await integration.start();
      await integration.stop();
      expect(integration.isRunning()).toBe(false);
    });

    it("should handle multiple start calls", async () => {
      await integration.start();
      await integration.start(); // Should not throw
      expect(integration.isRunning()).toBe(true);
    });

    it("should handle stop when not running", async () => {
      await integration.stop(); // Should not throw
      expect(integration.isRunning()).toBe(false);
    });

    it("should auto-initialize on start", async () => {
      expect(integration.getDove9System()).toBeNull();
      await integration.start();
      expect(integration.getDove9System()).not.toBeNull();
    });
  });

  describe("processEmail", () => {
    beforeEach(async () => {
      await integration.start();
    });

    it("should process email addressed to bot", async () => {
      const modelResponse = "test-model-response: dove9-email";
      const generateResponse = mockConfiguredLlm(modelResponse);
      const email = createTestEmail({
        from: "user@example.com",
        to: ["test-bot@localhost"],
      });

      const result = await integration.processEmail(email);
      expect(result).toMatchObject({
        status: "completed",
        response: modelResponse,
      });
      expect(result?.id).toBeDefined();
      expect(generateResponse).toHaveBeenCalledWith(
        expect.stringContaining("Subject: Test Subject"),
        expect.any(Array),
      );
      expect(networkRequestCount()).toBe(0);
    });

    it("should not fabricate a response for an unconfigured model and should recover after model injection", async () => {
      const handler = jest.fn<(response: unknown) => void>();
      integration.onResponse(handler);
      const generateResponse = jest.spyOn(
        LLMService.prototype,
        "generateFullParallelResponse",
      );
      const email = createTestEmail({ to: ["test-bot@localhost"] });

      const failed = await integration.processEmail(email);
      expect(failed).toMatchObject({ status: "failed" });
      expect(failed?.response).toBeUndefined();
      expect(handler).not.toHaveBeenCalled();
      expect(generateResponse).toHaveBeenCalledTimes(1);
      expect(networkRequestCount()).toBe(0);

      const recoveryResponse = "test-model-response: dove9-recovered";
      generateResponse.mockResolvedValue(
        mockedParallelResult(recoveryResponse),
      );

      const recovered = await integration.processEmail(
        createTestEmail({ to: ["test-bot@localhost"] }),
      );
      expect(recovered).toMatchObject({
        status: "completed",
        response: recoveryResponse,
      });
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ body: recoveryResponse }),
      );
      expect(generateResponse).toHaveBeenCalledTimes(2);
      expect(networkRequestCount()).toBe(0);
    });

    it("should return null for email not addressed to bot", async () => {
      const email = createTestEmail({
        from: "user@example.com",
        to: ["other@example.com"],
      });

      const result = await integration.processEmail(email);
      expect(result).toBeNull();
    });

    it("should return null when not initialized", async () => {
      const uninitializedIntegration = new Dove9Integration({ enabled: false });
      const email = createTestEmail({
        from: "user@example.com",
        to: ["echo@localhost"],
      });

      const result = await uninitializedIntegration.processEmail(email);
      expect(result).toBeNull();
    });
  });

  describe("onResponse", () => {
    it("should register response handler", () => {
      const handler = jest.fn<(response: unknown) => void>();
      integration.onResponse(handler);
      // Handler registration should not throw
      expect(handler).not.toHaveBeenCalled();
    });

    it("should call response handler when response is ready", async () => {
      const modelResponse = "test-model-response: response-handler";
      const generateResponse = mockConfiguredLlm(modelResponse);
      const handler = jest.fn<(response: unknown) => void>();
      integration.onResponse(handler);

      await integration.start();

      const email = createTestEmail({
        from: "user@example.com",
        to: ["test-bot@localhost"],
      });

      await integration.processEmail(email);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          body: modelResponse,
          to: "user@example.com",
        }),
      );
      expect(generateResponse).toHaveBeenCalledTimes(1);
      expect(networkRequestCount()).toBe(0);
    });
  });

  describe("onMetrics", () => {
    it("should register metrics handler", () => {
      const handler = jest.fn<(metrics: unknown) => void>();
      integration.onMetrics(handler);
      // Handler registration should not throw
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("configureApiKeys", () => {
    it("should configure API keys", () => {
      expect(() => {
        integration.configureApiKeys({ general: "test-api-key" });
      }).not.toThrow();
    });
  });

  describe("getMetrics", () => {
    it("should return null when not initialized", () => {
      const metrics = integration.getMetrics();
      expect(metrics).toBeNull();
    });

    it("should return metrics when running", async () => {
      await integration.start();
      const metrics = integration.getMetrics();
      expect(metrics).not.toBeNull();
      expect(metrics?.processedMessages).toBeDefined();
      expect(metrics?.averageResponseTime).toBeDefined();
    });
  });

  describe("getActiveProcesses", () => {
    it("should return empty array when not initialized", () => {
      const processes = integration.getActiveProcesses();
      expect(processes).toEqual([]);
    });

    it("should return active processes when running", async () => {
      await integration.start();
      const processes = integration.getActiveProcesses();
      expect(Array.isArray(processes)).toBe(true);
    });
  });

  describe("getCognitiveState", () => {
    it("should return state when not running", () => {
      const state = integration.getCognitiveState();
      expect(state.running).toBe(false);
      expect(state.metrics).toBeNull();
      expect(state.triadic).toBeNull();
    });

    it("should return full state when running", async () => {
      await integration.start();
      const state = integration.getCognitiveState();
      expect(state.running).toBe(true);
      expect(state.metrics).not.toBeNull();
      expect(state.triadic).not.toBeNull();
      expect(state.triadic?.streams).toBeDefined();
    });

    it("should include triadic stream information", async () => {
      await integration.start();
      const state = integration.getCognitiveState();

      expect(state.triadic?.streams.length).toBeGreaterThan(0);
      expect(state.triadic?.streams.some((s) => s.mode === "cognitive")).toBe(
        true,
      );
      expect(state.triadic?.streams.some((s) => s.mode === "affective")).toBe(
        true,
      );
      expect(state.triadic?.streams.some((s) => s.mode === "relevance")).toBe(
        true,
      );
    });
  });
});
