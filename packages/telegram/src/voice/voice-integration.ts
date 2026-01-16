/**
 * Voice Integration with @deltecho/voice for Telegram
 *
 * Provides STT and TTS implementations using the voice package
 */

import type {
    STTProvider,
    TTSProvider,
    VoiceSynthesisOptions,
} from './voice-handler.js';

/**
 * Whisper-compatible STT configuration
 */
export interface WhisperSTTConfig {
    /** API endpoint for Whisper service */
    endpoint?: string;
    /** API key */
    apiKey?: string;
    /** Model name (e.g., 'whisper-1', 'large-v3') */
    model?: string;
    /** Response language */
    language?: string;
    /** Temperature for sampling */
    temperature?: number;
    /** Debug mode */
    debug?: boolean;
}

/**
 * Default Whisper configuration
 */
export const DEFAULT_WHISPER_CONFIG: WhisperSTTConfig = {
    endpoint: 'https://api.openai.com/v1/audio/transcriptions',
    model: 'whisper-1',
    language: 'en',
    temperature: 0,
    debug: false,
};

/**
 * Whisper-based STT provider
 *
 * Can use OpenAI Whisper API or compatible endpoints
 */
export class WhisperSTTProvider implements STTProvider {
    private config: WhisperSTTConfig;

    constructor(config: Partial<WhisperSTTConfig> = {}) {
        this.config = { ...DEFAULT_WHISPER_CONFIG, ...config };
    }

    async transcribe(
        buffer: Buffer,
        options?: { language?: string }
    ): Promise<{ text: string; confidence: number; language?: string }> {
        const language = options?.language || this.config.language || 'en';

        this.log(`Transcribing ${buffer.length} bytes, language: ${language}`);

        if (!this.config.apiKey) {
            throw new Error('Whisper API key not configured');
        }

        // Create form data for multipart upload
        const formData = new FormData();
        const blob = new Blob([buffer], { type: 'audio/ogg' });
        formData.append('file', blob, 'audio.ogg');
        formData.append('model', this.config.model || 'whisper-1');
        formData.append('language', language);
        formData.append('temperature', String(this.config.temperature || 0));

        try {
            const response = await fetch(this.config.endpoint!, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.config.apiKey}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Whisper API error: ${error}`);
            }

            const result = (await response.json()) as { text?: string; language?: string };

            return {
                text: result.text || '',
                confidence: 0.9, // Whisper doesn't return confidence
                language: result.language || language,
            };
        } catch (error) {
            this.log(`Transcription error: ${error}`);
            throw error;
        }
    }

    private log(message: string): void {
        if (this.config.debug) {
            console.log(`[Whisper STT] ${message}`);
        }
    }
}

/**
 * ElevenLabs TTS configuration
 */
export interface ElevenLabsTTSConfig {
    /** API key */
    apiKey?: string;
    /** Voice ID */
    voiceId?: string;
    /** Model ID */
    modelId?: string;
    /** Output format */
    outputFormat?: 'mp3_44100_128' | 'ogg_opus_16000' | 'pcm_16000';
    /** Stability (0-1) */
    stability?: number;
    /** Similarity boost (0-1) */
    similarityBoost?: number;
    /** Debug mode */
    debug?: boolean;
}

/**
 * Default ElevenLabs configuration
 */
export const DEFAULT_ELEVENLABS_CONFIG: ElevenLabsTTSConfig = {
    modelId: 'eleven_multilingual_v2',
    outputFormat: 'ogg_opus_16000',
    stability: 0.5,
    similarityBoost: 0.75,
    debug: false,
};

/**
 * ElevenLabs TTS provider
 */
export class ElevenLabsTTSProvider implements TTSProvider {
    private config: ElevenLabsTTSConfig;

    constructor(config: Partial<ElevenLabsTTSConfig> = {}) {
        this.config = { ...DEFAULT_ELEVENLABS_CONFIG, ...config };
    }

    async synthesize(
        text: string,
        options?: VoiceSynthesisOptions
    ): Promise<Buffer> {
        this.log(`Synthesizing: "${text.substring(0, 50)}..."`);

        if (!this.config.apiKey) {
            throw new Error('ElevenLabs API key not configured');
        }

        if (!this.config.voiceId) {
            throw new Error('ElevenLabs voice ID not configured');
        }

        // Apply emotion-based adjustments
        const voiceSettings = this.getEmotionSettings(options?.emotion);

        const url = `https://api.elevenlabs.io/v1/text-to-speech/${this.config.voiceId}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    Accept: 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': this.config.apiKey,
                },
                body: JSON.stringify({
                    text,
                    model_id: this.config.modelId,
                    voice_settings: voiceSettings,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`ElevenLabs API error: ${error}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        } catch (error) {
            this.log(`Synthesis error: ${error}`);
            throw error;
        }
    }

    /**
     * Get emotion-adjusted voice settings
     */
    private getEmotionSettings(emotion?: string): {
        stability: number;
        similarity_boost: number;
        style?: number;
    } {
        const baseSettings = {
            stability: this.config.stability || 0.5,
            similarity_boost: this.config.similarityBoost || 0.75,
        };

        if (!emotion) {
            return baseSettings;
        }

        // Adjust settings based on emotion
        const emotionAdjustments: Record<
            string,
            { stability: number; similarity_boost: number; style?: number }
        > = {
            joy: { stability: 0.4, similarity_boost: 0.8, style: 0.6 },
            happy: { stability: 0.4, similarity_boost: 0.8, style: 0.6 },
            sadness: { stability: 0.7, similarity_boost: 0.6, style: 0.3 },
            sad: { stability: 0.7, similarity_boost: 0.6, style: 0.3 },
            anger: { stability: 0.3, similarity_boost: 0.9, style: 0.8 },
            angry: { stability: 0.3, similarity_boost: 0.9, style: 0.8 },
            fear: { stability: 0.3, similarity_boost: 0.7, style: 0.5 },
            surprise: { stability: 0.35, similarity_boost: 0.8, style: 0.7 },
            neutral: baseSettings,
        };

        return emotionAdjustments[emotion] || baseSettings;
    }

    private log(message: string): void {
        if (this.config.debug) {
            console.log(`[ElevenLabs TTS] ${message}`);
        }
    }
}

/**
 * Stub STT provider for testing
 */
export class StubSTTProvider implements STTProvider {
    async transcribe(
        buffer: Buffer,
        options?: { language?: string }
    ): Promise<{ text: string; confidence: number; language?: string }> {
        // Simulate processing delay
        await new Promise((resolve) => setTimeout(resolve, 100));

        return {
            text: '[Transcription placeholder - configure STT provider]',
            confidence: 0,
            language: options?.language || 'en',
        };
    }
}

/**
 * Stub TTS provider for testing
 */
export class StubTTSProvider implements TTSProvider {
    async synthesize(
        _text: string,
        _options?: VoiceSynthesisOptions
    ): Promise<Buffer> {
        // Return empty audio buffer
        return Buffer.alloc(0);
    }
}

/**
 * Create Whisper STT provider
 */
export function createWhisperSTT(config?: Partial<WhisperSTTConfig>): WhisperSTTProvider {
    return new WhisperSTTProvider(config);
}

/**
 * Create ElevenLabs TTS provider
 */
export function createElevenLabsTTS(config?: Partial<ElevenLabsTTSConfig>): ElevenLabsTTSProvider {
    return new ElevenLabsTTSProvider(config);
}

/**
 * Create stub providers for testing
 */
export function createStubProviders(): { stt: STTProvider; tts: TTSProvider } {
    return {
        stt: new StubSTTProvider(),
        tts: new StubTTSProvider(),
    };
}
