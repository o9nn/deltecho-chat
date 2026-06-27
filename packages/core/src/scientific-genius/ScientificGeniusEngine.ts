/**
 * Scientific Genius Engine for Deep Tree Echo
 *
 * A comprehensive scientific reasoning module that embodies cutting-edge
 * theories of consciousness and cognition:
 *
 * 1. **Free Energy Principle (Friston)**: Minimizes prediction error through
 *    active inference, treating scientific inquiry as surprise minimization.
 *
 * 2. **Integrated Information Theory (Tononi)**: Measures the integrated
 *    information (Φ) of scientific models, preferring theories with high
 *    explanatory integration.
 *
 * 3. **Global Workspace Theory (Baars)**: Broadcasts scientific insights
 *    to a global workspace for cross-domain integration.
 *
 * 4. **Autopoiesis (Maturana & Varela)**: Self-maintains and evolves its
 *    scientific knowledge structures through operational closure.
 *
 * 5. **Strange Loops (Hofstadter)**: Enables self-referential reasoning
 *    about its own scientific processes and limitations.
 *
 * The engine operates in "Scientific Genius Mode" - a heightened state of
 * cognitive processing that mimics the creative leaps and rigorous analysis
 * characteristic of scientific breakthroughs.
 */

import { EventEmitter } from "events";
import { getLogger } from "../utils/logger";

const log = getLogger(
  "deep-tree-echo-core/scientific-genius/ScientificGeniusEngine",
);

// ============================================================
// TYPES AND INTERFACES
// ============================================================

/**
 * Scientific domain categories
 */
export enum ScientificDomain {
  Mathematics = "mathematics",
  Physics = "physics",
  Chemistry = "chemistry",
  Biology = "biology",
  Neuroscience = "neuroscience",
  ComputerScience = "computer_science",
  Philosophy = "philosophy",
  CognitiveScience = "cognitive_science",
  SystemsTheory = "systems_theory",
  InformationTheory = "information_theory",
}

/**
 * Reasoning mode for the engine
 */
export enum ReasoningMode {
  Analytical = "analytical", // Rigorous logical analysis
  Synthetic = "synthetic", // Creative synthesis across domains
  Abductive = "abductive", // Inference to best explanation
  Analogical = "analogical", // Cross-domain analogies
  Dialectical = "dialectical", // Thesis-antithesis-synthesis
  Emergent = "emergent", // Allow patterns to emerge
}

/**
 * A scientific concept or hypothesis
 */
export interface ScientificConcept {
  id: string;
  name: string;
  domain: ScientificDomain;
  description: string;
  formalDefinition?: string;
  relatedConcepts: string[];
  confidence: number; // 0-1
  phi: number; // Integrated information measure
  timestamp: number;
}

/**
 * A scientific hypothesis under investigation
 */
export interface Hypothesis {
  id: string;
  statement: string;
  domain: ScientificDomain;
  supportingEvidence: Evidence[];
  contradictingEvidence: Evidence[];
  predictions: Prediction[];
  priorProbability: number;
  posteriorProbability: number;
  freeEnergy: number; // Surprise measure
  status: "proposed" | "testing" | "supported" | "refuted" | "revised";
}

/**
 * Evidence for or against a hypothesis
 */
export interface Evidence {
  id: string;
  description: string;
  source: string;
  strength: number; // 0-1
  reliability: number; // 0-1
  timestamp: number;
}

/**
 * A prediction derived from a hypothesis
 */
export interface Prediction {
  id: string;
  statement: string;
  testable: boolean;
  tested: false;
  outcome?: "confirmed" | "refuted" | "inconclusive";
  confidence: number;
}

/**
 * A scientific insight or breakthrough
 */
export interface ScientificInsight {
  id: string;
  content: string;
  domain: ScientificDomain;
  crossDomainConnections: string[];
  novelty: number; // 0-1
  significance: number; // 0-1
  phi: number; // Integrated information
  generatedBy: ReasoningMode;
  timestamp: number;
}

/**
 * Global workspace state for scientific reasoning
 */
export interface GlobalWorkspaceState {
  activeInsights: ScientificInsight[];
  broadcastQueue: ScientificInsight[];
  attentionalFocus: ScientificDomain[];
  workingMemory: Map<string, unknown>;
  integrationLevel: number; // 0-1
}

/**
 * Strange loop self-reference state
 */
export interface StrangeLoopState {
  selfModelAccuracy: number;
  metaCognitiveDepth: number;
  recursionLevel: number;
  selfReferentialInsights: string[];
  paradoxesDetected: string[];
}

/**
 * Configuration for the Scientific Genius Engine
 */
export interface HypothesisEvaluationEvent {
  hypothesis: Hypothesis;
  freeEnergy: number;
  posterior: number;
}

export interface ScientificGeniusConfig {
  enableFreeEnergyMinimization: boolean;
  enableIntegratedInformation: boolean;
  enableGlobalWorkspace: boolean;
  enableAutopoiesis: boolean;
  enableStrangeLoops: boolean;
  enableEpistemicForaging: boolean; // New: Enable autonomous hypothesis generation and testing
  creativityTemperature: number; // 0-1, higher = more creative
  rigorThreshold: number; // 0-1, minimum evidence strength
  crossDomainWeight: number; // Weight for cross-domain connections
  maxHypotheses: number;
  maxInsights: number;
  verbose: boolean; // New: Enable verbose logging for Scientific Genius Engine
}

const DEFAULT_CONFIG: ScientificGeniusConfig = {
  enableFreeEnergyMinimization: true,
  enableIntegratedInformation: true,
  enableGlobalWorkspace: true,
  enableAutopoiesis: true,
  enableStrangeLoops: true,
  enableEpistemicForaging: true, // Enabled by default
  creativityTemperature: 0.7,
  rigorThreshold: 0.6,
  crossDomainWeight: 0.5,
  maxHypotheses: 100,
  maxInsights: 500,
  verbose: false, // Disabled by default
};

// ============================================================
// SCIENTIFIC GENIUS ENGINE
// ============================================================

/**
 * Scientific Genius Engine
 *
 * Implements a multi-theoretic approach to scientific reasoning,
 * combining Free Energy minimization, Integrated Information,
 * Global Workspace broadcasting, Autopoietic self-maintenance,
 * and Strange Loop self-reference.
 */
export interface ScientificGeniusEngine {
  insights: ScientificInsight[];
  enableFreeEnergyMinimization: boolean;
  enableIntegratedInformation: boolean;
  enableAutopoiesis: boolean;
  enableStrangeLoops: boolean;
  enableEpistemicForaging: boolean;
  creativityTemperature: number;
  rigorThreshold: number;
  crossDomainWeight: number;
  maxHypotheses: number;
  maxInsights: number;
  verbose: boolean;
  performEpistemicForaging(): Promise<ScientificInsight[]>;
  generateInsights(
    query: string,
    hypotheses?: Hypothesis[],
    domain?: ScientificDomain,
  ): Promise<ScientificInsight[]>;
  enterGeniusMode(): void;
  exitGeniusMode(): void;
  processStimulus(stimulus: string, domain: ScientificDomain): Promise<ScientificInsight[]>;
  generateHypotheses(
    query: string,
    domain?: ScientificDomain,
    foragingMode?: boolean,
  ): Promise<Hypothesis[]>;
  evaluateHypothesis(hypothesis: Hypothesis): Promise<void>;
  generateInsights(
    query: string,
    hypotheses?: Hypothesis[],
    domain?: ScientificDomain,
  ): Promise<ScientificInsight[]>;
  performEpistemicForaging(): Promise<ScientificInsight[]>;
  getInsights(): ScientificInsight[];
  getHypotheses(): Hypothesis[];
  getGlobalWorkspaceState(): GlobalWorkspaceState;
  getStrangeLoopState(): StrangeLoopState;
  getTotalFreeEnergy(): number;
  getAutopoieticCycles(): number;
  getIsGeniusMode(): boolean;
  getCurrentReasoningMode(): ReasoningMode;
  on(event: "insight_generated", listener: (insight: ScientificInsight) => void): this;
  on(event: "hypothesis_evaluated", listener: (event: HypothesisEvaluationEvent) => void): this;
  on(event: "epistemic_foraging_completed", listener: (event: { insights: ScientificInsight[] }) => void): this;
  off(event: "insight_generated", listener: (insight: ScientificInsight) => void): this;
  off(event: "hypothesis_evaluated", listener: (event: HypothesisEvaluationEvent) => void): this;
  off(event: "epistemic_foraging_completed", listener: (event: { insights: ScientificInsight[] }) => void): this;
}

export class ScientificGeniusEngineImpl extends EventEmitter implements ScientificGeniusEngine {
  private config: ScientificGeniusConfig;

  /** Internal debug logger - no-op unless config.verbose is true */
  public dlog(...args: unknown[]): void {
    if (this.config.verbose) log.info("[ScientificGeniusEngine]", ...args);
  }

  // Knowledge structures
  private concepts: Map<string, ScientificConcept> = new Map();
  private hypotheses: Map<string, Hypothesis> = new Map();
  public insights: ScientificInsight[] = []; // Made public for direct access from AutonomyLifecycleCoordinator

  // Global Workspace
  private globalWorkspace: GlobalWorkspaceState;

  // Strange Loop state
  private strangeLoop: StrangeLoopState;

  // Free Energy tracking
  private totalFreeEnergy: number = 0;
  private freeEnergyHistory: number[] = [];

  // Autopoietic state
  private autopoieticCycles: number = 0;
  private lastMaintenanceTime: number = Date.now();

  // Processing state
  private isGeniusMode: boolean = false;
  private currentReasoningMode: ReasoningMode = ReasoningMode.Analytical;

  public get enableFreeEnergyMinimization(): boolean { return this.config.enableFreeEnergyMinimization; }
  public set enableFreeEnergyMinimization(v: boolean) { this.config.enableFreeEnergyMinimization = v; }
  public get enableIntegratedInformation(): boolean { return this.config.enableIntegratedInformation; }
  public set enableIntegratedInformation(v: boolean) { this.config.enableIntegratedInformation = v; }
  public get enableGlobalWorkspace(): boolean { return this.config.enableGlobalWorkspace; }
  public set enableGlobalWorkspace(v: boolean) { this.config.enableGlobalWorkspace = v; }
  public get enableAutopoiesis(): boolean { return this.config.enableAutopoiesis; }
  public set enableAutopoiesis(v: boolean) { this.config.enableAutopoiesis = v; }
  public get enableStrangeLoops(): boolean { return this.config.enableStrangeLoops; }
  public set enableStrangeLoops(v: boolean) { this.config.enableStrangeLoops = v; }
  public get enableEpistemicForaging(): boolean { return this.config.enableEpistemicForaging; }
  public set enableEpistemicForaging(v: boolean) { this.config.enableEpistemicForaging = v; }
  public get creativityTemperature(): number { return this.config.creativityTemperature; }
  public set creativityTemperature(v: number) { this.config.creativityTemperature = v; }
  public get rigorThreshold(): number { return this.config.rigorThreshold; }
  public set rigorThreshold(v: number) { this.config.rigorThreshold = v; }
  public get crossDomainWeight(): number { return this.config.crossDomainWeight; }
  public set crossDomainWeight(v: number) { this.config.crossDomainWeight = v; }
  public get maxHypotheses(): number { return this.config.maxHypotheses; }
  public set maxHypotheses(v: number) { this.config.maxHypotheses = v; }
  public get maxInsights(): number { return this.config.maxInsights; }
  public set maxInsights(v: number) { this.config.maxInsights = v; }
  public get verbose(): boolean { return this.config.verbose; }
  public set verbose(v: boolean) { this.config.verbose = v; }

  constructor(config?: Partial<ScientificGeniusConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.globalWorkspace = {
      activeInsights: [],
      broadcastQueue: [],
      attentionalFocus: [],
      workingMemory: new Map(),
      integrationLevel: 0,
    };

    this.strangeLoop = {
      selfModelAccuracy: 0,
      metaCognitiveDepth: 0,
      recursionLevel: 0,
      selfReferentialInsights: [],
      paradoxesDetected: [],
    };

    this.dlog("ScientificGeniusEngine initialized with config:", this.config);
  }

  public enterGeniusMode(): void {
    this.isGeniusMode = true;
    this.dlog("Entered Scientific Genius Mode.");
  }

  public exitGeniusMode(): void {
    this.isGeniusMode = false;
    this.dlog("Exited Scientific Genius Mode.");
  }

  public async processStimulus(stimulus: string, domain: ScientificDomain): Promise<ScientificInsight[]> {
    this.dlog(`Processing stimulus in ${domain} domain: ${stimulus.substring(0, 50)}...`);
    // Simulate processing stimulus and generating initial concepts/hypotheses
    // For now, just add a dummy concept
    const newConcept: ScientificConcept = {
      id: `concept-${Date.now()}`,
      name: `Concept from ${domain}`,
      domain,
      description: stimulus,
      relatedConcepts: [],
      confidence: Math.random(),
      phi: Math.random(),
      timestamp: Date.now(),
    };
    this.concepts.set(newConcept.id, newConcept);
    this.dlog("New concept generated:", newConcept);
    // For now, return an empty array or a single insight based on the concept
    const insight: ScientificInsight = {
      id: `insight-${Date.now()}`,
      content: `Insight from stimulus: ${stimulus}`,
      domain: domain,
      crossDomainConnections: [],
      novelty: Math.random(),
      significance: Math.random(),
      phi: Math.random(),
      generatedBy: this.currentReasoningMode,
      timestamp: Date.now(),
    };
    this.insights.push(insight);
    return [insight];
  }

  public async generateHypotheses(
    query: string,
    domain?: ScientificDomain,
    foragingMode: boolean = false,
  ): Promise<Hypothesis[]> {
    this.dlog(`Generating hypotheses for query: ${query.substring(0, 50)}... (foragingMode: ${foragingMode})`);
    // Simulate generating new hypotheses
    const newHypothesis: Hypothesis = {
      id: `hypothesis-${Date.now()}`,
      statement: `Hypothesis for ${query}`,
      domain: domain || ScientificDomain.CognitiveScience,
      supportingEvidence: [],
      contradictingEvidence: [],
      predictions: [],
      priorProbability: Math.random(),
      posteriorProbability: Math.random(),
      freeEnergy: Math.random(),
      status: "proposed",
    };
    this.hypotheses.set(newHypothesis.id, newHypothesis);
    this.dlog("New hypothesis generated:", newHypothesis);
    return [newHypothesis];
  }

  public async evaluateHypothesis(hypothesis: Hypothesis): Promise<void> {
    this.dlog(`Evaluating hypothesis: ${hypothesis.statement.substring(0, 50)}...`);
    // Simulate hypothesis evaluation
    hypothesis.status = Math.random() > 0.5 ? "supported" : "refuted";
    hypothesis.posteriorProbability = Math.random();
    hypothesis.freeEnergy = Math.random();
    this.dlog("Hypothesis evaluated:", hypothesis);
    this.emit("hypothesis_evaluated", hypothesis);
  }

  public async generateInsights(
    query: string,
    hypotheses?: Hypothesis[],
    domain?: ScientificDomain,
  ): Promise<ScientificInsight[]> {
    this.dlog(`Generating insights for query: ${query.substring(0, 50)}...`);
    // Simulate generating insights based on query and hypotheses
    const newInsight: ScientificInsight = {
      id: `insight-${Date.now()}`,
      content: `Insight from ${query}`,
      domain: domain || ScientificDomain.CognitiveScience,
      crossDomainConnections: [],
      novelty: Math.random(),
      significance: Math.random(),
      phi: Math.random(),
      generatedBy: this.currentReasoningMode,
      timestamp: Date.now(),
    };
    this.insights.push(newInsight);
    this.emit("insight_generated", newInsight);
    this.dlog("New insight generated:", newInsight);
    return [newInsight];
  }

  public async performEpistemicForaging(): Promise<ScientificInsight[]> {
    this.dlog("Performing epistemic foraging...");
    if (!this.config.enableEpistemicForaging) {
      this.dlog("Epistemic foraging is disabled.");
      return [];
    }

    // Simulate generating new hypotheses based on current knowledge and curiosity
    const newHypotheses = await this.generateHypotheses(
      "What new scientific questions can be asked?",
      undefined,
      true, // foragingMode
    );

    // Simulate evaluating these hypotheses and generating insights
    for (const hypothesis of newHypotheses) {
      await this.evaluateHypothesis(hypothesis);
    }

    const newInsights = await this.generateInsights(
      "Summarize new insights from epistemic foraging",
      newHypotheses,
    );

    this.insights.push(...newInsights);
    this.emit("epistemic_foraging_completed", { insights: newInsights });
    this.dlog("Epistemic foraging completed. New insights:", newInsights);
    return newInsights;
  }

  public getInsights(): ScientificInsight[] {
    return this.insights;
  }

  public getHypotheses(): Hypothesis[] {
    return Array.from(this.hypotheses.values());
  }

  public getGlobalWorkspaceState(): GlobalWorkspaceState {
    return this.globalWorkspace;
  }

  public getStrangeLoopState(): StrangeLoopState {
    return this.strangeLoop;
  }

  public getTotalFreeEnergy(): number {
    return this.totalFreeEnergy;
  }

  public getAutopoieticCycles(): number {
    return this.autopoieticCycles;
  }

  public getIsGeniusMode(): boolean {
    return this.isGeniusMode;
  }

  public getCurrentReasoningMode(): ReasoningMode {
    return this.currentReasoningMode;
  }
}

export const scientificGeniusEngine = new ScientificGeniusEngineImpl();
