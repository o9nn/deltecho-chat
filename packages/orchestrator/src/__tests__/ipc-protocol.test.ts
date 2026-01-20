/**
 * IPC Protocol Tests
 *
 * Tests for the strongly-typed IPC protocol
 */

import { describe, it, expect } from "@jest/globals";

import {
  IPCMessageType,
  createIPCMessage,
  createSuccessResponse,
  createErrorResponse,
  isIPCMessage,
  type CognitiveProcessRequest,
  type CognitiveStateSnapshot,
  type EmotionalStateSnapshot,
} from "../ipc/protocol";

describe("IPC Protocol", () => {
  describe("IPCMessageType", () => {
    it("should have cognitive message types", () => {
      expect(IPCMessageType.COGNITIVE_PROCESS).toBe("cognitive:process");
      expect(IPCMessageType.COGNITIVE_QUICK_PROCESS).toBe(
        "cognitive:quick_process",
      );
      expect(IPCMessageType.COGNITIVE_GET_STATE).toBe("cognitive:get_state");
      expect(IPCMessageType.COGNITIVE_GET_EMOTIONAL_STATE).toBe(
        "cognitive:get_emotional_state",
      );
    });

    it("should have memory message types", () => {
      expect(IPCMessageType.MEMORY_SEARCH).toBe("memory:search");
      expect(IPCMessageType.MEMORY_STORE).toBe("memory:store");
      expect(IPCMessageType.MEMORY_GET_CONTEXT).toBe("memory:get_context");
    });

    it("should have persona message types", () => {
      expect(IPCMessageType.PERSONA_GET).toBe("persona:get");
      expect(IPCMessageType.PERSONA_UPDATE).toBe("persona:update");
    });

    it("should have system message types", () => {
      expect(IPCMessageType.SYSTEM_STATUS).toBe("system:status");
      expect(IPCMessageType.SYSTEM_METRICS).toBe("system:metrics");
    });

    it("should have control message types", () => {
      expect(IPCMessageType.PING).toBe("control:ping");
      expect(IPCMessageType.PONG).toBe("control:pong");
      expect(IPCMessageType.SUBSCRIBE).toBe("control:subscribe");
    });
  });

  describe("createIPCMessage", () => {
    it("should create a valid IPC message", () => {
      const payload: CognitiveProcessRequest = {
        message: "Hello, AI!",
        chatId: 123,
      };

      const message = createIPCMessage(
        IPCMessageType.COGNITIVE_PROCESS,
        payload,
      );

      expect(message.id).toBeDefined();
      expect(message.id).toMatch(/^msg_\d+_[a-z0-9]+$/);
      expect(message.type).toBe(IPCMessageType.COGNITIVE_PROCESS);
      expect(message.payload).toEqual(payload);
      expect(message.timestamp).toBeGreaterThan(0);
    });

    it("should accept custom ID", () => {
      const message = createIPCMessage(
        IPCMessageType.PING,
        undefined,
        "custom-id-123",
      );

      expect(message.id).toBe("custom-id-123");
    });

    it("should generate unique IDs for different messages", () => {
      const msg1 = createIPCMessage(IPCMessageType.PING, undefined);
      const msg2 = createIPCMessage(IPCMessageType.PING, undefined);

      expect(msg1.id).not.toBe(msg2.id);
    });
  });

  describe("createSuccessResponse", () => {
    it("should create a success response", () => {
      const data = { result: "test" };
      const response = createSuccessResponse(data);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.error).toBeUndefined();
    });

    it("should handle complex data", () => {
      const cognitiveState: CognitiveStateSnapshot = {
        activeStreams: [{ id: "stream1", phase: "process", status: "active" }],
        emotionalState: {
          joy: 0.5,
          sadness: 0,
          anger: 0,
          fear: 0,
          surprise: 0.1,
          disgust: 0,
          contempt: 0,
          interest: 0.3,
          dominant: "joy",
          valence: 0.5,
          arousal: 0.3,
        },
        currentPhase: 15,
        cycleNumber: 42,
      };

      const response = createSuccessResponse(cognitiveState);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(cognitiveState);
    });
  });

  describe("createErrorResponse", () => {
    it("should create an error response", () => {
      const response = createErrorResponse(
        "INVALID_REQUEST",
        "Message is required",
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe("INVALID_REQUEST");
      expect(response.error!.message).toBe("Message is required");
    });

    it("should include details when provided", () => {
      const details = { field: "message", expected: "string" };
      const response = createErrorResponse(
        "VALIDATION_ERROR",
        "Validation failed",
        details,
      );

      expect(response.error!.details).toEqual(details);
    });
  });

  describe("isIPCMessage", () => {
    it("should return true for valid IPC message", () => {
      const message = createIPCMessage(IPCMessageType.PING, {});
      expect(isIPCMessage(message)).toBe(true);
    });

    it("should return false for null", () => {
      expect(isIPCMessage(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isIPCMessage(undefined)).toBe(false);
    });

    it("should return false for primitive values", () => {
      expect(isIPCMessage("string")).toBe(false);
      expect(isIPCMessage(123)).toBe(false);
      expect(isIPCMessage(true)).toBe(false);
    });

    it("should return false for object missing id", () => {
      expect(isIPCMessage({ type: "ping", timestamp: Date.now() })).toBe(false);
    });

    it("should return false for object missing type", () => {
      expect(isIPCMessage({ id: "1", timestamp: Date.now() })).toBe(false);
    });

    it("should return false for object missing timestamp", () => {
      expect(isIPCMessage({ id: "1", type: "ping" })).toBe(false);
    });

    it("should return true for minimal valid object", () => {
      expect(isIPCMessage({ id: "1", type: "ping", timestamp: 123 })).toBe(
        true,
      );
    });
  });

  describe("Type definitions", () => {
    it("should validate CognitiveProcessRequest structure", () => {
      const request: CognitiveProcessRequest = {
        message: "Test",
        chatId: 1,
        skipSentiment: true,
        skipMemory: false,
      };

      expect(request.message).toBe("Test");
      expect(request.chatId).toBe(1);
      expect(request.skipSentiment).toBe(true);
      expect(request.skipMemory).toBe(false);
    });

    it("should validate EmotionalStateSnapshot structure", () => {
      const state: EmotionalStateSnapshot = {
        joy: 0.8,
        sadness: 0.1,
        anger: 0,
        fear: 0.05,
        surprise: 0.2,
        disgust: 0,
        contempt: 0,
        interest: 0.5,
        dominant: "joy",
        valence: 0.7,
        arousal: 0.4,
      };

      expect(state.joy).toBe(0.8);
      expect(state.dominant).toBe("joy");
      expect(state.valence).toBe(0.7);
    });
  });
});
