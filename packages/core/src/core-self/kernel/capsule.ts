import {
  cloneCanonical,
  isSha256Hex,
  sha256Hex,
  type CanonicalJsonValue,
} from "./canonical.js";
import {
  CORE_SELF_SCHEMA_VERSION,
  CoreSelfContractError,
  assertCoreSelfId,
  assertIsoTimestamp,
  type CoreSelfRelation,
  type CoreSelfSubject,
} from "./contracts.js";
import { CoreSelfIdentityHypergraph } from "./hypergraph.js";
import { CoreSelfLedger, type CoreSelfLedgerExport } from "./ledger.js";
import { CoreSelfPolicyGate } from "./policy.js";

export interface CoreSelfCapsuleSource {
  repositoryUri: string;
  commit: string;
}

export interface CoreSelfCapsule {
  schemaVersion: "1.0.0";
  capsuleId: string;
  rootSubjectId: string;
  source: CoreSelfCapsuleSource;
  createdAt: string;
  evidenceIds: string[];
  ledger: CoreSelfLedgerExport;
  subjects: CoreSelfSubject[];
  relations: CoreSelfRelation[];
  ledgerHeadDigest: string;
  projectedStateDigest: string;
  graphDigest: string;
  capsuleDigest: string;
}

export interface CoreSelfCapsuleInput {
  capsuleId: string;
  source: CoreSelfCapsuleSource;
  createdAt: string;
  evidenceIds?: string[];
  subjectIds?: string[];
  relationIds?: string[];
}

export interface CoreSelfCapsuleVerification {
  valid: boolean;
  errors: string[];
  ledgerHeadDigest: string | null;
  projectedStateDigest: string | null;
  graphDigest: string | null;
}

function cloneValue<T>(value: T): T {
  return cloneCanonical(value as unknown as CanonicalJsonValue) as unknown as T;
}

function compareId(left: { id: string }, right: { id: string }): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function computeCapsuleDigest(
  capsule: Omit<CoreSelfCapsule, "capsuleDigest"> | CoreSelfCapsule,
): string {
  const { capsuleDigest: _ignored, ...body } = capsule as CoreSelfCapsule;
  return sha256Hex(body);
}

function validateSource(source: CoreSelfCapsuleSource): void {
  if (!source || typeof source !== "object") {
    throw new CoreSelfContractError("Capsule source must be an object");
  }
  if (
    typeof source.repositoryUri !== "string" ||
    source.repositoryUri.trim().length === 0
  ) {
    throw new CoreSelfContractError(
      "Capsule source.repositoryUri must be non-empty",
    );
  }
  if (!/^[a-f0-9]{40,64}$/.test(source.commit)) {
    throw new CoreSelfContractError(
      "Capsule source.commit must be an immutable hexadecimal commit",
    );
  }
}

function sortedUniqueIds(ids: string[], field: string): string[] {
  const sorted = [...ids].sort();
  for (let index = 0; index < sorted.length; index += 1) {
    assertCoreSelfId(sorted[index], `${field}[${index}]`);
    if (sorted[index] === sorted[index - 1]) {
      throw new CoreSelfContractError(`${field} must be unique`);
    }
  }
  return sorted;
}

export function createCoreSelfCapsule(
  ledger: CoreSelfLedger,
  input: CoreSelfCapsuleInput,
): CoreSelfCapsule {
  assertCoreSelfId(input.capsuleId, "capsule.capsuleId");
  assertIsoTimestamp(input.createdAt, "capsule.createdAt");
  validateSource(input.source);

  const exported = ledger.export();
  if (!exported.projectedState.rootSubjectId || !ledger.head) {
    throw new CoreSelfContractError(
      "Capsule creation requires an initialized identity ledger",
    );
  }

  const graph = new CoreSelfIdentityHypergraph(exported.projectedState);
  const graphExport = graph.export();
  const subjectIds = new Set(
    sortedUniqueIds(
      input.subjectIds ?? graphExport.subjects.map((subject) => subject.id),
      "capsule.subjectIds",
    ),
  );
  const relationIds = new Set(
    sortedUniqueIds(
      input.relationIds ?? graphExport.relations.map((relation) => relation.id),
      "capsule.relationIds",
    ),
  );

  if (!subjectIds.has(exported.projectedState.rootSubjectId)) {
    throw new CoreSelfContractError("Capsule must include the root subject");
  }

  const subjects = graphExport.subjects.filter((subject) =>
    subjectIds.has(subject.id),
  );
  const relations = graphExport.relations.filter((relation) =>
    relationIds.has(relation.id),
  );
  for (const relation of relations) {
    for (const endpoint of relation.endpoints) {
      if (!subjectIds.has(endpoint.subjectId)) {
        throw new CoreSelfContractError(
          `Capsule relation '${relation.id}' references an omitted subject`,
        );
      }
    }
  }

  const selectedGraph = {
    schemaVersion: CORE_SELF_SCHEMA_VERSION,
    rootSubjectId: exported.projectedState.rootSubjectId,
    subjects: subjects.sort(compareId),
    relations: relations.sort(compareId),
  } as const;

  const capsule: CoreSelfCapsule = {
    schemaVersion: CORE_SELF_SCHEMA_VERSION,
    capsuleId: input.capsuleId,
    rootSubjectId: exported.projectedState.rootSubjectId,
    source: cloneValue(input.source),
    createdAt: input.createdAt,
    evidenceIds: sortedUniqueIds(
      input.evidenceIds ?? Object.keys(exported.projectedState.evidence),
      "capsule.evidenceIds",
    ),
    ledger: exported,
    subjects: selectedGraph.subjects,
    relations: selectedGraph.relations,
    ledgerHeadDigest: ledger.head,
    projectedStateDigest: ledger.stateDigest,
    graphDigest: sha256Hex(selectedGraph),
    capsuleDigest: "",
  };
  capsule.capsuleDigest = computeCapsuleDigest(capsule);
  return cloneValue(capsule);
}

export function verifyCoreSelfCapsule(
  capsule: CoreSelfCapsule,
  policy: CoreSelfPolicyGate,
): CoreSelfCapsuleVerification {
  const errors: string[] = [];
  let replayed: CoreSelfLedger | null = null;
  let graphDigest: string | null = null;

  try {
    if (capsule.schemaVersion !== CORE_SELF_SCHEMA_VERSION) {
      throw new CoreSelfContractError("Unknown capsule schema version");
    }
    assertCoreSelfId(capsule.capsuleId, "capsule.capsuleId");
    assertCoreSelfId(capsule.rootSubjectId, "capsule.rootSubjectId");
    assertIsoTimestamp(capsule.createdAt, "capsule.createdAt");
    validateSource(capsule.source);
    if (!isSha256Hex(capsule.ledgerHeadDigest)) {
      throw new CoreSelfContractError("Capsule ledger head must be SHA-256");
    }
    if (!isSha256Hex(capsule.projectedStateDigest)) {
      throw new CoreSelfContractError("Capsule state digest must be SHA-256");
    }
    if (!isSha256Hex(capsule.graphDigest)) {
      throw new CoreSelfContractError("Capsule graph digest must be SHA-256");
    }
    if (!isSha256Hex(capsule.capsuleDigest)) {
      throw new CoreSelfContractError("Capsule digest must be SHA-256");
    }
    sortedUniqueIds(capsule.evidenceIds, "capsule.evidenceIds");
    if (computeCapsuleDigest(capsule) !== capsule.capsuleDigest) {
      throw new CoreSelfContractError("Capsule digest mismatch");
    }

    replayed = new CoreSelfLedger(policy);
    replayed.import(capsule.ledger);
    if (replayed.head !== capsule.ledgerHeadDigest) {
      throw new CoreSelfContractError("Capsule ledger head mismatch");
    }
    if (replayed.stateDigest !== capsule.projectedStateDigest) {
      throw new CoreSelfContractError(
        "Capsule projected-state digest mismatch",
      );
    }
    if (replayed.getProjectedState().rootSubjectId !== capsule.rootSubjectId) {
      throw new CoreSelfContractError("Capsule root subject mismatch");
    }

    const selectedGraph = {
      schemaVersion: CORE_SELF_SCHEMA_VERSION,
      rootSubjectId: capsule.rootSubjectId,
      subjects: [...capsule.subjects].sort(compareId),
      relations: [...capsule.relations].sort(compareId),
    } as const;
    const replayGraph = new CoreSelfIdentityHypergraph(
      replayed.getProjectedState(),
    );
    for (const subject of selectedGraph.subjects) {
      if (!replayGraph.getSubject(subject.id)) {
        throw new CoreSelfContractError(
          `Capsule subject '${subject.id}' is absent from replay`,
        );
      }
    }
    for (const relation of selectedGraph.relations) {
      if (!replayGraph.getRelation(relation.id)) {
        throw new CoreSelfContractError(
          `Capsule relation '${relation.id}' is absent from replay`,
        );
      }
    }
    graphDigest = sha256Hex(selectedGraph);
    if (graphDigest !== capsule.graphDigest) {
      throw new CoreSelfContractError("Capsule graph digest mismatch");
    }
  } catch (error) {
    errors.push(
      error instanceof Error ? error.message : "Capsule verification failed",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    ledgerHeadDigest: replayed?.head ?? null,
    projectedStateDigest: replayed?.stateDigest ?? null,
    graphDigest,
  };
}

export { computeCapsuleDigest };
