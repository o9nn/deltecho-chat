/**
 * Node-only memory exports.
 *
 * Keep these off the browser-facing `deep-tree-echo-core/memory` barrel.
 * The desktop renderer bundles that path with platform: "browser" and cannot
 * resolve `node:crypto` / `node:fs`.
 */
export {
  MemoryLever,
  MemoryLeverError,
  VECTOR_MEMORY_KEY,
  type MemoryLeverErrorCode,
  type MemoryHit,
  type SearchResult,
  type SearchFilters,
  type DreamPlan,
  type DreamMergeGroup,
  type DreamContradiction,
  type DreamPruneCandidate,
  type ApplyAudit,
  type ApplyHooks,
} from "./MemoryLever";
export * from "./FileSystemStorage.js";
export {
  openBotMemorySession,
  assembleReplyContext,
  assembleBotSystemPrompt,
  persistBotTurn,
  retrieveRelevantMemories,
  resolveBotPersonality,
  DEFAULT_BOT_PERSONALITY,
  BOT_OPERATING_GUIDE,
  BOT_MEMORY_HIT_LIMIT,
  type BotMemorySession,
  type BotMemorySkipReason,
} from "./StandaloneBotMemory";
