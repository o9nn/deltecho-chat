/**
 * Multi-Agent Consensus for Self-Modification
 *
 * When multiple DTE instances are running (e.g., CogHood + CogCity + local dev),
 * they vote on proposed modifications before applying them. This prevents
 * divergent self-modification across instances and ensures collective coherence.
 *
 * Protocol:
 *   1. Instance proposes a modification
 *   2. Proposal is broadcast to all known peers
 *   3. Each peer votes (approve/reject) based on their local coherence
 *   4. If quorum is reached (>50% approve), modification is applied on all
 *   5. If quorum fails, proposal is logged and deferred
 *
 * Transport: HTTP POST to peer endpoints (lightweight, no persistent connections)
 */

import { EventEmitter } from "events";
import type {
  ModificationRequest,
  ModificationResult,
  SelfModificationEngine,
} from "./self-modification.js";

// ─── Types ────────────────────────────────────────────────────────

export interface PeerInstance {
  id: string;
  endpoint: string;
  lastSeen: number;
  coherence: number;
  isHealthy: boolean;
}

export interface ConsensusProposal {
  id: string;
  proposerId: string;
  modification: ModificationRequest;
  timestamp: number;
  votes: Map<string, ConsensusVote>;
  status: "pending" | "approved" | "rejected" | "timeout";
  quorumReached: boolean;
}

export interface ConsensusVote {
  instanceId: string;
  approve: boolean;
  localCoherence: number;
  reason: string;
  timestamp: number;
}

export interface MultiAgentConsensusConfig {
  /** This instance's unique ID */
  instanceId: string;
  /** Known peer endpoints */
  peers: string[];
  /** Minimum votes needed for quorum (fraction of total peers) */
  quorumFraction: number;
  /** Timeout for vote collection (ms) */
  voteTimeout: number;
  /** Minimum coherence to approve a proposal */
  minCoherenceToApprove: number;
  /** Health check interval (ms) */
  healthCheckInterval: number;
  /** Enable consensus (false = single-instance mode, apply immediately) */
  enabled: boolean;
}

const DEFAULT_CONFIG: MultiAgentConsensusConfig = {
  instanceId: `dte-${Date.now().toString(36)}`,
  peers: [],
  quorumFraction: 0.5,
  voteTimeout: 10000,
  minCoherenceToApprove: 0.4,
  healthCheckInterval: 30000,
  enabled: false, // Disabled by default (single-instance mode)
};

// ─── Multi-Agent Consensus Engine ─────────────────────────────────

export class MultiAgentConsensus extends EventEmitter {
  private config: MultiAgentConsensusConfig;
  private peers: Map<string, PeerInstance> = new Map();
  private proposals: Map<string, ConsensusProposal> = new Map();
  private selfModEngine?: SelfModificationEngine;
  private localCoherence = 0.5;
  private healthTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<MultiAgentConsensusConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Register known peers
    for (const endpoint of this.config.peers) {
      const id = `peer-${endpoint.replace(/[^a-z0-9]/gi, "-")}`;
      this.peers.set(id, {
        id,
        endpoint,
        lastSeen: 0,
        coherence: 0.5,
        isHealthy: false,
      });
    }
  }

  /**
   * Wire the consensus engine to a SelfModificationEngine.
   * Intercepts modification proposals to require consensus.
   */
  wireSelfModification(engine: SelfModificationEngine): void {
    this.selfModEngine = engine;
  }

  /**
   * Update local coherence (called by ENACTION phase).
   */
  updateLocalCoherence(coherence: number): void {
    this.localCoherence = coherence;
  }

  /**
   * Start the consensus engine (health checks, peer discovery).
   */
  start(): void {
    if (!this.config.enabled) return;

    this.healthTimer = setInterval(() => {
      this.checkPeerHealth();
    }, this.config.healthCheckInterval);

    this.emit("started", { instanceId: this.config.instanceId });
  }

  /**
   * Stop the consensus engine.
   */
  stop(): void {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
    this.emit("stopped", { instanceId: this.config.instanceId });
  }

  /**
   * Propose a modification for consensus voting.
   * In single-instance mode (enabled=false), immediately approves.
   */
  async proposeModification(
    modification: ModificationRequest,
  ): Promise<ConsensusProposal> {
    const proposalId = `${this.config.instanceId}-${Date.now().toString(36)}`;

    const proposal: ConsensusProposal = {
      id: proposalId,
      proposerId: this.config.instanceId,
      modification,
      timestamp: Date.now(),
      votes: new Map(),
      status: "pending",
      quorumReached: false,
    };

    // Single-instance mode: auto-approve
    if (!this.config.enabled || this.getHealthyPeerCount() === 0) {
      proposal.status = "approved";
      proposal.quorumReached = true;
      proposal.votes.set(this.config.instanceId, {
        instanceId: this.config.instanceId,
        approve: true,
        localCoherence: this.localCoherence,
        reason: "Single-instance auto-approve",
        timestamp: Date.now(),
      });
      this.proposals.set(proposalId, proposal);
      this.emit("proposal:approved", proposal);
      return proposal;
    }

    // Multi-instance mode: broadcast and collect votes
    this.proposals.set(proposalId, proposal);

    // Self-vote first
    const selfVote = this.evaluateProposal(modification);
    proposal.votes.set(this.config.instanceId, selfVote);

    // Broadcast to peers
    await this.broadcastProposal(proposal);

    // Wait for votes with timeout
    await this.waitForQuorum(proposal);

    return proposal;
  }

  /**
   * Evaluate a received proposal from a peer.
   * Returns a vote based on local coherence and safety checks.
   */
  evaluateProposal(modification: ModificationRequest): ConsensusVote {
    let approve = true;
    let reason = "Approved: coherence sufficient";

    // Reject if local coherence is too low (system is unstable)
    if (this.localCoherence < this.config.minCoherenceToApprove) {
      approve = false;
      reason = `Rejected: local coherence ${this.localCoherence.toFixed(3)} below threshold`;
    }

    // Reject if the modification seems too aggressive
    if (modification.coherenceAtRequest < 0.3) {
      approve = false;
      reason = `Rejected: proposer coherence ${modification.coherenceAtRequest.toFixed(3)} too low`;
    }

    return {
      instanceId: this.config.instanceId,
      approve,
      localCoherence: this.localCoherence,
      reason,
      timestamp: Date.now(),
    };
  }

  /**
   * Handle an incoming vote from a peer.
   */
  receiveVote(proposalId: string, vote: ConsensusVote): void {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.status !== "pending") return;

    proposal.votes.set(vote.instanceId, vote);
    this.checkQuorum(proposal);
  }

  // ─── Private Methods ────────────────────────────────────────────

  private checkQuorum(proposal: ConsensusProposal): void {
    const totalVoters = this.getHealthyPeerCount() + 1; // +1 for self
    const requiredVotes = Math.ceil(totalVoters * this.config.quorumFraction);
    const approvals = Array.from(proposal.votes.values()).filter(
      (v) => v.approve,
    ).length;
    const rejections = Array.from(proposal.votes.values()).filter(
      (v) => !v.approve,
    ).length;

    if (approvals >= requiredVotes) {
      proposal.status = "approved";
      proposal.quorumReached = true;
      this.emit("proposal:approved", proposal);
    } else if (rejections > totalVoters - requiredVotes) {
      proposal.status = "rejected";
      proposal.quorumReached = true;
      this.emit("proposal:rejected", proposal);
    }
  }

  private async broadcastProposal(proposal: ConsensusProposal): Promise<void> {
    const healthyPeers = Array.from(this.peers.values()).filter(
      (p) => p.isHealthy,
    );

    await Promise.allSettled(
      healthyPeers.map(async (peer) => {
        try {
          const response = await fetch(`${peer.endpoint}/consensus/propose`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              proposalId: proposal.id,
              proposerId: proposal.proposerId,
              modification: proposal.modification,
            }),
            signal: AbortSignal.timeout(5000),
          });
          if (response.ok) {
            const vote = (await response.json()) as ConsensusVote;
            this.receiveVote(proposal.id, vote);
          }
        } catch {
          // Peer unreachable — mark unhealthy
          peer.isHealthy = false;
        }
      }),
    );
  }

  private async waitForQuorum(proposal: ConsensusProposal): Promise<void> {
    const deadline = Date.now() + this.config.voteTimeout;

    while (proposal.status === "pending" && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (proposal.status === "pending") {
      // Timeout — decide based on votes received so far
      const approvals = Array.from(proposal.votes.values()).filter(
        (v) => v.approve,
      ).length;
      const totalVotes = proposal.votes.size;

      if (totalVotes > 0 && approvals / totalVotes > this.config.quorumFraction) {
        proposal.status = "approved";
        proposal.quorumReached = true;
        this.emit("proposal:approved", proposal);
      } else {
        proposal.status = "timeout";
        this.emit("proposal:timeout", proposal);
      }
    }
  }

  private async checkPeerHealth(): Promise<void> {
    for (const peer of this.peers.values()) {
      try {
        const response = await fetch(`${peer.endpoint}/consensus/health`, {
          signal: AbortSignal.timeout(3000),
        });
        if (response.ok) {
          const data = (await response.json()) as {
            coherence: number;
            instanceId: string;
          };
          peer.isHealthy = true;
          peer.lastSeen = Date.now();
          peer.coherence = data.coherence;
        } else {
          peer.isHealthy = false;
        }
      } catch {
        peer.isHealthy = false;
      }
    }
  }

  private getHealthyPeerCount(): number {
    return Array.from(this.peers.values()).filter((p) => p.isHealthy).length;
  }

  // ─── Accessors ──────────────────────────────────────────────────

  getInstanceId(): string {
    return this.config.instanceId;
  }

  getPeers(): PeerInstance[] {
    return Array.from(this.peers.values());
  }

  getProposals(): ConsensusProposal[] {
    return Array.from(this.proposals.values());
  }

  getStats(): {
    instanceId: string;
    healthyPeers: number;
    totalPeers: number;
    totalProposals: number;
    approvedProposals: number;
    rejectedProposals: number;
  } {
    const proposals = Array.from(this.proposals.values());
    return {
      instanceId: this.config.instanceId,
      healthyPeers: this.getHealthyPeerCount(),
      totalPeers: this.peers.size,
      totalProposals: proposals.length,
      approvedProposals: proposals.filter((p) => p.status === "approved").length,
      rejectedProposals: proposals.filter((p) => p.status === "rejected").length,
    };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }
}

export const multiAgentConsensus = new MultiAgentConsensus();
