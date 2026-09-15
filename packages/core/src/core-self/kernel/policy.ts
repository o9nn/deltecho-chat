import {
  cloneCanonical,
  sha256Hex,
  type CanonicalJsonValue,
} from "./canonical.js";
import {
  CORE_SELF_POLICY_VERSION,
  CORE_SELF_SCHEMA_VERSION,
  CoreSelfContractError,
  type CoreSelfActorRole,
  type CoreSelfCapability,
  type CoreSelfEventCandidate,
  type CoreSelfPolicyDecision,
  type CoreSelfPolicyMode,
  type CoreSelfProposal,
  validatePolicyDecision,
  validateProposal,
} from "./contracts.js";

export interface CoreSelfActorRegistration {
  id: string;
  role: CoreSelfActorRole;
  capabilities: CoreSelfCapability[];
}

export interface CoreSelfPolicyConfig {
  actors: CoreSelfActorRegistration[];
  protectedSubjectIds: string[];
  protectedPaths?: string[];
}

export interface CoreSelfPolicyEvaluation {
  allowed: boolean;
  reason: string;
  mode: CoreSelfPolicyMode;
}

export type CoreSelfProposalInput = Omit<CoreSelfProposal, "proposalDigest">;
export type CoreSelfDecisionInput = Omit<
  CoreSelfPolicyDecision,
  "decisionDigest" | "policyVersion" | "schemaVersion"
>;

const DEFAULT_PROTECTED_PATHS = [
  "/immutable/id",
  "/immutable/name",
  "/immutable/canonicalRepository",
  "/immutable/foundingSteward",
  "/immutable/constitution",
  "/schemaVersion",
];

const REQUIRED_MODE: Record<
  CoreSelfEventCandidate["eventType"],
  CoreSelfPolicyMode
> = {
  "identity.genesis": "recovery",
  "subject.register": "standard",
  "subject.patch": "standard",
  "identity.protected-patch": "protected",
  "relation.assert": "standard",
  "relation.retract": "standard",
  "evidence.observe": "observation",
  "governance.attest": "observation",
  "checkpoint.authorize": "recovery",
};

function withoutDigest<T extends Record<string, unknown>>(
  value: T,
  digestKey: keyof T,
): Omit<T, keyof T> & Record<string, CanonicalJsonValue> {
  const result: Record<string, CanonicalJsonValue> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key !== digestKey) {
      result[key] = entry as CanonicalJsonValue;
    }
  }
  return result as Omit<T, keyof T> & Record<string, CanonicalJsonValue>;
}

export function computeProposalDigest(
  proposal: Omit<CoreSelfProposal, "proposalDigest"> | CoreSelfProposal,
): string {
  return sha256Hex(
    withoutDigest(
      proposal as unknown as Record<string, unknown>,
      "proposalDigest",
    ),
  );
}

export function computeDecisionDigest(
  decision:
    | Omit<CoreSelfPolicyDecision, "decisionDigest">
    | CoreSelfPolicyDecision,
): string {
  return sha256Hex(
    withoutDigest(
      decision as unknown as Record<string, unknown>,
      "decisionDigest",
    ),
  );
}

export function createCoreSelfProposal(
  input: CoreSelfProposalInput,
): CoreSelfProposal {
  const cloned = cloneCanonical(
    input as unknown as CanonicalJsonValue,
  ) as unknown as CoreSelfProposalInput;
  const proposal: CoreSelfProposal = {
    ...cloned,
    proposalDigest: "",
  };
  proposal.proposalDigest = computeProposalDigest(proposal);
  validateProposal(proposal);
  return proposal;
}

export function createCoreSelfDecision(
  input: CoreSelfDecisionInput,
): CoreSelfPolicyDecision {
  const cloned = cloneCanonical(
    input as unknown as CanonicalJsonValue,
  ) as unknown as CoreSelfDecisionInput;
  const decision: CoreSelfPolicyDecision = {
    ...cloned,
    schemaVersion: CORE_SELF_SCHEMA_VERSION,
    policyVersion: CORE_SELF_POLICY_VERSION,
    decisionDigest: "",
  };
  decision.decisionDigest = computeDecisionDigest(decision);
  validatePolicyDecision(decision);
  return decision;
}

export class CoreSelfPolicyGate {
  private readonly actors = new Map<string, CoreSelfActorRegistration>();
  private readonly protectedSubjectIds: Set<string>;
  private readonly protectedPaths: Set<string>;

  constructor(config: CoreSelfPolicyConfig) {
    for (const actor of config.actors) {
      if (this.actors.has(actor.id)) {
        throw new CoreSelfContractError(`Duplicate actor '${actor.id}'`);
      }
      const capabilities = [...new Set(actor.capabilities)].sort();
      this.actors.set(actor.id, { ...actor, capabilities });
    }
    this.protectedSubjectIds = new Set(config.protectedSubjectIds);
    this.protectedPaths = new Set(
      config.protectedPaths ?? DEFAULT_PROTECTED_PATHS,
    );
  }

  evaluate(
    proposal: CoreSelfProposal,
    decision: CoreSelfPolicyDecision,
  ): CoreSelfPolicyEvaluation {
    try {
      validateProposal(proposal);
      validatePolicyDecision(decision);
    } catch (error) {
      return {
        allowed: false,
        reason:
          error instanceof Error ? error.message : "Contract validation failed",
        mode: decision.mode,
      };
    }

    if (computeProposalDigest(proposal) !== proposal.proposalDigest) {
      return {
        allowed: false,
        reason: "Proposal digest mismatch",
        mode: decision.mode,
      };
    }
    if (computeDecisionDigest(decision) !== decision.decisionDigest) {
      return {
        allowed: false,
        reason: "Policy decision digest mismatch",
        mode: decision.mode,
      };
    }
    if (decision.proposalDigest !== proposal.proposalDigest) {
      return {
        allowed: false,
        reason: "Policy decision does not target this proposal",
        mode: decision.mode,
      };
    }
    if (decision.outcome !== "accept") {
      return {
        allowed: false,
        reason: `Policy outcome is '${decision.outcome}'`,
        mode: decision.mode,
      };
    }
    if (proposal.proposerId !== proposal.candidate.actorId) {
      return {
        allowed: false,
        reason: "Candidate actor must equal proposal proposer",
        mode: decision.mode,
      };
    }

    const requiredMode = REQUIRED_MODE[proposal.candidate.eventType];
    if (decision.mode !== requiredMode) {
      return {
        allowed: false,
        reason: `Event '${proposal.candidate.eventType}' requires '${requiredMode}' policy mode`,
        mode: decision.mode,
      };
    }

    const proposer = this.actors.get(proposal.proposerId);
    if (!proposer) {
      return {
        allowed: false,
        reason: "Unknown proposer",
        mode: decision.mode,
      };
    }
    const proposerCapability =
      requiredMode === "observation" ? "observe" : "propose";
    if (!proposer.capabilities.includes(proposerCapability)) {
      return {
        allowed: false,
        reason: `Proposer lacks '${proposerCapability}' capability`,
        mode: decision.mode,
      };
    }

    const decisionActor = this.actors.get(decision.actorId);
    if (
      !decisionActor ||
      !decisionActor.capabilities.includes(decision.capability)
    ) {
      return {
        allowed: false,
        reason: "Decision actor lacks the declared capability",
        mode: decision.mode,
      };
    }

    const reviewerError = this.validateReviewers(proposal, decision);
    if (reviewerError) {
      return { allowed: false, reason: reviewerError, mode: decision.mode };
    }

    const mutationError = this.validateMutationBoundary(proposal, decision);
    if (mutationError) {
      return { allowed: false, reason: mutationError, mode: decision.mode };
    }

    return {
      allowed: true,
      reason: "Policy and immutable-core checks passed",
      mode: decision.mode,
    };
  }

  private validateReviewers(
    proposal: CoreSelfProposal,
    decision: CoreSelfPolicyDecision,
  ): string | null {
    if (decision.mode === "observation") {
      if (decision.capability !== "review") {
        return "Observation acceptance requires review capability";
      }
      return null;
    }

    if (decision.reviewerIds.length === 0) {
      return "A non-observation decision requires an independent reviewer";
    }
    if (decision.reviewerIds.includes(proposal.proposerId)) {
      return "A proposer cannot review its own proposal";
    }

    for (const reviewerId of decision.reviewerIds) {
      const reviewer = this.actors.get(reviewerId);
      if (
        !reviewer ||
        (reviewer.role !== "reviewer" && reviewer.role !== "steward") ||
        (!reviewer.capabilities.includes("review") &&
          !reviewer.capabilities.includes("ratify-protected") &&
          !reviewer.capabilities.includes("authorize-recovery"))
      ) {
        return `Reviewer '${reviewerId}' lacks independent review authority`;
      }
    }

    if (decision.mode === "protected") {
      if (decision.capability !== "ratify-protected") {
        return "Protected decisions require ratify-protected capability";
      }
      const hasSteward = decision.reviewerIds.some(
        (id) => this.actors.get(id)?.role === "steward",
      );
      if (!hasSteward) return "Protected decisions require a steward reviewer";
    }

    if (decision.mode === "recovery") {
      if (decision.capability !== "authorize-recovery") {
        return "Recovery decisions require authorize-recovery capability";
      }
      const hasSteward = decision.reviewerIds.some(
        (id) => this.actors.get(id)?.role === "steward",
      );
      if (!hasSteward) return "Recovery decisions require a steward reviewer";
    }

    if (decision.mode === "standard" && decision.capability !== "review") {
      return "Standard decisions require review capability";
    }
    return null;
  }

  private validateMutationBoundary(
    proposal: CoreSelfProposal,
    decision: CoreSelfPolicyDecision,
  ): string | null {
    const candidate = proposal.candidate;
    if (
      candidate.eventType !== "subject.patch" &&
      candidate.eventType !== "identity.protected-patch"
    ) {
      return null;
    }

    const patch = candidate.payload.patch;
    if (!Array.isArray(patch) || patch.length === 0) {
      return "Patch events require a non-empty payload.patch array";
    }

    for (const [index, operation] of patch.entries()) {
      if (
        !operation ||
        typeof operation !== "object" ||
        Array.isArray(operation)
      ) {
        return `Patch operation ${index} must be an object`;
      }
      const path = (operation as Record<string, unknown>).path;
      if (typeof path !== "string" || !path.startsWith("/")) {
        return `Patch operation ${index} has an invalid path`;
      }
      if (
        path.includes("__proto__") ||
        path.includes("prototype") ||
        path.includes("constructor")
      ) {
        return `Patch operation ${index} targets a forbidden path`;
      }
      const isProtected = [...this.protectedPaths].some(
        (protectedPath) =>
          path === protectedPath || path.startsWith(`${protectedPath}/`),
      );
      if (isProtected && candidate.eventType !== "identity.protected-patch") {
        return `Standard patch cannot modify protected path '${path}'`;
      }
      if (isProtected && decision.mode !== "protected") {
        return `Protected path '${path}' requires protected policy mode`;
      }
    }

    if (
      this.protectedSubjectIds.has(candidate.targetSubjectId) &&
      candidate.eventType === "identity.protected-patch" &&
      decision.mode !== "protected"
    ) {
      return "Protected subject mutation requires protected policy mode";
    }
    return null;
  }
}
