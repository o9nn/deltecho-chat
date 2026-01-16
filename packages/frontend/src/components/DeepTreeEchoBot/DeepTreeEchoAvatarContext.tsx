/**
 * DeepTreeEchoAvatarContext - Shared Context for Avatar State Management
 *
 * This context provides a centralized way to manage the Deep Tree Echo avatar
 * state across the application, allowing multiple components to control and
 * observe the avatar's behavior.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { Live2DAvatarController } from '../AICompanionHub/Live2DAvatar'
import { getLogger } from '@deltachat-desktop/shared/logger'
import { registerAvatarStateControl } from './AvatarStateManager'

const log = getLogger('render/components/DeepTreeEchoBot/DeepTreeEchoAvatarContext')

// Bot processing states
export enum AvatarProcessingState {
    IDLE = 'idle',
    LISTENING = 'listening',
    THINKING = 'thinking',
    RESPONDING = 'responding',
    ERROR = 'error',
}

// Avatar configuration
export interface AvatarConfig {
    visible: boolean
    position: 'inline' | 'floating'
    width: number
    height: number
    model: string
}

// Avatar state
export interface AvatarState {
    processingState: AvatarProcessingState
    isSpeaking: boolean
    audioLevel: number
    config: AvatarConfig
}

// Avatar context value
export interface AvatarContextValue {
    state: AvatarState
    controller: Live2DAvatarController | null
    setController: (controller: Live2DAvatarController | null) => void
    setProcessingState: (state: AvatarProcessingState) => void
    setIsSpeaking: (speaking: boolean) => void
    setAudioLevel: (level: number) => void
    updateConfig: (config: Partial<AvatarConfig>) => void
    showAvatar: () => void
    hideAvatar: () => void
}

// Default avatar configuration
const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
    visible: true,
    position: 'floating',
    width: 300,
    height: 300,
    model: 'miara',
}

// Default avatar state
const DEFAULT_AVATAR_STATE: AvatarState = {
    processingState: AvatarProcessingState.IDLE,
    isSpeaking: false,
    audioLevel: 0,
    config: DEFAULT_AVATAR_CONFIG,
}

// Create context
const AvatarContext = createContext<AvatarContextValue | null>(null)

/**
 * Avatar Context Provider
 */
export const DeepTreeEchoAvatarProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [state, setState] = useState<AvatarState>(DEFAULT_AVATAR_STATE)
    const [controller, setControllerState] = useState<Live2DAvatarController | null>(null)

    // Load saved configuration
    useEffect(() => {
        const loadConfig = async () => {
            try {
                // Try to load saved avatar config from settings
                const savedConfig = localStorage.getItem('deepTreeEchoAvatarConfig')
                if (savedConfig) {
                    const config = JSON.parse(savedConfig)
                    setState(prev => ({
                        ...prev,
                        config: { ...prev.config, ...config },
                    }))
                }
            } catch (error) {
                log.error('Failed to load avatar config:', error)
            }
        }
        loadConfig()
    }, [])

    // Save configuration when it changes
    useEffect(() => {
        try {
            localStorage.setItem('deepTreeEchoAvatarConfig', JSON.stringify(state.config))
        } catch (error) {
            log.error('Failed to save avatar config:', error)
        }
    }, [state.config])

    const setController = useCallback((newController: Live2DAvatarController | null) => {
        setControllerState(newController)
        if (newController) {
            log.info('Avatar controller registered')
        }
    }, [])

    const setProcessingState = useCallback((processingState: AvatarProcessingState) => {
        setState(prev => ({ ...prev, processingState }))
    }, [])

    const setIsSpeaking = useCallback((isSpeaking: boolean) => {
        setState(prev => ({ ...prev, isSpeaking }))
    }, [])

    const setAudioLevel = useCallback((audioLevel: number) => {
        setState(prev => ({ ...prev, audioLevel }))
    }, [])

    // Register with AvatarStateManager on mount
    useEffect(() => {
        registerAvatarStateControl(setProcessingState, setIsSpeaking, setAudioLevel)
    }, [setProcessingState, setIsSpeaking, setAudioLevel])

    const updateConfig = useCallback((configUpdate: Partial<AvatarConfig>) => {
        setState(prev => ({
            ...prev,
            config: { ...prev.config, ...configUpdate },
        }))
    }, [])

    const showAvatar = useCallback(() => {
        setState(prev => ({
            ...prev,
            config: { ...prev.config, visible: true },
        }))
    }, [])

    const hideAvatar = useCallback(() => {
        setState(prev => ({
            ...prev,
            config: { ...prev.config, visible: false },
        }))
    }, [])

    const value: AvatarContextValue = {
        state,
        controller,
        setController,
        setProcessingState,
        setIsSpeaking,
        setAudioLevel,
        updateConfig,
        showAvatar,
        hideAvatar,
    }

    return <AvatarContext.Provider value={value}>{children}</AvatarContext.Provider>
}

/**
 * Hook to use the avatar context
 */
export function useDeepTreeEchoAvatar(): AvatarContextValue {
    const context = useContext(AvatarContext)
    if (!context) {
        throw new Error(
            'useDeepTreeEchoAvatar must be used within DeepTreeEchoAvatarProvider'
        )
    }
    return context
}

/**
 * Hook to control avatar from outside components (optional context)
 */
export function useDeepTreeEchoAvatarOptional(): AvatarContextValue | null {
    return useContext(AvatarContext)
}

export default AvatarContext
