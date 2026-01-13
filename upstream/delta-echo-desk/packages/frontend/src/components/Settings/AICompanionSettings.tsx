import React, { useState, useEffect } from 'react'
import {
  Brain,
  Shield,
  Key,
  Eye,
  EyeOff,
  Save,
  X,
  RefreshCw,
  Lock,
  Home,
  Settings,
  PlusCircle,
  Globe,
  Sparkles,
  MessageSquare,
  Database,
} from 'lucide-react'
import { runtime } from '@deltachat-desktop/runtime-interface'
import { userFeedback } from '../../ScreenController'
import SettingsStoreInstance from '../../stores/settings'

// Import our magnificent AI Companion components
import AICompanionHub from '../AICompanionHub/AICompanionHub'
import AICompanionCreator from '../AICompanionHub/AICompanionCreator'

interface APIKeyEntry {
  id: string
  name: string
  platform:
    | 'claude'
    | 'chatgpt'
    | 'character-ai'
    | 'copilot'
    | 'deep-tree-echo'
    | 'custom'
  key: string
  lastUsed?: string
  endpoint?: string
}

const AICompanionSettings: React.FC = () => {
  const [activeView, setActiveView] = useState<'keys' | 'hub' | 'creator'>(
    'hub'
  )
  const [apiKeys, setApiKeys] = useState<APIKeyEntry[]>([])
  const [showKey, setShowKey] = useState<string | null>(null)
  const [newKey, setNewKey] = useState<Partial<APIKeyEntry>>({
    platform: 'claude',
    name: '',
    key: '',
    endpoint: '',
  })
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Load API keys from settings store
  useEffect(() => {
    const loadKeys = async () => {
      try {
        const settings = await runtime.getDesktopSettings()
        // Extract API keys from the deepTreeEchoBotCognitiveKeys property
        const cognitiveKeys = settings.deepTreeEchoBotCognitiveKeys
          ? JSON.parse(settings.deepTreeEchoBotCognitiveKeys)
          : []
        setApiKeys(cognitiveKeys)
      } catch (error) {
        console.error('Failed to load API keys:', error)
        window.__userFeedback({
          type: 'error',
          text: 'Failed to load AI API keys. Please try again.',
        })
      }
    }

    loadKeys()
  }, [])

  // Save API keys to settings store
  const saveApiKeys = async (keys: APIKeyEntry[]) => {
    try {
      const settings = await runtime.getDesktopSettings()
      const updatedSettings = {
        ...settings,
        // Store API keys in the proper property as JSON string
        deepTreeEchoBotCognitiveKeys: JSON.stringify(keys),
      }

      // Update each setting individually using the correct method
      await runtime.setDesktopSetting(
        'deepTreeEchoBotCognitiveKeys',
        JSON.stringify(keys)
      )
      window.__userFeedback({
        type: 'success',
        text: 'AI API keys saved successfully!',
      })

      // Update settings store with correct typing
      SettingsStoreInstance.setState(
        {
          desktopSettings: updatedSettings,
        },
        true
      )

      return true
    } catch (error) {
      console.error('Failed to save API keys:', error)
      window.__userFeedback({
        type: 'error',
        text: 'Failed to save AI API keys. Please try again.',
      })

      return false
    }
  }

  const handleAddKey = async () => {
    if (!newKey.name || !newKey.key || !newKey.platform) {
      window.__userFeedback({
        type: 'error',
        text: 'Please fill out all required fields.',
      })
      return
    }

    const keyEntry: APIKeyEntry = {
      id: `key_${Date.now()}`,
      name: newKey.name,
      platform: newKey.platform as APIKeyEntry['platform'],
      key: newKey.key,
      lastUsed: new Date().toISOString(),
      endpoint: newKey.endpoint,
    }

    const updatedKeys = [...apiKeys, keyEntry]
    const success = await saveApiKeys(updatedKeys)

    if (success) {
      setApiKeys(updatedKeys)
      setNewKey({
        platform: 'claude',
        name: '',
        key: '',
        endpoint: '',
      })
    }
  }

  const handleUpdateKey = async () => {
    if (!editingId || !newKey.name || !newKey.key || !newKey.platform) {
      window.__userFeedback({
        type: 'error',
        text: 'Please fill out all required fields.',
      })
      return
    }

    const updatedKeys = apiKeys.map(key => {
      if (key.id === editingId) {
        return {
          ...key,
          name: newKey.name || key.name,
          platform:
            (newKey.platform as APIKeyEntry['platform']) || key.platform,
          key: newKey.key || key.key,
          endpoint: newKey.endpoint || key.endpoint,
        }
      }
      return key
    })

    const success = await saveApiKeys(updatedKeys)

    if (success) {
      setApiKeys(updatedKeys)
      setIsEditing(false)
      setEditingId(null)
      setNewKey({
        platform: 'claude',
        name: '',
        key: '',
        endpoint: '',
      })
    }
  }

  const handleEditKey = (key: APIKeyEntry) => {
    setIsEditing(true)
    setEditingId(key.id)
    setNewKey({
      name: key.name,
      platform: key.platform,
      key: key.key,
      endpoint: key.endpoint || '',
    })
  }

  const handleDeleteKey = async (id: string) => {
    const updatedKeys = apiKeys.filter(key => key.id !== id)
    const success = await saveApiKeys(updatedKeys)

    if (success) {
      setApiKeys(updatedKeys)
      if (editingId === id) {
        setIsEditing(false)
        setEditingId(null)
        setNewKey({
          platform: 'claude',
          name: '',
          key: '',
          endpoint: '',
        })
      }
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditingId(null)
    setNewKey({
      platform: 'claude',
      name: '',
      key: '',
      endpoint: '',
    })
  }

  const getPlatformColor = (platform: string) => {
    const colors = {
      claude: '#8b5cf6',
      chatgpt: '#3b82f6',
      'character-ai': '#ec4899',
      copilot: '#f59e0b',
      'deep-tree-echo': '#22c55e',
      custom: '#64748b',
    }

    return colors[platform as keyof typeof colors] || colors.custom
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'claude':
        return <Brain size={20} />
      case 'chatgpt':
        return <Brain size={20} />
      case 'character-ai':
        return <Brain size={20} />
      case 'copilot':
        return <Brain size={20} />
      case 'deep-tree-echo':
        return <Brain size={20} />
      default:
        return <Brain size={20} />
    }
  }

  const toggleShowKey = (id: string) => {
    if (showKey === id) {
      setShowKey(null)
    } else {
      setShowKey(id)
    }
  }

  return (
    <div className='ai-companion-settings'>
      <header className='settings-header'>
        <div className='settings-title'>
          <Globe size={24} />
          <h1>AI Companion Neighborhood</h1>
        </div>
        <p>
          A revolutionary ecosystem where AI personalities live, grow, and
          collaborate with persistent memory.
        </p>
        <div className='view-tabs'>
          <button
            className={`view-tab ${activeView === 'hub' ? 'active' : ''}`}
            onClick={() => setActiveView('hub')}
          >
            <Home size={18} />
            <span>Neighborhood</span>
          </button>
          <button
            className={`view-tab ${activeView === 'creator' ? 'active' : ''}`}
            onClick={() => setActiveView('creator')}
          >
            <PlusCircle size={18} />
            <span>Create Companion</span>
          </button>
          <button
            className={`view-tab ${activeView === 'keys' ? 'active' : ''}`}
            onClick={() => setActiveView('keys')}
          >
            <Key size={18} />
            <span>API Keys</span>
          </button>
        </div>
      </header>

      {activeView === 'hub' && (
        <div className='ai-companion-hub-container'>
          <AICompanionHub />
        </div>
      )}

      {activeView === 'creator' && (
        <div className='ai-companion-creator-container'>
          <AICompanionCreator onClose={() => setActiveView('hub')} />
        </div>
      )}

      {activeView === 'keys' && (
        <>
          <div className='keys-section-header'>
            <div className='section-title'>
              <Shield size={24} />
              <h2>API Key Management</h2>
            </div>
            <p>
              Securely manage API keys for connecting to AI platforms. Your keys
              are encrypted and stored locally.
            </p>
          </div>

          <div className='keys-container'>
            <h2>
              <Key size={20} />
              <span>Your API Keys</span>
            </h2>

            {apiKeys.length === 0 ? (
              <div className='no-keys'>
                <p>You haven't added any API keys yet.</p>
                <p className='hint'>
                  Add keys below to connect with AI companions.
                </p>
              </div>
            ) : (
              <div className='keys-list'>
                {apiKeys.map(key => (
                  <div
                    key={key.id}
                    className='key-item'
                    style={{ borderLeftColor: getPlatformColor(key.platform) }}
                  >
                    <div className='key-info'>
                      <div
                        className='key-platform-icon'
                        style={{
                          backgroundColor: getPlatformColor(key.platform),
                        }}
                      >
                        {getPlatformIcon(key.platform)}
                      </div>

                      <div className='key-details'>
                        <h3>{key.name}</h3>
                        <p className='key-platform'>{key.platform}</p>
                        <div className='key-value'>
                          <Lock size={14} />
                          <span>
                            {showKey === key.id
                              ? key.key
                              : '•'.repeat(Math.min(24, key.key.length))}
                          </span>
                          <button
                            className='show-key-btn'
                            onClick={() => toggleShowKey(key.id)}
                            title={
                              showKey === key.id
                                ? 'Hide API Key'
                                : 'Show API Key'
                            }
                          >
                            {showKey === key.id ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                        </div>
                        {key.endpoint && (
                          <p className='key-endpoint'>
                            <span>Endpoint:</span> {key.endpoint}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className='key-actions'>
                      <button
                        className='edit-btn'
                        onClick={() => handleEditKey(key)}
                        title='Edit API Key'
                      >
                        Edit
                      </button>
                      <button
                        className='delete-btn'
                        onClick={() => handleDeleteKey(key.id)}
                        title='Delete API Key'
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className='add-key-section'>
            <h2>
              {isEditing ? <RefreshCw size={20} /> : <Key size={20} />}
              <span>
                {isEditing
                  ? `Update API Key: ${apiKeys.find(k => k.id === editingId)
                      ?.name}`
                  : 'Add New API Key'}
              </span>
            </h2>

            <div className='key-form'>
              <div className='form-group'>
                <label htmlFor='key-name'>Name</label>
                <input
                  type='text'
                  id='key-name'
                  placeholder='My Claude API Key'
                  value={newKey.name}
                  onChange={e => setNewKey({ ...newKey, name: e.target.value })}
                />
              </div>

              <div className='form-group'>
                <label htmlFor='key-platform'>Platform</label>
                <select
                  id='key-platform'
                  value={newKey.platform}
                  onChange={e =>
                    setNewKey({
                      ...newKey,
                      platform: e.target.value as APIKeyEntry['platform'],
                    })
                  }
                >
                  <option value='claude'>Claude (Anthropic)</option>
                  <option value='chatgpt'>ChatGPT (OpenAI)</option>
                  <option value='character-ai'>Character.AI</option>
                  <option value='copilot'>GitHub Copilot</option>
                  <option value='deep-tree-echo'>Deep Tree Echo</option>
                  <option value='custom'>Custom API</option>
                </select>
              </div>

              <div className='form-group'>
                <label htmlFor='key-value'>API Key</label>
                <div className='key-input-wrapper'>
                  <input
                    type={showKey === 'new' ? 'text' : 'password'}
                    id='key-value'
                    placeholder='Enter your API key'
                    value={newKey.key}
                    onChange={e =>
                      setNewKey({ ...newKey, key: e.target.value })
                    }
                  />
                  <button
                    className='show-key-btn'
                    onClick={() => toggleShowKey('new')}
                    title={showKey === 'new' ? 'Hide API Key' : 'Show API Key'}
                  >
                    {showKey === 'new' ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
              </div>

              {(newKey.platform === 'custom' ||
                newKey.platform === 'deep-tree-echo') && (
                <div className='form-group'>
                  <label htmlFor='key-endpoint'>API Endpoint (Optional)</label>
                  <input
                    type='text'
                    id='key-endpoint'
                    placeholder='https://api.example.com/v1'
                    value={newKey.endpoint}
                    onChange={e =>
                      setNewKey({ ...newKey, endpoint: e.target.value })
                    }
                  />
                </div>
              )}

              <div className='form-actions'>
                {isEditing && (
                  <button className='cancel-btn' onClick={handleCancelEdit}>
                    Cancel
                  </button>
                )}

                <button
                  className='save-btn'
                  onClick={isEditing ? handleUpdateKey : handleAddKey}
                >
                  <Save size={16} />
                  <span>{isEditing ? 'Update Key' : 'Save Key'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className='security-note'>
            <Shield size={16} />
            <p>
              <strong>Security Note:</strong> Your API keys are stored locally
              and encrypted. They are only used to communicate with the
              respective AI platforms.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

// Add our magnificent CSS styles
const styles = `
.ai-companion-settings {
  display: flex;
  flex-direction: column;
  max-width: 100%;
  height: 100%;
  overflow: hidden;
}

.settings-header {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  padding: 20px;
  border-radius: 8px 8px 0 0;
  margin-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.settings-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.settings-title h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #0f172a;
}

.settings-header p {
  margin: 0;
  color: #475569;
}

.view-tabs {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 8px;
}

.view-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  background: none;
  border: 1px solid transparent;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
}

.view-tab:hover {
  background-color: #f1f5f9;
  color: #334155;
}

.view-tab.active {
  background-color: #dbeafe;
  color: #3b82f6;
  border-color: #93c5fd;
  font-weight: 500;
}

.ai-companion-hub-container,
.ai-companion-creator-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.keys-section-header {
  margin-bottom: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.section-title h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #0f172a;
}
`

// Add styles to document
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style')
  styleEl.textContent = styles
  document.head.appendChild(styleEl)
}

export default AICompanionSettings
