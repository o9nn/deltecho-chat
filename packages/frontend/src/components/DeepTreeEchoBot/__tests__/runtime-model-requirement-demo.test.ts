/**
 * Runtime Model Requirement Demonstration
 *
 * This test demonstrates that the DeepTreeEchoBot cannot produce
 * character responses without a configured LLM. It proves there is
 * no offline/demo/fallback mode.
 */

import { LLMService } from "../LLMService";
import { VisionCapabilities } from "../VisionCapabilities";

// Prevent actual network calls
const originalFetch = global.fetch;
beforeAll(() => {
  // Don't actually call any API
  global.fetch = jest
    .fn()
    .mockRejectedValue(new Error("Network disabled for test"));
});
afterAll(() => {
  global.fetch = originalFetch;
});

describe("Runtime Model Requirement Demonstration", () => {
  let llmService: LLMService;

  beforeEach(() => {
    // Reset LLMService singleton
    (LLMService as any).instance = null;
    llmService = LLMService.getInstance();
  });

  describe("No offline/demo/fallback mode exists", () => {
    it("throws error when generating response WITHOUT API key", async () => {
      llmService.setConfig({
        model: "gpt-4",
        apiEndpoint: "https://api.openai.com/v1/chat/completions",
        apiKey: "", // No API key
      });

      // Must throw - no fallback text should be returned
      await expect(
        llmService.generateResponse("Hello, how are you?", []),
      ).rejects.toThrow("MODEL_UNAVAILABLE");
    });

    it("throws error when vision analysis attempted WITHOUT LLM", async () => {
      // LLM not configured - vision should fail
      const vision = new VisionCapabilities({ enabled: true });

      await expect(vision.analyzeImage("fake-image-data")).rejects.toThrow();
    });

    it("error messages are technical, not character speech", async () => {
      llmService.setConfig({
        model: "gpt-4",
        apiEndpoint: "https://api.openai.com/v1/chat/completions",
        apiKey: "",
      });

      const errorMessages: string[] = [];

      try {
        await llmService.generateResponse("test", []);
      } catch (e: any) {
        errorMessages.push(e.message);
      }

      try {
        const vision = new VisionCapabilities({ enabled: true });
        await vision.analyzeImage("test");
      } catch (e: any) {
        errorMessages.push(e.message);
      }

      // Character speech patterns that should NOT appear in errors
      const characterSpeechPatterns = [
        /\bI'm\b/i,
        /\bI am\b/i,
        /\bsorry\b/i,
        /\bapologize\b/i,
        /\bunable to help\b/i,
        /\blet me\b/i,
        /\bI can\b/i,
        /\bI cannot\b/i,
      ];

      for (const msg of errorMessages) {
        for (const pattern of characterSpeechPatterns) {
          expect(msg).not.toMatch(pattern);
        }
      }
    });
  });

  describe("All character responses require configured model", () => {
    it("generateResponse requires API key", async () => {
      llmService.setConfig({
        model: "gpt-4",
        apiEndpoint: "https://api.openai.com/v1/chat/completions",
        apiKey: "",
      });

      await expect(llmService.generateResponse("test", [])).rejects.toThrow();
    });

    it("generateReflection requires API key", async () => {
      llmService.setConfig({
        model: "gpt-4",
        apiEndpoint: "https://api.openai.com/v1/chat/completions",
        apiKey: "",
      });

      await expect(
        llmService.generateReflection("test reflection"),
      ).rejects.toThrow();
    });

    it("analyzeImage requires configured LLM", async () => {
      await expect(llmService.analyzeImage("test")).rejects.toThrow();
    });
  });
});
