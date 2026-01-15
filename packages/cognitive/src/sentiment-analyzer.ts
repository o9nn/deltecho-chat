/**
 * Sentiment Analyzer for Deep Tree Echo
 *
 * Rule-based sentiment and emotion analysis for text.
 * Provides valence/arousal calculation and emotional trend tracking.
 */

import {
    SentimentScore,
    EmotionalVector,
    DEFAULT_EMOTIONAL_VECTOR,
} from './types';

/**
 * Emotion keywords mapped to their emotion category and intensity
 */
const EMOTION_KEYWORDS: Record<string, { emotion: keyof EmotionalVector; intensity: number }[]> = {
    // Joy indicators
    happy: [{ emotion: 'joy', intensity: 0.7 }],
    joyful: [{ emotion: 'joy', intensity: 0.8 }],
    excited: [{ emotion: 'joy', intensity: 0.8 }, { emotion: 'surprise', intensity: 0.3 }],
    delighted: [{ emotion: 'joy', intensity: 0.9 }],
    pleased: [{ emotion: 'joy', intensity: 0.6 }],
    glad: [{ emotion: 'joy', intensity: 0.6 }],
    wonderful: [{ emotion: 'joy', intensity: 0.8 }],
    amazing: [{ emotion: 'joy', intensity: 0.7 }, { emotion: 'surprise', intensity: 0.4 }],
    love: [{ emotion: 'joy', intensity: 0.9 }],
    great: [{ emotion: 'joy', intensity: 0.6 }],
    awesome: [{ emotion: 'joy', intensity: 0.7 }],
    fantastic: [{ emotion: 'joy', intensity: 0.8 }],

    // Sadness indicators
    sad: [{ emotion: 'sadness', intensity: 0.7 }],
    unhappy: [{ emotion: 'sadness', intensity: 0.6 }],
    depressed: [{ emotion: 'sadness', intensity: 0.9 }],
    miserable: [{ emotion: 'sadness', intensity: 0.8 }],
    heartbroken: [{ emotion: 'sadness', intensity: 0.9 }],
    disappointed: [{ emotion: 'sadness', intensity: 0.6 }],
    lonely: [{ emotion: 'sadness', intensity: 0.7 }],
    grief: [{ emotion: 'sadness', intensity: 0.9 }],

    // Anger indicators
    angry: [{ emotion: 'anger', intensity: 0.8 }],
    furious: [{ emotion: 'anger', intensity: 0.9 }],
    mad: [{ emotion: 'anger', intensity: 0.7 }],
    annoyed: [{ emotion: 'anger', intensity: 0.5 }],
    irritated: [{ emotion: 'anger', intensity: 0.5 }],
    frustrated: [{ emotion: 'anger', intensity: 0.6 }],
    outraged: [{ emotion: 'anger', intensity: 0.9 }],
    hate: [{ emotion: 'anger', intensity: 0.8 }, { emotion: 'disgust', intensity: 0.4 }],

    // Fear indicators
    afraid: [{ emotion: 'fear', intensity: 0.7 }],
    scared: [{ emotion: 'fear', intensity: 0.8 }],
    terrified: [{ emotion: 'fear', intensity: 0.9 }],
    anxious: [{ emotion: 'fear', intensity: 0.6 }],
    worried: [{ emotion: 'fear', intensity: 0.5 }],
    nervous: [{ emotion: 'fear', intensity: 0.5 }],
    panicked: [{ emotion: 'fear', intensity: 0.9 }],

    // Surprise indicators
    surprised: [{ emotion: 'surprise', intensity: 0.7 }],
    shocked: [{ emotion: 'surprise', intensity: 0.8 }],
    astonished: [{ emotion: 'surprise', intensity: 0.9 }],
    amazed: [{ emotion: 'surprise', intensity: 0.7 }, { emotion: 'joy', intensity: 0.3 }],
    unexpected: [{ emotion: 'surprise', intensity: 0.5 }],

    // Disgust indicators
    disgusted: [{ emotion: 'disgust', intensity: 0.8 }],
    revolted: [{ emotion: 'disgust', intensity: 0.9 }],
    sick: [{ emotion: 'disgust', intensity: 0.6 }],
    gross: [{ emotion: 'disgust', intensity: 0.7 }],

    // Interest indicators
    curious: [{ emotion: 'interest', intensity: 0.7 }],
    interested: [{ emotion: 'interest', intensity: 0.6 }],
    fascinated: [{ emotion: 'interest', intensity: 0.8 }],
    intrigued: [{ emotion: 'interest', intensity: 0.7 }],
};

/**
 * Positive and negative word lists for polarity
 */
const POSITIVE_WORDS = new Set([
    'good', 'great', 'excellent', 'wonderful', 'fantastic', 'amazing',
    'awesome', 'love', 'like', 'happy', 'joy', 'pleased', 'delighted',
    'beautiful', 'best', 'perfect', 'brilliant', 'superb', 'outstanding',
    'yes', 'agree', 'thanks', 'thank', 'appreciate', 'helpful', 'nice',
    'kind', 'friendly', 'warm', 'positive', 'success', 'win', 'achieve',
]);

const NEGATIVE_WORDS = new Set([
    'bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'sad',
    'angry', 'upset', 'disappointed', 'frustrated', 'annoyed', 'worst',
    'fail', 'failure', 'wrong', 'problem', 'issue', 'error', 'mistake',
    'no', 'not', 'never', 'nothing', 'nobody', 'neither', 'refuse',
    'reject', 'deny', 'difficult', 'hard', 'impossible', 'pain', 'hurt',
]);

/**
 * Negation words that flip sentiment
 */
const NEGATION_WORDS = new Set([
    'not', "n't", 'no', 'never', 'neither', 'nobody', 'nothing',
    'nowhere', 'hardly', 'scarcely', 'barely', 'rarely',
]);

/**
 * Intensifier words that amplify sentiment
 */
const INTENSIFIERS: Record<string, number> = {
    very: 1.3,
    really: 1.25,
    extremely: 1.5,
    incredibly: 1.4,
    absolutely: 1.5,
    completely: 1.4,
    totally: 1.3,
    so: 1.2,
    quite: 1.1,
    rather: 1.1,
    somewhat: 0.8,
    slightly: 0.7,
    barely: 0.5,
};

/**
 * Sentiment analysis configuration
 */
export interface SentimentConfig {
    /** Minimum confidence threshold */
    minConfidence: number;
    /** Enable emotion detection */
    detectEmotions: boolean;
    /** Normalize scores to -1 to 1 */
    normalize: boolean;
}

/**
 * Default sentiment config
 */
export const DEFAULT_SENTIMENT_CONFIG: SentimentConfig = {
    minConfidence: 0.1,
    detectEmotions: true,
    normalize: true,
};

/**
 * SentimentAnalyzer provides rule-based sentiment and emotion analysis
 */
export class SentimentAnalyzer {
    private config: SentimentConfig;
    private history: SentimentScore[] = [];
    private maxHistory = 100;

    constructor(config: Partial<SentimentConfig> = {}) {
        this.config = { ...DEFAULT_SENTIMENT_CONFIG, ...config };
    }

    /**
     * Analyze sentiment of text
     */
    analyze(text: string): SentimentScore {
        const tokens = this.tokenize(text.toLowerCase());

        let positiveScore = 0;
        let negativeScore = 0;
        let negationActive = false;
        let currentIntensifier = 1;
        const detectedEmotions: string[] = [];

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];

            // Check for intensifiers
            if (INTENSIFIERS[token]) {
                currentIntensifier = INTENSIFIERS[token];
                continue;
            }

            // Check for negation
            if (NEGATION_WORDS.has(token)) {
                negationActive = true;
                continue;
            }

            // Calculate scores
            let tokenPositive = 0;
            let tokenNegative = 0;

            if (POSITIVE_WORDS.has(token)) {
                tokenPositive = 1 * currentIntensifier;
            }
            if (NEGATIVE_WORDS.has(token)) {
                tokenNegative = 1 * currentIntensifier;
            }

            // Apply negation
            if (negationActive) {
                [tokenPositive, tokenNegative] = [tokenNegative * 0.7, tokenPositive * 0.7];
                negationActive = false;
            }

            positiveScore += tokenPositive;
            negativeScore += tokenNegative;

            // Detect emotions
            if (this.config.detectEmotions && EMOTION_KEYWORDS[token]) {
                for (const em of EMOTION_KEYWORDS[token]) {
                    if (!detectedEmotions.includes(em.emotion)) {
                        detectedEmotions.push(em.emotion);
                    }
                }
            }

            // Reset intensifier after use
            currentIntensifier = 1;
        }

        // Calculate polarity
        const total = positiveScore + negativeScore;
        let polarity = 0;
        if (total > 0) {
            polarity = (positiveScore - negativeScore) / total;
        }

        // Normalize if configured
        if (this.config.normalize) {
            polarity = Math.max(-1, Math.min(1, polarity));
        }

        // Calculate confidence based on signal strength
        const signalStrength = total / Math.max(1, tokens.length);
        const confidence = Math.min(1, signalStrength * 2);

        const result: SentimentScore = {
            polarity,
            positive: positiveScore,
            negative: negativeScore,
            confidence: Math.max(this.config.minConfidence, confidence),
            emotions: detectedEmotions,
        };

        // Track history
        this.history.push(result);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        return result;
    }

    /**
     * Extract emotional vector from text
     */
    extractEmotion(text: string): EmotionalVector {
        const tokens = this.tokenize(text.toLowerCase());
        const emotions: Record<string, number> = {
            joy: 0,
            sadness: 0,
            anger: 0,
            fear: 0,
            surprise: 0,
            disgust: 0,
            contempt: 0,
            interest: 0.1, // Base interest level
        };

        let negationActive = false;
        let currentIntensifier = 1;

        for (const token of tokens) {
            // Check for intensifiers
            if (INTENSIFIERS[token]) {
                currentIntensifier = INTENSIFIERS[token];
                continue;
            }

            // Check for negation
            if (NEGATION_WORDS.has(token)) {
                negationActive = true;
                continue;
            }

            // Check for emotion keywords
            if (EMOTION_KEYWORDS[token]) {
                for (const em of EMOTION_KEYWORDS[token]) {
                    let intensity = em.intensity * currentIntensifier;
                    if (negationActive) {
                        intensity *= -0.5; // Negation reduces but doesn't fully invert
                    }
                    const emKey = em.emotion as keyof typeof emotions;
                    emotions[emKey] = Math.max(0, Math.min(1, emotions[emKey] + intensity));
                }
            }

            // Reset after use
            negationActive = false;
            currentIntensifier = 1;
        }

        // Find dominant emotion
        let dominant = 'neutral';
        let maxIntensity = 0;
        for (const [emotion, value] of Object.entries(emotions)) {
            if (value > maxIntensity && value > 0.2) {
                maxIntensity = value;
                dominant = emotion;
            }
        }

        // Calculate valence and arousal
        const valence = this.calculateValence(emotions);
        const arousal = this.calculateArousal(emotions);

        return {
            joy: emotions.joy,
            sadness: emotions.sadness,
            anger: emotions.anger,
            fear: emotions.fear,
            surprise: emotions.surprise,
            disgust: emotions.disgust,
            contempt: emotions.contempt,
            interest: emotions.interest,
            dominant,
            valence,
            arousal,
        };
    }

    /**
     * Calculate valence (pleasantness) from emotions
     * Positive: joy, surprise (positive context)
     * Negative: sadness, anger, fear, disgust, contempt
     */
    private calculateValence(emotions: Record<string, number>): number {
        const positive = emotions.joy + (emotions.surprise * 0.3) + (emotions.interest * 0.2);
        const negative = emotions.sadness + emotions.anger + emotions.fear +
            emotions.disgust + emotions.contempt;

        const total = positive + negative;
        if (total === 0) return 0;

        return Math.max(-1, Math.min(1, (positive - negative) / total));
    }

    /**
     * Calculate arousal (activation) from emotions
     * High arousal: anger, fear, joy, surprise
     * Low arousal: sadness, contempt
     */
    private calculateArousal(emotions: Record<string, number>): number {
        const high = emotions.anger + emotions.fear + (emotions.joy * 0.7) +
            emotions.surprise + (emotions.interest * 0.3);
        const low = emotions.sadness + emotions.contempt;

        const total = high + low;
        if (total === 0) return 0.1; // Base arousal

        return Math.max(0, Math.min(1, high / (total + 1)));
    }

    /**
     * Get sentiment trend from history
     */
    getTrend(): { direction: 'positive' | 'negative' | 'stable'; strength: number } {
        if (this.history.length < 3) {
            return { direction: 'stable', strength: 0 };
        }

        const recent = this.history.slice(-5);
        const older = this.history.slice(-10, -5);

        const recentAvg = recent.reduce((a, b) => a + b.polarity, 0) / recent.length;
        const olderAvg = older.length > 0
            ? older.reduce((a, b) => a + b.polarity, 0) / older.length
            : 0;

        const diff = recentAvg - olderAvg;
        const threshold = 0.1;

        if (diff > threshold) {
            return { direction: 'positive', strength: Math.min(1, diff) };
        } else if (diff < -threshold) {
            return { direction: 'negative', strength: Math.min(1, Math.abs(diff)) };
        } else {
            return { direction: 'stable', strength: 0 };
        }
    }

    /**
     * Get average sentiment from history
     */
    getAverage(): SentimentScore {
        if (this.history.length === 0) {
            return {
                polarity: 0,
                positive: 0,
                negative: 0,
                confidence: 0,
                emotions: [],
            };
        }

        const avgPolarity = this.history.reduce((a, b) => a + b.polarity, 0) / this.history.length;
        const avgPositive = this.history.reduce((a, b) => a + b.positive, 0) / this.history.length;
        const avgNegative = this.history.reduce((a, b) => a + b.negative, 0) / this.history.length;
        const avgConfidence = this.history.reduce((a, b) => a + b.confidence, 0) / this.history.length;

        // Collect all emotions
        const allEmotions = new Set<string>();
        for (const h of this.history.slice(-10)) {
            for (const e of h.emotions) {
                allEmotions.add(e);
            }
        }

        return {
            polarity: avgPolarity,
            positive: avgPositive,
            negative: avgNegative,
            confidence: avgConfidence,
            emotions: Array.from(allEmotions),
        };
    }

    /**
     * Clear sentiment history
     */
    clearHistory(): void {
        this.history = [];
    }

    /**
     * Get history length
     */
    getHistoryLength(): number {
        return this.history.length;
    }

    /**
     * Tokenize text into words
     */
    private tokenize(text: string): string[] {
        return text
            .replace(/[^\w\s']/g, ' ')
            .split(/\s+/)
            .filter(t => t.length > 0);
    }
}

/**
 * Create a sentiment analyzer with optional config
 */
export function createSentimentAnalyzer(
    config?: Partial<SentimentConfig>
): SentimentAnalyzer {
    return new SentimentAnalyzer(config);
}
