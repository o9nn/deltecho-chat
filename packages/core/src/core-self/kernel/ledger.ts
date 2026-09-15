import {
  cloneCanonical,
  sha256Hex,
  type CanonicalJsonValue,
} from "./canonical.js";
import {
  type CoreSelfAcceptedEvent,
  type CoreSelfForkRecord,
  type CoreSelfPolicyDecision,
  type CoreSelfProjectedState,
  type CoreSelfProposal,
  validateAcceptedEvent,
  validatePolicyDecision,
  validateProposal,
} from "./contracts.js";
import {
  computeDecisionDigest,
  computeProposalDigest,
  CoreSelfPolicyGate,
} from "./policy.js";
import {
  computeProjectedStateDigest,
  createEmptyProjectedState,
  projectAcceptedEvent,
} from "./projector.js";

export interface CoreSelfLedgerExport {
  schemaVersion: "1.0.0";
  proposals: CoreSelfProposal[];
  decisions: CoreSelfPolicyDecision[];
  acceptedEvents: CoreSelfAcceptedEvent[];
  forks: CoreSelfForkRecord[];
  projectedState: CoreSelfProjectedState;
  projectedStateDigest: string;
}

export interface CoreSelfAcceptanceResult {
  event: CoreSelfAcceptedEvent;
  state: CoreSelfProjectedState;
  stateDigest: string;
}

export class CoreSelfLedgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CoreSelfLedgerError";
  }
}

function computeEventDigest(
  event: Omit<CoreSelfAcceptedEvent, "eventDigest"> | CoreSelfAcceptedEvent,
): string {
  const { eventDigest: _ignored, ...body } = event as CoreSelfAcceptedEvent;
  return sha256Hex(body);
}

function cloneValue<T>(value: T): T {
  return cloneCanonical(value as unknown as CanonicalJsonValue) as unknown as T;
}

export class CoreSelfLedger {
  private readonly proposals = new Map<string, CoreSelfProposal>();
  private readonly decisions = new Map<string, CoreSelfPolicyDecision>();
  private readonly acceptedEvents: CoreSelfAcceptedEvent[] = [];
  private readonly forks: CoreSelfForkRecord[] = [];
  private state: CoreSelfProjectedState = createEmptyProjectedState();

  constructor(private readonly policy: CoreSelfPolicyGate) {}

  get head(): string | null {
    return this.state.lastEventDigest;
  }

  get stateDigest(): string {
    return computeProjectedStateDigest(this.state);
  }

  get eventCount(): number {
    return this.acceptedEvents.length;
  }

  getProjectedState(): CoreSelfProjectedState {
    return cloneValue(this.state);
  }

  getAcceptedEvents(): CoreSelfAcceptedEvent[] {
    return cloneValue(this.acceptedEvents);
  }

  getProposals(): CoreSelfProposal[] {
    return cloneValue(
      [...this.proposals.values()].sort((left, right) =>
        left.proposalId.localeCompare(right.proposalId),
      ),
    );
  }

  getForks(): CoreSelfForkRecord[] {
    return cloneValue(this.forks);
  }

  submitProposal(proposal: CoreSelfProposal): CoreSelfProposal {
    validateProposal(proposal);
    if (computeProposalDigest(proposal) !== proposal.proposalDigest) {
      throw new CoreSelfLedgerError("Proposal digest mismatch");
    }
    if (this.proposals.has(proposal.proposalDigest)) {
      throw new CoreSelfLedgerError("Proposal digest already submitted");
    }
    const stored = cloneValue(proposal);
    this.proposals.set(stored.proposalDigest, stored);
    return cloneValue(stored);
  }

  acceptProposal(
    proposalDigest: string,
    decision: CoreSelfPolicyDecision,
    eventId: string,
  ): CoreSelfAcceptanceResult {
    const proposal = this.proposals.get(proposalDigest);
    if (!proposal) {
      throw new CoreSelfLedgerError(`Unknown proposal '${proposalDigest}'`);
    }
    validatePolicyDecision(decision);
    if (computeDecisionDigest(decision) !== decision.decisionDigest) {
      throw new CoreSelfLedgerError("Policy decision digest mismatch");
    }

    if (proposal.basedOnHead !== this.head) {
      this.forks.push({
        proposalDigest,
        expectedHead: this.head,
        proposedHead: proposal.basedOnHead,
        quarantinedAt: decision.decidedAt,
        reason: "Proposal was based on a stale or divergent ledger head",
      });
      throw new CoreSelfLedgerError("Proposal fork quarantined");
    }

    const evaluation = this.policy.evaluate(proposal, decision);
    if (!evaluation.allowed) {
      throw new CoreSelfLedgerError(
        `Policy denied proposal: ${evaluation.reason}`,
      );
    }

    const body: Omit<CoreSelfAcceptedEvent, "eventDigest"> = {
      ...cloneValue(proposal.candidate),
      eventId,
      proposalDigest: proposal.proposalDigest,
      decisionDigest: decision.decisionDigest,
      previousEventDigest: this.head,
    };
    const event: CoreSelfAcceptedEvent = {
      ...body,
      eventDigest: computeEventDigest(body),
    };
    validateAcceptedEvent(event);

    const projected = projectAcceptedEvent(this.state, event);
    this.decisions.set(decision.decisionDigest, cloneValue(decision));
    this.acceptedEvents.push(cloneValue(event));
    this.state = projected;

    return {
      event: cloneValue(event),
      state: this.getProjectedState(),
      stateDigest: this.stateDigest,
    };
  }

  export(): CoreSelfLedgerExport {
    return cloneValue({
      schemaVersion: "1.0.0",
      proposals: [...this.proposals.values()].sort((left, right) =>
        left.proposalId.localeCompare(right.proposalId),
      ),
      decisions: [...this.decisions.values()].sort((left, right) =>
        left.decisionId.localeCompare(right.decisionId),
      ),
      acceptedEvents: this.acceptedEvents,
      forks: this.forks,
      projectedState: this.state,
      projectedStateDigest: this.stateDigest,
    });
  }

  import(source: CoreSelfLedgerExport): void {
    if (source.schemaVersion !== "1.0.0") {
      throw new CoreSelfLedgerError("Unknown ledger export schema version");
    }
    if (this.acceptedEvents.length > 0 || this.proposals.size > 0) {
      throw new CoreSelfLedgerError("Ledger import requires an empty ledger");
    }

    const proposalByDigest = new Map(
      source.proposals.map((proposal) => [proposal.proposalDigest, proposal]),
    );
    const decisionByDigest = new Map(
      source.decisions.map((decision) => [decision.decisionDigest, decision]),
    );

    for (const event of source.acceptedEvents) {
      validateAcceptedEvent(event);
      if (computeEventDigest(event) !== event.eventDigest) {
        throw new CoreSelfLedgerError(
          `Event '${event.eventId}' digest mismatch`,
        );
      }
      const proposal = proposalByDigest.get(event.proposalDigest);
      const decision = decisionByDigest.get(event.decisionDigest);
      if (!proposal || !decision) {
        throw new CoreSelfLedgerError(
          `Event '${event.eventId}' is missing its proposal or decision`,
        );
      }
      if (!this.proposals.has(proposal.proposalDigest)) {
        this.submitProposal(proposal);
      }
      const accepted = this.acceptProposal(
        proposal.proposalDigest,
        decision,
        event.eventId,
      );
      if (accepted.event.eventDigest !== event.eventDigest) {
        throw new CoreSelfLedgerError(
          `Event '${event.eventId}' does not reproduce its recorded digest`,
        );
      }
    }

    if (this.stateDigest !== source.projectedStateDigest) {
      throw new CoreSelfLedgerError("Imported ledger state digest mismatch");
    }
    if (this.head !== source.projectedState.lastEventDigest) {
      throw new CoreSelfLedgerError("Imported ledger head mismatch");
    }

    this.forks.push(...cloneValue(source.forks));
  }
}

export { computeEventDigest };
