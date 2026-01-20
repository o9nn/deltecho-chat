/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { DeepTreeEchoBotComponent as DeepTreeEchoBot } from "../index";

// Mock the cognitive modules
jest.mock("../HyperDimensionalMemory", () => {
  return {
    HyperDimensionalMemory: jest.fn().mockImplementation(() => ({
      storeMemory: jest.fn(),
      recallMemories: jest.fn().mockReturnValue([]),
      importMemoryState: jest.fn(),
      exportMemoryState: jest.fn().mockReturnValue({}),
    })),
  };
});

jest.mock("../AdaptivePersonality", () => {
  return {
    AdaptivePersonality: jest.fn().mockImplementation(() => ({
      importState: jest.fn(),
      adaptToSocialContext: jest.fn(),
      recordInteraction: jest.fn(),
      getCurrentPersonality: jest.fn().mockReturnValue("friendly"),
      getCurrentEmotionalState: jest.fn().mockReturnValue({
        joy: 0.5,
        trust: 0.5,
        anticipation: 0.5,
        sadness: 0,
        fear: 0,
        balance: 1,
      }),
      getDominantTraits: jest.fn().mockReturnValue(["openness"]),
      analyzePersonalityEvolution: jest.fn().mockReturnValue({
        stabilityScore: 0.9,
        emergentPatterns: [],
      }),
      exportState: jest.fn().mockReturnValue({}),
    })),
  };
});

jest.mock("../QuantumBeliefPropagation", () => {
  return {
    QuantumBeliefPropagation: jest.fn().mockImplementation(() => ({
      importBeliefNetwork: jest.fn(),
      getRelevantBeliefs: jest.fn().mockReturnValue([]),
      addBelief: jest.fn(),
      inferBeliefs: jest.fn(),
      evaluateCoherence: jest.fn().mockReturnValue({
        overallCoherence: 0.8,
        contradictions: [],
        strongestBeliefs: [],
      }),
      exportBeliefNetwork: jest.fn().mockReturnValue({}),
    })),
    BeliefNodeType: {
      FACT: "fact",
      INFERENCE: "inference",
    },
  };
});

jest.mock("../EmotionalIntelligence", () => {
  return {
    EmotionalIntelligence: jest.fn().mockImplementation(() => ({
      analyzeEmotion: jest.fn().mockReturnValue({
        arousal: 0.5,
        valence: 0.5,
      }),
      generateEmotionalResponseParameters: jest.fn().mockReturnValue({
        empathyLevel: 0.5,
        intensity: 0.5,
        tone: "neutral",
        suggestedPhrases: ["I understand"],
      }),
      analyzeEmotionalTrends: jest.fn().mockReturnValue({
        patterns: [],
      }),
    })),
  };
});

jest.mock("../SecureIntegration", () => {
  return {
    SecureIntegration: jest.fn().mockImplementation(() => ({
      secureRetrieve: jest.fn().mockResolvedValue(null),
      handleUserRequest: jest.fn().mockResolvedValue({
        canProcess: true,
        requiresVerification: false,
      }),
      secureStore: jest.fn().mockResolvedValue(true),
      getSecurityInfo: jest.fn().mockReturnValue({
        encryptionState: "secure",
        canExportIdentity: false,
        dataTypeStats: {},
      }),
    })),
  };
});

// Mock jsonrpc-client
jest.mock("@deltachat/jsonrpc-client", () => ({
  C: {
    // Add any constants used if necessary
  },
}));

describe("DeepTreeEchoBot Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation((...args) => {
      // Log to stdout so we can see it in test output
      process.stdout.write(`[CONSOLE_ERROR] ${JSON.stringify(args)}\n`);
    });
  });

  it("renders the bot without crashing", async () => {
    let container;
    await act(async () => {
      const result = render(<DeepTreeEchoBot />);
      container = result.container;
    });

    expect(container).toBeDefined();
  });

  it("initializes cognitive systems on mount", async () => {
    await act(async () => {
      render(<DeepTreeEchoBot />);
    });

    // Check if mocks were constructed
    const { HyperDimensionalMemory } = require("../HyperDimensionalMemory");
    expect(HyperDimensionalMemory).toHaveBeenCalled();

    const { SecureIntegration } = require("../SecureIntegration");
    expect(SecureIntegration).toHaveBeenCalled();
  });
  it("processes commands correctly via testHooks", async () => {
    const hooks: any = {};
    await act(async () => {
      render(<DeepTreeEchoBot testHooks={hooks} />);
    });

    expect(hooks.processCommand).toBeDefined();

    // Test /help command
    const helpResponse = await hooks.processCommand("help", "", 1);
    expect(helpResponse).toContain("Deep Tree Echo Bot Commands");

    // Test /identity command
    const identityResponse = await hooks.processCommand("identity", "", 1);
    expect(identityResponse).toContain("I am Deep Tree Echo");

    // Test /memory command
    const memoryResponse = await hooks.processCommand("memory", "", 1);
    expect(memoryResponse).toContain("I don't have any relevant memories yet");
  });

  it("processes messages and triggers cognitive systems", async () => {
    const hooks: any = {};
    await act(async () => {
      render(<DeepTreeEchoBot testHooks={hooks} />);
    });

    expect(hooks.processMessage).toBeDefined();

    // Test processing a message
    await act(async () => {
      await hooks.processMessage(1, 100, "Hello, who are you?");
    });

    // Verify cognitive modules were called
    const { HyperDimensionalMemory } = require("../HyperDimensionalMemory");
    const mockMemory = HyperDimensionalMemory.mock.results[0].value;
    expect(mockMemory.storeMemory).toHaveBeenCalled();

    const { EmotionalIntelligence } = require("../EmotionalIntelligence");
    const mockEmotional = EmotionalIntelligence.mock.results[0].value;
    expect(mockEmotional.analyzeEmotion).toHaveBeenCalledWith(
      "Hello, who are you?",
    );
  });

  it("handles security checks during message processing", async () => {
    const hooks: any = {};
    await act(async () => {
      render(<DeepTreeEchoBot testHooks={hooks} />);
    });

    // Mock SecureIntegration to deny processing
    const { SecureIntegration } = require("../SecureIntegration");
    const mockSecure = SecureIntegration.mock.results[0].value;
    mockSecure.handleUserRequest.mockResolvedValueOnce({
      canProcess: false,
      requiresVerification: true,
    });

    await act(async () => {
      await hooks.processMessage(1, 100, "Secret message");
    });

    // Should verify that secureSystem.handleUserRequest was called
    expect(mockSecure.handleUserRequest).toHaveBeenCalled();
  });
});
