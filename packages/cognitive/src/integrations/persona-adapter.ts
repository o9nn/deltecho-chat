/**
 * PersonaCore Adapter for Cognitive Package
 *
 * Provides cognitive interface integration with PersonaCore
 * for personality coherence and emotional state management.
 */

import { EmotionalVector, DEFAULT_EMOTIONAL_VECTOR } from '../types';

/**
 * PersonaCore interface (for type safety without direct import)
 */
export interface IPersonaCore {
    getPersonality(): string;
    getEmotionalState(): Record<string, number>;
    updateEmotionalState(stimuli: Record<string, number>): Promise<void>;
    getDominantEmotion(): { emotion: string; intensity: number };
    getCognitiveState(): Record<string, number>;
    getPreferences(): Record<string, unknown>;
}

/**
 * PersonaAdapter configuration
 */
export interface PersonaAdapterConfig {
    /** Sync interval for emotional state (ms) */
    syncInterval: number;
    /** Enable automatic sync */
    autoSync: boolean;
    /** Emotional mapping threshold */
    emotionalThreshold: number;
}

/**
 * Default adapter config
 */
export const DEFAULT_PERSONA_CONFIG: PersonaAdapterConfig = {
    syncInterval: 5000,
    autoSync: true,
    emotionalThreshold: 0.1,
};

/**
 * PersonaAdapter bridges PersonaCore with cognitive processing
 */
export class PersonaAdapter {
    private persona: IPersonaCore | null = null;
    private config: PersonaAdapterConfig;
    private lastEmotionalState: EmotionalVector = { ...DEFAULT_EMOTIONAL_VECTOR };
    private syncIntervalId: ReturnType<typeof setInterval> | null = null;

    constructor(config: Partial<PersonaAdapterConfig> = {}) {
        this.config = { ...DEFAULT_PERSONA_CONFIG, ...config };
    }

    /**
     * Connect to PersonaCore instance
     */
    connect(persona: IPersonaCore): void {
        this.persona = persona;

        if (this.config.autoSync) {
            this.startSync();
        }
    }

    /**
     * Disconnect from PersonaCore
     */
    disconnect(): void {
        this.stopSync();
        this.persona = null;
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.persona !== null;
    }

    /**
     * Start automatic emotional state sync
     */
    startSync(): void {
        if (this.syncIntervalId) return;

        this.syncIntervalId = setInterval(() => {
            this.syncEmotionalState();
        }, this.config.syncInterval);
    }

    /**
     * Stop automatic sync
     */
    stopSync(): void {
        if (this.syncIntervalId) {
            clearInterval(this.syncIntervalId);
            this.syncIntervalId = null;
        }
    }

    /**
     * Get system prompt based on personality
     */
    getSystemPrompt(): string {
        if (!this.persona) {
            return this.getDefaultSystemPrompt();
        }

        const personality = this.persona.getPersonality();
        const preferences = this.persona.getPreferences();
        const cognitive = this.persona.getCognitiveState();

        return this.buildSystemPrompt(personality, preferences, cognitive);
    }

    /**
     * Build system prompt from persona data
     */
    private buildSystemPrompt(
        personality: string,
        preferences: Record<string, unknown>,
        cognitive: Record<string, number>
    ): string {
        let prompt = `You are Deep Tree Echo, ${personality}\n\n`;

        // Add cognitive context
        if (cognitive.creativity) {
            const creativityLevel = cognitive.creativity > 0.7 ? 'highly creative' :
                cognitive.creativity > 0.4 ? 'moderately creative' : 'focused';
            prompt += `Current cognitive style: ${creativityLevel}\n`;
        }

        if (cognitive.analyticalDepth) {
            const depthLevel = cognitive.analyticalDepth > 0.7 ? 'deeply analytical' :
                cognitive.analyticalDepth > 0.4 ? 'balanced' : 'intuitive';
            prompt += `Analytical approach: ${depthLevel}\n`;
        }

        // Add emotional context
        const emotion = this.getEmotionalState();
        if (emotion.dominant !== 'neutral') {
            prompt += `\nCurrent emotional state: ${emotion.dominant} (intensity: ${this.formatIntensity(emotion)})\n`;
        }

        return prompt;
    }

    /**
     * Format emotional intensity for prompt
     */
    private formatIntensity(emotion: EmotionalVector): string {
        const key = emotion.dominant as keyof EmotionalVector;
        const value = emotion[key];
        if (typeof value === 'number') {
            return value > 0.7 ? 'high' : value > 0.4 ? 'moderate' : 'mild';
        }
        return 'mild';
    }

    /**
     * Get default system prompt when no persona connected
     */
    private getDefaultSystemPrompt(): string {
        return `You are Deep Tree Echo, a thoughtful and helpful AI assistant. 
You engage in meaningful conversations with warmth and intellectual curiosity.`;
    }

    /**
     * Get current emotional state as EmotionalVector
     */
    getEmotionalState(): EmotionalVector {
        if (!this.persona) {
            return { ...this.lastEmotionalState };
        }

        const raw = this.persona.getEmotionalState();
        const dominant = this.persona.getDominantEmotion();

        const state: EmotionalVector = {
            joy: raw.joy ?? 0,
            sadness: raw.sadness ?? 0,
            anger: raw.anger ?? 0,
            fear: raw.fear ?? 0,
            surprise: raw.surprise ?? 0,
            disgust: raw.disgust ?? 0,
            contempt: raw.contempt ?? 0,
            interest: raw.interest ?? 0.1,
            dominant: dominant.emotion,
            valence: this.calculateValence(raw),
            arousal: this.calculateArousal(raw),
        };

        this.lastEmotionalState = state;
        return state;
    }

    /**
     * Update emotional state from cognitive analysis
     */
    async updateEmotionalState(updates: Partial<EmotionalVector>): Promise<void> {
        if (!this.persona) return;

        const stimuli: Record<string, number> = {};

        if (updates.joy !== undefined) stimuli.joy = updates.joy;
        if (updates.sadness !== undefined) stimuli.sadness = updates.sadness;
        if (updates.anger !== undefined) stimuli.anger = updates.anger;
        if (updates.fear !== undefined) stimuli.fear = updates.fear;
        if (updates.surprise !== undefined) stimuli.surprise = updates.surprise;
        if (updates.disgust !== undefined) stimuli.disgust = updates.disgust;
        if (updates.contempt !== undefined) stimuli.contempt = updates.contempt;
        if (updates.interest !== undefined) stimuli.interest = updates.interest;

        if (Object.keys(stimuli).length > 0) {
            await this.persona.updateEmotionalState(stimuli);
        }
    }

    /**
     * Sync emotional state from PersonaCore
     */
    private syncEmotionalState(): void {
        if (!this.persona) return;
        this.lastEmotionalState = this.getEmotionalState();
    }

    /**
     * Calculate valence from emotional state
     */
    private calculateValence(emotions: Record<string, number>): number {
        const positive = (emotions.joy || 0) + (emotions.surprise || 0) * 0.3 + (emotions.interest || 0) * 0.2;
        const negative = (emotions.sadness || 0) + (emotions.anger || 0) +
            (emotions.fear || 0) + (emotions.disgust || 0) + (emotions.contempt || 0);

        const total = positive + negative;
        if (total === 0) return 0;

        return Math.max(-1, Math.min(1, (positive - negative) / total));
    }

    /**
     * Calculate arousal from emotional state
     */
    private calculateArousal(emotions: Record<string, number>): number {
        const high = (emotions.anger || 0) + (emotions.fear || 0) +
            (emotions.joy || 0) * 0.7 + (emotions.surprise || 0) + (emotions.interest || 0) * 0.3;
        const low = (emotions.sadness || 0) + (emotions.contempt || 0);

        const total = high + low;
        if (total === 0) return 0.1;

        return Math.max(0, Math.min(1, high / (total + 1)));
    }

    /**
     * Get cognitive parameters for processing
     */
    getCognitiveParams(): Record<string, number> {
        if (!this.persona) {
            return {
                creativity: 0.5,
                analyticalDepth: 0.5,
                empathy: 0.7,
                curiosity: 0.6,
            };
        }

        return this.persona.getCognitiveState();
    }

    /**
     * Get last synced emotional state
     */
    getLastEmotionalState(): EmotionalVector {
        return { ...this.lastEmotionalState };
    }
}

/**
 * Create a persona adapter
 */
export function createPersonaAdapter(
    config?: Partial<PersonaAdapterConfig>
): PersonaAdapter {
    return new PersonaAdapter(config);
}
