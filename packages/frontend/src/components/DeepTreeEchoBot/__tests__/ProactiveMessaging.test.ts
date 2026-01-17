/**
 * Tests for Proactive Messaging Components
 * 
 * Tests cover:
 * - DeepTreeEchoChatManager
 * - DeepTreeEchoUIBridge
 * - ProactiveMessaging
 */

// Mock BackendRemote
jest.mock('../../../backend-com', () => ({
  C: {
    DC_CHAT_TYPE_SINGLE: 100,
    DC_CHAT_TYPE_GROUP: 120,
    DC_CHAT_TYPE_BROADCAST: 160,
    DC_CHAT_TYPE_MAILINGLIST: 140,
  },
  BackendRemote: {
    rpc: {
      getChatlistEntries: jest.fn().mockResolvedValue([]),
      getBasicChatInfo: jest.fn().mockResolvedValue({
        name: 'Test Chat',
        chatType: 100, // DC_CHAT_TYPE_SINGLE
        archived: false,
        isMuted: false,
      }),
      getFullChatById: jest.fn().mockResolvedValue({
        id: 1,
        name: 'Test Chat',
        contactIds: [],
      }),
      getMessage: jest.fn().mockResolvedValue({
        id: 1,
        text: 'Hello',
        fromId: 2,
        timestamp: Date.now(),
      }),
      getMessageIds: jest.fn().mockResolvedValue([1, 2, 3]),
      miscSendTextMessage: jest.fn().mockResolvedValue(100),
      markseenMsgs: jest.fn().mockResolvedValue(true), // Updated mock
      createContact: jest.fn().mockResolvedValue(1),
      createChatByContactId: jest.fn().mockResolvedValue(1),
      createGroupChat: jest.fn().mockResolvedValue(1),
      addContactToChat: jest.fn().mockResolvedValue(undefined),
      getAllAccounts: jest.fn().mockResolvedValue([{ id: 1 }]),
    },
    on: jest.fn(),
    off: jest.fn(),
  },
}))

// Mock logger
jest.mock('@deltachat-desktop/shared/logger', () => ({
  getLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}))

// Mock keybindings
jest.mock('../../../keybindings', () => ({
  ActionEmitter: {
    emitAction: jest.fn(),
  },
  KeybindAction: {
    Settings_Open: 'Settings_Open',
    GlobalGallery_Open: 'GlobalGallery_Open',
    ChatList_FocusSearchInput: 'ChatList_FocusSearchInput',
    ChatList_FocusChatList: 'ChatList_FocusChatList',
    ChatList_SelectNextChat: 'ChatList_SelectNextChat',
    ChatList_SelectPreviousChat: 'ChatList_SelectPreviousChat',
    ChatList_SwitchToArchiveView: 'ChatList_SwitchToArchiveView',
    ChatList_SwitchToNormalView: 'ChatList_SwitchToNormalView',
  },
}))

describe('DeepTreeEchoChatManager', () => {
  let chatManager: any

  beforeEach(async () => {
    // Reset singleton instance explicitly
    const { DeepTreeEchoChatManager, getChatManager: getCM } = require('../DeepTreeEchoChatManager')
    DeepTreeEchoChatManager.resetInstance()

    // Use the actual instance instead of Proxy
    chatManager = getCM()
  })

  afterEach(() => {
    chatManager.cleanup()
  })

  describe('listChats', () => {
    it('should return empty array when no chats', async () => {
      const chats = await chatManager.listChats(1)
      expect(Array.isArray(chats)).toBe(true)
    })
  })

  describe('openChat', () => {
    it('should open a chat and update active state', async () => {
      const result = await chatManager.openChat(1, 100)
      expect(result).toBe(true)

      const activeChat = chatManager.getActiveChat()
      expect(activeChat).not.toBeNull()
      expect(activeChat?.chatId).toBe(100)
      expect(activeChat?.accountId).toBe(1)
    })
  })

  describe('closeChat', () => {
    it('should close the active chat', async () => {
      await chatManager.openChat(1, 100)
      chatManager.closeChat()

      const activeChat = chatManager.getActiveChat()
      expect(activeChat).toBeNull()
    })
  })

  describe('sendMessage', () => {
    it('should send a message to a chat', async () => {
      const msgId = await chatManager.sendMessage(1, 100, 'Hello!')
      expect(msgId).toBe(100) // Mocked return value
    })
  })

  describe('scheduleMessage', () => {
    it('should schedule a message for later', () => {
      const id = chatManager.scheduleMessage(
        1,
        100,
        'Scheduled message',
        Date.now() + 60000,
        'Test reason'
      )

      expect(id).toMatch(/^scheduled-/)

      const scheduled = chatManager.getScheduledMessages()
      expect(scheduled.length).toBe(1)
      expect(scheduled[0].text).toBe('Scheduled message')
    })

    it('should cancel a scheduled message', () => {
      const id = chatManager.scheduleMessage(
        1,
        100,
        'To be cancelled',
        Date.now() + 60000,
        'Test'
      )

      const result = chatManager.cancelScheduledMessage(id)
      expect(result).toBe(true)

      const scheduled = chatManager.getScheduledMessages()
      expect(scheduled.length).toBe(0)
    })
  })

  describe('checkForMention', () => {
    it('should detect Deep Tree Echo mentions', () => {
      expect(chatManager.checkForMention('Hey Deep Tree Echo!')).toBe(true)
      expect(chatManager.checkForMention('Hello DTE')).toBe(true)
      expect(chatManager.checkForMention('@bot help')).toBe(true)
      expect(chatManager.checkForMention('Hey echo, how are you?')).toBe(true)
      expect(chatManager.checkForMention('Hello there')).toBe(false)
    })
  })

  describe('watchChat', () => {
    it('should register and unregister watchers', () => {
      const callback = jest.fn()
      const unwatch = chatManager.watchChat(1, 100, callback)

      expect(typeof unwatch).toBe('function')

      // Unwatch
      unwatch()
    })
  })
})

describe('DeepTreeEchoUIBridge', () => {
  let uiBridge: any
  let mockContext: any

  beforeEach(async () => {
    // Reset singleton instance explicitly
    const { DeepTreeEchoUIBridge, getUIBridge: getUB } = require('../DeepTreeEchoUIBridge')
    DeepTreeEchoUIBridge.resetInstance()

    uiBridge = getUB()
    mockContext = {
      selectChat: jest.fn().mockResolvedValue(true),
      unselectChat: jest.fn(),
      chatId: 100,
    }
  })

  afterEach(() => {
    uiBridge.cleanup()
  })

  describe('registerChatContext', () => {
    it('should register a chat context', () => {
      uiBridge.registerChatContext(mockContext, 1)

      const selected = uiBridge.getSelectedChat()
      expect(selected).not.toBeNull()
      expect(selected?.chatId).toBe(100)
    })
  })

  describe('selectChat', () => {
    it('should return false when no context registered', async () => {
      const result = await uiBridge.selectChat(1, 100)
      expect(result).toBe(false)
    })

    it('should select chat when context is registered', async () => {
      const mockContext = {
        selectChat: jest.fn().mockResolvedValue(true),
        unselectChat: jest.fn(),
      }

      uiBridge.registerChatContext(mockContext, 1)
      const result = await uiBridge.selectChat(1, 100)

      expect(result).toBe(true)
      expect(mockContext.selectChat).toHaveBeenCalledWith(1, 100)
    })
  })

  describe('getState', () => {
    it('should return current UI state', () => {
      const state = uiBridge.getState()

      expect(state).toHaveProperty('currentView')
      expect(state).toHaveProperty('activeAccountId')
      expect(state).toHaveProperty('activeChatId')
      expect(state).toHaveProperty('isDialogOpen')
    })
  })

  describe('event system', () => {
    it('should emit and receive events', async () => {
      const listener = jest.fn()
      const unsubscribe = uiBridge.on(listener)

      const mockContext = {
        selectChat: jest.fn().mockResolvedValue(true),
        unselectChat: jest.fn(),
      }

      uiBridge.registerChatContext(mockContext, 1)
      await uiBridge.selectChat(1, 100)

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'chat_selected',
          chatId: 100,
          accountId: 1,
        })
      )

      unsubscribe()
    })
  })
})

describe('ProactiveMessaging', () => {
  let proactiveMessaging: any

  beforeEach(async () => {
    // Reset singleton instance explicitly
    const { ProactiveMessaging, getProactiveMessaging: getPM } = require('../ProactiveMessaging')
    const { DeepTreeEchoChatManager } = require('../DeepTreeEchoChatManager')
    const { DeepTreeEchoUIBridge } = require('../DeepTreeEchoUIBridge')

    ProactiveMessaging.resetInstance()
    DeepTreeEchoChatManager.resetInstance()
    DeepTreeEchoUIBridge.resetInstance()

    proactiveMessaging = getPM()
    jest.useFakeTimers()
  })

  afterEach(() => {
    proactiveMessaging.cleanup()
    jest.useRealTimers()
  })

  describe('configuration', () => {
    it('should have default configuration', () => {
      const config = proactiveMessaging.getConfig()

      expect(config.enabled).toBe(true)
      expect(config.maxMessagesPerHour).toBe(10)
      expect(config.maxMessagesPerDay).toBe(50)
    })

    it('should update configuration', () => {
      proactiveMessaging.updateConfig({
        maxMessagesPerHour: 20,
        quietHoursStart: 23,
      })

      const config = proactiveMessaging.getConfig()
      expect(config.maxMessagesPerHour).toBe(20)
      expect(config.quietHoursStart).toBe(23)
    })

    it('should enable/disable proactive messaging', () => {
      proactiveMessaging.setEnabled(false)
      expect(proactiveMessaging.getConfig().enabled).toBe(false)

      proactiveMessaging.setEnabled(true)
      expect(proactiveMessaging.getConfig().enabled).toBe(true)
    })
  })

  describe('triggers', () => {
    it('should add a trigger', () => {
      const id = proactiveMessaging.addTrigger({
        type: 'scheduled',
        name: 'Test Trigger',
        description: 'A test trigger',
        enabled: true,
        scheduledTime: Date.now() + 60000,
        targetType: 'specific_chat',
        targetChatId: 100,
        targetAccountId: 1,
        messageTemplate: 'Test message',
      })

      expect(id).toMatch(/^trigger-/)

      const triggers = proactiveMessaging.getTriggers()
      expect(triggers.some((t: any) => t.id === id)).toBe(true)
    })

    it('should remove a trigger', () => {
      const id = proactiveMessaging.addTrigger({
        type: 'interval',
        name: 'To Remove',
        description: 'Will be removed',
        enabled: true,
        intervalMinutes: 60,
        targetType: 'all_chats',
        messageTemplate: 'Test',
      })

      const result = proactiveMessaging.removeTrigger(id)
      expect(result).toBe(true)

      const trigger = proactiveMessaging.getTrigger(id)
      expect(trigger).toBeUndefined()
    })

    it('should enable/disable a trigger', () => {
      const id = proactiveMessaging.addTrigger({
        type: 'interval',
        name: 'Toggle Test',
        description: 'Test',
        enabled: true,
        intervalMinutes: 60,
        targetType: 'all_chats',
        messageTemplate: 'Test',
      })

      proactiveMessaging.setTriggerEnabled(id, false)

      const trigger = proactiveMessaging.getTrigger(id)
      expect(trigger?.enabled).toBe(false)
    })

    it('should have default triggers', () => {
      const triggers = proactiveMessaging.getTriggers()

      // Should have at least the welcome trigger
      const welcomeTrigger = triggers.find((t: any) => t.name === 'Welcome New Contact')
      expect(welcomeTrigger).toBeDefined()
      expect(welcomeTrigger?.enabled).toBe(true)
    })
  })

  describe('message queue', () => {
    it('should queue a message', () => {
      const id = proactiveMessaging.queueMessage({
        triggerId: 'test-trigger',
        accountId: 1,
        chatId: 100,
        message: 'Queued message',
        priority: 'normal',
      })

      expect(id).toMatch(/^msg-/)

      const queued = proactiveMessaging.getQueuedMessages()
      expect(queued.some((m: any) => m.id === id)).toBe(true)
    })

    it('should cancel a queued message', () => {
      const id = proactiveMessaging.queueMessage({
        triggerId: 'test-trigger',
        accountId: 1,
        chatId: 100,
        message: 'To cancel',
      })

      const result = proactiveMessaging.cancelQueuedMessage(id)
      expect(result).toBe(true)

      const queued = proactiveMessaging.getQueuedMessages()
      expect(queued.some((m: any) => m.id === id)).toBe(false)
    })

    it('should prioritize high priority messages', () => {
      proactiveMessaging.queueMessage({
        triggerId: 'test',
        accountId: 1,
        chatId: 100,
        message: 'Low priority',
        priority: 'low',
      })

      proactiveMessaging.queueMessage({
        triggerId: 'test',
        accountId: 1,
        chatId: 100,
        message: 'High priority',
        priority: 'high',
      })

      const queued = proactiveMessaging.getQueuedMessages()
      expect(queued[0].message).toBe('High priority')
    })
  })

  describe('scheduling', () => {
    it('should schedule a one-time message', () => {
      const triggerId = proactiveMessaging.scheduleOneTime(
        1,
        100,
        'Scheduled message',
        Date.now() + 3600000
      )

      expect(triggerId).toMatch(/^trigger-/)

      const trigger = proactiveMessaging.getTrigger(triggerId)
      expect(trigger?.type).toBe('scheduled')
      expect(trigger?.maxTriggers).toBe(1)
    })

    it('should set up periodic check-ins', () => {
      const triggerId = proactiveMessaging.setupPeriodicCheckIn(
        1,
        100,
        24, // Every 24 hours
        'Daily check-in message'
      )

      const trigger = proactiveMessaging.getTrigger(triggerId)
      expect(trigger?.type).toBe('interval')
      expect(trigger?.intervalMinutes).toBe(24 * 60)
    })
  })

  describe('event handling', () => {
    it('should handle events', async () => {
      // Add an event trigger
      proactiveMessaging.addTrigger({
        type: 'event',
        name: 'Test Event Handler',
        description: 'Handles test events',
        enabled: true,
        eventType: 'app_startup',
        targetType: 'all_chats',
        messageTemplate: 'App started!',
      })

      // This should not throw
      await proactiveMessaging.handleEvent('app_startup', {})
    })
  })
})

describe('Integration', () => {
  it('should export all required functions', async () => {
    const module = require('../index')

    // Chat Manager exports
    expect(module.chatManager).toBeDefined()
    expect(module.openChat).toBeDefined()
    expect(module.createChat).toBeDefined()
    expect(module.listChats).toBeDefined()
    expect(module.getUnreadChats).toBeDefined()
    expect(module.initiateConversation).toBeDefined()

    // UI Bridge exports
    expect(module.uiBridge).toBeDefined()
    expect(module.registerChatContext).toBeDefined()
    expect(module.registerDialogContext).toBeDefined()
    expect(module.registerComposer).toBeDefined()

    // Proactive Messaging exports
    expect(module.proactiveMessaging).toBeDefined()
    expect(module.sendProactiveMessage).toBeDefined()
    expect(module.scheduleMessage).toBeDefined()
  })
})
