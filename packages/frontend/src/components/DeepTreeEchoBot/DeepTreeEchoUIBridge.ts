/**
 * DeepTreeEchoUIBridge - React UI Interaction Layer for Deep Tree Echo
 * 
 * This module bridges Deep Tree Echo's cognitive system with the React UI,
 * allowing the AI to interact with the interface like a normal user would.
 * 
 * Architecture:
 * ```
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                    Deep Tree Echo UI Bridge                          │
 * │                                                                      │
 * │  ┌─────────────────────────────────────────────────────────────┐   │
 * │  │                 React Context Integration                    │   │
 * │  │    - ChatContext     : Chat selection & navigation           │   │
 * │  │    - DialogContext   : Modal dialogs & confirmations         │   │
 * │  │    - SettingsContext : App configuration                     │   │
 * │  └─────────────────────────────────────────────────────────────┘   │
 * │                              ↓                                      │
 * │  ┌─────────────────────────────────────────────────────────────┐   │
 * │  │                    UI Actions                                │   │
 * │  │    - selectChat()       : Focus a chat window                │   │
 * │  │    - unselectChat()     : Close chat view                    │   │
 * │  │    - openDialog()       : Show modal dialogs                 │   │
 * │  │    - scrollToMessage()  : Navigate to specific message       │   │
 * │  │    - setComposerText()  : Pre-fill message composer          │   │
 * │  └─────────────────────────────────────────────────────────────┘   │
 * │                              ↓                                      │
 * │  ┌─────────────────────────────────────────────────────────────┐   │
 * │  │                    UI State Observation                      │   │
 * │  │    - getCurrentView()   : Get active view/screen             │   │
 * │  │    - getVisibleChats()  : Get chats in viewport              │   │
 * │  │    - isDialogOpen()     : Check if modal is showing          │   │
 * │  └─────────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────┘
 * ```
 */

import { getLogger } from '@deltachat-desktop/shared/logger'
import { BackendRemote, Type as T } from '../../backend-com'
import { ActionEmitter, KeybindAction } from '../../keybindings'
import { DeepTreeEchoChatManager } from './DeepTreeEchoChatManager'

// Lazy logger to avoid initialization before logger handler is ready
let _log: ReturnType<typeof getLogger> | null = null
function log() {
  if (!_log) {
    _log = getLogger('render/components/DeepTreeEchoBot/DeepTreeEchoUIBridge')
  }
  return _log
}

/**
 * UI View types
 */
export type UIView =
  | 'chat-list'
  | 'chat-view'
  | 'settings'
  | 'global-gallery'
  | 'dialog'
  | 'unknown'

/**
 * Dialog types that can be opened
 */
export type DialogType =
  | 'create-chat'
  | 'create-group'
  | 'settings'
  | 'about'
  | 'qr-code'
  | 'forward-message'
  | 'confirm'
  | 'alert'

/**
 * UI State snapshot
 */
export interface UIState {
  currentView: UIView
  activeAccountId: number | null
  activeChatId: number | null
  isDialogOpen: boolean
  dialogType: DialogType | null
  composerText: string
  isComposerFocused: boolean
}

/**
 * Chat context interface (matches ChatContextValue)
 */
export interface ChatContextInterface {
  selectChat: (accountId: number, chatId: number) => Promise<boolean>
  unselectChat: () => void
  chatId?: number
  chatWithLinger?: T.FullChat
}

/**
 * Dialog context interface
 */
export interface DialogContextInterface {
  openDialog: (type: string, props?: any) => void
  closeDialog: () => void
}

/**
 * UI Bridge event types
 */
export type UIBridgeEvent =
  | { type: 'chat_selected'; chatId: number; accountId: number }
  | { type: 'chat_closed' }
  | { type: 'dialog_opened'; dialogType: DialogType }
  | { type: 'dialog_closed' }
  | { type: 'view_changed'; view: UIView }
  | { type: 'composer_changed'; text: string }

/**
 * UI Bridge event listener
 */
export type UIBridgeEventListener = (event: UIBridgeEvent) => void

/**
 * DeepTreeEchoUIBridge - Connects Deep Tree Echo to the React UI
 */
export class DeepTreeEchoUIBridge {
  private static instance: DeepTreeEchoUIBridge | null = null

  // Context references (set by React components)
  private chatContext: ChatContextInterface | null = null
  private dialogContext: DialogContextInterface | null = null
  private accountId: number | null = null

  // State
  private currentState: UIState = {
    currentView: 'chat-list',
    activeAccountId: null,
    activeChatId: null,
    isDialogOpen: false,
    dialogType: null,
    composerText: '',
    isComposerFocused: false,
  }

  // Event listeners
  private eventListeners: UIBridgeEventListener[] = []

  // Composer reference
  private composerRef: HTMLTextAreaElement | null = null

  private constructor() {
    log().info('DeepTreeEchoUIBridge initialized')

    // Auto-connect to ChatManager
    try {
      const chatManager = DeepTreeEchoChatManager.getInstance()
      chatManager.setUIBridge(this)
    } catch (err) {
      log().error('Failed to connect to ChatManager:', err)
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DeepTreeEchoUIBridge {
    if (!DeepTreeEchoUIBridge.instance) {
      DeepTreeEchoUIBridge.instance = new DeepTreeEchoUIBridge()
    }
    return DeepTreeEchoUIBridge.instance
  }

  // ============================================================
  // CONTEXT REGISTRATION (Called by React components)
  // ============================================================

  /**
   * Register the ChatContext
   */
  public registerChatContext(context: ChatContextInterface, accountId: number): void {
    this.chatContext = context
    this.accountId = accountId
    this.currentState.activeAccountId = accountId

    if (context.chatId) {
      this.currentState.activeChatId = context.chatId
      this.currentState.currentView = 'chat-view'
    }

    log().info('ChatContext registered with UI Bridge')
  }

  /**
   * Register the DialogContext
   */
  public registerDialogContext(context: DialogContextInterface): void {
    this.dialogContext = context
    log().info('DialogContext registered with UI Bridge')
  }

  /**
   * Register the composer element
   */
  public registerComposer(element: HTMLTextAreaElement | null): void {
    this.composerRef = element
  }

  /**
   * Update account ID
   */
  public setAccountId(accountId: number): void {
    this.accountId = accountId
    this.currentState.activeAccountId = accountId
  }

  /**
   * Reset singleton instance (for tests)
   */
  public static resetInstance(): void {
    if (DeepTreeEchoUIBridge.instance) {
      DeepTreeEchoUIBridge.instance.cleanup()
      DeepTreeEchoUIBridge.instance = null
    }
    _log = null
    _uiBridgeInstance = null
  }

  // ============================================================
  // CHAT OPERATIONS
  // ============================================================

  /**
   * Select/open a chat (like clicking on it)
   */
  public async selectChat(accountId: number, chatId: number): Promise<boolean> {
    if (!this.chatContext) {
      log().warn('ChatContext not registered, cannot select chat')
      return false
    }

    try {
      const result = await this.chatContext.selectChat(accountId, chatId)

      if (result) {
        this.currentState.activeChatId = chatId
        this.currentState.currentView = 'chat-view'
        this.emit({ type: 'chat_selected', chatId, accountId })
      }

      return result
    } catch (error) {
      log().error('Error selecting chat:', error)
      return false
    }
  }

  /**
   * Close/deselect the current chat
   */
  public unselectChat(): void {
    if (!this.chatContext) {
      log().warn('ChatContext not registered, cannot unselect chat')
      return
    }

    this.chatContext.unselectChat()
    this.currentState.activeChatId = null
    this.currentState.currentView = 'chat-list'
    this.emit({ type: 'chat_closed' })
  }

  /**
   * Get the currently selected chat
   */
  public getSelectedChat(): { accountId: number; chatId: number } | null {
    if (this.chatContext?.chatId && this.accountId) {
      return {
        accountId: this.accountId,
        chatId: this.chatContext.chatId,
      }
    }
    return null
  }

  /**
   * Get full info about the selected chat
   */
  public getSelectedChatInfo(): T.FullChat | null {
    return this.chatContext?.chatWithLinger || null
  }

  // ============================================================
  // NAVIGATION
  // ============================================================

  /**
   * Navigate to a specific view
   */
  public navigateTo(view: UIView): void {
    switch (view) {
      case 'chat-list':
        this.unselectChat()
        break
      case 'settings':
        ActionEmitter.emitAction(KeybindAction.Settings_Open)
        break
      case 'global-gallery':
        ActionEmitter.emitAction(KeybindAction.GlobalGallery_Open)
        break
    }

    this.currentState.currentView = view
    this.emit({ type: 'view_changed', view })
  }

  /**
   * Scroll to a specific message in the current chat
   */
  public scrollToMessage(msgId: number, highlight: boolean = true): void {
    if (!this.chatContext?.chatId || !this.accountId) {
      log().warn('No chat selected, cannot scroll to message')
      return
    }

    // Use the internal jump mechanism
    window.__internal_jump_to_message_asap = {
      accountId: this.accountId,
      chatId: this.chatContext.chatId,
      jumpToMessageArgs: [
        {
          msgId,
          highlight,
          focus: true,
          addMessageIdToStack: undefined,
        },
      ],
    }
    window.__internal_check_jump_to_message?.()
  }

  /**
   * Switch to archived chats view
   */
  public showArchivedChats(): void {
    ActionEmitter.emitAction(KeybindAction.ChatList_SwitchToArchiveView)
  }

  /**
   * Switch to normal chats view
   */
  public showNormalChats(): void {
    ActionEmitter.emitAction(KeybindAction.ChatList_SwitchToNormalView)
  }

  // ============================================================
  // COMPOSER OPERATIONS
  // ============================================================

  /**
   * Set text in the message composer
   */
  public setComposerText(text: string): void {
    if (this.composerRef) {
      this.composerRef.value = text
      this.composerRef.dispatchEvent(new Event('input', { bubbles: true }))
      this.currentState.composerText = text
      this.emit({ type: 'composer_changed', text })
    } else {
      log().warn('Composer not registered, cannot set text')
    }
  }

  /**
   * Focus the message composer
   */
  public focusComposer(): void {
    if (this.composerRef) {
      this.composerRef.focus()
      this.currentState.isComposerFocused = true
    }
  }

  /**
   * Get current composer text
   */
  public getComposerText(): string {
    return this.composerRef?.value || ''
  }

  /**
   * Clear the composer
   */
  public clearComposer(): void {
    this.setComposerText('')
  }

  /**
   * Alias for clearComposer to match tests
   */
  public clearComposerText(): void {
    this.clearComposer()
  }

  /**
   * Append text to composer
   */
  public appendToComposer(text: string): void {
    const current = this.getComposerText()
    this.setComposerText(current + text)
  }

  /**
   * Alias for appendToComposer to match tests
   */
  public appendComposerText(text: string): void {
    this.appendToComposer(text)
  }

  // ============================================================
  // DIALOG OPERATIONS
  // ============================================================

  /**
   * Open a dialog
   */
  public openDialog(type: DialogType, props?: any): void {
    if (!this.dialogContext) {
      log().warn('DialogContext not registered, cannot open dialog')
      return
    }

    this.dialogContext.openDialog(type, props)
    this.currentState.isDialogOpen = true
    this.currentState.dialogType = type
    this.emit({ type: 'dialog_opened', dialogType: type })
  }

  /**
   * Close the current dialog
   */
  public closeDialog(): void {
    if (!this.dialogContext) {
      return
    }

    this.dialogContext.closeDialog()
    this.currentState.isDialogOpen = false
    this.currentState.dialogType = null
    this.emit({ type: 'dialog_closed' })
  }

  /**
   * Show a confirmation dialog
   */
  public async showConfirm(message: string, title?: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.openDialog('confirm', {
        message,
        title,
        onConfirm: () => {
          this.closeDialog()
          resolve(true)
        },
        onCancel: () => {
          this.closeDialog()
          resolve(false)
        },
      })
    })
  }

  /**
   * Show an alert dialog
   */
  public showAlert(message: string, title?: string): void {
    this.openDialog('alert', { message, title })
  }

  // ============================================================
  // STATE OBSERVATION
  // ============================================================

  /**
   * Get current UI state
   */
  public getState(): UIState {
    return { ...this.currentState }
  }

  /**
   * Get current view
   */
  public getCurrentView(): UIView {
    return this.currentState.currentView
  }

  /**
   * Check if a dialog is open
   */
  public isDialogOpen(): boolean {
    return this.currentState.isDialogOpen
  }

  /**
   * Check if a chat is selected
   */
  public isChatSelected(): boolean {
    return this.currentState.activeChatId !== null
  }

  // ============================================================
  // EVENT SYSTEM
  // ============================================================

  /**
   * Subscribe to UI events
   */
  public on(listener: UIBridgeEventListener): () => void {
    this.eventListeners.push(listener)

    return () => {
      const index = this.eventListeners.indexOf(listener)
      if (index > -1) {
        this.eventListeners.splice(index, 1)
      }
    }
  }

  /**
   * Emit an event
   */
  private emit(event: UIBridgeEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        log().error('Error in UI Bridge event listener:', error)
      }
    })
  }

  // ============================================================
  // KEYBOARD SHORTCUTS
  // ============================================================

  /**
   * Trigger a keyboard action
   */
  public triggerKeyAction(action: KeybindAction): void {
    ActionEmitter.emitAction(action)
  }

  /**
   * Open search
   */
  public openSearch(): void {
    ActionEmitter.emitAction(KeybindAction.ChatList_FocusSearchInput)
  }

  /**
   * Focus chat list
   */
  public focusChatList(): void {
    ActionEmitter.emitAction(KeybindAction.ChatList_FocusItems)
  }

  /**
   * Select next chat
   */
  public selectNextChat(): void {
    ActionEmitter.emitAction(KeybindAction.ChatList_SelectNextChat)
  }

  /**
   * Select previous chat
   */
  public selectPreviousChat(): void {
    ActionEmitter.emitAction(KeybindAction.ChatList_SelectPreviousChat)
  }

  /**
   * Open new chat dialog
   */
  public openNewChat(): void {
    ActionEmitter.emitAction(KeybindAction.NewChat_Open)
  }

  /**
   * Open settings
   */
  public openSettings(): void {
    ActionEmitter.emitAction(KeybindAction.Settings_Open)
  }

  /**
   * Toggle AI Neighborhood view
   */
  public toggleAINeighborhood(): void {
    ActionEmitter.emitAction(KeybindAction.AINeighborhood_Toggle)
  }

  /**
   * Open keyboard shortcuts cheatsheet
   */
  public openKeyboardShortcuts(): void {
    ActionEmitter.emitAction(KeybindAction.KeybindingCheatSheet_Open)
  }

  /**
   * Page up in message list
   */
  public messageListPageUp(): void {
    ActionEmitter.emitAction(KeybindAction.MessageList_PageUp)
  }

  /**
   * Page down in message list
   */
  public messageListPageDown(): void {
    ActionEmitter.emitAction(KeybindAction.MessageList_PageDown)
  }

  /**
   * Search within current chat
   */
  public searchInChat(): void {
    ActionEmitter.emitAction(KeybindAction.ChatList_SearchInChat)
  }

  /**
   * Clear search and return to composer
   */
  public exitSearch(): void {
    ActionEmitter.emitAction(KeybindAction.ChatList_ExitSearch)
  }

  /**
   * Get all available keyboard actions
   * (Useful for AI to discover capabilities)
   */
  public getAvailableKeyboardActions(): string[] {
    return [
      'openSearch',
      'focusChatList',
      'selectNextChat',
      'selectPreviousChat',
      'openNewChat',
      'openSettings',
      'toggleAINeighborhood',
      'openKeyboardShortcuts',
      'messageListPageUp',
      'messageListPageDown',
      'searchInChat',
      'exitSearch',
      'focusComposer',
      'showArchivedChats',
      'showNormalChats',
    ]
  }

  // ============================================================
  // CLEANUP
  // ============================================================

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.chatContext = null
    this.dialogContext = null
    this.composerRef = null
    this.eventListeners = []
    log().info('UI Bridge cleaned up')
  }
}



// Export lazy singleton getter (avoids initialization before logger is ready)
let _uiBridgeInstance: DeepTreeEchoUIBridge | null = null
export function getUIBridge(): DeepTreeEchoUIBridge {
  if (!_uiBridgeInstance) {
    _uiBridgeInstance = DeepTreeEchoUIBridge.getInstance()
  }
  return _uiBridgeInstance
}

// Use Proxy for backward compatibility - lazily initializes on first access
export const uiBridge: DeepTreeEchoUIBridge = new Proxy({} as DeepTreeEchoUIBridge, {
  get(_target, prop) {
    return (getUIBridge() as any)[prop]
  }
})
