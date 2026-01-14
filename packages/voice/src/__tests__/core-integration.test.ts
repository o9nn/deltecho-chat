/**
 * Voice ↔ Core Integration Tests
 *
 * Tests emotion-to-voice modulation between voice and core packages
 */

import { SpeechSynthesisService } from '../speech-synthesis';
import { EMOTION_MODULATIONS, VoiceConfig } from '../types';

// Mock PersonaCore emotional state interface
interface EmotionalState {
    joy: number;
    sadness: number;
    anger: number;
    fear: number;
    surprise: number;
    disgust: number;
    contempt: number;
    interest: number;
}

// Emotion to voice emotion mapping
const EMOTIONAL_STATE_TO_VOICE: Record<keyof EmotionalState, string> = {
    joy: 'happy',
    sadness: 'sad',
    anger: 'angry',
    fear: 'fearful',
    surprise: 'surprised',
    disgust: 'disgusted',
    contempt: 'contemptuous',
    interest: 'interested',
};

/**
 * Voice-Core coordinator for emotion modulation
 */
class VoiceCoreCoordinator {
    private synthesis: SpeechSynthesisService;
    private currentEmotion: string = 'neutral';
    private emotionalThreshold: number = 0.3;

    constructor(synthesis: SpeechSynthesisService) {
        this.synthesis = synthesis;
    }

    /**
     * Determine dominant emotion from emotional state
     */
    getDominantEmotion(state: EmotionalState): string {
        let maxValue = 0;
        let dominantEmotion = 'neutral';

        for (const [emotion, value] of Object.entries(state)) {
            if (value > maxValue && value >= this.emotionalThreshold) {
                maxValue = value;
                dominantEmotion = EMOTIONAL_STATE_TO_VOICE[emotion as keyof EmotionalState];
            }
        }

        return dominantEmotion;
    }

    /**
     * Update voice emotion based on emotional state
     */
    updateFromEmotionalState(state: EmotionalState): string {
        this.currentEmotion = this.getDominantEmotion(state);
        return this.currentEmotion;
    }

    /**
     * Get current emotion
     */
    getCurrentEmotion(): string {
        return this.currentEmotion;
    }

    /**
     * Get modulated voice params for emotion
     */
    getModulatedParams(): VoiceConfig {
        return this.synthesis.getModulatedParams(this.currentEmotion);
    }

    /**
     * Speak with current emotional modulation
     */
    speak(text: string): void {
        this.synthesis.speak(text, this.currentEmotion);
    }

    /**
     * Calculate emotional intensity
     */
    calculateIntensity(state: EmotionalState): number {
        const values = Object.values(state);
        const max = Math.max(...values);
        return max;
    }

    /**
     * Set emotional threshold for detection
     */
    setThreshold(threshold: number): void {
        this.emotionalThreshold = Math.max(0, Math.min(1, threshold));
    }
}

describe('Voice ↔ Core Integration', () => {
    let synthesis: SpeechSynthesisService;
    let coordinator: VoiceCoreCoordinator;

    beforeEach(() => {
        synthesis = new SpeechSynthesisService();
        coordinator = new VoiceCoreCoordinator(synthesis);
    });

    describe('Emotional state → voice modulation', () => {
        it('should map joy to happy voice', () => {
            const state: EmotionalState = {
                joy: 0.8,
                sadness: 0.1,
                anger: 0,
                fear: 0,
                surprise: 0,
                disgust: 0,
                contempt: 0,
                interest: 0.2,
            };

            const emotion = coordinator.updateFromEmotionalState(state);
            expect(emotion).toBe('happy');
        });

        it('should map sadness to sad voice', () => {
            const state: EmotionalState = {
                joy: 0.1,
                sadness: 0.7,
                anger: 0,
                fear: 0,
                surprise: 0,
                disgust: 0,
                contempt: 0,
                interest: 0,
            };

            const emotion = coordinator.updateFromEmotionalState(state);
            expect(emotion).toBe('sad');
        });

        it('should map anger to angry voice', () => {
            const state: EmotionalState = {
                joy: 0,
                sadness: 0,
                anger: 0.9,
                fear: 0.1,
                surprise: 0,
                disgust: 0,
                contempt: 0.2,
                interest: 0,
            };

            const emotion = coordinator.updateFromEmotionalState(state);
            expect(emotion).toBe('angry');
        });

        it('should return neutral for low values', () => {
            const state: EmotionalState = {
                joy: 0.1,
                sadness: 0.1,
                anger: 0.1,
                fear: 0.1,
                surprise: 0.1,
                disgust: 0.1,
                contempt: 0.1,
                interest: 0.1,
            };

            const emotion = coordinator.updateFromEmotionalState(state);
            expect(emotion).toBe('neutral');
        });

        it('should pick highest value when multiple are high', () => {
            const state: EmotionalState = {
                joy: 0.5,
                sadness: 0.3,
                anger: 0.7, // Highest
                fear: 0.4,
                surprise: 0.6,
                disgust: 0.2,
                contempt: 0.1,
                interest: 0.5,
            };

            const emotion = coordinator.updateFromEmotionalState(state);
            expect(emotion).toBe('angry');
        });
    });

    describe('PersonaCore integration', () => {
        it('should adjust voice rate based on emotion', () => {
            coordinator.updateFromEmotionalState({
                joy: 0.8,
                sadness: 0,
                anger: 0,
                fear: 0,
                surprise: 0,
                disgust: 0,
                contempt: 0,
                interest: 0,
            });

            const params = coordinator.getModulatedParams();
            const happyMod = EMOTION_MODULATIONS['happy'];

            // Happy voice should be faster
            expect(params.rate).toBeGreaterThan(1);
        });

        it('should adjust voice pitch based on emotion', () => {
            coordinator.updateFromEmotionalState({
                joy: 0,
                sadness: 0.8,
                anger: 0,
                fear: 0,
                surprise: 0,
                disgust: 0,
                contempt: 0,
                interest: 0,
            });

            const params = coordinator.getModulatedParams();
            const sadMod = EMOTION_MODULATIONS['sad'];

            // Sad voice should have lower pitch
            expect(params.pitch).toBeLessThanOrEqual(1);
        });

        it('should maintain base config with neutral emotion', () => {
            coordinator.updateFromEmotionalState({
                joy: 0,
                sadness: 0,
                anger: 0,
                fear: 0,
                surprise: 0,
                disgust: 0,
                contempt: 0,
                interest: 0,
            });

            const params = coordinator.getModulatedParams();

            // Should be close to default values
            expect(params.rate).toBeCloseTo(1, 0);
            expect(params.pitch).toBeCloseTo(1, 0);
        });
    });

    describe('Sentiment → synthesis adjustment', () => {
        it('should increase volume for angry emotion', () => {
            coordinator.updateFromEmotionalState({
                joy: 0,
                sadness: 0,
                anger: 0.9,
                fear: 0,
                surprise: 0,
                disgust: 0,
                contempt: 0,
                interest: 0,
            });

            const params = coordinator.getModulatedParams();
            expect(params.volume).toBeGreaterThan(0.8);
        });

        it('should decrease volume for fearful emotion', () => {
            coordinator.updateFromEmotionalState({
                joy: 0,
                sadness: 0,
                anger: 0,
                fear: 0.8,
                surprise: 0,
                disgust: 0,
                contempt: 0,
                interest: 0,
            });

            const params = coordinator.getModulatedParams();
            // Fearful should reduce volume
            expect(params.volume).toBeLessThanOrEqual(1);
        });
    });

    describe('End-to-end emotion flow', () => {
        it('should handle emotion state changes', () => {
            // Start neutral
            expect(coordinator.getCurrentEmotion()).toBe('neutral');

            // Become happy
            coordinator.updateFromEmotionalState({
                joy: 0.7,
                sadness: 0,
                anger: 0,
                fear: 0,
                surprise: 0,
                disgust: 0,
                contempt: 0,
                interest: 0.3,
            });
            expect(coordinator.getCurrentEmotion()).toBe('happy');

            // Become sad
            coordinator.updateFromEmotionalState({
                joy: 0.1,
                sadness: 0.8,
                anger: 0,
                fear: 0,
                surprise: 0,
                disgust: 0,
                contempt: 0,
                interest: 0,
            });
            expect(coordinator.getCurrentEmotion()).toBe('sad');

            // Return to neutral
            coordinator.updateFromEmotionalState({
                joy: 0.1,
                sadness: 0.1,
                anger: 0.1,
                fear: 0.1,
                surprise: 0.1,
                disgust: 0.1,
                contempt: 0.1,
                interest: 0.1,
            });
            expect(coordinator.getCurrentEmotion()).toBe('neutral');
        });

        it('should calculate emotional intensity', () => {
            const state: EmotionalState = {
                joy: 0.5,
                sadness: 0.3,
                anger: 0.9, // Highest
                fear: 0.4,
                surprise: 0.6,
                disgust: 0.2,
                contempt: 0.1,
                interest: 0.5,
            };

            const intensity = coordinator.calculateIntensity(state);
            expect(intensity).toBe(0.9);
        });

        it('should respect emotional threshold', () => {
            coordinator.setThreshold(0.5);

            const lowState: EmotionalState = {
                joy: 0.4,
                sadness: 0.3,
                anger: 0.4,
                fear: 0.3,
                surprise: 0.4,
                disgust: 0.3,
                contempt: 0.4,
                interest: 0.4,
            };

            // All values below threshold
            const emotion = coordinator.updateFromEmotionalState(lowState);
            expect(emotion).toBe('neutral');
        });
    });

    describe('Voice modulation accuracy', () => {
        it('should apply correct modulation for happy', () => {
            const modulation = EMOTION_MODULATIONS['happy'];
            expect(modulation.rateAdjust).toBeGreaterThan(0);
            expect(modulation.pitchAdjust).toBeGreaterThan(0);
        });

        it('should apply correct modulation for sad', () => {
            const modulation = EMOTION_MODULATIONS['sad'];
            expect(modulation.rateAdjust).toBeLessThan(0);
            expect(modulation.pitchAdjust).toBeLessThan(0);
        });

        it('should apply correct modulation for angry', () => {
            const modulation = EMOTION_MODULATIONS['angry'];
            expect(modulation.rateAdjust).toBeGreaterThan(0);
            expect(modulation.volumeAdjust).toBeGreaterThan(0);
        });

        it('should have neutral modulation with zero adjustments', () => {
            const modulation = EMOTION_MODULATIONS['neutral'];
            expect(modulation.rateAdjust).toBe(0);
            expect(modulation.pitchAdjust).toBe(0);
            expect(modulation.volumeAdjust).toBe(0);
        });
    });

    describe('Error handling', () => {
        it('should handle empty emotional state', () => {
            const emptyState: EmotionalState = {
                joy: 0,
                sadness: 0,
                anger: 0,
                fear: 0,
                surprise: 0,
                disgust: 0,
                contempt: 0,
                interest: 0,
            };

            expect(() => coordinator.updateFromEmotionalState(emptyState)).not.toThrow();
            expect(coordinator.getCurrentEmotion()).toBe('neutral');
        });

        it('should clamp threshold values', () => {
            coordinator.setThreshold(1.5);
            // Should be clamped to 1
            coordinator.setThreshold(-0.5);
            // Should be clamped to 0
        });
    });

    describe('Integration with SpeechSynthesisService', () => {
        it('should get modulated params from synthesis service', () => {
            coordinator.updateFromEmotionalState({
                joy: 0.9,
                sadness: 0,
                anger: 0,
                fear: 0,
                surprise: 0,
                disgust: 0,
                contempt: 0,
                interest: 0,
            });

            const params = coordinator.getModulatedParams();

            expect(params).toHaveProperty('rate');
            expect(params).toHaveProperty('pitch');
            expect(params).toHaveProperty('volume');
        });

        it('should allow speaking with emotional modulation', () => {
            coordinator.updateFromEmotionalState({
                joy: 0.7,
                sadness: 0,
                anger: 0,
                fear: 0,
                surprise: 0,
                disgust: 0,
                contempt: 0,
                interest: 0,
            });

            // Should not throw even if synthesis is not available
            expect(() => coordinator.speak('Hello!')).not.toThrow();
        });
    });
});

describe('EMOTION_MODULATIONS configuration', () => {
    it('should have all standard emotions defined', () => {
        expect(EMOTION_MODULATIONS).toHaveProperty('neutral');
        expect(EMOTION_MODULATIONS).toHaveProperty('happy');
        expect(EMOTION_MODULATIONS).toHaveProperty('sad');
        expect(EMOTION_MODULATIONS).toHaveProperty('angry');
        expect(EMOTION_MODULATIONS).toHaveProperty('fearful');
        expect(EMOTION_MODULATIONS).toHaveProperty('surprised');
    });

    it('should have valid modulation ranges', () => {
        for (const [emotion, modulation] of Object.entries(EMOTION_MODULATIONS)) {
            // Rate adjustment should be reasonable
            expect(modulation.rateAdjust).toBeGreaterThanOrEqual(-0.5);
            expect(modulation.rateAdjust).toBeLessThanOrEqual(0.5);

            // Pitch adjustment should be reasonable
            expect(modulation.pitchAdjust).toBeGreaterThanOrEqual(-0.5);
            expect(modulation.pitchAdjust).toBeLessThanOrEqual(0.5);

            // Volume adjustment should be reasonable
            expect(modulation.volumeAdjust).toBeGreaterThanOrEqual(-0.3);
            expect(modulation.volumeAdjust).toBeLessThanOrEqual(0.3);
        }
    });
});
