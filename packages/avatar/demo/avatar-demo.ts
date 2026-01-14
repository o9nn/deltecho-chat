/**
 * Deep Tree Echo - Avatar Demo
 *
 * Interactive demonstration of the Expression Mapper and Idle Animation System
 */

import {
    ExpressionMapper,
    createExpressionMapper,
    IdleAnimationSystem,
    createIdleAnimationSystem,
    type EmotionalState,
    type AvatarExpression,
    type IdleAnimationState,
} from '../src/index.js';

/**
 * Demo state
 */
interface DemoState {
    emotions: {
        joy: number;
        sadness: number;
        anger: number;
        fear: number;
        surprise: number;
        disgust: number;
    };
    expressionHistory: { emotion: string; timestamp: number }[];
    currentExpression: AvatarExpression | null;
    idleState: IdleAnimationState | null;
}

/**
 * Avatar Demo Controller
 */
class AvatarDemoController {
    private expressionMapper: ExpressionMapper;
    private idleAnimationSystem: IdleAnimationSystem;
    private state: DemoState;

    // DOM elements
    private elements: {
        avatarFace: HTMLElement;
        avatarBody: HTMLElement;
        eyeLeft: HTMLElement;
        eyeRight: HTMLElement;
        irisLeft: HTMLElement;
        irisRight: HTMLElement;
        eyelidLeft: HTMLElement;
        eyelidRight: HTMLElement;
        eyebrowLeft: HTMLElement;
        eyebrowRight: HTMLElement;
        mouth: HTMLElement;
        currentEmotion: HTMLElement;
        stateJson: HTMLElement;
        historyList: HTMLElement;
        lookAtGrid: HTMLElement;
        lookAtMarker: HTMLElement;
    };

    constructor() {
        this.expressionMapper = createExpressionMapper();
        this.idleAnimationSystem = createIdleAnimationSystem();

        this.state = {
            emotions: {
                joy: 0,
                sadness: 0,
                anger: 0,
                fear: 0,
                surprise: 0,
                disgust: 0,
            },
            expressionHistory: [],
            currentExpression: null,
            idleState: null,
        };

        this.elements = this.getElements();

        this.setupEventListeners();
        this.setupIdleAnimationEvents();

        // Start idle animation
        this.idleAnimationSystem.start();

        // Initial render
        this.updateAvatar();
        this.renderState();
    }

    /**
     * Get DOM elements
     */
    private getElements() {
        return {
            avatarFace: document.getElementById('avatar-face')!,
            avatarBody: document.getElementById('avatar-body')!,
            eyeLeft: document.getElementById('eye-left')!,
            eyeRight: document.getElementById('eye-right')!,
            irisLeft: document.getElementById('iris-left')!,
            irisRight: document.getElementById('iris-right')!,
            eyelidLeft: document.getElementById('eyelid-left')!,
            eyelidRight: document.getElementById('eyelid-right')!,
            eyebrowLeft: document.getElementById('eyebrow-left')!,
            eyebrowRight: document.getElementById('eyebrow-right')!,
            mouth: document.getElementById('mouth')!,
            currentEmotion: document.getElementById('current-emotion')!,
            stateJson: document.getElementById('state-json')!,
            historyList: document.getElementById('history-list')!,
            lookAtGrid: document.getElementById('look-at-grid')!,
            lookAtMarker: document.getElementById('look-at-marker')!,
        };
    }

    /**
     * Set up event listeners for controls
     */
    private setupEventListeners(): void {
        // Emotion sliders
        const emotionSliders = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust'];

        for (const emotion of emotionSliders) {
            const slider = document.getElementById(`${emotion}-slider`) as HTMLInputElement;
            const valueDisplay = document.getElementById(`${emotion}-value`)!;

            slider?.addEventListener('input', () => {
                const value = parseInt(slider.value, 10);
                this.state.emotions[emotion as keyof typeof this.state.emotions] = value / 100;
                valueDisplay.textContent = slider.value;
                this.updateAvatar();
                this.addToHistory(emotion);
            });
        }

        // Reset emotions button
        document.getElementById('reset-emotions')?.addEventListener('click', () => {
            for (const emotion of emotionSliders) {
                this.state.emotions[emotion as keyof typeof this.state.emotions] = 0;
                const slider = document.getElementById(`${emotion}-slider`) as HTMLInputElement;
                const valueDisplay = document.getElementById(`${emotion}-value`)!;
                if (slider) slider.value = '0';
                if (valueDisplay) valueDisplay.textContent = '0';
            }
            this.updateAvatar();
            this.addToHistory('neutral');
        });

        // Idle animation toggles
        document.getElementById('idle-toggle')?.addEventListener('change', (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            if (checked) {
                this.idleAnimationSystem.start();
            } else {
                this.idleAnimationSystem.stop();
            }
        });

        const idleToggles = {
            'breathing-toggle': 'breathingEnabled',
            'micro-toggle': 'microMovementsEnabled',
            'eye-toggle': 'eyeMovementsEnabled',
            'sway-toggle': 'bodySwayEnabled',
        };

        for (const [toggleId, configKey] of Object.entries(idleToggles)) {
            document.getElementById(toggleId)?.addEventListener('change', (e) => {
                const checked = (e.target as HTMLInputElement).checked;
                this.idleAnimationSystem.setConfig({ [configKey]: checked } as any);
            });
        }

        // Trigger blink button
        document.getElementById('trigger-blink')?.addEventListener('click', () => {
            this.idleAnimationSystem.triggerBlink();
        });

        // Reset eyes button
        document.getElementById('reset-eyes')?.addEventListener('click', () => {
            this.idleAnimationSystem.resetEyes();
        });

        // Look at grid
        this.elements.lookAtGrid?.addEventListener('click', (e) => {
            const rect = this.elements.lookAtGrid.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;

            this.idleAnimationSystem.lookAt(x, y);

            // Update marker position
            this.elements.lookAtMarker.style.left = `${(x + 1) * 50}%`;
            this.elements.lookAtMarker.style.top = `${(y + 1) * 50}%`;
        });

        // Quick expression buttons
        document.querySelectorAll('.expr-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const emotionData = (btn as HTMLElement).dataset.emotion;
                if (emotionData === 'neutral') {
                    for (const emotion of emotionSliders) {
                        this.state.emotions[emotion as keyof typeof this.state.emotions] = 0;
                    }
                } else if (emotionData) {
                    const [emotion, value] = emotionData.split('-');
                    for (const e of emotionSliders) {
                        this.state.emotions[e as keyof typeof this.state.emotions] =
                            e === emotion ? parseInt(value, 10) / 100 : 0;
                    }
                }

                // Update sliders to match
                for (const emotion of emotionSliders) {
                    const slider = document.getElementById(`${emotion}-slider`) as HTMLInputElement;
                    const valueDisplay = document.getElementById(`${emotion}-value`)!;
                    const value = Math.round(
                        this.state.emotions[emotion as keyof typeof this.state.emotions] * 100
                    );
                    if (slider) slider.value = String(value);
                    if (valueDisplay) valueDisplay.textContent = String(value);
                }

                this.updateAvatar();
                this.addToHistory(emotionData || 'neutral');
            });
        });
    }

    /**
     * Set up idle animation event listeners
     */
    private setupIdleAnimationEvents(): void {
        this.idleAnimationSystem.onIdleEvent((event) => {
            this.state.idleState = event.state;

            // Apply idle animation to avatar
            this.applyIdleAnimation(event.state);

            // Update state display
            this.renderState();
        });

        // Animation frame for continuous updates
        const animate = () => {
            const idleState = this.idleAnimationSystem.getState();
            if (idleState.isActive) {
                this.applyIdleAnimation(idleState);
            }
            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }

    /**
     * Apply idle animation state to avatar
     */
    private applyIdleAnimation(state: IdleAnimationState): void {
        // Apply breathing (body scale)
        const breathScale = 1 + state.breathingOffset * 0.02;
        this.elements.avatarBody.style.transform = `translateX(-50%) scaleY(${breathScale})`;

        // Apply body sway
        const swayX = state.bodySwayX * 5;
        const swayY = state.bodySwayY * 3;
        this.elements.avatarFace.style.transform = `translate(${swayX}px, ${swayY}px) rotate(${state.headTiltX * 3}deg)`;

        // Apply eye movement
        const eyeOffsetX = state.eyeLookX * 8;
        const eyeOffsetY = state.eyeLookY * 5;
        this.elements.irisLeft.style.transform = `translate(calc(-50% + ${eyeOffsetX}px), calc(-50% + ${eyeOffsetY}px))`;
        this.elements.irisRight.style.transform = `translate(calc(-50% + ${eyeOffsetX}px), calc(-50% + ${eyeOffsetY}px))`;

        // Apply blink
        if (state.blinkState > 0.5) {
            this.elements.eyeLeft.classList.add('blink');
            this.elements.eyeRight.classList.add('blink');
        } else {
            this.elements.eyeLeft.classList.remove('blink');
            this.elements.eyeRight.classList.remove('blink');
        }
    }

    /**
     * Update avatar based on current emotional state
     */
    private updateAvatar(): void {
        // Create emotional state for expression mapper
        const emotionalState: EmotionalState = this.state.emotions;

        // Get expression from mapper
        const expression = this.expressionMapper.mapEmotionToExpression(emotionalState);
        this.state.currentExpression = expression;

        // Determine dominant emotion
        const dominantEmotion = this.getDominantEmotion();
        this.elements.currentEmotion.textContent = dominantEmotion || 'Neutral';

        // Update face class for color changes
        this.elements.avatarFace.className = 'avatar-face';
        if (dominantEmotion && this.state.emotions[dominantEmotion as keyof typeof this.state.emotions] > 0.3) {
            this.elements.avatarFace.classList.add(dominantEmotion);
        }

        // Apply eyebrow expression
        this.applyEyebrowExpression(dominantEmotion);

        // Apply mouth expression
        this.applyMouthExpression(dominantEmotion);

        this.renderState();
    }

    /**
     * Get the dominant emotion
     */
    private getDominantEmotion(): string | null {
        let maxEmotion: string | null = null;
        let maxValue = 0.1; // Threshold

        for (const [emotion, value] of Object.entries(this.state.emotions)) {
            if (value > maxValue) {
                maxValue = value;
                maxEmotion = emotion;
            }
        }

        return maxEmotion;
    }

    /**
     * Apply eyebrow expression based on emotion
     */
    private applyEyebrowExpression(emotion: string | null): void {
        let leftRotation = 0;
        let rightRotation = 0;
        let yOffset = 0;

        switch (emotion) {
            case 'joy':
                leftRotation = -5;
                rightRotation = 5;
                yOffset = -2;
                break;
            case 'sadness':
                leftRotation = 15;
                rightRotation = -15;
                yOffset = 3;
                break;
            case 'anger':
                leftRotation = -20;
                rightRotation = 20;
                yOffset = -5;
                break;
            case 'fear':
                leftRotation = 10;
                rightRotation = -10;
                yOffset = -8;
                break;
            case 'surprise':
                yOffset = -10;
                break;
            case 'disgust':
                leftRotation = -10;
                rightRotation = 5;
                yOffset = -2;
                break;
        }

        this.elements.eyebrowLeft.style.transform = `translateY(${yOffset}px) rotate(${leftRotation}deg)`;
        this.elements.eyebrowRight.style.transform = `translateY(${yOffset}px) rotate(${rightRotation}deg)`;
    }

    /**
     * Apply mouth expression based on emotion
     */
    private applyMouthExpression(emotion: string | null): void {
        let width = 50;
        let height = 15;
        let borderRadius = '50% 50% 40% 40%';

        switch (emotion) {
            case 'joy':
                width = 60;
                height = 25;
                borderRadius = '0 0 50% 50%';
                break;
            case 'sadness':
                width = 40;
                height = 12;
                borderRadius = '50% 50% 0 0';
                break;
            case 'anger':
                width = 35;
                height = 8;
                borderRadius = '0';
                break;
            case 'fear':
                width = 30;
                height = 20;
                borderRadius = '50%';
                break;
            case 'surprise':
                width = 35;
                height = 35;
                borderRadius = '50%';
                break;
            case 'disgust':
                width = 40;
                height = 10;
                borderRadius = '50% 50% 30% 30%';
                break;
        }

        this.elements.mouth.style.width = `${width}px`;
        this.elements.mouth.style.height = `${height}px`;
        this.elements.mouth.style.borderRadius = borderRadius;
    }

    /**
     * Add to expression history
     */
    private addToHistory(emotion: string): void {
        this.state.expressionHistory.unshift({
            emotion,
            timestamp: Date.now(),
        });

        // Keep only last 10 items
        if (this.state.expressionHistory.length > 10) {
            this.state.expressionHistory.pop();
        }

        this.renderHistory();
    }

    /**
     * Render expression history
     */
    private renderHistory(): void {
        this.elements.historyList.innerHTML = this.state.expressionHistory
            .map(
                (item, index) => `
                <div class="history-item ${index === 0 ? 'active' : ''}">
                    ${item.emotion}
                </div>
            `
            )
            .join('');
    }

    /**
     * Render current state as JSON
     */
    private renderState(): void {
        const displayState = {
            emotions: this.state.emotions,
            idleAnimation: this.idleAnimationSystem.getState(),
            expression: this.state.currentExpression
                ? {
                    dominantEmotion: this.getDominantEmotion(),
                    eyebrows: this.state.currentExpression.eyebrows,
                    mouth: this.state.currentExpression.mouth,
                }
                : null,
        };

        this.elements.stateJson.textContent = JSON.stringify(displayState, null, 2);
    }
}

// Initialize demo when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new AvatarDemoController();
});

// Also export for module usage
export { AvatarDemoController };
