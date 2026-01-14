/**
 * Avatar Demo - Interactive Expression Mapping
 *
 * Demonstrates the Deep Tree Echo avatar expression system
 * with real-time controls and visualization.
 */

// ============================================
// Types & Interfaces
// ============================================

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

type Expression = 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'focused' | 'playful' | 'empathetic';

interface IdleState {
    breathingPhase: number;
    headTiltX: number;
    headTiltY: number;
    eyeLookX: number;
    eyeLookY: number;
    blinkState: number;
    isActive: boolean;
}

interface ExpressionHistoryEntry {
    expression: Expression;
    timestamp: Date;
}

// ============================================
// Expression Mapper (replicated from package)
// ============================================

const EXPRESSION_MAPPINGS = [
    {
        expression: 'happy',
        triggers: [
            { emotion: 'joy', weight: 1.0, threshold: 0.4 },
            { emotion: 'interest', weight: 0.3 }
        ],
        inhibitors: [
            { emotion: 'sadness', weight: 0.5 },
            { emotion: 'anger', weight: 0.5 }
        ]
    },
    {
        expression: 'sad',
        triggers: [{ emotion: 'sadness', weight: 1.0, threshold: 0.4 }],
        inhibitors: [
            { emotion: 'joy', weight: 0.6 },
            { emotion: 'anger', weight: 0.3 }
        ]
    },
    {
        expression: 'angry',
        triggers: [{ emotion: 'anger', weight: 1.0, threshold: 0.5 }],
        inhibitors: [{ emotion: 'joy', weight: 0.4 }]
    },
    {
        expression: 'surprised',
        triggers: [{ emotion: 'surprise', weight: 1.0, threshold: 0.5 }],
        inhibitors: []
    },
    {
        expression: 'focused',
        triggers: [{ emotion: 'interest', weight: 0.7, threshold: 0.5 }],
        inhibitors: [
            { emotion: 'surprise', weight: 0.5 },
            { emotion: 'joy', weight: 0.3 }
        ]
    }
];

function mapEmotionToExpression(emotionalState: Record<string, number>): Expression {
    let bestExpression: Expression = 'neutral';
    let bestScore = 0;

    for (const mapping of EXPRESSION_MAPPINGS) {
        let score = 0;
        let meetsThreshold = false;

        // Calculate trigger score
        for (const trigger of mapping.triggers) {
            const value = emotionalState[trigger.emotion] ?? 0;
            score += value * trigger.weight;
            if (trigger.threshold !== undefined && value >= trigger.threshold) {
                meetsThreshold = true;
            }
        }

        // Apply inhibitors
        if (mapping.inhibitors) {
            for (const inhibitor of mapping.inhibitors) {
                const value = emotionalState[inhibitor.emotion] ?? 0;
                score -= value * inhibitor.weight;
            }
        }

        // Track best expression
        if (meetsThreshold && score > bestScore) {
            bestScore = score;
            bestExpression = mapping.expression as Expression;
        }
    }

    return bestExpression;
}

function getExpressionIntensity(expression: Expression, emotionalState: Record<string, number>): number {
    const values = Object.values(emotionalState);
    return Math.max(...values, 0);
}

// ============================================
// Demo State
// ============================================

const emotionalState: EmotionalState = {
    joy: 0,
    sadness: 0,
    anger: 0,
    fear: 0,
    surprise: 0,
    disgust: 0,
    contempt: 0,
    interest: 0
};

const idleState: IdleState = {
    breathingPhase: 0,
    headTiltX: 0,
    headTiltY: 0,
    eyeLookX: 0,
    eyeLookY: 0,
    blinkState: 0,
    isActive: true
};

const history: ExpressionHistoryEntry[] = [];
let currentExpression: Expression = 'neutral';
let isSpeaking = false;
let idleAnimationRunning = true;
let blinkTimeoutId: number | null = null;
let animationFrameId: number | null = null;
let startTime = Date.now();

// Configuration
const config = {
    breathing: true,
    autoBlink: true,
    microMovements: true,
    blinkInterval: [2000, 6000],
    microMovementInterval: [2000, 5000]
};

// ============================================
// DOM Elements
// ============================================

const elements = {
    avatarFace: document.getElementById('avatar-face') as HTMLElement,
    eyeLeft: document.getElementById('eye-left') as HTMLElement,
    eyeRight: document.getElementById('eye-right') as HTMLElement,
    irisLeft: document.getElementById('iris-left') as HTMLElement,
    irisRight: document.getElementById('iris-right') as HTMLElement,
    eyelidLeft: document.getElementById('eyelid-left') as HTMLElement,
    eyelidRight: document.getElementById('eyelid-right') as HTMLElement,
    eyebrowLeft: document.getElementById('eyebrow-left') as HTMLElement,
    eyebrowRight: document.getElementById('eyebrow-right') as HTMLElement,
    mouth: document.getElementById('mouth') as HTMLElement,
    cheekLeft: document.getElementById('cheek-left') as HTMLElement,
    cheekRight: document.getElementById('cheek-right') as HTMLElement,
    breathingIndicator: document.getElementById('breathing-indicator') as HTMLElement,
    expressionLabel: document.getElementById('expression-label') as HTMLElement,
    intensityLabel: document.getElementById('intensity-label') as HTMLElement,
    historyList: document.getElementById('history-list') as HTMLElement,
    stateDisplay: document.getElementById('state-display') as HTMLElement
};

// ============================================
// Expression Application
// ============================================

function applyExpression(expression: Expression): void {
    // Remove all expression classes
    elements.avatarFace.classList.remove('neutral', 'happy', 'sad', 'angry', 'surprised', 'focused', 'playful', 'empathetic');

    // Add current expression class
    elements.avatarFace.classList.add(expression);

    // Update label
    elements.expressionLabel.textContent = expression;

    // Update intensity
    const intensity = getExpressionIntensity(expression, emotionalState);
    elements.intensityLabel.textContent = `${Math.round(intensity * 100)}%`;

    // Track if expression changed
    if (expression !== currentExpression) {
        currentExpression = expression;
        addToHistory(expression);
    }
}

function addToHistory(expression: Expression): void {
    const entry: ExpressionHistoryEntry = {
        expression,
        timestamp: new Date()
    };

    history.unshift(entry);
    if (history.length > 10) history.pop();

    updateHistoryDisplay();
}

function updateHistoryDisplay(): void {
    elements.historyList.innerHTML = history.map(entry => {
        const time = entry.timestamp.toLocaleTimeString();
        return `
            <div class="history-item">
                <span class="history-time">${time}</span>
                <span class="history-expression">${entry.expression}</span>
            </div>
        `;
    }).join('');
}

function updateStateDisplay(): void {
    const state = {
        expression: currentExpression,
        emotions: emotionalState,
        idle: {
            breathing: idleState.breathingPhase.toFixed(2),
            eyeLook: { x: idleState.eyeLookX.toFixed(2), y: idleState.eyeLookY.toFixed(2) },
            headTilt: { x: idleState.headTiltX.toFixed(2), y: idleState.headTiltY.toFixed(2) },
            blinking: idleState.blinkState > 0
        },
        isSpeaking
    };

    elements.stateDisplay.textContent = JSON.stringify(state, null, 2);
}

// ============================================
// Idle Animation
// ============================================

function startIdleAnimation(): void {
    if (animationFrameId !== null) return;

    idleAnimationRunning = true;
    idleState.isActive = true;
    startTime = Date.now();

    if (config.autoBlink) {
        scheduleNextBlink();
    }

    function animate() {
        if (!idleAnimationRunning) return;

        const elapsed = Date.now() - startTime;

        // Breathing animation
        if (config.breathing) {
            idleState.breathingPhase = (Math.sin(elapsed / 3500 * Math.PI * 2) + 1) / 2;
            updateBreathingVisual();
        }

        // Eye following (subtle random movement)
        if (config.microMovements) {
            const eyePhase = elapsed / 8000;
            idleState.eyeLookX = Math.sin(eyePhase * Math.PI * 2) * 0.15;
            idleState.eyeLookY = Math.cos(eyePhase * Math.PI * 2 * 0.7) * 0.1;
            updateEyePosition();
        }

        updateStateDisplay();
        animationFrameId = requestAnimationFrame(animate);
    }

    animationFrameId = requestAnimationFrame(animate);
}

function stopIdleAnimation(): void {
    idleAnimationRunning = false;
    idleState.isActive = false;

    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    if (blinkTimeoutId !== null) {
        clearTimeout(blinkTimeoutId);
        blinkTimeoutId = null;
    }
}

function updateBreathingVisual(): void {
    const scale = 1 + idleState.breathingPhase * 0.02;
    elements.avatarFace.style.transform = `scale(${scale})`;

    const indicatorOpacity = 0.3 + idleState.breathingPhase * 0.5;
    const indicatorScale = 0.8 + idleState.breathingPhase * 0.4;
    elements.breathingIndicator.style.opacity = String(indicatorOpacity);
    elements.breathingIndicator.style.transform = `translateX(-50%) scaleX(${indicatorScale})`;
}

function updateEyePosition(): void {
    const offsetX = idleState.eyeLookX * 5;
    const offsetY = idleState.eyeLookY * 3;

    elements.irisLeft.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
    elements.irisRight.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
}

function scheduleNextBlink(): void {
    if (!idleAnimationRunning || !config.autoBlink) return;

    const [min, max] = config.blinkInterval;
    const delay = min + Math.random() * (max - min);

    blinkTimeoutId = window.setTimeout(() => {
        performBlink();
        scheduleNextBlink();
    }, delay);
}

function performBlink(): void {
    idleState.blinkState = 1;
    elements.eyelidLeft.classList.add('blinking');
    elements.eyelidRight.classList.add('blinking');

    setTimeout(() => {
        idleState.blinkState = 0;
        elements.eyelidLeft.classList.remove('blinking');
        elements.eyelidRight.classList.remove('blinking');
    }, 150);
}

// ============================================
// Speaking Animation
// ============================================

function setSpeaking(speaking: boolean): void {
    isSpeaking = speaking;

    if (speaking) {
        elements.mouth.classList.add('speaking');
    } else {
        elements.mouth.classList.remove('speaking');
    }
}

// ============================================
// Motion Animations
// ============================================

function performMotion(motion: string): void {
    const avatar = elements.avatarFace.parentElement as HTMLElement;

    switch (motion) {
        case 'nod':
            avatar.animate([
                { transform: 'rotate(0deg)' },
                { transform: 'rotate(-8deg)' },
                { transform: 'rotate(0deg)' },
                { transform: 'rotate(-8deg)' },
                { transform: 'rotate(0deg)' }
            ], { duration: 600, easing: 'ease-out' });
            break;

        case 'shake':
            avatar.animate([
                { transform: 'rotate(0deg)' },
                { transform: 'rotate(8deg)' },
                { transform: 'rotate(-8deg)' },
                { transform: 'rotate(8deg)' },
                { transform: 'rotate(-8deg)' },
                { transform: 'rotate(0deg)' }
            ], { duration: 500, easing: 'ease-out' });
            break;

        case 'tilt':
            avatar.animate([
                { transform: 'rotate(0deg)' },
                { transform: 'rotate(12deg)' },
                { transform: 'rotate(12deg)' },
                { transform: 'rotate(0deg)' }
            ], { duration: 1000, easing: 'ease-in-out' });
            break;

        case 'bounce':
            avatar.animate([
                { transform: 'translateY(0)' },
                { transform: 'translateY(-15px)' },
                { transform: 'translateY(0)' },
                { transform: 'translateY(-10px)' },
                { transform: 'translateY(0)' }
            ], { duration: 500, easing: 'ease-out' });
            break;
    }
}

// ============================================
// Preset Emotions
// ============================================

const presets: Record<string, Partial<EmotionalState>> = {
    happy: { joy: 0.8, interest: 0.4 },
    sad: { sadness: 0.7 },
    angry: { anger: 0.8 },
    surprised: { surprise: 0.9 },
    focused: { interest: 0.8 },
    neutral: {}
};

function applyPreset(preset: string): void {
    // Reset all emotions
    Object.keys(emotionalState).forEach(key => {
        (emotionalState as any)[key] = 0;
    });

    // Apply preset values
    const presetValues = presets[preset] || {};
    Object.entries(presetValues).forEach(([key, value]) => {
        (emotionalState as any)[key] = value;
    });

    // Update sliders
    updateSliderValues();

    // Update expression
    const expression = mapEmotionToExpression(emotionalState);
    applyExpression(expression);
}

function updateSliderValues(): void {
    Object.entries(emotionalState).forEach(([emotion, value]) => {
        const slider = document.querySelector(`[data-emotion="${emotion}"]`) as HTMLInputElement;
        const valueLabel = document.getElementById(`${emotion}-value`);

        if (slider) {
            slider.value = String(value * 100);
        }
        if (valueLabel) {
            valueLabel.textContent = `${Math.round(value * 100)}%`;
        }
    });
}

// ============================================
// Event Handlers
// ============================================

function setupEventListeners(): void {
    // Emotion sliders
    document.querySelectorAll('.emotion-slider').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            const emotion = target.dataset.emotion as keyof EmotionalState;
            const value = parseInt(target.value) / 100;

            emotionalState[emotion] = value;

            // Update value label
            const valueLabel = document.getElementById(`${emotion}-value`);
            if (valueLabel) {
                valueLabel.textContent = `${target.value}%`;
            }

            // Update expression
            const expression = mapEmotionToExpression(emotionalState);
            applyExpression(expression);
        });
    });

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const preset = target.dataset.preset;
            if (preset) {
                applyPreset(preset);
            }
        });
    });

    // Idle toggle
    document.getElementById('idle-toggle')?.addEventListener('change', (e) => {
        const checked = (e.target as HTMLInputElement).checked;
        if (checked) {
            startIdleAnimation();
        } else {
            stopIdleAnimation();
        }
    });

    // Breathing toggle
    document.getElementById('breathing-toggle')?.addEventListener('change', (e) => {
        config.breathing = (e.target as HTMLInputElement).checked;
    });

    // Blink toggle
    document.getElementById('blink-toggle')?.addEventListener('change', (e) => {
        config.autoBlink = (e.target as HTMLInputElement).checked;
        if (config.autoBlink && idleAnimationRunning) {
            scheduleNextBlink();
        }
    });

    // Micro movements toggle
    document.getElementById('micro-toggle')?.addEventListener('change', (e) => {
        config.microMovements = (e.target as HTMLInputElement).checked;
    });

    // Manual blink button
    document.getElementById('manual-blink-btn')?.addEventListener('click', () => {
        performBlink();
    });

    // Speaking toggle
    document.getElementById('speaking-btn')?.addEventListener('click', () => {
        setSpeaking(!isSpeaking);
    });

    // Motion buttons
    document.querySelectorAll('.motion-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const motion = target.dataset.motion;
            if (motion) {
                performMotion(motion);
            }
        });
    });
}

// ============================================
// Initialization
// ============================================

function init(): void {
    console.log('🌳 Deep Tree Echo Avatar Demo Initialized');

    setupEventListeners();
    startIdleAnimation();

    // Initial expression
    applyExpression('neutral');
    addToHistory('neutral');
    updateStateDisplay();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
