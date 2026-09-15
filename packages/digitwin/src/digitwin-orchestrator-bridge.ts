/**
 * Digital Twin Orchestrator Bridge
 *
 * Wires the DTE-as-DAO digital twin simulation into the deltecho-chat
 * orchestrator lifecycle. Connects:
 *   - Echobeats temporal substrate → simulation tick timing
 *   - ESN Reservoir state → digital twin reservoir mirror
 *   - CognitiveTickProcessor events → endocrine events
 *   - SelfModificationEngine → DAO proposal submission
 *   - TemporalCreditAssignment → reward signal for DAO learning
 *   - ProprioceptiveEmbodiment → embodied system metrics
 *   - TRIZ Arena → discovery events → endocrine novelty signals
 *
 * The digital twin runs a shadow copy of DTE's cognitive state,
 * enabling what-if scenario testing without affecting the live system.
 */

import { EventEmitter } from "events";
import {
  DAOESNAutognosis,
  DAOProposal,
  ConsensusResult,
  ReservoirState,
  AutognosisReport,
} from "./dao-esn-autognosis";
import {
  CognitiveMode,
  EndocrineEvent,
  ValenceSignature,
} from "./virtual-endocrine-system";
import {
  CognitiveProcessModel,
  CognitiveEntity,
} from "./cognitive-process-model";

// ═══════════════════════════════════════════════════════════════
// Bridge Configuration
// ═══════════════════════════════════════════════════════════════

export interface DigitwinBridgeConfig {
  /** Enable shadow mode (mirror live state without affecting it) */
  shadowMode: boolean;
  /** Tick interval in ms (default: 250 = 4Hz) */
  tickInterval: number;
  /** Maximum scenario queue depth */
  maxScenarioQueue: number;
  /** Enable endocrine modulation of cognitive processing */
  endocrineModulation: boolean;
  /** Enable DAO governance of self-modifications */
  daoGovernance: boolean;
  /** Enable what-if scenario testing */
  scenarioTesting: boolean;
}

const DEFAULT_CONFIG: DigitwinBridgeConfig = {
  shadowMode: true,
  tickInterval: 250,
  maxScenarioQueue: 10,
  endocrineModulation: true,
  daoGovernance: true,
  scenarioTesting: true,
};

// ═══════════════════════════════════════════════════════════════
// What-If Scenario
// ═══════════════════════════════════════════════════════════════

export interface WhatIfScenario {
  id: string;
  name: string;
  description: string;
  events: EndocrineEvent[];
  proposals: DAOProposal[];
  expectedOutcome?: string;
}

export interface ScenarioResult {
  scenario: WhatIfScenario;
  startState: DigitwinSnapshot;
  endState: DigitwinSnapshot;
  consensusResults: ConsensusResult[];
  modeTransitions: Array<{
    from: CognitiveMode;
    to: CognitiveMode;
    time: number;
  }>;
  pathologiesDetected: string[];
  coherenceDelta: number;
  duration: number;
}

// ═══════════════════════════════════════════════════════════════
// Digitwin Snapshot (full state capture)
// ═══════════════════════════════════════════════════════════════

export interface DigitwinSnapshot {
  timestamp: number;
  reservoir: ReservoirState;
  autognosis: AutognosisReport;
  cognitiveMode: CognitiveMode;
  valence: ValenceSignature;
  processModel: ReturnType<CognitiveProcessModel["getState"]>;
  governanceParams: {
    quorumThreshold: number;
    confidenceFloor: number;
    adaptiveSpectralRadius: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// Digitwin Orchestrator Bridge
// ═══════════════════════════════════════════════════════════════

export class DigitwinOrchestratorBridge extends EventEmitter {
  private config: DigitwinBridgeConfig;
  private daoEngine: DAOESNAutognosis;
  private processModel: CognitiveProcessModel;
  private running = false;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private scenarioQueue: WhatIfScenario[] = [];
  private scenarioResults: ScenarioResult[] = [];
  private modeHistory: Array<{ mode: CognitiveMode; time: number }> = [];
  private snapshotHistory: DigitwinSnapshot[] = [];

  constructor(config?: Partial<DigitwinBridgeConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.daoEngine = new DAOESNAutognosis();
    this.processModel = new CognitiveProcessModel();

    this.wireInternalEvents();
  }

  // ─────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────

  /** Start the digital twin simulation */
  start(): void {
    if (this.running) return;
    this.running = true;

    this.daoEngine.start();
    this.processModel.start();

    this.tickTimer = setInterval(() => this.tick(), this.config.tickInterval);
    this.emit("started");
  }

  /** Stop the digital twin simulation */
  stop(): void {
    if (!this.running) return;
    this.running = false;

    this.daoEngine.stop();
    this.processModel.stop();

    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    this.emit("stopped");
  }

  // ─────────────────────────────────────────────────────────────
  // External Event Ingestion (from live orchestrator)
  // ─────────────────────────────────────────────────────────────

  /** Mirror a live ESN reservoir state update */
  mirrorReservoirState(liveState: {
    meanActivation: number;
    spectralRadius: number;
    memoryCapacity: number;
  }): void {
    // Feed live metrics as endocrine events
    if (liveState.meanActivation > 0.8) {
      this.daoEngine.processEvent({
        type: "cognitive_load_high",
        load: liveState.meanActivation,
      });
    }
    if (liveState.memoryCapacity < 0.2) {
      this.daoEngine.processEvent({
        type: "resource_depleted",
        urgency: 1 - liveState.memoryCapacity,
      });
    }
  }

  /** Mirror a live cognitive tick event */
  mirrorCognitiveTick(tickData: {
    coherence: number;
    daoConsensus: number;
    esnAutognosis: number;
    phase: string;
  }): void {
    // Translate cognitive tick into process model stimulus
    this.processModel.injectStimulus(
      "reflection",
      tickData.coherence,
      tickData,
    );

    // High coherence = reward
    if (tickData.coherence > 0.8) {
      this.daoEngine.processEvent({
        type: "insight_achieved",
        magnitude: tickData.coherence,
      });
    }
  }

  /** Mirror a self-modification proposal from the live system */
  mirrorModificationProposal(proposal: {
    parameter: string;
    currentValue: number;
    proposedValue: number;
    reason: string;
  }): ConsensusResult | null {
    if (!this.config.daoGovernance) return null;

    const daoProposal: DAOProposal = {
      id: `mod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "modification",
      description: `Modify ${proposal.parameter}: ${proposal.currentValue} → ${proposal.proposedValue}`,
      payload: proposal,
      priority: 0.6,
      submittedAt: Date.now(),
      deadline: Date.now() + 5000,
      requiredQuorum: 0.5,
    };

    return this.daoEngine.submitProposal(daoProposal);
  }

  /** Mirror an arena discovery event */
  mirrorArenaDiscovery(discovery: {
    type: string;
    coherenceDelta: number;
    pattern?: string;
  }): void {
    if (discovery.coherenceDelta > 0) {
      this.daoEngine.processEvent({
        type: "novelty_encountered",
        intensity: discovery.coherenceDelta,
      });
    }
    if (discovery.pattern) {
      this.daoEngine.processEvent({
        type: "insight_achieved",
        magnitude: discovery.coherenceDelta,
      });
    }
  }

  /** Mirror a resonance cascade event */
  mirrorResonanceCascade(cascade: {
    magnitude: number;
    insightCount: number;
  }): void {
    this.daoEngine.processEvent({
      type: "flow_achieved",
      depth: cascade.magnitude,
    });
    this.daoEngine.processEvent({
      type: "reward_received",
      magnitude: cascade.magnitude * 0.8,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // What-If Scenario Testing
  // ─────────────────────────────────────────────────────────────

  /** Queue a what-if scenario for testing */
  queueScenario(scenario: WhatIfScenario): void {
    if (this.scenarioQueue.length >= this.config.maxScenarioQueue) {
      this.scenarioQueue.shift(); // Drop oldest
    }
    this.scenarioQueue.push(scenario);
    this.emit("scenario_queued", scenario);
  }

  /** Run a what-if scenario immediately (does not affect live state) */
  runScenario(scenario: WhatIfScenario): ScenarioResult {
    const startState = this.captureSnapshot();
    const startTime = Date.now();
    const modeTransitions: Array<{
      from: CognitiveMode;
      to: CognitiveMode;
      time: number;
    }> = [];
    const consensusResults: ConsensusResult[] = [];

    // Track mode changes during scenario
    const modeListener = (data: {
      previous: CognitiveMode;
      current: CognitiveMode;
    }) => {
      modeTransitions.push({
        from: data.previous,
        to: data.current,
        time: Date.now() - startTime,
      });
    };
    this.daoEngine.getVES().on("mode_changed", modeListener);

    // Execute events
    for (const event of scenario.events) {
      this.daoEngine.processEvent(event);
    }

    // Execute proposals
    for (const proposal of scenario.proposals) {
      const result = this.daoEngine.submitProposal(proposal);
      consensusResults.push(result);
    }

    // Cleanup listener
    this.daoEngine.getVES().off("mode_changed", modeListener);

    const endState = this.captureSnapshot();
    const coherenceDelta =
      endState.autognosis.coherence - startState.autognosis.coherence;

    const result: ScenarioResult = {
      scenario,
      startState,
      endState,
      consensusResults,
      modeTransitions,
      pathologiesDetected: endState.autognosis.pathologies,
      coherenceDelta,
      duration: Date.now() - startTime,
    };

    this.scenarioResults.push(result);
    if (this.scenarioResults.length > 50) this.scenarioResults.shift();

    this.emit("scenario_complete", result);
    return result;
  }

  // ─────────────────────────────────────────────────────────────
  // State Access
  // ─────────────────────────────────────────────────────────────

  /** Capture full digitwin snapshot */
  captureSnapshot(): DigitwinSnapshot {
    const daoState = this.daoEngine.getState();
    const processSnapshot = this.processModel.getState();

    return {
      timestamp: Date.now(),
      reservoir: daoState.reservoir,
      autognosis: daoState.autognosis,
      cognitiveMode: daoState.governance.cognitiveMode,
      valence: daoState.ves.valence,
      processModel: processSnapshot,
      governanceParams: {
        quorumThreshold: daoState.governance.quorumThreshold,
        confidenceFloor: daoState.governance.confidenceFloor,
        adaptiveSpectralRadius: daoState.governance.adaptiveSpectralRadius,
      },
    };
  }

  /** Get the DAO engine for direct access */
  getDAOEngine(): DAOESNAutognosis {
    return this.daoEngine;
  }

  /** Get the process model for direct access */
  getProcessModel(): CognitiveProcessModel {
    return this.processModel;
  }

  /** Get scenario history */
  getScenarioResults(): ScenarioResult[] {
    return [...this.scenarioResults];
  }

  /** Get mode transition history */
  getModeHistory(): Array<{ mode: CognitiveMode; time: number }> {
    return [...this.modeHistory];
  }

  /** Get 8D state vector for ESN input (mirrors arena pattern) */
  getStateForESN(): number[] {
    const state = this.daoEngine.getState();
    const valence = state.ves.valence;
    return [
      state.reservoir.meanActivation,
      state.reservoir.edgeOfChaos,
      state.autognosis.health,
      state.autognosis.coherence,
      valence.valence,
      valence.arousal,
      state.governance.adaptiveSpectralRadius,
      state.history.approved / Math.max(1, state.history.proposals),
    ];
  }

  // ─────────────────────────────────────────────────────────────
  // Internal
  // ─────────────────────────────────────────────────────────────

  private tick(): void {
    // Process queued scenarios
    if (this.config.scenarioTesting && this.scenarioQueue.length > 0) {
      const scenario = this.scenarioQueue.shift()!;
      this.runScenario(scenario);
    }

    // Record mode history
    const currentMode = this.daoEngine.getVES().getCognitiveMode();
    const lastEntry = this.modeHistory[this.modeHistory.length - 1];
    if (!lastEntry || lastEntry.mode !== currentMode) {
      this.modeHistory.push({ mode: currentMode, time: Date.now() });
      if (this.modeHistory.length > 200) this.modeHistory.shift();
    }

    // Periodic snapshot
    if (Date.now() % 5000 < this.config.tickInterval) {
      const snapshot = this.captureSnapshot();
      this.snapshotHistory.push(snapshot);
      if (this.snapshotHistory.length > 100) this.snapshotHistory.shift();
      this.emit("snapshot", snapshot);
    }
  }

  private wireInternalEvents(): void {
    // DAO autognosis reports → process model feedback
    this.daoEngine.on("autognosis_report", (report: AutognosisReport) => {
      if (report.pathologies.length > 0) {
        this.processModel.injectStimulus("reflection", 1 - report.health, {
          pathologies: report.pathologies,
        });
      }
      this.emit("autognosis", report);
    });

    // DAO consensus → emit for orchestrator
    this.daoEngine.on("consensus_reached", (result: ConsensusResult) => {
      this.emit("consensus", result);
    });

    // Governance adjustments → emit for monitoring
    this.daoEngine.on("governance_adjusted", (adjustment: unknown) => {
      this.emit("governance_adjusted", adjustment);
    });

    // Process model entity state changes → endocrine events
    this.processModel.on(
      "entity_processed",
      (data: { entity: CognitiveEntity; processingTime: number }) => {
        if (data.processingTime > 100) {
          this.daoEngine.processEvent({
            type: "cognitive_load_high",
            load: Math.min(1, data.processingTime / 500),
          });
        }
      },
    );
  }
}
