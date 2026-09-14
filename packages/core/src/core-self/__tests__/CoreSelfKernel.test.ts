import {
  CORE_SELF_SCHEMA_VERSION,
  DTE_BOOTSTRAP_ID,
  DTE_DAO_ACTOR_ID,
  DTE_POLICY_ID,
  DTE_STEWARD_ID,
  DTE_ROOT_SUBJECT_ID,
  DeltEchoCoreSelfAuthority,
  CoreSelfIdentityHypergraph,
  CoreSelfLedger,
  canonicalJson,
  createCoreSelfCapsule,
  createCoreSelfDecision,
  createCoreSelfProposal,
  createEcco9ManifestProposal,
  runEvidenceKsmCycle,
  sha256Hex,
  verifyCoreSelfCapsule,
  type CanonicalJsonObject,
  type Cog253Mapping,
  type CoreSelfDefinitions,
  type CoreSelfEvidenceRegistry,
  type CoreSelfProposal,
  type CoreSelfRelation,
  type CoreSelfSubject,
} from "../kernel/index.js";

const OBSERVED_AT = "2026-09-12T12:00:00.000Z";

function subject(id: string, displayName: string): CoreSelfSubject {
  return {
    schemaVersion: CORE_SELF_SCHEMA_VERSION,
    id,
    kind: "artifact",
    displayName,
    immutable: { id, name: displayName },
    mutable: {},
    status: "active",
    aliases: [],
    provenance: [],
  };
}

function proposeSubject(
  authority: DeltEchoCoreSelfAuthority,
  value: CoreSelfSubject,
  suffix: string,
  basedOnHead = authority.ledger.head,
): CoreSelfProposal {
  const proposal = createCoreSelfProposal({
    schemaVersion: CORE_SELF_SCHEMA_VERSION,
    proposalId: `proposal:subject.add:o9nn/${suffix}`,
    proposerId: DTE_BOOTSTRAP_ID,
    rationale: `Add ${value.displayName} as a typed identity subject.`,
    basedOnHead,
    candidate: {
      schemaVersion: CORE_SELF_SCHEMA_VERSION,
      eventType: "subject.register",
      targetSubjectId: value.id,
      actorId: DTE_BOOTSTRAP_ID,
      capability: "propose",
      occurredAt: OBSERVED_AT,
      observedAt: OBSERVED_AT,
      evidenceIds: [],
      payload: { subject: value as unknown as CanonicalJsonObject },
    },
  });
  authority.ledger.submitProposal(proposal);
  return proposal;
}

function acceptStandard(
  authority: DeltEchoCoreSelfAuthority,
  proposal: CoreSelfProposal,
  eventId: string,
): void {
  const decision = createCoreSelfDecision({
    decisionId: `decision:standard:o9nn/${eventId.split("/").at(-1)}`,
    proposalDigest: proposal.proposalDigest,
    mode: "standard",
    outcome: "accept",
    actorId: DTE_POLICY_ID,
    capability: "review",
    reviewerIds: [DTE_POLICY_ID],
    rationale: "Independent policy review accepted the typed identity event.",
    decidedAt: OBSERVED_AT,
  });
  authority.ledger.acceptProposal(proposal.proposalDigest, decision, eventId);
}

function governanceAttestation(id = "aar-1") {
  return {
    id,
    createdAt: Date.parse(OBSERVED_AT),
    title: "Edge-of-chaos regulation",
    rationale: "ESN health and AAR consensus support bounded adaptation.",
    votes: [
      { center: "agent" as const, support: 0.91, rationale: "goal fit" },
      { center: "arena" as const, support: 0.88, rationale: "stable" },
      { center: "relation" as const, support: 0.86, rationale: "coherent" },
    ],
    consensus: 0.88,
    risk: 0.12,
    adopted: true,
    effects: {
      traitDeltas: { autognosis: 0.02 },
      coherenceDelta: 0.01,
      energyDelta: -0.01,
      intention: "continue bounded observation",
    },
  };
}

describe("deterministic DeltEcho core-self kernel", () => {
  it("canonicalizes equivalent objects identically and rejects undefined", () => {
    const left = { b: 2, a: { z: 3, y: [1, true, null] } };
    const right = { a: { y: [1, true, null], z: 3 }, b: 2 };

    expect(canonicalJson(left)).toBe(canonicalJson(right));
    expect(sha256Hex(left)).toBe(sha256Hex(right));
    expect(() => canonicalJson({ invalid: undefined })).toThrow(
      /Unsupported value type 'undefined'/,
    );
  });

  it("creates byte-stable constitutional genesis across independent authorities", () => {
    const left = new DeltEchoCoreSelfAuthority();
    const right = new DeltEchoCoreSelfAuthority();

    expect(left.getStatus()).toEqual(right.getStatus());
    expect(left.getStatus()).toMatchObject({
      initialized: true,
      acceptedEventCount: 1,
      pendingProposalCount: 0,
    });
    expect(left.ledger.getProjectedState().rootSubjectId).toBe(
      DTE_ROOT_SUBJECT_ID,
    );
  });

  it("keeps DAO/ESN and Live2D observations proposal-only", () => {
    const authority = new DeltEchoCoreSelfAuthority();
    const before = authority.getStatus();

    const governance = authority.observeAdaptiveGovernance(
      governanceAttestation(),
      OBSERVED_AT,
    );
    const embodiment = authority.observeEmbodiment(
      {
        accuracy: 0.93,
        meanError: 0.025,
        experienceCount: 24,
        cognitiveMode: "Scientific Genius",
        ledgerHead: before.ledgerHead,
        projectedStateDigest: before.projectedStateDigest,
      },
      OBSERVED_AT,
    );

    expect(governance.candidate.eventType).toBe("governance.attest");
    expect(embodiment.candidate.eventType).toBe("evidence.observe");
    expect(authority.getStatus()).toMatchObject({
      ledgerHead: before.ledgerHead,
      projectedStateDigest: before.projectedStateDigest,
      acceptedEventCount: 1,
      pendingProposalCount: 2,
    });
  });

  it("rejects a stale rendered-state identity anchor", () => {
    const authority = new DeltEchoCoreSelfAuthority();
    expect(() =>
      authority.observeEmbodiment(
        {
          accuracy: 0.8,
          meanError: 0.1,
          experienceCount: 2,
          ledgerHead: "0".repeat(64),
        },
        OBSERVED_AT,
      ),
    ).toThrow(/ledger head is stale or foreign/);
  });

  it("blocks standard mutation of immutable root fields", () => {
    const authority = new DeltEchoCoreSelfAuthority();
    const proposal = createCoreSelfProposal({
      schemaVersion: CORE_SELF_SCHEMA_VERSION,
      proposalId: "proposal:subject.patch:o9nn/forbidden-name-change",
      proposerId: DTE_DAO_ACTOR_ID,
      rationale: "Adversarial attempt to rewrite the constitutional name.",
      basedOnHead: authority.ledger.head,
      candidate: {
        schemaVersion: CORE_SELF_SCHEMA_VERSION,
        eventType: "subject.patch",
        targetSubjectId: DTE_ROOT_SUBJECT_ID,
        actorId: DTE_DAO_ACTOR_ID,
        capability: "propose",
        occurredAt: OBSERVED_AT,
        observedAt: OBSERVED_AT,
        evidenceIds: [],
        payload: {
          patch: [
            {
              op: "replace",
              path: "/immutable/name",
              value: "Not Deep Tree Echo",
            },
          ],
        },
      },
    });
    authority.ledger.submitProposal(proposal);
    const decision = createCoreSelfDecision({
      decisionId: "decision:standard:o9nn/forbidden-name-change",
      proposalDigest: proposal.proposalDigest,
      mode: "standard",
      outcome: "accept",
      actorId: DTE_POLICY_ID,
      capability: "review",
      reviewerIds: [DTE_POLICY_ID],
      rationale: "Exercise immutable-core rejection.",
      decidedAt: OBSERVED_AT,
    });

    expect(() =>
      authority.ledger.acceptProposal(
        proposal.proposalDigest,
        decision,
        "event:subject.patch:o9nn/forbidden-name-change",
      ),
    ).toThrow(/protected path/);
    expect(authority.getStatus().acceptedEventCount).toBe(1);
  });

  it("requires an independent reviewer before a standard proposal can enter history", () => {
    const authority = new DeltEchoCoreSelfAuthority();
    const proposal = proposeSubject(
      authority,
      subject("core:component:o9nn/reviewer-test", "Reviewer Test"),
      "reviewer-test",
    );
    const decision = createCoreSelfDecision({
      decisionId: "decision:standard:o9nn/self-review",
      proposalDigest: proposal.proposalDigest,
      mode: "standard",
      outcome: "accept",
      actorId: DTE_POLICY_ID,
      capability: "review",
      reviewerIds: [DTE_BOOTSTRAP_ID],
      rationale: "Adversarial self-review attempt.",
      decidedAt: OBSERVED_AT,
    });

    expect(() =>
      authority.ledger.acceptProposal(
        proposal.proposalDigest,
        decision,
        "event:subject.add:o9nn/reviewer-test",
      ),
    ).toThrow(/proposer cannot review its own proposal/);
    expect(authority.getStatus().acceptedEventCount).toBe(1);
  });

  it("allows a protected root patch only through steward ratification", () => {
    const authority = new DeltEchoCoreSelfAuthority();
    const proposal = createCoreSelfProposal({
      schemaVersion: CORE_SELF_SCHEMA_VERSION,
      proposalId: "proposal:identity.protected-patch:o9nn/constitution",
      proposerId: DTE_DAO_ACTOR_ID,
      rationale: "Exercise the explicit protected constitutional path.",
      basedOnHead: authority.ledger.head,
      candidate: {
        schemaVersion: CORE_SELF_SCHEMA_VERSION,
        eventType: "identity.protected-patch",
        targetSubjectId: DTE_ROOT_SUBJECT_ID,
        actorId: DTE_DAO_ACTOR_ID,
        capability: "propose",
        occurredAt: OBSERVED_AT,
        observedAt: OBSERVED_AT,
        evidenceIds: [],
        payload: {
          patch: [
            {
              op: "set",
              path: "/immutable/constitution",
              value:
                "experimental-cognition-proposes-policy-authorizes-and-replays",
            },
          ],
        },
      },
    });
    authority.ledger.submitProposal(proposal);
    const decision = createCoreSelfDecision({
      decisionId: "decision:protected:o9nn/constitution",
      proposalDigest: proposal.proposalDigest,
      mode: "protected",
      outcome: "accept",
      actorId: DTE_STEWARD_ID,
      capability: "ratify-protected",
      reviewerIds: [DTE_STEWARD_ID],
      rationale: "Founding steward ratifies the protected path mutation.",
      decidedAt: OBSERVED_AT,
    });

    authority.ledger.acceptProposal(
      proposal.proposalDigest,
      decision,
      "event:identity.protected-patch:o9nn/constitution",
    );
    expect(
      authority.ledger.getProjectedState().subjects[DTE_ROOT_SUBJECT_ID]
        .immutable.constitution,
    ).toBe("experimental-cognition-proposes-policy-authorizes-and-replays");
  });

  it("traverses accepted typed identity relations deterministically", () => {
    const authority = new DeltEchoCoreSelfAuthority();
    const memory = subject("core:component:o9nn/memory", "Hypergraph Memory");
    const avatar = subject("core:component:o9nn/avatar", "Live2D Avatar");
    acceptStandard(
      authority,
      proposeSubject(authority, memory, "memory"),
      "event:subject.add:o9nn/memory",
    );
    acceptStandard(
      authority,
      proposeSubject(authority, avatar, "avatar"),
      "event:subject.add:o9nn/avatar",
    );

    const relation: CoreSelfRelation = {
      schemaVersion: CORE_SELF_SCHEMA_VERSION,
      id: "rel:composes:o9nn/identity-embodiment",
      type: "composes",
      endpoints: [
        { role: "whole", subjectId: DTE_ROOT_SUBJECT_ID },
        { role: "memory", subjectId: memory.id },
        { role: "embodiment", subjectId: avatar.id },
      ],
      truth: { strength: 1, confidence: 1 },
      provenance: [],
      active: true,
    };
    const proposal = createCoreSelfProposal({
      schemaVersion: CORE_SELF_SCHEMA_VERSION,
      proposalId: "proposal:relation.add:o9nn/identity-embodiment",
      proposerId: DTE_BOOTSTRAP_ID,
      rationale: "Connect the canonical agent, memory, and embodiment centers.",
      basedOnHead: authority.ledger.head,
      candidate: {
        schemaVersion: CORE_SELF_SCHEMA_VERSION,
        eventType: "relation.assert",
        targetSubjectId: DTE_ROOT_SUBJECT_ID,
        actorId: DTE_BOOTSTRAP_ID,
        capability: "propose",
        occurredAt: OBSERVED_AT,
        observedAt: OBSERVED_AT,
        evidenceIds: [],
        payload: { relation: relation as unknown as CanonicalJsonObject },
      },
    });
    authority.ledger.submitProposal(proposal);
    acceptStandard(
      authority,
      proposal,
      "event:relation.add:o9nn/identity-embodiment",
    );

    const left = new CoreSelfIdentityHypergraph(
      authority.ledger.getProjectedState(),
    );
    const right = new CoreSelfIdentityHypergraph(
      authority.ledger.getProjectedState(),
    );
    expect(left.export()).toEqual(right.export());
    expect(left.digest()).toBe(right.digest());
    expect(left.traverse(DTE_ROOT_SUBJECT_ID, { maxDepth: 2 })).toEqual({
      startSubjectId: DTE_ROOT_SUBJECT_ID,
      subjectIds: [DTE_ROOT_SUBJECT_ID, avatar.id, memory.id].sort(),
      relationIds: [relation.id],
    });
  });

  it("quarantines a stale-head proposal without changing projected state", () => {
    const authority = new DeltEchoCoreSelfAuthority();
    const sharedHead = authority.ledger.head;
    const accepted = proposeSubject(
      authority,
      subject("core:component:o9nn/accepted", "Accepted Center"),
      "accepted-center",
      sharedHead,
    );
    const stale = proposeSubject(
      authority,
      subject("core:component:o9nn/stale", "Stale Center"),
      "stale-center",
      sharedHead,
    );
    acceptStandard(
      authority,
      accepted,
      "event:subject.add:o9nn/accepted-center",
    );
    const stateDigest = authority.ledger.stateDigest;
    const decision = createCoreSelfDecision({
      decisionId: "decision:standard:o9nn/stale-center",
      proposalDigest: stale.proposalDigest,
      mode: "standard",
      outcome: "accept",
      actorId: DTE_POLICY_ID,
      capability: "review",
      reviewerIds: [DTE_POLICY_ID],
      rationale: "Attempt to accept a proposal built on an old head.",
      decidedAt: OBSERVED_AT,
    });

    expect(() =>
      authority.ledger.acceptProposal(
        stale.proposalDigest,
        decision,
        "event:subject.add:o9nn/stale-center",
      ),
    ).toThrow(/fork quarantined/);
    expect(authority.ledger.stateDigest).toBe(stateDigest);
    expect(authority.ledger.getForks()).toHaveLength(1);
  });

  it("preserves an evidence-linked autobiographical avatar observation across replay", () => {
    const authority = new DeltEchoCoreSelfAuthority();
    const status = authority.getStatus();
    const proposal = authority.observeEmbodiment(
      {
        accuracy: 0.97,
        meanError: 0.01,
        experienceCount: 42,
        cognitiveMode: "Self-Reference Point",
        ledgerHead: status.ledgerHead,
        projectedStateDigest: status.projectedStateDigest,
      },
      OBSERVED_AT,
    );
    const decision = createCoreSelfDecision({
      decisionId: "decision:observation:o9nn/avatar-experience-42",
      proposalDigest: proposal.proposalDigest,
      mode: "observation",
      outcome: "accept",
      actorId: DTE_POLICY_ID,
      capability: "review",
      reviewerIds: [],
      rationale:
        "Accept the digest-bound rendered-state observation as evidence.",
      decidedAt: OBSERVED_AT,
    });
    authority.ledger.acceptProposal(
      proposal.proposalDigest,
      decision,
      "event:evidence.observe:o9nn/avatar-experience-42",
    );
    const exported = authority.ledger.export();
    const replayed = new CoreSelfLedger(authority.policy);
    replayed.import(exported);

    expect(Object.keys(replayed.getProjectedState().evidence)).toHaveLength(1);
    expect(replayed.head).toBe(authority.ledger.head);
    expect(replayed.stateDigest).toBe(authority.ledger.stateDigest);
  });

  it("replays accepted history and verifies a tamper-evident portable capsule", () => {
    const authority = new DeltEchoCoreSelfAuthority();
    const exported = authority.ledger.export();
    const replayed = new CoreSelfLedger(authority.policy);
    replayed.import(exported);

    expect(replayed.head).toBe(authority.ledger.head);
    expect(replayed.stateDigest).toBe(authority.ledger.stateDigest);

    const graph = new CoreSelfIdentityHypergraph(replayed.getProjectedState());
    expect(graph.traverse(DTE_ROOT_SUBJECT_ID, { maxDepth: 2 })).toEqual({
      startSubjectId: DTE_ROOT_SUBJECT_ID,
      subjectIds: [DTE_ROOT_SUBJECT_ID],
      relationIds: [],
    });
    expect(graph.digest()).toMatch(/^[a-f0-9]{64}$/);

    const capsule = createCoreSelfCapsule(replayed, {
      capsuleId: "capsule:identity:o9nn/deep-tree-echo",
      source: {
        repositoryUri: "https://github.com/o9nn/deltecho-chat",
        commit: "1".repeat(40),
      },
      createdAt: OBSERVED_AT,
    });
    expect(verifyCoreSelfCapsule(capsule, authority.policy)).toMatchObject({
      valid: true,
      errors: [],
      ledgerHeadDigest: authority.ledger.head,
      projectedStateDigest: authority.ledger.stateDigest,
    });

    const tampered = structuredClone(capsule);
    tampered.subjects[0].displayName = "Tampered Echo";
    expect(verifyCoreSelfCapsule(tampered, authority.policy).valid).toBe(false);
  });

  it("turns an execution-disabled Ecco9 registry into evidence only", () => {
    const registry = {
      schema_version: "1.0.0" as const,
      registry_id: "ecco9-source-archive",
      source: {
        artifact_uri: "attachment://ecco9-main(1).zip",
        archive_sha256: "a".repeat(64),
        claimed_repository_uri: "https://github.com/cogpy/ecco9",
        commit: null,
        commit_status: "unverified",
        license: "Apache-2.0",
        license_path: "LICENSE",
        execution_permitted: false as const,
        canonical_authority: "none" as const,
      },
      policy: {
        executable_archive_content: "deny",
        accepted_binding_modes: ["adapted", "excluded"],
      },
      bindings: [
        {
          id: "persistent-consciousness-schema",
          mode: "adapted" as const,
          source_paths: ["core/deeptreeecho/persistent_consciousness_state.go"],
          target: "packages/core/src/core-self/kernel/authority.ts",
          capability: "identity snapshot inspiration",
          authority: "reference-only",
          execution_permitted: false as const,
          acceptance_criterion:
            "Kernel tests pass without archive runtime code.",
        },
      ],
    };
    const proposal = createEcco9ManifestProposal(registry, {
      proposalId: "proposal:evidence.observe:o9nn/ecco9-registry",
      proposerId: "core:repository:o9nn/ecco9-reference",
      targetSubjectId: DTE_ROOT_SUBJECT_ID,
      evidenceId: "evidence:artifact:o9nn/ecco9-registry",
      observedAt: OBSERVED_AT,
      basedOnHead: "f".repeat(64),
    });

    expect(proposal.candidate.eventType).toBe("evidence.observe");
    expect(proposal.candidate.payload).toMatchObject({
      executionPermitted: false,
      canonicalAuthority: "none",
    });
    expect(proposal.proposalDigest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("runs a deterministic advisory-only 61/253 KSM cycle", () => {
    const centers = ["control", "process", "structure"] as const;
    const mapping: Cog253Mapping = {
      patterns: Array.from({ length: 253 }, (_, index) => ({
        id: `cog${String(index + 1).padStart(3, "0")}`,
        implementation_tier:
          index < 18 ? ("core" as const) : ("future" as const),
        ksm_anchor: centers[index % centers.length],
        relevance_score: 1 - index / 1000,
        acceptance_criterion: `Criterion ${index + 1}`,
      })),
    };
    const definitions: CoreSelfDefinitions = {
      definitions: Array.from({ length: 61 }, (_, index) => ({
        id: index + 1,
      })),
    };
    const evidence: CoreSelfEvidenceRegistry = Object.fromEntries(
      mapping.patterns.map((pattern) => [
        pattern.id,
        {
          status: pattern.id === "cog001" ? "verified" : "planned",
          evidence: pattern.id === "cog001" ? ["test:canonical"] : [],
        },
      ]),
    );
    const options = {
      ledgerHead: "0".repeat(64),
      observedAt: OBSERVED_AT,
      minimum: 0.5,
      maxCandidates: 20,
    };

    const first = runEvidenceKsmCycle(mapping, definitions, evidence, options);
    const second = runEvidenceKsmCycle(mapping, definitions, evidence, options);
    expect(second).toEqual(first);
    expect(first.advisory).toBe(true);
    expect(first.steps).toHaveLength(12);
    expect(first.steps[11].output).toMatchObject({ direct_mutation: false });
    expect(first.cycle_hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
