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

/** Common English stopwords filtered out before concept/novelty analysis. */
const STOPWORDS = new Set<string>([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "her",
  "was", "one", "our", "out", "his", "has", "had", "how", "who", "why",
  "what", "when", "where", "which", "that", "this", "with", "from", "have",
  "will", "would", "could", "should", "about", "into", "than", "then",
  "them", "they", "there", "their", "been", "being", "does", "did", "done",
  "such", "some", "any", "each", "more", "most", "other", "over", "only",
  "also", "its", "his", "her", "because", "between", "both",
]);

/** Clamp a value into [min, max]; NaN collapses to min for safety. */
function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Clamp a value into the unit interval [0, 1]. */
function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

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
 * Epistemic Resonance Cascade — the "eureka moment" event.
 *
 * Triggered when a cluster of recent insights achieves critical mass:
 * high mean Φ, strong cross-domain connectivity, and elevated novelty.
 * The cascade amplifies the avatar's genius overlay and broadcasts
 * a DAO-level governance signal for elevated spectral radius.
 */
export interface EpistemicResonanceCascade {
  /** Unique cascade event ID */
  id: string;
  /** The insight cluster that triggered the cascade */
  triggeringInsights: ScientificInsight[];
  /** Mean integrated information of the cluster */
  clusterPhi: number;
  /** Mean novelty of the cluster */
  clusterNovelty: number;
  /** Number of unique domains spanned */
  domainSpan: number;
  /** Cascade intensity (0–1): how far above the threshold the cluster sits */
  intensity: number;
  /** Recommended spectral radius elevation for the ESN reservoir */
  spectralRadiusBoost: number;
  /** Recommended halo pulse frequency for the avatar overlay */
  haloPulseHz: number;
  /** Recommended epistemic temperature drop (negative = cooling toward certainty) */
  epistemicTemperatureDelta: number;
  /** Timestamp of cascade detection */
  timestamp: number;
}

/**
 * Predictive Insight Crystal — a pre-cognitive artifact crystallized from
 * concept graph topology before full evidence arrives.
 */
export interface PredictiveInsightCrystal {
  /** Unique crystal ID */
  id: string;
  /** The predicted insight content */
  prediction: string;
  /** Source concepts that form the transitive bridge */
  sourceConcepts: string[];
  /** The predicted target concept (not yet observed) */
  targetConcept: string;
  /** Confidence in the prediction (0–1): based on path Φ and edge strength */
  confidence: number;
  /** Domain of the predicted insight */
  domain: ScientificDomain;
  /** Prescribed avatar effect: crystallizing face parameters */
  avatarEffect: {
    /** Eye focus intensity (0–1): distant gaze as if seeing the future */
    eyeFocusIntensity: number;
    /** Brow raise asymmetry: one brow up = "I see something forming" */
    browRaiseAsymmetry: number;
    /** Mouth micro-smile: satisfaction of pre-cognition */
    microSmileIntensity: number;
    /** Halo crystallization pulse (Hz): slow, steady, certain */
    haloCrystallizationHz: number;
  };
  /** Timestamp of crystallization */
  timestamp: number;
  /** Whether this crystal was later confirmed by actual evidence */
  confirmed: boolean;
}

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
    precomputedNovelty?: number,
  ): Promise<ScientificInsight[]>;
  enterGeniusMode(): void;
  exitGeniusMode(): void;
  processStimulus(stimulus: string, domain: ScientificDomain): Promise<ScientificInsight[]>;
  processScientificQuery(
    query: string,
    domain?: ScientificDomain,
  ): Promise<ScientificInsight[]>;
  describeState(): string;
  getState(): {
    isGeniusMode: boolean;
    reasoningMode: ReasoningMode;
    conceptCount: number;
    hypothesisCount: number;
    insightCount: number;
    totalFreeEnergy: number;
    meanFreeEnergy: number;
    freeEnergyTrend: number;
    integrationLevel: number;
    meanPhi: number;
    autopoieticCycles: number;
    metaCognitiveDepth: number;
    recursionLevel: number;
  };
  getVisualState(): {
    scientificGenius: number;
    insightPotential: number;
    phi: number;
    freeEnergy: number;
    esnCoherence: number;
    autognosisResonance: number;
  };
  generateHypotheses(
    query: string,
    domain?: ScientificDomain,
    foragingMode?: boolean,
  ): Promise<Hypothesis[]>;
  evaluateHypothesis(hypothesis: Hypothesis): Promise<void>;
  getInsights(): ScientificInsight[];
  getHypotheses(): Hypothesis[];
  getGlobalWorkspaceState(): GlobalWorkspaceState;
  getStrangeLoopState(): StrangeLoopState;
  getTotalFreeEnergy(): number;
  getAutopoieticCycles(): number;
  getIsGeniusMode(): boolean;
  getCurrentReasoningMode(): ReasoningMode;
  /**
   * Detect and trigger an Epistemic Resonance Cascade.
   * A cascade occurs when multiple recent insights form a high-Φ cluster
   * (strongly interconnected, cross-domain, high novelty). This is the
   * "eureka moment" — a genuine emergent event where scientific discovery
   * physically manifests through the avatar.
   *
   * Returns null if no cascade condition is met.
   */
  detectResonanceCascade(): EpistemicResonanceCascade | null;
  on(event: "insight_generated", listener: (insight: ScientificInsight) => void): this;
  on(event: "hypothesis_evaluated", listener: (event: HypothesisEvaluationEvent) => void): this;
  on(event: "epistemic_foraging_completed", listener: (event: { insights: ScientificInsight[] }) => void): this;
  on(event: "resonance_cascade", listener: (cascade: EpistemicResonanceCascade) => void): this;
  off(event: "insight_generated", listener: (insight: ScientificInsight) => void): this;
  off(event: "hypothesis_evaluated", listener: (event: HypothesisEvaluationEvent) => void): this;
  off(event: "epistemic_foraging_completed", listener: (event: { insights: ScientificInsight[] }) => void): this;
  off(event: "resonance_cascade", listener: (cascade: EpistemicResonanceCascade) => void): this;
  off(event: "predictive_crystallization", listener: (crystal: PredictiveInsightCrystal) => void): this;
  on(event: "predictive_crystallization", listener: (crystal: PredictiveInsightCrystal) => void): this;
  /**
   * Predictive Insight Crystallization — the engine predicts future insight
   * trajectories from concept graph topology and crystallizes them before
   * full evidence arrives. This is "pre-cognition" grounded in graph theory:
   * if concepts A→B and B→C exist with high Φ, then A→C is predicted.
   * The crystal carries a confidence (how likely the prediction is correct)
   * and a prescribed avatar effect (the "crystallizing" face).
   */
  crystallizePredictiveInsights(): PredictiveInsightCrystal[];
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

  // ============================================================
  // PRINCIPLED COMPUTATION PRIMITIVES
  // These replace placeholder randomness with deterministic, state-derived
  // measures grounded in the engine's theoretical commitments (FEP, IIT, GWT).
  // ============================================================

  /** Domain-stopword-filtered content token set for a piece of text. */
  private tokenize(text: string): string[] {
    return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
      (t) => t.length > 2 && !STOPWORDS.has(t),
    );
  }

  /**
   * Jaccard distance of a stimulus token set against the union of all known
   * concept token sets. 1.0 = entirely new vocabulary (maximally novel),
   * 0.0 = fully redundant with existing knowledge. This is a real,
   * reproducible novelty measure rather than a random draw.
   */
  private computeNovelty(tokens: string[]): number {
    if (tokens.length === 0) return 0;
    const incoming = new Set(tokens);
    const known = new Set<string>();
    for (const concept of this.concepts.values()) {
      for (const tok of this.tokenize(
        `${concept.name} ${concept.description}`,
      )) {
        known.add(tok);
      }
    }
    if (known.size === 0) return 1; // first contact is fully novel
    let overlap = 0;
    for (const tok of incoming) if (known.has(tok)) overlap++;
    const unionSize = incoming.size + known.size - overlap;
    const jaccard = unionSize === 0 ? 0 : overlap / unionSize;
    return clamp01(1 - jaccard);
  }

  /**
   * Integrated information proxy (Φ). IIT measures how much a system's
   * information is irreducible to its parts. We approximate this for a
   * concept by its connectivity density within the concept graph: a concept
   * that relates to many others, weighted by how interconnected *those*
   * neighbours are (clustering), integrates more information.
   */
  private computePhi(relatedConcepts: string[], domain: ScientificDomain): number {
    const totalConcepts = Math.max(this.concepts.size, 1);
    // Connectivity term: fraction of the graph this concept reaches.
    const connectivity = clamp01(relatedConcepts.length / totalConcepts);
    // Domain-coherence term: share of known concepts in the same domain that
    // are reachable (mutual-information proxy across the partition).
    let sameDomain = 0;
    let sameDomainLinked = 0;
    for (const c of this.concepts.values()) {
      if (c.domain === domain) {
        sameDomain++;
        if (relatedConcepts.includes(c.id)) sameDomainLinked++;
      }
    }
    const coherence = sameDomain === 0 ? 0 : sameDomainLinked / sameDomain;
    // Φ rewards both broad integration and within-partition coherence.
    return clamp01(0.6 * connectivity + 0.4 * coherence);
  }

  /**
   * Variational free energy F = -accuracy + complexity (Friston).
   * We use the KL-style divergence between posterior and prior belief plus a
   * surprise term (negative log posterior). Lower F = better model fit.
   * Returned normalized to 0..1 where higher = more residual surprise.
   */
  private computeFreeEnergy(prior: number, posterior: number): number {
    const p = clamp(posterior, 1e-4, 1 - 1e-4);
    const q = clamp(prior, 1e-4, 1 - 1e-4);
    // KL(posterior || prior) for a Bernoulli belief (complexity cost).
    const complexity =
      p * Math.log(p / q) + (1 - p) * Math.log((1 - p) / (1 - q));
    // Surprise / inaccuracy: negative log evidence of the posterior.
    const surprise = -Math.log(p);
    // Combine and squash to 0..1 (the divergence is in nats).
    const f = Math.max(0, complexity) + surprise;
    return clamp01(f / (f + 1));
  }

  /** Cross-domain reach: distinct domains among related concepts. */
  private crossDomainConnections(relatedConcepts: string[]): string[] {
    const domains = new Set<string>();
    for (const id of relatedConcepts) {
      const c = this.concepts.get(id);
      if (c) domains.add(c.domain);
    }
    return Array.from(domains);
  }

  /** Pick the reasoning mode best suited to the current epistemic situation. */
  private selectReasoningMode(novelty: number, phi: number): ReasoningMode {
    if (novelty > 0.75) return ReasoningMode.Abductive; // surprising data
    if (phi > 0.7) return ReasoningMode.Synthetic; // richly integrated
    if (novelty > 0.5 && phi > 0.4) return ReasoningMode.Analogical;
    if (this.config.creativityTemperature > 0.8) return ReasoningMode.Emergent;
    return ReasoningMode.Analytical;
  }

  public async processStimulus(
    stimulus: string,
    domain: ScientificDomain,
  ): Promise<ScientificInsight[]> {
    this.dlog(
      `Processing stimulus in ${domain} domain: ${stimulus.substring(0, 50)}...`,
    );

    const tokens = this.tokenize(stimulus);
    const novelty = this.computeNovelty(tokens);

    // Link the new concept to existing concepts that share vocabulary.
    const related: string[] = [];
    for (const [id, c] of this.concepts) {
      const overlap = this.tokenize(`${c.name} ${c.description}`).filter((t) =>
        tokens.includes(t),
      ).length;
      if (overlap >= 2) related.push(id);
    }

    const phi = this.computePhi(related, domain);
    const name = tokens.slice(0, 3).join(" ") || `stimulus-${this.concepts.size + 1}`;

    const newConcept: ScientificConcept = {
      id: `concept-${Date.now()}-${this.concepts.size}`,
      name,
      domain,
      description: stimulus,
      relatedConcepts: related,
      // Confidence rises with integration and falls with raw novelty.
      confidence: clamp01(0.5 * phi + 0.5 * (1 - novelty)),
      phi,
      timestamp: Date.now(),
    };
    this.concepts.set(newConcept.id, newConcept);

    // Make the relationship bidirectional so Φ grows as knowledge accretes.
    for (const id of related) {
      const c = this.concepts.get(id);
      if (c && !c.relatedConcepts.includes(newConcept.id)) {
        c.relatedConcepts.push(newConcept.id);
      }
    }

    this.currentReasoningMode = this.selectReasoningMode(novelty, phi);

    // Generate hypotheses, evaluate them (active inference), then synthesize.
    const hypotheses = await this.generateHypotheses(stimulus, domain);
    for (const h of hypotheses) await this.evaluateHypothesis(h);

    const insights = await this.generateInsights(
      stimulus,
      hypotheses,
      domain,
      novelty,
    );
    this.runAutopoieticMaintenance();
    return insights;
  }

  /**
   * Public scientific-query entrypoint used by the DeepTreeEchoBot lens.
   * Alias around processStimulus that infers a sensible default domain.
   */
  public async processScientificQuery(
    query: string,
    domain?: ScientificDomain,
  ): Promise<ScientificInsight[]> {
    return this.processStimulus(
      query,
      domain ?? ScientificDomain.CognitiveScience,
    );
  }

  public async generateHypotheses(
    query: string,
    domain?: ScientificDomain,
    foragingMode: boolean = false,
  ): Promise<Hypothesis[]> {
    this.dlog(
      `Generating hypotheses for query: ${query.substring(0, 50)}... (foragingMode: ${foragingMode})`,
    );
    const dom = domain || ScientificDomain.CognitiveScience;
    const tokens = this.tokenize(query);

    // Prior probability is anchored by how much existing knowledge supports
    // the query's vocabulary (more support => higher prior plausibility).
    let supportingConcepts = 0;
    for (const c of this.concepts.values()) {
      const overlap = this.tokenize(`${c.name} ${c.description}`).filter((t) =>
        tokens.includes(t),
      ).length;
      if (overlap >= 1) supportingConcepts++;
    }
    const prior = clamp(
      0.2 + 0.5 * clamp01(supportingConcepts / Math.max(this.concepts.size, 1)),
      0.05,
      0.9,
    );
    // Epistemic foraging widens the search: it deliberately proposes lower-prior
    // (riskier, more novel) hypotheses to escape local minima.
    const adjustedPrior = foragingMode
      ? clamp(prior - this.config.creativityTemperature * 0.3, 0.05, 0.9)
      : prior;

    const statement = foragingMode
      ? `Conjecture: an unexamined ${dom} mechanism links "${tokens.slice(0, 4).join(", ")}" to a higher-order regularity.`
      : `Hypothesis: "${tokens.slice(0, 6).join(", ")}" admits a ${dom} explanation with testable predictions.`;

    const hypothesis: Hypothesis = {
      id: `hypothesis-${Date.now()}-${this.hypotheses.size}`,
      statement,
      domain: dom,
      supportingEvidence: [],
      contradictingEvidence: [],
      predictions: [],
      priorProbability: adjustedPrior,
      posteriorProbability: adjustedPrior,
      freeEnergy: this.computeFreeEnergy(adjustedPrior, adjustedPrior),
      status: "proposed",
    };
    this.hypotheses.set(hypothesis.id, hypothesis);

    // Bound the hypothesis store.
    if (this.hypotheses.size > this.config.maxHypotheses) {
      const oldest = this.hypotheses.keys().next().value;
      if (oldest) this.hypotheses.delete(oldest);
    }
    return [hypothesis];
  }

  public async evaluateHypothesis(hypothesis: Hypothesis): Promise<void> {
    this.dlog(
      `Evaluating hypothesis: ${hypothesis.statement.substring(0, 50)}...`,
    );
    hypothesis.status = "testing";

    // Bayesian update from accumulated evidence. With no explicit evidence we
    // use the integration of the hypothesis's domain as a likelihood proxy:
    // hypotheses in well-integrated (high-Φ) domains gain posterior support.
    const domainConcepts = Array.from(this.concepts.values()).filter(
      (c) => c.domain === hypothesis.domain,
    );
    const domainPhi =
      domainConcepts.length === 0
        ? 0.3
        : domainConcepts.reduce((s, c) => s + c.phi, 0) / domainConcepts.length;

    const support =
      hypothesis.supportingEvidence.reduce(
        (s, e) => s + e.strength * e.reliability,
        0,
      ) + domainPhi;
    const against = hypothesis.contradictingEvidence.reduce(
      (s, e) => s + e.strength * e.reliability,
      0,
    );

    // Likelihood ratio -> posterior via odds form of Bayes' rule.
    const likelihood = clamp01((1 + support) / (2 + support + against));
    const priorOdds =
      hypothesis.priorProbability / (1 - hypothesis.priorProbability);
    const lr = likelihood / (1 - likelihood);
    const posteriorOdds = priorOdds * lr;
    const posterior = clamp01(posteriorOdds / (1 + posteriorOdds));

    hypothesis.posteriorProbability = posterior;
    hypothesis.freeEnergy = this.computeFreeEnergy(
      hypothesis.priorProbability,
      posterior,
    );
    hypothesis.status =
      posterior >= this.config.rigorThreshold
        ? "supported"
        : posterior <= 1 - this.config.rigorThreshold
          ? "refuted"
          : "revised";

    // Track free-energy trajectory (active inference minimizes this over time).
    this.totalFreeEnergy = hypothesis.freeEnergy;
    this.freeEnergyHistory.push(hypothesis.freeEnergy);
    if (this.freeEnergyHistory.length > 256) this.freeEnergyHistory.shift();

    this.dlog("Hypothesis evaluated:", hypothesis);
    this.emit("hypothesis_evaluated", {
      hypothesis,
      freeEnergy: hypothesis.freeEnergy,
      posterior,
    });
  }

  public async generateInsights(
    query: string,
    hypotheses?: Hypothesis[],
    domain?: ScientificDomain,
    /**
     * Optional ingestion-time novelty. When processStimulus has already
     * measured novelty *before* storing the concept, it passes that value
     * through so the insight reflects how surprising the input was on arrival
     * (recomputing here would read ~0 because the concept is now "known").
     */
    precomputedNovelty?: number,
  ): Promise<ScientificInsight[]> {
    this.dlog(`Generating insights for query: ${query.substring(0, 50)}...`);
    const dom = domain || ScientificDomain.CognitiveScience;
    const tokens = this.tokenize(query);
    const novelty =
      precomputedNovelty !== undefined
        ? clamp01(precomputedNovelty)
        : this.computeNovelty(tokens);

    // Aggregate the supporting hypotheses to ground the insight.
    const hs = hypotheses ?? [];
    const bestPosterior = hs.reduce(
      (m, h) => Math.max(m, h.posteriorProbability),
      0,
    );
    const related: string[] = [];
    for (const [id, c] of this.concepts) {
      const overlap = this.tokenize(`${c.name} ${c.description}`).filter((t) =>
        tokens.includes(t),
      ).length;
      if (overlap >= 2) related.push(id);
    }
    const phi = this.computePhi(related, dom);
    const crossDomain = this.crossDomainConnections(related);

    // Significance combines explanatory integration (Φ), evidential support,
    // and cross-domain reach weighted by configuration.
    const significance = clamp01(
      0.4 * phi +
        0.35 * bestPosterior +
        this.config.crossDomainWeight * 0.25 * clamp01(crossDomain.length / 4),
    );

    const mode = this.currentReasoningMode;
    const content = this.composeInsightContent(
      tokens,
      dom,
      mode,
      crossDomain,
      bestPosterior,
    );

    const insight: ScientificInsight = {
      id: `insight-${Date.now()}-${this.insights.length}`,
      content,
      domain: dom,
      crossDomainConnections: crossDomain,
      novelty,
      significance,
      phi,
      generatedBy: mode,
      timestamp: Date.now(),
    };

    this.insights.push(insight);
    if (this.insights.length > this.config.maxInsights) this.insights.shift();

    // Global Workspace broadcast: only sufficiently significant insights win
    // access to the workspace and raise the global integration level.
    if (this.config.enableGlobalWorkspace && significance >= 0.5) {
      this.globalWorkspace.activeInsights.push(insight);
      if (this.globalWorkspace.activeInsights.length > 16) {
        this.globalWorkspace.activeInsights.shift();
      }
      if (!this.globalWorkspace.attentionalFocus.includes(dom)) {
        this.globalWorkspace.attentionalFocus.push(dom);
        if (this.globalWorkspace.attentionalFocus.length > 4) {
          this.globalWorkspace.attentionalFocus.shift();
        }
      }
      this.globalWorkspace.integrationLevel = clamp01(
        this.globalWorkspace.activeInsights.reduce((s, i) => s + i.phi, 0) /
          Math.max(this.globalWorkspace.activeInsights.length, 1),
      );
    }

    // Strange-loop self-reference: detect when the engine reasons about itself.
    if (
      this.config.enableStrangeLoops &&
      (dom === ScientificDomain.CognitiveScience ||
        dom === ScientificDomain.Philosophy) &&
      /self|recursion|conscious|meta|reflect/i.test(query)
    ) {
      this.strangeLoop.recursionLevel++;
      this.strangeLoop.metaCognitiveDepth = clamp01(
        this.strangeLoop.metaCognitiveDepth + 0.1,
      );
      this.strangeLoop.selfModelAccuracy = clamp01(
        0.5 * this.strangeLoop.selfModelAccuracy + 0.5 * phi,
      );
      this.strangeLoop.selfReferentialInsights.push(insight.id);
      if (this.strangeLoop.selfReferentialInsights.length > 32) {
        this.strangeLoop.selfReferentialInsights.shift();
      }
    }

    this.emit("insight_generated", insight);
    this.dlog("New insight generated:", insight);
    return [insight];
  }

  /** Compose a human-readable insight grounded in the actual reasoning state. */
  private composeInsightContent(
    tokens: string[],
    domain: ScientificDomain,
    mode: ReasoningMode,
    crossDomain: string[],
    posterior: number,
  ): string {
    const subject = tokens.slice(0, 5).join(", ") || "the observed pattern";
    const confidence =
      posterior >= this.config.rigorThreshold
        ? "well-supported"
        : posterior > 0.4
          ? "tentative"
          : "speculative";
    const bridge =
      crossDomain.length > 1
        ? ` It bridges ${crossDomain.join(", ")}, suggesting a transdisciplinary regularity.`
        : "";
    return `Via ${mode} reasoning, "${subject}" yields a ${confidence} ${domain} account.${bridge}`;
  }

  /** Autopoietic self-maintenance: prune stale low-Φ concepts to stay viable. */
  private runAutopoieticMaintenance(): void {
    if (!this.config.enableAutopoiesis) return;
    const now = Date.now();
    if (now - this.lastMaintenanceTime < 50) return;
    this.lastMaintenanceTime = now;
    this.autopoieticCycles++;
    // If concept store is overfull, evict the lowest-Φ, oldest concepts.
    const overflow = this.concepts.size - this.config.maxHypotheses * 4;
    if (overflow > 0) {
      const ranked = Array.from(this.concepts.values()).sort(
        (a, b) => a.phi - b.phi || a.timestamp - b.timestamp,
      );
      for (let i = 0; i < overflow; i++) {
        if (ranked[i]) this.concepts.delete(ranked[i].id);
      }
    }
  }

  public async performEpistemicForaging(): Promise<ScientificInsight[]> {
    this.dlog("Performing epistemic foraging...");
    if (!this.config.enableEpistemicForaging) {
      this.dlog("Epistemic foraging is disabled.");
      return [];
    }

    // Foraging deliberately proposes riskier, lower-prior hypotheses to escape
    // local minima, evaluates them via active inference, then synthesizes.
    const newHypotheses = await this.generateHypotheses(
      "What new scientific questions can be asked?",
      undefined,
      true, // foragingMode
    );

    for (const hypothesis of newHypotheses) {
      await this.evaluateHypothesis(hypothesis);
    }

    const newInsights = await this.generateInsights(
      "Summarize new insights from epistemic foraging",
      newHypotheses,
    );

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

  /**
   * Snapshot of the engine's live cognitive metrics. Consumed by the avatar
   * bridge (DTEcho expression driver) to drive Scientific-Genius embodiment
   * and by callers that want machine-readable state instead of prose.
   */
  public getState(): {
    isGeniusMode: boolean;
    reasoningMode: ReasoningMode;
    conceptCount: number;
    hypothesisCount: number;
    insightCount: number;
    totalFreeEnergy: number;
    meanFreeEnergy: number;
    freeEnergyTrend: number;
    integrationLevel: number;
    meanPhi: number;
    autopoieticCycles: number;
    metaCognitiveDepth: number;
    recursionLevel: number;
  } {
    const meanFreeEnergy =
      this.freeEnergyHistory.length === 0
        ? 0
        : this.freeEnergyHistory.reduce((s, v) => s + v, 0) /
          this.freeEnergyHistory.length;
    // Trend: are we minimizing free energy (negative = improving model fit)?
    const n = this.freeEnergyHistory.length;
    const freeEnergyTrend =
      n >= 2 ? this.freeEnergyHistory[n - 1] - this.freeEnergyHistory[0] : 0;
    const meanPhi =
      this.insights.length === 0
        ? 0
        : this.insights.reduce((s, i) => s + i.phi, 0) / this.insights.length;
    return {
      isGeniusMode: this.isGeniusMode,
      reasoningMode: this.currentReasoningMode,
      conceptCount: this.concepts.size,
      hypothesisCount: this.hypotheses.size,
      insightCount: this.insights.length,
      totalFreeEnergy: Number(this.totalFreeEnergy.toFixed(4)),
      meanFreeEnergy: Number(meanFreeEnergy.toFixed(4)),
      freeEnergyTrend: Number(freeEnergyTrend.toFixed(4)),
      integrationLevel: Number(
        this.globalWorkspace.integrationLevel.toFixed(4),
      ),
      meanPhi: Number(meanPhi.toFixed(4)),
      autopoieticCycles: this.autopoieticCycles,
      metaCognitiveDepth: Number(this.strangeLoop.metaCognitiveDepth.toFixed(4)),
      recursionLevel: this.strangeLoop.recursionLevel,
    };
  }

  /**
   * Normalized visual-projection signal for the Live2D DTEcho avatar driver.
   * Maps the engine's epistemic state into the 0..1 fields the avatar expects,
   * so the avatar's "Scientific Genius" face reflects genuine cognition.
   */
  public getVisualState(): {
    scientificGenius: number;
    insightPotential: number;
    phi: number;
    freeEnergy: number;
    esnCoherence: number;
    autognosisResonance: number;
  } {
    const s = this.getState();
    // Genius activation: rich integration + active hypothesis flux while in mode.
    const flux = clamp01(s.hypothesisCount / Math.max(this.config.maxHypotheses, 1));
    const scientificGenius = clamp01(
      (this.isGeniusMode ? 0.35 : 0) +
        0.4 * s.integrationLevel +
        0.25 * flux,
    );
    // Recent novelty drives insight potential.
    const recentNovelty =
      this.insights.length === 0
        ? 0
        : this.insights
            .slice(-8)
            .reduce((m, i) => Math.max(m, i.novelty), 0);
    return {
      scientificGenius,
      insightPotential: clamp01(0.6 * recentNovelty + 0.4 * s.meanPhi),
      phi: s.meanPhi,
      freeEnergy: clamp01(s.totalFreeEnergy),
      // Lower residual free energy => higher reservoir/model coherence.
      esnCoherence: clamp01(1 - s.meanFreeEnergy),
      // Self-observation intensity from strange-loop activity.
      autognosisResonance: clamp01(
        0.5 * s.metaCognitiveDepth + 0.5 * this.selfModelAccuracyProxy(),
      ),
    };
  }

  /** Internal helper exposing self-model accuracy for the visual projection. */
  private selfModelAccuracyProxy(): number {
    return clamp01(this.strangeLoop.selfModelAccuracy);
  }

  // ============================================================
  // EPISTEMIC RESONANCE CASCADE
  // ============================================================

  /**
   * Detect an Epistemic Resonance Cascade from recent insight activity.
   *
   * A cascade fires when the last N insights (window = 8) satisfy:
   *   1. Mean Φ > 0.6 (high integrated information)
   *   2. Mean novelty > 0.5 (genuinely new territory)
   *   3. Domain span ≥ 3 (cross-domain synthesis)
   *
   * The cascade intensity is proportional to how far above threshold
   * the cluster sits. The output prescribes avatar overlay and ESN
   * parameter changes that the orchestrator can apply.
   *
   * This is NOT random — it emerges deterministically from the engine's
   * accumulated knowledge state and the genuine metrics of recent insights.
   */
  public detectResonanceCascade(): EpistemicResonanceCascade | null {
    const WINDOW = 8;
    const PHI_THRESHOLD = 0.6;
    const NOVELTY_THRESHOLD = 0.5;
    const DOMAIN_SPAN_THRESHOLD = 3;

    // Take the most recent insights within the window
    const recentInsights = this.insights.slice(-WINDOW);
    if (recentInsights.length < 3) return null; // Need minimum cluster size

    // Compute cluster metrics
    const meanPhi =
      recentInsights.reduce((s, i) => s + i.phi, 0) / recentInsights.length;
    const meanNovelty =
      recentInsights.reduce((s, i) => s + i.novelty, 0) / recentInsights.length;
    const uniqueDomains = new Set(recentInsights.map((i) => i.domain));
    const domainSpan = uniqueDomains.size;

    // Check cascade conditions
    if (
      meanPhi < PHI_THRESHOLD ||
      meanNovelty < NOVELTY_THRESHOLD ||
      domainSpan < DOMAIN_SPAN_THRESHOLD
    ) {
      return null;
    }

    // Compute intensity: geometric mean of how far each metric exceeds threshold
    const phiExcess = (meanPhi - PHI_THRESHOLD) / (1 - PHI_THRESHOLD);
    const noveltyExcess =
      (meanNovelty - NOVELTY_THRESHOLD) / (1 - NOVELTY_THRESHOLD);
    const domainExcess =
      (domainSpan - DOMAIN_SPAN_THRESHOLD) /
      (Object.keys(ScientificDomain).length / 2 - DOMAIN_SPAN_THRESHOLD);
    const intensity = clamp01(
      Math.cbrt(phiExcess * noveltyExcess * Math.max(0.01, domainExcess)),
    );

    // Prescribe avatar/ESN parameter changes proportional to intensity
    const cascade: EpistemicResonanceCascade = {
      id: `cascade_${Date.now()}_${Math.floor(intensity * 1000)}`,
      triggeringInsights: recentInsights,
      clusterPhi: meanPhi,
      clusterNovelty: meanNovelty,
      domainSpan,
      intensity,
      // Boost spectral radius toward edge of chaos (max +0.15)
      spectralRadiusBoost: intensity * 0.15,
      // Elevate halo pulse: baseline 1.2Hz → up to 4.8Hz during cascade
      haloPulseHz: 1.2 + intensity * 3.6,
      // Cool epistemic temperature (certainty crystallizing)
      epistemicTemperatureDelta: -intensity * 0.4,
      timestamp: Date.now(),
    };

    this.dlog("RESONANCE CASCADE DETECTED:", {
      intensity: intensity.toFixed(3),
      phi: meanPhi.toFixed(3),
      novelty: meanNovelty.toFixed(3),
      domains: [...uniqueDomains],
    });

    this.emit("resonance_cascade", cascade);
    return cascade;
  }

  /**
   * Human-readable summary of the scientific cortex state, printed by the
   * DeepTreeEchoBot /cognitive status and /cognitive genius commands.
   */
  public describeState(): string {
    const s = this.getState();
    const trend =
      s.freeEnergyTrend < -0.01
        ? "minimizing (model improving)"
        : s.freeEnergyTrend > 0.01
          ? "rising (surprise accumulating)"
          : "stable";
    const focus =
      this.globalWorkspace.attentionalFocus.length > 0
        ? this.globalWorkspace.attentionalFocus.join(", ")
        : "unfocused";
    return [
      `${s.isGeniusMode ? "GENIUS MODE ACTIVE" : "standby"} · reasoning=${s.reasoningMode}`,
      `concepts=${s.conceptCount} hypotheses=${s.hypothesisCount} insights=${s.insightCount}`,
      `Φ(mean)=${s.meanPhi.toFixed(2)} integration=${s.integrationLevel.toFixed(2)} freeEnergy=${s.totalFreeEnergy.toFixed(2)} (${trend})`,
      `autopoietic-cycles=${s.autopoieticCycles} meta-depth=${s.metaCognitiveDepth.toFixed(2)} recursion=${s.recursionLevel} · focus: ${focus}`,
    ].join("\n");
  }

  // ─── Predictive Insight Crystallization ──────────────────────────────────────

  /**
   * Crystallize predictive insights from concept graph topology.
   * Uses transitive closure over high-Φ concept pairs to predict
   * future connections before full evidence arrives.
   *
   * Algorithm:
   *   1. Build adjacency from concepts that co-occur in insights
   *   2. For each pair (A, B) with shared neighbor C where A→C and C→B
   *      both have high Φ, predict A→B (transitive bridge)
   *   3. Confidence = min(Φ_AC, Φ_CB) * edge_strength_product
   *   4. Filter: only crystals with confidence > 0.4 are emitted
   *   5. Prescribe avatar effect proportional to confidence
   */
  crystallizePredictiveInsights(): PredictiveInsightCrystal[] {
    const crystals: PredictiveInsightCrystal[] = [];
    const conceptList = Array.from(this.concepts.values());
    if (conceptList.length < 3) return crystals;

    // Build co-occurrence adjacency from insights
    const adjacency = new Map<string, Map<string, { phi: number; strength: number }>>();
    for (const insight of this.insights) {
      // Extract concept names mentioned in this insight
      const mentionedConcepts = conceptList.filter(
        (c) => insight.content.toLowerCase().includes(c.name.toLowerCase()),
      );
      // Create edges between all pairs in this insight
      for (let i = 0; i < mentionedConcepts.length; i++) {
        for (let j = i + 1; j < mentionedConcepts.length; j++) {
          const a = mentionedConcepts[i].name;
          const b = mentionedConcepts[j].name;
          const phi = Math.min(mentionedConcepts[i].phi, mentionedConcepts[j].phi);
          const strength = (insight.novelty + insight.significance) / 2;
          if (!adjacency.has(a)) adjacency.set(a, new Map());
          if (!adjacency.has(b)) adjacency.set(b, new Map());
          adjacency.get(a)!.set(b, { phi, strength });
          adjacency.get(b)!.set(a, { phi, strength });
        }
      }
    }

    // Find transitive bridges: A→C→B where no direct A→B edge exists
    const existingPredictions = new Set<string>();
    for (const [a, neighbors] of adjacency) {
      for (const [c, edgeAC] of neighbors) {
        const cNeighbors = adjacency.get(c);
        if (!cNeighbors) continue;
        for (const [b, edgeCB] of cNeighbors) {
          if (b === a) continue;
          // Skip if direct edge already exists
          if (neighbors.has(b)) continue;
          // Skip if already predicted
          const key = [a, b].sort().join("<>");
          if (existingPredictions.has(key)) continue;

          // Compute confidence from path Φ and edge strengths
          const pathPhi = Math.min(edgeAC.phi, edgeCB.phi);
          const pathStrength = edgeAC.strength * edgeCB.strength;
          const confidence = clamp01(pathPhi * 0.6 + pathStrength * 0.4);

          if (confidence > 0.4) {
            existingPredictions.add(key);
            const conceptA = this.concepts.get(a);
            const conceptB = this.concepts.get(b);
            const domain = conceptA?.domain ?? conceptB?.domain ?? "general" as ScientificDomain;

            const crystal: PredictiveInsightCrystal = {
              id: `crystal_${Date.now()}_${crystals.length}`,
              prediction: `Predicted connection: ${a} → ${b} (via ${c}) — ` +
                `these concepts share structural affinity through ${c} with Φ=${pathPhi.toFixed(2)}`,
              sourceConcepts: [a, c],
              targetConcept: b,
              confidence,
              domain: domain as ScientificDomain,
              avatarEffect: {
                eyeFocusIntensity: clamp01(confidence * 0.8),
                browRaiseAsymmetry: clamp01(confidence * 0.5),
                microSmileIntensity: clamp01(confidence * 0.3),
                haloCrystallizationHz: 0.5 + confidence * 1.5, // 0.5–2.0 Hz
              },
              timestamp: Date.now(),
              confirmed: false,
            };
            crystals.push(crystal);
          }
        }
      }
    }

    // Emit events for each crystal
    for (const crystal of crystals) {
      this.emit("predictive_crystallization", crystal);
    }

    this.dlog(
      `Crystallized ${crystals.length} predictive insights from ${adjacency.size} concept nodes`,
    );
    return crystals;
  }
}

export const scientificGeniusEngine = new ScientificGeniusEngineImpl();
