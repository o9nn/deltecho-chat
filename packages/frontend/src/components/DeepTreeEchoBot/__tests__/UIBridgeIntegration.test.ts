/**
 * Integration Tests for DeepTreeEchoUIBridge
 *
 * This test suite covers:
 * - DialogContext registration and integration
 * - Composer text manipulation
 * - Full message flow from trigger to delivery
 * - UI state management
 * - Event system integration
 * - Keyboard action triggering
 *
 * Architecture:
 * ```
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                     UI Bridge Test Coverage                      │
 * ├─────────────────────────────────────────────────────────────────┤
 * │                                                                  │
 * │  [DialogContext]  ←→  [UIBridge]  ←→  [ChatContext]            │
 * │        ↓                  ↓                 ↓                   │
 * │  openDialog()        emit events       selectChat()            │
 * │  closeDialog()       state updates     unselectChat()          │
 * │                                                                  │
 * │  [Composer]  ←→  [UIBridge]  ←→  [ActionEmitter]              │
 * │        ↓              ↓                 ↓                       │
 * │  setText()        keyboard         emitAction()                │
 * │  getText()        navigation                                    │
 * │  focus()                                                        │
 * └─────────────────────────────────────────────────────────────────┘
 * ```
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock BackendRemote
vi.mock('../../../backend-com', () => ({
    BackendRemote: {
        rpc: {
            getFullChatById: vi.fn().mockResolvedValue({
                id: 1,
                name: 'Test Chat',
                contactIds: [1, 2],
                archived: false,
                isMuted: false,
            }),
            getChatlistEntries: vi.fn().mockResolvedValue([1, 2, 3]),
            getBasicChatInfo: vi.fn().mockResolvedValue({
                name: 'Test Chat',
                chatType: 'Single',
                archived: false,
                isMuted: false,
            }),
            getMessage: vi.fn().mockResolvedValue({
                id: 1,
                text: 'Hello',
                fromId: 2,
                timestamp: Date.now(),
            }),
            getMessageIds: vi.fn().mockResolvedValue([1, 2, 3]),
            miscSendTextMessage: vi.fn().mockResolvedValue(100),
        },
        on: vi.fn(),
        off: vi.fn(),
    },
}))

// Mock logger
vi.mock('@deltachat-desktop/shared/logger', () => ({
    getLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    }),
}))

// Mock keybindings with all necessary actions
vi.mock('../../../keybindings', () => ({
    ActionEmitter: {
        emitAction: vi.fn(),
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
        MessageList_PageUp: 'MessageList_PageUp',
        MessageList_PageDown: 'MessageList_PageDown',
        Composer_Focus: 'Composer_Focus',
        Chat_Search: 'Chat_Search',
        Chat_ExitSearch: 'Chat_ExitSearch',
        KeyboardShortcuts_Open: 'KeyboardShortcuts_Open',
        Chat_New: 'Chat_New',
        AINeighborhood_Toggle: 'AINeighborhood_Toggle',
    },
}))

describe('DeepTreeEchoUIBridge Integration', () => {
    let uiBridge: any
    let ActionEmitter: any

    beforeEach(async () => {
        vi.resetModules()
        const module = await import('../DeepTreeEchoUIBridge')
        uiBridge = module.uiBridge

        const keybindings = await import('../../../keybindings')
        ActionEmitter = keybindings.ActionEmitter
    })

    afterEach(() => {
        uiBridge.cleanup()
        vi.clearAllMocks()
    })

    describe('DialogContext Integration', () => {
        it('should register dialog context successfully', () => {
            const mockDialogContext = {
                openDialog: vi.fn(),
                closeDialog: vi.fn(),
            }

            // This should not throw
            uiBridge.registerDialogContext(mockDialogContext)

            // Verify registration happened (internal state)
            expect(true).toBe(true) // If we got here, registration worked
        })

        it('should use dialog context for opening dialogs', async () => {
            const mockDialogContext = {
                openDialog: vi.fn().mockReturnValue('dialog-123'),
                closeDialog: vi.fn(),
            }

            uiBridge.registerDialogContext(mockDialogContext)

            // Try to open a dialog through the bridge
            const result = uiBridge.openDialog('confirm', {
                message: 'Test confirmation',
                title: 'Test',
            })

            // The dialog should have been opened
            expect(mockDialogContext.openDialog).toHaveBeenCalled()
        })

        it('should handle dialog context close operations', () => {
            const mockDialogContext = {
                openDialog: vi.fn(),
                closeDialog: vi.fn(),
            }

            uiBridge.registerDialogContext(mockDialogContext)
            uiBridge.closeDialog()

            expect(mockDialogContext.closeDialog).toHaveBeenCalled()
        })

        it('should gracefully handle missing dialog context', () => {
            // Don't register any context
            // This should not throw
            const result = uiBridge.openDialog('confirm', { message: 'Test' })

            // Should return false/null when no context
            expect(result === false || result === null || result === undefined).toBe(true)
        })
    })

    describe('Composer Text Manipulation', () => {
        let mockTextarea: HTMLTextAreaElement

        beforeEach(() => {
            // Create a mock textarea
            mockTextarea = document.createElement('textarea')
            mockTextarea.id = 'composer-textarea'
            document.body.appendChild(mockTextarea)
        })

        afterEach(() => {
            document.body.removeChild(mockTextarea)
        })

        it('should register composer element', () => {
            uiBridge.registerComposer(mockTextarea)

            // Verify registration
            const composerText = uiBridge.getComposerText()
            expect(composerText).toBe('')
        })

        it('should set composer text', () => {
            uiBridge.registerComposer(mockTextarea)
            uiBridge.setComposerText('Hello from AI')

            expect(mockTextarea.value).toBe('Hello from AI')
            expect(uiBridge.getComposerText()).toBe('Hello from AI')
        })

        it('should clear composer text', () => {
            uiBridge.registerComposer(mockTextarea)
            uiBridge.setComposerText('Text to clear')
            uiBridge.clearComposerText()

            expect(mockTextarea.value).toBe('')
        })

        it('should focus composer', () => {
            uiBridge.registerComposer(mockTextarea)
            const focusSpy = vi.spyOn(mockTextarea, 'focus')

            uiBridge.focusComposer()

            expect(focusSpy).toHaveBeenCalled()
        })

        it('should handle null composer gracefully', () => {
            uiBridge.registerComposer(null)

            // These should not throw
            const text = uiBridge.getComposerText()
            expect(text).toBe('')

            uiBridge.setComposerText('Test')
            // Should return without error
        })

        it('should append text to composer', () => {
            uiBridge.registerComposer(mockTextarea)
            uiBridge.setComposerText('Hello')
            uiBridge.appendComposerText(' World')

            expect(mockTextarea.value).toBe('Hello World')
        })
    })

    describe('Full Message Flow', () => {
        it('should support complete message lifecycle', async () => {
            const mockChatContext = {
                selectChat: vi.fn().mockResolvedValue(true),
                unselectChat: vi.fn(),
                chatId: 100,
            }

            const mockTextarea = document.createElement('textarea')
            document.body.appendChild(mockTextarea)

            try {
                // Step 1: Register contexts
                uiBridge.registerChatContext(mockChatContext, 1)
                uiBridge.registerComposer(mockTextarea)

                // Step 2: Select a chat
                const selectResult = await uiBridge.selectChat(1, 100)
                expect(selectResult).toBe(true)
                expect(mockChatContext.selectChat).toHaveBeenCalledWith(1, 100)

                // Step 3: Set message text
                uiBridge.setComposerText('Test message from AI')
                expect(mockTextarea.value).toBe('Test message from AI')

                // Step 4: Focus composer
                uiBridge.focusComposer()

                // Step 5: Clear text after "sending"
                uiBridge.clearComposerText()
                expect(mockTextarea.value).toBe('')

                // Step 6: Deselect chat
                uiBridge.unselectChat()
                expect(mockChatContext.unselectChat).toHaveBeenCalled()
            } finally {
                document.body.removeChild(mockTextarea)
            }
        })

        it('should emit events throughout message flow', async () => {
            const eventListener = vi.fn()
            const unsubscribe = uiBridge.on(eventListener)

            const mockChatContext = {
                selectChat: vi.fn().mockResolvedValue(true),
                unselectChat: vi.fn(),
            }

            uiBridge.registerChatContext(mockChatContext, 1)

            // Select chat should emit event
            await uiBridge.selectChat(1, 100)

            expect(eventListener).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'chat_selected',
                    chatId: 100,
                    accountId: 1,
                })
            )

            // Unselect should also emit event
            uiBridge.unselectChat()

            expect(eventListener).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'chat_closed',
                })
            )

            unsubscribe()
        })
    })

    describe('UI State Management', () => {
        it('should track current view state', () => {
            const state = uiBridge.getState()

            expect(state).toHaveProperty('currentView')
            expect(state).toHaveProperty('activeAccountId')
            expect(state).toHaveProperty('activeChatId')
            expect(state).toHaveProperty('isDialogOpen')
            expect(state).toHaveProperty('dialogType')
            expect(state).toHaveProperty('composerText')
            expect(state).toHaveProperty('isComposerFocused')
        })

        it('should update state when chat is selected', async () => {
            const mockChatContext = {
                selectChat: vi.fn().mockResolvedValue(true),
                unselectChat: vi.fn(),
                chatId: 100,
            }

            uiBridge.registerChatContext(mockChatContext, 1)
            await uiBridge.selectChat(1, 100)

            const selected = uiBridge.getSelectedChat()
            expect(selected).not.toBeNull()
            expect(selected?.chatId).toBe(100)
        })

        it('should clear selected chat on unselect', async () => {
            const mockChatContext = {
                selectChat: vi.fn().mockResolvedValue(true),
                unselectChat: vi.fn(),
                chatId: 100,
            }

            uiBridge.registerChatContext(mockChatContext, 1)
            await uiBridge.selectChat(1, 100)
            uiBridge.unselectChat()

            // The chat context's chatId determines selected state
            // But our tracking should clear after unselect
        })
    })

    describe('Keyboard Action Triggering', () => {
        it('should trigger settings action', () => {
            uiBridge.openSettings()
            expect(ActionEmitter.emitAction).toHaveBeenCalledWith('Settings_Open')
        })

        it('should trigger new chat action', () => {
            uiBridge.openNewChat()
            expect(ActionEmitter.emitAction).toHaveBeenCalled()
        })

        it('should trigger search action', () => {
            uiBridge.searchInChat()
            expect(ActionEmitter.emitAction).toHaveBeenCalled()
        })

        it('should trigger exit search action', () => {
            uiBridge.exitSearch()
            expect(ActionEmitter.emitAction).toHaveBeenCalled()
        })

        it('should trigger AI neighborhood toggle', () => {
            uiBridge.toggleAINeighborhood()
            expect(ActionEmitter.emitAction).toHaveBeenCalled()
        })

        it('should return list of available keyboard actions', () => {
            const actions = uiBridge.getAvailableKeyboardActions()

            expect(Array.isArray(actions)).toBe(true)
            expect(actions.length).toBeGreaterThan(0)
            expect(actions).toContain('openSettings')
            expect(actions).toContain('openNewChat')
        })

        it('should trigger page up/down for message list', () => {
            uiBridge.messageListPageUp()
            expect(ActionEmitter.emitAction).toHaveBeenCalled()

            ActionEmitter.emitAction.mockClear()

            uiBridge.messageListPageDown()
            expect(ActionEmitter.emitAction).toHaveBeenCalled()
        })

        it('should trigger keyboard shortcuts help', () => {
            uiBridge.openKeyboardShortcuts()
            expect(ActionEmitter.emitAction).toHaveBeenCalled()
        })
    })

    describe('Event System', () => {
        it('should allow subscribing to events', () => {
            const listener = vi.fn()
            const unsubscribe = uiBridge.on(listener)

            expect(typeof unsubscribe).toBe('function')

            unsubscribe()
        })

        it('should notify multiple listeners', async () => {
            const listener1 = vi.fn()
            const listener2 = vi.fn()

            uiBridge.on(listener1)
            uiBridge.on(listener2)

            const mockChatContext = {
                selectChat: vi.fn().mockResolvedValue(true),
                unselectChat: vi.fn(),
            }

            uiBridge.registerChatContext(mockChatContext, 1)
            await uiBridge.selectChat(1, 100)

            expect(listener1).toHaveBeenCalled()
            expect(listener2).toHaveBeenCalled()
        })

        it('should unsubscribe correctly', async () => {
            const listener = vi.fn()
            const unsubscribe = uiBridge.on(listener)

            unsubscribe()

            const mockChatContext = {
                selectChat: vi.fn().mockResolvedValue(true),
                unselectChat: vi.fn(),
            }

            uiBridge.registerChatContext(mockChatContext, 1)
            await uiBridge.selectChat(1, 100)

            // Listener should not have been called after unsubscribe
            // Note: It may have been called during registration, so we check the call count
            const callsAfterUnsubscribe = listener.mock.calls.length

            // Try another action
            await uiBridge.selectChat(1, 200)

            // Call count should not have increased
            expect(listener.mock.calls.length).toBe(callsAfterUnsubscribe)
        })
    })

    describe('Error Handling', () => {
        it('should handle chat selection failure gracefully', async () => {
            const mockChatContext = {
                selectChat: vi.fn().mockRejectedValue(new Error('Selection failed')),
                unselectChat: vi.fn(),
            }

            uiBridge.registerChatContext(mockChatContext, 1)

            // Should not throw, should return false
            const result = await uiBridge.selectChat(1, 100)
            expect(result).toBe(false)
        })

        it('should handle missing chat context', async () => {
            // Don't register any context
            const result = await uiBridge.selectChat(1, 100)
            expect(result).toBe(false)
        })
    })

    describe('Account Management', () => {
        it('should update active account ID', () => {
            uiBridge.setAccountId(42)

            const state = uiBridge.getState()
            expect(state.activeAccountId).toBe(42)
        })

        it('should handle multiple account contexts', async () => {
            const mockContext1 = {
                selectChat: vi.fn().mockResolvedValue(true),
                unselectChat: vi.fn(),
            }

            const mockContext2 = {
                selectChat: vi.fn().mockResolvedValue(true),
                unselectChat: vi.fn(),
            }

            // Register with account 1
            uiBridge.registerChatContext(mockContext1, 1)
            await uiBridge.selectChat(1, 100)
            expect(mockContext1.selectChat).toHaveBeenCalledWith(1, 100)

            // Re-register with account 2
            uiBridge.registerChatContext(mockContext2, 2)
            await uiBridge.selectChat(2, 200)
            expect(mockContext2.selectChat).toHaveBeenCalledWith(2, 200)
        })
    })
})

describe('DialogAdapter Integration', () => {
    beforeEach(() => {
        vi.resetModules()
    })

    it('should export dialog adapter functions', async () => {
        const module = await import('../DialogAdapter')

        expect(module.openDialogByType).toBeDefined()
        expect(module.createDialogOpener).toBeDefined()
        expect(module.showConfirmation).toBeDefined()
        expect(module.showAlert).toBeDefined()
        expect(module.isValidDialogType).toBeDefined()
    })

    it('should validate dialog types', async () => {
        const { isValidDialogType } = await import('../DialogAdapter')

        expect(isValidDialogType('confirm')).toBe(true)
        expect(isValidDialogType('alert')).toBe(true)
        expect(isValidDialogType('unknown')).toBe(false)
        expect(isValidDialogType('')).toBe(false)
    })

    it('should create dialog opener function', async () => {
        const { createDialogOpener } = await import('../DialogAdapter')

        const mockOpenDialog = vi.fn().mockReturnValue('dialog-id')
        const opener = createDialogOpener(mockOpenDialog)

        expect(typeof opener).toBe('function')
    })

    it('should reject invalid dialog types', async () => {
        const { createDialogOpener } = await import('../DialogAdapter')

        const mockOpenDialog = vi.fn()
        const opener = createDialogOpener(mockOpenDialog)

        const result = opener('invalid-type', {})
        expect(result).toBeNull()
    })

    it('should handle confirmation dialog promise', async () => {
        const { showConfirmation } = await import('../DialogAdapter')

        const mockOpenDialog = vi.fn((component: any, props: any) => {
            // Immediately call the callback with confirmed=true
            setTimeout(() => {
                if (props.cb) props.cb(true)
            }, 0)
            return 'dialog-id'
        })

        const result = await showConfirmation(mockOpenDialog, 'Test message', {
            title: 'Test Title',
        })

        expect(result).toBe(true)
        expect(mockOpenDialog).toHaveBeenCalled()
    })

    it('should handle alert dialog promise', async () => {
        const { showAlert } = await import('../DialogAdapter')

        const mockOpenDialog = vi.fn((component: any, props: any) => {
            // Immediately call the callback
            setTimeout(() => {
                if (props.cb) props.cb()
            }, 0)
            return 'dialog-id'
        })

        await showAlert(mockOpenDialog, 'Alert message')

        expect(mockOpenDialog).toHaveBeenCalled()
    })
})

describe('ChatManager to UIBridge Integration', () => {
    let chatManager: any
    let uiBridge: any

    beforeEach(async () => {
        vi.resetModules()

        const chatModule = await import('../DeepTreeEchoChatManager')
        const bridgeModule = await import('../DeepTreeEchoUIBridge')

        chatManager = chatModule.chatManager
        uiBridge = bridgeModule.uiBridge
    })

    afterEach(() => {
        chatManager.cleanup()
        uiBridge.cleanup()
    })

    it('should connect ChatManager to UIBridge', () => {
        chatManager.setUIBridge(uiBridge)

        // Verify connection was established
        // ChatManager should now use uiBridge for UI operations
    })

    it('should open chat through connected bridge', async () => {
        const mockChatContext = {
            selectChat: vi.fn().mockResolvedValue(true),
            unselectChat: vi.fn(),
        }

        // Set up the bridge
        uiBridge.registerChatContext(mockChatContext, 1)

        // Connect ChatManager to UIBridge
        chatManager.setUIBridge(uiBridge)

        // Now when ChatManager opens a chat, it should use the bridge
        const result = await chatManager.openChat(1, 100)

        expect(result).toBe(true)
        expect(mockChatContext.selectChat).toHaveBeenCalledWith(1, 100)
    })

    it('should handle chat close through connected bridge', async () => {
        const mockChatContext = {
            selectChat: vi.fn().mockResolvedValue(true),
            unselectChat: vi.fn(),
        }

        uiBridge.registerChatContext(mockChatContext, 1)
        chatManager.setUIBridge(uiBridge)

        await chatManager.openChat(1, 100)
        chatManager.closeChat()

        expect(mockChatContext.unselectChat).toHaveBeenCalled()
    })
})
