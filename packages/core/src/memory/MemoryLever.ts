import { createHash } from "node:crypto";
import { getLogger } from "../utils/logger";
import {
  RAGMemoryStore,
  UnknownMemoryError,
  type Memory,
  type ReflectionMemory,
  type ScoredMemory,
} from "./RAGMemoryStore";
import type { MemoryStorage } from "./storage";
import { FileSystemStorage } from "./FileSystemStorage";

const log = getLogger("deep-tree-echo-core/memory/MemoryLever");

export const RAG_MEMORY_KEY = "deepTreeEchoBotMemories";
export const RAG_REFLECTION_KEY = "deepTreeEchoBotReflections";
export const VECTOR_MEMORY_KEY = "vectorMemoryStore_memories";

const DEFAULT_THRESHOLD = 0.5;
const DEFAULT_RETENTION_DAYS = 90;
const OPPOSITION: Record<string, string> = {
  ecs: "vercel",
  vercel: "ecs",
};
const NEGATION = new Set(["not", "never", "no"]);

export class MemoryLeverError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "MemoryLeverError";
  }
}

export interface MemoryHit {
  id: string;
  timestamp: number;
  chatId: number;
  sender: Memory["sender"];
  text: string;
  score: number;
}

export interface SearchFilters {
  chatId?: number;
  sender?: Memory["sender"];
  from?: number;
  to?: number;
  reflectionType?: ReflectionMemory["type"];
  reflectionAspect?: string;
  limit?: number;
  budgetChars?: number;
}

export interface SearchResult {
  hits: MemoryHit[];
  reflections: ReflectionMemory[];
  packedContext: string;
  unused_stores: string[];
}

export interface DreamMergeGroup {
  survivorId: string;
  loserIds: string[];
  score: number;
  reason: string;
  survivorText: string;
}

export interface DreamContradiction {
  ids: [string, string];
  score: number;
  reason: string;
}

export interface DreamPruneCandidate {
  id: string;
  reason: string;
}

export interface DreamPlan {
  merges: DreamMergeGroup[];
  contradictions: DreamContradiction[];
  prunes: DreamPruneCandidate[];
  unused_stores: string[];
  hash: string;
}

export interface ApplyAudit {
  proposed: DreamPlan;
  applied: { merges: string[]; prunes: string[] };
  skipped: string[];
  hash: string;
}

export interface ApplyHooks {
  beforeMutate?: () => Promise<void>;
  snapshot?: () => Promise<void>;
  restore?: () => Promise<void>;
}

export interface DreamOptions {
  threshold?: number;
  retentionDays?: number;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    return `{${entries
      .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashPlanBody(plan: Omit<DreamPlan, "hash">): string {
  return createHash("sha256").update(stableStringify(plan)).digest("hex");
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function foldUniqueText(survivor: string, loser: string): string {
  const existing = new Set(
    splitSentences(survivor).map((sentence) => sentence.toLowerCase()),
  );
  const extras = splitSentences(loser).filter(
    (sentence) => !existing.has(sentence.toLowerCase()),
  );
  if (extras.length === 0) {
    return survivor;
  }
  return `${survivor} ${extras.join(" ")}`.trim();
}

function significantTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

function uniqueNounSet(text: string): string {
  return [...new Set(significantTokens(text))].sort().join(" ");
}

function isContradictionPair(a: Memory, b: Memory): boolean {
  const tokensA = significantTokens(a.text);
  const tokensB = significantTokens(b.text);
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const shared = tokensA.filter((token) => setB.has(token));
  if (shared.length === 0) {
    return false;
  }
  const remainingA = tokensA.filter((token) => !setB.has(token));
  const remainingB = tokensB.filter((token) => !setA.has(token));
  for (const token of remainingA) {
    const opposite = OPPOSITION[token];
    if (opposite && remainingB.includes(opposite)) {
      return true;
    }
  }
  const aNeg = tokensA.some((token) => NEGATION.has(token));
  const bNeg = tokensB.some((token) => NEGATION.has(token));
  return aNeg !== bNeg && shared.length >= 2;
}

function toHit(scored: ScoredMemory): MemoryHit {
  return {
    id: scored.memory.id,
    timestamp: scored.memory.timestamp,
    chatId: scored.memory.chatId,
    sender: scored.memory.sender,
    text: scored.memory.text,
    score: scored.score,
  };
}

function compareHits(a: MemoryHit, b: MemoryHit): number {
  if (b.score !== a.score) {
    return b.score - a.score;
  }
  if (b.timestamp !== a.timestamp) {
    return b.timestamp - a.timestamp;
  }
  return a.id.localeCompare(b.id);
}

export class MemoryLever {
  constructor(
    private readonly store: RAGMemoryStore,
    private readonly unusedStores: string[] = [],
  ) {}

  static async open(
    storage: MemoryStorage,
    unusedStores: string[] = [],
  ): Promise<MemoryLever> {
    const store = new RAGMemoryStore(storage);
    await store.ready();
    store.setEnabled(true);
    return new MemoryLever(store, unusedStores);
  }

  static async openPath(storagePath: string): Promise<MemoryLever> {
    const storage = new FileSystemStorage({
      storagePath,
      createIfMissing: false,
    });
    let keys: string[];
    try {
      keys = await storage.keys();
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code: string }).code)
          : "";
      if (code === "ENOENT") {
        throw new MemoryLeverError(
          "missing_store",
          `Store path does not exist: ${storagePath}`,
        );
      }
      throw new MemoryLeverError(
        "missing_or_invalid",
        error instanceof Error ? error.message : String(error),
      );
    }
    const unusedStores: string[] = [];
    const sanitized = VECTOR_MEMORY_KEY.replace(/[^a-zA-Z0-9_-]/g, "_");
    if (keys.includes(sanitized) || keys.includes(VECTOR_MEMORY_KEY)) {
      unusedStores.push("vectorMemoryStore");
    }
    try {
      return await MemoryLever.open(storage, unusedStores);
    } catch (error) {
      throw new MemoryLeverError(
        "missing_or_invalid",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  search(query: string, filters: SearchFilters = {}): SearchResult {
    const limit = filters.limit ?? 50;
    const liveCount = this.store
      .listMemories()
      .filter((memory) => !memory.tombstoned).length;
    const scored = this.store
      .searchMemoriesWithScores(query, Math.max(liveCount, limit, 1))
      .filter((item) => item.tfidfScore + item.embeddingScore > 0)
      .filter((item) => {
        const memory = item.memory;
        if (filters.chatId !== undefined && memory.chatId !== filters.chatId) {
          return false;
        }
        if (filters.sender !== undefined && memory.sender !== filters.sender) {
          return false;
        }
        if (filters.from !== undefined && memory.timestamp < filters.from) {
          return false;
        }
        if (filters.to !== undefined && memory.timestamp > filters.to) {
          return false;
        }
        return true;
      })
      .map(toHit)
      .sort(compareHits)
      .slice(0, limit);

    const reflections = this.store.listReflections().filter((reflection) => {
      if (
        filters.reflectionType !== undefined &&
        reflection.type !== filters.reflectionType
      ) {
        return false;
      }
      if (
        filters.reflectionAspect !== undefined &&
        reflection.aspect !== filters.reflectionAspect
      ) {
        return false;
      }
      if (filters.reflectionType === undefined && filters.reflectionAspect === undefined) {
        const haystack = reflection.content.toLowerCase();
        return query
          .toLowerCase()
          .split(/\s+/)
          .filter((word) => word.length > 2)
          .some((word) => haystack.includes(word));
      }
      return true;
    });

    const packedContext = this.packContext(scored, filters.budgetChars);
    log.info("search complete", {
      hitCount: scored.length,
      reflectionCount: reflections.length,
    });
    return {
      hits: scored,
      reflections,
      packedContext,
      unused_stores: this.unusedStores,
    };
  }

  dream(options: DreamOptions = {}): DreamPlan {
    const threshold = options.threshold ?? DEFAULT_THRESHOLD;
    const retentionDays = options.retentionDays ?? DEFAULT_RETENTION_DAYS;
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const live = this.store
      .listMemories()
      .filter((memory) => !memory.tombstoned);

    const contradictionIds = new Set<string>();
    const contradictions: DreamContradiction[] = [];
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const left = live[i];
        const right = live[j];
        if (!isContradictionPair(left, right)) {
          continue;
        }
        contradictionIds.add(left.id);
        contradictionIds.add(right.id);
        contradictions.push({
          ids: [left.id, right.id].sort() as [string, string],
          score: 1,
          reason: "closed opposition table",
        });
      }
    }

    const mergeEligible = live.filter(
      (memory) => !contradictionIds.has(memory.id),
    );
    const assigned = new Set<string>();
    const merges: DreamMergeGroup[] = [];
    for (const memory of mergeEligible) {
      if (assigned.has(memory.id)) {
        continue;
      }
      const similar = this.store
        .findSimilarMemoriesWithScores(memory.id, threshold)
        .filter(
          (item) =>
            !item.memory.tombstoned &&
            !contradictionIds.has(item.memory.id) &&
            !assigned.has(item.memory.id),
        );
      if (similar.length === 0) {
        continue;
      }
      const group = [memory, ...similar.map((item) => item.memory)];
      group.sort((a, b) => {
        if (b.timestamp !== a.timestamp) {
          return b.timestamp - a.timestamp;
        }
        return b.text.length - a.text.length;
      });
      const survivor = group[0];
      const losers = group.slice(1);
      let survivorText = survivor.text;
      for (const loser of losers) {
        survivorText = foldUniqueText(survivorText, loser.text);
        assigned.add(loser.id);
      }
      assigned.add(survivor.id);
      merges.push({
        survivorId: survivor.id,
        loserIds: losers.map((item) => item.id).sort(),
        score: similar[0]?.score ?? threshold,
        reason: "similar memory above threshold",
        survivorText,
      });
    }

    const mergeLoserIds = new Set(merges.flatMap((group) => group.loserIds));
    const nounCounts = new Map<string, number>();
    for (const memory of live) {
      const key = uniqueNounSet(memory.text);
      nounCounts.set(key, (nounCounts.get(key) || 0) + 1);
    }
    const prunes: DreamPruneCandidate[] = [];
    for (const memory of live) {
      if (memory.timestamp >= cutoff) {
        continue;
      }
      if (memory.pinned === true) {
        continue;
      }
      if (contradictionIds.has(memory.id) || mergeLoserIds.has(memory.id)) {
        continue;
      }
      const key = uniqueNounSet(memory.text);
      if ((nounCounts.get(key) || 0) <= 1) {
        continue;
      }
      prunes.push({
        id: memory.id,
        reason: "older than retention and not unique-noun-only",
      });
    }

    const body: Omit<DreamPlan, "hash"> = {
      merges: merges.sort((a, b) => a.survivorId.localeCompare(b.survivorId)),
      contradictions: contradictions.sort((a, b) => a.ids[0].localeCompare(b.ids[0])),
      prunes: prunes.sort((a, b) => a.id.localeCompare(b.id)),
      unused_stores: this.unusedStores,
    };
    return { ...body, hash: hashPlanBody(body) };
  }

  async apply(
    plan: DreamPlan,
    options: { approve?: boolean; expectedHash?: string },
    hooks: ApplyHooks = {},
  ): Promise<ApplyAudit> {
    if (options.approve !== true) {
      throw new MemoryLeverError("unapproved", "Apply requires approve === true");
    }
    const expected = options.expectedHash ?? plan.hash;
    const recomputed = hashPlanBody({
      merges: plan.merges,
      contradictions: plan.contradictions,
      prunes: plan.prunes,
      unused_stores: plan.unused_stores,
    });
    if (expected !== recomputed || plan.hash !== recomputed) {
      throw new MemoryLeverError(
        "hash_mismatch",
        "Plan hash does not match recomputed hash",
      );
    }

    if (hooks.beforeMutate) {
      try {
        await hooks.beforeMutate();
      } catch (error) {
        if (error instanceof MemoryLeverError) {
          throw error;
        }
        throw new MemoryLeverError(
          "locked",
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    if (hooks.snapshot) {
      await hooks.snapshot();
    }

    const appliedMerges: string[] = [];
    const appliedPrunes: string[] = [];
    const skipped: string[] = [];
    const contradictionIds = new Set(plan.contradictions.flatMap((item) => item.ids));

    try {
      for (const group of plan.merges) {
        if (
          contradictionIds.has(group.survivorId) ||
          group.loserIds.some((id) => contradictionIds.has(id))
        ) {
          skipped.push(group.survivorId);
          continue;
        }
        await this.store.replaceMemory(group.survivorId, {
          text: group.survivorText,
        });
        for (const loserId of group.loserIds) {
          await this.store.tombstoneMemory(loserId);
        }
        appliedMerges.push(group.survivorId);
      }
      for (const prune of plan.prunes) {
        if (contradictionIds.has(prune.id)) {
          skipped.push(prune.id);
          continue;
        }
        await this.store.tombstoneMemory(prune.id);
        appliedPrunes.push(prune.id);
      }
    } catch (error) {
      if (hooks.restore) {
        await hooks.restore();
        await this.store.reload();
      }
      if (error instanceof UnknownMemoryError) {
        throw new MemoryLeverError("unknown_id", error.message);
      }
      throw error;
    }

    log.info("apply complete", {
      mergeCount: appliedMerges.length,
      pruneCount: appliedPrunes.length,
      skippedCount: skipped.length,
    });
    return {
      proposed: plan,
      applied: { merges: appliedMerges, prunes: appliedPrunes },
      skipped,
      hash: plan.hash,
    };
  }

  private packContext(hits: MemoryHit[], budgetChars?: number): string {
    const lines = hits.map(
      (hit) => `${hit.id} ${hit.sender}: ${hit.text}`,
    );
    if (budgetChars === undefined) {
      return lines.join("\n");
    }
    const kept: string[] = [];
    let used = 0;
    for (const line of lines) {
      const next = used === 0 ? line.length : used + 1 + line.length;
      if (next > budgetChars) {
        break;
      }
      kept.push(line);
      used = next;
    }
    return kept.join("\n");
  }
}
