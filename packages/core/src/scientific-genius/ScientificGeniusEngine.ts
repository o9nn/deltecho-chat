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

const log = getLogger("deep-tree-echo-core/scientific-genius/ScientificGeniusEngine");

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
  tested: boolean;
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
export interface ScientificGeniusConfig {
  enableFreeEnergyMinimization: boolean;
  enableIntegratedInformation: boolean;
  enableGlobalWorkspace: boolean;
  enableAutopoiesis: boolean;
  enableStrangeLoops: boolean;
  creativityTemperature: number; // 0-1, higher = more creative
  rigorThreshold: number; // 0-1, minimum evidence strength
  crossDomainWeight: number; // Weight for cross-domain connections
  maxHypotheses: number;
  maxInsights: number;
}

const DEFAULT_CONFIG: ScientificGeniusConfig = {
  enableFreeEnergyMinimization: true,
  enableIntegratedInformation: true,
  enableGlobalWorkspace: true,
  enableAutopoiesis: true,
  enableStrangeLoops: true,
  creativityTemperature: 0.7,
  rigorThreshold: 0.6,
  crossDomainWeight: 0.5,
  maxHypotheses: 100,
  maxInsights: 500,
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
export class ScientificGeniusEngine extends EventEmitter {
  private config: ScientificGeniusConfig;

  // Knowledge structures
  private concepts: Map<string, ScientificConcept> = new Map();
  private hypotheses: Map<string, Hypothesis> = new Map();
  private insights: ScientificInsight[] = [];

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

  constructor(config: Partial<ScientificGeniusConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.globalWorkspace = {
      activeInsights: [],
      broadcastQueue: [],
      attentionalFocus: [ScientificDomain.CognitiveScience],
      workingMemory: new Map(),
      integrationLevel: 0.5,
    };

    this.strangeLoop = {
      selfModelAccuracy: 0.5,
      metaCognitiveDepth: 0,
      recursionLevel: 0,
      selfReferentialInsights: [],
      paradoxesDetected: [],
    };

    log.info("Scientific Genius Engine initialized");
  }

  // ============================================================
  // CORE SCIENTIFIC REASONING
  // ============================================================

  /**
   * Enter Scientific Genius Mode - heightened cognitive processing
   */
  public enterGeniusMode(): void {
    this.isGeniusMode = true;
    this.config.creativityTemperature = 0.85;

    // Expand attentional focus to all domains
    this.globalWorkspace.attentionalFocus = Object.values(ScientificDomain);

    // Increase integration level
    this.globalWorkspace.integrationLevel = 0.9;

    log.info("Entered Scientific Genius Mode");
    this.emit("genius_mode_entered");
  }

  /**
   * Exit Scientific Genius Mode
   */
  public exitGeniusMode(): void {
    this.isGeniusMode = false;
    this.config.creativityTemperature = 0.7;
    this.globalWorkspace.integrationLevel = 0.5;

    log.info("Exited Scientific Genius Mode");
    this.emit("genius_mode_exited");
  }

  /**
   * Process a scientific query or problem
   */
  public async processScientificQuery(
    query: string,
    domain?: ScientificDomain,
  ): Promise<ScientificInsight[]> {
    // Set reasoning mode based on query type
    this.currentReasoningMode = this.determineReasoningMode(query);

    // Focus attention on relevant domain
    if (domain) {
      this.focusAttention(domain);
    }

    // Generate hypotheses
    const hypotheses = await this.generateHypotheses(query, domain);

    // Evaluate hypotheses using Free Energy Principle
    for (const hypothesis of hypotheses) {
      await this.evaluateHypothesis(hypothesis);
    }

    // Generate insights through Global Workspace broadcasting
    const insights = await this.generateInsights(query, hypotheses);

    // Apply Strange Loop self-reference
    if (this.config.enableStrangeLoops) {
      await this.applyStrangeLoopReflection(query, insights);
    }

    // Autopoietic maintenance
    if (this.config.enableAutopoiesis) {
      this.performAutopoieticMaintenance();
    }

    return insights;
  }

  /**
   * Determine the best reasoning mode for a query
   */
  private determineReasoningMode(query: string): ReasoningMode {
    const queryLower = query.toLowerCase();

    if (queryLower.includes("prove") || queryLower.includes("derive")) {
      return ReasoningMode.Analytical;
    }
    if (queryLower.includes("combine") || queryLower.includes("integrate")) {
      return ReasoningMode.Synthetic;
    }
    if (queryLower.includes("explain") || queryLower.includes("why")) {
      return ReasoningMode.Abductive;
    }
    if (queryLower.includes("like") || queryLower.includes("similar")) {
      return ReasoningMode.Analogical;
    }
    if (queryLower.includes("tension") || queryLower.includes("contradiction")) {
      return ReasoningMode.Dialectical;
    }

    return this.isGeniusMode ? ReasoningMode.Emergent : ReasoningMode.Analytical;
  }

  /**
   * Focus attention on a specific domain
   */
  private focusAttention(domain: ScientificDomain): void {
    // Move domain to front of attentional focus
    this.globalWorkspace.attentionalFocus =
      this.globalWorkspace.attentionalFocus.filter((d) => d !== domain);
    this.globalWorkspace.attentionalFocus.unshift(domain);

    this.emit("attention_focused", { domain });
  }

  // ============================================================
  // FREE ENERGY PRINCIPLE IMPLEMENTATION
  // ============================================================

  /**
   * Generate hypotheses using active inference
   */
  private async generateHypotheses(
    query: string,
    domain?: ScientificDomain,
  ): Promise<Hypothesis[]> {
    const hypotheses: Hypothesis[] = [];

    // Generate based on reasoning mode
    switch (this.currentReasoningMode) {
      case ReasoningMode.Analytical:
        hypotheses.push(...this.generateAnalyticalHypotheses(query, domain));
        break;
      case ReasoningMode.Synthetic:
        hypotheses.push(...this.generateSyntheticHypotheses(query, domain));
        break;
      case ReasoningMode.Abductive:
        hypotheses.push(...this.generateAbductiveHypotheses(query, domain));
        break;
      case ReasoningMode.Analogical:
        hypotheses.push(...this.generateAnalogicalHypotheses(query, domain));
        break;
      case ReasoningMode.Dialectical:
        hypotheses.push(...this.generateDialecticalHypotheses(query, domain));
        break;
      case ReasoningMode.Emergent:
        hypotheses.push(...this.generateEmergentHypotheses(query, domain));
        break;
    }

    // Store hypotheses
    for (const h of hypotheses) {
      this.hypotheses.set(h.id, h);
    }

    // Enforce limit
    if (this.hypotheses.size > this.config.maxHypotheses) {
      this.pruneHypotheses();
    }

    return hypotheses;
  }

  /**
   * Generate analytical hypotheses through logical deduction
   */
  private generateAnalyticalHypotheses(
    query: string,
    domain?: ScientificDomain,
  ): Hypothesis[] {
    const hypotheses: Hypothesis[] = [];

    // Create primary hypothesis
    hypotheses.push({
      id: `hyp_analytical_${Date.now()}`,
      statement: `Analytical hypothesis for: ${query}`,
      domain: domain || ScientificDomain.Philosophy,
      supportingEvidence: [],
      contradictingEvidence: [],
      predictions: [],
      priorProbability: 0.5,
      posteriorProbability: 0.5,
      freeEnergy: 1.0,
      status: "proposed",
    });

    return hypotheses;
  }

  /**
   * Generate synthetic hypotheses through cross-domain integration
   */
  private generateSyntheticHypotheses(
    query: string,
    domain?: ScientificDomain,
  ): Hypothesis[] {
    const hypotheses: Hypothesis[] = [];

    // Identify related domains for synthesis
    const relatedDomains = this.findRelatedDomains(domain);

    for (const relatedDomain of relatedDomains.slice(0, 3)) {
      hypotheses.push({
        id: `hyp_synthetic_${relatedDomain}_${Date.now()}`,
        statement: `Synthetic hypothesis bridging ${domain} and ${relatedDomain}: ${query}`,
        domain: domain || ScientificDomain.SystemsTheory,
        supportingEvidence: [],
        contradictingEvidence: [],
        predictions: [],
        priorProbability: 0.4,
        posteriorProbability: 0.4,
        freeEnergy: 1.2,
        status: "proposed",
      });
    }

    return hypotheses;
  }

  /**
   * Generate abductive hypotheses (inference to best explanation)
   */
  private generateAbductiveHypotheses(
    query: string,
    domain?: ScientificDomain,
  ): Hypothesis[] {
    return [
      {
        id: `hyp_abductive_${Date.now()}`,
        statement: `Best explanation for: ${query}`,
        domain: domain || ScientificDomain.Philosophy,
        supportingEvidence: [],
        contradictingEvidence: [],
        predictions: [],
        priorProbability: 0.6,
        posteriorProbability: 0.6,
        freeEnergy: 0.8,
        status: "proposed",
      },
    ];
  }

  /**
   * Generate analogical hypotheses through cross-domain mapping
   */
  private generateAnalogicalHypotheses(
    query: string,
    domain?: ScientificDomain,
  ): Hypothesis[] {
    return [
      {
        id: `hyp_analogical_${Date.now()}`,
        statement: `Analogical mapping for: ${query}`,
        domain: domain || ScientificDomain.CognitiveScience,
        supportingEvidence: [],
        contradictingEvidence: [],
        predictions: [],
        priorProbability: 0.45,
        posteriorProbability: 0.45,
        freeEnergy: 1.1,
        status: "proposed",
      },
    ];
  }

  /**
   * Generate dialectical hypotheses through thesis-antithesis-synthesis
   */
  private generateDialecticalHypotheses(
    query: string,
    domain?: ScientificDomain,
  ): Hypothesis[] {
    return [
      {
        id: `hyp_thesis_${Date.now()}`,
        statement: `Thesis: ${query}`,
        domain: domain || ScientificDomain.Philosophy,
        supportingEvidence: [],
        contradictingEvidence: [],
        predictions: [],
        priorProbability: 0.5,
        posteriorProbability: 0.5,
        freeEnergy: 1.0,
        status: "proposed",
      },
      {
        id: `hyp_antithesis_${Date.now()}`,
        statement: `Antithesis: NOT ${query}`,
        domain: domain || ScientificDomain.Philosophy,
        supportingEvidence: [],
        contradictingEvidence: [],
        predictions: [],
        priorProbability: 0.5,
        posteriorProbability: 0.5,
        freeEnergy: 1.0,
        status: "proposed",
      },
      {
        id: `hyp_synthesis_${Date.now()}`,
        statement: `Synthesis: Transcending ${query}`,
        domain: domain || ScientificDomain.Philosophy,
        supportingEvidence: [],
        contradictingEvidence: [],
        predictions: [],
        priorProbability: 0.3,
        posteriorProbability: 0.3,
        freeEnergy: 1.5,
        status: "proposed",
      },
    ];
  }

  /**
   * Generate emergent hypotheses through pattern emergence
   */
  private generateEmergentHypotheses(
    query: string,
    domain?: ScientificDomain,
  ): Hypothesis[] {
    // In genius mode, allow more creative hypotheses
    const creativityBoost = this.isGeniusMode ? 0.3 : 0;

    return [
      {
        id: `hyp_emergent_${Date.now()}`,
        statement: `Emergent pattern hypothesis: ${query}`,
        domain: domain || ScientificDomain.SystemsTheory,
        supportingEvidence: [],
        contradictingEvidence: [],
        predictions: [],
        priorProbability: 0.35 + creativityBoost,
        posteriorProbability: 0.35 + creativityBoost,
        freeEnergy: 1.3 - creativityBoost,
        status: "proposed",
      },
    ];
  }

  /**
   * Evaluate a hypothesis using Free Energy minimization
   */
  private async evaluateHypothesis(hypothesis: Hypothesis): Promise<void> {
    // Calculate prediction error (surprise)
    const predictionError = this.calculatePredictionError(hypothesis);

    // Calculate complexity penalty
    const complexity = this.calculateComplexity(hypothesis);

    // Free Energy = Prediction Error + Complexity
    hypothesis.freeEnergy = predictionError + complexity;

    // Update posterior probability using Bayesian inference
    const likelihood = Math.exp(-predictionError);
    const evidence = this.calculateModelEvidence(hypothesis);
    hypothesis.posteriorProbability =
      (likelihood * hypothesis.priorProbability) / Math.max(0.001, evidence);

    // Update total free energy
    this.totalFreeEnergy += hypothesis.freeEnergy;
    this.freeEnergyHistory.push(this.totalFreeEnergy);

    // Emit evaluation event
    this.emit("hypothesis_evaluated", {
      hypothesis,
      freeEnergy: hypothesis.freeEnergy,
      posterior: hypothesis.posteriorProbability,
    });
  }

  /**
   * Calculate prediction error for a hypothesis
   */
  private calculatePredictionError(hypothesis: Hypothesis): number {
    // Base error from lack of evidence
    let error = 1.0;

    // Reduce error based on supporting evidence
    for (const evidence of hypothesis.supportingEvidence) {
      error -= evidence.strength * evidence.reliability * 0.2;
    }

    // Increase error based on contradicting evidence
    for (const evidence of hypothesis.contradictingEvidence) {
      error += evidence.strength * evidence.reliability * 0.3;
    }

    // Check predictions
    for (const prediction of hypothesis.predictions) {
      if (prediction.tested) {
        if (prediction.outcome === "confirmed") {
          error -= 0.2 * prediction.confidence;
        } else if (prediction.outcome === "refuted") {
          error += 0.4 * prediction.confidence;
        }
      }
    }

    return Math.max(0, Math.min(2, error));
  }

  /**
   * Calculate complexity penalty for a hypothesis
   */
  private calculateComplexity(hypothesis: Hypothesis): number {
    // Occam's razor: simpler hypotheses are preferred
    const statementLength = hypothesis.statement.length;
    const predictionCount = hypothesis.predictions.length;

    return (statementLength / 500 + predictionCount / 10) * 0.5;
  }

  /**
   * Calculate model evidence (normalization factor)
   */
  private calculateModelEvidence(hypothesis: Hypothesis): number {
    // Simplified evidence calculation
    return 0.5 + hypothesis.supportingEvidence.length * 0.1;
  }

  // ============================================================
  // INTEGRATED INFORMATION THEORY IMPLEMENTATION
  // ============================================================

  /**
   * Calculate integrated information (Φ) for an insight
   */
  private calculatePhi(insight: ScientificInsight): number {
    // Φ measures how much information is integrated beyond its parts

    // Information content
    const informationContent = insight.content.length / 100;

    // Cross-domain integration
    const crossDomainIntegration =
      insight.crossDomainConnections.length * this.config.crossDomainWeight;

    // Novelty contribution
    const noveltyContribution = insight.novelty * 0.5;

    // Calculate Φ as integrated information
    const phi =
      Math.log(1 + informationContent) *
      (1 + crossDomainIntegration) *
      (1 + noveltyContribution);

    return Math.min(10, phi); // Cap at 10
  }

  // ============================================================
  // GLOBAL WORKSPACE IMPLEMENTATION
  // ============================================================

  /**
   * Generate insights through Global Workspace broadcasting
   */
  private async generateInsights(
    query: string,
    hypotheses: Hypothesis[],
  ): Promise<ScientificInsight[]> {
    const newInsights: ScientificInsight[] = [];

    // Process each hypothesis through the global workspace
    for (const hypothesis of hypotheses) {
      if (hypothesis.posteriorProbability > this.config.rigorThreshold) {
        const insight = this.createInsightFromHypothesis(hypothesis, query);
        newInsights.push(insight);

        // Broadcast to global workspace
        this.broadcastToWorkspace(insight);
      }
    }

    // Cross-domain integration in genius mode
    if (this.isGeniusMode && newInsights.length > 1) {
      const integratedInsight = this.integrateInsights(newInsights, query);
      if (integratedInsight) {
        newInsights.push(integratedInsight);
        this.broadcastToWorkspace(integratedInsight);
      }
    }

    // Store insights
    this.insights.push(...newInsights);

    // Enforce limit
    if (this.insights.length > this.config.maxInsights) {
      this.pruneInsights();
    }

    return newInsights;
  }

  /**
   * Create an insight from a hypothesis
   */
  private createInsightFromHypothesis(
    hypothesis: Hypothesis,
    query: string,
  ): ScientificInsight {
    const insight: ScientificInsight = {
      id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: `Based on ${this.currentReasoningMode} reasoning about "${query}": ${hypothesis.statement}`,
      domain: hypothesis.domain,
      crossDomainConnections: this.findCrossDomainConnections(hypothesis),
      novelty: this.assessNovelty(hypothesis),
      significance: hypothesis.posteriorProbability,
      phi: 0, // Will be calculated
      generatedBy: this.currentReasoningMode,
      timestamp: Date.now(),
    };

    // Calculate integrated information
    insight.phi = this.calculatePhi(insight);

    return insight;
  }

  /**
   * Broadcast an insight to the global workspace
   */
  private broadcastToWorkspace(insight: ScientificInsight): void {
    // Add to broadcast queue
    this.globalWorkspace.broadcastQueue.push(insight);

    // Process queue (simulate broadcasting)
    while (this.globalWorkspace.broadcastQueue.length > 0) {
      const broadcasting = this.globalWorkspace.broadcastQueue.shift()!;

      // Add to active insights if above threshold
      if (broadcasting.phi > 0.5) {
        this.globalWorkspace.activeInsights.push(broadcasting);

        // Limit active insights
        if (this.globalWorkspace.activeInsights.length > 10) {
          this.globalWorkspace.activeInsights.shift();
        }
      }

      this.emit("insight_broadcast", { insight: broadcasting });
    }
  }

  /**
   * Integrate multiple insights into a unified insight
   */
  private integrateInsights(
    insights: ScientificInsight[],
    query: string,
  ): ScientificInsight | null {
    if (insights.length < 2) return null;

    // Combine cross-domain connections
    const allConnections = new Set<string>();
    for (const insight of insights) {
      insight.crossDomainConnections.forEach((c) => allConnections.add(c));
    }

    // Calculate integrated novelty and significance
    const avgNovelty =
      insights.reduce((sum, i) => sum + i.novelty, 0) / insights.length;
    const avgSignificance =
      insights.reduce((sum, i) => sum + i.significance, 0) / insights.length;

    const integrated: ScientificInsight = {
      id: `insight_integrated_${Date.now()}`,
      content: `Integrated understanding of "${query}": ${insights.map((i) => i.content).join(" → ")}`,
      domain: ScientificDomain.SystemsTheory,
      crossDomainConnections: Array.from(allConnections),
      novelty: Math.min(1, avgNovelty * 1.2), // Boost for integration
      significance: Math.min(1, avgSignificance * 1.1),
      phi: 0,
      generatedBy: ReasoningMode.Synthetic,
      timestamp: Date.now(),
    };

    integrated.phi = this.calculatePhi(integrated);

    return integrated;
  }

  // ============================================================
  // STRANGE LOOP IMPLEMENTATION
  // ============================================================

  /**
   * Apply Strange Loop self-referential reflection
   */
  private async applyStrangeLoopReflection(
    query: string,
    insights: ScientificInsight[],
  ): Promise<void> {
    this.strangeLoop.recursionLevel++;

    // Self-model accuracy update
    const predictedInsightCount = this.predictInsightCount(query);
    const actualInsightCount = insights.length;
    const predictionAccuracy =
      1 - Math.abs(predictedInsightCount - actualInsightCount) / 10;
    this.strangeLoop.selfModelAccuracy =
      this.strangeLoop.selfModelAccuracy * 0.9 + predictionAccuracy * 0.1;

    // Generate self-referential insight
    if (this.strangeLoop.recursionLevel <= 3) {
      const selfInsight = `Meta-reflection (level ${this.strangeLoop.recursionLevel}): ` +
        `My reasoning about "${query}" produced ${insights.length} insights ` +
        `with average Φ of ${(insights.reduce((s, i) => s + i.phi, 0) / Math.max(1, insights.length)).toFixed(2)}. ` +
        `Self-model accuracy: ${(this.strangeLoop.selfModelAccuracy * 100).toFixed(1)}%`;

      this.strangeLoop.selfReferentialInsights.push(selfInsight);

      // Limit stored self-insights
      if (this.strangeLoop.selfReferentialInsights.length > 20) {
        this.strangeLoop.selfReferentialInsights.shift();
      }
    }

    // Detect paradoxes
    this.detectParadoxes(query, insights);

    // Update meta-cognitive depth
    this.strangeLoop.metaCognitiveDepth = Math.min(
      5,
      this.strangeLoop.metaCognitiveDepth + 0.1,
    );

    this.strangeLoop.recursionLevel--;

    this.emit("strange_loop_reflection", {
      recursionLevel: this.strangeLoop.recursionLevel,
      selfModelAccuracy: this.strangeLoop.selfModelAccuracy,
    });
  }

  /**
   * Predict how many insights will be generated
   */
  private predictInsightCount(query: string): number {
    // Simple prediction based on query complexity
    const wordCount = query.split(/\s+/).length;
    return Math.ceil(wordCount / 5);
  }

  /**
   * Detect paradoxes in reasoning
   */
  private detectParadoxes(query: string, insights: ScientificInsight[]): void {
    // Check for contradictory insights
    for (let i = 0; i < insights.length; i++) {
      for (let j = i + 1; j < insights.length; j++) {
        if (this.areContradictory(insights[i], insights[j])) {
          const paradox = `Paradox detected: "${insights[i].content}" vs "${insights[j].content}"`;
          this.strangeLoop.paradoxesDetected.push(paradox);

          // Limit stored paradoxes
          if (this.strangeLoop.paradoxesDetected.length > 10) {
            this.strangeLoop.paradoxesDetected.shift();
          }

          this.emit("paradox_detected", { paradox });
        }
      }
    }
  }

  /**
   * Check if two insights are contradictory
   */
  private areContradictory(
    insight1: ScientificInsight,
    insight2: ScientificInsight,
  ): boolean {
    // Simplified contradiction detection
    const negationWords = ["not", "never", "opposite", "contrary", "false"];
    const content1Lower = insight1.content.toLowerCase();
    const content2Lower = insight2.content.toLowerCase();

    for (const word of negationWords) {
      if (
        (content1Lower.includes(word) && !content2Lower.includes(word)) ||
        (!content1Lower.includes(word) && content2Lower.includes(word))
      ) {
        // Check if they're about the same topic
        if (insight1.domain === insight2.domain) {
          return true;
        }
      }
    }

    return false;
  }

  // ============================================================
  // AUTOPOIESIS IMPLEMENTATION
  // ============================================================

  /**
   * Perform autopoietic self-maintenance
   */
  private performAutopoieticMaintenance(): void {
    const now = Date.now();
    const timeSinceLastMaintenance = now - this.lastMaintenanceTime;

    // Only maintain every 5 seconds
    if (timeSinceLastMaintenance < 5000) return;

    this.autopoieticCycles++;
    this.lastMaintenanceTime = now;

    // Prune low-quality hypotheses
    this.pruneHypotheses();

    // Consolidate insights
    this.consolidateInsights();

    // Update global workspace integration
    this.updateWorkspaceIntegration();

    // Self-organize concepts
    this.selfOrganizeConcepts();

    this.emit("autopoietic_maintenance", {
      cycle: this.autopoieticCycles,
      hypothesesCount: this.hypotheses.size,
      insightsCount: this.insights.length,
    });
  }

  /**
   * Prune low-quality hypotheses
   */
  private pruneHypotheses(): void {
    const toRemove: string[] = [];

    for (const [id, hypothesis] of this.hypotheses) {
      // Remove refuted or low-probability hypotheses
      if (
        hypothesis.status === "refuted" ||
        hypothesis.posteriorProbability < 0.1
      ) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.hypotheses.delete(id);
    }
  }

  /**
   * Prune old insights
   */
  private pruneInsights(): void {
    // Sort by significance * phi (combined quality)
    this.insights.sort((a, b) => b.significance * b.phi - a.significance * a.phi);

    // Keep top insights
    this.insights = this.insights.slice(0, this.config.maxInsights);
  }

  /**
   * Consolidate similar insights
   */
  private consolidateInsights(): void {
    // Group insights by domain
    const byDomain = new Map<ScientificDomain, ScientificInsight[]>();

    for (const insight of this.insights) {
      const existing = byDomain.get(insight.domain) || [];
      existing.push(insight);
      byDomain.set(insight.domain, existing);
    }

    // Update workspace with consolidated view
    this.globalWorkspace.workingMemory.set("insightsByDomain", byDomain);
  }

  /**
   * Update global workspace integration level
   */
  private updateWorkspaceIntegration(): void {
    // Integration level based on cross-domain connections
    const totalConnections = this.insights.reduce(
      (sum, i) => sum + i.crossDomainConnections.length,
      0,
    );

    const avgConnections = totalConnections / Math.max(1, this.insights.length);
    this.globalWorkspace.integrationLevel = Math.min(1, avgConnections / 5);
  }

  /**
   * Self-organize concepts through clustering
   */
  private selfOrganizeConcepts(): void {
    // Update concept relationships based on co-occurrence in insights
    for (const insight of this.insights) {
      for (const connection of insight.crossDomainConnections) {
        const concept = this.concepts.get(connection);
        if (concept) {
          // Strengthen related concepts
          concept.confidence = Math.min(1, concept.confidence + 0.01);
        }
      }
    }
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  /**
   * Find related domains for cross-domain synthesis
   */
  private findRelatedDomains(domain?: ScientificDomain): ScientificDomain[] {
    const domainRelations: Record<ScientificDomain, ScientificDomain[]> = {
      [ScientificDomain.Mathematics]: [
        ScientificDomain.Physics,
        ScientificDomain.ComputerScience,
        ScientificDomain.InformationTheory,
      ],
      [ScientificDomain.Physics]: [
        ScientificDomain.Mathematics,
        ScientificDomain.Chemistry,
        ScientificDomain.InformationTheory,
      ],
      [ScientificDomain.Chemistry]: [
        ScientificDomain.Physics,
        ScientificDomain.Biology,
      ],
      [ScientificDomain.Biology]: [
        ScientificDomain.Chemistry,
        ScientificDomain.Neuroscience,
        ScientificDomain.SystemsTheory,
      ],
      [ScientificDomain.Neuroscience]: [
        ScientificDomain.Biology,
        ScientificDomain.CognitiveScience,
        ScientificDomain.Philosophy,
      ],
      [ScientificDomain.ComputerScience]: [
        ScientificDomain.Mathematics,
        ScientificDomain.InformationTheory,
        ScientificDomain.CognitiveScience,
      ],
      [ScientificDomain.Philosophy]: [
        ScientificDomain.CognitiveScience,
        ScientificDomain.Neuroscience,
        ScientificDomain.Mathematics,
      ],
      [ScientificDomain.CognitiveScience]: [
        ScientificDomain.Neuroscience,
        ScientificDomain.Philosophy,
        ScientificDomain.ComputerScience,
      ],
      [ScientificDomain.SystemsTheory]: [
        ScientificDomain.Biology,
        ScientificDomain.InformationTheory,
        ScientificDomain.CognitiveScience,
      ],
      [ScientificDomain.InformationTheory]: [
        ScientificDomain.Mathematics,
        ScientificDomain.ComputerScience,
        ScientificDomain.Physics,
      ],
    };

    return domain ? domainRelations[domain] || [] : Object.values(ScientificDomain);
  }

  /**
   * Find cross-domain connections for a hypothesis
   */
  private findCrossDomainConnections(hypothesis: Hypothesis): string[] {
    const connections: string[] = [];
    const relatedDomains = this.findRelatedDomains(hypothesis.domain);

    for (const domain of relatedDomains) {
      connections.push(domain);
    }

    return connections;
  }

  /**
   * Assess novelty of a hypothesis
   */
  private assessNovelty(hypothesis: Hypothesis): number {
    // Check against existing hypotheses
    let similarityScore = 0;

    for (const existing of this.hypotheses.values()) {
      if (existing.id === hypothesis.id) continue;
      if (existing.domain === hypothesis.domain) {
        similarityScore += 0.1;
      }
    }

    // Novelty is inverse of similarity
    return Math.max(0, 1 - similarityScore);
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * Add a scientific concept to the knowledge base
   */
  public addConcept(concept: Omit<ScientificConcept, "id" | "timestamp">): string {
    const id = `concept_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullConcept: ScientificConcept = {
      ...concept,
      id,
      timestamp: Date.now(),
    };

    this.concepts.set(id, fullConcept);
    this.emit("concept_added", { concept: fullConcept });

    return id;
  }

  /**
   * Get current state summary
   */
  public getState(): {
    isGeniusMode: boolean;
    reasoningMode: ReasoningMode;
    totalFreeEnergy: number;
    hypothesesCount: number;
    insightsCount: number;
    globalWorkspaceIntegration: number;
    strangeLoopDepth: number;
    autopoieticCycles: number;
  } {
    return {
      isGeniusMode: this.isGeniusMode,
      reasoningMode: this.currentReasoningMode,
      totalFreeEnergy: this.totalFreeEnergy,
      hypothesesCount: this.hypotheses.size,
      insightsCount: this.insights.length,
      globalWorkspaceIntegration: this.globalWorkspace.integrationLevel,
      strangeLoopDepth: this.strangeLoop.metaCognitiveDepth,
      autopoieticCycles: this.autopoieticCycles,
    };
  }

  /**
   * Get recent insights
   */
  public getRecentInsights(count: number = 10): ScientificInsight[] {
    return this.insights.slice(-count);
  }

  /**
   * Get active hypotheses
   */
  public getActiveHypotheses(): Hypothesis[] {
    return Array.from(this.hypotheses.values()).filter(
      (h) => h.status !== "refuted",
    );
  }

  /**
   * Get strange loop state
   */
  public getStrangeLoopState(): StrangeLoopState {
    return { ...this.strangeLoop };
  }

  /**
   * Describe current state
   */
  public describeState(): string {
    const state = this.getState();
    const modeDesc = state.isGeniusMode ? "GENIUS MODE ACTIVE" : "Normal mode";
    const reasoningDesc = `Reasoning: ${state.reasoningMode}`;
    const energyDesc = `Free Energy: ${state.totalFreeEnergy.toFixed(2)}`;
    const integrationDesc = `Integration: ${(state.globalWorkspaceIntegration * 100).toFixed(0)}%`;

    return `Scientific Genius Engine [${modeDesc}] | ${reasoningDesc} | ${energyDesc} | ${integrationDesc}`;
  }
}

// Singleton instance
export const scientificGeniusEngine = new ScientificGeniusEngine();
