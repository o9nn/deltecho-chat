/**
 * BotMemory - filesystem RAG access for the standalone DeltaChat bot.
 *
 * Node-only: reached through `deep-tree-echo-core/bot`, never the browser
 * memory barrel. This is the message path, so it only uses RAGMemoryStore
 * retrieval and persistence. Consolidation (MemoryLever dream/apply) is
 * scheduled hygiene and must stay out of here.
 */
import { access } from "node:fs/promises";
import { join } from "node:path";
import { getLogger } from "../utils/logger";
import { FileSystemStorage } from "../memory/FileSystemStorage";
import {
  RAGMemoryStore,
  RAG_MEMORY_KEY,
  type Memory,
} from "../memory/RAGMemoryStore";

const log = getLogger("deep-tree-echo-core/bot/BotMemory");

export const DEFAULT_RELEVANT_LIMIT = 6;
export const DEFAULT_RECENT_LIMIT = 4;
export const DEFAULT_MEMORY_BUDGET_CHARS = 4000;

/**
 * Why the bot is running without memory. Codes match the orchestrator's
 * scheduled-hygiene vocabulary so operators read one set of reasons.
 */
export type BotMemorySkipReason =
  | "unset_path"
  | "missing_store"
  | "no_rag_keys"
  | "missing_or_invalid";

export interface OpenBotMemoryOptions {
  storagePath?: string;
  env?: Record<string, string | undefined>;
  relevantLimit?: number;
  recentLimit?: number;
  budgetChars?: number;
}

export interface OpenBotMemoryResult {
  memory: BotMemory | null;
  skipped?: BotMemorySkipReason;
  storagePath?: string;
}

export interface RetrievedMemories {
  memories: Memory[];
  /** Prompt-ready text. Empty when nothing was retrieved. */
  block: string;
  /** True when the char budget dropped at least one candidate. */
  truncated: boolean;
}

export const EMPTY_RETRIEVAL: RetrievedMemories = {
  memories: [],
  block: "",
  truncated: false,
};

export function resolveBotStoragePath(
  options: OpenBotMemoryOptions = {},
): string {
  const env = options.env ?? process.env;
  return (
    options.storagePath ??
    env.DELTECHO_AUTONOMY_STORAGE_PATH ??
    ""
  ).trim();
}

function formatMemory(memory: Memory): string {
  const when = new Date(memory.timestamp).toISOString();
  return `[${when}] ${memory.sender}: ${memory.text}`;
}

/**
 * Live RAG retrieval and turn persistence for one bot process.
 *
 * Construct through `openBotMemory` so a missing or unreadable store degrades
 * to a skip reason instead of throwing on the inbound message path.
 */
export class BotMemory {
  private readonly relevantLimit: number;
  private readonly recentLimit: number;
  private readonly budgetChars: number;

  constructor(
    private readonly store: RAGMemoryStore,
    public readonly storagePath: string,
    options: Pick<
      OpenBotMemoryOptions,
      "relevantLimit" | "recentLimit" | "budgetChars"
    > = {},
  ) {
    this.relevantLimit = options.relevantLimit ?? DEFAULT_RELEVANT_LIMIT;
    this.recentLimit = options.recentLimit ?? DEFAULT_RECENT_LIMIT;
    this.budgetChars = options.budgetChars ?? DEFAULT_MEMORY_BUDGET_CHARS;
  }

  /**
   * Relevant live memories for this query, plus recent turns from the same
   * chat so the bot keeps continuity across restarts. Never throws.
   */
  public retrieve(query: string, chatId?: number): RetrievedMemories {
    let candidates: Memory[];
    try {
      const relevant = this.store.searchMemories(query, this.relevantLimit);
      const seen = new Set(relevant.map((memory) => memory.id));
      const recent =
        chatId === undefined
          ? []
          : this.store
              .getConversationContext(chatId, this.recentLimit)
              .filter((memory) => !seen.has(memory.id));
      candidates = [...relevant, ...recent];
    } catch (error) {
      log.error("memory retrieval failed", {
        code: "retrieval_failed",
        reason: error instanceof Error ? error.name : "unknown",
      });
      return EMPTY_RETRIEVAL;
    }

    const kept: Memory[] = [];
    const lines: string[] = [];
    let used = 0;
    let truncated = false;
    for (const memory of candidates) {
      const line = formatMemory(memory);
      if (used + line.length > this.budgetChars && kept.length > 0) {
        truncated = true;
        continue;
      }
      kept.push(memory);
      lines.push(line);
      used += line.length;
    }

    return { memories: kept, block: lines.join("\n"), truncated };
  }

  /**
   * Persist one completed exchange. Storage errors are swallowed by
   * RAGMemoryStore so a write problem cannot break the reply path.
   */
  public async rememberTurn(turn: {
    chatId: number;
    messageId: number;
    userText: string;
    botText: string;
  }): Promise<number> {
    let stored = 0;
    const userText = turn.userText.trim();
    const botText = turn.botText.trim();
    if (userText) {
      await this.store.storeMemory({
        chatId: turn.chatId,
        messageId: turn.messageId,
        sender: "user",
        text: userText,
      });
      stored++;
    }
    if (botText) {
      await this.store.storeMemory({
        chatId: turn.chatId,
        messageId: turn.messageId,
        sender: "bot",
        text: botText,
      });
      stored++;
    }
    return stored;
  }

  public isEnabled(): boolean {
    return this.store.isEnabled();
  }

  public liveMemoryCount(): number {
    return this.store.listLiveMemories().length;
  }
}

/**
 * Open the existing filesystem RAG store named by
 * `DELTECHO_AUTONOMY_STORAGE_PATH`.
 *
 * Never creates the directory and never creates `deepTreeEchoBotMemories.json`.
 * Anything unusable resolves to `{ memory: null, skipped }` so the bot still
 * answers without memory.
 */
export async function openBotMemory(
  options: OpenBotMemoryOptions = {},
): Promise<OpenBotMemoryResult> {
  const storagePath = resolveBotStoragePath(options);
  if (!storagePath) {
    return { memory: null, skipped: "unset_path" };
  }

  try {
    await access(join(storagePath, `${RAG_MEMORY_KEY}.json`));
  } catch {
    try {
      await access(storagePath);
    } catch {
      return { memory: null, skipped: "missing_store", storagePath };
    }
    return { memory: null, skipped: "no_rag_keys", storagePath };
  }

  const storage = new FileSystemStorage({
    storagePath,
    createIfMissing: false,
  });
  const store = new RAGMemoryStore(storage);
  try {
    await store.ready();
  } catch {
    return { memory: null, skipped: "missing_or_invalid", storagePath };
  }

  // storeMemory is a no-op while disabled; the bot persists turns.
  store.setEnabled(true);
  return {
    memory: new BotMemory(store, storagePath, options),
    storagePath,
  };
}
