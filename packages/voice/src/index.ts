/**
 * Voice Package for Deep Tree Echo
 *
 * Provides speech synthesis, recognition, voice activity detection,
 * and emotion detection using Web Speech API and audio analysis.
 */

// Types
export {
    VoiceConfig,
    DEFAULT_VOICE_CONFIG,
    EmotionVoiceModulation,
    EMOTION_MODULATIONS,
    SynthesisEventType,
    SynthesisEvent,
    SynthesisEventListener,
    RecognitionResult,
    RecognitionEventType,
    RecognitionEvent,
    RecognitionEventListener,
    RecognitionConfig,
    DEFAULT_RECOGNITION_CONFIG,
    VoiceEmotion,
    VoiceServiceStatus,
} from './types';

// Speech Synthesis
export {
    SpeechSynthesisService,
    createSpeechSynthesis,
} from './speech-synthesis';

// Speech Recognition
export {
    SpeechRecognitionService,
    createSpeechRecognition,
} from './speech-recognition';

// Emotion Detection
export {
    IEmotionDetector,
    StubEmotionDetector,
    AudioAnalyzer,
    createEmotionDetector,
} from './emotion-detector';

// Voice Activity Detection (VAD)
export {
    VoiceActivityDetector,
    StubVoiceActivityDetector,
    createVAD,
    VADConfig,
    DEFAULT_VAD_CONFIG,
    VADEventType,
    VADEvent,
    VADEventListener,
    VADState,
} from './vad';
export { NodeVoiceActivityDetector } from './node-vad';

// Lip-Sync Generation
export {
    LipSyncGenerator,
    createLipSyncGenerator,
    phonemeToMouthShape,
    Phoneme,
    PhonemeEntry,
    LipSyncData,
    LipSyncConfig,
    DEFAULT_LIPSYNC_CONFIG,
    LipSyncEventType,
    LipSyncEvent,
    LipSyncEventListener,
} from './lip-sync';

// Real-Time Audio Pipeline
export {
    AudioPipeline,
    createAudioPipeline,
    AudioPipelineConfig,
    DEFAULT_PIPELINE_CONFIG,
    PipelineState,
    PipelineEventType,
    PipelineEvent,
    PipelineEventListener,
    LLMProcessor,
} from './audio-pipeline';

// Streaming Lip-Sync (for real-time LLM response visualization)
export {
    StreamingLipSyncController,
    createStreamingLipSyncController,
    StreamingLipSyncConfig,
    DEFAULT_STREAMING_CONFIG,
    StreamingLipSyncEventType,
    StreamingLipSyncEvent,
    StreamingTextChunk,
    MouthShape,
} from './streaming-lip-sync';

// Streaming Response Handler (bridges LLM streaming to avatar)
export {
    StreamingResponseHandler,
    createStreamingResponseHandler,
    createAvatarStreamingHandler,
    StreamingHandlerConfig,
    DEFAULT_HANDLER_CONFIG,
    StreamingHandlerEventType,
    StreamingHandlerEvent,
    LLMStreamChunk,
    TTSProvider,
    TTSSpeakOptions,
    AvatarLipSyncReceiver,
} from './streaming-response-handler';
