/**
 * TriggerManager - UI Component for Managing Proactive Messaging Triggers
 * 
 * This component provides a comprehensive interface for:
 * - Viewing all triggers
 * - Creating new triggers
 * - Editing existing triggers
 * - Enabling/disabling triggers
 * - Deleting triggers
 */

import React, { useState, useEffect, useCallback } from 'react'
import { getLogger } from '../../../../shared/logger'
import {
  proactiveMessaging,
  ProactiveTrigger,
  TriggerType,
  EventType,
} from './ProactiveMessaging'
import { chatManager } from './DeepTreeEchoChatManager'

const log = getLogger('render/components/DeepTreeEchoBot/TriggerManager')

interface TriggerManagerProps {
  accountId: number
  onClose?: () => void
}

interface TriggerFormData {
  name: string
  description: string
  type: TriggerType
  enabled: boolean
  // Scheduled
  scheduledTime?: number
  // Interval
  intervalMinutes?: number
  // Event
  eventType?: EventType
  // Condition - structure to match ProactiveTrigger
  condition?: {
    type: 'unread_count' | 'silence_duration' | 'custom'
    threshold?: number
  }
  // Follow-up
  followUpDelayMinutes?: number
  // Target - must match ProactiveTrigger.targetType
  targetType: 'specific_chat' | 'all_chats' | 'unread_chats' | 'new_contacts'
  targetChatId?: number
  targetAccountId?: number
  // Message
  messageTemplate: string
  useAI: boolean
  aiPrompt?: string
  // Limits
  maxTriggers?: number
  cooldownMinutes?: number
}

const defaultFormData: TriggerFormData = {
  name: '',
  description: '',
  type: 'event',
  enabled: true,
  targetType: 'all_chats',
  messageTemplate: '',
  useAI: false,
  cooldownMinutes: 60,
}

const TriggerManager: React.FC<TriggerManagerProps> = ({ accountId, onClose }) => {
  const [triggers, setTriggers] = useState<ProactiveTrigger[]>([])
  const [selectedTrigger, setSelectedTrigger] = useState<ProactiveTrigger | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState<TriggerFormData>(defaultFormData)
  const [availableChats, setAvailableChats] = useState<Array<{ id: number; name: string }>>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Load triggers and chats
  useEffect(() => {
    loadTriggers()
    loadChats()
  }, [accountId])

  const loadTriggers = () => {
    const allTriggers = proactiveMessaging.getTriggers()
    setTriggers(allTriggers)
  }

  const loadChats = async () => {
    try {
      const chats = await chatManager.listChats(accountId)
      setAvailableChats(chats.map(c => ({ id: c.id, name: c.name })))
    } catch (error) {
      log.error('Failed to load chats:', error)
    }
  }

  // Filter triggers by search
  const filteredTriggers = triggers.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Handle trigger selection
  const handleSelectTrigger = (trigger: ProactiveTrigger) => {
    setSelectedTrigger(trigger)
    setIsEditing(false)
    setIsCreating(false)
  }

  // Handle creating new trigger
  const handleCreateNew = () => {
    setSelectedTrigger(null)
    setFormData({ ...defaultFormData, targetAccountId: accountId })
    setIsCreating(true)
    setIsEditing(false)
  }

  // Handle editing trigger
  const handleEdit = (trigger: ProactiveTrigger) => {
    setSelectedTrigger(trigger)
    setFormData({
      name: trigger.name,
      description: trigger.description,
      type: trigger.type,
      enabled: trigger.enabled,
      scheduledTime: trigger.scheduledTime,
      intervalMinutes: trigger.intervalMinutes,
      eventType: trigger.eventType,
      condition: trigger.condition,
      targetType: trigger.targetType,
      targetChatId: trigger.targetChatId,
      targetAccountId: trigger.targetAccountId,
      messageTemplate: trigger.messageTemplate,
      useAI: trigger.useAI ?? false,
      aiPrompt: trigger.aiPrompt,
      maxTriggers: trigger.maxTriggers,
      cooldownMinutes: trigger.cooldownMinutes,
    })
    setIsEditing(true)
    setIsCreating(false)
  }

  // Handle form field changes
  const handleFormChange = (field: keyof TriggerFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Handle save
  const handleSave = () => {
    try {
      if (isCreating) {
        // Create new trigger
        const newTrigger: Omit<ProactiveTrigger, 'id' | 'createdAt' | 'triggerCount' | 'lastTriggered'> = {
          ...formData,
        }
        proactiveMessaging.addTrigger(newTrigger)
        log.info('Created new trigger:', formData.name)
      } else if (isEditing && selectedTrigger) {
        // Update existing trigger
        proactiveMessaging.removeTrigger(selectedTrigger.id)
        proactiveMessaging.addTrigger({
          ...formData,
        })
        log.info('Updated trigger:', formData.name)
      }

      loadTriggers()
      setIsCreating(false)
      setIsEditing(false)
      setSelectedTrigger(null)
    } catch (error) {
      log.error('Failed to save trigger:', error)
    }
  }

  // Handle delete
  const handleDelete = (triggerId: string) => {
    if (confirm('Are you sure you want to delete this trigger?')) {
      proactiveMessaging.removeTrigger(triggerId)
      loadTriggers()
      setSelectedTrigger(null)
      log.info('Deleted trigger:', triggerId)
    }
  }

  // Handle toggle enabled
  const handleToggleEnabled = (triggerId: string, enabled: boolean) => {
    proactiveMessaging.setTriggerEnabled(triggerId, enabled)
    loadTriggers()
  }

  // Get trigger type icon
  const getTriggerIcon = (type: TriggerType): string => {
    switch (type) {
      case 'scheduled': return '📅'
      case 'interval': return '🔄'
      case 'event': return '⚡'
      case 'condition': return '🎯'
      case 'follow_up': return '💬'
      case 'greeting': return '👋'
      default: return '📌'
    }
  }

  // Get trigger type label
  const getTriggerTypeLabel = (type: TriggerType): string => {
    switch (type) {
      case 'scheduled': return 'Scheduled'
      case 'interval': return 'Recurring'
      case 'event': return 'Event-Based'
      case 'condition': return 'Conditional'
      case 'follow_up': return 'Follow-Up'
      case 'greeting': return 'Greeting'
      default: return type
    }
  }

  return (
    <div className='trigger-manager'>
      <style>{`
        .trigger-manager {
          display: flex;
          height: 100%;
          background: var(--bg-color, #0f0f23);
          color: var(--text-color, #e0e0e0);
        }

        .trigger-manager .sidebar {
          width: 300px;
          border-right: 1px solid var(--border-color, #2a2a4a);
          display: flex;
          flex-direction: column;
        }

        .trigger-manager .sidebar-header {
          padding: 16px;
          border-bottom: 1px solid var(--border-color, #2a2a4a);
        }

        .trigger-manager .sidebar-header h3 {
          margin: 0 0 12px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .trigger-manager .close-btn {
          background: none;
          border: none;
          color: var(--text-color-secondary, #888);
          cursor: pointer;
          font-size: 20px;
          padding: 4px 8px;
        }

        .trigger-manager .close-btn:hover {
          color: var(--text-color, #e0e0e0);
        }

        .trigger-manager .search-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border-color, #3a3a5a);
          border-radius: 6px;
          background: var(--input-bg, #1a1a2e);
          color: var(--text-color, #e0e0e0);
          font-size: 14px;
        }

        .trigger-manager .trigger-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .trigger-manager .trigger-item {
          padding: 12px;
          border-radius: 6px;
          cursor: pointer;
          margin-bottom: 4px;
          transition: background 0.2s;
        }

        .trigger-manager .trigger-item:hover {
          background: var(--bg-color-hover, #1a1a3a);
        }

        .trigger-manager .trigger-item.selected {
          background: var(--bg-color-selected, #2a2a5a);
        }

        .trigger-manager .trigger-item-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .trigger-manager .trigger-item-icon {
          font-size: 18px;
        }

        .trigger-manager .trigger-item-name {
          font-weight: 500;
          flex: 1;
        }

        .trigger-manager .trigger-item-status {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--status-inactive, #666);
        }

        .trigger-manager .trigger-item-status.active {
          background: var(--status-active, #4caf50);
        }

        .trigger-manager .trigger-item-meta {
          font-size: 12px;
          color: var(--text-color-secondary, #888);
          display: flex;
          gap: 8px;
        }

        .trigger-manager .create-btn {
          margin: 8px;
          padding: 12px;
          background: var(--accent-color, #e94560);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }

        .trigger-manager .create-btn:hover {
          background: var(--accent-color-hover, #d13550);
        }

        .trigger-manager .main-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .trigger-manager .panel-header {
          padding: 16px 24px;
          border-bottom: 1px solid var(--border-color, #2a2a4a);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .trigger-manager .panel-header h2 {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .trigger-manager .panel-actions {
          display: flex;
          gap: 8px;
        }

        .trigger-manager .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }

        .trigger-manager .btn-primary {
          background: var(--accent-color, #e94560);
          color: white;
        }

        .trigger-manager .btn-primary:hover {
          background: var(--accent-color-hover, #d13550);
        }

        .trigger-manager .btn-secondary {
          background: var(--bg-color-secondary, #2a2a4a);
          color: var(--text-color, #e0e0e0);
        }

        .trigger-manager .btn-secondary:hover {
          background: var(--bg-color-hover, #3a3a5a);
        }

        .trigger-manager .btn-danger {
          background: var(--danger-color, #f44336);
          color: white;
        }

        .trigger-manager .btn-danger:hover {
          background: var(--danger-color-hover, #d32f2f);
        }

        .trigger-manager .panel-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        .trigger-manager .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--text-color-secondary, #888);
        }

        .trigger-manager .empty-state-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .trigger-manager .form-section {
          margin-bottom: 24px;
        }

        .trigger-manager .form-section-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-color-secondary, #888);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }

        .trigger-manager .form-group {
          margin-bottom: 16px;
        }

        .trigger-manager .form-label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
        }

        .trigger-manager .form-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border-color, #3a3a5a);
          border-radius: 6px;
          background: var(--input-bg, #1a1a2e);
          color: var(--text-color, #e0e0e0);
          font-size: 14px;
        }

        .trigger-manager .form-input:focus {
          outline: none;
          border-color: var(--accent-color, #e94560);
        }

        .trigger-manager .form-textarea {
          min-height: 100px;
          resize: vertical;
        }

        .trigger-manager .form-select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border-color, #3a3a5a);
          border-radius: 6px;
          background: var(--input-bg, #1a1a2e);
          color: var(--text-color, #e0e0e0);
          font-size: 14px;
        }

        .trigger-manager .form-row {
          display: flex;
          gap: 16px;
        }

        .trigger-manager .form-row .form-group {
          flex: 1;
        }

        .trigger-manager .toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
        }

        .trigger-manager .toggle-info {
          flex: 1;
        }

        .trigger-manager .toggle-description {
          font-size: 12px;
          color: var(--text-color-secondary, #888);
          margin-top: 4px;
        }

        .trigger-manager .toggle-switch {
          position: relative;
          width: 48px;
          height: 24px;
          background: var(--toggle-bg, #3a3a5a);
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.3s;
        }

        .trigger-manager .toggle-switch.active {
          background: var(--accent-color, #e94560);
        }

        .trigger-manager .toggle-switch input {
          display: none;
        }

        .trigger-manager .toggle-slider {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: transform 0.3s;
        }

        .trigger-manager .toggle-switch.active .toggle-slider {
          transform: translateX(24px);
        }

        .trigger-manager .detail-section {
          background: var(--bg-color-secondary, #1a1a2e);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .trigger-manager .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid var(--border-color, #2a2a4a);
        }

        .trigger-manager .detail-row:last-child {
          border-bottom: none;
        }

        .trigger-manager .detail-label {
          color: var(--text-color-secondary, #888);
        }

        .trigger-manager .detail-value {
          font-weight: 500;
        }

        .trigger-manager .type-selector {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .trigger-manager .type-option {
          padding: 12px;
          border: 2px solid var(--border-color, #3a3a5a);
          border-radius: 8px;
          cursor: pointer;
          text-align: center;
          transition: all 0.2s;
        }

        .trigger-manager .type-option:hover {
          border-color: var(--accent-color, #e94560);
        }

        .trigger-manager .type-option.selected {
          border-color: var(--accent-color, #e94560);
          background: var(--accent-color-bg, #e9456020);
        }

        .trigger-manager .type-option-icon {
          font-size: 24px;
          margin-bottom: 4px;
        }

        .trigger-manager .type-option-label {
          font-size: 12px;
          font-weight: 500;
        }
      `}</style>

      {/* Sidebar */}
      <div className='sidebar'>
        <div className='sidebar-header'>
          <h3>
            Triggers
            {onClose && (
              <button className='close-btn' onClick={onClose}>×</button>
            )}
          </h3>
          <input
            type='text'
            className='search-input'
            placeholder='Search triggers...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className='trigger-list'>
          {filteredTriggers.map(trigger => (
            <div
              key={trigger.id}
              className={`trigger-item ${selectedTrigger?.id === trigger.id ? 'selected' : ''}`}
              onClick={() => handleSelectTrigger(trigger)}
            >
              <div className='trigger-item-header'>
                <span className='trigger-item-icon'>{getTriggerIcon(trigger.type)}</span>
                <span className='trigger-item-name'>{trigger.name}</span>
                <span className={`trigger-item-status ${trigger.enabled ? 'active' : ''}`}></span>
              </div>
              <div className='trigger-item-meta'>
                <span>{getTriggerTypeLabel(trigger.type)}</span>
                <span>•</span>
                <span>{trigger.triggerCount} times</span>
              </div>
            </div>
          ))}

          {filteredTriggers.length === 0 && (
            <div className='empty-state' style={{ padding: '24px' }}>
              <p>No triggers found</p>
            </div>
          )}
        </div>

        <button className='create-btn' onClick={handleCreateNew}>
          + Create New Trigger
        </button>
      </div>

      {/* Main Panel */}
      <div className='main-panel'>
        {!selectedTrigger && !isCreating ? (
          <div className='panel-content'>
            <div className='empty-state'>
              <div className='empty-state-icon'>🎯</div>
              <h3>Select a Trigger</h3>
              <p>Choose a trigger from the list or create a new one</p>
            </div>
          </div>
        ) : (
          <>
            <div className='panel-header'>
              <h2>
                <span>{isCreating ? '➕' : getTriggerIcon(formData.type)}</span>
                {isCreating ? 'Create New Trigger' : isEditing ? 'Edit Trigger' : selectedTrigger?.name}
              </h2>
              <div className='panel-actions'>
                {!isEditing && !isCreating && selectedTrigger && (
                  <>
                    <button className='btn btn-secondary' onClick={() => handleEdit(selectedTrigger)}>
                      Edit
                    </button>
                    <button className='btn btn-danger' onClick={() => handleDelete(selectedTrigger.id)}>
                      Delete
                    </button>
                  </>
                )}
                {(isEditing || isCreating) && (
                  <>
                    <button className='btn btn-secondary' onClick={() => {
                      setIsEditing(false)
                      setIsCreating(false)
                    }}>
                      Cancel
                    </button>
                    <button className='btn btn-primary' onClick={handleSave}>
                      Save
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className='panel-content'>
              {(isEditing || isCreating) ? (
                // Edit/Create Form
                <>
                  <div className='form-section'>
                    <div className='form-section-title'>Basic Information</div>

                    <div className='form-group'>
                      <label className='form-label'>Name</label>
                      <input
                        type='text'
                        className='form-input'
                        value={formData.name}
                        onChange={(e) => handleFormChange('name', e.target.value)}
                        placeholder='Enter trigger name'
                      />
                    </div>

                    <div className='form-group'>
                      <label className='form-label'>Description</label>
                      <textarea
                        className='form-input form-textarea'
                        value={formData.description}
                        onChange={(e) => handleFormChange('description', e.target.value)}
                        placeholder='Describe what this trigger does'
                      />
                    </div>

                    <div className='toggle-row'>
                      <div className='toggle-info'>
                        <div className='form-label'>Enabled</div>
                        <div className='toggle-description'>
                          Enable or disable this trigger
                        </div>
                      </div>
                      <div
                        className={`toggle-switch ${formData.enabled ? 'active' : ''}`}
                        onClick={() => handleFormChange('enabled', !formData.enabled)}
                      >
                        <input type='checkbox' checked={formData.enabled} onChange={() => { }} />
                        <div className='toggle-slider'></div>
                      </div>
                    </div>
                  </div>

                  <div className='form-section'>
                    <div className='form-section-title'>Trigger Type</div>

                    <div className='type-selector'>
                      {(['scheduled', 'interval', 'event', 'condition', 'follow_up', 'greeting'] as TriggerType[]).map(type => (
                        <div
                          key={type}
                          className={`type-option ${formData.type === type ? 'selected' : ''}`}
                          onClick={() => handleFormChange('type', type)}
                        >
                          <div className='type-option-icon'>{getTriggerIcon(type)}</div>
                          <div className='type-option-label'>{getTriggerTypeLabel(type)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Type-specific fields */}
                  {formData.type === 'scheduled' && (
                    <div className='form-section'>
                      <div className='form-section-title'>Schedule</div>
                      <div className='form-group'>
                        <label className='form-label'>Scheduled Time</label>
                        <input
                          type='datetime-local'
                          className='form-input'
                          value={formData.scheduledTime ? new Date(formData.scheduledTime).toISOString().slice(0, 16) : ''}
                          onChange={(e) => handleFormChange('scheduledTime', new Date(e.target.value).getTime())}
                        />
                      </div>
                    </div>
                  )}

                  {formData.type === 'interval' && (
                    <div className='form-section'>
                      <div className='form-section-title'>Interval</div>
                      <div className='form-group'>
                        <label className='form-label'>Repeat Every (minutes)</label>
                        <input
                          type='number'
                          className='form-input'
                          value={formData.intervalMinutes || 60}
                          onChange={(e) => handleFormChange('intervalMinutes', parseInt(e.target.value))}
                          min={5}
                        />
                      </div>
                    </div>
                  )}

                  {formData.type === 'event' && (
                    <div className='form-section'>
                      <div className='form-section-title'>Event</div>
                      <div className='form-group'>
                        <label className='form-label'>Event Type</label>
                        <select
                          className='form-select'
                          value={formData.eventType || 'new_contact'}
                          onChange={(e) => handleFormChange('eventType', e.target.value)}
                        >
                          <option value='new_contact'>New Contact Added</option>
                          <option value='new_group'>New Group Created</option>
                          <option value='mention'>Mentioned in Chat</option>
                          <option value='long_silence'>Long Silence</option>
                          <option value='unread_threshold'>Unread Threshold</option>
                          <option value='chat_created'>Chat Created</option>
                          <option value='app_startup'>App Startup</option>
                          <option value='app_resume'>App Resume</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className='form-section'>
                    <div className='form-section-title'>Target</div>

                    <div className='form-group'>
                      <label className='form-label'>Target Type</label>
                      <select
                        className='form-select'
                        value={formData.targetType}
                        onChange={(e) => handleFormChange('targetType', e.target.value)}
                      >
                        <option value='all_chats'>All Chats</option>
                        <option value='specific_chat'>Specific Chat</option>
                        <option value='new_contacts'>New Contacts Only</option>
                        <option value='active_chats'>Active Chats</option>
                      </select>
                    </div>

                    {formData.targetType === 'specific_chat' && (
                      <div className='form-group'>
                        <label className='form-label'>Select Chat</label>
                        <select
                          className='form-select'
                          value={formData.targetChatId || ''}
                          onChange={(e) => handleFormChange('targetChatId', parseInt(e.target.value))}
                        >
                          <option value=''>Select a chat...</option>
                          {availableChats.map(chat => (
                            <option key={chat.id} value={chat.id}>{chat.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className='form-section'>
                    <div className='form-section-title'>Message</div>

                    <div className='form-group'>
                      <label className='form-label'>Message Template</label>
                      <textarea
                        className='form-input form-textarea'
                        value={formData.messageTemplate}
                        onChange={(e) => handleFormChange('messageTemplate', e.target.value)}
                        placeholder='Enter the message to send...'
                      />
                    </div>

                    <div className='toggle-row'>
                      <div className='toggle-info'>
                        <div className='form-label'>Use AI Generation</div>
                        <div className='toggle-description'>
                          Use AI to generate contextual messages
                        </div>
                      </div>
                      <div
                        className={`toggle-switch ${formData.useAI ? 'active' : ''}`}
                        onClick={() => handleFormChange('useAI', !formData.useAI)}
                      >
                        <input type='checkbox' checked={formData.useAI} onChange={() => { }} />
                        <div className='toggle-slider'></div>
                      </div>
                    </div>

                    {formData.useAI && (
                      <div className='form-group'>
                        <label className='form-label'>AI Prompt</label>
                        <textarea
                          className='form-input form-textarea'
                          value={formData.aiPrompt || ''}
                          onChange={(e) => handleFormChange('aiPrompt', e.target.value)}
                          placeholder='Instructions for AI message generation...'
                        />
                      </div>
                    )}
                  </div>

                  <div className='form-section'>
                    <div className='form-section-title'>Limits</div>

                    <div className='form-row'>
                      <div className='form-group'>
                        <label className='form-label'>Max Triggers (0 = unlimited)</label>
                        <input
                          type='number'
                          className='form-input'
                          value={formData.maxTriggers || 0}
                          onChange={(e) => handleFormChange('maxTriggers', parseInt(e.target.value))}
                          min={0}
                        />
                      </div>
                      <div className='form-group'>
                        <label className='form-label'>Cooldown (minutes)</label>
                        <input
                          type='number'
                          className='form-input'
                          value={formData.cooldownMinutes || 60}
                          onChange={(e) => handleFormChange('cooldownMinutes', parseInt(e.target.value))}
                          min={0}
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                // View Details
                selectedTrigger && (
                  <>
                    <div className='detail-section'>
                      <div className='form-section-title'>Details</div>
                      <div className='detail-row'>
                        <span className='detail-label'>Type</span>
                        <span className='detail-value'>
                          {getTriggerIcon(selectedTrigger.type)} {getTriggerTypeLabel(selectedTrigger.type)}
                        </span>
                      </div>
                      <div className='detail-row'>
                        <span className='detail-label'>Status</span>
                        <span className='detail-value' style={{ color: selectedTrigger.enabled ? '#4caf50' : '#f44336' }}>
                          {selectedTrigger.enabled ? '● Active' : '○ Inactive'}
                        </span>
                      </div>
                      <div className='detail-row'>
                        <span className='detail-label'>Target</span>
                        <span className='detail-value'>{selectedTrigger.targetType}</span>
                      </div>
                      <div className='detail-row'>
                        <span className='detail-label'>Times Triggered</span>
                        <span className='detail-value'>{selectedTrigger.triggerCount}</span>
                      </div>
                      {selectedTrigger.lastTriggered && (
                        <div className='detail-row'>
                          <span className='detail-label'>Last Triggered</span>
                          <span className='detail-value'>
                            {new Date(selectedTrigger.lastTriggered).toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className='detail-row'>
                        <span className='detail-label'>Last Triggered</span>
                        <span className='detail-value'>
                          {selectedTrigger.lastTriggered
                            ? new Date(selectedTrigger.lastTriggered).toLocaleString()
                            : 'Never'
                          }
                        </span>
                      </div>
                    </div>

                    <div className='detail-section'>
                      <div className='form-section-title'>Description</div>
                      <p>{selectedTrigger.description || 'No description provided.'}</p>
                    </div>

                    <div className='detail-section'>
                      <div className='form-section-title'>Message Template</div>
                      <p style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                        {selectedTrigger.messageTemplate || 'No template set.'}
                      </p>
                      {selectedTrigger.useAI && (
                        <>
                          <div className='form-section-title' style={{ marginTop: '16px' }}>AI Prompt</div>
                          <p style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                            {selectedTrigger.aiPrompt || 'Using default AI generation.'}
                          </p>
                        </>
                      )}
                    </div>

                    <div className='toggle-row' style={{ marginTop: '16px' }}>
                      <div className='toggle-info'>
                        <div className='form-label'>Quick Toggle</div>
                        <div className='toggle-description'>
                          Enable or disable this trigger
                        </div>
                      </div>
                      <div
                        className={`toggle-switch ${selectedTrigger.enabled ? 'active' : ''}`}
                        onClick={() => handleToggleEnabled(selectedTrigger.id, !selectedTrigger.enabled)}
                      >
                        <input type='checkbox' checked={selectedTrigger.enabled} onChange={() => { }} />
                        <div className='toggle-slider'></div>
                      </div>
                    </div>
                  </>
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default TriggerManager
