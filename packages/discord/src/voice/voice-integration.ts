/**
 * Voice Integration for @deltecho/voice
 *
 * Bridges Discord voice with the @deltecho/voice package
 * for VAD, STT, and TTS functionality.
 */

import { Readable, PassThrough } from "stream";
import type {
  AudioProcessor,
  TTSProvider,
  VoiceTranscription,
} from "./voice-handler.js";

/**
 * VAD-based audio processor configuration
 */
export interface VADProcessorConfig {
  /** Language for speech recognition */
  language?: string;
  /** Minimum speech duration to process (ms) */
  minSpeechDuration?: number;
  /** Maximum speech duration (ms) */
  maxSpeechDuration?: number;
  /** Debug mode */
  debug?: boolean;
}

/**
 * Default VAD processor configuration
 */
export const DEFAULT_VAD_CONFIG: VADProcessorConfig = {
  language: "en-US",
  minSpeechDuration: 500,
  maxSpeechDuration: 30000,
  debug: false,
};

/**
 * Audio format info for Discord voice
 */
export interface AudioFormat {
  sampleRate: number;
  channels: number;
  bitDepth: number;
}

/**
 * Discord uses Opus-encoded audio at 48kHz stereo
 */
export const DISCORD_AUDIO_FORMAT: AudioFormat = {
  sampleRate: 48000,
  channels: 2,
  bitDepth: 16,
};

/**
 * VAD-based audio processor for Discord
 *
 * This integrates with @deltecho/voice's VAD and STT systems
 * to provide speech-to-text capabilities in voice channels.
 */
export class VADAudioProcessor implements AudioProcessor {
  private config: VADProcessorConfig;

  constructor(config: Partial<VADProcessorConfig> = {}) {
    this.config = { ...DEFAULT_VAD_CONFIG, ...config };
  }

  /**
   * Process audio buffer and return transcription
   *
   * Uses MultiModalProcessor from deep-tree-echo-core for STT via:
   * - OpenAI Whisper API (primary)
   * - Can be extended to support Google Cloud, Azure, local Whisper
   */
  async processAudio(
    buffer: Buffer,
    userId: string,
  ): Promise<VoiceTranscription | null> {
    // Calculate duration from buffer size
    // Discord audio: 48kHz, stereo, 16-bit = 192000 bytes/sec
    const bytesPerSecond =
      DISCORD_AUDIO_FORMAT.sampleRate *
      DISCORD_AUDIO_FORMAT.channels *
      (DISCORD_AUDIO_FORMAT.bitDepth / 8);
    const duration = (buffer.length / bytesPerSecond) * 1000;

    // Skip if too short
    if (duration < (this.config.minSpeechDuration || 500)) {
      this.log(`Audio too short (${duration}ms), skipping`);
      return null;
    }

    // Skip if too long
    if (duration > (this.config.maxSpeechDuration || 30000)) {
      this.log(`Audio too long (${duration}ms), truncating`);
    }

    this.log(`Processing ${duration}ms of audio from user ${userId}`);

    try {
      // Use MultiModalProcessor for STT
      const { multiModalProcessor } = await import(
        "deep-tree-echo-core/multimodal"
      );
      const capabilities = multiModalProcessor.getCapabilities();

      if (!capabilities.stt) {
        this.log("STT not available - OpenAI API key required");
        return null;
      }

      const result = await multiModalProcessor.speechToText(buffer, {
        language: this.config.language,
      });

      if (result.text) {
        this.log(`Transcribed: "${result.text.substring(0, 50)}..."`);
        return {
          text: result.text,
          confidence: result.confidence || 0.9,
          userId,
          timestamp: Date.now(),
          duration,
        };
      }

      return null;
    } catch (error) {
      // Fallback if multimodal module not available
      this.log(`STT error: ${error}`);
      return null;
    }
  }

  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[VAD Processor] ${message}`);
    }
  }
}

/**
 * TTS configuration for voice synthesis
 */
export interface VoiceTTSConfig {
  /** Voice name or ID */
  voice?: string;
  /** Speech rate (0.5 - 2.0) */
  rate?: number;
  /** Pitch adjustment (-20 to 20 semitones) */
  pitch?: number;
  /** API endpoint (for external TTS services) */
  endpoint?: string;
  /** API key (for external TTS services) */
  apiKey?: string;
  /** Debug mode */
  debug?: boolean;
}

/**
 * Default TTS configuration
 */
export const DEFAULT_TTS_CONFIG: VoiceTTSConfig = {
  rate: 1.0,
  pitch: 0,
  debug: false,
};

/**
 * TTS provider using @deltecho/voice integration
 *
 * Can be configured to use:
 * - Local Web Speech API (browser only)
 * - External TTS services (Azure, Google, ElevenLabs, etc.)
 * - Local TTS models (Piper, Coqui, etc.)
 */
export class VoiceTTSProvider implements TTSProvider {
  private config: VoiceTTSConfig;

  constructor(config: Partial<VoiceTTSConfig> = {}) {
    this.config = { ...DEFAULT_TTS_CONFIG, ...config };
  }

  /**
   * Synthesize text to audio stream
   *
   * Uses MultiModalProcessor from deep-tree-echo-core for TTS via:
   * - OpenAI TTS API (primary)
   * - Applies emotion-based voice modulation
   */
  async synthesize(text: string, emotion?: string): Promise<Readable> {
    this.log(
      `Synthesizing: "${text.substring(0, 50)}..." with emotion: ${
        emotion || "neutral"
      }`,
    );

    const stream = new PassThrough();

    try {
      // Use MultiModalProcessor for TTS
      const { multiModalProcessor } = await import(
        "deep-tree-echo-core/multimodal"
      );
      const capabilities = multiModalProcessor.getCapabilities();

      if (!capabilities.tts) {
        this.log("TTS not available - OpenAI API key required");
        stream.end();
        return stream;
      }

      // Get emotion-modulated voice parameters
      const voiceConfig = this.getModulatedVoice(emotion || "neutral");

      // Map rate to OpenAI speed (0.25-4.0)
      const speed = Math.max(0.25, Math.min(4.0, voiceConfig.rate || 1.0));

      // Select voice based on emotion (OpenAI voices)
      const emotionVoiceMap: Record<
        string,
        "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer"
      > = {
        joy: "nova",
        happy: "nova",
        sadness: "onyx",
        sad: "onyx",
        anger: "echo",
        angry: "echo",
        fear: "shimmer",
        fearful: "shimmer",
        surprise: "fable",
        surprised: "fable",
        neutral: "alloy",
      };

      const voice = emotionVoiceMap[emotion || "neutral"] || "alloy";

      const result = await multiModalProcessor.textToSpeech(text, {
        voice,
        speed,
        format: "opus",
      });

      // Write the audio buffer to the stream
      stream.write(result.audioBuffer);
      stream.end();

      this.log(`TTS generated ${result.audioBuffer.length} bytes`);
    } catch (error) {
      this.log(`TTS error: ${error}`);
      stream.end();
    }

    return stream;
  }

  /**
   * Get the emotion-modulated voice parameters
   */
  getModulatedVoice(emotion: string): VoiceTTSConfig {
    // Map emotions to voice parameter adjustments
    const emotionModulations: Record<string, Partial<VoiceTTSConfig>> = {
      joy: { rate: 1.1, pitch: 2 },
      happy: { rate: 1.1, pitch: 2 },
      sadness: { rate: 0.85, pitch: -3 },
      sad: { rate: 0.85, pitch: -3 },
      anger: { rate: 1.15, pitch: 1 },
      angry: { rate: 1.15, pitch: 1 },
      fear: { rate: 1.2, pitch: 4 },
      fearful: { rate: 1.2, pitch: 4 },
      surprise: { rate: 1.15, pitch: 5 },
      surprised: { rate: 1.15, pitch: 5 },
      neutral: { rate: 1.0, pitch: 0 },
    };

    const modulation =
      emotionModulations[emotion] || emotionModulations.neutral;

    return {
      ...this.config,
      ...modulation,
    };
  }

  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[Voice TTS] ${message}`);
    }
  }
}

/**
 * Create VAD audio processor
 */
export function createVADProcessor(
  config?: Partial<VADProcessorConfig>,
): VADAudioProcessor {
  return new VADAudioProcessor(config);
}

/**
 * Create voice TTS provider
 */
export function createTTSProvider(
  config?: Partial<VoiceTTSConfig>,
): VoiceTTSProvider {
  return new VoiceTTSProvider(config);
}
