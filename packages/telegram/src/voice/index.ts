/**
 * Voice Module Exports for Telegram
 */

export {
    TelegramVoiceHandler,
    createTelegramVoiceHandler,
    VoiceProcessingResult,
    VoiceSynthesisOptions,
    STTProvider,
    TTSProvider,
    TelegramVoiceConfig,
    TelegramVoiceEventType,
    TelegramVoiceEvent,
} from './voice-handler.js';

export {
    WhisperSTTProvider,
    ElevenLabsTTSProvider,
    StubSTTProvider,
    StubTTSProvider,
    createWhisperSTT,
    createElevenLabsTTS,
    createStubProviders,
    WhisperSTTConfig,
    ElevenLabsTTSConfig,
    DEFAULT_WHISPER_CONFIG,
    DEFAULT_ELEVENLABS_CONFIG,
} from './voice-integration.js';
