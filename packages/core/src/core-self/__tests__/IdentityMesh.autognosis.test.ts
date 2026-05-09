import { IdentityMesh } from "../IdentityMesh.js";

describe("IdentityMesh autognosis governance", () => {
  it("should adopt healthy edge-of-chaos autognosis proposals and evolve traits", () => {
    const identity = new IdentityMesh({ autoSaveInterval: 0 });
    const initialState = identity.getState();
    const initialCoherence = initialState.relation.coherence;
    const initialCuriosity = initialState.relation.traits.curiosity;

    const proposal = identity.integrateAutognosis({
      health: 0.88,
      isEdgeOfChaos: true,
      isSaturated: false,
      isDead: false,
      memoryCapacity: 0.82,
      computationalCapacity: 0.91,
      entropy: 0.76,
      narrative:
        "Reservoir is coherent, plastic, and ready for creative cognition.",
      timestamp: 123456789,
    });

    const state = identity.getState();

    expect(proposal.adopted).toBe(true);
    expect(proposal.votes).toHaveLength(3);
    expect(proposal.consensus).toBeGreaterThanOrEqual(0.55);
    expect(state.relation.governanceProposals[0]).toEqual(proposal);
    expect(state.relation.traits.autognosis).toBeGreaterThan(0.5);
    expect(state.relation.traits.curiosity).toBeGreaterThan(initialCuriosity);
    expect(state.relation.coherence).toBeGreaterThan(initialCoherence);
    expect(state.agent.intentions[0]).toContain("reservoir autognosis");
    expect(identity.generateSystemPrompt()).toContain("AAR SELF-GOVERNANCE");
  });

  it("should defer risky pathological autognosis proposals without mutating traits", () => {
    const identity = new IdentityMesh({ autoSaveInterval: 0 });
    const initialAutognosis = identity.getState().relation.traits.autognosis;

    const proposal = identity.integrateAutognosis({
      health: 0.12,
      isEdgeOfChaos: false,
      isSaturated: true,
      isDead: false,
      memoryCapacity: 0.1,
      computationalCapacity: 0.1,
      entropy: 0.05,
      narrative: "Reservoir is saturated and should not self-amplify.",
    });

    const state = identity.getState();

    expect(proposal.adopted).toBe(false);
    expect(proposal.risk).toBeGreaterThan(0.3);
    expect(state.relation.traits.autognosis).toBe(initialAutognosis);
    expect(state.relation.governanceProposals[0].adopted).toBe(false);
    expect(state.agent.intentions).toHaveLength(0);
  });
});
