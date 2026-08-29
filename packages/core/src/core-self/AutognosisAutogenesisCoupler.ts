/**
 * AutognosisAutogenesisCoupler — last-mile loop between ESN self-knowledge
 * and AAR / intentionality self-generation.
 *
 * Autognosis reports can update an attached IdentityMesh and create one
 * intrinsic goal per kind. The resulting self-state is fed back as one
 * L2-normalized numeric vector into the Entelechy ESN singleton.
 */

import { getLogger } from "../utils/logger.js";
import type {
  AutognosisReport,
  ReservoirState,
} from "../cognitive/ESNAutognosisReservoir.js";
import type { IdentityMesh } from "./IdentityMesh.js";
import type {
  IdentityAutognosisSignal,
  IdentityGovernanceProposal,
} from "./IdentityMesh.js";

const log = getLogger("deep-tree-echo-core/core-self/AutognosisAutogenesisCoupler");

export const AUTOGENESIS_COUPLE_ENV = "DELTECHO_AUTOGENESIS_COUPLE";
export const CONSENSUS_SLOT = 0;
export const ADOPTED_SLOT = 1;
export const DEFAULT_INPUT_DIM = 64;
export const DEFAULT_GOAL_CAP = 20;

export type AutogenesisKind =
  | "edge-of-chaos"
  | "regulate"
  | "recover-pathology";

export type CoupleSkipReason =
  | "identity_unattached"
  | "couple_disabled"
  | "already_coupled"
  | "no_report";

export interface CoupleResult {
  skipped: boolean;
  reason?: CoupleSkipReason;
  kind?: AutogenesisKind;
  adopted?: boolean;
  integrated?: boolean;
  stepped?: boolean;
}

export interface ReservoirAccessors {
  getAutognosisReport(): AutognosisReport | null;
  getState(): ReservoirState;
  step(input: number[]): unknown;
  inputDim?: number;
}

export interface GoalOrigin {
  source: "intrinsic" | "derived" | "adopted" | "emergent";
  reasoning: string;
  fromStates: string[];
}

export interface GenerateGoalParams {
  content: string;
  priority: number;
  origin: GoalOrigin;
}

export interface ActiveGoalLike {
  content: string;
  status?: string;
  priority?: number;
  progress?: number;
}

export interface IntentionalityAccessors {
  generateGoal(params: GenerateGoalParams): unknown;
  getActiveGoals(): ActiveGoalLike[];
  maxActiveGoals?: number;
}

export interface AutognosisAutogenesisCouplerDeps {
  identity?: IdentityMesh | null;
  reservoir: ReservoirAccessors;
  intentionality: IntentionalityAccessors;
  readGrant?: () => boolean;
}

export function isCoupleGranted(
  value: string | undefined = process.env[AUTOGENESIS_COUPLE_ENV],
): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function deriveAutogenesisKind(
  report: AutognosisReport,
): AutogenesisKind {
  if (report.isSaturated || report.isDead) return "recover-pathology";
  if (report.isEdgeOfChaos) return "edge-of-chaos";
  return "regulate";
}

export function autogenesisGoalId(kind: AutogenesisKind): string {
  return `autogenesis:${kind}`;
}

export function roundHealth(health: number): number {
  return Math.round(health * 10) / 10;
}

export function l2Normalize(values: number[]): number[] {
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) return values.map(() => 0);
  return values.map((value) => value / norm);
}

export function encodeAutogenesisVector(params: {
  inputDim: number;
  traits: Record<string, number>;
  consensus: number;
  risk: number;
  adopted: boolean;
  health: number;
  goals: ActiveGoalLike[];
}): number[] {
  const vector = new Array(params.inputDim).fill(0);
  vector[CONSENSUS_SLOT] = clamp01(params.consensus);
  vector[ADOPTED_SLOT] = params.adopted ? 1 : 0;
  if (params.inputDim > 2) vector[2] = clamp01(params.health);
  if (params.inputDim > 3) vector[3] = clamp01(params.risk);
  if (params.inputDim > 4) vector[4] = Math.min(1, params.goals.length / 10);
  if (params.inputDim > 5) {
    vector[5] = clamp01(params.goals[0]?.priority ?? 0);
  }
  const traitNames = Object.keys(params.traits).sort();
  for (let i = 0; i < traitNames.length && i + 6 < params.inputDim; i++) {
    vector[i + 6] = clamp01(params.traits[traitNames[i]] ?? 0);
  }
  return l2Normalize(vector);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export class AutognosisAutogenesisCoupler {
  private identity: IdentityMesh | null;
  private readonly reservoir: ReservoirAccessors;
  private readonly intentionality: IntentionalityAccessors;
  private readonly readGrant: () => boolean;
  private lastCoupledTimestamp: number | null = null;
  private lastIntegratedKind: AutogenesisKind | null = null;
  private lastIntegratedHealth: number | null = null;

  constructor(deps: AutognosisAutogenesisCouplerDeps) {
    this.identity = deps.identity ?? null;
    this.reservoir = deps.reservoir;
    this.intentionality = deps.intentionality;
    this.readGrant = deps.readGrant ?? isCoupleGranted;
  }

  attachIdentity(identity: IdentityMesh | null | undefined): void {
    this.identity = identity ?? null;
  }

  getIdentity(): IdentityMesh | null {
    return this.identity;
  }

  couple(): CoupleResult {
    const report = this.reservoir.getAutognosisReport();
    if (!report) {
      return { skipped: true, reason: "no_report" };
    }
    if (!this.identity) {
      log.info("couple skip reason=identity_unattached");
      return { skipped: true, reason: "identity_unattached" };
    }
    if (!this.readGrant()) {
      log.info("couple skip reason=couple_disabled");
      return { skipped: true, reason: "couple_disabled" };
    }
    if (this.lastCoupledTimestamp === report.timestamp) {
      log.info("couple skip reason=already_coupled");
      return { skipped: true, reason: "already_coupled" };
    }

    const kind = deriveAutogenesisKind(report);
    const healthKey = roundHealth(report.health);
    const shouldIntegrate =
      this.lastIntegratedKind !== kind ||
      this.lastIntegratedHealth !== healthKey;

    let proposal: IdentityGovernanceProposal | undefined;
    let adopted = false;
    if (shouldIntegrate) {
      const reservoirState = this.reservoir.getState();
      const signal: IdentityAutognosisSignal = {
        health: report.health,
        isEdgeOfChaos: report.isEdgeOfChaos,
        isSaturated: report.isSaturated,
        isDead: report.isDead,
        memoryCapacity: reservoirState.memoryCapacity,
        computationalCapacity: reservoirState.computationalCapacity,
        entropy: reservoirState.entropy,
        timestamp: report.timestamp,
      };
      proposal = this.identity.integrateAutognosis(signal);
      adopted = proposal.adopted;
      this.lastIntegratedKind = kind;
      this.lastIntegratedHealth = healthKey;

      if (adopted) {
        const goalId = autogenesisGoalId(kind);
        this.identity.setGoal({
          id: goalId,
          description: `${goalId} ${proposal.title}`,
          priority: proposal.consensus,
        });
        this.tryGenerateGoal(kind, proposal);
      }
    }

    const inputDim = this.reservoir.inputDim ?? DEFAULT_INPUT_DIM;
    const latestProposal =
      proposal ?? this.identity.getState().relation.governanceProposals[0];
    const vector = encodeAutogenesisVector({
      inputDim,
      traits: this.identity.getState().relation.traits,
      consensus: latestProposal?.consensus ?? 0,
      risk: latestProposal?.risk ?? 0,
      adopted: latestProposal?.adopted ?? false,
      health: report.health,
      goals: this.intentionality.getActiveGoals().filter(isActiveAutogenesisGoal),
    });
    this.reservoir.step(vector);
    this.lastCoupledTimestamp = report.timestamp;

    log.info(
      `couple kind=${kind} adopted=${adopted} integrated=${shouldIntegrate} stepped=true`,
    );
    return {
      skipped: false,
      kind,
      adopted,
      integrated: shouldIntegrate,
      stepped: true,
    };
  }

  private tryGenerateGoal(
    kind: AutogenesisKind,
    proposal: IdentityGovernanceProposal,
  ): void {
    const content = autogenesisGoalId(kind);
    const active = this.intentionality.getActiveGoals().filter((goal) => {
      const isActive = !goal.status || goal.status === "active";
      return isActive && goal.content === content;
    });
    const cap = this.intentionality.maxActiveGoals ?? DEFAULT_GOAL_CAP;
    if (active.length > 0) return;
    if (this.intentionality.getActiveGoals().length >= cap) return;
    this.intentionality.generateGoal({
      content,
      priority: proposal.consensus,
      origin: {
        source: "intrinsic",
        reasoning: `${content} AAR consensus`,
        fromStates: [],
      },
    });
  }
}

function isActiveAutogenesisGoal(goal: ActiveGoalLike): boolean {
  const active = !goal.status || goal.status === "active";
  return active && goal.content.startsWith("autogenesis:");
}
