/**
 * Expression Mapper for Deep Tree Echo Avatar
 *
 * Maps emotional state from PersonaCore to avatar expressions.
 * Uses a weighted algorithm to determine the most appropriate expression
 * based on current emotional intensities.
 */

import { Expression, EmotionalVector } from './types';

/**
 * Expression mapping rules - maps emotions to expressions with weights
 */
interface ExpressionMapping {
    expression: Expression;
    /** Emotions that contribute to this expression */
    triggers: {
        emotion: keyof EmotionalVector;
        weight: number;
        threshold?: number;
    }[];
    /** Emotions that inhibit this expression */
    inhibitors?: {
        emotion: keyof EmotionalVector;
        weight: number;
    }[];
}

/**
 * Expression mapping configuration
 */
const EXPRESSION_MAPPINGS: ExpressionMapping[] = [
    {
        expression: 'happy',
        triggers: [
            { emotion: 'joy', weight: 1.0, threshold: 0.4 },
            { emotion: 'interest', weight: 0.3 },
        ],
        inhibitors: [
            { emotion: 'sadness', weight: 0.5 },
            { emotion: 'fear', weight: 0.3 },
        ],
    },
    {
        expression: 'thinking',
        triggers: [{ emotion: 'interest', weight: 0.8, threshold: 0.3 }],
        inhibitors: [
            { emotion: 'surprise', weight: 0.4 },
            { emotion: 'joy', weight: 0.2 },
        ],
    },
    {
        expression: 'curious',
        triggers: [
            { emotion: 'interest', weight: 0.6, threshold: 0.4 },
            { emotion: 'surprise', weight: 0.4 },
        ],
    },
    {
        expression: 'surprised',
        triggers: [{ emotion: 'surprise', weight: 1.0, threshold: 0.5 }],
    },
    {
        expression: 'concerned',
        triggers: [
            { emotion: 'fear', weight: 0.5 },
            { emotion: 'sadness', weight: 0.5 },
        ],
        inhibitors: [{ emotion: 'joy', weight: 0.5 }],
    },
    {
        expression: 'focused',
        triggers: [{ emotion: 'interest', weight: 0.7, threshold: 0.5 }],
        inhibitors: [
            { emotion: 'surprise', weight: 0.5 },
            { emotion: 'joy', weight: 0.3 },
        ],
    },
    {
        expression: 'playful',
        triggers: [
            { emotion: 'joy', weight: 0.7, threshold: 0.3 },
            { emotion: 'surprise', weight: 0.3 },
        ],
        inhibitors: [
            { emotion: 'sadness', weight: 0.6 },
            { emotion: 'anger', weight: 0.4 },
        ],
    },
    {
        expression: 'contemplative',
        triggers: [
            { emotion: 'interest', weight: 0.5, threshold: 0.2 },
            { emotion: 'sadness', weight: 0.3 },
        ],
        inhibitors: [
            { emotion: 'joy', weight: 0.4 },
            { emotion: 'surprise', weight: 0.5 },
        ],
    },
    {
        expression: 'empathetic',
        triggers: [
            { emotion: 'sadness', weight: 0.4, threshold: 0.2 },
            { emotion: 'interest', weight: 0.4 },
        ],
        inhibitors: [
            { emotion: 'anger', weight: 0.5 },
            { emotion: 'contempt', weight: 0.5 },
        ],
    },
];

/**
 * Maps emotional state to an avatar expression
 *
 * @param emotionalState - Current emotional intensities from PersonaCore
 * @returns The most appropriate expression for the emotional state
 */
export function mapEmotionToExpression(
    emotionalState: Record<string, number>
): Expression {
    // Normalize emotional state to ensure all values are 0-1
    const normalized: EmotionalVector = {
        joy: clamp(emotionalState.joy ?? 0),
        interest: clamp(emotionalState.interest ?? 0),
        surprise: clamp(emotionalState.surprise ?? 0),
        sadness: clamp(emotionalState.sadness ?? 0),
        anger: clamp(emotionalState.anger ?? 0),
        fear: clamp(emotionalState.fear ?? 0),
        disgust: clamp(emotionalState.disgust ?? 0),
        contempt: clamp(emotionalState.contempt ?? 0),
    };

    let bestExpression: Expression = 'neutral';
    let bestScore = 0;

    for (const mapping of EXPRESSION_MAPPINGS) {
        const score = calculateExpressionScore(mapping, normalized);

        if (score > bestScore) {
            bestScore = score;
            bestExpression = mapping.expression;
        }
    }

    // Require minimum score threshold to deviate from neutral
    if (bestScore < 0.2) {
        return 'neutral';
    }

    return bestExpression;
}

/**
 * Calculate score for a specific expression based on emotional state
 */
function calculateExpressionScore(
    mapping: ExpressionMapping,
    emotions: EmotionalVector
): number {
    let score = 0;

    // Add contributions from triggers
    for (const trigger of mapping.triggers) {
        const emotionValue = emotions[trigger.emotion] ?? 0;

        // Check threshold if specified
        if (trigger.threshold !== undefined && emotionValue < trigger.threshold) {
            continue;
        }

        score += emotionValue * trigger.weight;
    }

    // Subtract contributions from inhibitors
    if (mapping.inhibitors) {
        for (const inhibitor of mapping.inhibitors) {
            const emotionValue = emotions[inhibitor.emotion] ?? 0;
            score -= emotionValue * inhibitor.weight;
        }
    }

    return Math.max(0, score);
}

/**
 * Clamp value between 0 and 1
 */
function clamp(value: number): number {
    return Math.max(0, Math.min(1, value));
}

/**
 * Get expression intensity based on emotional state
 * Returns 0-1 representing how strongly the expression should be shown
 */
export function getExpressionIntensity(
    expression: Expression,
    emotionalState: Record<string, number>
): number {
    const normalized: EmotionalVector = {
        joy: clamp(emotionalState.joy ?? 0),
        interest: clamp(emotionalState.interest ?? 0),
        surprise: clamp(emotionalState.surprise ?? 0),
        sadness: clamp(emotionalState.sadness ?? 0),
        anger: clamp(emotionalState.anger ?? 0),
        fear: clamp(emotionalState.fear ?? 0),
        disgust: clamp(emotionalState.disgust ?? 0),
        contempt: clamp(emotionalState.contempt ?? 0),
    };

    const mapping = EXPRESSION_MAPPINGS.find((m) => m.expression === expression);
    if (!mapping) {
        return 0.5; // Neutral intensity for neutral expression
    }

    const score = calculateExpressionScore(mapping, normalized);
    return clamp(score);
}

/**
 * ExpressionMapper class for stateful expression tracking
 */
export class ExpressionMapper {
    private currentExpression: Expression = 'neutral';
    private expressionHistory: { expression: Expression; timestamp: number }[] =
        [];
    private historyLimit = 10;

    /**
     * Update expression based on emotional state
     * Returns true if expression changed
     */
    update(emotionalState: Record<string, number>): boolean {
        const newExpression = mapEmotionToExpression(emotionalState);

        if (newExpression !== this.currentExpression) {
            this.expressionHistory.push({
                expression: this.currentExpression,
                timestamp: Date.now(),
            });

            // Trim history
            if (this.expressionHistory.length > this.historyLimit) {
                this.expressionHistory.shift();
            }

            this.currentExpression = newExpression;
            return true;
        }

        return false;
    }

    /**
     * Get current expression
     */
    getExpression(): Expression {
        return this.currentExpression;
    }

    /**
     * Get expression intensity
     */
    getIntensity(emotionalState: Record<string, number>): number {
        return getExpressionIntensity(this.currentExpression, emotionalState);
    }

    /**
     * Get recent expression history
     */
    getHistory(): { expression: Expression; timestamp: number }[] {
        return [...this.expressionHistory];
    }

    /**
     * Reset to neutral state
     */
    reset(): void {
        this.currentExpression = 'neutral';
        this.expressionHistory = [];
    }
}
