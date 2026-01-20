/**
 * MultiModalProcessor: Unified Audio/Image Processing for Deep Tree Echo
 *
 * Provides AI-powered processing for multiple modalities:
 * - Speech-to-Text (STT) using Whisper or compatible APIs
 * - Image analysis using Claude's vision capabilities
 * - Text-to-Speech (TTS) synthesis
 *
 * This module resolves TODOs for voice and image processing across
 * Telegram, Discord, and other integrations.
 */

import { getLogger } from "../utils/logger.js";

const logger = getLogger("MultiModalProcessor");

/**
 * Configuration for the multi-modal processor
 */
export interface MultiModalConfig {
  // Anthropic for vision
  anthropicApiKey?: string;
  anthropicModel?: string;

  // OpenAI for Whisper STT and TTS
  openaiApiKey?: string;
  whisperModel?: string;
  ttsModel?: string;
  ttsVoice?: string;

  // Alternative STT providers
  sttProvider?: "openai-whisper" | "google-cloud" | "azure" | "local-whisper";
  sttEndpoint?: string;

  // Debug mode
  debug?: boolean;
}

/**
 * Result from speech-to-text processing
 */
export interface STTResult {
  text: string;
  language?: string;
  confidence?: number;
  segments?: {
    start: number;
    end: number;
    text: string;
  }[];
  durationMs: number;
}

/**
 * Result from image analysis
 */
export interface ImageAnalysisResult {
  description: string;
  detectedObjects?: string[];
  detectedText?: string[];
  sentiment?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Result from TTS synthesis
 */
export interface TTSResult {
  audioBuffer: Buffer;
  format: "mp3" | "opus" | "aac" | "flac" | "wav";
  durationMs: number;
}

/**
 * MultiModalProcessor class
 */
export class MultiModalProcessor {
  private static instance: MultiModalProcessor;
  private config: MultiModalConfig;

  private constructor(config: MultiModalConfig) {
    this.config = {
      anthropicModel: "claude-sonnet-4-20250514",
      whisperModel: "whisper-1",
      ttsModel: "tts-1",
      ttsVoice: "alloy",
      sttProvider: "openai-whisper",
      debug: false,
      ...config,
    };

    logger.info("MultiModalProcessor initialized");
  }

  public static getInstance(config?: MultiModalConfig): MultiModalProcessor {
    if (!MultiModalProcessor.instance) {
      MultiModalProcessor.instance = new MultiModalProcessor(config || {});
    }
    return MultiModalProcessor.instance;
  }

  /**
   * Configure the processor with API keys
   */
  public configure(config: Partial<MultiModalConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Process speech audio to text using Whisper API
   */
  public async speechToText(
    audioData: Buffer | ArrayBuffer,
    options?: {
      language?: string;
      prompt?: string;
      responseFormat?: "json" | "text" | "verbose_json";
    },
  ): Promise<STTResult> {
    const startTime = Date.now();

    if (!this.config.openaiApiKey) {
      throw new Error("OpenAI API key required for speech-to-text");
    }

    try {
      // Convert to Buffer if ArrayBuffer
      const buffer = Buffer.isBuffer(audioData)
        ? audioData
        : Buffer.from(audioData);

      // Create form data for Whisper API
      const formData = new FormData();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = new Blob([new Uint8Array(buffer) as any], { type: "audio/ogg" });
      formData.append("file", blob, "audio.ogg");
      formData.append("model", this.config.whisperModel || "whisper-1");

      if (options?.language) {
        formData.append("language", options.language);
      }
      if (options?.prompt) {
        formData.append("prompt", options.prompt);
      }
      formData.append(
        "response_format",
        options?.responseFormat || "verbose_json",
      );

      const response = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.openaiApiKey}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Whisper API error: ${response.status} - ${error}`);
      }

      const result = (await response.json()) as {
        text?: string;
        language?: string;
        confidence?: number;
        segments?: { start: number; end: number; text: string }[];
      };
      const durationMs = Date.now() - startTime;

      if (this.config.debug) {
        logger.debug(
          `STT completed in ${durationMs}ms: "${result.text?.substring(
            0,
            50,
          )}..."`,
        );
      }

      return {
        text: result.text || "",
        language: result.language,
        confidence: result.confidence,
        segments: result.segments?.map((seg) => ({
          start: seg.start * 1000,
          end: seg.end * 1000,
          text: seg.text,
        })),
        durationMs,
      };
    } catch (error) {
      logger.error("Speech-to-text failed:", error);
      throw error;
    }
  }

  /**
   * Analyze an image using Claude's vision capabilities
   */
  public async analyzeImage(
    imageData: Buffer | ArrayBuffer | string,
    options?: {
      prompt?: string;
      maxTokens?: number;
      mediaType?: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    },
  ): Promise<ImageAnalysisResult> {
    if (!this.config.anthropicApiKey) {
      throw new Error("Anthropic API key required for image analysis");
    }

    try {
      // Handle different input types
      let base64Data: string;
      let mediaType = options?.mediaType || "image/jpeg";

      if (typeof imageData === "string") {
        // Already base64 or URL
        if (imageData.startsWith("data:")) {
          // Data URL
          const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            mediaType = matches[1] as typeof mediaType;
            base64Data = matches[2];
          } else {
            throw new Error("Invalid data URL format");
          }
        } else if (imageData.startsWith("http")) {
          // Fetch URL and convert
          const response = await fetch(imageData);
          const buffer = await response.arrayBuffer();
          base64Data = Buffer.from(buffer).toString("base64");
        } else {
          // Assume base64
          base64Data = imageData;
        }
      } else {
        // Buffer or ArrayBuffer
        const buffer = Buffer.isBuffer(imageData)
          ? imageData
          : Buffer.from(imageData);
        base64Data = buffer.toString("base64");
      }

      const prompt =
        options?.prompt ||
        `Analyze this image and provide:
1. A detailed description of what you see
2. Any text detected in the image
3. Key objects or subjects
4. The overall mood or sentiment

Be concise but comprehensive.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.anthropicApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.config.anthropicModel,
          max_tokens: options?.maxTokens || 1024,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mediaType,
                    data: base64Data,
                  },
                },
                {
                  type: "text",
                  text: prompt,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${error}`);
      }

      const result = (await response.json()) as {
        content?: { type: string; text?: string }[];
      };
      const text =
        result.content?.[0]?.type === "text" ? result.content[0].text || "" : "";

      // Parse structured response
      const analysis = this.parseImageAnalysis(text);

      if (this.config.debug) {
        logger.debug(
          `Image analysis: ${analysis.description.substring(0, 100)}...`,
        );
      }

      return analysis;
    } catch (error) {
      logger.error("Image analysis failed:", error);
      throw error;
    }
  }

  /**
   * Parse the image analysis response into structured format
   */
  private parseImageAnalysis(text: string): ImageAnalysisResult {
    const result: ImageAnalysisResult = {
      description: text,
      detectedObjects: [],
      detectedText: [],
    };

    // Try to extract structured information
    const lines = text.split("\n");

    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      // Look for detected text
      if (lowerLine.includes("text:") || lowerLine.includes("text detected:")) {
        const textMatch = line.match(/text[^:]*:\s*(.+)/i);
        if (textMatch) {
          result.detectedText?.push(textMatch[1].trim());
        }
      }

      // Look for objects
      if (lowerLine.includes("object:") || lowerLine.includes("subject:")) {
        const objMatch = line.match(/(?:object|subject)[^:]*:\s*(.+)/i);
        if (objMatch) {
          result.detectedObjects?.push(objMatch[1].trim());
        }
      }

      // Look for sentiment/mood
      if (lowerLine.includes("mood:") || lowerLine.includes("sentiment:")) {
        const sentMatch = line.match(/(?:mood|sentiment)[^:]*:\s*(.+)/i);
        if (sentMatch) {
          result.sentiment = sentMatch[1].trim();
        }
      }
    }

    return result;
  }

  /**
   * Synthesize text to speech using OpenAI TTS
   */
  public async textToSpeech(
    text: string,
    options?: {
      voice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
      speed?: number;
      format?: "mp3" | "opus" | "aac" | "flac";
    },
  ): Promise<TTSResult> {
    if (!this.config.openaiApiKey) {
      throw new Error("OpenAI API key required for text-to-speech");
    }

    try {
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.config.ttsModel || "tts-1",
          input: text,
          voice: options?.voice || this.config.ttsVoice || "alloy",
          speed: options?.speed || 1.0,
          response_format: options?.format || "mp3",
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`TTS API error: ${response.status} - ${error}`);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());

      // Estimate duration (rough: ~150 words per minute, average 5 chars per word)
      const wordCount = text.split(/\s+/).length;
      const durationMs = (wordCount / 150) * 60 * 1000;

      if (this.config.debug) {
        logger.debug(
          `TTS generated ${audioBuffer.length} bytes for ${text.length} chars`,
        );
      }

      return {
        audioBuffer,
        format: options?.format || "mp3",
        durationMs,
      };
    } catch (error) {
      logger.error("Text-to-speech failed:", error);
      throw error;
    }
  }

  /**
   * Process a voice message: transcribe and optionally respond
   */
  public async processVoiceMessage(
    audioData: Buffer | ArrayBuffer,
    options?: {
      language?: string;
      respondWithVoice?: boolean;
      responseGenerator?: (text: string) => Promise<string>;
    },
  ): Promise<{
    transcription: STTResult;
    response?: string;
    responseAudio?: TTSResult;
  }> {
    // Transcribe the audio
    const transcription = await this.speechToText(audioData, {
      language: options?.language,
    });

    const result: {
      transcription: STTResult;
      response?: string;
      responseAudio?: TTSResult;
    } = { transcription };

    // Generate response if callback provided
    if (options?.responseGenerator && transcription.text) {
      result.response = await options.responseGenerator(transcription.text);

      // Convert response to speech if requested
      if (options.respondWithVoice && result.response) {
        result.responseAudio = await this.textToSpeech(result.response);
      }
    }

    return result;
  }

  /**
   * Process an image message: analyze and respond
   */
  public async processImageMessage(
    imageData: Buffer | ArrayBuffer | string,
    options?: {
      caption?: string;
      detailedAnalysis?: boolean;
      responseGenerator?: (analysis: ImageAnalysisResult) => Promise<string>;
    },
  ): Promise<{
    analysis: ImageAnalysisResult;
    response?: string;
  }> {
    const prompt = options?.detailedAnalysis
      ? `Provide a comprehensive analysis of this image including:
1. Detailed visual description
2. All visible text (OCR)
3. Objects, people, and their relationships
4. Colors, composition, and style
5. Emotional tone and mood
6. Context and possible meaning
${
  options.caption
    ? `\nThe user provided this caption: "${options.caption}"`
    : ""
}`
      : options?.caption
        ? `Analyze this image. The user says: "${options.caption}"`
        : undefined;

    const analysis = await this.analyzeImage(imageData, { prompt });

    const result: {
      analysis: ImageAnalysisResult;
      response?: string;
    } = { analysis };

    // Generate response if callback provided
    if (options?.responseGenerator) {
      result.response = await options.responseGenerator(analysis);
    }

    return result;
  }

  /**
   * Check if multi-modal processing is available
   */
  public getCapabilities(): {
    stt: boolean;
    tts: boolean;
    vision: boolean;
  } {
    return {
      stt: !!this.config.openaiApiKey,
      tts: !!this.config.openaiApiKey,
      vision: !!this.config.anthropicApiKey,
    };
  }
}

// Singleton export
export const multiModalProcessor = MultiModalProcessor.getInstance();
