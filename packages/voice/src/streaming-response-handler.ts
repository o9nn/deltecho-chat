/**
 * Streaming Response Handler for Deep Tree Echo Avatar
 *
 * Bridges streaming LLM responses to the avatar lip-sync system,
 * enabling natural conversation flow where the avatar starts speaking
 * incrementally as tokens arrive from the LLM.
 *
 * Features:
 * - Connects to LLM streaming callbacks (compatible with Anthropic/OpenAI patterns)
 * - Manages streaming lip-sync controller lifecycle
 * - Provides TTS integration points for actual audio playback
 * - Handles WebSocket/EventSource-based streaming when available
 */

import { EventEmitter } from "events";
import {
  StreamingLipSyncController,
  StreamingLipSyncEvent,
  MouthShape,
  createStreamingLipSyncController,
  StreamingLipSyncConfig,
} from "./streaming-lip-sync";
import type { LipSyncData as _LipSyncData } from "./lip-sync";

/**
 * LLM stream chunk interface (compatible with Anthropic/OpenAI patterns)
 */
export interface LLMStreamChunk {
  content: string;
  isComplete: boolean;
  finishReason?: "stop" | "length" | "content_filter" | "error";
  delta?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

/**
 * TTS provider interface for actual audio playback
 */
export interface TTSProvider {
  /** Speak text with optional voice/emotion configuration */
  speak(text: string, options?: TTSSpeakOptions): Promise<void>;
  /** Check if TTS is currently speaking */
  isSpeaking(): boolean;
  /** Cancel current speech */
  cancel(): void;
  /** Get current audio level (for audio-driven lip-sync) */
  getAudioLevel?(): number;
}

/**
 * TTS speak options
 */
export interface TTSSpeakOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  emotion?: string;
}

/**
 * Avatar controller interface for receiving lip-sync updates
 */
export interface AvatarLipSyncReceiver {
  /** Update mouth shape for lip-sync */
  updateLipSync(mouthShape: MouthShape): void;
  /** Set speaking state */
  setSpeaking(speaking: boolean): void;
  /** Set processing/thinking state */
  setThinking(thinking: boolean): void;
  /** Set expression based on emotion */
  setExpression?(expression: string, intensity?: number): void;
}

/**
 * Streaming response handler event types
 */
export type StreamingHandlerEventType =
  | "stream_start"
  | "token_received"
  | "phrase_speaking"
  | "phrase_complete"
  | "mouth_update"
  | "audio_start"
  | "audio_end"
  | "stream_complete"
  | "error";

/**
 * Streaming response handler event
 */
export interface StreamingHandlerEvent {
  type: StreamingHandlerEventType;
  timestamp: number;
  data?: {
    token?: string;
    phrase?: string;
    mouthShape?: MouthShape;
    fullText?: string;
    error?: string;
    progress?: {
      tokensReceived: number;
      phrasesSpoken: number;
      totalDurationMs: number;
    };
  };
}

/**
 * Configuration for streaming response handler
 */
export interface StreamingHandlerConfig {
  /** Streaming lip-sync configuration */
  lipSyncConfig?: Partial<StreamingLipSyncConfig>;
  /** Enable TTS audio playback (default: false, uses visual-only lip-sync) */
  enableTTS: boolean;
  /** Queue phrases for TTS or play immediately as generated */
  queueTTSPhrases: boolean;
  /** Minimum confidence for TTS to speak (0-1) */
  ttsConfidenceThreshold: number;
  /** Enable emotion detection from text */
  enableEmotionDetection: boolean;
}

/**
 * Default handler configuration
 */
export const DEFAULT_HANDLER_CONFIG: StreamingHandlerConfig = {
  enableTTS: false,
  queueTTSPhrases: true,
  ttsConfidenceThreshold: 0.5,
  enableEmotionDetection: true,
};

/**
 * Simple emotion detection patterns
 */
const EMOTION_PATTERNS: Array<{
  pattern: RegExp;
  emotion: string;
  intensity: number;
}> = [
  {
    pattern: /\b(happy|glad|joy|wonderful|fantastic|amazing)\b/i,
    emotion: "happy",
    intensity: 0.8,
  },
  {
    pattern: /\b(sad|sorry|unfortunately|regret)\b/i,
    emotion: "sad",
    intensity: 0.6,
  },
  {
    pattern: /\b(excited|exciting|wow|incredible)\b/i,
    emotion: "excited",
    intensity: 0.9,
  },
  {
    pattern: /\b(worried|concern|careful|caution)\b/i,
    emotion: "concerned",
    intensity: 0.5,
  },
  {
    pattern: /\b(interesting|curious|fascinating)\b/i,
    emotion: "curious",
    intensity: 0.6,
  },
  { pattern: /\?$/, emotion: "questioning", intensity: 0.5 },
  { pattern: /!$/, emotion: "emphatic", intensity: 0.7 },
];

/**
 * Streaming Response Handler
 *
 * Manages the complete flow from LLM streaming output to avatar lip-sync animation.
 */
export class StreamingResponseHandler extends EventEmitter {
  private config: StreamingHandlerConfig;
  private lipSyncController: StreamingLipSyncController;
  private ttsProvider: TTSProvider | null = null;
  private avatarReceiver: AvatarLipSyncReceiver | null = null;

  // State tracking
  private isActive: boolean = false;
  private tokensReceived: number = 0;
  private streamStartTime: number = 0;

  // TTS phrase queue
  private ttsPhraseQueue: string[] = [];
  private isTTSSpeaking: boolean = false;

  constructor(config: Partial<StreamingHandlerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_HANDLER_CONFIG, ...config };
    this.lipSyncController = createStreamingLipSyncController(
      this.config.lipSyncConfig,
    );
    this.setupLipSyncListeners();
  }

  /**
   * Set up listeners for lip-sync controller events
   */
  private setupLipSyncListeners(): void {
    this.lipSyncController.onStreamingLipSyncEvent(
      (event: StreamingLipSyncEvent) => {
        switch (event.type) {
          case "mouth_update":
            if (event.data?.mouthShape) {
              this.handleMouthUpdate(event.data.mouthShape);
            }
            break;

          case "phrase_ready":
            if (event.data?.phrase) {
              this.handlePhraseReady(event.data.phrase);
            }
            break;

          case "speaking_start":
            this.avatarReceiver?.setSpeaking(true);
            this.emitEvent("phrase_speaking", { phrase: event.data?.phrase });
            break;

          case "speaking_end":
            this.emitEvent("phrase_complete", { phrase: event.data?.phrase });
            break;

          case "stream_complete":
            this.handleStreamComplete();
            break;
        }
      },
    );
  }

  /**
   * Connect a TTS provider for audio playback
   */
  setTTSProvider(provider: TTSProvider): void {
    this.ttsProvider = provider;
  }

  /**
   * Connect an avatar receiver for lip-sync updates
   */
  setAvatarReceiver(receiver: AvatarLipSyncReceiver): void {
    this.avatarReceiver = receiver;
  }

  /**
   * Start handling a new streaming response
   */
  startStream(): void {
    this.reset();
    this.isActive = true;
    this.streamStartTime = Date.now();
    this.lipSyncController.start();

    this.avatarReceiver?.setThinking(false);
    this.avatarReceiver?.setSpeaking(true);

    this.emitEvent("stream_start");
  }

  /**
   * Process an incoming LLM stream chunk
   * This is the main entry point for LLM streaming integration
   */
  handleChunk(chunk: LLMStreamChunk): void {
    if (!this.isActive) {
      return;
    }

    const content = chunk.delta || chunk.content;
    if (content) {
      this.tokensReceived++;
      this.emitEvent("token_received", { token: content });
    }

    // Forward to lip-sync controller
    this.lipSyncController.processChunk({
      content: content || "",
      isComplete: chunk.isComplete,
    });
  }

  /**
   * Create an onChunk callback for use with LLM streaming APIs
   * Returns a function compatible with AnthropicProvider.completeStream()
   */
  createChunkHandler(): (chunk: LLMStreamChunk) => void {
    return (chunk: LLMStreamChunk) => {
      this.handleChunk(chunk);
    };
  }

  /**
   * Handle mouth shape updates from lip-sync controller
   */
  private handleMouthUpdate(mouthShape: MouthShape): void {
    if (this.avatarReceiver) {
      this.avatarReceiver.updateLipSync(mouthShape);
    }

    this.emitEvent("mouth_update", { mouthShape });
  }

  /**
   * Handle a phrase becoming ready
   */
  private handlePhraseReady(phrase: string): void {
    // Detect emotion if enabled
    if (
      this.config.enableEmotionDetection &&
      this.avatarReceiver?.setExpression
    ) {
      const emotion = this.detectEmotion(phrase);
      if (emotion) {
        this.avatarReceiver.setExpression(emotion.emotion, emotion.intensity);
      }
    }

    // Queue for TTS if enabled
    if (this.config.enableTTS && this.ttsProvider) {
      if (this.config.queueTTSPhrases) {
        this.ttsPhraseQueue.push(phrase);
        this.processNextTTSPhrase();
      } else {
        // Speak immediately (may overlap)
        this.ttsProvider.speak(phrase);
      }
    }
  }

  /**
   * Process the next phrase in the TTS queue
   */
  private async processNextTTSPhrase(): Promise<void> {
    if (
      this.isTTSSpeaking ||
      !this.ttsProvider ||
      this.ttsPhraseQueue.length === 0
    ) {
      return;
    }

    const phrase = this.ttsPhraseQueue.shift()!;
    this.isTTSSpeaking = true;

    this.emitEvent("audio_start", { phrase });

    try {
      await this.ttsProvider.speak(phrase);
    } catch (error) {
      this.emitEvent("error", {
        error: error instanceof Error ? error.message : "TTS error",
      });
    } finally {
      this.isTTSSpeaking = false;
      this.emitEvent("audio_end", { phrase });

      // Process next phrase
      if (this.ttsPhraseQueue.length > 0) {
        setTimeout(() => this.processNextTTSPhrase(), 50);
      }
    }
  }

  /**
   * Handle stream completion
   */
  private handleStreamComplete(): void {
    const fullText = this.lipSyncController.getFullText();

    this.emitEvent("stream_complete", {
      fullText,
      progress: {
        tokensReceived: this.tokensReceived,
        phrasesSpoken: this.lipSyncController.getProgress().phrasesSpoken,
        totalDurationMs: Date.now() - this.streamStartTime,
      },
    });

    // Wait for all speech to complete before setting idle
    this.waitForSpeechComplete().then(() => {
      this.avatarReceiver?.setSpeaking(false);
      this.isActive = false;
    });
  }

  /**
   * Wait for all speech (visual + audio) to complete
   */
  private async waitForSpeechComplete(): Promise<void> {
    // Wait for visual lip-sync to complete
    while (!this.lipSyncController.isComplete()) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Wait for TTS queue to drain
    while (this.ttsPhraseQueue.length > 0 || this.isTTSSpeaking) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Detect emotion from text
   */
  private detectEmotion(
    text: string,
  ): { emotion: string; intensity: number } | null {
    for (const pattern of EMOTION_PATTERNS) {
      if (pattern.pattern.test(text)) {
        return { emotion: pattern.emotion, intensity: pattern.intensity };
      }
    }
    return null;
  }

  /**
   * Get the full accumulated text
   */
  getFullText(): string {
    return this.lipSyncController.getFullText();
  }

  /**
   * Get current progress
   */
  getProgress(): {
    isActive: boolean;
    tokensReceived: number;
    lipSyncProgress: ReturnType<StreamingLipSyncController["getProgress"]>;
    ttsPhrasesPending: number;
  } {
    return {
      isActive: this.isActive,
      tokensReceived: this.tokensReceived,
      lipSyncProgress: this.lipSyncController.getProgress(),
      ttsPhrasesPending: this.ttsPhraseQueue.length,
    };
  }

  /**
   * Check if currently active
   */
  isStreaming(): boolean {
    return this.isActive;
  }

  /**
   * Stop the current stream
   */
  stop(): void {
    this.lipSyncController.stop();
    this.ttsProvider?.cancel();
    this.ttsPhraseQueue = [];
    this.isTTSSpeaking = false;
    this.isActive = false;
    this.avatarReceiver?.setSpeaking(false);
  }

  /**
   * Pause streaming
   */
  pause(): void {
    this.lipSyncController.pause();
  }

  /**
   * Resume streaming
   */
  resume(): void {
    this.lipSyncController.resume();
  }

  /**
   * Reset state for a new stream
   */
  private reset(): void {
    this.isActive = false;
    this.tokensReceived = 0;
    this.streamStartTime = 0;
    this.ttsPhraseQueue = [];
    this.isTTSSpeaking = false;
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<StreamingHandlerConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.lipSyncConfig) {
      this.lipSyncController.setConfig(config.lipSyncConfig);
    }
  }

  /**
   * Add event listener
   */
  onStreamingEvent(listener: (event: StreamingHandlerEvent) => void): void {
    this.on("streaming_handler_event", listener);
  }

  /**
   * Remove event listener
   */
  offStreamingEvent(listener: (event: StreamingHandlerEvent) => void): void {
    this.off("streaming_handler_event", listener);
  }

  /**
   * Emit streaming handler event
   */
  private emitEvent(
    type: StreamingHandlerEventType,
    data?: StreamingHandlerEvent["data"],
  ): void {
    const event: StreamingHandlerEvent = {
      type,
      timestamp: Date.now(),
      data,
    };
    this.emit("streaming_handler_event", event);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stop();
    this.lipSyncController.dispose();
    this.removeAllListeners();
  }
}

/**
 * Factory function to create a StreamingResponseHandler
 */
export function createStreamingResponseHandler(
  config?: Partial<StreamingHandlerConfig>,
): StreamingResponseHandler {
  return new StreamingResponseHandler(config);
}

/**
 * Create a streaming response handler pre-configured for an avatar
 */
export function createAvatarStreamingHandler(
  avatarReceiver: AvatarLipSyncReceiver,
  ttsProvider?: TTSProvider,
  config?: Partial<StreamingHandlerConfig>,
): StreamingResponseHandler {
  const handler = createStreamingResponseHandler({
    ...config,
    enableTTS: !!ttsProvider,
  });

  handler.setAvatarReceiver(avatarReceiver);
  if (ttsProvider) {
    handler.setTTSProvider(ttsProvider);
  }

  return handler;
}
