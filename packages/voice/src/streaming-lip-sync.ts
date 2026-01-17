/**
 * Streaming Lip-Sync Controller for Deep Tree Echo Avatar
 *
 * Handles incremental text from streaming LLM responses and generates
 * lip-sync phonemes in real-time, enabling the avatar to start speaking
 * before the full response completes.
 *
 * Architecture inspired by Resonance PHP framework's streaming patterns:
 * - Progressive response rendering with lip-sync
 * - Token buffering for natural speech boundaries
 * - Real-time phoneme generation as text arrives
 */

import { EventEmitter } from 'events';
import {
    LipSyncGenerator,
    LipSyncData,
    PhonemeEntry,
    Phoneme,
    LipSyncConfig,
    phonemeToMouthShape,
    createLipSyncGenerator,
} from './lip-sync';

/**
 * Streaming chunk from LLM
 */
export interface StreamingTextChunk {
    content: string;
    isComplete: boolean;
    timestamp?: number;
}

/**
 * Streaming lip-sync event types
 */
export type StreamingLipSyncEventType =
    | 'chunk_received'      // New text chunk arrived
    | 'phrase_ready'        // A speakable phrase is ready
    | 'phoneme_generated'   // New phonemes generated
    | 'speaking_start'      // Started speaking a phrase
    | 'speaking_end'        // Finished speaking a phrase
    | 'mouth_update'        // Real-time mouth position update
    | 'stream_complete'     // Full response received
    | 'error';

/**
 * Mouth shape for avatar animation
 */
export interface MouthShape {
    mouthOpen: number;    // 0-1, vertical opening
    mouthWide: number;    // 0-1, horizontal width
    lipRound: number;     // 0-1, lip rounding (for O sounds)
    timestamp: number;
}

/**
 * Streaming lip-sync event
 */
export interface StreamingLipSyncEvent {
    type: StreamingLipSyncEventType;
    timestamp: number;
    data?: {
        chunk?: string;
        phrase?: string;
        phonemes?: PhonemeEntry[];
        lipSyncData?: LipSyncData;
        mouthShape?: MouthShape;
        totalText?: string;
        error?: string;
    };
}

/**
 * Configuration for streaming lip-sync
 */
export interface StreamingLipSyncConfig {
    /** Minimum characters before generating a phrase (default: 10) */
    minPhraseLength: number;
    /** Characters that trigger phrase boundaries */
    phraseBoundaries: string[];
    /** Buffer time between phrases in ms (default: 100) */
    phraseGapMs: number;
    /** Animation frame rate in fps (default: 30) */
    animationFps: number;
    /** Lip-sync generator config */
    lipSyncConfig?: Partial<LipSyncConfig>;
    /** Enable lookahead smoothing for mouth shapes (default: true) */
    enableSmoothing: boolean;
    /** Smoothing factor 0-1 (default: 0.3) */
    smoothingFactor: number;
}

/**
 * Default streaming lip-sync configuration
 */
export const DEFAULT_STREAMING_CONFIG: StreamingLipSyncConfig = {
    minPhraseLength: 10,
    phraseBoundaries: ['.', '!', '?', ',', ';', ':', '\n', '—', '–'],
    phraseGapMs: 100,
    animationFps: 30,
    enableSmoothing: true,
    smoothingFactor: 0.3,
};

/**
 * Phrase queue entry
 */
interface PhraseQueueEntry {
    text: string;
    lipSyncData: LipSyncData;
    startTime: number;
    status: 'pending' | 'speaking' | 'complete';
}

/**
 * Streaming Lip-Sync Controller
 *
 * Manages the conversion of streaming text to real-time lip-sync animation.
 * Buffers text into natural phrases and generates phoneme timing on-the-fly.
 */
export class StreamingLipSyncController extends EventEmitter {
    private config: StreamingLipSyncConfig;
    private lipSyncGenerator: LipSyncGenerator;

    // Text buffering
    private textBuffer: string = '';
    private fullText: string = '';
    private isStreamComplete: boolean = false;

    // Phrase queue for sequential playback
    private phraseQueue: PhraseQueueEntry[] = [];
    private currentPhraseIndex: number = -1;

    // Animation state
    private animationFrameId: ReturnType<typeof setInterval> | null = null;
    private currentMouthShape: MouthShape = {
        mouthOpen: 0,
        mouthWide: 0,
        lipRound: 0,
        timestamp: 0,
    };
    private targetMouthShape: MouthShape = { ...this.currentMouthShape };

    // Timing
    private streamStartTime: number = 0;
    private phrasePlaybackStartTime: number = 0;

    constructor(config: Partial<StreamingLipSyncConfig> = {}) {
        super();
        this.config = { ...DEFAULT_STREAMING_CONFIG, ...config };
        this.lipSyncGenerator = createLipSyncGenerator(this.config.lipSyncConfig);
    }

    /**
     * Start a new streaming session
     */
    start(): void {
        this.reset();
        this.streamStartTime = Date.now();
        this.startAnimationLoop();
    }

    /**
     * Process an incoming text chunk from the LLM stream
     */
    processChunk(chunk: StreamingTextChunk): void {
        if (!chunk.content && !chunk.isComplete) {
            return;
        }

        // Append to buffers
        this.textBuffer += chunk.content;
        this.fullText += chunk.content;

        this.emitEvent('chunk_received', { chunk: chunk.content, totalText: this.fullText });

        // Check for phrase boundaries
        this.extractPhrases();

        // Handle stream completion
        if (chunk.isComplete) {
            this.handleStreamComplete();
        }
    }

    /**
     * Extract complete phrases from the buffer
     */
    private extractPhrases(): void {
        let lastBoundaryIndex = -1;

        // Find the last phrase boundary in the buffer
        for (const boundary of this.config.phraseBoundaries) {
            const index = this.textBuffer.lastIndexOf(boundary);
            if (index > lastBoundaryIndex) {
                lastBoundaryIndex = index;
            }
        }

        // If we found a boundary and have enough text, extract the phrase
        if (lastBoundaryIndex >= 0 && lastBoundaryIndex >= this.config.minPhraseLength - 1) {
            const phrase = this.textBuffer.substring(0, lastBoundaryIndex + 1).trim();
            this.textBuffer = this.textBuffer.substring(lastBoundaryIndex + 1);

            if (phrase.length > 0) {
                this.queuePhrase(phrase);
            }
        }
    }

    /**
     * Handle stream completion - flush remaining buffer
     */
    private handleStreamComplete(): void {
        this.isStreamComplete = true;

        // Flush any remaining text in the buffer
        if (this.textBuffer.trim().length > 0) {
            this.queuePhrase(this.textBuffer.trim());
            this.textBuffer = '';
        }

        this.emitEvent('stream_complete', { totalText: this.fullText });
    }

    /**
     * Queue a phrase for lip-sync playback
     */
    private queuePhrase(text: string): void {
        // Generate lip-sync data for this phrase
        const lipSyncData = this.lipSyncGenerator.generateFromText(text);

        const entry: PhraseQueueEntry = {
            text,
            lipSyncData,
            startTime: 0,
            status: 'pending',
        };

        this.phraseQueue.push(entry);

        this.emitEvent('phrase_ready', {
            phrase: text,
            lipSyncData,
            phonemes: lipSyncData.phonemes,
        });

        // Start playback if not already playing
        if (this.currentPhraseIndex < 0) {
            this.startNextPhrase();
        }
    }

    /**
     * Start playing the next phrase in the queue
     */
    private startNextPhrase(): void {
        this.currentPhraseIndex++;

        if (this.currentPhraseIndex >= this.phraseQueue.length) {
            // No more phrases to play
            if (this.isStreamComplete) {
                this.finishPlayback();
            }
            return;
        }

        const phrase = this.phraseQueue[this.currentPhraseIndex];
        phrase.status = 'speaking';
        phrase.startTime = Date.now();
        this.phrasePlaybackStartTime = phrase.startTime;

        this.emitEvent('speaking_start', {
            phrase: phrase.text,
            lipSyncData: phrase.lipSyncData,
        });
    }

    /**
     * Start the animation loop for smooth mouth updates
     */
    private startAnimationLoop(): void {
        if (this.animationFrameId) {
            clearInterval(this.animationFrameId);
        }

        const frameInterval = 1000 / this.config.animationFps;

        this.animationFrameId = setInterval(() => {
            this.updateAnimation();
        }, frameInterval);
    }

    /**
     * Update animation state each frame
     */
    private updateAnimation(): void {
        const currentPhrase = this.phraseQueue[this.currentPhraseIndex];

        if (!currentPhrase || currentPhrase.status !== 'speaking') {
            // Smoothly return to rest position
            this.targetMouthShape = { mouthOpen: 0, mouthWide: 0, lipRound: 0, timestamp: Date.now() };
            this.applySmoothing();
            return;
        }

        const elapsed = Date.now() - this.phrasePlaybackStartTime;
        const phonemes = currentPhrase.lipSyncData.phonemes;

        // Find current phoneme based on elapsed time
        let currentPhoneme: PhonemeEntry | null = null;
        for (let i = 0; i < phonemes.length; i++) {
            const phoneme = phonemes[i];
            if (elapsed >= phoneme.startTime && elapsed < phoneme.startTime + phoneme.duration) {
                currentPhoneme = phoneme;
                break;
            }
        }

        if (currentPhoneme) {
            // Convert phoneme to mouth shape
            const shape = phonemeToMouthShape(currentPhoneme);
            this.targetMouthShape = {
                ...shape,
                timestamp: Date.now(),
            };
        } else if (elapsed >= currentPhrase.lipSyncData.duration) {
            // Phrase complete
            currentPhrase.status = 'complete';
            this.emitEvent('speaking_end', { phrase: currentPhrase.text });

            // Add gap before next phrase
            setTimeout(() => {
                this.startNextPhrase();
            }, this.config.phraseGapMs);

            return;
        }

        // Apply smoothing and emit mouth update
        this.applySmoothing();
    }

    /**
     * Apply smoothing to mouth shape transitions
     */
    private applySmoothing(): void {
        if (this.config.enableSmoothing) {
            const factor = this.config.smoothingFactor;
            this.currentMouthShape = {
                mouthOpen: this.lerp(this.currentMouthShape.mouthOpen, this.targetMouthShape.mouthOpen, factor),
                mouthWide: this.lerp(this.currentMouthShape.mouthWide, this.targetMouthShape.mouthWide, factor),
                lipRound: this.lerp(this.currentMouthShape.lipRound, this.targetMouthShape.lipRound, factor),
                timestamp: Date.now(),
            };
        } else {
            this.currentMouthShape = { ...this.targetMouthShape };
        }

        this.emitEvent('mouth_update', { mouthShape: this.currentMouthShape });
    }

    /**
     * Linear interpolation helper
     */
    private lerp(start: number, end: number, factor: number): number {
        return start + (end - start) * factor;
    }

    /**
     * Finish playback and cleanup
     */
    private finishPlayback(): void {
        // Smoothly return to rest
        this.targetMouthShape = { mouthOpen: 0, mouthWide: 0, lipRound: 0, timestamp: Date.now() };

        // Keep animation running briefly to smooth back to rest
        setTimeout(() => {
            if (this.animationFrameId) {
                clearInterval(this.animationFrameId);
                this.animationFrameId = null;
            }
        }, 200);
    }

    /**
     * Get current mouth shape for avatar animation
     */
    getCurrentMouthShape(): MouthShape {
        return { ...this.currentMouthShape };
    }

    /**
     * Get the full accumulated text
     */
    getFullText(): string {
        return this.fullText;
    }

    /**
     * Check if stream is complete
     */
    isComplete(): boolean {
        return this.isStreamComplete && this.currentPhraseIndex >= this.phraseQueue.length - 1;
    }

    /**
     * Check if currently speaking
     */
    isSpeaking(): boolean {
        const currentPhrase = this.phraseQueue[this.currentPhraseIndex];
        return currentPhrase?.status === 'speaking';
    }

    /**
     * Get progress information
     */
    getProgress(): {
        phrasesQueued: number;
        phrasesSpoken: number;
        currentPhrase: string | null;
        isComplete: boolean;
        totalDurationMs: number;
    } {
        const currentPhrase = this.phraseQueue[this.currentPhraseIndex];
        const spokenPhrases = this.phraseQueue.filter(p => p.status === 'complete').length;

        return {
            phrasesQueued: this.phraseQueue.length,
            phrasesSpoken: spokenPhrases,
            currentPhrase: currentPhrase?.text ?? null,
            isComplete: this.isComplete(),
            totalDurationMs: Date.now() - this.streamStartTime,
        };
    }

    /**
     * Pause playback
     */
    pause(): void {
        if (this.animationFrameId) {
            clearInterval(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Resume playback
     */
    resume(): void {
        if (!this.animationFrameId) {
            this.startAnimationLoop();
        }
    }

    /**
     * Stop and reset the controller
     */
    stop(): void {
        this.pause();
        this.reset();
    }

    /**
     * Reset all state
     */
    private reset(): void {
        this.textBuffer = '';
        this.fullText = '';
        this.isStreamComplete = false;
        this.phraseQueue = [];
        this.currentPhraseIndex = -1;
        this.currentMouthShape = { mouthOpen: 0, mouthWide: 0, lipRound: 0, timestamp: 0 };
        this.targetMouthShape = { ...this.currentMouthShape };
        this.streamStartTime = 0;
        this.phrasePlaybackStartTime = 0;
    }

    /**
     * Update configuration
     */
    setConfig(config: Partial<StreamingLipSyncConfig>): void {
        this.config = { ...this.config, ...config };
        if (config.lipSyncConfig) {
            this.lipSyncGenerator.setConfig(config.lipSyncConfig);
        }
    }

    /**
     * Add event listener
     */
    onStreamingLipSyncEvent(listener: (event: StreamingLipSyncEvent) => void): void {
        this.on('streaming_lipsync_event', listener);
    }

    /**
     * Remove event listener
     */
    offStreamingLipSyncEvent(listener: (event: StreamingLipSyncEvent) => void): void {
        this.off('streaming_lipsync_event', listener);
    }

    /**
     * Emit streaming lip-sync event
     */
    private emitEvent(
        type: StreamingLipSyncEventType,
        data?: StreamingLipSyncEvent['data']
    ): void {
        const event: StreamingLipSyncEvent = {
            type,
            timestamp: Date.now(),
            data,
        };
        this.emit('streaming_lipsync_event', event);
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        this.stop();
        this.removeAllListeners();
    }
}

/**
 * Factory function to create a StreamingLipSyncController
 */
export function createStreamingLipSyncController(
    config?: Partial<StreamingLipSyncConfig>
): StreamingLipSyncController {
    return new StreamingLipSyncController(config);
}
