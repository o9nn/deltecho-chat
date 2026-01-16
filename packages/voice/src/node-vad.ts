/**
 * Node.js Voice Activity Detection
 * Energy-based VAD for server-side audio processing (e.g. Discord/Telegram bots)
 */
import { EventEmitter } from 'events';
import { VADConfig, DEFAULT_VAD_CONFIG, VADState, VADEvent, VADEventType } from './vad';

export class NodeVoiceActivityDetector extends EventEmitter {
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

    /**
     * Start the VAD session
     */
    start(): void {
        this.state.isActive = true;
    }

    /**
     * Stop the VAD session
     */
    stop(): void {
        this.state.isActive = false;
        this.state.isSpeaking = false;
        this.state.speechStartTime = null;
        this.state.lastSpeechTime = 0;
    }

    /**
     * Process a chunk of audio data
     * Assumes 16-bit PCM (signed)
     */
    processAudioFrame(buffer: Buffer): void {
        if (!this.state.isActive) return;

        // Convert Buffer to Int16Array
        // Note: This creates a view or copy depending on alignment/offset
        // For standard NodeJS Buffers from streams, this usually works directly if byteOffset is aligned
        let samples: Int16Array;

        if (buffer.byteOffset % 2 === 0 && buffer.length % 2 === 0) {
            samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
        } else {
            // Unaligned, must copy
            samples = new Int16Array(buffer.length / 2);
            for (let i = 0; i < samples.length; i++) {
                samples[i] = buffer.readInt16LE(i * 2);
            }
        }

        // Calculate RMS
        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
            const normalized = samples[i] / 32768.0;
            sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / samples.length);

        this.state.audioLevel = rms;
        this.emitEvent('audio_level', { audioLevel: rms });

        const now = Date.now();
        const isSpeechDetected = rms > this.config.threshold;

        if (isSpeechDetected) {
            this.state.lastSpeechTime = now;
            if (!this.state.isSpeaking) {
                if (!this.state.speechStartTime) {
                    this.state.speechStartTime = now;
                }
                const speechDuration = now - this.state.speechStartTime;
                if (speechDuration >= this.config.minSpeechDuration) {
                    this.state.isSpeaking = true;
                    this.emitEvent('speech_start', {});
                }
            }
        } else {
            if (this.state.isSpeaking) {
                const silenceDuration = now - this.state.lastSpeechTime;
                if (silenceDuration >= this.config.minSilenceDuration) {
                    const totalDuration = now - (this.state.speechStartTime || now);
                    this.state.isSpeaking = false;
                    this.state.speechStartTime = null;
                    this.emitEvent('speech_end', { duration: totalDuration });
                }
            } else {
                this.state.speechStartTime = null;
            }
        }
    }

    getState(): VADState {
        return { ...this.state };
    }

    setConfig(config: Partial<VADConfig>): void {
        this.config = { ...this.config, ...config };
    }

    private emitEvent(type: VADEventType, data: Partial<VADEvent>): void {
        const event: VADEvent = {
            type,
            timestamp: Date.now(),
            ...data,
        };
        this.emit('vad_event', event);
    }
}
