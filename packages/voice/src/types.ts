/**
 * Voice Types for Deep Tree Echo Speech Services
 *
 * Defines types for speech synthesis, recognition, and emotion detection.
 */

/**
 * Voice configuration for speech synthesis
 */
export interface VoiceConfig {
  /** Voice name or language code */
  voice?: string;
  /** Speech rate (0.1 - 10, default 1) */
  rate: number;
  /** Pitch (0 - 2, default 1) */
  pitch: number;
  /** Volume (0 - 1, default 1) */
  volume: number;
  /** Language code (e.g., 'en-US') */
  lang: string;
}

/**
 * Default voice configuration
 */
export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  lang: "en-US",
};

/**
 * Emotion-based voice modulation
 * Maps emotions to voice parameter adjustments
 */
export interface EmotionVoiceModulation {
  /** Rate adjustment (-0.5 to 0.5) */
  rateAdjust: number;
  /** Pitch adjustment (-0.5 to 0.5) */
  pitchAdjust: number;
  /** Volume adjustment (-0.3 to 0.3) */
  volumeAdjust: number;
}

/**
 * Predefined emotion modulations
 */
export const EMOTION_MODULATIONS: Record<string, EmotionVoiceModulation> = {
  // Primary emotion names
  joy: { rateAdjust: 0.1, pitchAdjust: 0.15, volumeAdjust: 0.1 },
  sadness: { rateAdjust: -0.2, pitchAdjust: -0.1, volumeAdjust: -0.15 },
  anger: { rateAdjust: 0.15, pitchAdjust: 0.1, volumeAdjust: 0.2 },
  fear: { rateAdjust: 0.2, pitchAdjust: 0.2, volumeAdjust: -0.1 },
  surprise: { rateAdjust: 0.15, pitchAdjust: 0.25, volumeAdjust: 0.15 },
  interest: { rateAdjust: 0.05, pitchAdjust: 0.1, volumeAdjust: 0 },
  neutral: { rateAdjust: 0, pitchAdjust: 0, volumeAdjust: 0 },
  // Aliases for common naming conventions
  happy: { rateAdjust: 0.1, pitchAdjust: 0.15, volumeAdjust: 0.1 },
  sad: { rateAdjust: -0.2, pitchAdjust: -0.1, volumeAdjust: -0.15 },
  angry: { rateAdjust: 0.15, pitchAdjust: 0.1, volumeAdjust: 0.2 },
  fearful: { rateAdjust: 0.2, pitchAdjust: 0.2, volumeAdjust: -0.1 },
  surprised: { rateAdjust: 0.15, pitchAdjust: 0.25, volumeAdjust: 0.15 },
};

/**
 * Speech synthesis event types
 */
export type SynthesisEventType =
  | "start"
  | "end"
  | "pause"
  | "resume"
  | "boundary"
  | "error";

/**
 * Speech synthesis event
 */
export interface SynthesisEvent {
  type: SynthesisEventType;
  text?: string;
  charIndex?: number;
  elapsedTime?: number;
  error?: string;
}

/**
 * Listener for synthesis events
 */
export type SynthesisEventListener = (event: SynthesisEvent) => void;

/**
 * Speech recognition result
 */
export interface RecognitionResult {
  /** Transcribed text */
  transcript: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Whether this is a final result */
  isFinal: boolean;
}

/**
 * Speech recognition event types
 */
export type RecognitionEventType =
  | "start"
  | "end"
  | "result"
  | "error"
  | "no_speech";

/**
 * Speech recognition event
 */
export interface RecognitionEvent {
  type: RecognitionEventType;
  results?: RecognitionResult[];
  error?: string;
}

/**
 * Listener for recognition events
 */
export type RecognitionEventListener = (event: RecognitionEvent) => void;

/**
 * Recognition configuration
 */
export interface RecognitionConfig {
  /** Language for recognition */
  lang: string;
  /** Continuous listening mode */
  continuous: boolean;
  /** Return interim (non-final) results */
  interimResults: boolean;
  /** Maximum alternatives to return */
  maxAlternatives: number;
}

/**
 * Default recognition configuration
 */
export const DEFAULT_RECOGNITION_CONFIG: RecognitionConfig = {
  lang: "en-US",
  continuous: false,
  interimResults: true,
  maxAlternatives: 1,
};

/**
 * Detected emotion from voice input
 */
export interface VoiceEmotion {
  /** Primary detected emotion */
  emotion: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Detected arousal level (energy/calmness) */
  arousal: number;
  /** Detected valence (positive/negative) */
  valence: number;
}

/**
 * Voice service status
 */
export interface VoiceServiceStatus {
  /** Whether synthesis is available */
  synthesisAvailable: boolean;
  /** Whether recognition is available */
  recognitionAvailable: boolean;
  /** Currently speaking */
  isSpeaking: boolean;
  /** Currently listening */
  isListening: boolean;
  /** Available voices */
  availableVoices: string[];
}
