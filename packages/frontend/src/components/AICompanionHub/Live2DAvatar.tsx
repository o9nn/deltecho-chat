/**
 * Live2D Avatar React Component
 *
 * A React wrapper for the Live2D avatar system that integrates
 * with the AI Companion Hub to display an animated avatar.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { ResponsiveSpriteAvatar } from './ResponsiveSpriteAvatar'

// Local types that are compatible with both @deltecho/avatar and @deltecho/cognitive
export type Expression =
    | 'neutral'
    | 'happy'
    | 'thinking'
    | 'curious'
    | 'surprised'
    | 'concerned'
    | 'focused'
    | 'playful'
    | 'contemplative'
    | 'empathetic'

export type AvatarMotion =
    | 'idle'
    | 'talking'
    | 'nodding'
    | 'shaking_head'
    | 'tilting_head'
    | 'tilt_head_left'
    | 'tilt_head_right'
    | 'breathing'
    | 'wave'
    | 'nod'
    | 'shake'
    | 'thinking'

// Flexible emotional vector that accepts any emotion mapping
// Compatible with both @deltecho/cognitive and @deltecho/avatar types
export type EmotionalVector = Record<string, number | string | undefined>

// Controller interface for external control of the avatar
export interface Live2DAvatarController {
    setExpression: (expression: Expression, intensity?: number) => void
    playMotion: (motion: AvatarMotion) => void
    updateLipSync: (audioLevel: number) => void
    triggerBlink: () => void
    setParameter: (paramId: string, value: number) => void
}

// CDN-hosted sample models for demo
const CDN_MODELS = {
    miara: '/static/models/miara/miara_pro_t03.model3.json',
    shizuku: 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.model.json',
    haru: 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json',
}

export interface Live2DAvatarComponentProps {
    /** Model URL or preset name ('shizuku' | 'haru') */
    model?: string
    /** Width in pixels */
    width?: number
    /** Height in pixels */
    height?: number
    /** Scale factor for the model (0-1) */
    scale?: number
    /** Current emotional state from cognitive system */
    emotionalState?: EmotionalVector
    /** Audio level for lip sync (0-1) */
    audioLevel?: number
    /** Whether the avatar is actively speaking */
    isSpeaking?: boolean
    /** Callback when model is loaded */
    onLoad?: () => void
    /** Callback when an error occurs */
    onError?: (error: Error) => void
    /** Additional CSS class name */
    className?: string
    /** Show loading state */
    showLoading?: boolean
    /** Show error state */
    showError?: boolean
    /** Controller ref callback for external control */
    onControllerReady?: (controller: Live2DAvatarController) => void
    /** Rendering mode */
    mode?: 'live2d' | 'sprite'
}

export interface Live2DAvatarState {
    isLoading: boolean
    isLoaded: boolean
    error: Error | null
    currentExpression: Expression
}

/**
 * Live2D Avatar Component for the AI Companion Hub
 */
export const Live2DAvatar: React.FC<Live2DAvatarComponentProps> = ({
    model = 'miara',
    width = 400,
    height = 400,
    scale = 0.25,
    emotionalState,
    audioLevel,
    isSpeaking = false,
    onLoad,
    onError,
    className,
    showLoading = true,
    showError = true,
    onControllerReady,
    mode = 'live2d',
}) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const managerRef = useRef<any>(null)
    const controllerRef = useRef<Live2DAvatarController | null>(null)
    const [state, setState] = useState<Live2DAvatarState>({
        isLoading: true,
        isLoaded: false,
        error: null,
        currentExpression: 'neutral',
    })

    // Resolve model URL from preset or use as-is
    const modelUrl = CDN_MODELS[model as keyof typeof CDN_MODELS] || model

    // Initialize the avatar
    useEffect(() => {
        let mounted = true

        const initializeAvatar = async () => {
            if (!containerRef.current) return

            setState(prev => ({ ...prev, isLoading: true, error: null }))

            try {
                // Dynamic import to avoid SSR issues
                const { Live2DAvatarManager } = await import('@deltecho/avatar')

                // Create manager instance
                managerRef.current = new Live2DAvatarManager()

                // Initialize with props
                const controller = await managerRef.current.initialize(
                    containerRef.current,
                    {
                        modelPath: modelUrl,
                        width,
                        height,
                        scale,
                        onLoad: () => {
                            if (mounted) {
                                setState(prev => ({
                                    ...prev,
                                    isLoading: false,
                                    isLoaded: true,
                                }))
                                onLoad?.()
                            }
                        },
                        onError: (error: Error) => {
                            if (mounted) {
                                setState(prev => ({
                                    ...prev,
                                    isLoading: false,
                                    error,
                                }))
                                onError?.(error)
                            }
                        },
                        debug: process.env.NODE_ENV === 'development',
                    }
                )

                controllerRef.current = controller
                onControllerReady?.(controller)
            } catch (error) {
                if (mounted) {
                    const err = error instanceof Error ? error : new Error(String(error))
                    setState(prev => ({
                        ...prev,
                        isLoading: false,
                        error: err,
                    }))
                    onError?.(err)
                }
            }
        }

        initializeAvatar()

        return () => {
            mounted = false
            managerRef.current?.dispose()
            managerRef.current = null
            controllerRef.current = null
        }
    }, [modelUrl, width, height, scale])

    // Update emotional state
    useEffect(() => {
        if (!managerRef.current || !state.isLoaded || !emotionalState) return
        managerRef.current.updateEmotionalState(emotionalState)
    }, [emotionalState, state.isLoaded])

    // Update lip sync
    useEffect(() => {
        if (!controllerRef.current || !state.isLoaded) return
        controllerRef.current.updateLipSync(audioLevel ?? 0)
    }, [audioLevel, state.isLoaded])

    // Render sprite mode if selected or if loading/error
    if (mode === 'sprite' || (!state.isLoaded && !showLoading)) {
        return (
            <div
                className={`live2d-avatar-container ${className || ''}`}
                style={{ width, height, position: 'relative' }}
            >
                <ResponsiveSpriteAvatar
                    emotionalState={emotionalState}
                    isSpeaking={isSpeaking}
                    width={width}
                    height={height}
                />
                {/* Optional: Show loading overlay if we are actually trying to load live2d in background */}
                {showLoading && state.isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xs">
                        Loading Live2D...
                    </div>
                )}
            </div>
        )
    }

    // Render loading state for Live2D
    if (showLoading && state.isLoading) {
        return (
            <div
                className={`live2d-avatar live2d-loading ${className || ''}`}
                data-width={width}
                data-height={height}
            >
                <div className='live2d-loading-content'>
                    <div className='live2d-spinner' />
                    <span>Loading Avatar...</span>
                </div>
            </div>
        )
    }

    // Render error state -> Fallback to Sprite
    if (showError && state.error) {
        return (
            <div
                className={`live2d-avatar-container ${className || ''}`}
                style={{ width, height }}
            >
                <ResponsiveSpriteAvatar
                    emotionalState={emotionalState}
                    isSpeaking={isSpeaking}
                    width={width}
                    height={height}
                />
                <div className="live2d-error-overlay" title={state.error.message}>
                    ⚠️ Live2D Failed
                </div>
            </div>
        )
    }

    return (
        <div
            ref={containerRef}
            className={`live2d-avatar live2d-ready ${className || ''}`}
            data-width={width}
            data-height={height}
        />
    )
}

/**
 * Hook for controlling a Live2D avatar from outside the component
 */
export function useLive2DController() {
    const controllerRef = useRef<Live2DAvatarController | null>(null)

    const setController = useCallback((controller: Live2DAvatarController) => {
        controllerRef.current = controller
    }, [])

    const setExpression = useCallback((expression: Expression, intensity?: number) => {
        controllerRef.current?.setExpression(expression, intensity)
    }, [])

    const playMotion = useCallback((motion: AvatarMotion) => {
        controllerRef.current?.playMotion(motion)
    }, [])

    const updateLipSync = useCallback((level: number) => {
        controllerRef.current?.updateLipSync(level)
    }, [])

    const triggerBlink = useCallback(() => {
        controllerRef.current?.triggerBlink()
    }, [])

    const setParameter = useCallback((paramId: string, value: number) => {
        controllerRef.current?.setParameter(paramId, value)
    }, [])

    return {
        setController,
        setExpression,
        playMotion,
        updateLipSync,
        triggerBlink,
        setParameter,
        controller: controllerRef.current,
    }
}

export default Live2DAvatar
