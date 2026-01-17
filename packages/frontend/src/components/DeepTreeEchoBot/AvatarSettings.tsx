/**
 * AvatarSettings - Settings panel for the Live2D Cubism Avatar
 *
 * Allows users to configure:
 * - Avatar visibility and position
 * - Model selection (Miara, custom)
 * - TTS/voice settings
 * - VTuber gesture frequency
 * - Vision capabilities
 * - Expression intensity
 */

import React, { useState, useEffect, useCallback } from 'react'
import { runtime } from '@deltachat-desktop/runtime-interface'
import { getLogger } from '@deltachat-desktop/shared/logger'
import { getAvatarBridge, playAvatarGesture } from './DeepTreeEchoIntegration'
import type { VTuberGesture } from './CubismAvatarBridge'

const log = getLogger('render/components/DeepTreeEchoBot/AvatarSettings')

export interface AvatarSettingsConfig {
    enabled: boolean
    model: 'miara' | 'shizuku' | 'haru' | 'custom'
    customModelPath?: string
    position: 'floating' | 'inline'
    width: number
    height: number
    scale: number
    ttsEnabled: boolean
    ttsVoice?: string
    ttsRate: number
    ttsPitch: number
    lipSyncSensitivity: number
    gestureFrequency: number
    visionEnabled: boolean
    expressionIntensity: number
    idleAnimationsEnabled: boolean
    autoBlinkEnabled: boolean
}

const DEFAULT_CONFIG: AvatarSettingsConfig = {
    enabled: true,
    model: 'miara',
    position: 'floating',
    width: 300,
    height: 300,
    scale: 0.25,
    ttsEnabled: true,
    ttsRate: 1.0,
    ttsPitch: 1.0,
    lipSyncSensitivity: 0.8,
    gestureFrequency: 0.5,
    visionEnabled: true,
    expressionIntensity: 0.7,
    idleAnimationsEnabled: true,
    autoBlinkEnabled: true,
}

interface AvatarSettingsProps {
    onSave?: (config: AvatarSettingsConfig) => void
}

const DEMO_GESTURES: VTuberGesture[] = [
    'wave_greeting',
    'excited_jump',
    'happy_sway',
    'thinking_pose',
    'curious_lean',
    'nod_agree',
    'surprised_gasp',
    'laugh_shake',
]

export const AvatarSettings: React.FC<AvatarSettingsProps> = ({ onSave }) => {
    const [config, setConfig] = useState<AvatarSettingsConfig>(DEFAULT_CONFIG)
    const [availableVoices, setAvailableVoices] = useState<Array<{ name: string; lang: string }>>([])
    const [saveStatus, setSaveStatus] = useState<string>('')

    // Load saved settings
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const desktopSettings = await runtime.getDesktopSettings()
                const savedConfig = (desktopSettings as any).deepTreeEchoAvatarConfig
                if (savedConfig) {
                    try {
                        const parsed = JSON.parse(savedConfig)
                        setConfig({ ...DEFAULT_CONFIG, ...parsed })
                    } catch (e) {
                        log.error('Failed to parse avatar config:', e)
                    }
                }
            } catch (error) {
                log.error('Error loading avatar settings:', error)
            }
        }

        loadSettings()

        // Load available TTS voices
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            const loadVoices = () => {
                const voices = window.speechSynthesis.getVoices()
                setAvailableVoices(voices.map(v => ({ name: v.name, lang: v.lang })))
            }
            loadVoices()
            window.speechSynthesis.onvoiceschanged = loadVoices
        }
    }, [])

    // Handle config changes
    const handleChange = useCallback((key: keyof AvatarSettingsConfig, value: any) => {
        setConfig(prev => ({ ...prev, [key]: value }))
    }, [])

    // Save settings
    const handleSave = async () => {
        try {
            setSaveStatus('Saving...')
            await runtime.setDesktopSetting(
                'deepTreeEchoAvatarConfig' as any,
                JSON.stringify(config)
            )

            // Update avatar bridge if available
            const bridge = getAvatarBridge()
            if (bridge) {
                bridge.setTTSConfig({
                    enabled: config.ttsEnabled,
                    lipSyncSensitivity: config.lipSyncSensitivity,
                    emotionIntensity: config.expressionIntensity,
                    gestureFrequency: config.gestureFrequency,
                })
            }

            onSave?.(config)
            setSaveStatus('Saved!')
            setTimeout(() => setSaveStatus(''), 2000)
        } catch (error) {
            log.error('Error saving avatar settings:', error)
            setSaveStatus('Error saving')
        }
    }

    // Test gesture
    const handleTestGesture = (gesture: VTuberGesture) => {
        playAvatarGesture(gesture)
    }

    return (
        <div className="avatar-settings">
            <style>{`
                .avatar-settings {
                    padding: 16px;
                }

                .avatar-settings h3 {
                    margin-top: 0;
                    margin-bottom: 16px;
                    color: var(--text-color, #e0e0e0);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .avatar-settings .settings-section {
                    background: var(--card-bg, #1a1a2e);
                    border-radius: 8px;
                    padding: 16px;
                    margin-bottom: 16px;
                }

                .avatar-settings .settings-section h4 {
                    margin: 0 0 12px 0;
                    color: var(--accent-color, #e94560);
                    font-size: 14px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .avatar-settings .setting-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 0;
                    border-bottom: 1px solid var(--border-color, #2a2a4a);
                }

                .avatar-settings .setting-row:last-child {
                    border-bottom: none;
                }

                .avatar-settings .setting-label {
                    color: var(--text-color, #e0e0e0);
                    font-size: 14px;
                }

                .avatar-settings .setting-description {
                    font-size: 12px;
                    color: var(--text-color-secondary, #888);
                    margin-top: 4px;
                }

                .avatar-settings select,
                .avatar-settings input[type="text"],
                .avatar-settings input[type="number"] {
                    background: var(--input-bg, #16213e);
                    border: 1px solid var(--border-color, #2a2a4a);
                    border-radius: 4px;
                    color: var(--text-color, #e0e0e0);
                    padding: 8px 12px;
                    font-size: 14px;
                    min-width: 150px;
                }

                .avatar-settings input[type="range"] {
                    width: 150px;
                    accent-color: var(--accent-color, #e94560);
                }

                .avatar-settings .toggle-switch {
                    position: relative;
                    width: 50px;
                    height: 26px;
                }

                .avatar-settings .toggle-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }

                .avatar-settings .toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: var(--toggle-off, #3a3a5a);
                    transition: 0.3s;
                    border-radius: 13px;
                }

                .avatar-settings .toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 20px;
                    width: 20px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: 0.3s;
                    border-radius: 50%;
                }

                .avatar-settings input:checked + .toggle-slider {
                    background-color: var(--accent-color, #e94560);
                }

                .avatar-settings input:checked + .toggle-slider:before {
                    transform: translateX(24px);
                }

                .avatar-settings .gesture-buttons {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-top: 8px;
                }

                .avatar-settings .gesture-btn {
                    padding: 8px 12px;
                    background: var(--button-bg, #0f3460);
                    border: 1px solid var(--accent-color, #e94560);
                    border-radius: 4px;
                    color: var(--text-color, #e0e0e0);
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s;
                }

                .avatar-settings .gesture-btn:hover {
                    background: var(--accent-color, #e94560);
                    color: white;
                }

                .avatar-settings .save-btn {
                    width: 100%;
                    padding: 12px;
                    background: var(--accent-color, #e94560);
                    border: none;
                    border-radius: 6px;
                    color: white;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .avatar-settings .save-btn:hover {
                    background: var(--accent-hover, #ff6b6b);
                }

                .avatar-settings .save-status {
                    text-align: center;
                    margin-top: 8px;
                    font-size: 14px;
                    color: var(--success-color, #4ade80);
                }

                .avatar-settings .slider-value {
                    font-size: 12px;
                    color: var(--accent-color, #e94560);
                    min-width: 40px;
                    text-align: right;
                }
            `}</style>

            <h3>
                <span>🎭</span> Avatar Settings
            </h3>

            {/* General Settings */}
            <div className="settings-section">
                <h4>General</h4>

                <div className="setting-row">
                    <div>
                        <div className="setting-label">Enable Avatar</div>
                        <div className="setting-description">Show the Live2D avatar</div>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={config.enabled}
                            onChange={e => handleChange('enabled', e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>

                <div className="setting-row">
                    <div>
                        <div className="setting-label">Avatar Model</div>
                        <div className="setting-description">Choose your avatar character</div>
                    </div>
                    <select
                        value={config.model}
                        onChange={e => handleChange('model', e.target.value)}
                    >
                        <option value="miara">Miara Pro</option>
                        <option value="shizuku">Shizuku</option>
                        <option value="haru">Haru</option>
                        <option value="custom">Custom Model</option>
                    </select>
                </div>

                {config.model === 'custom' && (
                    <div className="setting-row">
                        <div>
                            <div className="setting-label">Custom Model Path</div>
                        </div>
                        <input
                            type="text"
                            value={config.customModelPath || ''}
                            onChange={e => handleChange('customModelPath', e.target.value)}
                            placeholder="/path/to/model.model3.json"
                        />
                    </div>
                )}

                <div className="setting-row">
                    <div>
                        <div className="setting-label">Position</div>
                        <div className="setting-description">Where to display the avatar</div>
                    </div>
                    <select
                        value={config.position}
                        onChange={e => handleChange('position', e.target.value)}
                    >
                        <option value="floating">Floating (Corner)</option>
                        <option value="inline">Inline (Chat Area)</option>
                    </select>
                </div>

                <div className="setting-row">
                    <div>
                        <div className="setting-label">Size</div>
                    </div>
                    <select
                        value={config.width}
                        onChange={e => {
                            const size = parseInt(e.target.value)
                            handleChange('width', size)
                            handleChange('height', size)
                        }}
                    >
                        <option value="200">Small (200px)</option>
                        <option value="300">Medium (300px)</option>
                        <option value="400">Large (400px)</option>
                        <option value="500">Extra Large (500px)</option>
                    </select>
                </div>
            </div>

            {/* TTS & Voice Settings */}
            <div className="settings-section">
                <h4>Voice & TTS</h4>

                <div className="setting-row">
                    <div>
                        <div className="setting-label">Enable TTS</div>
                        <div className="setting-description">Speak responses aloud with lip-sync</div>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={config.ttsEnabled}
                            onChange={e => handleChange('ttsEnabled', e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>

                {config.ttsEnabled && (
                    <>
                        <div className="setting-row">
                            <div>
                                <div className="setting-label">Voice</div>
                            </div>
                            <select
                                value={config.ttsVoice || ''}
                                onChange={e => handleChange('ttsVoice', e.target.value)}
                            >
                                <option value="">System Default</option>
                                {availableVoices.map((voice, i) => (
                                    <option key={i} value={voice.name}>
                                        {voice.name} ({voice.lang})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="setting-row">
                            <div>
                                <div className="setting-label">Speech Rate</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="2"
                                    step="0.1"
                                    value={config.ttsRate}
                                    onChange={e => handleChange('ttsRate', parseFloat(e.target.value))}
                                />
                                <span className="slider-value">{config.ttsRate.toFixed(1)}x</span>
                            </div>
                        </div>

                        <div className="setting-row">
                            <div>
                                <div className="setting-label">Pitch</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="2"
                                    step="0.1"
                                    value={config.ttsPitch}
                                    onChange={e => handleChange('ttsPitch', parseFloat(e.target.value))}
                                />
                                <span className="slider-value">{config.ttsPitch.toFixed(1)}</span>
                            </div>
                        </div>

                        <div className="setting-row">
                            <div>
                                <div className="setting-label">Lip-Sync Sensitivity</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={config.lipSyncSensitivity}
                                    onChange={e => handleChange('lipSyncSensitivity', parseFloat(e.target.value))}
                                />
                                <span className="slider-value">{Math.round(config.lipSyncSensitivity * 100)}%</span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Animation Settings */}
            <div className="settings-section">
                <h4>Animations & Expressions</h4>

                <div className="setting-row">
                    <div>
                        <div className="setting-label">Expression Intensity</div>
                        <div className="setting-description">How strongly emotions affect the avatar</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={config.expressionIntensity}
                            onChange={e => handleChange('expressionIntensity', parseFloat(e.target.value))}
                        />
                        <span className="slider-value">{Math.round(config.expressionIntensity * 100)}%</span>
                    </div>
                </div>

                <div className="setting-row">
                    <div>
                        <div className="setting-label">VTuber Gesture Frequency</div>
                        <div className="setting-description">How often to play anime-style gestures</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={config.gestureFrequency}
                            onChange={e => handleChange('gestureFrequency', parseFloat(e.target.value))}
                        />
                        <span className="slider-value">{Math.round(config.gestureFrequency * 100)}%</span>
                    </div>
                </div>

                <div className="setting-row">
                    <div>
                        <div className="setting-label">Idle Animations</div>
                        <div className="setting-description">Breathing, swaying, micro-movements</div>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={config.idleAnimationsEnabled}
                            onChange={e => handleChange('idleAnimationsEnabled', e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>

                <div className="setting-row">
                    <div>
                        <div className="setting-label">Auto Blink</div>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={config.autoBlinkEnabled}
                            onChange={e => handleChange('autoBlinkEnabled', e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>

                <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div className="setting-label" style={{ marginBottom: '8px' }}>Test Gestures</div>
                    <div className="gesture-buttons">
                        {DEMO_GESTURES.map(gesture => (
                            <button
                                key={gesture}
                                className="gesture-btn"
                                onClick={() => handleTestGesture(gesture)}
                            >
                                {gesture.replace(/_/g, ' ')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Vision Settings */}
            <div className="settings-section">
                <h4>Vision & ML</h4>

                <div className="setting-row">
                    <div>
                        <div className="setting-label">Enable Vision Reactions</div>
                        <div className="setting-description">Avatar reacts to images in chat using ML</div>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={config.visionEnabled}
                            onChange={e => handleChange('visionEnabled', e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
            </div>

            <button className="save-btn" onClick={handleSave}>
                Save Avatar Settings
            </button>

            {saveStatus && <div className="save-status">{saveStatus}</div>}
        </div>
    )
}

export default AvatarSettings
