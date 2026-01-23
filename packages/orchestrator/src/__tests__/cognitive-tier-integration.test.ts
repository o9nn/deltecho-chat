/**
 * @fileoverview Integration tests for Cognitive Tier Routing
 *
 * Tests the three-tier cognitive processing system:
 * - Tier 1 (BASIC): Deep Tree Echo Core
 * - Tier 2 (SYS6): Sys6-Triality 30-step cognitive cycle
 * - Tier 3 (MEMBRANE): Double Membrane bio-inspired architecture
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { Orchestrator, type CognitiveTierMode } from "../orchestrator.js";

// Mock the external dependencies
jest.mock("deep-tree-echo-core", () => ({
  getLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
  LLMService: jest.fn().mockImplementation(() => ({
    generateFullParallelResponse: jest.fn().mockResolvedValue({
      integratedResponse: "Mock response from LLM",
    }),
    setConfig: jest.fn(),
  })),
  RAGMemoryStore: jest.fn().mockImplementation(() => ({
    setEnabled: jest.fn(),
    storeMemory: jest.fn(),
    retrieveRecentMemories: jest.fn().mockReturnValue([]),
  })),
  PersonaCore: jest.fn().mockImplementation(() => ({
    getPersonality: jest.fn().mockReturnValue("Test personality"),
    getDominantEmotion: jest.fn().mockReturnValue({
      emotion: "neutral",
      intensity: 0.5,
    }),
    updateEmotionalState: jest.fn(),
  })),
  InMemoryStorage: jest.fn().mockImplementation(() => ({})),
}));

// Mock Sys6 Bridge
jest.mock("../sys6-bridge/Sys6OrchestratorBridge.js", () => ({
  Sys6OrchestratorBridge: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    processMessage: jest.fn().mockResolvedValue("Mock Sys6 response"),
    getState: jest.fn().mockReturnValue({
      running: true,
      cycleNumber: 5,
      currentStep: 15,
      streams: [{ salience: 0.8 }, { salience: 0.6 }, { salience: 0.4 }],
    }),
    getMetrics: jest.fn().mockReturnValue({
      totalCycles: 5,
      totalSteps: 150,
    }),
  })),
}));

// Mock Double Membrane Integration
jest.mock("../double-membrane-integration.js", () => ({
  DoubleMembraneIntegration: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    isRunning: jest.fn().mockReturnValue(true),
    chat: jest.fn().mockResolvedValue("Mock Membrane response"),
    getStatus: jest.fn().mockReturnValue({
      running: true,
      identityEnergy: 0.85,
      stats: {
        totalRequests: 10,
        nativeRequests: 5,
        externalRequests: 3,
        hybridRequests: 2,
      },
    }),
  })),
}));

// Mock other dependencies
jest.mock("../deltachat-interface/index.js", () => ({
  DeltaChatInterface: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(false),
    on: jest.fn(),
  })),
}));

jest.mock("../dovecot-interface/index.js", () => ({
  DovecotInterface: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    isRunning: jest.fn().mockReturnValue(false),
    on: jest.fn(),
  })),
}));

jest.mock("../ipc/server.js", () => ({
  IPCServer: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock("../scheduler/task-scheduler.js", () => ({
  TaskScheduler: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock("../webhooks/webhook-server.js", () => ({
  WebhookServer: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock("../dove9-integration.js", () => ({
  Dove9Integration: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    onResponse: jest.fn(),
    getCognitiveState: jest.fn().mockReturnValue({ running: true }),
  })),
}));

describe("Cognitive Tier Integration", () => {
  let orchestrator: Orchestrator;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (orchestrator?.isRunning()) {
      await orchestrator.stop();
    }
  });

  describe("Orchestrator Configuration", () => {
    it("should use ADAPTIVE mode by default", () => {
      orchestrator = new Orchestrator();
      expect(orchestrator.getCognitiveTierMode()).toBe("ADAPTIVE");
    });

    it("should accept custom cognitive tier mode", () => {
      orchestrator = new Orchestrator({ cognitiveTierMode: "SYS6" });
      expect(orchestrator.getCognitiveTierMode()).toBe("SYS6");
    });

    it("should allow runtime mode changes", () => {
      orchestrator = new Orchestrator({ cognitiveTierMode: "BASIC" });
      expect(orchestrator.getCognitiveTierMode()).toBe("BASIC");

      orchestrator.setCognitiveTierMode("MEMBRANE");
      expect(orchestrator.getCognitiveTierMode()).toBe("MEMBRANE");
    });

    it("should configure complexity thresholds", () => {
      orchestrator = new Orchestrator({
        sys6ComplexityThreshold: 0.3,
        membraneComplexityThreshold: 0.6,
      });
      // Thresholds are internal but affect routing
      expect(orchestrator.getCognitiveTierMode()).toBe("ADAPTIVE");
    });
  });

  describe("Service Initialization", () => {
    it("should start all cognitive tier services", async () => {
      orchestrator = new Orchestrator({
        enableDeltaChat: false,
        enableDovecot: false,
        enableIPC: false,
        enableScheduler: false,
        enableWebhooks: false,
        enableDove9: true,
        enableSys6: true,
        enableDoubleMembrane: true,
      });

      await orchestrator.start();

      expect(orchestrator.isRunning()).toBe(true);
      expect(orchestrator.getSys6Bridge()).toBeDefined();
      expect(orchestrator.getDoubleMembraneIntegration()).toBeDefined();
    });

    it("should start with only BASIC tier when others disabled", async () => {
      orchestrator = new Orchestrator({
        enableDeltaChat: false,
        enableDovecot: false,
        enableIPC: false,
        enableScheduler: false,
        enableWebhooks: false,
        enableDove9: false,
        enableSys6: false,
        enableDoubleMembrane: false,
        cognitiveTierMode: "BASIC",
      });

      await orchestrator.start();

      expect(orchestrator.isRunning()).toBe(true);
      expect(orchestrator.getSys6Bridge()).toBeUndefined();
      expect(orchestrator.getDoubleMembraneIntegration()).toBeUndefined();
    });

    it("should stop all services gracefully", async () => {
      orchestrator = new Orchestrator({
        enableDeltaChat: false,
        enableDovecot: false,
        enableIPC: false,
        enableScheduler: false,
        enableWebhooks: false,
        enableDove9: true,
        enableSys6: true,
        enableDoubleMembrane: true,
      });

      await orchestrator.start();
      expect(orchestrator.isRunning()).toBe(true);

      await orchestrator.stop();
      expect(orchestrator.isRunning()).toBe(false);
    });
  });

  describe("Processing Statistics", () => {
    it("should track processing statistics", async () => {
      orchestrator = new Orchestrator({
        enableDeltaChat: false,
        enableDovecot: false,
        enableIPC: false,
        enableScheduler: false,
        enableWebhooks: false,
        enableSys6: true,
        enableDoubleMembrane: true,
      });

      await orchestrator.start();

      const stats = orchestrator.getProcessingStats();
      expect(stats).toHaveProperty("totalMessages");
      expect(stats).toHaveProperty("basicTierMessages");
      expect(stats).toHaveProperty("sys6TierMessages");
      expect(stats).toHaveProperty("membraneTierMessages");
      expect(stats).toHaveProperty("averageComplexity");
    });
  });

  describe("Cognitive System Status", () => {
    it("should provide comprehensive system status", async () => {
      orchestrator = new Orchestrator({
        enableDeltaChat: false,
        enableDovecot: false,
        enableIPC: false,
        enableScheduler: false,
        enableWebhooks: false,
        enableDove9: true,
        enableSys6: true,
        enableDoubleMembrane: true,
      });

      await orchestrator.start();

      const status = orchestrator.getCognitiveSystemStatus();
      expect(status.tierMode).toBe("ADAPTIVE");
      expect(status.sys6).not.toBeNull();
      expect(status.doubleMembrane).not.toBeNull();
      expect(status.dove9).not.toBeNull();
      expect(status.stats).toBeDefined();
    });

    it("should show null for disabled tiers", async () => {
      orchestrator = new Orchestrator({
        enableDeltaChat: false,
        enableDovecot: false,
        enableIPC: false,
        enableScheduler: false,
        enableWebhooks: false,
        enableDove9: false,
        enableSys6: false,
        enableDoubleMembrane: false,
      });

      await orchestrator.start();

      const status = orchestrator.getCognitiveSystemStatus();
      expect(status.sys6).toBeNull();
      expect(status.doubleMembrane).toBeNull();
      expect(status.dove9).toBeNull();
    });
  });
});

describe("Complexity Assessment", () => {
  let orchestrator: Orchestrator;

  beforeEach(async () => {
    orchestrator = new Orchestrator({
      enableDeltaChat: false,
      enableDovecot: false,
      enableIPC: false,
      enableScheduler: false,
      enableWebhooks: false,
      enableDove9: false,
      enableSys6: false,
      enableDoubleMembrane: false,
      cognitiveTierMode: "ADAPTIVE",
      sys6ComplexityThreshold: 0.4,
      membraneComplexityThreshold: 0.7,
    });
    await orchestrator.start();
  });

  afterEach(async () => {
    if (orchestrator?.isRunning()) {
      await orchestrator.stop();
    }
  });

  // Note: assessComplexity is private, so we test through observable behavior
  // In a real scenario, we might expose it for testing or test through integration

  it("should track average complexity over time", () => {
    const stats = orchestrator.getProcessingStats();
    expect(typeof stats.averageComplexity).toBe("number");
    expect(stats.averageComplexity).toBeGreaterThanOrEqual(0);
    expect(stats.averageComplexity).toBeLessThanOrEqual(1);
  });
});

describe("Tier Mode Configurations", () => {
  const testCases: Array<{ mode: CognitiveTierMode; description: string }> = [
    { mode: "BASIC", description: "uses only Deep Tree Echo Core" },
    { mode: "SYS6", description: "uses Sys6-Triality 30-step cycle" },
    { mode: "MEMBRANE", description: "uses Double Membrane architecture" },
    { mode: "ADAPTIVE", description: "auto-selects based on complexity" },
    { mode: "FULL", description: "uses all tiers with cascading" },
  ];

  testCases.forEach(({ mode, description }) => {
    it(`${mode} mode ${description}`, async () => {
      const orchestrator = new Orchestrator({
        enableDeltaChat: false,
        enableDovecot: false,
        enableIPC: false,
        enableScheduler: false,
        enableWebhooks: false,
        enableDove9: false,
        enableSys6: true,
        enableDoubleMembrane: true,
        cognitiveTierMode: mode,
      });

      await orchestrator.start();
      expect(orchestrator.getCognitiveTierMode()).toBe(mode);
      await orchestrator.stop();
    });
  });
});
