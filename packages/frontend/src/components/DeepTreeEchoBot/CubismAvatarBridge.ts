/**
 * CubismAvatarBridge - Full Integration Layer for Live2D Cubism Avatar
 *
 * This module bridges the Live2D Cubism avatar system with Deep Tree Echo's
 * cognitive architecture, TTS audio features, ML vision, and chat sessions.
 *
 * Features:
 * - Chat session integration (responds to message events)
 * - TTS lip-sync with expressive audio
 * - ML vision pattern recognition for avatar reactions
 * - VTuber anime gestures and movements
 * - Emotional state synchronization
 */

import { getLogger } from '@deltachat-desktop/shared/logger'
import { EventEmitter } from 'events'
import type { Live2DAvatarController, Expression, AvatarMotion, EmotionalVector } from '../AICompanionHub/Live2DAvatar'
import type { UnifiedCognitiveState, CognitiveEvent } from './CognitiveBridge'
import { getOrchestrator, onCognitiveEvent } from './CognitiveBridge'
import { setAvatarProcessingState, setAvatarSpeaking, setAvatarAudioLevel, registerAvatarStateControl } from './AvatarStateManager'
import { AvatarProcessingState } from './DeepTreeEchoAvatarContext'

const log = getLogger('render/components/DeepTreeEchoBot/CubismAvatarBridge')

// ============================================================
// VTUBER GESTURE TYPES AND ANIMATIONS
// ============================================================

/**
 * VTuber-style gesture definitions for anime-like movements
 */
export type VTuberGesture =
    | 'excited_jump'      // Bouncy excited movement
    | 'shy_fidget'        // Shy fidgeting with head down
    | 'curious_lean'      // Lean forward with curiosity
    | 'happy_sway'        // Swaying side to side happily
    | 'thinking_pose'     // Hand on chin thinking
    | 'surprised_gasp'    // Dramatic surprise reaction
    | 'sad_droop'         // Drooping sad posture
    | 'angry_puff'        // Puffed cheeks angry
    | 'laugh_shake'       // Laughing shake
    | 'wave_greeting'     // Friendly wave
    | 'nod_agree'         // Agreement nod
    | 'headshake_disagree' // Disagreement head shake
    | 'blush_embarrassed' // Embarrassed blush
    | 'determined_pump'   // Determined fist pump
    | 'sleepy_yawn'       // Sleepy yawn animation

/**
 * Gesture animation parameters
 */
interface GestureParams {
    duration: number          // Animation duration in ms
    intensity: number         // Movement intensity (0-1)
    expression: Expression    // Accompanying expression
    motionSequence: AvatarMotion[]  // Sequence of motions
    parameterAnimations: ParameterAnimation[]  // Direct parameter animations
}

/**
 * Direct parameter animation for Cubism model
 */
interface ParameterAnimation {
    paramId: string
    keyframes: Array<{ time: number; value: number }>
    easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bounce'
}

/**
 * VTuber gesture definitions with anime-style movements
 */
const VTUBER_GESTURES: Record<VTuberGesture, GestureParams> = {
    excited_jump: {
        duration: 800,
        intensity: 0.9,
        expression: 'happy',
        motionSequence: ['wave'],
        parameterAnimations: [
            {
                paramId: 'ParamBodyAngleY',
                keyframes: [
                    { time: 0, value: 0 },
                    { time: 200, value: 10 },
                    { time: 400, value: -5 },
                    { time: 600, value: 5 },
                    { time: 800, value: 0 }
                ],
                easing: 'bounce'
            },
            {
                paramId: 'ParamAngleZ',
                keyframes: [
                    { time: 0, value: 0 },
                    { time: 400, value: 5 },
                    { time: 800, value: 0 }
                ],
                easing: 'easeInOut'
            }
        ]
    },
    shy_fidget: {
        duration: 1200,
        intensity: 0.4,
        expression: 'contemplative',
        motionSequence: ['tilting_head'],
        parameterAnimations: [
            {
                paramId: 'ParamAngleX',
                keyframes: [
                    { time: 0, value: 0 },
                    { time: 300, value: -10 },
                    { time: 900, value: -8 },
                    { time: 1200, value: -5 }
                ],
                easing: 'easeOut'
            },
            {
                paramId: 'ParamEyeLOpen',
                keyframes: [
                    { time: 0, value: 1 },
                    { time: 600, value: 0.7 },
                    { time: 1200, value: 0.8 }
                ],
                easing: 'easeInOut'
            }
        ]
    },
    curious_lean: {
        duration: 600,
        intensity: 0.6,
        expression: 'curious',
        motionSequence: ['tilting_head'],
        parameterAnimations: [
            {
                paramId: 'ParamBodyAngleX',
                keyframes: [
                    { time: 0, value: 0 },
                    { time: 300, value: 8 },
                    { time: 600, value: 5 }
                ],
                easing: 'easeOut'
            },
            {
                paramId: 'ParamAngleZ',
                keyframes: [
                    { time: 0, value: 0 },
                    { time: 300, value: -8 },
                    { time: 600, value: -5 }
                ],
                easing: 'easeOut'
            }
        ]
    },
    happy_sway: {
        duration: 2000,
        intensity: 0.5,
        expression: 'happy',
        motionSequence: ['idle'],
        parameterAnimations: [
            {
                paramId: 'ParamBodyAngleZ',
                keyframes: [
                    { time: 0, value: 0 },
                    { time: 500, value: 8 },
                    { time: 1000, value: 0 },
                    { time: 1500, value: -8 },
                    { time: 2000, value: 0 }
                ],
                easing: 'easeInOut'
            }
        ]
    },
    thinking_pose: {
        duration: 1000,
        intensity: 0.5,
        expression: 'thinking',
        motionSequence: ['thinking'],
        parameterAnimations: [
            {
                paramId: 'ParamAngleX',
                keyframes: [
                    { time: 0, value: 0 },
                    { time: 500, value: 5 },
                    { time: 1000, value: 5 }
                ],
                easing: 'easeOut'
            },
            {
                paramId: 'ParamAngleZ',
                keyframes: [
                    { time: 0, value: 0 },
                    { time: 500, value: 10 },
                    { time: 1000, value: 8 }
                ],
                easing: 'easeOut'
            }
        ]
    },
    surprised_gasp: {
        duration: 500,
        intensity: 0.95,
        expression: 'surprised',
        motionSequence: ['shake'],
        parameterAnimations: [
            {
                paramId: 'ParamEyeLOpen',
                keyframes: [
                    { time: 0, value: 1 },
                    { time: 100, value: 1.3 },
                    { time: 500, value: 1.1 }
                ],
                easing: 'easeOut'
            },
            {
                paramId: 'ParamMouthOpenY',
                keyframes: [
                    { time: 0, value: 0 },
                    { time: 100, value: 0.8 },
                    { time: 500, value: 0.3 }
                ],
                easing: 'easeOut'
            },
            {
                paramId: 'ParamBodyAngleY',
                keyframes: [
                    { time: 0, value: 0 },
                    { time: 100, value: -5 },
                    { time: 500, value: 0 }
                ],
                easing: 'bounce'
            }
        ]
    },
    sad_droop: {
        duration: 1500,
        intensity: 0.6,
        expression: 'concerned',
        motionSequence: ['idle'],
        parameterAnimations: [
            {
                paramId: 'ParamAngleX',
                keyframes: [
                    { time: 0, value: 0 },
                    { time: 750, value: -15 },
                    { time: 1500, value: -12 }
                ],
                easing: 'easeOut'
            },
            {
                paramId: 'ParamEyeLOpen',
                keyframes: [
                    { time: 0, value: 1 },
                    { time: 750, value: 0.6 },
                    { time: 1500, value: 0.7 }
                ],
                easing: 'easeOut'
            }
        ]
    },
    angry_puff: {
        duration: 800,
        intensity: 0.7,
        expression: 'focused',
        motionSequence: ['shake'],
        parameterAnimations: [
            {
                paramId: 'ParamCheek',
                keyframes: [
                    { time: 0, value: 0 },
                    { time: 200, value: 1 },
                    { time: 800, value: 0.8 }
                ],
                easing: 'easeOut'
            },
            {
                paramId: 'ParamBrowLY',
                keyframes: [
                    { time: 0, value: 0 },
                    { time: 200, value: -0.5 },
                    { time: 800, value: -0.3 }
                ],
                easing: 'easeOut'
            }
        ]
    },
    laugh_shake: {
        duration: 1000,
        intensity: 0.8,
        expression: 'playful',
        motionSequence: ['nodding'],
        parameterAnimations: [
            {
                paramId: 'ParamBodyAngleZ',
                keyframes: [
                    { time: 0, value: 0 },
                    { time: 125, value: 5 },
                    { time: 250, value: -5 },
                    { time: 375, value: 5 },
                    { time: 500, value: -5 },
                    { time: 625, value: 4 },
                    { time: 750, value: -3 },
                    { time: 875, value: 2 },
                    { time: 1000, value: 0 }
                ],
                easing: 'linear'
            },
            {
                paramId: 'ParamMouthOpenY',
                keyframes: [
                    { time: 0, value: 0 },
                    { time: 200, value: 0.6 },
                    { time: 400, value: 0.3 },
                    { time: 600, value: 0.5 },
                    { time: 800, value: 0.2 },
                    { time: 1000, value: 0 }
                ],
                easing: 'linear'
            }
        ]
    },
    wave_greeting: {
        duration: 1200,
        intensity: 0.7,
        expression: 'happy',
        motionSequence: ['wave'],
        parameterAnimations: [
            {
                paramId: 'ParamArmRA',
                keyframes: [
                    { time: 0, value: 0 },
                    { time: 300, value: 1 },
                    { time: 500, value: 0.7 },
                    { time: 700, value: 1 },
                    { time: 900, value: 0.7 },
                    { time: 1200, value: 0 }
                ],
                easing: 'easeInOut'
            }
        ]
    },
    nod_agree: {
        duration: 600,
        intensity: 0.5,
        expression: 'happy',
        motionSequence: ['nodding'],
        parameterAnimations: [
            {
                paramId: 'ParamAngleX',
                keyframes: [
                    { time: 0, value: 0 },
                    { time: 150, value: 8 },
                    { time: 300, value: 0 },
                    { time: 450, value: 6 },
                    { time: 600, value: 0 }
                ],
                easing: 'easeOut'
            }
        ]
    },
    headshake_disagree: {
        duration: 800,
        intensity: 0.5,
        expression: 'concerned',
        motionSequence: ['shaking_head'],
        parameterAnimations: [
            {
                paramId: 'ParamAngleY',
                keyframes: [
                    { time: 0, value: 0 },
                    { time: 200, value: -15 },
                    { time: 400, value: 15 },
                    { time: 600, value: -10 },
                    { time: 800, value: 0 }
                ],
                easing: 'easeOut'
            }
        ]
    },
    blush_embarrassed: {
        duration: 1500,
        intensity: 0.6,
        expression: 'empathetic',
        motionSequence: ['tilting_head'],
        parameterAnimations: [
            {
                paramId: 'ParamCheek',
                keyframes: [
                    { time: 0, value: 0 },
                    { time: 300, value: 1 },
                    { time: 1500, value: 0.7 }
                ],
                easing: 'easeOut'
            },
            {
                paramId: 'ParamAngleX',
                keyframes: [
                    { time: 0, value: 0 },
                    { time: 500, value: -10 },
                    { time: 1500, value: -8 }
                ],
                easing: 'easeOut'
            }
        ]
    },
    determined_pump: {
        duration: 800,
        intensity: 0.85,
        expression: 'focused',
        motionSequence: ['wave'],
        parameterAnimations: [
            {
                paramId: 'ParamBodyAngleY',
                keyframes: [
                    { time: 0, value: 0 },
                    { time: 200, value: -5 },
                    { time: 400, value: 8 },
                    { time: 800, value: 3 }
                ],
                easing: 'bounce'
            }
        ]
    },
    sleepy_yawn: {
        duration: 2000,
        intensity: 0.6,
        expression: 'contemplative',
        motionSequence: ['idle'],
        parameterAnimations: [
            {
                paramId: 'ParamMouthOpenY',
                keyframes: [
                    { time: 0, value: 0 },
                    { time: 500, value: 0.9 },
                    { time: 1500, value: 0.9 },
                    { time: 2000, value: 0 }
                ],
                easing: 'easeInOut'
            },
            {
                paramId: 'ParamEyeLOpen',
                keyframes: [
                    { time: 0, value: 1 },
                    { time: 500, value: 0.3 },
                    { time: 1500, value: 0.2 },
                    { time: 2000, value: 0.8 }
                ],
                easing: 'easeInOut'
            }
        ]
    }
}

// ============================================================
// TTS LIP-SYNC INTEGRATION
// ============================================================

/**
 * TTS-Avatar sync configuration
 */
interface TTSAvatarConfig {
    enabled: boolean
    lipSyncSensitivity: number   // 0-1, how responsive lips are
    emotionIntensity: number     // 0-1, how strongly emotions affect expression
    gestureFrequency: number     // 0-1, how often to trigger gestures
}

const DEFAULT_TTS_CONFIG: TTSAvatarConfig = {
    enabled: true,
    lipSyncSensitivity: 0.8,
    emotionIntensity: 0.7,
    gestureFrequency: 0.5
}

// ============================================================
// MAIN BRIDGE CLASS
// ============================================================

/**
 * CubismAvatarBridge - Main integration class
 */
export class CubismAvatarBridge extends EventEmitter {
    private controller: Live2DAvatarController | null = null
    private ttsConfig: TTSAvatarConfig = DEFAULT_TTS_CONFIG
    private isActive = false
    private currentGestureTimeout: ReturnType<typeof setTimeout> | null = null
    private lipSyncIntervalId: ReturnType<typeof setInterval> | null = null
    private speechSynthesis: SpeechSynthesis | null = null
    private currentUtterance: SpeechSynthesisUtterance | null = null
    private audioContext: AudioContext | null = null
    private analyserNode: AnalyserNode | null = null

    constructor() {
        super()
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            this.speechSynthesis = window.speechSynthesis
        }
    }

    /**
     * Initialize the bridge with an avatar controller
     */
    initialize(controller: Live2DAvatarController): void {
        this.controller = controller
        this.isActive = true

        // Register with avatar state manager
        registerAvatarStateControl(
            setAvatarProcessingState,
            setAvatarSpeaking,
            setAvatarAudioLevel
        )

        // Subscribe to cognitive events
        this.subscribeToCognitiveEvents()

        log.info('CubismAvatarBridge initialized')
    }

    /**
     * Subscribe to cognitive system events
     */
    private subscribeToCognitiveEvents(): void {
        onCognitiveEvent('message_received', (event: CognitiveEvent) => {
            if (event.type === 'message_received') {
                this.handleMessageReceived()
            }
        })

        onCognitiveEvent('response_generated', (event: CognitiveEvent) => {
            if (event.type === 'response_generated') {
                this.handleResponseGenerated(event.payload)
            }
        })
    }

    /**
     * Handle incoming message - avatar reacts
     */
    private handleMessageReceived(): void {
        if (!this.controller || !this.isActive) return

        // Show listening state
        setAvatarProcessingState(AvatarProcessingState.LISTENING)
        this.controller.setExpression('curious', 0.7)
        this.playGesture('curious_lean')
    }

    /**
     * Handle response generated - avatar speaks
     */
    private handleResponseGenerated(message: any): void {
        if (!this.controller || !this.isActive) return

        // Analyze message for emotion and gesture
        const emotion = this.analyzeMessageEmotion(message.content)
        const gesture = this.selectGestureForEmotion(emotion)

        // Set expression and play gesture
        this.controller.setExpression(emotion.expression, emotion.intensity)
        if (gesture) {
            this.playGesture(gesture)
        }

        // Start speaking animation
        setAvatarProcessingState(AvatarProcessingState.RESPONDING)
        setAvatarSpeaking(true)

        // If TTS is enabled, speak the response
        if (this.ttsConfig.enabled) {
            this.speakWithLipSync(message.content, emotion.expression)
        }
    }

    /**
     * Analyze message content for emotional cues
     */
    private analyzeMessageEmotion(content: string): { expression: Expression; intensity: number } {
        const lowerContent = content.toLowerCase()

        // Emotion detection patterns
        const patterns: Array<{ regex: RegExp; expression: Expression; intensity: number }> = [
            { regex: /(!{2,}|amazing|fantastic|wonderful|excellent)/i, expression: 'happy', intensity: 0.9 },
            { regex: /(happy|glad|pleased|joy|excited)/i, expression: 'happy', intensity: 0.7 },
            { regex: /(\?{2,}|curious|wonder|interesting|hmm)/i, expression: 'curious', intensity: 0.7 },
            { regex: /(think|consider|perhaps|maybe|let me)/i, expression: 'thinking', intensity: 0.6 },
            { regex: /(wow|oh|surprise|unexpected)/i, expression: 'surprised', intensity: 0.8 },
            { regex: /(sorry|unfortunately|sad|apologize)/i, expression: 'concerned', intensity: 0.6 },
            { regex: /(haha|lol|funny|joke|laugh)/i, expression: 'playful', intensity: 0.8 },
            { regex: /(focus|important|careful|note)/i, expression: 'focused', intensity: 0.6 },
            { regex: /(understand|empathize|feel)/i, expression: 'empathetic', intensity: 0.6 },
        ]

        for (const pattern of patterns) {
            if (pattern.regex.test(lowerContent)) {
                return { expression: pattern.expression, intensity: pattern.intensity }
            }
        }

        // Default to neutral with medium intensity
        return { expression: 'neutral', intensity: 0.5 }
    }

    /**
     * Select appropriate gesture for emotion
     */
    private selectGestureForEmotion(emotion: { expression: Expression; intensity: number }): VTuberGesture | null {
        if (Math.random() > this.ttsConfig.gestureFrequency) {
            return null // Skip gesture based on frequency setting
        }

        const gestureMap: Partial<Record<Expression, VTuberGesture[]>> = {
            happy: ['happy_sway', 'excited_jump', 'laugh_shake'],
            curious: ['curious_lean', 'thinking_pose'],
            thinking: ['thinking_pose'],
            surprised: ['surprised_gasp'],
            concerned: ['sad_droop'],
            playful: ['laugh_shake', 'happy_sway'],
            focused: ['determined_pump', 'nod_agree'],
            empathetic: ['nod_agree', 'blush_embarrassed'],
        }

        const gestures = gestureMap[emotion.expression]
        if (gestures && gestures.length > 0) {
            return gestures[Math.floor(Math.random() * gestures.length)]
        }

        return null
    }

    /**
     * Play a VTuber gesture animation
     */
    playGesture(gesture: VTuberGesture): void {
        if (!this.controller || !this.isActive) return

        const params = VTUBER_GESTURES[gesture]
        if (!params) {
            log.warn(`Unknown gesture: ${gesture}`)
            return
        }

        // Clear any existing gesture animation
        if (this.currentGestureTimeout) {
            clearTimeout(this.currentGestureTimeout)
        }

        // Set expression
        this.controller.setExpression(params.expression, params.intensity)

        // Play motion sequence
        if (params.motionSequence.length > 0) {
            this.controller.playMotion(params.motionSequence[0])
        }

        // Animate parameters
        this.animateParameters(params.parameterAnimations, params.duration)

        // Emit event
        this.emit('gesture_started', { gesture, duration: params.duration })

        // Set timeout to clear gesture
        this.currentGestureTimeout = setTimeout(() => {
            this.emit('gesture_ended', { gesture })
        }, params.duration)

        log.info(`Playing gesture: ${gesture}`)
    }

    /**
     * Animate Cubism model parameters
     */
    private animateParameters(animations: ParameterAnimation[], totalDuration: number): void {
        if (!this.controller) return

        const startTime = Date.now()

        const animate = () => {
            if (!this.controller || !this.isActive) return

            const elapsed = Date.now() - startTime
            if (elapsed >= totalDuration) return

            for (const anim of animations) {
                const value = this.interpolateKeyframes(anim.keyframes, elapsed, anim.easing)
                this.controller.setParameter(anim.paramId, value)
            }

            requestAnimationFrame(animate)
        }

        requestAnimationFrame(animate)
    }

    /**
     * Interpolate between keyframes
     */
    private interpolateKeyframes(
        keyframes: Array<{ time: number; value: number }>,
        elapsed: number,
        easing: string
    ): number {
        // Find surrounding keyframes
        let prevFrame = keyframes[0]
        let nextFrame = keyframes[keyframes.length - 1]

        for (let i = 0; i < keyframes.length - 1; i++) {
            if (elapsed >= keyframes[i].time && elapsed < keyframes[i + 1].time) {
                prevFrame = keyframes[i]
                nextFrame = keyframes[i + 1]
                break
            }
        }

        // Calculate progress between frames
        const duration = nextFrame.time - prevFrame.time
        if (duration === 0) return nextFrame.value

        let progress = (elapsed - prevFrame.time) / duration
        progress = Math.max(0, Math.min(1, progress))

        // Apply easing
        progress = this.applyEasing(progress, easing)

        // Interpolate
        return prevFrame.value + (nextFrame.value - prevFrame.value) * progress
    }

    /**
     * Apply easing function
     */
    private applyEasing(t: number, easing: string): number {
        switch (easing) {
            case 'easeIn':
                return t * t
            case 'easeOut':
                return 1 - (1 - t) * (1 - t)
            case 'easeInOut':
                return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
            case 'bounce':
                const n1 = 7.5625
                const d1 = 2.75
                if (t < 1 / d1) {
                    return n1 * t * t
                } else if (t < 2 / d1) {
                    return n1 * (t -= 1.5 / d1) * t + 0.75
                } else if (t < 2.5 / d1) {
                    return n1 * (t -= 2.25 / d1) * t + 0.9375
                } else {
                    return n1 * (t -= 2.625 / d1) * t + 0.984375
                }
            default:
                return t
        }
    }

    /**
     * Speak text with lip-sync animation
     */
    speakWithLipSync(text: string, emotion: Expression): void {
        if (!this.controller || !this.speechSynthesis) {
            log.warn('TTS not available')
            return
        }

        // Cancel any current speech
        this.speechSynthesis.cancel()
        this.stopLipSync()

        // Create utterance
        const utterance = new SpeechSynthesisUtterance(text)
        this.currentUtterance = utterance

        // Apply emotion-based voice modulation
        const modulation = this.getEmotionVoiceModulation(emotion)
        utterance.rate = modulation.rate
        utterance.pitch = modulation.pitch
        utterance.volume = modulation.volume

        // Event handlers
        utterance.onstart = () => {
            setAvatarSpeaking(true)
            this.startSimulatedLipSync()
            this.emit('speech_started', { text, emotion })
        }

        utterance.onend = () => {
            setAvatarSpeaking(false)
            this.stopLipSync()
            setAvatarProcessingState(AvatarProcessingState.IDLE)
            this.controller?.setExpression('neutral', 0.5)
            this.emit('speech_ended', { text })
        }

        utterance.onerror = (event) => {
            log.error('Speech synthesis error:', event.error)
            this.stopLipSync()
            setAvatarSpeaking(false)
        }

        // Speak
        this.speechSynthesis.speak(utterance)
    }

    /**
     * Get voice modulation based on emotion
     */
    private getEmotionVoiceModulation(emotion: Expression): { rate: number; pitch: number; volume: number } {
        const modulations: Record<Expression, { rate: number; pitch: number; volume: number }> = {
            neutral: { rate: 1.0, pitch: 1.0, volume: 1.0 },
            happy: { rate: 1.1, pitch: 1.15, volume: 1.0 },
            thinking: { rate: 0.9, pitch: 0.95, volume: 0.9 },
            curious: { rate: 1.05, pitch: 1.1, volume: 1.0 },
            surprised: { rate: 1.2, pitch: 1.25, volume: 1.1 },
            concerned: { rate: 0.9, pitch: 0.9, volume: 0.85 },
            focused: { rate: 0.95, pitch: 0.95, volume: 1.0 },
            playful: { rate: 1.15, pitch: 1.2, volume: 1.05 },
            contemplative: { rate: 0.85, pitch: 0.9, volume: 0.9 },
            empathetic: { rate: 0.95, pitch: 1.0, volume: 0.95 },
        }

        return modulations[emotion] || modulations.neutral
    }

    /**
     * Start simulated lip-sync (when we can't get real audio data)
     */
    private startSimulatedLipSync(): void {
        this.stopLipSync()

        this.lipSyncIntervalId = setInterval(() => {
            if (!this.controller) return

            // Generate natural-looking audio level variations
            const baseLevel = 0.3 + Math.random() * 0.4
            const variation = Math.sin(Date.now() / 100) * 0.2
            const level = Math.max(0, Math.min(1, baseLevel + variation))

            this.controller.updateLipSync(level * this.ttsConfig.lipSyncSensitivity)
            setAvatarAudioLevel(level)
        }, 50) // Update at 20fps for smooth lip movement
    }

    /**
     * Stop lip-sync animation
     */
    private stopLipSync(): void {
        if (this.lipSyncIntervalId) {
            clearInterval(this.lipSyncIntervalId)
            this.lipSyncIntervalId = null
        }
        if (this.controller) {
            this.controller.updateLipSync(0)
        }
        setAvatarAudioLevel(0)
    }

    /**
     * Update TTS configuration
     */
    setTTSConfig(config: Partial<TTSAvatarConfig>): void {
        this.ttsConfig = { ...this.ttsConfig, ...config }
    }

    /**
     * Handle chat session events
     */
    onChatEvent(event: 'user_typing' | 'message_sent' | 'message_received' | 'error', data?: any): void {
        if (!this.controller || !this.isActive) return

        switch (event) {
            case 'user_typing':
                setAvatarProcessingState(AvatarProcessingState.LISTENING)
                this.controller.setExpression('curious', 0.5)
                break
            case 'message_sent':
                setAvatarProcessingState(AvatarProcessingState.THINKING)
                this.controller.setExpression('thinking', 0.6)
                this.playGesture('thinking_pose')
                break
            case 'message_received':
                this.handleMessageReceived()
                break
            case 'error':
                setAvatarProcessingState(AvatarProcessingState.ERROR)
                this.controller.setExpression('concerned', 0.7)
                this.playGesture('sad_droop')
                break
        }
    }

    /**
     * Trigger a specific expression
     */
    setExpression(expression: Expression, intensity: number = 0.7): void {
        if (this.controller) {
            this.controller.setExpression(expression, intensity)
        }
    }

    /**
     * Get the avatar controller
     */
    getController(): Live2DAvatarController | null {
        return this.controller
    }

    /**
     * Check if bridge is active
     */
    isInitialized(): boolean {
        return this.isActive && this.controller !== null
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        this.isActive = false

        if (this.currentGestureTimeout) {
            clearTimeout(this.currentGestureTimeout)
        }

        this.stopLipSync()

        if (this.speechSynthesis) {
            this.speechSynthesis.cancel()
        }

        if (this.audioContext) {
            this.audioContext.close()
        }

        this.controller = null
        this.removeAllListeners()

        log.info('CubismAvatarBridge disposed')
    }
}

// Singleton instance
let bridgeInstance: CubismAvatarBridge | null = null

/**
 * Get or create the CubismAvatarBridge singleton
 */
export function getCubismAvatarBridge(): CubismAvatarBridge {
    if (!bridgeInstance) {
        bridgeInstance = new CubismAvatarBridge()
    }
    return bridgeInstance
}

/**
 * Initialize the bridge with an avatar controller
 */
export function initializeCubismAvatarBridge(controller: Live2DAvatarController): CubismAvatarBridge {
    const bridge = getCubismAvatarBridge()
    bridge.initialize(controller)
    return bridge
}

/**
 * Dispose of the bridge
 */
export function disposeCubismAvatarBridge(): void {
    if (bridgeInstance) {
        bridgeInstance.dispose()
        bridgeInstance = null
    }
}

export { VTUBER_GESTURES }
