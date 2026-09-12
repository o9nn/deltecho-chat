import { sha256Hex, type CanonicalJsonObject } from "./canonical.js";

export type KsmCenter = "control" | "process" | "structure";

export interface Cog253PatternRecord {
  id: string;
  implementation_tier: "core" | "adapter" | "future" | "exclude";
  ksm_anchor: KsmCenter;
  relevance_score: number;
  acceptance_criterion: string;
}

export interface Cog253Mapping {
  patterns: Cog253PatternRecord[];
}

export interface CoreSelfDefinitions {
  definitions: Array<{ id: number }>;
}

export interface CoreSelfEvidenceRecord {
  status: "planned" | "implemented" | "verified" | "rejected";
  evidence: string[];
}

export type CoreSelfEvidenceRegistry = Record<string, CoreSelfEvidenceRecord>;

export interface EvidenceKsmCycleOptions {
  ledgerHead: string;
  observedAt: string;
  minimum?: number;
  maxCandidates?: number;
}

export interface EvidenceKsmMetric {
  center_id: KsmCenter;
  score: number;
  minimum: number;
  verified_count: number;
  total_count: number;
  additional_to_minimum: number;
  verified_evidence: string[];
}

export interface EvidenceKsmCycle {
  schema_version: "1.0.0";
  engine_version: "1.0.0";
  cycle_id: string;
  observed_at: string;
  input_hashes: {
    mapping_hash: string;
    definitions_hash: string;
    evidence_hash: string;
    ledger_head: string;
    engine_version: "1.0.0";
  };
  property_coherence: number;
  loss: number;
  converged: boolean;
  weakest_center: KsmCenter;
  metrics: EvidenceKsmMetric[];
  repair: {
    center_id: KsmCenter;
    selected_pattern_ids: string[];
    acceptance_criteria: string[];
    candidate_count: number;
    projected_score: number;
    remaining_to_minimum: number;
  };
  steps: Array<{
    step: number;
    verb: string;
    category: string;
    output: CanonicalJsonObject;
  }>;
  advisory: true;
  cycle_hash: string;
}

const CENTERS: KsmCenter[] = ["control", "process", "structure"];
const STEPS = [
  [1, "observe", "existence"],
  [2, "identify", "distinction"],
  [3, "find-weakness", "disjunction"],
  [4, "analyze", "conjunction"],
  [5, "discover", "transition"],
  [6, "inspect", "existence"],
  [7, "measure-error", "distinction"],
  [8, "calculate-gradient", "disjunction"],
  [9, "aggregate", "conjunction"],
  [10, "nest", "transition"],
  [11, "seal", "closure"],
  [12, "bootstrap", "recursion"],
] as const;

function rounded(value: number): number {
  return Number(value.toFixed(6));
}

export function runEvidenceKsmCycle(
  mapping: Cog253Mapping,
  definitions: CoreSelfDefinitions,
  evidence: CoreSelfEvidenceRegistry,
  options: EvidenceKsmCycleOptions,
): EvidenceKsmCycle {
  if (mapping.patterns.length !== 253) {
    throw new Error("KSM cycle requires exactly 253 Cog patterns");
  }
  if (definitions.definitions.length !== 61) {
    throw new Error("KSM cycle requires exactly 61 definitions");
  }
  const minimum = options.minimum ?? 0.5;
  const maxCandidates = options.maxCandidates ?? 20;
  if (!(minimum > 0 && minimum <= 1)) {
    throw new Error("KSM minimum must be within (0,1]");
  }
  if (!Number.isInteger(maxCandidates) || maxCandidates < 0) {
    throw new Error("KSM maxCandidates must be a non-negative integer");
  }
  if (!/^[a-f0-9]{64}$/.test(options.ledgerHead)) {
    throw new Error("KSM ledger head must be lowercase SHA-256");
  }

  const verified = new Set(
    Object.entries(evidence)
      .filter(
        ([, record]) =>
          (record.status === "implemented" || record.status === "verified") &&
          record.evidence.length > 0,
      )
      .map(([id]) => id),
  );
  const core = mapping.patterns.filter(
    (pattern) => pattern.implementation_tier === "core",
  );
  const metrics: EvidenceKsmMetric[] = CENTERS.map((center) => {
    const patterns = core.filter((pattern) => pattern.ksm_anchor === center);
    const covered = patterns.filter((pattern) => verified.has(pattern.id));
    const required = Math.ceil(patterns.length * minimum);
    return {
      center_id: center,
      score:
        patterns.length === 0 ? 1 : rounded(covered.length / patterns.length),
      minimum,
      verified_count: covered.length,
      total_count: patterns.length,
      additional_to_minimum: Math.max(0, required - covered.length),
      verified_evidence: covered.map((pattern) => pattern.id).sort(),
    };
  });
  const weakest = [...metrics].sort(
    (left, right) =>
      left.score - left.minimum - (right.score - right.minimum) ||
      left.score - right.score ||
      left.center_id.localeCompare(right.center_id),
  )[0];
  const coherence = rounded(
    metrics.reduce((sum, metric) => sum + metric.score, 0) / metrics.length,
  );
  const loss = rounded(1 - coherence);
  const deficits = Object.fromEntries(
    metrics.map((metric) => [
      metric.center_id,
      rounded(Math.max(0, metric.minimum - metric.score)),
    ]),
  ) as Record<KsmCenter, number>;
  const totalDeficit = Object.values(deficits).reduce(
    (sum, value) => sum + value,
    0,
  );
  const gradients = Object.fromEntries(
    CENTERS.map((center) => [
      center,
      totalDeficit === 0 ? 0 : rounded(deficits[center] / totalDeficit),
    ]),
  ) as Record<KsmCenter, number>;

  const candidates = core
    .filter(
      (pattern) =>
        pattern.ksm_anchor === weakest.center_id && !verified.has(pattern.id),
    )
    .sort(
      (left, right) =>
        right.relevance_score - left.relevance_score ||
        left.id.localeCompare(right.id),
    );
  const selected = candidates.slice(
    0,
    Math.min(weakest.additional_to_minimum, maxCandidates),
  );
  const projectedVerified = weakest.verified_count + selected.length;
  const repair = {
    center_id: weakest.center_id,
    selected_pattern_ids: selected.map((pattern) => pattern.id),
    acceptance_criteria: selected.map(
      (pattern) => pattern.acceptance_criterion,
    ),
    candidate_count: selected.length,
    projected_score:
      weakest.total_count === 0
        ? 1
        : rounded(projectedVerified / weakest.total_count),
    remaining_to_minimum: Math.max(
      0,
      weakest.additional_to_minimum - selected.length,
    ),
  };
  const inputHashes = {
    mapping_hash: sha256Hex(mapping as unknown as CanonicalJsonObject),
    definitions_hash: sha256Hex(definitions as unknown as CanonicalJsonObject),
    evidence_hash: sha256Hex(evidence as unknown as CanonicalJsonObject),
    ledger_head: options.ledgerHead,
    engine_version: "1.0.0" as const,
  };
  const cycleId = `ksm_${sha256Hex({
    ...inputHashes,
    weakest_center: weakest.center_id,
  }).slice(0, 16)}`;

  const outputs: CanonicalJsonObject[] = [
    {
      input_hashes: inputHashes,
      metrics: metrics as unknown as CanonicalJsonObject[],
    },
    {
      centers: CENTERS,
      metric: "verified-core-pattern-ratio",
    },
    {
      selected: weakest.center_id,
      score: weakest.score,
      minimum: weakest.minimum,
    },
    {
      verified_evidence: weakest.verified_evidence,
      missing_requirements: candidates.map((pattern) => pattern.id),
    },
    {
      transition: `strengthen:${weakest.center_id}`,
      repair,
    },
    {
      definitions: 61,
      patterns: 253,
      verified_patterns: verified.size,
    },
    { loss, deficits },
    { gradients, steepest: weakest.center_id },
    repair,
    { scope: `center:${weakest.center_id}`, parent: "core-self" },
    {
      candidate_hash: sha256Hex({ cycle_id: cycleId, repair }),
      closed: true,
    },
    {
      action: "submit-evidence-backed-proposal",
      direct_mutation: false,
      next_cycle_from_accepted_evidence: true,
    },
  ];
  const steps = STEPS.map(([step, verb, category], index) => ({
    step,
    verb,
    category,
    output: outputs[index],
  }));
  const base = {
    schema_version: "1.0.0" as const,
    engine_version: "1.0.0" as const,
    cycle_id: cycleId,
    observed_at: options.observedAt,
    input_hashes: inputHashes,
    property_coherence: coherence,
    loss,
    converged:
      coherence >= 0.8 && metrics.every((metric) => metric.score >= minimum),
    weakest_center: weakest.center_id,
    metrics,
    repair,
    steps,
    advisory: true as const,
  };
  return {
    ...base,
    cycle_hash: sha256Hex(base as unknown as CanonicalJsonObject),
  };
}
