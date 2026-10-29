/**
 * LLM Error Behavior Tests
 *
 * These tests verify that when the LLM fails or is unavailable,
 * the system throws errors instead of returning fallback text.
 *
 * This enforces the requirement that all character responses
 * must come from the model.
 */

import { LLMService } from "../LLMService";

// Mock fetch to simulate various LLM failure modes
const originalFetch = global.fetch;

describe("LLM Error Behavior (No Fallbacks)", () => {
  let llmService: LLMService;

  beforeEach(() => {
    // Reset singleton
    (LLMService as any).instance = null;
    llmService = LLMService.getInstance();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("when LLM is not configured", () => {
    it("should throw an error, not return fallback text", async () => {
      // LLM is not configured (no API key set)
      llmService.setConfig({
        model: "gpt-4",
        apiEndpoint: "",
        apiKey: "",
      });

      await expect(llmService.generateResponse("Hello", [])).rejects.toThrow();
    });
  });

  describe("when LLM API fails", () => {
    beforeEach(() => {
      llmService.setConfig({
        model: "gpt-4",
        apiEndpoint: "https://api.openai.com/v1/chat/completions",
        apiKey: "test-key",
      });
    });

    it("should throw on network error, not return fallback", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

      await expect(llmService.generateResponse("Hello", [])).rejects.toThrow(
        "Network error",
      );
    });

    it("should throw on HTTP 500, not return fallback", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ error: { message: "Server error" } }),
      });

      await expect(llmService.generateResponse("Hello", [])).rejects.toThrow();
    });

    it("should throw on rate limit (429), not return fallback", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        json: async () => ({ error: { message: "Rate limited" } }),
      });

      await expect(llmService.generateResponse("Hello", [])).rejects.toThrow();
    });

    it("should throw on empty response, not return fallback", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [] }),
      });

      await expect(llmService.generateResponse("Hello", [])).rejects.toThrow();
    });

    it("should throw on malformed response, not return fallback", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ unexpected: "format" }),
      });

      await expect(llmService.generateResponse("Hello", [])).rejects.toThrow();
    });
  });

  describe("verification that no fallback text exists", () => {
    it("should not contain any hardcoded fallback strings in generateResponse", async () => {
      // These patterns would indicate fallback text
      const fallbackPatterns = [
        /I'm sorry/i,
        /Unable to generate/i,
        /Error occurred/i,
        /Something went wrong/i,
        /I apologize/i,
        /Cannot process/i,
        /fallback/i,
      ];

      // Check method source doesn't contain fallback patterns
      // (This is a meta-test that verifies the code structure)
      const generateResponseSource = llmService.generateResponse.toString();

      for (const pattern of fallbackPatterns) {
        expect(generateResponseSource).not.toMatch(pattern);
      }
    });
  });
});
