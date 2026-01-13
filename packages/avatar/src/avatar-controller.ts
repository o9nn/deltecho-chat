/**
 * Avatar Controller for Deep Tree Echo
 *
 * Manages avatar state, expression transitions, and provides
 * event-based updates for UI integration.
 */

import { EventEmitter } from 'events';
import {
    AvatarState,
    AvatarEvent,
    AvatarEventListener,
    AvatarControllerConfig,
    AvatarMotion,
    MotionRequest,
    Expression,
    DEFAULT_AVATAR_CONFIG,
} from './types';
import { ExpressionMapper } from './expression-mapper';

/**
 * AvatarController manages the avatar's visual state based on emotional input
 */
export class AvatarController extends EventEmitter {
    private config: AvatarControllerConfig;
    private expressionMapper: ExpressionMapper;
    private state: AvatarState;
    private updateIntervalId: ReturnType<typeof setInterval> | null = null;
    private blinkTimeoutId: ReturnType<typeof setTimeout> | null = null;
    private currentMotion: AvatarMotion = 'idle';

    constructor(config: Partial<AvatarControllerConfig> = {}) {
        super();
        this.config = { ...DEFAULT_AVATAR_CONFIG, ...config };
        this.expressionMapper = new ExpressionMapper();

        this.state = {
            currentExpression: 'neutral',
            previousExpression: null,
            transitionProgress: 1,
            lastUpdated: Date.now(),
            isSpeaking: false,
            isBlinking: false,
        };
    }

    /**
     * Start the avatar controller
     * Begins automatic updates and blinking
     */
    start(): void {
        if (this.config.autoBlinking) {
            this.scheduleNextBlink();
        }
    }

    /**
     * Stop the avatar controller
     * Cleans up intervals and timeouts
     */
    stop(): void {
        if (this.updateIntervalId) {
            clearInterval(this.updateIntervalId);
            this.updateIntervalId = null;
        }
        if (this.blinkTimeoutId) {
            clearTimeout(this.blinkTimeoutId);
            this.blinkTimeoutId = null;
        }
    }

    /**
     * Update avatar based on emotional state
     * Call this whenever PersonaCore's emotional state changes
     */
    updateFromEmotionalState(emotionalState: Record<string, number>): void {
        const expressionChanged = this.expressionMapper.update(emotionalState);

        if (expressionChanged) {
            const newExpression = this.expressionMapper.getExpression();
            this.transitionToExpression(newExpression);
        }
    }

    /**
     * Transition to a new expression
     */
    private transitionToExpression(expression: Expression): void {
        this.state = {
            ...this.state,
            previousExpression: this.state.currentExpression,
            currentExpression: expression,
            transitionProgress: 0,
            lastUpdated: Date.now(),
        };

        this.emitEvent('expression_change');

        // Animate transition
        this.animateTransition();
    }

    /**
     * Animate the expression transition
     */
    private animateTransition(): void {
        const startTime = Date.now();
        const duration = this.config.transitionDuration;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(1, elapsed / duration);

            this.state = {
                ...this.state,
                transitionProgress: this.easeOutCubic(progress),
            };

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.emitEvent('state_update');
            }
        };

        if (typeof requestAnimationFrame !== 'undefined') {
            requestAnimationFrame(animate);
        } else {
            // Fallback for Node.js environment
            this.state = { ...this.state, transitionProgress: 1 };
            this.emitEvent('state_update');
        }
    }

    /**
     * Easing function for smooth transitions
     */
    private easeOutCubic(x: number): number {
        return 1 - Math.pow(1 - x, 3);
    }

    /**
     * Schedule the next automatic blink
     */
    private scheduleNextBlink(): void {
        const [min, max] = this.config.blinkInterval;
        const delay = min + Math.random() * (max - min);

        this.blinkTimeoutId = setTimeout(() => {
            this.blink();
            this.scheduleNextBlink();
        }, delay);
    }

    /**
     * Trigger a blink animation
     */
    private blink(): void {
        if (this.state.isBlinking) return;

        this.state = { ...this.state, isBlinking: true };
        this.emitEvent('state_update');

        // Blink duration ~150ms
        setTimeout(() => {
            this.state = { ...this.state, isBlinking: false };
            this.emitEvent('state_update');
        }, 150);
    }

    /**
     * Set speaking state
     */
    setSpeaking(speaking: boolean): void {
        if (this.state.isSpeaking !== speaking) {
            this.state = {
                ...this.state,
                isSpeaking: speaking,
                lastUpdated: Date.now(),
            };
            this.emitEvent('state_update');
        }
    }

    /**
     * Request a motion/animation
     */
    requestMotion(request: MotionRequest): void {
        this.currentMotion = request.motion;
        this.emitEvent('motion_start');

        if (!request.loop && request.duration) {
            setTimeout(() => {
                this.currentMotion = 'idle';
                this.emitEvent('motion_end');
            }, request.duration);
        }
    }

    /**
     * Get current avatar state
     */
    getState(): AvatarState {
        return { ...this.state };
    }

    /**
     * Get current motion
     */
    getMotion(): AvatarMotion {
        return this.currentMotion;
    }

    /**
     * Get current expression directly
     */
    getExpression(): Expression {
        return this.state.currentExpression;
    }

    /**
     * Get expression intensity (0-1)
     */
    getExpressionIntensity(emotionalState: Record<string, number>): number {
        return this.expressionMapper.getIntensity(emotionalState);
    }

    /**
     * Add event listener for avatar events
     */
    onAvatarEvent(listener: AvatarEventListener): void {
        this.on('avatar_event', listener);
    }

    /**
     * Remove event listener
     */
    offAvatarEvent(listener: AvatarEventListener): void {
        this.off('avatar_event', listener);
    }

    /**
     * Emit avatar event
     */
    private emitEvent(
        type: 'expression_change' | 'motion_start' | 'motion_end' | 'state_update'
    ): void {
        const event: AvatarEvent = {
            type,
            state: this.getState(),
            timestamp: Date.now(),
        };
        this.emit('avatar_event', event);
    }

    /**
     * Reset avatar to initial state
     */
    reset(): void {
        this.expressionMapper.reset();
        this.state = {
            currentExpression: 'neutral',
            previousExpression: null,
            transitionProgress: 1,
            lastUpdated: Date.now(),
            isSpeaking: false,
            isBlinking: false,
        };
        this.currentMotion = 'idle';
        this.emitEvent('state_update');
    }
}
