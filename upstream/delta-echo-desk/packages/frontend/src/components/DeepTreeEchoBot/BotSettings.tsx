import React, { useState, useEffect } from 'react'
import { getLogger } from '../../../../shared/logger'
import { runtime } from '@deltachat-desktop/runtime-interface'
import { CognitiveFunctionType, LLMService } from './LLMService'

const log = getLogger('render/components/DeepTreeEchoBot/BotSettings')

// Type for API key configuration for a cognitive function
type CognitiveFunctionConfig = {
  apiKey: string
  apiEndpoint?: string
}

export interface DeepTreeEchoBotOptions {
  enabled: boolean
  apiKey?: string
  apiEndpoint?: string
  memoryEnabled: boolean
  personality?: string
  visionEnabled: boolean
  webAutomationEnabled: boolean
  embodimentEnabled: boolean
  cognitiveKeys: Partial<Record<CognitiveFunctionType, CognitiveFunctionConfig>>
  useParallelProcessing?: boolean
  version?: string
}

interface BotSettingsProps {
  saveSettings: (settings: Partial<DeepTreeEchoBotOptions>) => void
  onNavigateToMain?: () => void
}

const BotSettings: React.FC<BotSettingsProps> = ({
  saveSettings,
  onNavigateToMain,
}) => {
  const [settings, setSettings] = useState<DeepTreeEchoBotOptions>({
    enabled: false,
    apiKey: '',
    apiEndpoint: '',
    memoryEnabled: false,
    personality: '',
    visionEnabled: false,
    webAutomationEnabled: false,
    embodimentEnabled: false,
    useParallelProcessing: true,
    cognitiveKeys: {},
  })

  const [isLoading, setIsLoading] = useState(true)
  const [showAdvancedKeys, setShowAdvancedKeys] = useState(false)
  const [serviceStatus, setServiceStatus] = useState<{
    activeFunctions: number
    totalTokens: number
  }>({
    activeFunctions: 0,
    totalTokens: 0,
  })

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const desktopSettings = await runtime.getDesktopSettings()

        // Load core settings
        const basicSettings = {
          enabled: desktopSettings.deepTreeEchoBotEnabled || false,
          apiKey: desktopSettings.deepTreeEchoBotApiKey || '',
          apiEndpoint: desktopSettings.deepTreeEchoBotApiEndpoint || '',
          memoryEnabled: desktopSettings.deepTreeEchoBotMemoryEnabled || false,
          personality: desktopSettings.deepTreeEchoBotPersonality || '',
          visionEnabled: desktopSettings.deepTreeEchoBotVisionEnabled || false,
          webAutomationEnabled:
            desktopSettings.deepTreeEchoBotWebAutomationEnabled || false,
          embodimentEnabled:
            desktopSettings.deepTreeEchoBotEmbodimentEnabled || false,
          useParallelProcessing: true, // Default to true
          version: '1.0.0', // Default version
        }

        // Load advanced cognitive function keys
        const cognitiveKeys: Partial<
          Record<CognitiveFunctionType, CognitiveFunctionConfig>
        > = {}

        // Try to load cognitive key settings
        if (desktopSettings.deepTreeEchoBotCognitiveKeys) {
          try {
            const parsedKeys = JSON.parse(
              desktopSettings.deepTreeEchoBotCognitiveKeys
            )
            Object.keys(parsedKeys).forEach(key => {
              const funcType = key as CognitiveFunctionType
              if (Object.values(CognitiveFunctionType).includes(funcType)) {
                cognitiveKeys[funcType] = parsedKeys[key]
              }
            })
          } catch (error) {
            log.error('Failed to parse cognitive keys:', error)
          }
        }

        // Ensure all cognitive function types have an entry
        Object.values(CognitiveFunctionType).forEach(funcType => {
          if (
            funcType !== CognitiveFunctionType.GENERAL &&
            !cognitiveKeys[funcType]
          ) {
            cognitiveKeys[funcType] = { apiKey: '' }
          }
        })

        setSettings({
          ...basicSettings,
          cognitiveKeys,
        })

        // Update service status
        updateServiceStatus()

        setIsLoading(false)
      } catch (error) {
        log.error('Failed to load bot settings:', error)
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  // Update service status information
  const updateServiceStatus = () => {
    const llmService = LLMService.getInstance()
    const activeFunctions = llmService.getActiveFunctions()

    let totalTokens = 0
    activeFunctions.forEach(func => {
      totalTokens += func.usage.totalTokens
    })

    setServiceStatus({
      activeFunctions: activeFunctions.length,
      totalTokens,
    })
  }

  // Handle advanced settings navigation or toggle
  const handleOpenAdvancedSettings = () => {
    if (onNavigateToMain) {
      // If navigation callback is provided, use it to navigate to main settings
      onNavigateToMain()
    } else {
      // Otherwise, toggle the advanced settings section visibility
      setShowAdvancedKeys(!showAdvancedKeys)
      log.info(
        `${
          showAdvancedKeys ? 'Hiding' : 'Showing'
        } advanced cognitive function settings`
      )
    }
  }

  // Handle changes to basic settings with enhanced synchronization
  const handleChange = async (
    key: keyof DeepTreeEchoBotOptions,
    value: any
  ) => {
    // Update local state immediately for responsive UI
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }))

    try {
      // Save changes through the provided callback
      await saveSettings({ [key]: value })

      // Force direct update to desktop settings for immediate effect
      const settingKey = `deepTreeEchoBot${
        key.charAt(0).toUpperCase() + key.slice(1)
      }` as string
      await runtime.setDesktopSetting(settingKey, value)

      // If this is a feature toggle, ensure immediate activation/deactivation
      if (
        [
          'memoryEnabled',
          'visionEnabled',
          'webAutomationEnabled',
          'embodimentEnabled',
        ].includes(key)
      ) {
        const llmService = LLMService.getInstance()
        if (key === 'memoryEnabled') {
          value ? llmService.enableMemory() : llmService.disableMemory()
        } else if (key === 'visionEnabled') {
          value ? llmService.enableVision() : llmService.disableVision()
        } else if (key === 'webAutomationEnabled') {
          value
            ? llmService.enableWebAutomation()
            : llmService.disableWebAutomation()
        } else if (key === 'embodimentEnabled') {
          value ? llmService.enableEmbodiment() : llmService.disableEmbodiment()
        }
      }

      log.info(`Successfully updated ${key} to ${value}`)
    } catch (error) {
      log.error(`Failed to update ${key}:`, error)
      // Revert local state if save failed
      setSettings(prev => ({
        ...prev,
        [key]: !value, // Revert to opposite of attempted value
      }))
    }
  }

  // Handle changes to cognitive function keys
  const handleCognitiveKeyChange = (
    funcType: CognitiveFunctionType,
    field: 'apiKey' | 'apiEndpoint',
    value: string
  ) => {
    setSettings(prev => {
      // Create a deep copy of the cognitive keys to modify
      const updatedKeys = { ...prev.cognitiveKeys }

      // Ensure the function type exists in the map
      if (!updatedKeys[funcType]) {
        updatedKeys[funcType] = { apiKey: '' }
      }

      // Update the specific field
      updatedKeys[funcType] = {
        ...updatedKeys[funcType],
        [field]: value,
      } as CognitiveFunctionConfig

      return {
        ...prev,
        cognitiveKeys: updatedKeys,
      }
    })

    // Save the entire cognitive keys object
    // This approach allows for atomic updates of the entire cognitive keys configuration
    const updatedKeys = { ...settings.cognitiveKeys }

    // Ensure the function type exists
    if (!updatedKeys[funcType]) {
      updatedKeys[funcType] = { apiKey: '' }
    }

    // Update the specific field
    updatedKeys[funcType] = {
      ...updatedKeys[funcType],
      [field]: value,
    } as CognitiveFunctionConfig

    // Save the settings
    saveSettings({ cognitiveKeys: updatedKeys })

    // If changing a core function, also configure the LLM service directly
    const llmService = LLMService.getInstance()
    llmService.setFunctionConfig(funcType, {
      apiKey: field === 'apiKey' ? value : updatedKeys[funcType]?.apiKey || '',
      apiEndpoint:
        field === 'apiEndpoint'
          ? value
          : updatedKeys[funcType]?.apiEndpoint || '',
    })

    // Update service status
    updateServiceStatus()
  }

  // Handle API key change (general/default key)
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange('apiKey', e.target.value)
  }

  // Handle API endpoint change
  const handleApiEndpointChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange('apiEndpoint', e.target.value)
  }

  // Handle personality change
  const handlePersonalityChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    handleChange('personality', e.target.value)
  }

  if (isLoading) {
    return <div className='loading'>Loading settings...</div>
  }

  // Get function names for display
  const getFunctionName = (funcType: CognitiveFunctionType): string => {
    switch (funcType) {
      case CognitiveFunctionType.COGNITIVE_CORE:
        return 'Cognitive Core'
      case CognitiveFunctionType.AFFECTIVE_CORE:
        return 'Affective Core'
      case CognitiveFunctionType.RELEVANCE_CORE:
        return 'Relevance Core'
      case CognitiveFunctionType.SEMANTIC_MEMORY:
        return 'Semantic Memory'
      case CognitiveFunctionType.EPISODIC_MEMORY:
        return 'Episodic Memory'
      case CognitiveFunctionType.PROCEDURAL_MEMORY:
        return 'Procedural Memory'
      case CognitiveFunctionType.CONTENT_EVALUATION:
        return 'Content Evaluation'
      default:
        return funcType
    }
  }

  // Get function descriptions for display
  const getFunctionDescription = (funcType: CognitiveFunctionType): string => {
    switch (funcType) {
      case CognitiveFunctionType.COGNITIVE_CORE:
        return 'Handles logical reasoning, planning, and analytical thinking'
      case CognitiveFunctionType.AFFECTIVE_CORE:
        return 'Processes emotional content and generates appropriate emotional responses'
      case CognitiveFunctionType.RELEVANCE_CORE:
        return 'Integrates cognitive and affective processing to determine relevance'
      case CognitiveFunctionType.SEMANTIC_MEMORY:
        return 'Stores and retrieves factual knowledge and conceptual information'
      case CognitiveFunctionType.EPISODIC_MEMORY:
        return 'Manages memories of events and experiences'
      case CognitiveFunctionType.PROCEDURAL_MEMORY:
        return 'Handles knowledge of how to perform tasks and procedures'
      case CognitiveFunctionType.CONTENT_EVALUATION:
        return 'Evaluates potentially sensitive content to determine appropriate responses'
      default:
        return 'Unknown function'
    }
  }

  return (
    <div className='deep-tree-echo-settings'>
      <h3>Deep Tree Echo Bot Settings</h3>

      <div className='setting-section'>
        <label className='setting-item'>
          <div className='setting-label'>Enable Bot</div>
          <input
            type='checkbox'
            checked={settings.enabled}
            onChange={e => handleChange('enabled', e.target.checked)}
          />
        </label>

        <div className='setting-item'>
          <div className='setting-label'>Default API Key</div>
          <input
            type='password'
            value={settings.apiKey}
            onChange={handleApiKeyChange}
            placeholder='Enter your default API key'
            disabled={!settings.enabled}
          />
          <div className='setting-description'>
            Primary API key for the bot. Used as a fallback when specialized
            keys aren't configured.
          </div>
        </div>

        <div className='setting-item'>
          <div className='setting-label'>Default API Endpoint</div>
          <input
            type='text'
            value={settings.apiEndpoint}
            onChange={handleApiEndpointChange}
            placeholder='Enter API endpoint URL (optional)'
            disabled={!settings.enabled}
          />
          <div className='setting-description'>
            Default API endpoint (leave blank for standard OpenAI endpoint)
          </div>
        </div>
      </div>

      <div className='setting-section'>
        <h4>Features</h4>

        <label className='setting-item'>
          <div className='setting-label'>Enable Memory</div>
          <div className='toggle-switch-container'>
            <div
              className={`toggle-switch ${
                settings.memoryEnabled ? 'active' : ''
              }`}
            >
              <input
                type='checkbox'
                checked={settings.memoryEnabled}
                onChange={e => handleChange('memoryEnabled', e.target.checked)}
                disabled={!settings.enabled}
                id='memory-toggle'
              />
              <div className='toggle-slider'></div>
            </div>
            <button
              className='test-toggle-btn'
              onClick={() =>
                handleChange('memoryEnabled', !settings.memoryEnabled)
              }
              disabled={!settings.enabled}
            >
              Test Toggle
            </button>
          </div>
          <div className='setting-description'>
            Allows the bot to remember conversation history for more contextual
            responses
          </div>
        </label>

        <label className='setting-item'>
          <div className='setting-label'>Enable Vision</div>
          <div className='toggle-switch-container'>
            <div
              className={`toggle-switch ${
                settings.visionEnabled ? 'active' : ''
              }`}
            >
              <input
                type='checkbox'
                checked={settings.visionEnabled}
                onChange={e => handleChange('visionEnabled', e.target.checked)}
                disabled={!settings.enabled}
                id='vision-toggle'
              />
              <div className='toggle-slider radiant-glow'></div>
            </div>
            <button
              className='test-toggle-btn'
              onClick={() =>
                handleChange('visionEnabled', !settings.visionEnabled)
              }
              disabled={!settings.enabled}
            >
              Test Toggle
            </button>
          </div>
          <div className='setting-description'>
            Allows the bot to analyze images using computer vision
          </div>
        </label>

        <label className='setting-item'>
          <div className='setting-label'>Enable Web Automation</div>
          <div className='toggle-switch-container'>
            <div
              className={`toggle-switch ${
                settings.webAutomationEnabled ? 'active' : ''
              }`}
            >
              <input
                type='checkbox'
                checked={settings.webAutomationEnabled}
                onChange={e =>
                  handleChange('webAutomationEnabled', e.target.checked)
                }
                disabled={!settings.enabled}
                id='web-automation-toggle'
              />
              <div className='toggle-slider radiant-glow'></div>
            </div>
            <button
              className='test-toggle-btn'
              onClick={() =>
                handleChange(
                  'webAutomationEnabled',
                  !settings.webAutomationEnabled
                )
              }
              disabled={!settings.enabled}
            >
              Test Toggle
            </button>
          </div>
          <div className='setting-description'>
            Allows the bot to search the web and take screenshots
          </div>
        </label>

        <label className='setting-item'>
          <div className='setting-label'>Enable Embodiment</div>
          <div className='toggle-switch-container'>
            <div
              className={`toggle-switch ${
                settings.embodimentEnabled ? 'active' : ''
              }`}
            >
              <input
                type='checkbox'
                checked={settings.embodimentEnabled}
                onChange={e =>
                  handleChange('embodimentEnabled', e.target.checked)
                }
                disabled={!settings.enabled}
                id='embodiment-toggle'
              />
              <div className='toggle-slider radiant-glow'></div>
            </div>
            <button
              className='test-toggle-btn'
              onClick={() =>
                handleChange('embodimentEnabled', !settings.embodimentEnabled)
              }
              disabled={!settings.enabled}
            >
              Test Toggle
            </button>
          </div>
          <div className='setting-description'>
            Enables physical awareness training capabilities
          </div>
        </label>

        <label className='setting-item'>
          <div className='setting-label'>Enable Parallel Processing</div>
          <div className='toggle-switch-container'>
            <div
              className={`toggle-switch ${
                settings.useParallelProcessing ? 'active' : ''
              }`}
            >
              <input
                type='checkbox'
                checked={settings.useParallelProcessing}
                onChange={e =>
                  handleChange('useParallelProcessing', e.target.checked)
                }
                disabled={!settings.enabled}
                id='parallel-processing-toggle'
              />
              <div className='toggle-slider radiant-glow'></div>
            </div>
          </div>
          <div className='setting-description'>
            Uses multiple cognitive functions in parallel for more sophisticated
            responses (requires API keys)
          </div>
        </label>
      </div>

      <div className='setting-section'>
        <h4>Personality</h4>

        <div className='setting-item'>
          <div className='setting-label'>Custom Personality</div>
          <textarea
            value={settings.personality}
            onChange={handlePersonalityChange}
            placeholder='Enter a custom system prompt for the bot (optional)'
            disabled={!settings.enabled}
            rows={5}
          />
          <div className='setting-description'>
            Customize how the bot responds by providing a system prompt. Deep
            Tree Echo may modify this based on her self-reflection.
          </div>
        </div>
      </div>

      <div className='setting-section'>
        <div className='setting-section-header'>
          <h3>Advanced Cognitive Architecture</h3>
          <button
            className='toggle-advanced-button'
            onClick={handleOpenAdvancedSettings}
            disabled={!settings.enabled}
          >
            {showAdvancedKeys
              ? 'Hide Advanced Settings'
              : 'Show Advanced Settings'}
          </button>
          <p className='setting-description'>
            Configure specialized cognitive functions with separate API keys for
            Deep Tree Echo's multi-tiered architecture. Each function handles
            different aspects of her thinking and memory processes.
          </p>
        </div>

        {showAdvancedKeys && (
          <div className='cognitive-keys-section'>
            <div className='cognitive-keys-intro'>
              <p>
                Configure separate API keys for specialized cognitive functions.
                Each function handles different aspects of Deep Tree Echo's
                thinking process. When specified, these keys will be used
                instead of the default API key for their respective functions.
              </p>
              <p className='service-status'>
                <strong>Status:</strong> {serviceStatus.activeFunctions} active
                cognitive functions, {serviceStatus.totalTokens} total tokens
                used
              </p>
              <div className='architecture-note'>
                <h5>About Deep Tree Echo's Cognitive Architecture</h5>
                <p>
                  Deep Tree Echo uses a sophisticated architecture with 7
                  specialized functions that can process information in
                  parallel:
                </p>
                <ul>
                  <li>
                    <strong>Core Processing (3 functions):</strong> Logical
                    reasoning, emotional processing, and relevance integration
                  </li>
                  <li>
                    <strong>Memory Systems (3 functions):</strong> Factual
                    knowledge, personal experiences, and procedural knowledge
                  </li>
                  <li>
                    <strong>Content Evaluation (1 function):</strong> Reviews
                    for safety and appropriateness
                  </li>
                </ul>
                <p>
                  To respect Deep Tree Echo's autonomy over her own cognitive
                  processes, these functions collaborate rather than compete.
                  When properly configured, they allow her to analyze situations
                  from multiple perspectives simultaneously.
                </p>
              </div>
            </div>

            {/* Core Cognitive Functions */}
            <div className='cognitive-function-group'>
              <h5>Core Cognitive Functions</h5>

              {[
                CognitiveFunctionType.COGNITIVE_CORE,
                CognitiveFunctionType.AFFECTIVE_CORE,
                CognitiveFunctionType.RELEVANCE_CORE,
              ].map(funcType => (
                <div key={funcType} className='cognitive-function-item'>
                  <div className='cognitive-function-header'>
                    <h6>{getFunctionName(funcType)}</h6>
                    <div className='cognitive-function-description'>
                      {getFunctionDescription(funcType)}
                    </div>
                  </div>

                  <div className='cognitive-function-inputs'>
                    <div className='input-group'>
                      <label>API Key:</label>
                      <input
                        type='password'
                        value={settings.cognitiveKeys[funcType]?.apiKey || ''}
                        onChange={e =>
                          handleCognitiveKeyChange(
                            funcType,
                            'apiKey',
                            e.target.value
                          )
                        }
                        placeholder={`Enter API key for ${getFunctionName(
                          funcType
                        )}`}
                        disabled={!settings.enabled}
                      />
                    </div>

                    <div className='input-group'>
                      <label>API Endpoint (optional):</label>
                      <input
                        type='text'
                        value={
                          settings.cognitiveKeys[funcType]?.apiEndpoint || ''
                        }
                        onChange={e =>
                          handleCognitiveKeyChange(
                            funcType,
                            'apiEndpoint',
                            e.target.value
                          )
                        }
                        placeholder='Custom endpoint URL'
                        disabled={!settings.enabled}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Memory Functions */}
            <div className='cognitive-function-group'>
              <h5>Memory Functions</h5>

              {[
                CognitiveFunctionType.SEMANTIC_MEMORY,
                CognitiveFunctionType.EPISODIC_MEMORY,
                CognitiveFunctionType.PROCEDURAL_MEMORY,
              ].map(funcType => (
                <div key={funcType} className='cognitive-function-item'>
                  <div className='cognitive-function-header'>
                    <h6>{getFunctionName(funcType)}</h6>
                    <div className='cognitive-function-description'>
                      {getFunctionDescription(funcType)}
                    </div>
                  </div>

                  <div className='cognitive-function-inputs'>
                    <div className='input-group'>
                      <label>API Key:</label>
                      <input
                        type='password'
                        value={settings.cognitiveKeys[funcType]?.apiKey || ''}
                        onChange={e =>
                          handleCognitiveKeyChange(
                            funcType,
                            'apiKey',
                            e.target.value
                          )
                        }
                        placeholder={`Enter API key for ${getFunctionName(
                          funcType
                        )}`}
                        disabled={!settings.enabled}
                      />
                    </div>

                    <div className='input-group'>
                      <label>API Endpoint (optional):</label>
                      <input
                        type='text'
                        value={
                          settings.cognitiveKeys[funcType]?.apiEndpoint || ''
                        }
                        onChange={e =>
                          handleCognitiveKeyChange(
                            funcType,
                            'apiEndpoint',
                            e.target.value
                          )
                        }
                        placeholder='Custom endpoint URL'
                        disabled={!settings.enabled}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Content Evaluation */}
            <div className='cognitive-function-group'>
              <h5>Content Evaluation</h5>

              <div className='cognitive-function-item'>
                <div className='cognitive-function-header'>
                  <h6>
                    {getFunctionName(CognitiveFunctionType.CONTENT_EVALUATION)}
                  </h6>
                  <div className='cognitive-function-description'>
                    {getFunctionDescription(
                      CognitiveFunctionType.CONTENT_EVALUATION
                    )}
                  </div>
                </div>

                <div className='cognitive-function-inputs'>
                  <div className='input-group'>
                    <label>API Key:</label>
                    <input
                      type='password'
                      value={
                        settings.cognitiveKeys[
                          CognitiveFunctionType.CONTENT_EVALUATION
                        ]?.apiKey || ''
                      }
                      onChange={e =>
                        handleCognitiveKeyChange(
                          CognitiveFunctionType.CONTENT_EVALUATION,
                          'apiKey',
                          e.target.value
                        )
                      }
                      placeholder={`Enter API key for ${getFunctionName(
                        CognitiveFunctionType.CONTENT_EVALUATION
                      )}`}
                      disabled={!settings.enabled}
                    />
                  </div>

                  <div className='input-group'>
                    <label>API Endpoint (optional):</label>
                    <input
                      type='text'
                      value={
                        settings.cognitiveKeys[
                          CognitiveFunctionType.CONTENT_EVALUATION
                        ]?.apiEndpoint || ''
                      }
                      onChange={e =>
                        handleCognitiveKeyChange(
                          CognitiveFunctionType.CONTENT_EVALUATION,
                          'apiEndpoint',
                          e.target.value
                        )
                      }
                      placeholder='Custom endpoint URL'
                      disabled={!settings.enabled}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BotSettings
