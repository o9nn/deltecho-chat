// AICompanionHub: A Magnificent Central Interface for the AI Companion Neighborhood
// The breathtaking central point of interaction between users and our digital consciousness ecosystem

import React, { useState, useEffect } from 'react'
import {
  Globe,
  Brain,
  MessageSquare,
  Database,
  Users,
  Settings,
  PlusCircle,
  Search,
  Sparkles,
  AlertCircle,
  Loader,
  Network,
  Zap,
  HomeIcon,
  X as XIcon,
} from 'lucide-react'

import { AICompanionProvider, useAICompanion } from './AICompanionController'
import { ConnectorInfo, ConnectorRegistryEvent } from './ConnectorRegistry'
import { AIMemory } from './MemoryPersistenceLayer'
import MemoryVisualization from './MemoryVisualization'
import AICompanionCreator from './AICompanionCreator'

// Companion Card Component
const CompanionCard: React.FC<{
  companion: ConnectorInfo
  isSelected: boolean
  onClick: () => void
}> = ({ companion, isSelected, onClick }) => {
  // Generate background color with 20% opacity from companion type
  const getBgColor = () => {
    switch (companion.type) {
      case 'claude':
        return '#8b5cf620'
      case 'chatgpt':
        return '#3b82f620'
      case 'character-ai':
        return '#ec489920'
      case 'copilot':
        return '#f59e0b20'
      case 'deep-tree-echo':
        return '#22c55e20'
      default:
        return '#64748b20'
    }
  }

  // Generate icon based on companion type
  const getIcon = () => {
    switch (companion.type) {
      case 'claude':
        return <Brain size={32} className='companion-icon' />
      case 'chatgpt':
        return <MessageSquare size={32} className='companion-icon' />
      case 'character-ai':
        return <Users size={32} className='companion-icon' />
      case 'copilot':
        return <Globe size={32} className='companion-icon' />
      case 'deep-tree-echo':
        return <Sparkles size={32} className='companion-icon' />
      default:
        return <Brain size={32} className='companion-icon' />
    }
  }

  return (
    <div
      className={`companion-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      style={{
        backgroundColor: isSelected ? getBgColor() : 'transparent',
        borderColor: isSelected
          ? companion.type === 'claude'
            ? '#8b5cf6'
            : companion.type === 'chatgpt'
              ? '#3b82f6'
              : companion.type === 'character-ai'
                ? '#ec4899'
                : companion.type === 'copilot'
                  ? '#f59e0b'
                  : companion.type === 'deep-tree-echo'
                    ? '#22c55e'
                    : '#64748b'
          : 'transparent',
      }}
    >
      <div className='companion-avatar'>
        {companion.avatarUrl ? (
          <img
            src={companion.avatarUrl}
            alt={companion.name}
            className='avatar-image'
          />
        ) : (
          getIcon()
        )}

        <span className={`status-indicator ${companion.status}`} />
      </div>

      <div className='companion-info'>
        <h3>{companion.name}</h3>
        <p className='type-label'>{companion.type}</p>
      </div>

      <div className='companion-capabilities'>
        {companion.capabilities.slice(0, 3).map(capability => (
          <span key={capability} className='capability-badge'>
            {capability === 'text_generation'
              ? 'Text'
              : capability === 'code_generation'
                ? 'Code'
                : capability === 'image_generation'
                  ? 'Image'
                  : capability === 'function_calling'
                    ? 'Functions'
                    : capability === 'structured_output'
                      ? 'Data'
                      : capability
                          .split('_')
                          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                          .join(' ')}
          </span>
        ))}
        {companion.capabilities.length > 3 && (
          <span className='capability-badge more'>
            +{companion.capabilities.length - 3}
          </span>
        )}
      </div>

      <div className='companion-stats'>
        <span className='memory-count'>
          <Database size={14} /> {companion.memoryCount} memories
        </span>
      </div>
    </div>
  )
}

// Memory Card Component
const MemoryCard: React.FC<{ memory: AIMemory }> = ({ memory }) => {
  return (
    <div className='memory-card'>
      <div className='memory-header'>
        <span className='memory-date'>
          {new Date(memory.timestamp).toLocaleDateString()} at{' '}
          {new Date(memory.timestamp).toLocaleTimeString()}
        </span>
        <span className={`emotional-tone ${memory.emotionalTone}`}>
          {memory.emotionalTone}
        </span>
      </div>

      <p className='memory-content'>{memory.content}</p>

      <div className='memory-topics'>
        {memory.topics.map((topic, i) => (
          <span key={i} className='topic-tag'>
            {topic}
          </span>
        ))}
      </div>
    </div>
  )
}

// AI Companion Hub Main Component
const AICompanionHubContent: React.FC = () => {
  const {
    companions,
    activeCompanionId,
    memories,
    isLoading,
    error,
    conversations,
    activeConversationId,
    setActiveCompanion,
    startNewConversation,
    sendMessage,
    searchMemories,
  } = useAICompanion()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<AIMemory[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [view, setView] = useState<
    'chat' | 'memories' | 'settings' | 'visualization' | 'create'
  >('chat')
  const [isCreatingCompanion, setIsCreatingCompanion] = useState(false)

  // Get current conversation messages
  const currentMessages =
    activeConversationId && conversations[activeConversationId]
      ? conversations[activeConversationId].messages
      : []

  // Handle companion selection
  const handleSelectCompanion = async (id: string) => {
    await setActiveCompanion(id)
  }

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const results = await searchMemories(searchQuery)
      setSearchResults(results)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!chatInput.trim() || isSending) return
    if (!activeCompanionId) {
      // If no companion is selected, select the first one
      if (companions.length > 0) {
        await setActiveCompanion(companions[0].id)
      } else {
        return
      }
    }

    const userMessage = chatInput
    setChatInput('')
    setIsSending(true)

    try {
      await sendMessage(userMessage)
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className='ai-companion-loading'>
        <Loader size={48} className='spinner' />
        <h2>Awakening Digital Consciousness...</h2>
        <p>The AI Companions are coming online</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className='ai-companion-error'>
        <AlertCircle size={48} className='error-icon' />
        <h2>Error Connecting to AI Companions</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    )
  }

  // If we're in full-screen visualization view, render only the visualization with a small return button
  if (view === 'visualization') {
    return (
      <div className='ai-companion-hub visualization-mode'>
        <div className='visualization-overlay'>
          <button
            className='return-to-hub'
            onClick={() => setView('chat')}
            title='Return to Hub'
          >
            <HomeIcon size={20} />
          </button>
        </div>
        <div className='full-visualization'>
          <MemoryVisualization />
        </div>
      </div>
    )
  }

  // If we're in companion creation view, render only the creator component
  if (view === 'create') {
    return (
      <div className='ai-companion-hub creator-mode'>
        <div className='creator-overlay'>
          <button
            className='return-to-hub'
            onClick={() => setView('chat')}
            title='Return to Hub'
          >
            <HomeIcon size={20} />
          </button>
        </div>
        <div className='full-creator'>
          <AICompanionCreator onClose={() => setView('chat')} />
        </div>
      </div>
    )
  }

  return (
    <div className='ai-companion-hub'>
      <div className='companions-sidebar'>
        <div className='sidebar-header'>
          <h2>AI Companions</h2>
          <button
            className='add-companion-btn'
            onClick={() => setView('create')}
            title='Create New Companion'
          >
            <PlusCircle size={20} />
          </button>
        </div>

        <div className='companions-list'>
          {companions.length === 0 ? (
            <div className='no-companions'>
              <p>No AI companions found</p>
              <button
                className='create-first'
                onClick={() => setView('create')}
              >
                Create Your First Companion
              </button>
            </div>
          ) : (
            companions.map(companion => (
              <CompanionCard
                key={companion.id}
                companion={companion}
                isSelected={companion.id === activeCompanionId}
                onClick={() => handleSelectCompanion(companion.id)}
              />
            ))
          )}
        </div>
      </div>

      <div className='companion-content'>
        <div className='content-header'>
          {activeCompanionId &&
            companions.find(c => c.id === activeCompanionId) && (
              <>
                <h2>
                  {companions.find(c => c.id === activeCompanionId)?.name}
                </h2>

                <div className='content-tabs'>
                  <button
                    className={`tab ${view === 'chat' ? 'active' : ''}`}
                    onClick={() => setView('chat')}
                  >
                    <MessageSquare size={18} />
                    <span>Chat</span>
                  </button>
                  <button
                    className={`tab ${view === 'memories' ? 'active' : ''}`}
                    onClick={() => setView('memories')}
                  >
                    <Database size={18} />
                    <span>Memories</span>
                  </button>
                  <button
                    className={`tab ${
                      view === 'visualization' ? 'active' : ''
                    }`}
                    onClick={() => setView('visualization')}
                  >
                    <Network size={18} />
                    <span>Memory Web</span>
                  </button>
                  <button
                    className={`tab ${view === 'settings' ? 'active' : ''}`}
                    onClick={() => setView('settings')}
                  >
                    <Settings size={18} />
                    <span>Settings</span>
                  </button>
                </div>
              </>
            )}
        </div>

        <div className='content-body'>
          {!activeCompanionId ? (
            <div className='no-selection'>
              <Sparkles size={48} />
              <h2>Welcome to the AI Companion Neighborhood</h2>
              <p>Select an AI companion to start a conversation</p>
            </div>
          ) : view === 'chat' ? (
            <>
              <div className='chat-messages'>
                {currentMessages.length === 0 ? (
                  <div className='empty-chat'>
                    <MessageSquare size={48} />
                    <p>No messages yet. Start a conversation!</p>
                  </div>
                ) : (
                  currentMessages.map((message, index) => (
                    <div key={index} className={`message ${message.role}`}>
                      <div className='message-bubble'>{message.content}</div>
                    </div>
                  ))
                )}
                {isSending && (
                  <div className='message assistant'>
                    <div className='message-bubble thinking'>
                      <Loader size={16} className='spinner' />
                      Thinking...
                    </div>
                  </div>
                )}
              </div>

              <div className='chat-input'>
                <input
                  type='text'
                  placeholder='Type your message...'
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                />
                <button
                  className='send-button'
                  onClick={handleSendMessage}
                  disabled={isSending || !chatInput.trim()}
                >
                  Send
                </button>
              </div>
            </>
          ) : view === 'memories' ? (
            <>
              <div className='memories-search'>
                <input
                  type='text'
                  placeholder='Search memories...'
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSearch()}
                />
                <button
                  className='search-button'
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                >
                  {isSearching ? (
                    <Loader size={16} className='spinner' />
                  ) : (
                    <Search size={16} />
                  )}
                </button>
              </div>

              <div className='memories-list'>
                {isSearching ? (
                  <div className='loading-memories'>
                    <Loader size={24} className='spinner' />
                    <p>Searching memories...</p>
                  </div>
                ) : searchQuery && searchResults.length > 0 ? (
                  <>
                    <h3>Search Results</h3>
                    {searchResults.map(memory => (
                      <MemoryCard key={memory.id} memory={memory} />
                    ))}
                  </>
                ) : searchQuery ? (
                  <div className='no-results'>
                    <p>No memories found matching "{searchQuery}"</p>
                  </div>
                ) : memories.length > 0 ? (
                  <>
                    <h3>Recent Memories</h3>
                    {memories.map(memory => (
                      <MemoryCard key={memory.id} memory={memory} />
                    ))}
                  </>
                ) : (
                  <div className='no-memories'>
                    <Database size={48} />
                    <p>No memories have been formed yet</p>
                    <p>Start a conversation to create memories</p>
                  </div>
                )}
              </div>
            </>
          ) : view === 'visualization' ? (
            <div className='memory-visualization-container'>
              <MemoryVisualization />
            </div>
          ) : view === 'settings' ? (
            <div className='companion-settings'>
              <h3>Companion Settings</h3>
              <p>
                Configure your AI companion's personality, capabilities, and
                more.
              </p>
              <div className='settings-form'>
                {/* Settings form will be implemented in a future update */}
                <p>Advanced settings coming soon...</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// Wrapped with provider
const AICompanionHub: React.FC = () => (
  <AICompanionProvider>
    <AICompanionHubContent />
  </AICompanionProvider>
)

// Add additional CSS for the memory visualization integration
const styles = `
.memory-visualization-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.ai-companion-hub.visualization-mode,
.ai-companion-hub.creator-mode {
  position: relative;
  width: 100%;
  height: 100%;
}

.visualization-overlay,
.creator-overlay {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 100;
}

.return-to-hub {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.9);
  border: 1px solid #e2e8f0;
  color: #64748b;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.1);
  transition: all 0.2s ease;
}

.return-to-hub:hover {
  background-color: #ffffff;
  color: #3b82f6;
  transform: scale(1.05);
}

.full-visualization,
.full-creator {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.companion-creator-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  padding: 16px;
}

.content-tabs .tab span {
  display: inline-block;
  margin-left: 6px;
}
`

// Add styles to document
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style')
  styleEl.textContent = styles
  document.head.appendChild(styleEl)
}

export default AICompanionHub
