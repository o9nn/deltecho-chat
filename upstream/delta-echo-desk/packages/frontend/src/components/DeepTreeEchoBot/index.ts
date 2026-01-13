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
import BotSettings from './BotSettings'
import DeepTreeEchoSettingsScreen from './DeepTreeEchoSettingsScreen'
import {
  initDeepTreeEchoBot,
  saveBotSettings,
  getBotInstance,
  cleanupBot,
} from './DeepTreeEchoIntegration'
import {
  DeepTreeEchoTestUtil,
  createTestGroup,
  sendTestMessage,
  processMessageWithBot,
  runDemo,
  cleanup as cleanupTestUtil,
} from './DeepTreeEchoTestUtil'

export {
  DeepTreeEchoBot,
  BotSettings,
  DeepTreeEchoSettingsScreen,
  LLMService,
  PersonaCore,
  RAGMemoryStore,
  SelfReflection,
  CognitiveFunctionType,
  // Export integration functions
  initDeepTreeEchoBot,
  saveBotSettings,
  getBotInstance,
  cleanupBot,
  // Export test utilities
  DeepTreeEchoTestUtil,
  createTestGroup,
  sendTestMessage,
  processMessageWithBot,
  runDemo,
  cleanupTestUtil,
}

export type { DeepTreeEchoBotOptions }

// Export the main component as default
export default DeepTreeEchoBot

// Export the cognitive modules for advanced usage
export {
  HyperDimensionalMemory,
  AdaptivePersonality,
  QuantumBeliefPropagation,
  EmotionalIntelligence,
  SecureIntegration,
}
