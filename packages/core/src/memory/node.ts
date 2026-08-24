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
