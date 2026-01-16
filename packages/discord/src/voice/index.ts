/**
 * Voice Module Exports
 *
 * Provides voice channel integration for Discord
 */

export {
    DiscordVoiceHandler,
    createVoiceHandler,
    VoiceConnectionState,
    VoiceEventType,
    VoiceEvent,
    VoiceTranscription,
    AudioProcessor,
    TTSProvider,
} from './voice-handler.js';

export {
    VADAudioProcessor,
    VoiceTTSProvider,
    createVADProcessor,
    createTTSProvider,
    VADProcessorConfig,
    VoiceTTSConfig,
    AudioFormat,
    DISCORD_AUDIO_FORMAT,
    DEFAULT_VAD_CONFIG,
    DEFAULT_TTS_CONFIG,
} from './voice-integration.js';
