import * as crypto from "crypto";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import {
  MultiAgentConsensus,
  type ExperimentConsensusRequest,
} from "../multi-agent-consensus";

const EXPERIMENT: ExperimentConsensusRequest = {
  key: "scientific.experiment.hypothesis-1",
  newValue: 0.78,
  reason: "Test a falsifiable reservoir intervention",
  source: "scientific_experiment",
  coherenceAtRequest: 0.82,
  hypothesisId: "hypothesis-1",
  estimatedRisk: 0.42,
  expectedInformationGain: 0.88,
  embodimentAccuracy: 0.91,
};

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function signature(secret: string, payload: unknown): string {
  return `sha256=${crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex")}`;
}

describe("MultiAgentConsensus scientific actions", () => {
  it("preserves single-instance compatibility for experiment proposals", async () => {
    const consensus = new MultiAgentConsensus({
      instanceId: "local",
      enabled: false,
    });

    const proposal = await consensus.proposeExperiment(EXPERIMENT);

    expect(proposal.status).toBe("approved");
    expect(proposal.quorumReached).toBe(true);
    expect(proposal.modification).toEqual(EXPERIMENT);
  });

  it("uses the same local coherence safety gate for scientific actions", () => {
    const consensus = new MultiAgentConsensus({
      instanceId: "local",
      enabled: true,
      minCoherenceToApprove: 0.5,
    });
    consensus.updateLocalCoherence(0.2);

    const vote = consensus.evaluateProposal(EXPERIMENT);

    expect(vote.approve).toBe(false);
    expect(vote.reason).toContain("below threshold");
  });

  it("does not let a proposer self-approve when its healthy peer rejects", async () => {
    globalThis.fetch = jest.fn(async (input: Parameters<typeof fetch>[0]) => {
      const url = String(input);
      if (url.endsWith("/consensus/health")) {
        return new Response(
          JSON.stringify({ instanceId: "peer-1", coherence: 0.7 }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          instanceId: "peer-1",
          approve: false,
          localCoherence: 0.3,
          reason: "Rejected by peer",
          timestamp: 1234,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;
    const consensus = new MultiAgentConsensus({
      instanceId: "local",
      enabled: true,
      peers: ["https://peer.example/webhooks"],
      quorumFraction: 0.5,
      voteTimeout: 50,
    });
    consensus.updateLocalCoherence(0.82);

    await consensus.refreshPeerHealth();
    const proposal = await consensus.proposeExperiment(EXPERIMENT);

    expect(proposal.eligibleVoterCount).toBe(2);
    expect(proposal.status).toBe("rejected");
    expect(proposal.quorumReached).toBe(true);
  });

  it("HMAC-signs health and experiment requests and records a real peer vote", async () => {
    const secret = "shared-test-secret";
    const requests: Array<{
      url: string;
      headers: Record<string, string>;
      body?: string;
    }> = [];
    globalThis.fetch = jest.fn(
      async (
        input: Parameters<typeof fetch>[0],
        init?: Parameters<typeof fetch>[1],
      ) => {
        const url = String(input);
        const headers = init?.headers as Record<string, string>;
        requests.push({ url, headers, body: init?.body as string | undefined });
        if (url.endsWith("/consensus/health")) {
          return new Response(
            JSON.stringify({ instanceId: "peer-1", coherence: 0.84 }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({
            instanceId: "peer-1",
            approve: true,
            localCoherence: 0.84,
            reason: "Approved by peer",
            timestamp: 1234,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    ) as typeof fetch;

    const consensus = new MultiAgentConsensus({
      instanceId: "local",
      enabled: true,
      peers: ["https://peer.example/webhooks"],
      sharedSecret: secret,
      voteTimeout: 50,
    });
    consensus.updateLocalCoherence(0.82);

    await consensus.refreshPeerHealth();
    const proposal = await consensus.proposeExperiment(EXPERIMENT);

    expect(consensus.getStats().healthyPeers).toBe(1);
    expect(proposal.status).toBe("approved");
    expect(proposal.votes.has("peer-1")).toBe(true);
    expect(requests).toHaveLength(2);
    expect(requests[0].headers["X-Webhook-Signature"]).toBe(
      signature(secret, {}),
    );
    const proposalBody = JSON.parse(requests[1].body ?? "{}");
    expect(requests[1].headers["X-Webhook-Signature"]).toBe(
      signature(secret, proposalBody),
    );
    expect(proposalBody.modification.source).toBe("scientific_experiment");
  });
});
