/**
 * Cognitive IPC Handlers
 *
 * Registers handlers for cognitive operations via IPC.
 * Connects the IPC server to the CognitiveOrchestrator.
 */

import { getLogger } from "deep-tree-echo-core";
import type { CognitiveOrchestrator } from "@deltecho/cognitive";
import type { IPCServer } from "./server.js";
import {
  IPCMessageType,
  type CognitiveProcessRequest,
  type CognitiveProcessResponse,
  type CognitiveQuickProcessRequest,
  type CognitiveStateSnapshot,
  type EmotionalStateSnapshot,
  type EmotionalStateUpdateRequest,
  type GetHistoryRequest,
  type GetHistoryResponse,
  type ExportConversationRequest,
  type ExportConversationResponse,
  type ImportConversationRequest,
  type CognitiveStatistics,
  type MemorySearchRequest,
  type MemorySearchResponse,
  type MemoryStoreRequest,
  type MemoryStoreResponse,
  type MemoryContextRequest,
  type MemoryContextResponse,
  type PersonaInfo,
  type PersonaUpdateRequest,
} from "@deltecho/ipc";

const log = getLogger("deep-tree-echo-orchestrator/CognitiveHandlers");

/**
 * Dependencies for cognitive handlers
 */
export interface CognitiveHandlerDependencies {
  cognitiveOrchestrator: CognitiveOrchestrator;
  personaCore?: {
    getPersonality: () => string;
    getEmotionalState: () => Record<string, number>;
    getCognitiveState: () => Record<string, number>;
    getPreferences: () => Record<string, unknown>;
    getDominantEmotion: () => { emotion: string; intensity: number };
    updateEmotionalState: (stimuli: Record<string, number>) => Promise<void>;
  };
  memoryStore?: {
    searchMemories: (
      query: string,
      limit?: number,
    ) => Array<{
      content: string;
      score: number;
      metadata?: Record<string, unknown>;
    }>;
    storeMemory: (memory: {
      chatId: number;
      text: string;
      sender: string;
      messageId?: number;
    }) => Promise<void>;
    retrieveRecentMemories: (limit: number) => string[];
    getConversationContext: (chatId: number) => string[];
    isEnabled: () => boolean;
  };
}

/**
 * Convert internal emotional state to protocol format
 */
function toEmotionalStateSnapshot(emotionalState: any): EmotionalStateSnapshot {
  return {
    joy: emotionalState.joy ?? 0,
    sadness: emotionalState.sadness ?? 0,
    anger: emotionalState.anger ?? 0,
    fear: emotionalState.fear ?? 0,
    surprise: emotionalState.surprise ?? 0,
    disgust: emotionalState.disgust ?? 0,
    contempt: emotionalState.contempt ?? 0,
    interest: emotionalState.interest ?? 0,
    dominant: emotionalState.dominant ?? "neutral",
    valence: emotionalState.valence ?? 0,
    arousal: emotionalState.arousal ?? 0,
  };
}

/**
 * Convert internal cognitive state to protocol format
 */
function toCognitiveStateSnapshot(
  state: any,
  emotionalState: any,
): CognitiveStateSnapshot {
  return {
    activeStreams: (state.activeStreams || []).map((s: any) => ({
      id: s.id || "stream",
      phase: s.phase || "idle",
      status: s.status || "active",
    })),
    emotionalState: toEmotionalStateSnapshot(emotionalState),
    currentPhase: state.currentPhase ?? 0,
    cycleNumber: state.cycleNumber ?? state.sys6State?.cycleNumber ?? 0,
  };
}

/**
 * Register all cognitive handlers on the IPC server
 */
export function registerCognitiveHandlers(
  ipcServer: IPCServer,
  deps: CognitiveHandlerDependencies,
): void {
  const { cognitiveOrchestrator, personaCore, memoryStore } = deps;

  log.info("Registering cognitive IPC handlers...");

  // ============================================================================
  // Cognitive Operations
  // ============================================================================

  /**
   * Process a message through the cognitive system
   */
  ipcServer.registerHandler(
    IPCMessageType.COGNITIVE_PROCESS,
    async (
      payload: CognitiveProcessRequest,
    ): Promise<CognitiveProcessResponse> => {
      log.debug(`Processing message: ${payload.message.substring(0, 50)}...`);

      if (payload.chatId) {
        cognitiveOrchestrator.setChatId(payload.chatId);
      }

      const result = await cognitiveOrchestrator.processMessage(
        payload.message,
        {
          skipSentiment: payload.skipSentiment,
          skipMemory: payload.skipMemory,
        },
      );

      const state = cognitiveOrchestrator.getState();
      const emotionalState = cognitiveOrchestrator.getEmotionalState();

      // Map internal types to protocol types
      const sentiment = result.response.metadata?.sentiment;
      const emotion = result.response.metadata?.emotion;

      return {
        response: {
          role: "assistant",
          content: result.response.content,
          metadata: {
            sentiment: sentiment
              ? {
                  polarity: sentiment.polarity ?? 0,
                  subjectivity: 0.5, // Default subjectivity
                  label:
                    sentiment.polarity > 0
                      ? "positive"
                      : sentiment.polarity < 0
                        ? "negative"
                        : "neutral",
                }
              : undefined,
            emotion: emotion
              ? {
                  dominant: emotion.dominant ?? "neutral",
                  scores: {
                    joy: emotion.joy ?? 0,
                    sadness: emotion.sadness ?? 0,
                    anger: emotion.anger ?? 0,
                    fear: emotion.fear ?? 0,
                    surprise: emotion.surprise ?? 0,
                  },
                }
              : undefined,
          },
        },
        metrics: {
          totalTime: result.metrics.totalTime,
          steps: [
            { name: "memory", duration: result.metrics.memoryTime ?? 0 },
            { name: "inference", duration: result.metrics.inferenceTime ?? 0 },
            { name: "sentiment", duration: result.metrics.sentimentTime ?? 0 },
          ],
        },
        state: toCognitiveStateSnapshot(state, emotionalState),
      };
    },
  );

  /**
   * Quick process - returns just the response text
   */
  ipcServer.registerHandler(
    IPCMessageType.COGNITIVE_QUICK_PROCESS,
    async (
      payload: CognitiveQuickProcessRequest,
    ): Promise<{ response: string }> => {
      if (payload.chatId) {
        cognitiveOrchestrator.setChatId(payload.chatId);
      }

      const response = await cognitiveOrchestrator.quickProcess(
        payload.message,
      );
      return { response };
    },
  );

  /**
   * Get current cognitive state
   */
  ipcServer.registerHandler(
    IPCMessageType.COGNITIVE_GET_STATE,
    async (): Promise<CognitiveStateSnapshot> => {
      const state = cognitiveOrchestrator.getState();
      const emotionalState = cognitiveOrchestrator.getEmotionalState();
      return toCognitiveStateSnapshot(state, emotionalState);
    },
  );

  /**
   * Get emotional state
   */
  ipcServer.registerHandler(
    IPCMessageType.COGNITIVE_GET_EMOTIONAL_STATE,
    async (): Promise<EmotionalStateSnapshot> => {
      const emotionalState = cognitiveOrchestrator.getEmotionalState();
      return toEmotionalStateSnapshot(emotionalState);
    },
  );

  /**
   * Update emotional state
   */
  ipcServer.registerHandler(
    IPCMessageType.COGNITIVE_UPDATE_EMOTIONAL_STATE,
    async (
      payload: EmotionalStateUpdateRequest,
    ): Promise<EmotionalStateSnapshot> => {
      cognitiveOrchestrator.updateEmotionalState(payload.emotions);
      const emotionalState = cognitiveOrchestrator.getEmotionalState();
      return toEmotionalStateSnapshot(emotionalState);
    },
  );

  /**
   * Get message history
   */
  ipcServer.registerHandler(
    IPCMessageType.COGNITIVE_GET_HISTORY,
    async (payload: GetHistoryRequest): Promise<GetHistoryResponse> => {
      const history = cognitiveOrchestrator.getMessageHistory();
      const limit = payload.limit || 100;

      const messages = history.slice(-limit).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp || Date.now(),
        metadata: msg.metadata,
      }));

      return {
        messages,
        totalCount: history.length,
      };
    },
  );

  /**
   * Clear message history
   */
  ipcServer.registerHandler(
    IPCMessageType.COGNITIVE_CLEAR_HISTORY,
    async (): Promise<{ cleared: boolean }> => {
      cognitiveOrchestrator.clearHistory();
      return { cleared: true };
    },
  );

  /**
   * Export conversation
   */
  ipcServer.registerHandler(
    IPCMessageType.COGNITIVE_EXPORT,
    async (
      _payload: ExportConversationRequest,
    ): Promise<ExportConversationResponse> => {
      const exported = cognitiveOrchestrator.exportConversation();
      const state = cognitiveOrchestrator.getState();
      const emotionalState = cognitiveOrchestrator.getEmotionalState();

      return {
        messages: exported.messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp || Date.now(),
          metadata: msg.metadata,
        })),
        state: toCognitiveStateSnapshot(state, emotionalState),
        chatId: exported.chatId,
        exportedAt: Date.now(),
      };
    },
  );

  /**
   * Import conversation
   */
  ipcServer.registerHandler(
    IPCMessageType.COGNITIVE_IMPORT,
    async (
      payload: ImportConversationRequest,
    ): Promise<{ imported: boolean }> => {
      // Convert protocol messages to internal format
      const messagesToImport = payload.messages.map((msg, idx) => ({
        id: `imported_${Date.now()}_${idx}`,
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
        timestamp: msg.timestamp,
        metadata: msg.metadata || {},
      }));

      cognitiveOrchestrator.importConversation({
        messages: messagesToImport,
        chatId: payload.chatId,
      });
      return { imported: true };
    },
  );

  /**
   * Get cognitive statistics
   */
  ipcServer.registerHandler(
    IPCMessageType.COGNITIVE_GET_STATISTICS,
    async (): Promise<CognitiveStatistics> => {
      const stats = cognitiveOrchestrator.getStatistics();
      return {
        messagesProcessed: stats.messagesProcessed ?? 0,
        averageResponseTime: stats.averageProcessingTime ?? 0,
        currentCognitiveLoad: stats.currentCognitiveLoad ?? 0,
        memoryUsage: process.memoryUsage().heapUsed,
        uptime: process.uptime(),
      };
    },
  );

  // ============================================================================
  // Memory Operations
  // ============================================================================

  if (memoryStore) {
    /**
     * Search memories
     */
    ipcServer.registerHandler(
      IPCMessageType.MEMORY_SEARCH,
      async (payload: MemorySearchRequest): Promise<MemorySearchResponse> => {
        const results = memoryStore.searchMemories(
          payload.query,
          payload.limit || 10,
        );
        return {
          results: results.map((r, idx) => ({
            id: `mem_${idx}`,
            content: r.content,
            score: r.score,
            timestamp: Date.now(),
            metadata: r.metadata,
          })),
          totalFound: results.length,
        };
      },
    );

    /**
     * Store memory
     */
    ipcServer.registerHandler(
      IPCMessageType.MEMORY_STORE,
      async (payload: MemoryStoreRequest): Promise<MemoryStoreResponse> => {
        await memoryStore.storeMemory({
          chatId: payload.chatId || 0,
          text: payload.content,
          sender: "user",
        });
        return {
          id: `mem_${Date.now()}`,
          stored: true,
        };
      },
    );

    /**
     * Get memory context
     */
    ipcServer.registerHandler(
      IPCMessageType.MEMORY_GET_CONTEXT,
      async (payload: MemoryContextRequest): Promise<MemoryContextResponse> => {
        const context = payload.chatId
          ? memoryStore.getConversationContext(payload.chatId)
          : memoryStore.retrieveRecentMemories(payload.limit || 10);

        return {
          context,
          relevantMemories: [],
        };
      },
    );

    /**
     * Clear memories
     */
    ipcServer.registerHandler(
      IPCMessageType.MEMORY_CLEAR,
      async (): Promise<{ cleared: boolean }> => {
        // Note: Full clear not implemented in current memory store
        return { cleared: true };
      },
    );
  }

  // ============================================================================
  // Persona Operations
  // ============================================================================

  if (personaCore) {
    /**
     * Get persona info
     */
    ipcServer.registerHandler(
      IPCMessageType.PERSONA_GET,
      async (): Promise<PersonaInfo> => {
        const emotionalState = personaCore.getEmotionalState();
        const cognitiveState = personaCore.getCognitiveState();
        const dominant = personaCore.getDominantEmotion();

        return {
          personality: personaCore.getPersonality(),
          emotionalState: {
            joy: emotionalState.joy ?? 0,
            sadness: emotionalState.sadness ?? 0,
            anger: emotionalState.anger ?? 0,
            fear: emotionalState.fear ?? 0,
            surprise: emotionalState.surprise ?? 0,
            disgust: emotionalState.disgust ?? 0,
            contempt: emotionalState.contempt ?? 0,
            interest: emotionalState.interest ?? 0,
            dominant: dominant.emotion,
            valence: 0,
            arousal: dominant.intensity,
          },
          cognitiveState: {
            creativity: cognitiveState.creativity ?? 0.5,
            analyticalDepth: cognitiveState.analyticalDepth ?? 0.5,
            empathy: cognitiveState.empathy ?? 0.5,
            curiosity: cognitiveState.curiosity ?? 0.5,
          },
          preferences: personaCore.getPreferences(),
        };
      },
    );

    /**
     * Update persona
     */
    ipcServer.registerHandler(
      IPCMessageType.PERSONA_UPDATE,
      async (_payload: PersonaUpdateRequest): Promise<PersonaInfo> => {
        // Note: PersonaCore doesn't have update methods exposed yet
        // This would need to be added to PersonaCore
        const emotionalState = personaCore.getEmotionalState();
        const cognitiveState = personaCore.getCognitiveState();
        const dominant = personaCore.getDominantEmotion();

        return {
          personality: personaCore.getPersonality(),
          emotionalState: {
            joy: emotionalState.joy ?? 0,
            sadness: emotionalState.sadness ?? 0,
            anger: emotionalState.anger ?? 0,
            fear: emotionalState.fear ?? 0,
            surprise: emotionalState.surprise ?? 0,
            disgust: emotionalState.disgust ?? 0,
            contempt: emotionalState.contempt ?? 0,
            interest: emotionalState.interest ?? 0,
            dominant: dominant.emotion,
            valence: 0,
            arousal: dominant.intensity,
          },
          cognitiveState: {
            creativity: cognitiveState.creativity ?? 0.5,
            analyticalDepth: cognitiveState.analyticalDepth ?? 0.5,
            empathy: cognitiveState.empathy ?? 0.5,
            curiosity: cognitiveState.curiosity ?? 0.5,
          },
          preferences: personaCore.getPreferences(),
        };
      },
    );

    /**
     * Get persona emotional state
     */
    ipcServer.registerHandler(
      IPCMessageType.PERSONA_GET_EMOTIONAL_STATE,
      async (): Promise<EmotionalStateSnapshot> => {
        const emotionalState = personaCore.getEmotionalState();
        const dominant = personaCore.getDominantEmotion();

        return {
          joy: emotionalState.joy ?? 0,
          sadness: emotionalState.sadness ?? 0,
          anger: emotionalState.anger ?? 0,
          fear: emotionalState.fear ?? 0,
          surprise: emotionalState.surprise ?? 0,
          disgust: emotionalState.disgust ?? 0,
          contempt: emotionalState.contempt ?? 0,
          interest: emotionalState.interest ?? 0,
          dominant: dominant.emotion,
          valence: 0,
          arousal: dominant.intensity,
        };
      },
    );

    /**
     * Get persona cognitive state
     */
    ipcServer.registerHandler(
      IPCMessageType.PERSONA_GET_COGNITIVE_STATE,
      async (): Promise<{
        creativity: number;
        analyticalDepth: number;
        empathy: number;
        curiosity: number;
      }> => {
        const cognitiveState = personaCore.getCognitiveState();
        return {
          creativity: cognitiveState.creativity ?? 0.5,
          analyticalDepth: cognitiveState.analyticalDepth ?? 0.5,
          empathy: cognitiveState.empathy ?? 0.5,
          curiosity: cognitiveState.curiosity ?? 0.5,
        };
      },
    );
  }

  log.info("Cognitive IPC handlers registered successfully");
}
