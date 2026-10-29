import { DeepTreeEchoBot } from "../DeepTreeEchoBot";
import { LLMService } from "../LLMService";
import { VisionProcessor } from "../../../utils/VisionProcessor";
import type { BackendRemote as _BackendRemote } from "../../../backend-com";

// Mock AvatarStateManager
jest.mock("../AvatarStateManager", () => ({
  setAvatarListening: jest.fn(),
  setAvatarThinking: jest.fn(),
  setAvatarResponding: jest.fn(),
  setAvatarIdle: jest.fn(),
  setAvatarError: jest.fn(),
  stopLipSync: jest.fn(),
}));

// Mock dependencies
jest.mock("../LLMService");
jest.mock("../../../utils/VisionProcessor");
jest.mock("../../../backend-com", () => ({
  BackendRemote: {
    rpc: {
      miscSendTextMessage: jest.fn(),
    },
  },
}));
jest.mock("../PersonaCore", () => ({
  PersonaCore: {
    getInstance: jest.fn().mockReturnValue({
      getInstance: jest.fn(),
    }),
  },
}));
jest.mock("../RAGMemoryStore", () => ({
  RAGMemoryStore: {
    getInstance: jest.fn().mockReturnValue({
      setEnabled: jest.fn(),
      storeMemory: jest.fn(),
      getConversationContext: jest.fn().mockReturnValue([]),
      getStats: jest.fn().mockReturnValue({
        totalMemories: 5,
        totalReflections: 2,
        memoriesByChat: {},
      }),
      getMemoriesByChatId: jest.fn().mockReturnValue([]),
      exportToMindStream: jest
        .fn()
        .mockReturnValue([
          { id: "1", content: "test thought", type: "thought" },
        ]),
      getAllVisualMemories: jest.fn().mockReturnValue([]),
    }),
  },
}));
jest.mock("../SelfReflection", () => ({
  SelfReflection: {
    getInstance: jest.fn().mockReturnValue({
      getInstance: jest.fn(),
    }),
  },
}));
jest.mock("../AgentToolExecutor", () => ({
  AgentToolExecutor: {
    getInstance: jest.fn().mockReturnValue({
      executeTool: jest.fn(),
    }),
  },
}));
jest.mock("../AgenticLLMService", () => ({
  AgenticLLMService: {
    getInstance: jest.fn().mockReturnValue({
      configure: jest.fn(),
      processMessageAgentic: jest.fn(),
    }),
  },
}));
jest.mock("../../../utils/DeploymentService", () => ({
  DeploymentService: {
    getInstance: jest.fn().mockReturnValue({
      deploy: jest.fn().mockResolvedValue("https://mock-garden.com"),
    }),
  },
}));

describe("DeepTreeEchoBot Class", () => {
  let bot: DeepTreeEchoBot;
  let mockLLMService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup LLMService mock instance
    mockLLMService = {
      setConfig: jest.fn(),
      setFunctionConfig: jest.fn(),
      generateResponse: jest.fn().mockResolvedValue("Mock Response"),
      isConfigured: jest.fn().mockReturnValue(true),
      activeFunctions: [],
    };
    (LLMService.getInstance as jest.Mock).mockReturnValue(mockLLMService);

    // Setup VisionProcessor mock
    (VisionProcessor.constructVisionMessage as jest.Mock).mockImplementation(
      (text, images) => ({
        role: "user",
        content: [
          { type: "text", text },
          ...images.map((url: string) => ({
            type: "image_url",
            image_url: { url },
          })),
        ],
      }),
    );
  });

  it("should process message with images by passing to LLM", async () => {
    const options: any = {
      enabled: true,
      visionEnabled: true,
      memoryEnabled: false,
      webAutomationEnabled: false,
      embodimentEnabled: false,
      useParallelProcessing: false,
    };
    bot = new DeepTreeEchoBot(options);

    const message = {
      text: "Look at this",
      images: ["http://example.com/image.jpg"],
    };

    // Call processMessage with 4 args: accountId, chatId, msgId, message
    await bot.processMessage(1, 100, 200, message);

    // Verify LLMService.generateResponse was called (model must generate the response)
    expect(mockLLMService.generateResponse).toHaveBeenCalled();

    // All calls should use the prompt + context format (string, array)
    const calls = mockLLMService.generateResponse.mock.calls;
    for (const call of calls) {
      const [prompt, context] = call;
      expect(typeof prompt).toBe("string");
      expect(Array.isArray(context)).toBe(true);
    }
  });

  it("should trigger analyzeAndStoreVisualMemory when memory and vision enabled", async () => {
    const options: any = {
      enabled: true,
      visionEnabled: true,
      memoryEnabled: true, // Must be true
      webAutomationEnabled: false,
      embodimentEnabled: false,
      useParallelProcessing: false,
    };
    bot = new DeepTreeEchoBot(options);

    // Spy on private method if possible, or verify side effects
    // Since analyzeAndStoreVisualMemory is private, we verify side effects:
    // 1. LLMService called with analysis prompt
    // 2. MemoryStore called with metadata

    const message = {
      text: "Analyze this",
      images: ["http://example.com/image.jpg"],
    };

    // We need to wait for the async operation inside processMessage which is not awaited
    // Hack: processMessage awaits generateAndSendResponse, but generateAndSendResponse does NOT await analyzeAndStoreVisualMemory
    // So we need to wait a tick
    await bot.processMessage(1, 100, 200, message);

    // Wait for async promises to settle
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify LLMService was called at least once (model must generate responses)
    expect(mockLLMService.generateResponse).toHaveBeenCalled();

    // All calls should use the new API: (prompt: string, context: string[])
    const calls = mockLLMService.generateResponse.mock.calls;
    for (const call of calls) {
      const [prompt, context] = call;
      expect(typeof prompt).toBe("string");
      expect(Array.isArray(context)).toBe(true);
    }

    // Verify MemoryStore was called with metadata
    // We need to access the mock instance of RAGMemoryStore
    // The mock factory returns an object with storeMemory
    // BUT we need to get the specific instance used by the bot
    // In the bot constructor: this.memoryStore = RAGMemoryStore.getInstance()
    // And we mocked getInstance to return an object.

    // Let's get the mock instance from the class
    const memoryStoreMock =
      require("../RAGMemoryStore").RAGMemoryStore.getInstance();

    expect(memoryStoreMock.storeMemory).toHaveBeenCalled();

    const memoryCalls = memoryStoreMock.storeMemory.mock.calls;
    const visualMemory = memoryCalls.find(
      (call: any) => call[0].metadata?.type === "visual_analysis",
    );

    expect(visualMemory).toBeDefined();
    expect(visualMemory[0].metadata.image_urls).toEqual([
      "http://example.com/image.jpg",
    ]);
  });

  it("should fallback to text-only if vision disabled", async () => {
    const options: any = {
      enabled: true,
      visionEnabled: false,
      memoryEnabled: false,
      webAutomationEnabled: false,
      embodimentEnabled: false,
    };
    bot = new DeepTreeEchoBot(options);

    const message = {
      text: "Look at this",
      images: ["http://example.com/image.jpg"],
    };

    await bot.processMessage(1, 100, 200, message);

    expect(VisionProcessor.constructVisionMessage).not.toHaveBeenCalled();
    // LLMService should be called with standard string or text content
    // Based on logic: `userMessage = { role: 'user', content: messageText }`
  });

  it("should trigger analyzeAndStoreVideoMemory when video attached", async () => {
    const options: any = {
      enabled: true,
      visionEnabled: true,
      memoryEnabled: true,
      webAutomationEnabled: false,
      embodimentEnabled: false,
      useParallelProcessing: false,
    };
    bot = new DeepTreeEchoBot(options);

    // Mock extractVideoFrames
    (VisionProcessor.extractVideoFrames as jest.Mock).mockResolvedValue([
      "data:image/jpeg;base64,frame1",
      "data:image/jpeg;base64,frame2",
    ]);

    const message = {
      text: "Check this video",
      attachments: [
        { view_type: "video", url: "http://example.com/video.mp4" },
      ],
    };

    await bot.processMessage(1, 100, 200, message);

    // Wait for async
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify LLMService was called (model must generate all responses)
    expect(mockLLMService.generateResponse).toHaveBeenCalled();

    // All calls should use the prompt + context format
    const calls = mockLLMService.generateResponse.mock.calls;
    for (const call of calls) {
      const [prompt, context] = call;
      expect(typeof prompt).toBe("string");
      expect(Array.isArray(context)).toBe(true);
    }

    // Verify extractVideoFrames called
    expect(VisionProcessor.extractVideoFrames).toHaveBeenCalledWith(
      "http://example.com/video.mp4",
      3,
    );

    // Verify MemoryStore called with video metadata
    const memoryStoreMock =
      require("../RAGMemoryStore").RAGMemoryStore.getInstance();
    const memoryCalls = memoryStoreMock.storeMemory.mock.calls;
    const videoMemory = memoryCalls.find(
      (call: any) => call[0].metadata?.type === "video_analysis",
    );

    expect(videoMemory).toBeDefined();
    expect(videoMemory[0].metadata.video_url).toBe(
      "http://example.com/video.mp4",
    );
    expect(videoMemory[0].metadata.frame_count).toBe(2);
  });

  it("should generate mind data with /publish command", async () => {
    const options: any = {
      enabled: true,
      visionEnabled: true,
      memoryEnabled: true,
    };
    bot = new DeepTreeEchoBot(options);

    const message = {
      text: "/publish",
    };

    await bot.processMessage(1, 100, 201, message);

    // Wait for async publish delay (mocked adapter has 1500ms delay, but here we mock the service directly)
    // The previous implementation had a direct delay, now it's inside the service.
    // If we mock the service to resolve immediately, we don't need a huge wait, but processMessage is async.
    await new Promise((resolve) => setTimeout(resolve, 100));

    const memoryStoreMock =
      require("../RAGMemoryStore").RAGMemoryStore.getInstance();
    const deploymentServiceMock =
      require("../../../utils/DeploymentService").DeploymentService.getInstance();

    expect(memoryStoreMock.getStats).toHaveBeenCalled();
    expect(memoryStoreMock.exportToMindStream).toHaveBeenCalled();
    expect(memoryStoreMock.getAllVisualMemories).toHaveBeenCalled();
    expect(deploymentServiceMock.deploy).toHaveBeenCalled();

    // Verify LLM was called to generate responses (all character responses come from model)
    expect(mockLLMService.generateResponse).toHaveBeenCalled();

    // Verify messages were sent
    const { BackendRemote } = require("../../../backend-com");
    // Should send publishing status then result (both from LLM)
    expect(BackendRemote.rpc.miscSendTextMessage).toHaveBeenCalledTimes(2);
  });
});
