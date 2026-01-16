/**
 * Deep Tree Echo Bot - Main Export Module
 * 
 * This module exports all Deep Tree Echo components including:
 * - Core bot functionality
 * - Cognitive modules (memory, personality, belief propagation, etc.)
 * - Chat management (programmatic chat control)
 * - UI bridge (React integration)
 * - Proactive messaging (autonomous communication)
 * - Settings and configuration
 * - UI components for proactive messaging
 * - Test utilities
 */

// Core cognitive modules
import { HyperDimensionalMemory } from './HyperDimensionalMemory'
import { AdaptivePersonality } from './AdaptivePersonality'
import { QuantumBeliefPropagation } from './QuantumBeliefPropagation'
import { EmotionalIntelligence } from './EmotionalIntelligence'
import { SecureIntegration } from './SecureIntegration'

// Import main component and its types
import { DeepTreeEchoBot, DeepTreeEchoBotOptions } from './DeepTreeEchoBot'

// Import utility modules
import { LLMService, CognitiveFunctionType } from './LLMService'
import { PersonaCore } from './PersonaCore'
import { RAGMemoryStore } from './RAGMemoryStore'
import { SelfReflection } from './SelfReflection'
import { ChatOrchestrator } from './ChatOrchestrator'

// Import chat management modules (NEW)
import {
  DeepTreeEchoChatManager,
  chatManager,
  ChatSummary,
  ActiveChatState,
  ScheduledMessage,
  ChatWatchCallback,
  ContactSummary,
  MessageSummary,
} from './DeepTreeEchoChatManager'

// Import UI bridge (NEW)
import {
  DeepTreeEchoUIBridge,
  uiBridge,
  UIView,
  DialogType,
  UIState,
  ChatContextInterface,
  DialogContextInterface,
  UIBridgeEvent,
  UIBridgeEventListener,
} from './DeepTreeEchoUIBridge'

// Import dialog adapter (NEW)
import {
  openDialogByType,
  createDialogOpener,
  showConfirmation,
  showAlert,
  isValidDialogType,
} from './DialogAdapter'
import type {
  ConfirmDialogProps,
  AlertDialogProps,
} from './DialogAdapter'

// Import proactive messaging (NEW)
import {
  ProactiveMessaging,
  proactiveMessaging,
  TriggerType,
  EventType,
  ProactiveTrigger,
  QueuedMessage,
  ProactiveConfig,
} from './ProactiveMessaging'

// Import unified cognitive bridge (@deltecho/cognitive integration)
import {
  initCognitiveOrchestrator,
  getOrchestrator,
  cleanupOrchestrator,
  processMessageUnified,
  getCognitiveState,
  configureLLM,
  onCognitiveEvent,
  clearHistory,
} from './CognitiveBridge'
import type {
  DeepTreeEchoBotConfig as UnifiedBotConfig,
  UnifiedMessage,
  UnifiedCognitiveState,
  CognitiveEvent,
} from './CognitiveBridge'

// Import UI components
import BotSettings from './BotSettings'
import DeepTreeEchoSettingsScreen from './DeepTreeEchoSettingsScreen'
import ProactiveMessagingSettings from './ProactiveMessagingSettings'
import TriggerManager from './TriggerManager'
import ProactiveStatusIndicator from './ProactiveStatusIndicator'

// Import avatar state components (cherry-picked from upstream)
import { DeepTreeEchoAvatarDisplay } from './DeepTreeEchoAvatarDisplay'
import {
  DeepTreeEchoAvatarProvider,
  useDeepTreeEchoAvatar,
  useDeepTreeEchoAvatarOptional,
  AvatarProcessingState,
} from './DeepTreeEchoAvatarContext'
import type {
  AvatarConfig,
  AvatarState,
  AvatarContextValue,
} from './DeepTreeEchoAvatarContext'
import {
  registerAvatarStateControl,
  setAvatarProcessingState,
  setAvatarSpeaking,
  setAvatarAudioLevel,
  setAvatarIdle,
  setAvatarListening,
  setAvatarThinking,
  setAvatarResponding,
  setAvatarError,
  stopLipSync,
} from './AvatarStateManager'

// Import integration functions
import {
  initDeepTreeEchoBot,
  saveBotSettings,
  getBotInstance,
  cleanupBot,
  // New exports for proactive features
  registerChatContext,
  registerDialogContext,
  registerComposer,
  getChatManager,
  getUIBridge,
  getProactiveMessaging,
  sendProactiveMessage,
  scheduleMessage,
  openChat,
  createChat,
  initiateConversation,
  listChats,
  getUnreadChats,
} from './DeepTreeEchoIntegration'

// Import test utilities
import {
  DeepTreeEchoTestUtil,
  createTestGroup,
  sendTestMessage,
  processMessageWithBot,
  runDemo,
  cleanup as cleanupTestUtil,
} from './DeepTreeEchoTestUtil'

// ============================================================
// MAIN EXPORTS
// ============================================================

export {
  // Core bot
  DeepTreeEchoBot,

  // UI Components
  BotSettings,
  DeepTreeEchoSettingsScreen,
  ProactiveMessagingSettings,
  TriggerManager,
  ProactiveStatusIndicator,

  // Avatar Components (cherry-picked from upstream)
  DeepTreeEchoAvatarDisplay,
  DeepTreeEchoAvatarProvider,
  useDeepTreeEchoAvatar,
  useDeepTreeEchoAvatarOptional,
  AvatarProcessingState,
  registerAvatarStateControl,
  setAvatarProcessingState,
  setAvatarSpeaking,
  setAvatarAudioLevel,
  setAvatarIdle,
  setAvatarListening,
  setAvatarThinking,
  setAvatarResponding,
  setAvatarError,
  stopLipSync,

  // Services
  LLMService,
  PersonaCore,
  RAGMemoryStore,
  SelfReflection,
  CognitiveFunctionType,

  // Integration functions
  initDeepTreeEchoBot,
  saveBotSettings,
  getBotInstance,
  cleanupBot,

  // Context registration (for React components)
  registerChatContext,
  registerDialogContext,
  registerComposer,

  // Test utilities
  DeepTreeEchoTestUtil,
  createTestGroup,
  sendTestMessage,
  processMessageWithBot,
  runDemo,
  cleanupTestUtil,
}

export type { DeepTreeEchoBotOptions }

// Avatar types (cherry-picked from upstream)
export type { AvatarConfig, AvatarState, AvatarContextValue }

// Export the main component as default
export default DeepTreeEchoBot

// ============================================================
// COGNITIVE MODULES
// ============================================================

export {
  HyperDimensionalMemory,
  AdaptivePersonality,
  QuantumBeliefPropagation,
  EmotionalIntelligence,
  SecureIntegration,
  ChatOrchestrator,
}

// ============================================================
// CHAT MANAGEMENT (NEW)
// ============================================================

export {
  // Chat Manager class and singleton
  DeepTreeEchoChatManager,
  chatManager,
  getChatManager,

  // Convenience functions
  openChat,
  createChat,
  listChats,
  getUnreadChats,
  initiateConversation,
}

export type {
  ChatSummary,
  ActiveChatState,
  ScheduledMessage as ChatScheduledMessage,
  ChatWatchCallback,
  ContactSummary,
  MessageSummary,
}

// ============================================================
// UI BRIDGE (NEW)
// ============================================================

export {
  // UI Bridge class and singleton
  DeepTreeEchoUIBridge,
  uiBridge,
  getUIBridge,
}

export type {
  UIView,
  DialogType,
  UIState,
  ChatContextInterface,
  DialogContextInterface,
  UIBridgeEvent,
  UIBridgeEventListener,
}

// ============================================================
// DIALOG ADAPTER (NEW)
// ============================================================

export {
  // Dialog helper functions
  openDialogByType,
  createDialogOpener,
  showConfirmation,
  showAlert,
  isValidDialogType,
}

export type {
  ConfirmDialogProps,
  AlertDialogProps,
}

// ============================================================
// PROACTIVE MESSAGING (NEW)
// ============================================================

export {
  // Proactive Messaging class and singleton
  ProactiveMessaging,
  proactiveMessaging,
  getProactiveMessaging,

  // Convenience functions
  sendProactiveMessage,
  scheduleMessage,
}

export type {
  TriggerType,
  EventType,
  ProactiveTrigger,
  QueuedMessage as ProactiveQueuedMessage,
  ProactiveConfig,
}

// ============================================================
// UNIFIED COGNITIVE FRAMEWORK
// ============================================================

export {
  initCognitiveOrchestrator,
  getOrchestrator,
  cleanupOrchestrator,
  processMessageUnified,
  getCognitiveState,
  configureLLM,
  onCognitiveEvent,
  clearHistory,
}

export type {
  UnifiedBotConfig,
  UnifiedMessage,
  UnifiedCognitiveState,
  CognitiveEvent,
}
