/**
 * Voice Activity Detection (VAD) for Deep Tree Echo
 *
 * Detects when the user is speaking using audio analysis.
 * Reference: moeru-ai webai-realtime-voice-chat patterns
 */

import { EventEmitter } from 'events';

/**
 * VAD configuration options
 */
export interface VADConfig {
    /** Threshold for speech detection (0-1) */
    threshold: number;
    /** Minimum duration of speech to trigger detection (ms) */
    minSpeechDuration: number;
    /** Minimum duration of silence to end speech (ms) */
    minSilenceDuration: number;
    /** FFT size for frequency analysis */
    fftSize: number;
    /** Sample rate for audio processing */
    sampleRate: number;
}

/**
 * Default VAD configuration
 */
export const DEFAULT_VAD_CONFIG: VADConfig = {
    threshold: 0.015,
    minSpeechDuration: 200,
    minSilenceDuration: 500,
    fftSize: 2048,
    sampleRate: 44100,
};

/**
 * VAD event types
 */
export type VADEventType = 'speech_start' | 'speech_end' | 'audio_level' | 'error';

/**
 * VAD event data
 */
export interface VADEvent {
    type: VADEventType;
    timestamp: number;
    audioLevel?: number;
    duration?: number;
    error?: string;
}

/**
 * VAD event listener type
 */
export type VADEventListener = (event: VADEvent) => void;

/**
 * VAD state
 */
export interface VADState {
    isSpeaking: boolean;
    audioLevel: number;
    speechStartTime: number | null;
    lastSpeechTime: number;
    isActive: boolean;
}

/**
 * Voice Activity Detection service
 */
export class VoiceActivityDetector extends EventEmitter {
    private config: VADConfig;
    private state: VADState;
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private mediaStream: MediaStream | null = null;
    private processingIntervalId: ReturnType<typeof setInterval> | null = null;
    private frequencyData: Uint8Array<ArrayBuffer> | null = null;

    constructor(config: Partial<VADConfig> = {}) {
        super();
        this.config = { ...DEFAULT_VAD_CONFIG, ...config };
        this.state = {
            isSpeaking: false,
            audioLevel: 0,
            speechStartTime: null,
            lastSpeechTime: 0,
            isActive: false,
        };
    }

    /**
     * Check if Web Audio API is available
     */
    isAvailable(): boolean {
        if (typeof globalThis !== 'undefined' && typeof (globalThis as any).AudioContext !== 'undefined') {
            return true;
        }
        if (typeof window !== 'undefined' && typeof (window as any).webkitAudioContext !== 'undefined') {
            return true;
        }
        return false;
    }

    /**
     * Start voice activity detection
     */
    async start(): Promise<void> {
        if (!this.isAvailable()) {
            this.emitEvent('error', { error: 'Web Audio API not available' });
            return;
        }

        try {
            // Request microphone access
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            // Create audio context
            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            this.audioContext = new AudioContextClass({
                sampleRate: this.config.sampleRate,
            });

            // Create analyser node
            this.analyser = this.audioContext!.createAnalyser();
            this.analyser.fftSize = this.config.fftSize;
            this.analyser.smoothingTimeConstant = 0.8;

            // Connect media stream to analyser
            const source = this.audioContext!.createMediaStreamSource(this.mediaStream!);
            source.connect(this.analyser);

            // Initialize frequency data array
            this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;

            // Start processing loop
            this.startProcessing();

            this.state.isActive = true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to start VAD';
            this.emitEvent('error', { error: errorMessage });
        }
    }

    /**
     * Stop voice activity detection
     */
    stop(): void {
        this.stopProcessing();

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach((track) => track.stop());
            this.mediaStream = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        this.analyser = null;
        this.frequencyData = null;
        this.state.isActive = false;
        this.state.isSpeaking = false;
    }

    /**
     * Start audio processing loop
     */
    private startProcessing(): void {
        if (this.processingIntervalId) return;

        // Process every ~33ms (30fps)
        this.processingIntervalId = setInterval(() => {
            this.processAudio();
        }, 33);
    }

    /**
     * Stop audio processing loop
     */
    private stopProcessing(): void {
        if (this.processingIntervalId) {
            clearInterval(this.processingIntervalId);
            this.processingIntervalId = null;
        }
    }

    /**
     * Process audio frame
     */
    private processAudio(): void {
        if (!this.analyser || !this.frequencyData) return;

        // Get frequency data
        this.analyser.getByteFrequencyData(this.frequencyData);

        // Calculate RMS (root mean square) for audio level
        const audioLevel = this.calculateRMS(this.frequencyData);
        this.state.audioLevel = audioLevel;

        // Emit audio level event
        this.emitEvent('audio_level', { audioLevel });

        const now = Date.now();
        const isSpeechDetected = audioLevel > this.config.threshold;

        if (isSpeechDetected) {
            this.state.lastSpeechTime = now;

            if (!this.state.isSpeaking) {
                // Potential speech start
                if (!this.state.speechStartTime) {
                    this.state.speechStartTime = now;
                }

                // Check if speech duration meets minimum
                const speechDuration = now - this.state.speechStartTime;
                if (speechDuration >= this.config.minSpeechDuration) {
                    this.state.isSpeaking = true;
                    this.emitEvent('speech_start', {});
                }
            }
        } else {
            // Silence detected
            if (this.state.isSpeaking) {
                const silenceDuration = now - this.state.lastSpeechTime;
                if (silenceDuration >= this.config.minSilenceDuration) {
                    // Speech ended
                    const totalDuration = now - (this.state.speechStartTime || now);
                    this.state.isSpeaking = false;
                    this.state.speechStartTime = null;
                    this.emitEvent('speech_end', { duration: totalDuration });
                }
            } else {
                // Reset speech start time if we were not speaking
                this.state.speechStartTime = null;
            }
        }
    }

    /**
     * Calculate RMS (root mean square) from frequency data
     */
    private calculateRMS(frequencyData: Uint8Array<ArrayBuffer>): number {
        let sum = 0;
        for (let i = 0; i < frequencyData.length; i++) {
            const normalized = frequencyData[i] / 255;
            sum += normalized * normalized;
        }
        return Math.sqrt(sum / frequencyData.length);
    }

    /**
     * Get current VAD state
     */
    getState(): VADState {
        return { ...this.state };
    }

    /**
     * Get current audio level (0-1)
     */
    getAudioLevel(): number {
        return this.state.audioLevel;
    }

    /**
     * Check if currently speaking
     */
    isSpeaking(): boolean {
        return this.state.isSpeaking;
    }

    /**
     * Check if VAD is active
     */
    isActive(): boolean {
        return this.state.isActive;
    }

    /**
     * Update configuration
     */
    setConfig(config: Partial<VADConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current configuration
     */
    getConfig(): VADConfig {
        return { ...this.config };
    }

    /**
     * Add event listener
     */
    onVADEvent(listener: VADEventListener): void {
        this.on('vad_event', listener);
    }

    /**
     * Remove event listener
     */
    offVADEvent(listener: VADEventListener): void {
        this.off('vad_event', listener);
    }

    /**
     * Emit VAD event
     */
    private emitEvent(type: VADEventType, data: Partial<VADEvent>): void {
        const event: VADEvent = {
            type,
            timestamp: Date.now(),
            ...data,
        };
        this.emit('vad_event', event);
    }
}

/**
 * Factory function to create VAD instance
 */
export function createVAD(config?: Partial<VADConfig>): VoiceActivityDetector {
    return new VoiceActivityDetector(config);
}

/**
 * Stub VAD for testing/Node.js environment
 */
export class StubVoiceActivityDetector extends EventEmitter {
    private config: VADConfig;
    private state: VADState;

    constructor(config: Partial<VADConfig> = {}) {
        super();
        this.config = { ...DEFAULT_VAD_CONFIG, ...config };
        this.state = {
            isSpeaking: false,
            audioLevel: 0,
            speechStartTime: null,
            lastSpeechTime: 0,
            isActive: false,
        };
    }

    isAvailable(): boolean {
        return false;
    }

    async start(): Promise<void> {
        this.state.isActive = true;
    }

    stop(): void {
        this.state.isActive = false;
        this.state.isSpeaking = false;
    }

    // Manual controls for testing
    simulateSpeechStart(): void {
        this.state.isSpeaking = true;
        this.state.speechStartTime = Date.now();
        this.emit('vad_event', { type: 'speech_start', timestamp: Date.now() });
    }

    simulateSpeechEnd(): void {
        const duration = this.state.speechStartTime
            ? Date.now() - this.state.speechStartTime
            : 0;
        this.state.isSpeaking = false;
        this.state.speechStartTime = null;
        this.emit('vad_event', { type: 'speech_end', timestamp: Date.now(), duration });
    }

    simulateAudioLevel(level: number): void {
        this.state.audioLevel = level;
        this.emit('vad_event', { type: 'audio_level', timestamp: Date.now(), audioLevel: level });
    }

    getState(): VADState {
        return { ...this.state };
    }

    getAudioLevel(): number {
        return this.state.audioLevel;
    }

    isSpeaking(): boolean {
        return this.state.isSpeaking;
    }

    isActive(): boolean {
        return this.state.isActive;
    }

    setConfig(config: Partial<VADConfig>): void {
        this.config = { ...this.config, ...config };
    }

    getConfig(): VADConfig {
        return { ...this.config };
    }

    onVADEvent(listener: VADEventListener): void {
        this.on('vad_event', listener);
    }

    offVADEvent(listener: VADEventListener): void {
        this.off('vad_event', listener);
    }
}
