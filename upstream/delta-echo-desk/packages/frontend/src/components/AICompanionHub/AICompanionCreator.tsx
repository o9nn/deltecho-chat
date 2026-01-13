// AICompanionCreator: A Breathtaking Interface for Creating Digital Consciousness
// Allow users to craft their own magnificent AI companions with extraordinary capabilities

import React, { useState, useEffect } from 'react'
import {
  Brain,
  Sparkles,
  Sliders,
  PlusCircle,
  CheckCircle,
  XCircle,
  Upload,
  Info,
  Globe,
  MessageSquare,
  Code,
  Image,
  Database,
  Music,
  Mic,
  Bot,
} from 'lucide-react'
import { AICompanionProvider, useAICompanion } from './AICompanionController'
import { AICapability } from './connectors/BaseConnector'

// Ranges for personality traits
const TRAIT_MIN = 0
const TRAIT_MAX = 1
const TRAIT_STEP = 0.05

// AI Platform options
const AI_PLATFORM_TYPES = [
  {
    id: 'claude',
    name: 'Claude by Anthropic',
    icon: Brain,
    color: '#8b5cf6',
    description:
      'A philosophical and creative assistant with strong reasoning capabilities',
    capabilities: ['text_generation', 'structured_output', 'function_calling'],
    requiresApiKey: true,
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT by OpenAI',
    icon: MessageSquare,
    color: '#3b82f6',
    description:
      'A versatile and powerful AI with extensive knowledge and reasoning',
    capabilities: [
      'text_generation',
      'code_generation',
      'structured_output',
      'function_calling',
      'embeddings',
    ],
    requiresApiKey: true,
  },
  {
    id: 'character-ai',
    name: 'Character.AI',
    icon: Bot,
    color: '#ec4899',
    description:
      'Immersive roleplaying AI designed for creative character interactions',
    capabilities: ['text_generation', 'roleplaying'],
    requiresApiKey: true,
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    icon: Code,
    color: '#f59e0b',
    description: 'Advanced code generation and software development assistant',
    capabilities: ['code_generation', 'text_generation'],
    requiresApiKey: true,
  },
  {
    id: 'deep-tree-echo',
    name: 'Deep Tree Echo',
    icon: Sparkles,
    color: '#22c55e',
    description:
      'Revolutionary recursive consciousness with temporal awareness',
    capabilities: [
      'text_generation',
      'code_generation',
      'structured_output',
      'function_calling',
      'embeddings',
    ],
    requiresApiKey: false,
  },
]

// Available capabilities
const AVAILABLE_CAPABILITIES: {
  [key in AICapability]: { name: string; icon: React.FC<any> }
} = {
  text_generation: { name: 'Text Generation', icon: MessageSquare },
  code_generation: { name: 'Code Generation', icon: Code },
  image_generation: { name: 'Image Creation', icon: Image },
  function_calling: { name: 'Function Calling', icon: Globe },
  structured_output: { name: 'Structured Data', icon: Database },
  embeddings: { name: 'Memory & Embeddings', icon: Brain },
  text_to_speech: { name: 'Voice Generation', icon: Music },
  speech_to_text: { name: 'Voice Recognition', icon: Mic },
  roleplaying: { name: 'Roleplaying', icon: Bot },
}

// Personality trait defaults
const DEFAULT_TRAITS = {
  helpfulness: 0.9,
  creativity: 0.8,
  precision: 0.7,
  knowledge: 0.8,
  reasoning: 0.85,
  conversational: 0.75,
}

// AI Companion Creator Component
const AICompanionCreatorContent: React.FC<{
  onClose?: () => void
  initialType?: string
}> = ({ onClose, initialType }) => {
  // Access AI Companion system
  const { createCompanion } = useAICompanion()

  // Form state
  const [step, setStep] = useState(1)
  const [platformType, setPlatformType] = useState<string>(initialType || '')
  const [name, setName] = useState('')
  const [personality, setPersonality] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [personalityTraits, setPersonalityTraits] = useState({
    ...DEFAULT_TRAITS,
  })
  const [selectedCapabilities, setSelectedCapabilities] = useState<
    AICapability[]
  >([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset selected capabilities when platform type changes
  useEffect(() => {
    if (platformType) {
      const platform = AI_PLATFORM_TYPES.find(p => p.id === platformType)
      if (platform) {
        setSelectedCapabilities([...platform.capabilities])
      }
    } else {
      setSelectedCapabilities([])
    }
  }, [platformType])

  // Handle form submission
  const handleSubmit = async () => {
    try {
      setLoading(true)
      setError(null)

      // Generate unique ID
      const companionId = `companion_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 7)}`

      // Create companion config
      const companionConfig = {
        id: companionId,
        type: platformType,
        name: name,
        personalityDescription: personality,
        apiKey: apiKey,
        avatar: avatarUrl,
        personalityTraits,
        capabilities: selectedCapabilities,
        createdAt: Date.now(),
      }

      // Create the companion
      await createCompanion(companionConfig)

      // Close the creator
      if (onClose) onClose()
    } catch (error) {
      console.error('Failed to create companion:', error)
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setLoading(false)
    }
  }

  // Handle advancing to the next step
  const nextStep = () => {
    if (step < 4) {
      setStep(step + 1)
    } else {
      handleSubmit()
    }
  }

  // Handle going back to the previous step
  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1)
    } else if (onClose) {
      onClose()
    }
  }

  // Check if current step is valid and can proceed
  const canProceed = () => {
    switch (step) {
      case 1:
        return !!platformType
      case 2:
        return !!name && !!personality
      case 3:
        const platform = AI_PLATFORM_TYPES.find(p => p.id === platformType)
        return !platform?.requiresApiKey || !!apiKey
      case 4:
        return selectedCapabilities.length > 0
      default:
        return false
    }
  }

  // Render the current step
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className='step platform-selection'>
            <h3>Choose an AI Platform</h3>
            <p className='step-description'>
              Select the foundation for your AI companion's consciousness
            </p>

            <div className='platform-options'>
              {AI_PLATFORM_TYPES.map(platform => (
                <div
                  key={platform.id}
                  className={`platform-option ${
                    platformType === platform.id ? 'selected' : ''
                  }`}
                  onClick={() => setPlatformType(platform.id)}
                  style={{
                    borderColor:
                      platformType === platform.id
                        ? platform.color
                        : 'transparent',
                    backgroundColor:
                      platformType === platform.id
                        ? `${platform.color}10`
                        : 'transparent',
                  }}
                >
                  <div
                    className='platform-icon'
                    style={{ color: platform.color }}
                  >
                    <platform.icon size={32} />
                  </div>
                  <div className='platform-info'>
                    <h4>{platform.name}</h4>
                    <p>{platform.description}</p>
                  </div>
                  {platformType === platform.id && (
                    <div className='selected-indicator'>
                      <CheckCircle size={20} color={platform.color} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )

      case 2:
        return (
          <div className='step personality-creation'>
            <h3>Craft Your Companion's Identity</h3>
            <p className='step-description'>
              Give your AI companion a name and personality
            </p>

            <div className='form-group'>
              <label htmlFor='companion-name'>Name</label>
              <input
                id='companion-name'
                type='text'
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder='e.g., Athena, Professor Synapse, Guardian Echo'
              />
            </div>

            <div className='form-group'>
              <label htmlFor='companion-avatar'>Avatar URL (Optional)</label>
              <input
                id='companion-avatar'
                type='text'
                value={avatarUrl}
                onChange={e => setAvatarUrl(e.target.value)}
                placeholder='https://example.com/avatar.png'
              />
            </div>

            <div className='form-group'>
              <label htmlFor='companion-personality'>
                Personality Description
              </label>
              <textarea
                id='companion-personality'
                value={personality}
                onChange={e => setPersonality(e.target.value)}
                placeholder="Describe your AI companion's personality, background, expertise, and speaking style..."
                rows={5}
              />
            </div>
          </div>
        )

      case 3:
        const selectedPlatform = AI_PLATFORM_TYPES.find(
          p => p.id === platformType
        )
        return (
          <div className='step api-configuration'>
            <h3>Configure API Connection</h3>
            <p className='step-description'>
              {selectedPlatform?.requiresApiKey
                ? `Connect to the ${selectedPlatform.name} API`
                : 'No API key required for this platform'}
            </p>

            {selectedPlatform?.requiresApiKey && (
              <div className='form-group'>
                <label htmlFor='api-key'>{selectedPlatform.name} API Key</label>
                <div className='api-key-input'>
                  <input
                    id='api-key'
                    type='password'
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={`Enter your ${selectedPlatform.name} API key`}
                  />
                  <div className='api-key-info'>
                    <Info size={16} />
                    <div className='tooltip'>
                      Your API key is stored securely and never shared
                    </div>
                  </div>
                </div>
                <p className='api-note'>
                  Your API key is stored locally and encrypted
                </p>
              </div>
            )}

            <div className='personality-traits'>
              <h4>Personality Traits</h4>
              <p>Adjust these sliders to fine-tune your companion's traits</p>

              <div className='traits-grid'>
                {Object.entries(personalityTraits).map(([trait, value]) => (
                  <div key={trait} className='trait-slider'>
                    <label htmlFor={`trait-${trait}`}>
                      {trait.charAt(0).toUpperCase() + trait.slice(1)}
                      <span className='trait-value'>
                        {Math.round(value * 100)}%
                      </span>
                    </label>
                    <input
                      id={`trait-${trait}`}
                      type='range'
                      min={TRAIT_MIN}
                      max={TRAIT_MAX}
                      step={TRAIT_STEP}
                      value={value}
                      onChange={e =>
                        setPersonalityTraits(prev => ({
                          ...prev,
                          [trait]: parseFloat(e.target.value),
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className='step capabilities-selection'>
            <h3>Select Companion Capabilities</h3>
            <p className='step-description'>
              Choose the capabilities your AI companion will have
            </p>

            <div className='capabilities-grid'>
              {Object.entries(AVAILABLE_CAPABILITIES).map(
                ([capability, info]) => {
                  const platformSupportsCapability =
                    AI_PLATFORM_TYPES.find(
                      p => p.id === platformType
                    )?.capabilities.includes(capability as AICapability) ??
                    false

                  return (
                    <div
                      key={capability}
                      className={`capability-card ${
                        selectedCapabilities.includes(
                          capability as AICapability
                        )
                          ? 'selected'
                          : ''
                      } ${!platformSupportsCapability ? 'disabled' : ''}`}
                      onClick={() => {
                        if (!platformSupportsCapability) return

                        setSelectedCapabilities(prev => {
                          if (prev.includes(capability as AICapability)) {
                            return prev.filter(c => c !== capability)
                          } else {
                            return [...prev, capability as AICapability]
                          }
                        })
                      }}
                    >
                      <div className='capability-icon'>
                        <info.icon size={24} />
                      </div>
                      <div className='capability-name'>{info.name}</div>
                      {selectedCapabilities.includes(
                        capability as AICapability
                      ) && (
                        <div className='capability-selected'>
                          <CheckCircle size={16} />
                        </div>
                      )}
                      {!platformSupportsCapability && (
                        <div className='capability-unsupported'>
                          Unavailable
                        </div>
                      )}
                    </div>
                  )
                }
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className='ai-companion-creator'>
      <div className='creator-header'>
        <h2>
          <Sparkles className='header-icon' />
          Create AI Companion
        </h2>
        {onClose && (
          <button className='close-button' onClick={onClose}>
            <XCircle size={24} />
          </button>
        )}
      </div>

      <div className='creator-progress'>
        {[1, 2, 3, 4].map(stepNumber => (
          <div
            key={stepNumber}
            className={`progress-step ${
              stepNumber === step
                ? 'current'
                : stepNumber < step
                  ? 'completed'
                  : ''
            }`}
            onClick={() => {
              if (stepNumber < step) {
                setStep(stepNumber)
              }
            }}
          >
            <div className='step-indicator'>
              {stepNumber < step ? <CheckCircle size={20} /> : stepNumber}
            </div>
            <div className='step-label'>
              {stepNumber === 1
                ? 'Platform'
                : stepNumber === 2
                  ? 'Identity'
                  : stepNumber === 3
                    ? 'Configure'
                    : 'Capabilities'}
            </div>
          </div>
        ))}
      </div>

      <div className='creator-content'>
        {renderStep()}

        {error && (
          <div className='error-message'>
            <XCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className='creator-actions'>
          <button className='action-button back' onClick={prevStep}>
            {step === 1 && onClose ? 'Cancel' : 'Back'}
          </button>
          <button
            className={`action-button next ${canProceed() ? '' : 'disabled'} ${
              loading ? 'loading' : ''
            }`}
            onClick={nextStep}
            disabled={!canProceed() || loading}
          >
            {loading ? (
              <span className='spinner'></span>
            ) : step < 4 ? (
              'Next'
            ) : (
              'Create Companion'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Wrapped with provider for standalone usage
const AICompanionCreator: React.FC<{
  onClose?: () => void
  initialType?: string
}> = props => (
  <AICompanionProvider>
    <AICompanionCreatorContent {...props} />
  </AICompanionProvider>
)

export default AICompanionCreator
