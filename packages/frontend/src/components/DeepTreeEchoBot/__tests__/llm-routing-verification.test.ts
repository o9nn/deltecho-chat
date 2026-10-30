/**
 * LLM Routing Verification Test
 *
 * This test verifies that all character response code paths
 * call through LLMService methods. It uses spies to confirm
 * the routing without requiring actual API credentials.
 */

import { LLMService } from "../LLMService";
import { VisionCapabilities } from "../VisionCapabilities";

describe("LLM Routing Verification", () => {
  let llmService: LLMService;

  beforeEach(() => {
    (LLMService as any).instance = null;
    llmService = LLMService.getInstance();
  });

  describe("VisionCapabilities routing", () => {
    it("analyzeImage calls llmService.analyzeImage", async () => {
      const vision = new VisionCapabilities({ enabled: true });

      const analyzeImageSpy = jest
        .spyOn(llmService, "analyzeImage")
        .mockResolvedValue(
          '{"description": "Test image", "objects": [], "tags": []}',
        );

      jest.spyOn(llmService, "isFunctionConfigured").mockReturnValue(true);

      await vision.initialize();
      await vision.analyzeImage("base64imagedata");

      expect(analyzeImageSpy).toHaveBeenCalledWith("base64imagedata");
    });

    it("throws when LLM not configured (no fallback)", async () => {
      const vision = new VisionCapabilities({ enabled: true });

      jest.spyOn(llmService, "isFunctionConfigured").mockReturnValue(false);

      await expect(vision.initialize()).rejects.toThrow("VISION_UNAVAILABLE");
    });
  });

  describe("LLMService generateResponse routing", () => {
    it("throws on missing configuration (no fallback text)", async () => {
      llmService.setConfig({
        model: "test-model",
        apiEndpoint: "",
        apiKey: "",
      });

      await expect(llmService.generateResponse("Hello", [])).rejects.toThrow();
    });

    it("throws on API error (no fallback text)", async () => {
      llmService.setConfig({
        model: "test-model",
        apiEndpoint: "https://api.example.com",
        apiKey: "test-key",
      });

      global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

      await expect(llmService.generateResponse("Hello", [])).rejects.toThrow(
        "Network error",
      );
    });

    it("throws on empty response (no fallback text)", async () => {
      llmService.setConfig({
        model: "test-model",
        apiEndpoint: "https://api.example.com",
        apiKey: "test-key",
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [] }),
      });

      await expect(llmService.generateResponse("Hello", [])).rejects.toThrow();
    });
  });

  describe("Code structure verification", () => {
    it("LLMService has no hardcoded fallback strings", () => {
      const methodSource = llmService.generateResponse.toString();

      const fallbackPatterns = [
        /return\s*["']I'm sorry/i,
        /return\s*["']Unable to/i,
        /return\s*["']Error occurred/i,
        /return\s*["']Something went wrong/i,
        /fallbackResponse/i,
        /defaultResponse/i,
      ];

      for (const pattern of fallbackPatterns) {
        expect(methodSource).not.toMatch(pattern);
      }
    });
  });
});
