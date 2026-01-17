/**
 * Deep Tree Echo Bot - Main Export Module
 * 
 * This module exports all Deep Tree Echo components.
 */

// Core cognitive modules
export { HyperDimensionalMemory } from './HyperDimensionalMemory'
export { AdaptivePersonality } from './AdaptivePersonality'
export { QuantumBeliefPropagation } from './QuantumBeliefPropagation'
export { EmotionalIntelligence } from './EmotionalIntelligence'
export { SecureIntegration } from './SecureIntegration'

// Core bot
export { DeepTreeEchoBot } from './DeepTreeEchoBot'
export type { DeepTreeEchoBotOptions } from './DeepTreeEchoBot'
export { DeepTreeEchoBot as DeepTreeEchoBotComponent } from './DeepTreeEchoBotComponent'

// Services
export { LLMService } from './LLMService'
export type { CognitiveFunctionType } from './LLMService'
export { PersonaCore } from './PersonaCore'
export { RAGMemoryStore } from './RAGMemoryStore'
export { SelfReflection } from './SelfReflection'
export { ChatOrchestrator } from './ChatOrchestrator'

// Agentic modules
export {
  AgenticLLMService,
  getAgenticLLMService,
} from './AgenticLLMService'
export type {
  AgenticResponse,
  LLMProviderConfig,
} from './AgenticLLMService'

export {
  AgentToolExecutor,
  getAgentToolExecutor,
} from './AgentToolExecutor'
export type {
  AgentTool,
  ToolResult,
  ToolCall,
} from './AgentToolExecutor'

// Chat management
export {
  DeepTreeEchoChatManager,
  chatManager,
  getChatManager,
} from './DeepTreeEchoChatManager'
export type {
  ChatSummary,
  ActiveChatState,
  ScheduledMessage as ChatScheduledMessage,
  ChatWatchCallback,
  ContactSummary,
  MessageSummary,
} from './DeepTreeEchoChatManager'

// UI bridge
export {
  DeepTreeEchoUIBridge,
  uiBridge,
  getUIBridge,
} from './DeepTreeEchoUIBridge'
export type {
  UIView,
  DialogType as UIDialogType,
  UIState,
  ChatContextInterface,
  DialogContextInterface,
  UIBridgeEvent,
  UIBridgeEventListener,
} from './DeepTreeEchoUIBridge'

// Dialog adapter
export {
  openDialogByType,
  createDialogOpener,
  showConfirmation,
  showAlert,
  isValidDialogType,
} from './DialogAdapter'
export type {
  ConfirmDialogProps,
  AlertDialogProps,
} from './DialogAdapter'

// Proactive messaging
export {
  ProactiveMessaging,
  proactiveMessaging,
  getProactiveMessaging,
} from './ProactiveMessaging'
export type {
  TriggerType,
  EventType,
  ProactiveTrigger,
  QueuedMessage as ProactiveQueuedMessage,
  ProactiveConfig,
} from './ProactiveMessaging'

// Unified cognitive bridge
export {
  initCognitiveOrchestrator,
  getOrchestrator,
  cleanupOrchestrator,
  processMessageUnified,
  getCognitiveState,
  configureLLM,
  onCognitiveEvent,
  clearHistory,
} from './CognitiveBridge'
export type {
  DeepTreeEchoBotConfig as UnifiedBotConfig,
  UnifiedMessage,
  UnifiedCognitiveState,
  CognitiveEvent,
} from './CognitiveBridge'

// Integration functions
export {
  initDeepTreeEchoBot,
  saveBotSettings,
  getBotInstance,
  cleanupBot,
  resetBotInstance,
  registerChatContext,
  registerDialogContext,
  registerComposer,
  sendProactiveMessage,
  scheduleMessage,
  openChat,
  createChat,
  initiateConversation,
  listChats,
  getUnreadChats,
} from './DeepTreeEchoIntegration'

// UI components
export { default as BotSettings } from './BotSettings'
export { default as DeepTreeEchoSettingsScreen } from './DeepTreeEchoSettingsScreen'
export { default as ProactiveMessagingSettings } from './ProactiveMessagingSettings'
export { default as TriggerManager } from './TriggerManager'
export { default as ProactiveStatusIndicator } from './ProactiveStatusIndicator'

// Avatar Components
export { DeepTreeEchoAvatarDisplay } from './DeepTreeEchoAvatarDisplay'
export {
  DeepTreeEchoAvatarProvider,
  useDeepTreeEchoAvatar,
  useDeepTreeEchoAvatarOptional,
  AvatarProcessingState,
} from './DeepTreeEchoAvatarContext'
export type {
  AvatarConfig,
  AvatarState,
  AvatarContextValue,
} from './DeepTreeEchoAvatarContext'

export {
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
  startStreamingLipSync,
  stopStreamingLipSync,
  updateStreamingMouthShape,
  onMouthShapeUpdate,
  offMouthShapeUpdate,
  getCurrentMouthShape,
  isStreamingLipSyncActive,
  createAvatarLipSyncReceiver,
} from './AvatarStateManager'
export type { MouthShape } from './AvatarStateManager'

// Streaming Avatar Service
export {
  StreamingAvatarService,
  getStreamingAvatarService,
  createStreamingAvatarService,
} from './StreamingAvatarService'
export type {
  StreamingAvatarConfig,
  StreamingAvatarEvent,
  StreamingAvatarEventType,
  StreamChunk,
  ChatMessage as StreamingChatMessage,
  StreamingLLMProvider,
} from './StreamingAvatarService'

// Test utilities
export {
  DeepTreeEchoTestUtil,
  createTestGroup,
  sendTestMessage,
  processMessageWithBot,
  runDemo,
  cleanup as cleanupTestUtil,
} from './DeepTreeEchoTestUtil'

// Default export
import { DeepTreeEchoBot } from './DeepTreeEchoBot'
export default DeepTreeEchoBot
