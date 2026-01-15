/**
 * Speech Synthesis Service for Deep Tree Echo
 *
 * Wraps the Web Speech API's SpeechSynthesis interface with
 * emotion-based voice modulation and event handling.
 */

import { EventEmitter } from 'events';
import {
    VoiceConfig,
    DEFAULT_VOICE_CONFIG,
    EmotionVoiceModulation,
    EMOTION_MODULATIONS,
    SynthesisEvent,
    SynthesisEventListener,
} from './types';

// Re-export types for convenience
export { SynthesisEvent, SynthesisEventListener, VoiceConfig };

/**
 * Check if running in browser with Web Speech API
 */
function isBrowser(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * SpeechSynthesisService provides text-to-speech with emotion modulation
 */
export class SpeechSynthesisService extends EventEmitter {
    private config: VoiceConfig;
    private synth: SpeechSynthesis | null = null;
    private currentUtterance: SpeechSynthesisUtterance | null = null;
    private isSpeakingInternal = false;
    private voiceCache: SpeechSynthesisVoice[] = [];

    constructor(config: Partial<VoiceConfig> = {}) {
        super();
        this.config = { ...DEFAULT_VOICE_CONFIG, ...config };

        if (isBrowser()) {
            this.synth = window.speechSynthesis;
            this.loadVoices();

            // Voices may load asynchronously
            if (this.synth.onvoiceschanged !== undefined) {
                this.synth.onvoiceschanged = () => this.loadVoices();
            }
        }
    }

    /**
     * Load available voices
     */
    private loadVoices(): void {
        if (this.synth) {
            this.voiceCache = this.synth.getVoices();
        }
    }

    /**
     * Get available voices
     */
    getAvailableVoices(): { name: string; lang: string }[] {
        return this.voiceCache.map((v) => ({ name: v.name, lang: v.lang }));
    }

    /**
     * Check if synthesis is available
     */
    isAvailable(): boolean {
        return this.synth !== null;
    }

    /**
     * Check if currently speaking
     */
    isSpeaking(): boolean {
        return this.isSpeakingInternal;
    }

    /**
     * Speak text with optional emotion modulation
     */
    speak(text: string, emotion?: string): void {
        if (!this.synth) {
            this.emitEvent({ type: 'error', error: 'Speech synthesis not available' });
            return;
        }

        // Cancel any current speech
        this.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Apply base configuration
        utterance.rate = this.config.rate;
        utterance.pitch = this.config.pitch;
        utterance.volume = this.config.volume;
        utterance.lang = this.config.lang;

        // Apply emotion modulation
        if (emotion) {
            this.applyEmotionModulation(utterance, emotion);
        }

        // Select voice if specified
        if (this.config.voice) {
            const voice = this.voiceCache.find(
                (v) =>
                    v.name === this.config.voice ||
                    v.lang.startsWith(this.config.voice!)
            );
            if (voice) {
                utterance.voice = voice;
            }
        }

        // Set up event handlers
        utterance.onstart = () => {
            this.isSpeakingInternal = true;
            this.emitEvent({ type: 'start', text });
        };

        utterance.onend = () => {
            this.isSpeakingInternal = false;
            this.currentUtterance = null;
            this.emitEvent({ type: 'end', text });
        };

        utterance.onerror = (event) => {
            this.isSpeakingInternal = false;
            this.currentUtterance = null;
            this.emitEvent({ type: 'error', error: event.error });
        };

        utterance.onpause = () => {
            this.emitEvent({ type: 'pause' });
        };

        utterance.onresume = () => {
            this.emitEvent({ type: 'resume' });
        };

        utterance.onboundary = (event) => {
            this.emitEvent({
                type: 'boundary',
                charIndex: event.charIndex,
                elapsedTime: event.elapsedTime,
            });
        };

        this.currentUtterance = utterance;
        this.synth.speak(utterance);
    }

    /**
     * Apply emotion-based modulation to utterance
     */
    private applyEmotionModulation(
        utterance: SpeechSynthesisUtterance,
        emotion: string
    ): void {
        const modulation: EmotionVoiceModulation =
            EMOTION_MODULATIONS[emotion] ?? EMOTION_MODULATIONS.neutral;

        // Apply adjustments while keeping within valid ranges
        utterance.rate = this.clamp(
            this.config.rate + modulation.rateAdjust,
            0.1,
            10
        );
        utterance.pitch = this.clamp(
            this.config.pitch + modulation.pitchAdjust,
            0,
            2
        );
        utterance.volume = this.clamp(
            this.config.volume + modulation.volumeAdjust,
            0,
            1
        );
    }

    /**
     * Clamp value to range
     */
    private clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Pause speaking
     */
    pause(): void {
        if (this.synth && this.isSpeakingInternal) {
            this.synth.pause();
        }
    }

    /**
     * Resume speaking
     */
    resume(): void {
        if (this.synth) {
            this.synth.resume();
        }
    }

    /**
     * Cancel current speech
     */
    cancel(): void {
        if (this.synth) {
            this.synth.cancel();
            this.isSpeakingInternal = false;
            this.currentUtterance = null;
        }
    }

    /**
     * Update voice configuration
     */
    setConfig(config: Partial<VoiceConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current configuration
     */
    getConfig(): VoiceConfig {
        return { ...this.config };
    }

    /**
     * Calculate modulated parameters for an emotion
     * Useful for UI display of voice adjustments
     */
    getModulatedParams(emotion: string): VoiceConfig {
        const modulation: EmotionVoiceModulation =
            EMOTION_MODULATIONS[emotion] ?? EMOTION_MODULATIONS.neutral;

        return {
            ...this.config,
            rate: this.clamp(this.config.rate + modulation.rateAdjust, 0.1, 10),
            pitch: this.clamp(this.config.pitch + modulation.pitchAdjust, 0, 2),
            volume: this.clamp(this.config.volume + modulation.volumeAdjust, 0, 1),
        };
    }

    /**
     * Add event listener
     */
    onSynthesisEvent(listener: SynthesisEventListener): void {
        this.on('synthesis_event', listener);
    }

    /**
     * Remove event listener
     */
    offSynthesisEvent(listener: SynthesisEventListener): void {
        this.off('synthesis_event', listener);
    }

    /**
     * Emit synthesis event
     */
    private emitEvent(event: SynthesisEvent): void {
        this.emit('synthesis_event', event);
    }
}

/**
 * Create a speech synthesis service with default configuration
 */
export function createSpeechSynthesis(
    config?: Partial<VoiceConfig>
): SpeechSynthesisService {
    return new SpeechSynthesisService(config);
}
