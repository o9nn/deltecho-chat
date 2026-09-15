import {
  cloneCanonical,
  sha256Hex,
  type CanonicalJsonObject,
  type CanonicalJsonValue,
} from "./canonical.js";
import {
  CORE_SELF_SCHEMA_VERSION,
  CoreSelfContractError,
  type CoreSelfAcceptedEvent,
  type CoreSelfEvidenceReference,
  type CoreSelfProjectedState,
  type CoreSelfRelation,
  type CoreSelfSubject,
  validateAcceptedEvent,
  validateEvidence,
  validateRelation,
  validateSubject,
} from "./contracts.js";

export class CoreSelfProjectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CoreSelfProjectionError";
  }
}

export interface CoreSelfPatchOperation {
  op: "set" | "remove";
  path: string;
  value?: CanonicalJsonValue;
}

export function createEmptyProjectedState(): CoreSelfProjectedState {
  return {
    schemaVersion: CORE_SELF_SCHEMA_VERSION,
    rootSubjectId: null,
    subjects: {},
    relations: {},
    evidence: {},
    authorizedCheckpoints: {},
    lastEventDigest: null,
    eventCount: 0,
  };
}

export function computeProjectedStateDigest(
  state: CoreSelfProjectedState,
): string {
  return sha256Hex(state);
}

function readPayloadObject<T>(payload: CanonicalJsonObject, key: string): T {
  const value = payload[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CoreSelfProjectionError(`payload.${key} must be an object`);
  }
  return value as unknown as T;
}

function decodePointer(path: string): string[] {
  if (!path.startsWith("/") || path === "/") {
    throw new CoreSelfProjectionError(`Invalid patch path '${path}'`);
  }
  return path
    .slice(1)
    .split("/")
    .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"))
    .map((part) => {
      if (
        part.length === 0 ||
        part === "__proto__" ||
        part === "prototype" ||
        part === "constructor"
      ) {
        throw new CoreSelfProjectionError(`Forbidden patch segment '${part}'`);
      }
      return part;
    });
}

function applyPatch(
  subject: CoreSelfSubject,
  operations: CoreSelfPatchOperation[],
  allowedRoot: "mutable" | "immutable",
): CoreSelfSubject {
  if (!Array.isArray(operations) || operations.length === 0) {
    throw new CoreSelfProjectionError("Patch requires at least one operation");
  }

  const next = cloneCanonical(
    subject as unknown as CanonicalJsonValue,
  ) as unknown as CoreSelfSubject;

  for (const [index, operation] of operations.entries()) {
    if (!operation || typeof operation !== "object") {
      throw new CoreSelfProjectionError(`Patch operation ${index} is invalid`);
    }
    if (operation.op !== "set" && operation.op !== "remove") {
      throw new CoreSelfProjectionError(
        `Patch operation ${index} has unknown op '${String(operation.op)}'`,
      );
    }
    const segments = decodePointer(operation.path);
    if (segments[0] !== allowedRoot || segments.length < 2) {
      throw new CoreSelfProjectionError(
        `${allowedRoot} patch must target '/${allowedRoot}/...'`,
      );
    }

    let cursor = next as unknown as Record<string, CanonicalJsonValue>;
    for (
      let segmentIndex = 0;
      segmentIndex < segments.length - 1;
      segmentIndex += 1
    ) {
      const segment = segments[segmentIndex];
      const existing = cursor[segment];
      if (
        !existing ||
        typeof existing !== "object" ||
        Array.isArray(existing)
      ) {
        if (operation.op === "remove") {
          throw new CoreSelfProjectionError(
            `Cannot remove absent patch path '${operation.path}'`,
          );
        }
        cursor[segment] = {};
      }
      cursor = cursor[segment] as Record<string, CanonicalJsonValue>;
    }

    const leaf = segments[segments.length - 1];
    if (operation.op === "remove") {
      if (!Object.prototype.hasOwnProperty.call(cursor, leaf)) {
        throw new CoreSelfProjectionError(
          `Cannot remove absent patch path '${operation.path}'`,
        );
      }
      delete cursor[leaf];
    } else {
      if (operation.value === undefined) {
        throw new CoreSelfProjectionError(
          `Set operation '${operation.path}' requires a value`,
        );
      }
      cursor[leaf] = cloneCanonical(operation.value);
    }
  }

  validateSubject(next);
  return next;
}

function requireTarget(
  state: CoreSelfProjectedState,
  targetSubjectId: string,
): CoreSelfSubject {
  const subject = state.subjects[targetSubjectId];
  if (!subject) {
    throw new CoreSelfProjectionError(
      `Target subject '${targetSubjectId}' does not exist`,
    );
  }
  return subject;
}

function validateEvidenceReferences(
  state: CoreSelfProjectedState,
  event: CoreSelfAcceptedEvent,
): void {
  for (const evidenceId of event.evidenceIds) {
    if (!state.evidence[evidenceId]) {
      throw new CoreSelfProjectionError(
        `Referenced evidence '${evidenceId}' does not exist`,
      );
    }
  }
}

function assertRelationEndpoints(
  state: CoreSelfProjectedState,
  relation: CoreSelfRelation,
): void {
  for (const endpoint of relation.endpoints) {
    if (!state.subjects[endpoint.subjectId]) {
      throw new CoreSelfProjectionError(
        `Relation endpoint '${endpoint.subjectId}' does not exist`,
      );
    }
  }
}

export function projectAcceptedEvent(
  currentState: CoreSelfProjectedState,
  event: CoreSelfAcceptedEvent,
): CoreSelfProjectedState {
  validateAcceptedEvent(event);
  const next = cloneCanonical(
    currentState as unknown as CanonicalJsonValue,
  ) as unknown as CoreSelfProjectedState;

  if (event.previousEventDigest !== currentState.lastEventDigest) {
    throw new CoreSelfProjectionError(
      "Event does not extend the current ledger head",
    );
  }
  if (event.eventType !== "identity.genesis") {
    validateEvidenceReferences(currentState, event);
  }

  switch (event.eventType) {
    case "identity.genesis": {
      if (
        currentState.eventCount !== 0 ||
        currentState.rootSubjectId !== null
      ) {
        throw new CoreSelfProjectionError(
          "Genesis can only be the first event",
        );
      }
      if (event.previousEventDigest !== null) {
        throw new CoreSelfProjectionError(
          "Genesis must have a null previous digest",
        );
      }
      const subject = readPayloadObject<CoreSelfSubject>(
        event.payload,
        "subject",
      );
      validateSubject(subject);
      if (subject.id !== event.targetSubjectId) {
        throw new CoreSelfProjectionError(
          "Genesis target must equal root subject ID",
        );
      }
      next.rootSubjectId = subject.id;
      next.subjects[subject.id] = cloneCanonical(
        subject as unknown as CanonicalJsonValue,
      ) as unknown as CoreSelfSubject;
      break;
    }

    case "subject.register": {
      requireTarget(currentState, currentState.rootSubjectId ?? "");
      const subject = readPayloadObject<CoreSelfSubject>(
        event.payload,
        "subject",
      );
      validateSubject(subject);
      if (subject.id !== event.targetSubjectId) {
        throw new CoreSelfProjectionError(
          "Registered subject must match event target",
        );
      }
      if (next.subjects[subject.id]) {
        throw new CoreSelfProjectionError(
          `Subject '${subject.id}' already exists`,
        );
      }
      next.subjects[subject.id] = cloneCanonical(
        subject as unknown as CanonicalJsonValue,
      ) as unknown as CoreSelfSubject;
      break;
    }

    case "subject.patch": {
      const subject = requireTarget(currentState, event.targetSubjectId);
      const patch = event.payload.patch as unknown as CoreSelfPatchOperation[];
      next.subjects[event.targetSubjectId] = applyPatch(
        subject,
        patch,
        "mutable",
      );
      break;
    }

    case "identity.protected-patch": {
      const subject = requireTarget(currentState, event.targetSubjectId);
      const patch = event.payload.patch as unknown as CoreSelfPatchOperation[];
      next.subjects[event.targetSubjectId] = applyPatch(
        subject,
        patch,
        "immutable",
      );
      break;
    }

    case "relation.assert": {
      requireTarget(currentState, event.targetSubjectId);
      const relation = readPayloadObject<CoreSelfRelation>(
        event.payload,
        "relation",
      );
      validateRelation(relation);
      assertRelationEndpoints(currentState, relation);
      next.relations[relation.id] = cloneCanonical(
        relation as unknown as CanonicalJsonValue,
      ) as unknown as CoreSelfRelation;
      break;
    }

    case "relation.retract": {
      requireTarget(currentState, event.targetSubjectId);
      const relationId = event.payload.relationId;
      if (typeof relationId !== "string" || !next.relations[relationId]) {
        throw new CoreSelfProjectionError(
          "Retraction targets an unknown relation",
        );
      }
      next.relations[relationId] = {
        ...next.relations[relationId],
        active: false,
      };
      break;
    }

    case "evidence.observe":
    case "governance.attest": {
      requireTarget(currentState, event.targetSubjectId);
      const evidence = readPayloadObject<CoreSelfEvidenceReference>(
        event.payload,
        "evidence",
      );
      validateEvidence(evidence);
      if (next.evidence[evidence.id]) {
        throw new CoreSelfProjectionError(
          `Evidence '${evidence.id}' already exists`,
        );
      }
      if (
        event.eventType === "governance.attest" &&
        evidence.kind !== "observation"
      ) {
        throw new CoreSelfProjectionError(
          "Governance attestations must be observation evidence",
        );
      }
      next.evidence[evidence.id] = cloneCanonical(
        evidence as unknown as CanonicalJsonValue,
      ) as unknown as CoreSelfEvidenceReference;
      break;
    }

    case "checkpoint.authorize": {
      requireTarget(currentState, event.targetSubjectId);
      const checkpointId = event.payload.checkpointId;
      const stateDigest = event.payload.stateDigest;
      if (typeof checkpointId !== "string" || typeof stateDigest !== "string") {
        throw new CoreSelfProjectionError(
          "Checkpoint authorization requires checkpointId and stateDigest",
        );
      }
      next.authorizedCheckpoints[checkpointId] = stateDigest;
      break;
    }

    default: {
      const exhaustive: never = event.eventType;
      throw new CoreSelfContractError(`Unhandled event type '${exhaustive}'`);
    }
  }

  next.lastEventDigest = event.eventDigest;
  next.eventCount = currentState.eventCount + 1;
  return next;
}

export function replayAcceptedEvents(
  events: readonly CoreSelfAcceptedEvent[],
): CoreSelfProjectedState {
  let state = createEmptyProjectedState();
  for (const event of events) {
    state = projectAcceptedEvent(state, event);
  }
  return state;
}
