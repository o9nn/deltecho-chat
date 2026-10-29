/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { DeepTreeEchoBotComponent as DeepTreeEchoBot } from "../index";

// Mock LLMService to provide model responses for tests
jest.mock("../LLMService", () => {
  const mockGenerateResponse = jest
    .fn()
    .mockImplementation((prompt: string, _context: string[]) => {
      // Return LLM-style responses based on prompt content
      if (prompt.includes("help") || prompt.includes("commands")) {
        return Promise.resolve(
          "I can help you with various commands. Use /help for a list.",
        );
      }
      if (prompt.includes("identity") || prompt.includes("who you are")) {
        return Promise.resolve(
          "I am Deep Tree Echo, an AI assistant with cognitive capabilities.",
        );
      }
      if (prompt.includes("memory") || prompt.includes("memories")) {
        return Promise.resolve(
          "My memory is currently empty. We can build memories together.",
        );
      }
      if (prompt.includes("emotional") || prompt.includes("feeling")) {
        return Promise.resolve("I'm feeling balanced and ready to assist.");
      }
      if (prompt.includes("belief")) {
        return Promise.resolve(
          "I'm still forming my beliefs through our conversations.",
        );
      }
      return Promise.resolve("I understand. How can I help you?");
    });

  return {
    LLMService: {
      getInstance: jest.fn().mockReturnValue({
        generateResponse: mockGenerateResponse,
        generateResponseWithFunction: mockGenerateResponse,
        setConfig: jest.fn(),
        setFunctionConfig: jest.fn(),
        getAllFunctions: jest.fn().mockReturnValue([]),
        getActiveFunctions: jest.fn().mockReturnValue([]),
        isFunctionConfigured: jest.fn().mockReturnValue(true),
      }),
    },
    CognitiveFunctionType: {
      GENERAL: "general",
      COGNITIVE_CORE: "cognitive_core",
      AFFECTIVE_CORE: "affective_core",
      RELEVANCE_CORE: "relevance_core",
    },
  };
});

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
        emotionalContext: "Overall emotional valence: neutral",
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

    // Test /help command - response comes from LLM mock
    const helpResponse = await hooks.processCommand("help", "", 1);
    expect(helpResponse).toBeDefined();
    expect(typeof helpResponse).toBe("string");
    expect(helpResponse.length).toBeGreaterThan(0);

    // Test /identity command - response comes from LLM mock
    const identityResponse = await hooks.processCommand("identity", "", 1);
    expect(identityResponse).toBeDefined();
    expect(typeof identityResponse).toBe("string");

    // Test /memory command - response comes from LLM mock
    const memoryResponse = await hooks.processCommand("memory", "", 1);
    expect(memoryResponse).toBeDefined();
    expect(typeof memoryResponse).toBe("string");
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

    // Should throw security error when verification required
    await expect(
      act(async () => {
        await hooks.processMessage(1, 100, "Secret message");
      }),
    ).rejects.toThrow("SECURITY_VERIFICATION_REQUIRED");

    // Should verify that secureSystem.handleUserRequest was called
    expect(mockSecure.handleUserRequest).toHaveBeenCalled();
  });
});
