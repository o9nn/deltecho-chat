import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";

import {
  WebhookServer,
  WebhookServerConfig,
  WebhookEventType,
} from "../webhooks/webhook-server.js";

describe("WebhookServer", () => {
  let server: WebhookServer;
  const testConfig: WebhookServerConfig = {
    port: 9876,
    host: "127.0.0.1",
    basePath: "/webhooks",
    enableCors: true,
  };

  beforeEach(() => {
    server = new WebhookServer(testConfig);
  });

  afterEach(async () => {
    await server.stop();
  });

  describe("constructor", () => {
    it("should create server with provided config", () => {
      expect(server).toBeDefined();
      expect(server.isRunning()).toBe(false);
    });

    it("should create server with default config", () => {
      const defaultServer = new WebhookServer();
      expect(defaultServer).toBeDefined();
      expect(defaultServer.isRunning()).toBe(false);
    });

    it("should have default endpoints registered", () => {
      const endpoints = server.getEndpoints();
      expect(endpoints.length).toBeGreaterThanOrEqual(2);
      expect(endpoints.some((e) => e.path === "/health")).toBe(true);
      expect(endpoints.some((e) => e.path === "/status")).toBe(true);
    });
  });

  describe("registerEndpoint", () => {
    it("should register a custom endpoint", () => {
      const initialCount = server.getEndpoints().length;

      const endpointId = server.registerEndpoint({
        name: "Test Endpoint",
        path: "/test",
        eventTypes: [WebhookEventType.MESSAGE_RECEIVED],
        handler: async () => ({ success: true }),
      });

      expect(endpointId).toMatch(/^endpoint_/);
      expect(server.getEndpoints().length).toBe(initialCount + 1);
    });

    it("should register endpoint with secret", () => {
      const endpointId = server.registerEndpoint({
        name: "Secure Endpoint",
        path: "/secure",
        secret: "my-secret-key",
        eventTypes: [WebhookEventType.COGNITIVE_RESPONSE],
        handler: async () => ({ secure: true }),
      });

      const endpoint = server.getEndpoints().find((e) => e.id === endpointId);
      expect(endpoint?.secret).toBe("my-secret-key");
    });

    it("should register endpoint with rate limit", () => {
      const endpointId = server.registerEndpoint({
        name: "Rate Limited Endpoint",
        path: "/limited",
        eventTypes: [],
        handler: async () => ({}),
        rateLimit: {
          maxRequests: 10,
          windowMs: 30000,
        },
      });

      const endpoint = server.getEndpoints().find((e) => e.id === endpointId);
      expect(endpoint?.rateLimit?.maxRequests).toBe(10);
      expect(endpoint?.rateLimit?.windowMs).toBe(30000);
    });
  });

  describe("unregisterEndpoint", () => {
    it("should unregister an existing endpoint", () => {
      server.registerEndpoint({
        name: "Temp Endpoint",
        path: "/temp",
        eventTypes: [],
        handler: async () => ({}),
      });

      const initialCount = server.getEndpoints().length;
      const result = server.unregisterEndpoint("/temp");

      expect(result).toBe(true);
      expect(server.getEndpoints().length).toBe(initialCount - 1);
    });

    it("should return false for non-existent endpoint", () => {
      const result = server.unregisterEndpoint("/non-existent");
      expect(result).toBe(false);
    });
  });

  describe("start and stop", () => {
    it("should start the server", async () => {
      await server.start();
      expect(server.isRunning()).toBe(true);
    });

    it("should stop the server", async () => {
      await server.start();
      await server.stop();
      expect(server.isRunning()).toBe(false);
    });

    it("should handle multiple start calls gracefully", async () => {
      await server.start();
      await server.start(); // Should not throw
      expect(server.isRunning()).toBe(true);
    });

    it("should handle stop when not running", async () => {
      await server.stop(); // Should not throw
      expect(server.isRunning()).toBe(false);
    });

    it("should emit started event", async () => {
      const startedCallback = jest.fn();
      server.on("started", startedCallback);

      await server.start();
      expect(startedCallback).toHaveBeenCalled();
    });

    it("should emit stopped event", async () => {
      const stoppedCallback = jest.fn();
      server.on("stopped", stoppedCallback);

      await server.start();
      await server.stop();
      expect(stoppedCallback).toHaveBeenCalled();
    });
  });

  describe("getStats", () => {
    it("should return server statistics", () => {
      const stats = server.getStats();
      expect(stats).toHaveProperty("running");
      expect(stats).toHaveProperty("port");
      expect(stats).toHaveProperty("endpoints");
      expect(stats).toHaveProperty("enabledEndpoints");
    });

    it("should report correct running state", async () => {
      expect(server.getStats().running).toBe(false);
      await server.start();
      expect(server.getStats().running).toBe(true);
    });
  });

  describe("getEndpoints", () => {
    it("should return all registered endpoints", () => {
      const endpoints = server.getEndpoints();
      expect(Array.isArray(endpoints)).toBe(true);
    });

    it("should include endpoint properties", () => {
      server.registerEndpoint({
        name: "Test",
        path: "/test",
        eventTypes: [WebhookEventType.CUSTOM],
        handler: async () => ({}),
      });

      const endpoint = server.getEndpoints().find((e) => e.name === "Test");
      expect(endpoint).toBeDefined();
      expect(endpoint?.id).toBeDefined();
      expect(endpoint?.path).toBe("/test");
      expect(endpoint?.enabled).toBe(true);
      expect(endpoint?.eventTypes).toContain(WebhookEventType.CUSTOM);
    });
  });

  describe("triggerWebhook", () => {
    it("should have triggerWebhook method", () => {
      expect(typeof server.triggerWebhook).toBe("function");
    });

    // Note: Full integration test would require mocking fetch
    it("should handle invalid URL gracefully", async () => {
      const result = await server.triggerWebhook(
        "http://invalid-url-that-does-not-exist.local:99999",
        WebhookEventType.MESSAGE_SENT,
        { test: "data" },
      );
      expect(result).toBe(false);
    });
  });
});
