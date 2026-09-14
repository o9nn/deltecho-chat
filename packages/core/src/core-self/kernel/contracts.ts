import {
  assertCanonicalJson,
  isSha256Hex,
  type CanonicalJsonObject,
} from "./canonical.js";

export const CORE_SELF_SCHEMA_VERSION = "1.0.0" as const;
export const CORE_SELF_POLICY_VERSION = "1.0.0" as const;

export type CoreSelfSchemaVersion = typeof CORE_SELF_SCHEMA_VERSION;
export type CoreSelfPolicyVersion = typeof CORE_SELF_POLICY_VERSION;

export type CoreSelfSubjectKind =
  | "agent"
  | "steward"
  | "system"
  | "cognitive-system"
  | "embodiment"
  | "repository"
  | "artifact";

export type CoreSelfLifecycleStatus = "active" | "inactive" | "retired";
export type CoreSelfEvidenceKind =
  | "source"
  | "test"
  | "observation"
  | "approval"
  | "artifact";
export type CoreSelfActorRole =
  | "observer"
  | "proposer"
  | "reviewer"
  | "steward"
  | "projector"
  | "adapter";
export type CoreSelfCapability =
  | "observe"
  | "propose"
  | "review"
  | "ratify-protected"
  | "authorize-recovery"
  | "project";
export type CoreSelfPolicyMode =
  | "observation"
  | "standard"
  | "protected"
  | "recovery";
export type CoreSelfDecisionOutcome = "accept" | "reject" | "quarantine";
export type CoreSelfEventType =
  | "identity.genesis"
  | "subject.register"
  | "subject.patch"
  | "identity.protected-patch"
  | "relation.assert"
  | "relation.retract"
  | "evidence.observe"
  | "governance.attest"
  | "checkpoint.authorize";

export interface CoreSelfProvenance {
  sourceUri: string;
  commit?: string;
  relativePath?: string;
  sha256: string;
  schema: string;
}

export interface CoreSelfSubject {
  schemaVersion: CoreSelfSchemaVersion;
  id: string;
  kind: CoreSelfSubjectKind;
  displayName: string;
  immutable: CanonicalJsonObject;
  mutable: CanonicalJsonObject;
  status: CoreSelfLifecycleStatus;
  aliases: string[];
  provenance: CoreSelfProvenance[];
}

export interface CoreSelfRelationEndpoint {
  role: string;
  subjectId: string;
}

export interface CoreSelfRelation {
  schemaVersion: CoreSelfSchemaVersion;
  id: string;
  type: string;
  endpoints: CoreSelfRelationEndpoint[];
  truth: {
    strength: number;
    confidence: number;
  };
  provenance: CoreSelfProvenance[];
  active: boolean;
}

export interface CoreSelfEvidenceReference {
  schemaVersion: CoreSelfSchemaVersion;
  id: string;
  kind: CoreSelfEvidenceKind;
  sourceUri: string;
  commit?: string;
  relativePath?: string;
  sha256: string;
  schema: string;
  observedAt: string;
  claim: string;
}

export interface CoreSelfEventCandidate {
  schemaVersion: CoreSelfSchemaVersion;
  eventType: CoreSelfEventType;
  targetSubjectId: string;
  actorId: string;
  capability: CoreSelfCapability;
  occurredAt: string;
  observedAt: string;
  sourceRef?: string;
  evidenceIds: string[];
  payload: CanonicalJsonObject;
}

export interface CoreSelfProposal {
  schemaVersion: CoreSelfSchemaVersion;
  proposalId: string;
  proposerId: string;
  rationale: string;
  basedOnHead: string | null;
  candidate: CoreSelfEventCandidate;
  proposalDigest: string;
}

export interface CoreSelfPolicyDecision {
  schemaVersion: CoreSelfSchemaVersion;
  policyVersion: CoreSelfPolicyVersion;
  decisionId: string;
  proposalDigest: string;
  mode: CoreSelfPolicyMode;
  outcome: CoreSelfDecisionOutcome;
  actorId: string;
  capability: CoreSelfCapability;
  reviewerIds: string[];
  rationale: string;
  decidedAt: string;
  decisionDigest: string;
}

export interface CoreSelfAcceptedEvent extends CoreSelfEventCandidate {
  eventId: string;
  proposalDigest: string;
  decisionDigest: string;
  previousEventDigest: string | null;
  eventDigest: string;
}

export interface CoreSelfForkRecord {
  proposalDigest: string;
  expectedHead: string | null;
  proposedHead: string | null;
  quarantinedAt: string;
  reason: string;
}

export interface CoreSelfProjectedState {
  schemaVersion: CoreSelfSchemaVersion;
  rootSubjectId: string | null;
  subjects: Record<string, CoreSelfSubject>;
  relations: Record<string, CoreSelfRelation>;
  evidence: Record<string, CoreSelfEvidenceReference>;
  authorizedCheckpoints: Record<string, string>;
  lastEventDigest: string | null;
  eventCount: number;
}

const ID_PATTERN =
  /^(core|rel|evidence|proposal|event|decision|capsule):[a-z0-9._-]+:[a-z0-9._-]+\/[a-z0-9._-]+$/;
const SHA_PATTERN = /^[a-f0-9]{64}$/;
const COMMIT_PATTERN = /^[a-f0-9]{40,64}$/;
const TYPE_PATTERN = /^[a-z][a-z0-9._-]{0,63}$/;
const SAFE_PATH_PATTERN = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\).+$/;

const SUBJECT_KINDS = new Set<CoreSelfSubjectKind>([
  "agent",
  "steward",
  "system",
  "cognitive-system",
  "embodiment",
  "repository",
  "artifact",
]);
const LIFECYCLE_STATUSES = new Set<CoreSelfLifecycleStatus>([
  "active",
  "inactive",
  "retired",
]);
const EVIDENCE_KINDS = new Set<CoreSelfEvidenceKind>([
  "source",
  "test",
  "observation",
  "approval",
  "artifact",
]);
const CAPABILITIES = new Set<CoreSelfCapability>([
  "observe",
  "propose",
  "review",
  "ratify-protected",
  "authorize-recovery",
  "project",
]);
const POLICY_MODES = new Set<CoreSelfPolicyMode>([
  "observation",
  "standard",
  "protected",
  "recovery",
]);
const DECISION_OUTCOMES = new Set<CoreSelfDecisionOutcome>([
  "accept",
  "reject",
  "quarantine",
]);
const EVENT_TYPES = new Set<CoreSelfEventType>([
  "identity.genesis",
  "subject.register",
  "subject.patch",
  "identity.protected-patch",
  "relation.assert",
  "relation.retract",
  "evidence.observe",
  "governance.attest",
  "checkpoint.authorize",
]);

export class CoreSelfContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CoreSelfContractError";
  }
}

function requireString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new CoreSelfContractError(`${field} must be a non-empty string`);
  }
}

function requireKnownSchema(
  schemaVersion: unknown,
): asserts schemaVersion is CoreSelfSchemaVersion {
  if (schemaVersion !== CORE_SELF_SCHEMA_VERSION) {
    throw new CoreSelfContractError(
      `Unknown core-self schema version '${String(schemaVersion)}'`,
    );
  }
}

export function assertCoreSelfId(
  value: unknown,
  field = "id",
): asserts value is string {
  requireString(value, field);
  if (!ID_PATTERN.test(value)) {
    throw new CoreSelfContractError(`${field} has invalid namespaced syntax`);
  }
}

export function assertIsoTimestamp(
  value: unknown,
  field: string,
): asserts value is string {
  requireString(value, field);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    throw new CoreSelfContractError(
      `${field} must be a normalized ISO-8601 timestamp`,
    );
  }
}

function assertSortedUnique(
  values: unknown,
  field: string,
): asserts values is string[] {
  if (
    !Array.isArray(values) ||
    values.some((value) => typeof value !== "string")
  ) {
    throw new CoreSelfContractError(`${field} must be an array of strings`);
  }
  const sorted = [...values].sort();
  if (
    sorted.some(
      (value, index) => value !== values[index] || value === values[index - 1],
    )
  ) {
    throw new CoreSelfContractError(`${field} must be sorted and unique`);
  }
}

function assertProvenance(
  value: unknown,
  field: string,
): asserts value is CoreSelfProvenance {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CoreSelfContractError(`${field} must be an object`);
  }
  const entry = value as Partial<CoreSelfProvenance>;
  requireString(entry.sourceUri, `${field}.sourceUri`);
  requireString(entry.schema, `${field}.schema`);
  if (!isSha256Hex(entry.sha256)) {
    throw new CoreSelfContractError(
      `${field}.sha256 must be lowercase SHA-256`,
    );
  }
  if (entry.commit !== undefined && !COMMIT_PATTERN.test(entry.commit)) {
    throw new CoreSelfContractError(
      `${field}.commit must be a full hexadecimal digest`,
    );
  }
  if (
    entry.relativePath !== undefined &&
    !SAFE_PATH_PATTERN.test(entry.relativePath)
  ) {
    throw new CoreSelfContractError(`${field}.relativePath is unsafe`);
  }
}

function assertProvenanceList(
  value: unknown,
  field: string,
): asserts value is CoreSelfProvenance[] {
  if (!Array.isArray(value)) {
    throw new CoreSelfContractError(`${field} must be an array`);
  }
  value.forEach((entry, index) =>
    assertProvenance(entry, `${field}[${index}]`),
  );
}

export function validateSubject(
  value: unknown,
): asserts value is CoreSelfSubject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CoreSelfContractError("Subject must be an object");
  }
  const subject = value as Partial<CoreSelfSubject>;
  requireKnownSchema(subject.schemaVersion);
  assertCoreSelfId(subject.id, "subject.id");
  if (!SUBJECT_KINDS.has(subject.kind as CoreSelfSubjectKind)) {
    throw new CoreSelfContractError(
      `Unknown subject kind '${String(subject.kind)}'`,
    );
  }
  requireString(subject.displayName, "subject.displayName");
  assertCanonicalJson(subject.immutable, "subject.immutable");
  assertCanonicalJson(subject.mutable, "subject.mutable");
  if (
    !subject.immutable ||
    Array.isArray(subject.immutable) ||
    !subject.mutable ||
    Array.isArray(subject.mutable)
  ) {
    throw new CoreSelfContractError(
      "Subject immutable and mutable layers must be objects",
    );
  }
  if (!LIFECYCLE_STATUSES.has(subject.status as CoreSelfLifecycleStatus)) {
    throw new CoreSelfContractError(
      `Unknown subject status '${String(subject.status)}'`,
    );
  }
  assertSortedUnique(subject.aliases, "subject.aliases");
  assertProvenanceList(subject.provenance, "subject.provenance");
}

export function validateRelation(
  value: unknown,
): asserts value is CoreSelfRelation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CoreSelfContractError("Relation must be an object");
  }
  const relation = value as Partial<CoreSelfRelation>;
  requireKnownSchema(relation.schemaVersion);
  assertCoreSelfId(relation.id, "relation.id");
  requireString(relation.type, "relation.type");
  if (!TYPE_PATTERN.test(relation.type)) {
    throw new CoreSelfContractError("relation.type has invalid syntax");
  }
  if (!Array.isArray(relation.endpoints) || relation.endpoints.length < 2) {
    throw new CoreSelfContractError(
      "relation.endpoints requires at least two endpoints",
    );
  }
  const roles = new Set<string>();
  relation.endpoints.forEach((endpoint, index) => {
    requireString(endpoint?.role, `relation.endpoints[${index}].role`);
    if (!TYPE_PATTERN.test(endpoint.role) || roles.has(endpoint.role)) {
      throw new CoreSelfContractError(
        "Relation endpoint roles must be valid and unique",
      );
    }
    roles.add(endpoint.role);
    assertCoreSelfId(
      endpoint.subjectId,
      `relation.endpoints[${index}].subjectId`,
    );
  });
  for (const field of ["strength", "confidence"] as const) {
    const score = relation.truth?.[field];
    if (
      typeof score !== "number" ||
      !Number.isFinite(score) ||
      score < 0 ||
      score > 1
    ) {
      throw new CoreSelfContractError(
        `relation.truth.${field} must be within [0,1]`,
      );
    }
  }
  assertProvenanceList(relation.provenance, "relation.provenance");
  if (typeof relation.active !== "boolean") {
    throw new CoreSelfContractError("relation.active must be boolean");
  }
}

export function validateEvidence(
  value: unknown,
): asserts value is CoreSelfEvidenceReference {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CoreSelfContractError("Evidence must be an object");
  }
  const evidence = value as Partial<CoreSelfEvidenceReference>;
  requireKnownSchema(evidence.schemaVersion);
  assertCoreSelfId(evidence.id, "evidence.id");
  if (!EVIDENCE_KINDS.has(evidence.kind as CoreSelfEvidenceKind)) {
    throw new CoreSelfContractError(
      `Unknown evidence kind '${String(evidence.kind)}'`,
    );
  }
  requireString(evidence.sourceUri, "evidence.sourceUri");
  requireString(evidence.schema, "evidence.schema");
  requireString(evidence.claim, "evidence.claim");
  if (!SHA_PATTERN.test(evidence.sha256 ?? "")) {
    throw new CoreSelfContractError(
      "evidence.sha256 must be lowercase SHA-256",
    );
  }
  if (evidence.commit !== undefined && !COMMIT_PATTERN.test(evidence.commit)) {
    throw new CoreSelfContractError(
      "evidence.commit must be a full hexadecimal digest",
    );
  }
  if (
    evidence.relativePath !== undefined &&
    !SAFE_PATH_PATTERN.test(evidence.relativePath)
  ) {
    throw new CoreSelfContractError("evidence.relativePath is unsafe");
  }
  assertIsoTimestamp(evidence.observedAt, "evidence.observedAt");
}

export function validateEventCandidate(
  value: unknown,
): asserts value is CoreSelfEventCandidate {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CoreSelfContractError("Event candidate must be an object");
  }
  const candidate = value as Partial<CoreSelfEventCandidate>;
  requireKnownSchema(candidate.schemaVersion);
  if (!EVENT_TYPES.has(candidate.eventType as CoreSelfEventType)) {
    throw new CoreSelfContractError(
      `Unknown event type '${String(candidate.eventType)}'`,
    );
  }
  assertCoreSelfId(candidate.targetSubjectId, "candidate.targetSubjectId");
  assertCoreSelfId(candidate.actorId, "candidate.actorId");
  if (!CAPABILITIES.has(candidate.capability as CoreSelfCapability)) {
    throw new CoreSelfContractError(
      `Unknown capability '${String(candidate.capability)}'`,
    );
  }
  assertIsoTimestamp(candidate.occurredAt, "candidate.occurredAt");
  assertIsoTimestamp(candidate.observedAt, "candidate.observedAt");
  assertSortedUnique(candidate.evidenceIds, "candidate.evidenceIds");
  candidate.evidenceIds.forEach((id, index) =>
    assertCoreSelfId(id, `candidate.evidenceIds[${index}]`),
  );
  if (candidate.sourceRef !== undefined) {
    requireString(candidate.sourceRef, "candidate.sourceRef");
  }
  assertCanonicalJson(candidate.payload, "candidate.payload");
  if (!candidate.payload || Array.isArray(candidate.payload)) {
    throw new CoreSelfContractError("candidate.payload must be an object");
  }
}

export function validateProposal(
  value: unknown,
): asserts value is CoreSelfProposal {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CoreSelfContractError("Proposal must be an object");
  }
  const proposal = value as Partial<CoreSelfProposal>;
  requireKnownSchema(proposal.schemaVersion);
  assertCoreSelfId(proposal.proposalId, "proposal.proposalId");
  assertCoreSelfId(proposal.proposerId, "proposal.proposerId");
  requireString(proposal.rationale, "proposal.rationale");
  if (proposal.basedOnHead !== null && !isSha256Hex(proposal.basedOnHead)) {
    throw new CoreSelfContractError(
      "proposal.basedOnHead must be null or SHA-256",
    );
  }
  validateEventCandidate(proposal.candidate);
  if (!isSha256Hex(proposal.proposalDigest)) {
    throw new CoreSelfContractError("proposal.proposalDigest must be SHA-256");
  }
}

export function validatePolicyDecision(
  value: unknown,
): asserts value is CoreSelfPolicyDecision {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CoreSelfContractError("Policy decision must be an object");
  }
  const decision = value as Partial<CoreSelfPolicyDecision>;
  requireKnownSchema(decision.schemaVersion);
  if (decision.policyVersion !== CORE_SELF_POLICY_VERSION) {
    throw new CoreSelfContractError(
      `Unknown policy version '${String(decision.policyVersion)}'`,
    );
  }
  assertCoreSelfId(decision.decisionId, "decision.decisionId");
  if (!isSha256Hex(decision.proposalDigest)) {
    throw new CoreSelfContractError("decision.proposalDigest must be SHA-256");
  }
  if (!POLICY_MODES.has(decision.mode as CoreSelfPolicyMode)) {
    throw new CoreSelfContractError(
      `Unknown policy mode '${String(decision.mode)}'`,
    );
  }
  if (!DECISION_OUTCOMES.has(decision.outcome as CoreSelfDecisionOutcome)) {
    throw new CoreSelfContractError(
      `Unknown decision outcome '${String(decision.outcome)}'`,
    );
  }
  assertCoreSelfId(decision.actorId, "decision.actorId");
  if (!CAPABILITIES.has(decision.capability as CoreSelfCapability)) {
    throw new CoreSelfContractError(
      `Unknown capability '${String(decision.capability)}'`,
    );
  }
  assertSortedUnique(decision.reviewerIds, "decision.reviewerIds");
  decision.reviewerIds.forEach((id, index) =>
    assertCoreSelfId(id, `decision.reviewerIds[${index}]`),
  );
  requireString(decision.rationale, "decision.rationale");
  assertIsoTimestamp(decision.decidedAt, "decision.decidedAt");
  if (!isSha256Hex(decision.decisionDigest)) {
    throw new CoreSelfContractError("decision.decisionDigest must be SHA-256");
  }
}

export function validateAcceptedEvent(
  value: unknown,
): asserts value is CoreSelfAcceptedEvent {
  validateEventCandidate(value);
  const event = value as Partial<CoreSelfAcceptedEvent>;
  assertCoreSelfId(event.eventId, "event.eventId");
  if (!isSha256Hex(event.proposalDigest)) {
    throw new CoreSelfContractError("event.proposalDigest must be SHA-256");
  }
  if (!isSha256Hex(event.decisionDigest)) {
    throw new CoreSelfContractError("event.decisionDigest must be SHA-256");
  }
  if (
    event.previousEventDigest !== null &&
    !isSha256Hex(event.previousEventDigest)
  ) {
    throw new CoreSelfContractError(
      "event.previousEventDigest must be null or SHA-256",
    );
  }
  if (!isSha256Hex(event.eventDigest)) {
    throw new CoreSelfContractError("event.eventDigest must be SHA-256");
  }
}
