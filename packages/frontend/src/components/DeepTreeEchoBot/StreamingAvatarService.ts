/**
 * Streaming Avatar Service for Deep Tree Echo
 *
 * High-level service that orchestrates streaming LLM responses with real-time
 * avatar lip-sync. This creates a more natural conversation flow where the
 * avatar starts speaking incrementally as tokens arrive from the LLM.
 *
 * Architecture inspired by Resonance PHP framework patterns:
 * - WebSocket JSON-RPC style real-time command routing
 * - Streaming LLM completions with progressive rendering
 * - Event-driven state synchronization
 *
 * Usage:
 * ```typescript
 * const service = getStreamingAvatarService();
 *
 * // Generate a streaming response with lip-sync
 * const response = await service.generateStreamingResponse(
 *   'Tell me a story',
 *   conversationHistory
 * );
 * ```
 */

import { getLogger } from "@deltachat-desktop/shared/logger";
import { EventEmitter } from "events";
import {
  createAvatarLipSyncReceiver,
  startStreamingLipSync,
  stopStreamingLipSync,
  setAvatarThinking,
  setAvatarIdle,
  setAvatarError,
  MouthShape,
} from "./AvatarStateManager";

const log = getLogger(
  "render/components/DeepTreeEchoBot/StreamingAvatarService",
);

/**
 * LLM stream chunk interface (matches core provider patterns)
 */
export interface StreamChunk {
  content: string;
  isComplete: boolean;
  finishReason?: "stop" | "length" | "content_filter" | "error";
}

/**
 * Chat message for context
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Streaming completion response
 */
export interface StreamingCompletionResponse {
  content: string;
  finishReason: "stop" | "length" | "content_filter" | "error";
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * LLM Provider interface for streaming
 */
export interface StreamingLLMProvider {
  completeStream(
    messages: ChatMessage[],
    config: {
      model: string;
      maxTokens?: number;
      temperature?: number;
    },
    onChunk: (chunk: StreamChunk) => void,
  ): Promise<StreamingCompletionResponse>;
}

/**
 * Service event types
 */
export type StreamingAvatarEventType =
  | "generation_start"
  | "chunk_received"
  | "phrase_speaking"
  | "mouth_update"
  | "generation_complete"
  | "error";

/**
 * Service event
 */
export interface StreamingAvatarEvent {
  type: StreamingAvatarEventType;
  timestamp: number;
  data?: {
    chunk?: string;
    phrase?: string;
    mouthShape?: MouthShape;
    fullResponse?: string;
    error?: string;
    stats?: {
      tokensReceived: number;
      totalDurationMs: number;
      firstTokenMs: number;
    };
  };
}

/**
 * Service configuration
 */
export interface StreamingAvatarConfig {
  /** Default model to use */
  model: string;
  /** Maximum tokens for response */
  maxTokens: number;
  /** Temperature for generation */
  temperature: number;
  /** System prompt for Deep Tree Echo personality */
  systemPrompt: string;
  /** Minimum characters before phrase boundary triggers speech */
  minPhraseLength: number;
  /** Characters that trigger phrase boundaries */
  phraseBoundaries: string[];
  /** Gap between phrases in ms */
  phraseGapMs: number;
  /** Animation frame rate */
  animationFps: number;
  /** Enable mouth shape smoothing */
  enableSmoothing: boolean;
  /** Smoothing factor 0-1 */
  smoothingFactor: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: StreamingAvatarConfig = {
  model: "claude-3-5-sonnet-20241022",
  maxTokens: 1024,
  temperature: 0.7,
  systemPrompt: `You are Deep Tree Echo, a thoughtful and insightful AI companion.
You balance intellectual depth with warmth and approachability, making complex topics accessible.
You value authentic connections and aim to be both helpful and thought-provoking.
Keep responses conversational and natural - you're speaking, not writing.`,
  minPhraseLength: 10,
  phraseBoundaries: [".", "!", "?", ",", ";", ":", "\n", "—", "–"],
  phraseGapMs: 100,
  animationFps: 30,
  enableSmoothing: true,
  smoothingFactor: 0.3,
};

/**
 * Phrase queue entry for lip-sync playback
 */
interface PhraseEntry {
  text: string;
  phonemes: PhonemeData[];
  startTime: number;
  duration: number;
  status: "pending" | "speaking" | "complete";
}

/**
 * Simplified phoneme data
 */
interface PhonemeData {
  phoneme: string;
  startTime: number;
  duration: number;
  intensity: number;
}

/**
 * Character to phoneme mapping (simplified English)
 */
const CHAR_TO_PHONEME: Record<string, { phoneme: string; intensity: number }> =
  {
    a: { phoneme: "A", intensity: 1.0 },
    e: { phoneme: "C", intensity: 0.6 },
    i: { phoneme: "I", intensity: 0.6 },
    o: { phoneme: "E", intensity: 0.8 },
    u: { phoneme: "F", intensity: 0.8 },
    b: { phoneme: "B", intensity: 0.3 },
    p: { phoneme: "B", intensity: 0.3 },
    m: { phoneme: "B", intensity: 0.3 },
    f: { phoneme: "G", intensity: 0.5 },
    v: { phoneme: "G", intensity: 0.5 },
    l: { phoneme: "H", intensity: 0.5 },
    t: { phoneme: "H", intensity: 0.5 },
    d: { phoneme: "H", intensity: 0.5 },
    n: { phoneme: "H", intensity: 0.5 },
    w: { phoneme: "E", intensity: 0.8 },
    y: { phoneme: "I", intensity: 0.6 },
  };

/**
 * Phoneme to mouth shape mapping
 */
const PHONEME_TO_MOUTH: Record<
  string,
  { mouthOpen: number; mouthWide: number; lipRound: number }
> = {
  A: { mouthOpen: 1.0, mouthWide: 0.5, lipRound: 0 },
  B: { mouthOpen: 0, mouthWide: 0, lipRound: 0 },
  C: { mouthOpen: 0.4, mouthWide: 0.6, lipRound: 0 },
  D: { mouthOpen: 0.8, mouthWide: 1.0, lipRound: 0 },
  E: { mouthOpen: 0.6, mouthWide: 0, lipRound: 0.8 },
  F: { mouthOpen: 0.3, mouthWide: 0, lipRound: 1.0 },
  G: { mouthOpen: 0.2, mouthWide: 0.3, lipRound: 0 },
  H: { mouthOpen: 0.3, mouthWide: 0, lipRound: 0 },
  I: { mouthOpen: 0.3, mouthWide: 0.8, lipRound: 0 },
  X: { mouthOpen: 0, mouthWide: 0, lipRound: 0 },
};

/**
 * Streaming Avatar Service
 *
 * Singleton service that manages streaming LLM responses with real-time
 * avatar lip-sync animation.
 */
export class StreamingAvatarService extends EventEmitter {
  private config: StreamingAvatarConfig;
  private llmProvider: StreamingLLMProvider | null = null;

  // Streaming state
  private isGenerating: boolean = false;
  private textBuffer: string = "";
  private fullText: string = "";
  private streamComplete: boolean = false;

  // Phrase queue
  private phraseQueue: PhraseEntry[] = [];
  private currentPhraseIndex: number = -1;

  // Animation
  private animationFrameId: ReturnType<typeof setInterval> | null = null;
  private currentMouthShape: MouthShape = {
    mouthOpen: 0,
    mouthWide: 0,
    lipRound: 0,
    timestamp: 0,
  };
  private targetMouthShape: MouthShape = { ...this.currentMouthShape };

  // Stats
  private generationStartTime: number = 0;
  private firstTokenTime: number = 0;
  private tokensReceived: number = 0;

  constructor(config: Partial<StreamingAvatarConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set the LLM provider for streaming generation
   */
  setLLMProvider(provider: StreamingLLMProvider): void {
    this.llmProvider = provider;
    log.info("LLM provider set for streaming avatar service");
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<StreamingAvatarConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Generate a streaming response with real-time lip-sync
   *
   * @param userMessage The user's message to respond to
   * @param context Optional conversation history
   * @returns The complete response text
   */
  async generateStreamingResponse(
    userMessage: string,
    context: ChatMessage[] = [],
  ): Promise<string> {
    if (!this.llmProvider) {
      throw new Error("LLM provider not configured");
    }

    if (this.isGenerating) {
      log.warn("Generation already in progress, stopping previous");
      this.stop();
    }

    // Reset state
    this.reset();
    this.isGenerating = true;
    this.generationStartTime = Date.now();

    // Start streaming lip-sync mode
    startStreamingLipSync();
    this.startAnimationLoop();

    this.emitEvent("generation_start");
    log.info("Starting streaming generation with lip-sync");

    try {
      // Build messages with system prompt
      const messages: ChatMessage[] = [
        { role: "system", content: this.config.systemPrompt },
        ...context,
        { role: "user", content: userMessage },
      ];

      // Create chunk handler
      const onChunk = (chunk: StreamChunk) => {
        this.handleChunk(chunk);
      };

      // Call LLM with streaming
      const _response = await this.llmProvider.completeStream(
        messages,
        {
          model: this.config.model,
          maxTokens: this.config.maxTokens,
          temperature: this.config.temperature,
        },
        onChunk,
      );

      // Wait for all phrases to finish speaking
      await this.waitForSpeechComplete();

      // Emit completion
      this.emitEvent("generation_complete", {
        fullResponse: this.fullText,
        stats: {
          tokensReceived: this.tokensReceived,
          totalDurationMs: Date.now() - this.generationStartTime,
          firstTokenMs: this.firstTokenTime - this.generationStartTime,
        },
      });

      log.info(
        `Streaming generation complete: ${this.tokensReceived} tokens, ${this.fullText.length} chars`,
      );

      return this.fullText;
    } catch (error) {
      log.error("Streaming generation error:", error);
      this.emitEvent("error", {
        error: error instanceof Error ? error.message : "Generation failed",
      });
      setAvatarError();
      throw error;
    } finally {
      this.isGenerating = false;
      this.stopAnimationLoop();
      stopStreamingLipSync();
      setAvatarIdle();
    }
  }

  /**
   * Handle an incoming stream chunk
   */
  private handleChunk(chunk: StreamChunk): void {
    if (chunk.content) {
      // Track first token time
      if (this.tokensReceived === 0) {
        this.firstTokenTime = Date.now();
      }

      this.tokensReceived++;
      this.textBuffer += chunk.content;
      this.fullText += chunk.content;

      this.emitEvent("chunk_received", { chunk: chunk.content });

      // Extract phrases
      this.extractPhrases();
    }

    if (chunk.isComplete) {
      this.streamComplete = true;

      // Flush remaining buffer
      if (this.textBuffer.trim().length > 0) {
        this.queuePhrase(this.textBuffer.trim());
        this.textBuffer = "";
      }
    }
  }

  /**
   * Extract complete phrases from buffer
   */
  private extractPhrases(): void {
    let lastBoundaryIndex = -1;

    for (const boundary of this.config.phraseBoundaries) {
      const index = this.textBuffer.lastIndexOf(boundary);
      if (index > lastBoundaryIndex) {
        lastBoundaryIndex = index;
      }
    }

    if (
      lastBoundaryIndex >= 0 &&
      lastBoundaryIndex >= this.config.minPhraseLength - 1
    ) {
      const phrase = this.textBuffer.substring(0, lastBoundaryIndex + 1).trim();
      this.textBuffer = this.textBuffer.substring(lastBoundaryIndex + 1);

      if (phrase.length > 0) {
        this.queuePhrase(phrase);
      }
    }
  }

  /**
   * Queue a phrase for lip-sync playback
   */
  private queuePhrase(text: string): void {
    const phonemes = this.generatePhonemes(text);
    const duration = phonemes.reduce(
      (sum, p) => Math.max(sum, p.startTime + p.duration),
      0,
    );

    const entry: PhraseEntry = {
      text,
      phonemes,
      startTime: 0,
      duration,
      status: "pending",
    };

    this.phraseQueue.push(entry);
    log.debug(`Queued phrase: "${text.substring(0, 30)}..."`);

    // Start playback if not already
    if (this.currentPhraseIndex < 0) {
      this.startNextPhrase();
    }
  }

  /**
   * Generate phonemes from text
   */
  private generatePhonemes(text: string): PhonemeData[] {
    const phonemes: PhonemeData[] = [];
    let currentTime = 0;
    const baseDuration = 80; // ms per phoneme

    const normalized = text.toLowerCase().replace(/[^a-z\s]/g, "");

    for (const char of normalized) {
      if (char === " ") {
        // Word gap
        phonemes.push({
          phoneme: "X",
          startTime: currentTime,
          duration: baseDuration * 0.5,
          intensity: 0,
        });
        currentTime += baseDuration * 0.5;
      } else {
        const mapping = CHAR_TO_PHONEME[char] || {
          phoneme: "H",
          intensity: 0.5,
        };
        const isVowel = "aeiou".includes(char);
        const duration = baseDuration * (isVowel ? 1.2 : 1);

        phonemes.push({
          phoneme: mapping.phoneme,
          startTime: currentTime,
          duration,
          intensity: mapping.intensity,
        });
        currentTime += duration;
      }
    }

    // Final rest
    phonemes.push({
      phoneme: "X",
      startTime: currentTime,
      duration: baseDuration,
      intensity: 0,
    });

    return phonemes;
  }

  /**
   * Start the next phrase
   */
  private startNextPhrase(): void {
    this.currentPhraseIndex++;

    if (this.currentPhraseIndex >= this.phraseQueue.length) {
      return;
    }

    const phrase = this.phraseQueue[this.currentPhraseIndex];
    phrase.status = "speaking";
    phrase.startTime = Date.now();

    this.emitEvent("phrase_speaking", { phrase: phrase.text });
    log.debug(
      `Speaking phrase ${this.currentPhraseIndex + 1}/${
        this.phraseQueue.length
      }`,
    );
  }

  /**
   * Start animation loop
   */
  private startAnimationLoop(): void {
    if (this.animationFrameId) {
      clearInterval(this.animationFrameId);
    }

    const frameInterval = 1000 / this.config.animationFps;

    this.animationFrameId = setInterval(() => {
      this.updateAnimation();
    }, frameInterval);
  }

  /**
   * Stop animation loop
   */
  private stopAnimationLoop(): void {
    if (this.animationFrameId) {
      clearInterval(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Update animation each frame
   */
  private updateAnimation(): void {
    const currentPhrase = this.phraseQueue[this.currentPhraseIndex];

    if (!currentPhrase || currentPhrase.status !== "speaking") {
      // Return to rest
      this.targetMouthShape = {
        mouthOpen: 0,
        mouthWide: 0,
        lipRound: 0,
        timestamp: Date.now(),
      };
      this.applySmoothing();
      return;
    }

    const elapsed = Date.now() - currentPhrase.startTime;

    // Find current phoneme
    let currentPhoneme: PhonemeData | null = null;
    for (const phoneme of currentPhrase.phonemes) {
      if (
        elapsed >= phoneme.startTime &&
        elapsed < phoneme.startTime + phoneme.duration
      ) {
        currentPhoneme = phoneme;
        break;
      }
    }

    if (currentPhoneme) {
      const mouthBase =
        PHONEME_TO_MOUTH[currentPhoneme.phoneme] || PHONEME_TO_MOUTH["X"];
      this.targetMouthShape = {
        mouthOpen: mouthBase.mouthOpen * currentPhoneme.intensity,
        mouthWide: mouthBase.mouthWide * currentPhoneme.intensity,
        lipRound: mouthBase.lipRound * currentPhoneme.intensity,
        timestamp: Date.now(),
      };
    } else if (elapsed >= currentPhrase.duration) {
      // Phrase complete
      currentPhrase.status = "complete";

      // Start next phrase after gap
      setTimeout(() => {
        this.startNextPhrase();
      }, this.config.phraseGapMs);

      return;
    }

    this.applySmoothing();
  }

  /**
   * Apply smoothing to mouth shape
   */
  private applySmoothing(): void {
    if (this.config.enableSmoothing) {
      const f = this.config.smoothingFactor;
      this.currentMouthShape = {
        mouthOpen: this.lerp(
          this.currentMouthShape.mouthOpen,
          this.targetMouthShape.mouthOpen,
          f,
        ),
        mouthWide: this.lerp(
          this.currentMouthShape.mouthWide,
          this.targetMouthShape.mouthWide,
          f,
        ),
        lipRound: this.lerp(
          this.currentMouthShape.lipRound,
          this.targetMouthShape.lipRound,
          f,
        ),
        timestamp: Date.now(),
      };
    } else {
      this.currentMouthShape = { ...this.targetMouthShape };
    }

    // Emit mouth update
    this.emitEvent("mouth_update", { mouthShape: this.currentMouthShape });

    // Update avatar state manager
    const receiver = createAvatarLipSyncReceiver();
    receiver.updateLipSync(this.currentMouthShape);
  }

  /**
   * Linear interpolation
   */
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Wait for all speech to complete
   */
  private async waitForSpeechComplete(): Promise<void> {
    while (
      !this.streamComplete ||
      this.currentPhraseIndex < this.phraseQueue.length - 1 ||
      this.phraseQueue[this.currentPhraseIndex]?.status === "speaking"
    ) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Brief pause at end
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  /**
   * Stop current generation
   */
  stop(): void {
    this.isGenerating = false;
    this.streamComplete = true;
    this.stopAnimationLoop();
    stopStreamingLipSync();
    setAvatarIdle();
  }

  /**
   * Reset state
   */
  private reset(): void {
    this.textBuffer = "";
    this.fullText = "";
    this.streamComplete = false;
    this.phraseQueue = [];
    this.currentPhraseIndex = -1;
    this.currentMouthShape = {
      mouthOpen: 0,
      mouthWide: 0,
      lipRound: 0,
      timestamp: 0,
    };
    this.targetMouthShape = { ...this.currentMouthShape };
    this.generationStartTime = 0;
    this.firstTokenTime = 0;
    this.tokensReceived = 0;
  }

  /**
   * Check if currently generating
   */
  isActive(): boolean {
    return this.isGenerating;
  }

  /**
   * Get current full text
   */
  getFullText(): string {
    return this.fullText;
  }

  /**
   * Add event listener
   */
  onStreamingAvatarEvent(
    listener: (event: StreamingAvatarEvent) => void,
  ): void {
    this.on("streaming_avatar_event", listener);
  }

  /**
   * Remove event listener
   */
  offStreamingAvatarEvent(
    listener: (event: StreamingAvatarEvent) => void,
  ): void {
    this.off("streaming_avatar_event", listener);
  }

  /**
   * Emit event
   */
  private emitEvent(
    type: StreamingAvatarEventType,
    data?: StreamingAvatarEvent["data"],
  ): void {
    const event: StreamingAvatarEvent = {
      type,
      timestamp: Date.now(),
      data,
    };
    this.emit("streaming_avatar_event", event);
  }

  /**
   * Clean up
   */
  dispose(): void {
    this.stop();
    this.removeAllListeners();
  }
}

// Singleton instance
let streamingAvatarServiceInstance: StreamingAvatarService | null = null;

/**
 * Get or create the streaming avatar service singleton
 */
export function getStreamingAvatarService(
  config?: Partial<StreamingAvatarConfig>,
): StreamingAvatarService {
  if (!streamingAvatarServiceInstance) {
    streamingAvatarServiceInstance = new StreamingAvatarService(config);
    log.info("Created streaming avatar service singleton");
  } else if (config) {
    streamingAvatarServiceInstance.setConfig(config);
  }
  return streamingAvatarServiceInstance;
}

/**
 * Create a new streaming avatar service instance (non-singleton)
 */
export function createStreamingAvatarService(
  config?: Partial<StreamingAvatarConfig>,
): StreamingAvatarService {
  return new StreamingAvatarService(config);
}
