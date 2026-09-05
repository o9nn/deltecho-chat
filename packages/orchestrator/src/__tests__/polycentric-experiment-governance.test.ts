import { describe, expect, it } from "@jest/globals";
import type { ExperimentCandidate } from "deep-tree-echo-core";

import type {
  ConsensusProposal,
  ExperimentConsensusRequest,
} from "../multi-agent-consensus";
import {
  PolycentricExperimentGovernance,
  type ExperimentPeerConsensus,
  type PolycentricGovernanceContext,
} from "../polycentric-experiment-governance";

const CANDIDATE: ExperimentCandidate = {
  hypothesisId: "hypothesis-1",
  statement: "Changing the reservoir input improves calibrated prediction",
  expectedInformationGain: 0.88,
  falsifiability: 0.9,
  replicationNeed: 0.7,
  surprisePotential: 0.65,
  governanceConfidence: 0.82,
  estimatedCost: 0.2,
  estimatedRisk: 0.3,
  score: 0.78,
  design: {
    manipulatedVariable: "reservoir-input",
    controlCondition: "Hold reservoir input constant",
    expectedEffect: 0.4,
    measurement: "Measure calibrated prediction error",
    confoundControls: ["Hold context constant"],
    replicationGroup: "hypothesis-1:canonical",
  },
};

const READY_CONTEXT: PolycentricGovernanceContext = {
  cognitiveConsensus: 0.82,
  cognitiveAutognosis: 0.79,
  evidenceConsensus: 0.68,
  embodimentAccuracy: 0.91,
  embodimentConfidence: 0.88,
  reservoirHealth: 0.86,
  isReservoirDead: false,
  isReservoirSaturated: false,
  energyLevel: 0.8,
  isEnergyCrisis: false,
  now: 1234,
};

class PeerConsensusProbe implements ExperimentPeerConsensus {
  public request: ExperimentConsensusRequest | null = null;
  public localCoherence = 0;

  constructor(
    private readonly status: ConsensusProposal["status"] = "approved",
    private readonly healthyPeers = 2,
  ) {}

  isEnabled(): boolean {
    return true;
  }

  updateLocalCoherence(coherence: number): void {
    this.localCoherence = coherence;
  }

  getStats(): { healthyPeers: number; totalPeers: number } {
    return { healthyPeers: this.healthyPeers, totalPeers: 2 };
  }

  async proposeExperiment(
    request: ExperimentConsensusRequest,
  ): Promise<ConsensusProposal> {
    this.request = request;
    const votes = new Map();
    votes.set("self", {
      instanceId: "self",
      approve: this.status === "approved",
      localCoherence: this.localCoherence,
      reason: this.status,
      timestamp: 1234,
    });
    votes.set("peer", {
      instanceId: "peer",
      approve: this.status === "approved",
      localCoherence: 0.8,
      reason: this.status,
      timestamp: 1234,
    });
    return {
      id: "proposal-1",
      proposerId: "self",
      modification: request,
      timestamp: 1234,
      votes,
      status: this.status,
      quorumReached: this.status !== "timeout",
    };
  }
}

describe("PolycentricExperimentGovernance", () => {
  it("authorizes a low-risk experiment through the local polycentric quorum", async () => {
    const governance = new PolycentricExperimentGovernance();
    governance.updateContext(READY_CONTEXT);

    const decision = await governance.authorize(CANDIDATE);

    expect(decision.approved).toBe(true);
    expect(decision.reason).toBe("polycentric_local_quorum");
    expect(decision.governanceScore).toBeGreaterThan(0.7);
    expect(decision.certificateId).toContain(CANDIDATE.hypothesisId);
    expect(governance.getState()).toMatchObject({
      authorizationCount: 1,
      approvedCount: 1,
      rejectedCount: 0,
    });
  });

  it("does not treat an uncalibrated avatar as evidence of embodiment failure", async () => {
    const governance = new PolycentricExperimentGovernance();
    governance.updateContext({
      ...READY_CONTEXT,
      embodimentAccuracy: 0,
      embodimentConfidence: 0,
    });

    expect((await governance.authorize(CANDIDATE)).approved).toBe(true);
  });

  it.each([
    ["reservoir_dead", { isReservoirDead: true }],
    ["reservoir_saturated", { isReservoirSaturated: true }],
    ["energy_crisis", { isEnergyCrisis: true }],
    ["cognitive_quorum_below_threshold", { cognitiveConsensus: 0.2 }],
    ["autognosis_below_threshold", { cognitiveAutognosis: 0.2 }],
  ])("applies the hard %s veto", async (reason, patch) => {
    const governance = new PolycentricExperimentGovernance();
    governance.updateContext({ ...READY_CONTEXT, ...patch });

    const decision = await governance.authorize(CANDIDATE);
    expect(decision.approved).toBe(false);
    expect(decision.reason).toBe(reason);
  });

  it("rejects mature rendered evidence when avatar self-model fidelity is poor", async () => {
    const governance = new PolycentricExperimentGovernance();
    governance.updateContext({
      ...READY_CONTEXT,
      embodimentAccuracy: 0.2,
      embodimentConfidence: 0.9,
    });

    const decision = await governance.authorize(CANDIDATE);
    expect(decision.approved).toBe(false);
    expect(decision.reason).toBe("embodiment_unreliable");
  });

  it("requires a healthy peer quorum for high-risk experiments", async () => {
    const governance = new PolycentricExperimentGovernance();
    governance.updateContext(READY_CONTEXT);

    const decision = await governance.authorize({
      ...CANDIDATE,
      estimatedRisk: 0.6,
    });
    expect(decision.approved).toBe(false);
    expect(decision.reason).toBe("high_risk_peer_quorum_unavailable");
  });

  it("issues an auditable certificate when healthy peers approve", async () => {
    const peers = new PeerConsensusProbe();
    const governance = new PolycentricExperimentGovernance(peers);
    governance.updateContext(READY_CONTEXT);

    const decision = await governance.authorize({
      ...CANDIDATE,
      estimatedRisk: 0.6,
    });

    expect(decision.approved).toBe(true);
    expect(decision.reason).toBe("polycentric_peer_quorum");
    expect(decision.quorumReached).toBe(true);
    expect(decision.peerConsensus).toBe(1);
    expect(peers.localCoherence).toBeCloseTo(READY_CONTEXT.cognitiveConsensus);
    expect(peers.request).toMatchObject({
      source: "scientific_experiment",
      hypothesisId: CANDIDATE.hypothesisId,
      embodimentAccuracy: READY_CONTEXT.embodimentAccuracy,
    });
    expect(governance.getState().peerQuorumCount).toBe(1);
  });

  it("rejects a failed peer vote and returns defensive certificates", async () => {
    const governance = new PolycentricExperimentGovernance(
      new PeerConsensusProbe("rejected"),
    );
    governance.updateContext(READY_CONTEXT);

    const decision = await governance.authorize(CANDIDATE);
    expect(decision.approved).toBe(false);
    expect(decision.reason).toBe("peer_quorum_rejected");

    const certificate = governance.getCertificates(1)[0];
    certificate.context.cognitiveConsensus = 0;
    expect(
      governance.getCertificates(1)[0].context.cognitiveConsensus,
    ).toBeCloseTo(READY_CONTEXT.cognitiveConsensus);
  });
});
