/**
 * Node-only helpers for the standalone DeltaChat bot (`bin/deltecho-bot.ts`).
 *
 * Keep these off the browser barrels: BotMemory reaches the filesystem RAG
 * store through FileSystemStorage.
 */
export {
  BotMemory,
  openBotMemory,
  resolveBotStoragePath,
  EMPTY_RETRIEVAL,
  DEFAULT_RELEVANT_LIMIT,
  DEFAULT_RECENT_LIMIT,
  DEFAULT_MEMORY_BUDGET_CHARS,
  type BotMemorySkipReason,
  type OpenBotMemoryOptions,
  type OpenBotMemoryResult,
  type RetrievedMemories,
} from "./BotMemory";
export {
  buildReplyContext,
  resolveBotPersonality,
  DEFAULT_BOT_PERSONALITY,
  BOT_CAPABILITIES_CLAUSE,
  MEMORY_SECTION_HEADER,
  type ReplyContext,
  type BuildReplyContextOptions,
} from "./replyContext";
