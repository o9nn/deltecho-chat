import {
  assertCanonicalJson,
  sha256Hex,
  type CanonicalJsonObject,
} from "./canonical.js";
import {
  CORE_SELF_SCHEMA_VERSION,
  type CoreSelfEvidenceReference,
  type CoreSelfProposal,
} from "./contracts.js";
import { createCoreSelfProposal } from "./policy.js";

export type Ecco9BindingMode =
  | "inspired"
  | "adapted"
  | "manifest"
  | "vendored"
  | "runtime"
  | "deferred"
  | "excluded";

export interface Ecco9BindingRegistry {
  schema_version: "1.0.0";
  registry_id: string;
  source: {
    artifact_uri: string;
    archive_sha256: string;
    claimed_repository_uri: string;
    commit: string | null;
    commit_status: string;
    license: string;
    license_path: string;
    execution_permitted: false;
    canonical_authority: "none";
  };
  policy: CanonicalJsonObject;
  bindings: Array<{
    id: string;
    mode: Ecco9BindingMode;
    source_paths: string[];
    target: string | null;
    capability: string;
    authority: string;
    execution_permitted: false;
    acceptance_criterion: string;
  }>;
}

export interface Ecco9ManifestProposalInput {
  proposalId: string;
  proposerId: string;
  targetSubjectId: string;
  evidenceId: string;
  observedAt: string;
  basedOnHead: string | null;
}

const BINDING_MODES = new Set<Ecco9BindingMode>([
  "inspired",
  "adapted",
  "manifest",
  "vendored",
  "runtime",
  "deferred",
  "excluded",
]);

function requireString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
}

export function validateEcco9BindingRegistry(
  value: unknown,
): asserts value is Ecco9BindingRegistry {
  assertCanonicalJson(value);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Ecco9 binding registry must be an object");
  }
  const registry = value as unknown as Partial<Ecco9BindingRegistry>;
  if (registry.schema_version !== "1.0.0") {
    throw new Error("Unknown Ecco9 binding-registry schema version");
  }
  requireString(registry.registry_id, "registry_id");
  if (!registry.source || typeof registry.source !== "object") {
    throw new Error("Registry source must be an object");
  }
  requireString(registry.source.artifact_uri, "source.artifact_uri");
  requireString(
    registry.source.claimed_repository_uri,
    "source.claimed_repository_uri",
  );
  if (!/^[a-f0-9]{64}$/.test(registry.source.archive_sha256 ?? "")) {
    throw new Error("source.archive_sha256 must be lowercase SHA-256");
  }
  if (registry.source.execution_permitted !== false) {
    throw new Error("Ecco9 source execution must remain explicitly disabled");
  }
  if (registry.source.canonical_authority !== "none") {
    throw new Error("Ecco9 source cannot claim canonical identity authority");
  }
  if (!Array.isArray(registry.bindings) || registry.bindings.length === 0) {
    throw new Error("Registry requires at least one classified binding");
  }
  const ids = new Set<string>();
  for (const [index, binding] of registry.bindings.entries()) {
    requireString(binding?.id, `bindings[${index}].id`);
    if (ids.has(binding.id)) {
      throw new Error(`Duplicate Ecco9 binding '${binding.id}'`);
    }
    ids.add(binding.id);
    if (!BINDING_MODES.has(binding.mode)) {
      throw new Error(`Unknown binding mode '${String(binding.mode)}'`);
    }
    if (binding.execution_permitted !== false) {
      throw new Error(`Binding '${binding.id}' must not permit execution`);
    }
    if (
      !Array.isArray(binding.source_paths) ||
      binding.source_paths.length === 0
    ) {
      throw new Error(`Binding '${binding.id}' requires source paths`);
    }
    binding.source_paths.forEach((path, pathIndex) =>
      requireString(path, `bindings[${index}].source_paths[${pathIndex}]`),
    );
    requireString(binding.capability, `bindings[${index}].capability`);
    requireString(binding.authority, `bindings[${index}].authority`);
    requireString(
      binding.acceptance_criterion,
      `bindings[${index}].acceptance_criterion`,
    );
  }
}

export function createEcco9ManifestProposal(
  registry: unknown,
  input: Ecco9ManifestProposalInput,
): CoreSelfProposal {
  validateEcco9BindingRegistry(registry);
  const registryDigest = sha256Hex(registry);
  const modes = Object.fromEntries(
    [...BINDING_MODES]
      .sort()
      .map((mode) => [
        mode,
        registry.bindings.filter((binding) => binding.mode === mode).length,
      ]),
  );
  const evidence: CoreSelfEvidenceReference = {
    schemaVersion: CORE_SELF_SCHEMA_VERSION,
    id: input.evidenceId,
    kind: "artifact",
    sourceUri: registry.source.artifact_uri,
    relativePath: "docs/core-self/ecco9-binding-registry.json",
    sha256: registryDigest,
    schema: "dte-ecco9-binding-registry@1.0.0",
    observedAt: input.observedAt,
    claim:
      "The attached Ecco9 corpus was classified without execution and has no canonical DeltEcho identity authority.",
  };

  return createCoreSelfProposal({
    schemaVersion: CORE_SELF_SCHEMA_VERSION,
    proposalId: input.proposalId,
    proposerId: input.proposerId,
    rationale:
      "Register the source-visible Ecco9 classification as observation evidence; do not import or execute archive code.",
    basedOnHead: input.basedOnHead,
    candidate: {
      schemaVersion: CORE_SELF_SCHEMA_VERSION,
      eventType: "evidence.observe",
      targetSubjectId: input.targetSubjectId,
      actorId: input.proposerId,
      capability: "observe",
      occurredAt: input.observedAt,
      observedAt: input.observedAt,
      sourceRef: registry.registry_id,
      evidenceIds: [],
      payload: {
        evidence: evidence as unknown as CanonicalJsonObject,
        bindingSummary: modes,
        executionPermitted: false,
        canonicalAuthority: "none",
      },
    },
  });
}
