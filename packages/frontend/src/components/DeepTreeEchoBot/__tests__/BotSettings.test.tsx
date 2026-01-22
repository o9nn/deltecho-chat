/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import BotSettings from "../BotSettings";
import { runtime } from "@deltachat-desktop/runtime-interface";
import { LLMService } from "../LLMService";
import type { CognitiveFunctionType as _CognitiveFunctionType } from "../LLMService";

// Mock dependencies
jest.mock("@deltachat-desktop/runtime-interface", () => ({
  runtime: {
    getDesktopSettings: jest.fn(),
    setDesktopSetting: jest.fn(),
  },
}));

jest.mock("../../../../../shared/logger", () => ({
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock("../LLMService", () => {
  const mockLLMService = {
    getActiveFunctions: jest.fn().mockReturnValue([]),
    enableMemory: jest.fn(),
    disableMemory: jest.fn(),
    enableVision: jest.fn(),
    disableVision: jest.fn(),
    enableWebAutomation: jest.fn(),
    disableWebAutomation: jest.fn(),
    enableEmbodiment: jest.fn(),
    disableEmbodiment: jest.fn(),
    setFunctionConfig: jest.fn(),
    setConfig: jest.fn(),
  };
  return {
    LLMService: {
      getInstance: jest.fn(() => mockLLMService),
    },
    CognitiveFunctionType: {
      COGNITIVE_CORE: "cognitive_core",
      AFFECTIVE_CORE: "affective_core",
      RELEVANCE_CORE: "relevance_core",
      SEMANTIC_MEMORY: "semantic_memory",
      EPISODIC_MEMORY: "episodic_memory",
      PROCEDURAL_MEMORY: "procedural_memory",
      CONTENT_EVALUATION: "content_evaluation",
    },
  };
});

describe("BotSettings Component", () => {
  const mockSaveSettings = jest.fn();
  const _mockOnNavigateToMain = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementation for runtime settings
    (runtime.getDesktopSettings as jest.Mock).mockResolvedValue({
      deepTreeEchoBotEnabled: true,
      deepTreeEchoBotApiKey: "test-api-key",
      deepTreeEchoBotMemoryEnabled: false,
    });

    // Setup LLMService mock return
    const mockLLMInstance = LLMService.getInstance();
    (mockLLMInstance.getActiveFunctions as jest.Mock).mockReturnValue([
      { name: "Core", usage: { totalTokens: 100, requestCount: 5 } },
    ]);
  });

  it("renders loading state initially", async () => {
    // Make getDesktopSettings slow to catch loading state
    (runtime.getDesktopSettings as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({}), 100)),
    );

    await act(async () => {
      render(<BotSettings saveSettings={mockSaveSettings} />);
    });

    expect(screen.getByText("Loading settings...")).toBeInTheDocument();
  });

  it("renders settings form after loading", async () => {
    await act(async () => {
      render(<BotSettings saveSettings={mockSaveSettings} />);
    });

    expect(screen.getByText("Deep Tree Echo Bot Settings")).toBeInTheDocument();
    expect(screen.getByText("Enable Bot")).toBeInTheDocument();
    // Check for API key input value
    expect(
      screen.getByPlaceholderText("Enter your default API key"),
    ).toHaveValue("test-api-key");
  });

  it("toggles bot enabled state", async () => {
    await act(async () => {
      render(<BotSettings saveSettings={mockSaveSettings} />);
    });

    const toggle = screen.getByLabelText("Enable Bot") as HTMLInputElement;
    expect(toggle.checked).toBe(true);

    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(toggle.checked).toBe(false);
    expect(mockSaveSettings).toHaveBeenCalledWith({ enabled: false });
    expect(runtime.setDesktopSetting).toHaveBeenCalledWith(
      "deepTreeEchoBotEnabled",
      false,
    );
  });

  it("handles memory toggle correctly", async () => {
    await act(async () => {
      render(<BotSettings saveSettings={mockSaveSettings} />);
    });

    // Assuming memory toggle is checkbox with id 'memory-toggle'
    // Note: The component uses a complex toggle structure. We might need to target by inputs.
    // The inputs have ids like 'memory-toggle'
    const memoryInput = document.getElementById(
      "memory-toggle",
    ) as HTMLInputElement;
    expect(memoryInput).toBeDefined();
    expect(memoryInput.checked).toBe(false);

    await act(async () => {
      fireEvent.click(memoryInput);
    });

    expect(memoryInput.checked).toBe(true);
    expect(mockSaveSettings).toHaveBeenCalledWith({ memoryEnabled: true });
    expect(runtime.setDesktopSetting).toHaveBeenCalledWith(
      "deepTreeEchoBotMemoryEnabled",
      true,
    );

    const llmService = LLMService.getInstance();
    expect(llmService.enableMemory).toHaveBeenCalled();
  });

  it("toggles advanced settings visibility", async () => {
    await act(async () => {
      render(<BotSettings saveSettings={mockSaveSettings} />);
    });

    const toggleBtn = screen.getByText("Show Advanced Settings");

    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    expect(screen.getByText("Hide Advanced Settings")).toBeInTheDocument();
    expect(
      screen.getByText("Advanced Cognitive Architecture"),
    ).toBeInTheDocument();
  });
});
