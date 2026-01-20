/**
 * Cross-Platform Module Exports
 *
 * Provides unified systems for cross-platform bot integration
 */

// Presence Management
export {
  UnifiedPresenceManager,
  createPresenceManager,
  Platform,
  PresenceStatus,
  ActivityType,
  PlatformPresence,
  UnifiedPresence,
  PresenceUpdate,
  PresenceEventType,
  PresenceEvent,
  PresenceAdapter,
} from "./presence-manager.js";

// Conversation Continuity
export {
  ConversationContinuityManager,
  createConversationManager,
  Participant,
  CrossPlatformMessage,
  CrossPlatformConversation,
  ConversationContext,
  UserMapping,
  LinkConversationRequest,
  ConversationEventType,
  ConversationEvent,
  MessageAttachment,
} from "./conversation-continuity.js";

// Shared Memory
export {
  SharedMemoryManager,
  createSharedMemoryManager,
  MemoryType,
  MemoryEntry,
  MemoryQuery,
  MemorySearchResult,
  MemoryStoreBackend,
  MemoryEventType,
  MemoryEvent,
  InMemoryStoreBackend,
} from "./shared-memory.js";
