/**
 * Real-Time Audio Pipeline for Deep Tree Echo
 *
 * Orchestrates the complete voice interaction flow:
 * VAD → Speech Recognition → LLM Processing → Speech Synthesis
 *
 * Reference: moeru-ai webai-realtime-voice-chat patterns
 */

import { EventEmitter } from 'events';
import {
    VoiceActivityDetector,
    VADEvent,
    createVAD,
    VADConfig,
} from './vad';
import {
    SpeechRecognitionService,
    RecognitionEvent,
    createSpeechRecognition,
} from './speech-recognition';
import {
    SpeechSynthesisService,
    SynthesisEvent,
    createSpeechSynthesis,
} from './speech-synthesis';
import {
    LipSyncGenerator,
    LipSyncData,
    createLipSyncGenerator,
} from './lip-sync';
import { RecognitionConfig, VoiceConfig } from './types';

/**
 * Audio pipeline configuration
 */
export interface AudioPipelineConfig {
    /** VAD configuration */
    vad?: Partial<VADConfig>;
    /** Speech recognition configuration */
    recognition?: Partial<RecognitionConfig>;
    /** Speech synthesis configuration */
    synthesis?: Partial<VoiceConfig>;
    /** Auto-start listening when idle */
    autoListen: boolean;
    /** Minimum time between speech end and response (ms) */
    responseDelay: number;
    /** Enable lip-sync generation */
    enableLipSync: boolean;
    /** Maximum listening timeout (ms) - stop if no speech after VAD starts */
    listeningTimeout: number;
}

/**
 * Default pipeline configuration
 */
export const DEFAULT_PIPELINE_CONFIG: AudioPipelineConfig = {
    autoListen: true,
    responseDelay: 300,
    enableLipSync: true,
    listeningTimeout: 10000,
};

/**
 * Pipeline states
 */
export type PipelineState =
    | 'idle'
    | 'listening'
    | 'processing'
    | 'speaking'
    | 'error';

/**
 * Pipeline event types
 */
export type PipelineEventType =
    | 'state_change'
    | 'listening_start'
    | 'listening_end'
    | 'speech_detected'
    | 'speech_ended'
    | 'transcript'
    | 'interim_transcript'
    | 'processing_start'
    | 'processing_end'
    | 'speaking_start'
    | 'speaking_end'
    | 'lip_sync'
    | 'error';

/**
 * Pipeline event data
 */
export interface PipelineEvent {
    type: PipelineEventType;
    timestamp: number;
    state: PipelineState;
    data?: {
        transcript?: string;
        isFinal?: boolean;
        confidence?: number;
        emotion?: string;
        lipSyncData?: LipSyncData;
        error?: string;
        audioLevel?: number;
    };
}

/**
 * Event listener type
 */
export type PipelineEventListener = (event: PipelineEvent) => void;

/**
 * LLM processor callback type
 * Takes transcript and returns response with optional emotion
 */
export type LLMProcessor = (
    transcript: string
) => Promise<{ response: string; emotion?: string }>;

/**
 * Real-Time Audio Pipeline
 *
 * Manages the complete voice interaction flow
 */
export class AudioPipeline extends EventEmitter {
    private config: AudioPipelineConfig;
    private currentState: PipelineState = 'idle';
    private vad: VoiceActivityDetector;
    private recognition: SpeechRecognitionService;
    private synthesis: SpeechSynthesisService;
    private lipSync: LipSyncGenerator;
    private llmProcessor: LLMProcessor | null = null;

    private currentTranscript: string = '';
    private listeningTimeoutId: ReturnType<typeof setTimeout> | null = null;
    private isProcessingResponse: boolean = false;

    constructor(config: Partial<AudioPipelineConfig> = {}) {
        super();
        this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };

        // Initialize components
        this.vad = createVAD(config.vad);
        this.recognition = createSpeechRecognition(config.recognition);
        this.synthesis = createSpeechSynthesis(config.synthesis);
        this.lipSync = createLipSyncGenerator();

        // Set up event handlers
        this.setupVADHandlers();
        this.setupRecognitionHandlers();
        this.setupSynthesisHandlers();
    }

    /**
     * Set up VAD event handlers
     */
    private setupVADHandlers(): void {
        this.vad.onVADEvent((event: VADEvent) => {
            switch (event.type) {
                case 'speech_start':
                    this.handleSpeechStart();
                    break;
                case 'speech_end':
                    this.handleSpeechEnd();
                    break;
                case 'audio_level':
                    this.emitEvent('speech_detected', {
                        audioLevel: event.audioLevel,
                    });
                    break;
                case 'error':
                    this.handleError(event.error || 'VAD error');
                    break;
            }
        });
    }

    /**
     * Set up speech recognition event handlers
     */
    private setupRecognitionHandlers(): void {
        this.recognition.onRecognitionEvent((event: RecognitionEvent) => {
            switch (event.type) {
                case 'result':
                    if (event.results && event.results.length > 0) {
                        const result = event.results[0];
                        if (result.isFinal) {
                            this.currentTranscript = result.transcript;
                            this.emitEvent('transcript', {
                                transcript: result.transcript,
                                isFinal: true,
                                confidence: result.confidence,
                            });
                        } else {
                            this.emitEvent('interim_transcript', {
                                transcript: result.transcript,
                                isFinal: false,
                                confidence: result.confidence,
                            });
                        }
                    }
                    break;
                case 'error':
                    this.handleError(event.error || 'Recognition error');
                    break;
                case 'end':
                    // Recognition ended, process if we have transcript
                    if (this.currentState === 'listening' && this.currentTranscript) {
                        this.processTranscript();
                    }
                    break;
            }
        });
    }

    /**
     * Set up speech synthesis event handlers
     */
    private setupSynthesisHandlers(): void {
        this.synthesis.onSynthesisEvent((event: SynthesisEvent) => {
            switch (event.type) {
                case 'start':
                    this.setState('speaking');
                    this.emitEvent('speaking_start');
                    break;
                case 'end':
                    this.setState('idle');
                    this.emitEvent('speaking_end');

                    // Auto-listen if configured
                    if (this.config.autoListen && !this.isProcessingResponse) {
                        this.startListening();
                    }
                    break;
                case 'error':
                    this.handleError(event.error || 'Synthesis error');
                    break;
                case 'boundary':
                    // Could emit word boundary events here
                    break;
            }
        });
    }

    /**
     * Handle speech start from VAD
     */
    private handleSpeechStart(): void {
        if (this.currentState !== 'idle' && this.currentState !== 'listening') {
            return;
        }

        this.emitEvent('speech_detected');

        // Clear any timeout
        if (this.listeningTimeoutId) {
            clearTimeout(this.listeningTimeoutId);
            this.listeningTimeoutId = null;
        }
    }

    /**
     * Handle speech end from VAD
     */
    private handleSpeechEnd(): void {
        if (this.currentState !== 'listening') return;

        this.emitEvent('speech_ended');

        // Wait for response delay then process
        setTimeout(() => {
            if (this.currentState === 'listening') {
                // Stop recognition and wait for final results
                this.recognition.stop();
            }
        }, this.config.responseDelay);
    }

    /**
     * Process the accumulated transcript with LLM
     */
    private async processTranscript(): Promise<void> {
        if (!this.currentTranscript.trim()) {
            this.setState('idle');
            if (this.config.autoListen) {
                this.startListening();
            }
            return;
        }

        this.setState('processing');
        this.emitEvent('processing_start');
        this.isProcessingResponse = true;

        try {
            if (this.llmProcessor) {
                const { response, emotion } = await this.llmProcessor(
                    this.currentTranscript
                );
                this.emitEvent('processing_end');

                // Generate lip-sync data if enabled
                if (this.config.enableLipSync) {
                    const lipSyncData = this.lipSync.generateFromText(response);
                    this.emitEvent('lip_sync', { lipSyncData });
                }

                // Speak the response
                this.speak(response, emotion);
            } else {
                // No LLM processor, just emit and go idle
                this.emitEvent('processing_end');
                this.setState('idle');

                if (this.config.autoListen) {
                    this.startListening();
                }
            }
        } catch (error) {
            this.handleError(
                error instanceof Error ? error.message : 'Processing error'
            );
        } finally {
            this.isProcessingResponse = false;
            this.currentTranscript = '';
        }
    }

    /**
     * Set the LLM processor callback
     */
    setLLMProcessor(processor: LLMProcessor): void {
        this.llmProcessor = processor;
    }

    /**
     * Start listening for speech
     */
    async startListening(): Promise<void> {
        if (this.currentState === 'speaking' || this.currentState === 'processing') {
            return;
        }

        try {
            this.currentTranscript = '';
            this.setState('listening');
            this.emitEvent('listening_start');

            // Start VAD
            await this.vad.start();

            // Start speech recognition
            this.recognition.start();

            // Set listening timeout
            if (this.config.listeningTimeout > 0) {
                this.listeningTimeoutId = setTimeout(() => {
                    if (this.currentState === 'listening') {
                        this.stopListening();
                    }
                }, this.config.listeningTimeout);
            }
        } catch (error) {
            this.handleError(
                error instanceof Error ? error.message : 'Failed to start listening'
            );
        }
    }

    /**
     * Stop listening
     */
    stopListening(): void {
        if (this.listeningTimeoutId) {
            clearTimeout(this.listeningTimeoutId);
            this.listeningTimeoutId = null;
        }

        this.vad.stop();
        this.recognition.stop();

        if (this.currentState === 'listening') {
            this.setState('idle');
            this.emitEvent('listening_end');
        }
    }

    /**
     * Speak text with optional emotion
     */
    speak(text: string, emotion?: string): void {
        // Stop any current listening
        this.stopListening();

        // Generate lip-sync data
        if (this.config.enableLipSync) {
            const lipSyncData = this.lipSync.generateFromText(text);
            this.emitEvent('lip_sync', { lipSyncData, emotion });
        }

        // Speak with emotion modulation
        this.synthesis.speak(text, emotion);
    }

    /**
     * Stop speaking
     */
    stopSpeaking(): void {
        this.synthesis.cancel();
        if (this.currentState === 'speaking') {
            this.setState('idle');
        }
    }

    /**
     * Get current pipeline state
     */
    getState(): PipelineState {
        return this.currentState;
    }

    /**
     * Check if VAD and recognition are available
     */
    isAvailable(): boolean {
        return this.vad.isAvailable?.() || true;
    }

    /**
     * Get current audio level
     */
    getAudioLevel(): number {
        const state = this.vad.getState();
        return state?.audioLevel ?? 0;
    }

    /**
     * Check if currently speaking
     */
    isSpeaking(): boolean {
        return this.currentState === 'speaking';
    }

    /**
     * Check if currently listening
     */
    isListening(): boolean {
        return this.currentState === 'listening';
    }

    /**
     * Handle errors
     */
    private handleError(error: string): void {
        this.setState('error');
        this.emitEvent('error', { error });

        // Reset to idle after error
        setTimeout(() => {
            this.setState('idle');
        }, 1000);
    }

    /**
     * Set pipeline state
     */
    private setState(state: PipelineState): void {
        if (this.currentState !== state) {
            this.currentState = state;
            this.emitEvent('state_change');
        }
    }

    /**
     * Add event listener
     */
    onPipelineEvent(listener: PipelineEventListener): void {
        this.on('pipeline_event', listener);
    }

    /**
     * Remove event listener
     */
    offPipelineEvent(listener: PipelineEventListener): void {
        this.off('pipeline_event', listener);
    }

    /**
     * Emit pipeline event
     */
    private emitEvent(
        type: PipelineEventType,
        data?: PipelineEvent['data']
    ): void {
        const event: PipelineEvent = {
            type,
            timestamp: Date.now(),
            state: this.currentState,
            data,
        };
        this.emit('pipeline_event', event);
    }

    /**
     * Clean up and release resources
     */
    dispose(): void {
        this.stopListening();
        this.stopSpeaking();
        this.removeAllListeners();
    }
}

/**
 * Factory function to create an AudioPipeline
 */
export function createAudioPipeline(
    config?: Partial<AudioPipelineConfig>
): AudioPipeline {
    return new AudioPipeline(config);
}
