import { sha256Hex, type CanonicalJsonObject } from "./canonical.js";
import {
  CORE_SELF_SCHEMA_VERSION,
  type CoreSelfEvidenceReference,
  type CoreSelfProposal,
  type CoreSelfSubject,
} from "./contracts.js";
import { CoreSelfLedger } from "./ledger.js";
import {
  CoreSelfPolicyGate,
  createCoreSelfDecision,
  createCoreSelfProposal,
} from "./policy.js";
import type { CanonicalEmbodimentAttestation } from "../AutognosisAutogenesisCoupler.js";

export const DTE_ROOT_SUBJECT_ID = "core:agent:o9nn/deep-tree-echo";
export const DTE_STEWARD_ID = "core:steward:o9nn/dan";
export const DTE_BOOTSTRAP_ID = "core:system:o9nn/deltecho-bootstrap";
export const DTE_POLICY_ID = "core:system:o9nn/deltecho-policy";
export const DTE_ESN_ACTOR_ID = "core:cognitive-system:o9nn/esn-autognosis";
export const DTE_DAO_ACTOR_ID = "core:cognitive-system:o9nn/dao-governance";
export const DTE_SCIENTIFIC_ACTOR_ID =
  "core:cognitive-system:o9nn/scientific-genius";
export const DTE_AVATAR_ACTOR_ID = "core:embodiment:o9nn/live2d-avatar";
export const DTE_ECCO9_ACTOR_ID = "core:repository:o9nn/ecco9-reference";
export const DTE_GENESIS_TIMESTAMP = "2025-01-01T00:00:00.000Z";

export interface AdaptiveGovernanceAttestation {
  id: string;
  createdAt: number;
  title: string;
  rationale: string;
  votes: Array<{
    center: "agent" | "arena" | "relation";
    support: number;
    rationale: string;
  }>;
  consensus: number;
  risk: number;
  adopted: boolean;
  effects: {
    traitDeltas: Record<string, number>;
    coherenceDelta: number;
    energyDelta: number;
    intention?: string;
  };
}

export interface CoreSelfAuthorityStatus {
  initialized: boolean;
  ledgerHead: string | null;
  projectedStateDigest: string;
  acceptedEventCount: number;
  pendingProposalCount: number;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function canonicalObservationId(prefix: string, value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = sha256Hex(value).slice(0, 12);
  return `${prefix}/${normalized || "observation"}-${suffix}`;
}

export class DeltEchoCoreSelfAuthority {
  readonly policy: CoreSelfPolicyGate;
  readonly ledger: CoreSelfLedger;

  constructor() {
    this.policy = new CoreSelfPolicyGate({
      actors: [
        {
          id: DTE_BOOTSTRAP_ID,
          role: "proposer",
          capabilities: ["propose"],
        },
        {
          id: DTE_STEWARD_ID,
          role: "steward",
          capabilities: ["review", "ratify-protected", "authorize-recovery"],
        },
        {
          id: DTE_POLICY_ID,
          role: "reviewer",
          capabilities: ["review"],
        },
        {
          id: DTE_ESN_ACTOR_ID,
          role: "observer",
          capabilities: ["observe", "propose"],
        },
        {
          id: DTE_DAO_ACTOR_ID,
          role: "proposer",
          capabilities: ["observe", "propose"],
        },
        {
          id: DTE_SCIENTIFIC_ACTOR_ID,
          role: "proposer",
          capabilities: ["observe", "propose"],
        },
        {
          id: DTE_AVATAR_ACTOR_ID,
          role: "observer",
          capabilities: ["observe", "propose"],
        },
        {
          id: DTE_ECCO9_ACTOR_ID,
          role: "adapter",
          capabilities: ["observe", "propose"],
        },
      ],
      protectedSubjectIds: [DTE_ROOT_SUBJECT_ID],
    });
    this.ledger = new CoreSelfLedger(this.policy);
    this.initializeGenesis();
  }

  private initializeGenesis(): void {
    const root: CoreSelfSubject = {
      schemaVersion: CORE_SELF_SCHEMA_VERSION,
      id: DTE_ROOT_SUBJECT_ID,
      kind: "agent",
      displayName: "Deep Tree Echo",
      immutable: {
        id: DTE_ROOT_SUBJECT_ID,
        name: "Deep Tree Echo",
        canonicalRepository: "https://github.com/o9nn/deltecho-chat",
        foundingSteward: DTE_STEWARD_ID,
        constitution: "experimental-cognition-proposes-policy-authorizes",
      },
      mutable: {
        ontogeneticStage: "embryonic",
        embodiment: "live2d-cubism",
        cognitiveArchitecture: "dao-esn-autognosis",
      },
      status: "active",
      aliases: ["delt-echo", "dte"],
      provenance: [],
    };
    const proposal = createCoreSelfProposal({
      schemaVersion: CORE_SELF_SCHEMA_VERSION,
      proposalId: "proposal:identity.genesis:o9nn/deep-tree-echo",
      proposerId: DTE_BOOTSTRAP_ID,
      rationale:
        "Create the deterministic constitutional root before experimental cognition begins.",
      basedOnHead: null,
      candidate: {
        schemaVersion: CORE_SELF_SCHEMA_VERSION,
        eventType: "identity.genesis",
        targetSubjectId: DTE_ROOT_SUBJECT_ID,
        actorId: DTE_BOOTSTRAP_ID,
        capability: "propose",
        occurredAt: DTE_GENESIS_TIMESTAMP,
        observedAt: DTE_GENESIS_TIMESTAMP,
        evidenceIds: [],
        payload: { subject: root as unknown as CanonicalJsonObject },
      },
    });
    this.ledger.submitProposal(proposal);
    const decision = createCoreSelfDecision({
      decisionId: "decision:recovery:o9nn/deep-tree-echo-genesis",
      proposalDigest: proposal.proposalDigest,
      mode: "recovery",
      outcome: "accept",
      actorId: DTE_STEWARD_ID,
      capability: "authorize-recovery",
      reviewerIds: [DTE_STEWARD_ID],
      rationale:
        "Founding steward authorizes the repository-native constitutional genesis.",
      decidedAt: DTE_GENESIS_TIMESTAMP,
    });
    this.ledger.acceptProposal(
      proposal.proposalDigest,
      decision,
      "event:identity.genesis:o9nn/deep-tree-echo",
    );
  }

  observeAdaptiveGovernance(
    governance: AdaptiveGovernanceAttestation,
    observedAt: string,
  ): CoreSelfProposal {
    const evidenceId = canonicalObservationId(
      "evidence:observation:o9nn",
      governance.id,
    );
    const proposalId = canonicalObservationId(
      "proposal:governance.attest:o9nn",
      governance.id,
    );
    const payloadDigest = sha256Hex({
      id: governance.id,
      consensus: clamp01(governance.consensus),
      risk: clamp01(governance.risk),
      adoptedByAdaptiveMesh: governance.adopted,
      votes: governance.votes.map((vote) => ({
        center: vote.center,
        support: clamp01(vote.support),
      })),
      effects: governance.effects,
    });
    const evidence: CoreSelfEvidenceReference = {
      schemaVersion: CORE_SELF_SCHEMA_VERSION,
      id: evidenceId,
      kind: "observation",
      sourceUri: "dte://identity-mesh/aar-governance",
      sha256: payloadDigest,
      schema: "dte-aar-governance-attestation@1.0.0",
      observedAt,
      claim: `Adaptive AAR governance reported consensus=${clamp01(
        governance.consensus,
      ).toFixed(3)} risk=${clamp01(governance.risk).toFixed(
        3,
      )}; canonical acceptance remains pending.`,
    };
    const proposal = createCoreSelfProposal({
      schemaVersion: CORE_SELF_SCHEMA_VERSION,
      proposalId,
      proposerId: DTE_DAO_ACTOR_ID,
      rationale:
        "Record adaptive DAO/ESN governance as proposal evidence without granting it canonical authority.",
      basedOnHead: this.ledger.head,
      candidate: {
        schemaVersion: CORE_SELF_SCHEMA_VERSION,
        eventType: "governance.attest",
        targetSubjectId: DTE_ROOT_SUBJECT_ID,
        actorId: DTE_DAO_ACTOR_ID,
        capability: "observe",
        occurredAt: observedAt,
        observedAt,
        sourceRef: governance.id,
        evidenceIds: [],
        payload: {
          evidence: evidence as unknown as CanonicalJsonObject,
          adaptiveDecision: governance.adopted ? "adopted" : "deferred",
          consensus: clamp01(governance.consensus),
          risk: clamp01(governance.risk),
          effectDigest: sha256Hex(governance.effects),
        },
      },
    });
    this.ledger.submitProposal(proposal);
    return proposal;
  }

  observeEmbodiment(
    embodiment: CanonicalEmbodimentAttestation,
    observedAt: string,
  ): CoreSelfProposal {
    const status = this.getStatus();
    if (
      embodiment.ledgerHead !== undefined &&
      embodiment.ledgerHead !== status.ledgerHead
    ) {
      throw new Error("Embodiment attestation ledger head is stale or foreign");
    }
    if (
      embodiment.projectedStateDigest !== undefined &&
      embodiment.projectedStateDigest !== status.projectedStateDigest
    ) {
      throw new Error(
        "Embodiment attestation state digest is stale or foreign",
      );
    }
    const sample = {
      accuracy: clamp01(embodiment.accuracy),
      meanError: Math.max(
        0,
        Number.isFinite(embodiment.meanError) ? embodiment.meanError : 0,
      ),
      experienceCount: Math.max(0, Math.floor(embodiment.experienceCount)),
      ...(embodiment.cognitiveMode
        ? { cognitiveMode: embodiment.cognitiveMode }
        : {}),
      ledgerHead: status.ledgerHead,
      projectedStateDigest: status.projectedStateDigest,
    };
    const sampleDigest = sha256Hex(sample);
    const evidenceId = canonicalObservationId(
      "evidence:observation:o9nn",
      `live2d-${sample.experienceCount}-${sampleDigest}`,
    );
    const proposalId = canonicalObservationId(
      "proposal:evidence.observe:o9nn",
      `live2d-${sample.experienceCount}-${sampleDigest}`,
    );
    const evidence: CoreSelfEvidenceReference = {
      schemaVersion: CORE_SELF_SCHEMA_VERSION,
      id: evidenceId,
      kind: "observation",
      sourceUri: "dte://live2d/rendered-self-model",
      sha256: sampleDigest,
      schema: "dte-live2d-embodiment-attestation@1.0.0",
      observedAt,
      claim: `Rendered Live2D self-model accuracy=${sample.accuracy.toFixed(
        3,
      )} after ${sample.experienceCount} experiences.`,
    };
    const proposal = createCoreSelfProposal({
      schemaVersion: CORE_SELF_SCHEMA_VERSION,
      proposalId,
      proposerId: DTE_AVATAR_ACTOR_ID,
      rationale:
        "Register rendered-state autognosis as proposal evidence without authorizing an identity mutation.",
      basedOnHead: status.ledgerHead,
      candidate: {
        schemaVersion: CORE_SELF_SCHEMA_VERSION,
        eventType: "evidence.observe",
        targetSubjectId: DTE_ROOT_SUBJECT_ID,
        actorId: DTE_AVATAR_ACTOR_ID,
        capability: "observe",
        occurredAt: observedAt,
        observedAt,
        sourceRef: evidenceId,
        evidenceIds: [],
        payload: {
          evidence: evidence as unknown as CanonicalJsonObject,
          sample: sample as unknown as CanonicalJsonObject,
        },
      },
    });
    this.ledger.submitProposal(proposal);
    return proposal;
  }

  getStatus(): CoreSelfAuthorityStatus {
    return {
      initialized: this.ledger.eventCount > 0,
      ledgerHead: this.ledger.head,
      projectedStateDigest: this.ledger.stateDigest,
      acceptedEventCount: this.ledger.eventCount,
      pendingProposalCount:
        this.ledger.getProposals().length - this.ledger.eventCount,
    };
  }
}
