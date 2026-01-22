/**
 * Telegram Voice Handler for Deep Tree Echo
 *
 * Provides voice message transcription and synthesis
 * using @deltecho/voice integration.
 */

import { EventEmitter } from "events";
import type { Readable, PassThrough } from "stream";
import * as https from "https";
import * as http from "http";

/**
 * Voice processing result
 */
export interface VoiceProcessingResult {
  /** User ID who sent the voice message */
  userId: number;
  /** Chat ID where message was received */
  chatId: number;
  /** Message ID of the voice message */
  messageId: number;
  /** Transcribed text */
  text: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Duration in seconds */
  duration: number;
  /** Detected language */
  language?: string;
  /** Detected emotion from voice */
  emotion?: string;
}

/**
 * Voice synthesis options
 */
export interface VoiceSynthesisOptions {
  /** Voice name or ID */
  voice?: string;
  /** Language code (e.g., 'en-US') */
  language?: string;
  /** Speech rate (0.5 - 2.0) */
  rate?: number;
  /** Pitch adjustment */
  pitch?: number;
  /** Emotion to apply */
  emotion?: string;
  /** Output format */
  format?: "ogg" | "mp3" | "wav";
}

/**
 * Speech-to-Text provider interface
 */
export interface STTProvider {
  /**
   * Transcribe audio buffer to text
   */
  transcribe(
    buffer: Buffer,
    options?: { language?: string },
  ): Promise<{ text: string; confidence: number; language?: string }>;
}

/**
 * Text-to-Speech provider interface
 */
export interface TTSProvider {
  /**
   * Synthesize text to audio buffer
   */
  synthesize(text: string, options?: VoiceSynthesisOptions): Promise<Buffer>;
}

/**
 * Voice handler configuration
 */
export interface TelegramVoiceConfig {
  /** Telegram bot token for file downloads */
  botToken: string;
  /** STT provider */
  sttProvider?: STTProvider;
  /** TTS provider */
  ttsProvider?: TTSProvider;
  /** Default language */
  defaultLanguage?: string;
  /** Maximum voice message duration (seconds) */
  maxDuration?: number;
  /** Debug mode */
  debug?: boolean;
}

/**
 * Voice event types
 */
export enum TelegramVoiceEventType {
  TRANSCRIPTION_START = "voice:transcription_start",
  TRANSCRIPTION_COMPLETE = "voice:transcription_complete",
  TRANSCRIPTION_ERROR = "voice:transcription_error",
  SYNTHESIS_START = "voice:synthesis_start",
  SYNTHESIS_COMPLETE = "voice:synthesis_complete",
  SYNTHESIS_ERROR = "voice:synthesis_error",
}

/**
 * Voice event
 */
export interface TelegramVoiceEvent {
  type: TelegramVoiceEventType;
  chatId: number;
  messageId?: number;
  userId?: number;
  data?: unknown;
  error?: Error;
}

/**
 * Telegram Voice Handler
 */
export class TelegramVoiceHandler extends EventEmitter {
  private config: TelegramVoiceConfig;

  constructor(config: TelegramVoiceConfig) {
    super();
    this.config = {
      defaultLanguage: "en-US",
      maxDuration: 60,
      debug: false,
      ...config,
    };
  }

  /**
   * Set the STT provider
   */
  setSTTProvider(provider: STTProvider): void {
    this.config.sttProvider = provider;
  }

  /**
   * Set the TTS provider
   */
  setTTSProvider(provider: TTSProvider): void {
    this.config.ttsProvider = provider;
  }

  /**
   * Download voice file from Telegram
   */
  async downloadVoice(fileId: string): Promise<Buffer> {
    // Get file path from Telegram API
    const fileInfo = await this.getFileInfo(fileId);
    const filePath = fileInfo.file_path;

    if (!filePath) {
      throw new Error("Could not get file path from Telegram");
    }

    // Download file
    const url = `https://api.telegram.org/file/bot${this.config.botToken}/${filePath}`;
    return this.downloadFile(url);
  }

  /**
   * Process voice message and return transcription
   */
  async processVoiceMessage(
    fileId: string,
    chatId: number,
    messageId: number,
    userId: number,
    duration: number,
  ): Promise<VoiceProcessingResult> {
    this.log(`Processing voice message from user ${userId} in chat ${chatId}`);

    // Check duration limit
    if (duration > (this.config.maxDuration || 60)) {
      throw new Error(
        `Voice message too long (${duration}s). Maximum: ${this.config.maxDuration}s`,
      );
    }

    this.emitEvent({
      type: TelegramVoiceEventType.TRANSCRIPTION_START,
      chatId,
      messageId,
      userId,
    });

    try {
      // Download voice file
      const audioBuffer = await this.downloadVoice(fileId);
      this.log(`Downloaded ${audioBuffer.length} bytes of audio`);

      // Transcribe if STT provider is available
      if (this.config.sttProvider) {
        const result = await this.config.sttProvider.transcribe(audioBuffer, {
          language: this.config.defaultLanguage,
        });

        const processingResult: VoiceProcessingResult = {
          userId,
          chatId,
          messageId,
          text: result.text,
          confidence: result.confidence,
          duration,
          language: result.language,
        };

        this.emitEvent({
          type: TelegramVoiceEventType.TRANSCRIPTION_COMPLETE,
          chatId,
          messageId,
          userId,
          data: processingResult,
        });

        return processingResult;
      } else {
        // No STT provider - return placeholder
        const result: VoiceProcessingResult = {
          userId,
          chatId,
          messageId,
          text: "[Voice transcription not configured]",
          confidence: 0,
          duration,
        };

        this.emitEvent({
          type: TelegramVoiceEventType.TRANSCRIPTION_COMPLETE,
          chatId,
          messageId,
          userId,
          data: result,
        });

        return result;
      }
    } catch (error) {
      this.emitEvent({
        type: TelegramVoiceEventType.TRANSCRIPTION_ERROR,
        chatId,
        messageId,
        userId,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  }

  /**
   * Synthesize text to voice audio
   */
  async synthesizeVoice(
    text: string,
    options?: VoiceSynthesisOptions,
  ): Promise<Buffer> {
    this.log(`Synthesizing voice: "${text.substring(0, 50)}..."`);

    this.emitEvent({
      type: TelegramVoiceEventType.SYNTHESIS_START,
      chatId: 0,
      data: { text, options },
    });

    try {
      if (this.config.ttsProvider) {
        const audioBuffer = await this.config.ttsProvider.synthesize(text, {
          language: this.config.defaultLanguage,
          format: "ogg",
          ...options,
        });

        this.emitEvent({
          type: TelegramVoiceEventType.SYNTHESIS_COMPLETE,
          chatId: 0,
          data: { text, size: audioBuffer.length },
        });

        return audioBuffer;
      } else {
        throw new Error("TTS provider not configured");
      }
    } catch (error) {
      this.emitEvent({
        type: TelegramVoiceEventType.SYNTHESIS_ERROR,
        chatId: 0,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  }

  /**
   * Get file info from Telegram API
   */
  private async getFileInfo(fileId: string): Promise<{ file_path?: string }> {
    return new Promise((resolve, reject) => {
      const url = `https://api.telegram.org/bot${this.config.botToken}/getFile?file_id=${fileId}`;

      https
        .get(url, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              const json = JSON.parse(data);
              if (json.ok) {
                resolve(json.result);
              } else {
                reject(
                  new Error(json.description || "Failed to get file info"),
                );
              }
            } catch (e) {
              reject(e);
            }
          });
        })
        .on("error", reject);
    });
  }

  /**
   * Download file from URL
   */
  private async downloadFile(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith("https") ? https : http;

      protocol
        .get(url, (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => resolve(Buffer.concat(chunks)));
        })
        .on("error", reject);
    });
  }

  /**
   * Emit voice event
   */
  private emitEvent(event: TelegramVoiceEvent): void {
    this.emit("voice_event", event);
    this.emit(event.type, event);
  }

  /**
   * Log debug message
   */
  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[Telegram Voice] ${message}`);
    }
  }
}

/**
 * Create Telegram voice handler
 */
export function createTelegramVoiceHandler(
  config: TelegramVoiceConfig,
): TelegramVoiceHandler {
  return new TelegramVoiceHandler(config);
}
