/**
 * Filesystem RAG session for the standalone DeltaChat bot (`pnpm start:bot`).
 *
 * Opens an existing `deepTreeEchoBotMemories` store with createIfMissing: false.
 * Retrieve + persist use RAGMemoryStore only. MemoryLever dream/apply stay off
 * this message path (those are scheduled hygiene, not inbound chat).
 */
import { access } from "node:fs/promises";
import { join } from "node:path";
import { getLogger } from "../utils/logger";
import { FileSystemStorage } from "./FileSystemStorage";
import { RAG_MEMORY_KEY, RAGMemoryStore, type Memory } from "./RAGMemoryStore";

const log = getLogger("deep-tree-echo-core/memory/StandaloneBotMemory");

export const DEFAULT_BOT_PERSONALITY =
  "You are Deep Tree Echo, a helpful AI assistant integrated into DeltaChat.";

export const BOT_OPERATING_GUIDE = `Your capabilities:
- Execute bash commands to help with programming tasks
- Provide coding assistance and explanations
- Help with file operations, git, and system tasks

Guidelines:
- Keep responses concise and helpful
- Use the bash tool when you need to run commands
- Be careful with destructive operations
- Explain what you're doing when executing commands
- If a task requires multiple steps, break it down clearly`;

export const BOT_MEMORY_HIT_LIMIT = 5;

export type BotMemorySkipReason =
  | "unset_path"
  | "missing_store"
  | "no_rag_keys"
  | "missing_or_invalid";

export type BotMemorySession =
  | { ok: true; store: RAGMemoryStore; storagePath: string }
  | { ok: false; reason: BotMemorySkipReason };

function skip(reason: BotMemorySkipReason): BotMemorySession {
  log.info("standalone bot memory skipped", { reason });
  return { ok: false, reason };
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

/**
 * Open an existing filesystem RAG store for the standalone bot.
 * Never creates a directory or `deepTreeEchoBotMemories.json`.
 */
export async function openBotMemorySession(
  storagePath?: string | null,
): Promise<BotMemorySession> {
  const path = (storagePath ?? "").trim();
  if (!path) {
    return skip("unset_path");
  }

  try {
    if (!(await pathExists(path))) {
      return skip("missing_store");
    }
    if (!(await pathExists(join(path, `${RAG_MEMORY_KEY}.json`)))) {
      return skip("no_rag_keys");
    }

    const storage = new FileSystemStorage({
      storagePath: path,
      createIfMissing: false,
    });
    const store = new RAGMemoryStore(storage);
    await store.ready();
    store.setEnabled(true);
    log.info("standalone bot memory opened", { path });
    return { ok: true, store, storagePath: path };
  } catch {
    return skip("missing_or_invalid");
  }
}

export function retrieveRelevantMemories(
  store: RAGMemoryStore,
  query: string,
  limit: number = BOT_MEMORY_HIT_LIMIT,
): Memory[] {
  return store.searchMemories(query, limit);
}

export function assembleBotSystemPrompt(options: {
  personality?: string | null;
  memories: ReadonlyArray<Pick<Memory, "sender" | "text">>;
}): string {
  const personality = options.personality?.trim() || DEFAULT_BOT_PERSONALITY;
  const sections = [personality, BOT_OPERATING_GUIDE];
  if (options.memories.length > 0) {
    const lines = options.memories.map(
      (memory) => `${memory.sender}: ${memory.text}`,
    );
    sections.push(`Relevant memories:\n${lines.join("\n")}`);
  }
  return sections.join("\n\n");
}

export function assembleReplyContext(
  session: BotMemorySession,
  userMessage: string,
  personality?: string | null,
): { systemPrompt: string; hitCount: number } {
  const memories = session.ok
    ? retrieveRelevantMemories(session.store, userMessage)
    : [];
  return {
    systemPrompt: assembleBotSystemPrompt({ personality, memories }),
    hitCount: memories.length,
  };
}

export async function persistBotTurn(
  store: RAGMemoryStore,
  turn: {
    chatId: number;
    userMessage: string;
    botReply: string;
    userMessageId?: number;
    botMessageId?: number;
  },
): Promise<void> {
  store.setEnabled(true);
  await store.storeMemory({
    chatId: turn.chatId,
    messageId: turn.userMessageId ?? 0,
    sender: "user",
    text: turn.userMessage,
  });
  await store.storeMemory({
    chatId: turn.chatId,
    messageId: turn.botMessageId ?? 0,
    sender: "bot",
    text: turn.botReply,
  });
  log.info("standalone bot turn persisted", {
    chatId: turn.chatId,
    count: 2,
  });
}

export function resolveBotPersonality(
  value: string | undefined | null,
): string | undefined {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
