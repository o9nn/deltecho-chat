/**
 * Relevance-Genius Integration Module
 *
 * This module bridges the Relevance Realization Workspace with the Scientific
 * Genius Engine, enabling the system to:
 *
 * 1. Use relevance realization to guide scientific inquiry
 * 2. Apply scientific reasoning to solve the general relevance problem
 * 3. Integrate the frame problem solution with scientific hypothesis testing
 *
 * The key insight is that the Frame Problem (what changes after an action) is
 * a SPECIAL CASE of the General Relevance Problem (what matters in any context).
 * This relationship mirrors Special vs General Relativity in physics.
 *
 * By solving relevance generally through the Global Workspace, we automatically
 * solve the frame problem specifically for action-effect reasoning.
 */

import { EventEmitter } from "events";
import { getLogger } from "../utils/logger";
import {
  RelevanceRealizationWorkspace,
  relevanceWorkspace,
  RelevanceSignal,
  CognitiveDomain,
  RelevanceType,
} from "../consciousness/RelevanceRealizationWorkspace";
import {
  ScientificGeniusEngine,
  scientificGeniusEngine,
  ScientificDomain,
  ScientificInsight,
  Hypothesis,
} from "./ScientificGeniusEngine";

const log = getLogger(
  "deep-tree-echo-core/scientific-genius/RelevanceGeniusIntegration",
);

// ============================================================
// TYPES AND INTERFACES
// ============================================================

/**
 * A relevance-guided scientific inquiry
 */
export interface RelevanceGuidedInquiry {
  id: string;
  query: string;
  relevanceSignals: RelevanceSignal[];
  scientificInsights: ScientificInsight[];
  frameProblemSolutions: FrameProblemSolution[];
  timestamp: number;
}

/**
 * A solution to a frame problem instance
 */
export interface FrameProblemSolution {
  id: string;
  action: string;
  affectedProperties: string[];
  unchangedProperties: string[];
  confidence: number;
  method: "relevance_realization" | "sleeping_dog" | "circumscription";
}

/**
 * Mapping between cognitive and scientific domains
 */
const DOMAIN_MAPPING: Record<CognitiveDomain, ScientificDomain[]> = {
  [CognitiveDomain.Perception]: [
    ScientificDomain.Neuroscience,
    ScientificDomain.Physics,
  ],
  [CognitiveDomain.Memory]: [
    ScientificDomain.Neuroscience,
    ScientificDomain.CognitiveScience,
  ],
  [CognitiveDomain.Reasoning]: [
    ScientificDomain.Philosophy,
    ScientificDomain.Mathematics,
  ],
  [CognitiveDomain.Emotion]: [
    ScientificDomain.Neuroscience,
    ScientificDomain.CognitiveScience,
  ],
  [CognitiveDomain.Motor]: [ScientificDomain.Biology, ScientificDomain.Physics],
  [CognitiveDomain.Language]: [
    ScientificDomain.CognitiveScience,
    ScientificDomain.Philosophy,
  ],
  [CognitiveDomain.Spatial]: [
    ScientificDomain.Mathematics,
    ScientificDomain.Physics,
  ],
  [CognitiveDomain.Social]: [
    ScientificDomain.CognitiveScience,
    ScientificDomain.Philosophy,
  ],
  [CognitiveDomain.Temporal]: [
    ScientificDomain.Physics,
    ScientificDomain.Philosophy,
  ],
  [CognitiveDomain.Metacognitive]: [
    ScientificDomain.CognitiveScience,
    ScientificDomain.Philosophy,
  ],
};

/**
 * Configuration for the integration
 */
export interface IntegrationConfig {
  /** Enable frame problem tracking */
  enableFrameProblemTracking: boolean;
  /** Enable relevance-guided hypothesis generation */
  enableRelevanceGuidedHypothesis: boolean;
  /** Minimum relevance threshold for scientific inquiry */
  relevanceThreshold: number;
  /** Enable cross-domain integration */
  enableCrossDomainIntegration: boolean;
}

const DEFAULT_CONFIG: IntegrationConfig = {
  enableFrameProblemTracking: true,
  enableRelevanceGuidedHypothesis: true,
  relevanceThreshold: 0.4,
  enableCrossDomainIntegration: true,
};

// ============================================================
// RELEVANCE-GENIUS INTEGRATION
// ============================================================

/**
 * Relevance-Genius Integration
 *
 * Bridges relevance realization with scientific reasoning, enabling:
 * - Relevance-guided scientific inquiry
 * - Frame problem solutions through relevance realization
 * - Cross-domain knowledge integration
 */
export class RelevanceGeniusIntegration extends EventEmitter {
  private config: IntegrationConfig;
  private workspace: RelevanceRealizationWorkspace;
  private geniusEngine: ScientificGeniusEngine;

  // Inquiry history
  private inquiries: RelevanceGuidedInquiry[] = [];

  // Frame problem tracking
  private frameProblemSolutions: FrameProblemSolution[] = [];

  // Integration metrics
  private totalInquiries: number = 0;
  private relevanceGuidedInsights: number = 0;
  private frameProblemsSolved: number = 0;

  constructor(
    workspace?: RelevanceRealizationWorkspace,
    geniusEngine?: ScientificGeniusEngine,
    config: Partial<IntegrationConfig> = {},
  ) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.workspace = workspace || relevanceWorkspace;
    this.geniusEngine = geniusEngine || scientificGeniusEngine;

    // Set up event listeners
    this.setupEventListeners();

    log.info("Relevance-Genius Integration initialized");
  }

  /**
   * Set up event listeners for cross-system communication
   */
  private setupEventListeners(): void {
    // Listen for relevance broadcasts
    this.workspace.on("broadcast", (event) => {
      this.handleRelevanceBroadcast(event);
    });

    // Listen for frame problem optimizations
    this.workspace.on("frame_problem_optimized", (data) => {
      this.handleFrameProblemOptimized(data);
    });

    // Listen for trialectic advances
    this.workspace.on("trialectic_advanced", (data) => {
      this.handleTrialecticAdvance(data);
    });

    // Listen for scientific insights
    this.geniusEngine.on("insight_generated", (insight) => {
      this.handleScientificInsight(insight);
    });
  }

  // ============================================================
  // CORE INTEGRATION METHODS
  // ============================================================

  /**
   * Conduct a relevance-guided scientific inquiry
   *
   * This is the main entry point for integrated reasoning that combines:
   * 1. Relevance realization to determine what matters
   * 2. Scientific reasoning to generate insights
   * 3. Frame problem solutions for action-effect reasoning
   */
  public async conductInquiry(query: string): Promise<RelevanceGuidedInquiry> {
    this.totalInquiries++;

    // Step 1: Process through relevance realization
    const relevanceSignals = await this.workspace.processInput(query);

    // Step 2: Filter by relevance threshold
    const relevantSignals = relevanceSignals.filter(
      (s) => s.salience >= this.config.relevanceThreshold,
    );

    // Step 3: Map to scientific domains
    const scientificDomains = this.mapToScientificDomains(relevantSignals);

    // Step 4: Generate hypotheses guided by relevance
    const _hypotheses = await this.generateRelevanceGuidedHypotheses(
      query,
      relevantSignals,
    );

    // Step 5: Process through scientific genius engine
    const insights: ScientificInsight[] = [];
    for (const domain of scientificDomains) {
      const domainInsights = await this.geniusEngine.processScientificQuery(
        query,
        domain,
      );
      insights.push(...domainInsights);
    }

    // Step 6: Solve any frame problems
    const frameSolutions = this.solveFrameProblems(query, relevantSignals);

    // Create inquiry record
    const inquiry: RelevanceGuidedInquiry = {
      id: `inquiry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      query,
      relevanceSignals: relevantSignals,
      scientificInsights: insights,
      frameProblemSolutions: frameSolutions,
      timestamp: Date.now(),
    };

    // Store inquiry
    this.inquiries.push(inquiry);
    if (this.inquiries.length > 100) {
      this.inquiries.shift();
    }

    // Update metrics
    this.relevanceGuidedInsights += insights.length;
    this.frameProblemsSolved += frameSolutions.length;

    this.emit("inquiry_completed", inquiry);

    return inquiry;
  }

  /**
   * Map relevance signals to scientific domains
   */
  private mapToScientificDomains(
    signals: RelevanceSignal[],
  ): ScientificDomain[] {
    const domains = new Set<ScientificDomain>();

    for (const signal of signals) {
      const mappedDomains = DOMAIN_MAPPING[signal.source];
      if (mappedDomains) {
        for (const domain of mappedDomains) {
          domains.add(domain);
        }
      }
    }

    return Array.from(domains);
  }

  /**
   * Generate hypotheses guided by relevance signals
   */
  private async generateRelevanceGuidedHypotheses(
    query: string,
    signals: RelevanceSignal[],
  ): Promise<Hypothesis[]> {
    if (!this.config.enableRelevanceGuidedHypothesis) {
      return [];
    }

    const hypotheses: Hypothesis[] = [];

    // Group signals by relevance type
    const signalsByType = new Map<RelevanceType, RelevanceSignal[]>();
    for (const signal of signals) {
      const existing = signalsByType.get(signal.relevanceType) || [];
      existing.push(signal);
      signalsByType.set(signal.relevanceType, existing);
    }

    // Generate hypotheses for each relevance type
    for (const [relevanceType, typeSignals] of signalsByType) {
      const hypothesis = this.createHypothesisFromRelevance(
        query,
        relevanceType,
        typeSignals,
      );
      if (hypothesis) {
        hypotheses.push(hypothesis);
      }
    }

    return hypotheses;
  }

  /**
   * Create a hypothesis from relevance signals
   */
  private createHypothesisFromRelevance(
    query: string,
    relevanceType: RelevanceType,
    signals: RelevanceSignal[],
  ): Hypothesis | null {
    // Calculate aggregate salience
    const avgSalience =
      signals.reduce((sum, s) => sum + s.salience, 0) / signals.length;
    const avgConfidence =
      signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;

    // Determine scientific domain from relevance type
    const domainMapping: Record<RelevanceType, ScientificDomain> = {
      [RelevanceType.Teleological]: ScientificDomain.Philosophy,
      [RelevanceType.Contextual]: ScientificDomain.CognitiveScience,
      [RelevanceType.Existential]: ScientificDomain.Biology,
      [RelevanceType.Epistemic]: ScientificDomain.Philosophy,
      [RelevanceType.Pragmatic]: ScientificDomain.SystemsTheory,
      [RelevanceType.Axiological]: ScientificDomain.Philosophy,
    };

    const domain = domainMapping[relevanceType];

    return {
      id: `hyp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      statement: `${relevanceType} relevance suggests: ${query}`,
      domain,
      supportingEvidence: [],
      contradictingEvidence: [],
      predictions: [],
      priorProbability: avgSalience,
      posteriorProbability: avgConfidence,
      freeEnergy: 1 - avgConfidence, // Lower confidence = higher surprise
      status: "proposed",
    };
  }

  // ============================================================
  // FRAME PROBLEM SOLVING
  // ============================================================

  /**
   * Solve frame problems using relevance realization
   *
   * The frame problem asks: "What changes and what doesn't change after an action?"
   *
   * Our solution: Use relevance realization to determine what is RELEVANT to
   * the action, and apply the "sleeping dog" strategy to everything else.
   *
   * This works because:
   * - Relevance realization identifies what matters in the current context
   * - Actions only affect properties that are relevant to them
   * - Non-relevant properties can be assumed unchanged (sleeping dog)
   */
  private solveFrameProblems(
    query: string,
    signals: RelevanceSignal[],
  ): FrameProblemSolution[] {
    if (!this.config.enableFrameProblemTracking) {
      return [];
    }

    const solutions: FrameProblemSolution[] = [];

    // Check if query involves action-effect reasoning
    const actionKeywords = [
      "do",
      "perform",
      "execute",
      "change",
      "modify",
      "update",
      "create",
      "delete",
    ];
    const isActionQuery = actionKeywords.some((kw) =>
      query.toLowerCase().includes(kw),
    );

    if (!isActionQuery) {
      return solutions;
    }

    // Identify affected properties (high relevance, pragmatic type)
    const affectedSignals = signals.filter(
      (s) => s.relevanceType === RelevanceType.Pragmatic && s.salience > 0.5,
    );

    // All other properties are unchanged (sleeping dog strategy)
    const unchangedSignals = signals.filter(
      (s) => s.relevanceType !== RelevanceType.Pragmatic || s.salience <= 0.5,
    );

    // Create solution
    const solution: FrameProblemSolution = {
      id: `frame_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action: query,
      affectedProperties: affectedSignals.map((s) => `${s.source}_${s.id}`),
      unchangedProperties: unchangedSignals.map((s) => `${s.source}_${s.id}`),
      confidence:
        affectedSignals.length > 0
          ? affectedSignals.reduce((sum, s) => sum + s.confidence, 0) /
            affectedSignals.length
          : 0.5,
      method: "relevance_realization",
    };

    solutions.push(solution);
    this.frameProblemSolutions.push(solution);

    return solutions;
  }

  // ============================================================
  // EVENT HANDLERS
  // ============================================================

  /**
   * Handle relevance broadcast events
   */
  private handleRelevanceBroadcast(event: { signal: RelevanceSignal }): void {
    // Check if signal warrants scientific inquiry
    if (
      event.signal.salience > 0.7 &&
      event.signal.relevanceType === RelevanceType.Epistemic
    ) {
      // Trigger scientific inquiry
      this.emit("epistemic_relevance_detected", event.signal);
    }
  }

  /**
   * Handle frame problem optimization events
   */
  private handleFrameProblemOptimized(data: {
    affectedCount: number;
    totalProperties: number;
  }): void {
    log.debug(
      `Frame problem optimized: ${data.affectedCount}/${data.totalProperties} properties affected`,
    );
  }

  /**
   * Handle trialectic advance events
   */
  private handleTrialecticAdvance(data: {
    phase: string;
    cycle: number;
  }): void {
    // Adjust scientific focus based on trialectic phase
    // Note: Focus adjustment is handled internally by the genius engine
    // We emit an event to notify of the phase change
    this.emit("trialectic_phase_changed", {
      phase: data.phase,
      cycle: data.cycle,
      suggestedDomain:
        data.phase === "agent"
          ? ScientificDomain.CognitiveScience
          : data.phase === "arena"
            ? ScientificDomain.Physics
            : ScientificDomain.SystemsTheory,
    });
  }

  /**
   * Handle scientific insight events
   */
  private handleScientificInsight(insight: ScientificInsight): void {
    // Feed insight back to relevance workspace
    this.workspace.processInput(insight);
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * Get integration state
   */
  public getState(): {
    totalInquiries: number;
    relevanceGuidedInsights: number;
    frameProblemsSolved: number;
    recentInquiries: RelevanceGuidedInquiry[];
    recentFrameSolutions: FrameProblemSolution[];
  } {
    return {
      totalInquiries: this.totalInquiries,
      relevanceGuidedInsights: this.relevanceGuidedInsights,
      frameProblemsSolved: this.frameProblemsSolved,
      recentInquiries: this.inquiries.slice(-5),
      recentFrameSolutions: this.frameProblemSolutions.slice(-5),
    };
  }

  /**
   * Describe the relationship between frame problem and relevance problem
   */
  public describeFrameRelevanceRelationship(): string {
    return `
The Frame Problem is a SPECIAL CASE of the General Relevance Problem.

This relationship mirrors Special vs General Relativity in physics:

┌─────────────────────────────────────────────────────────────────┐
│  SPECIAL RELATIVITY          │  GENERAL RELATIVITY              │
│  - Flat spacetime            │  - Curved spacetime              │
│  - Inertial frames only      │  - All reference frames          │
│  - No gravity                │  - Gravity as geometry           │
├─────────────────────────────────────────────────────────────────┤
│  FRAME PROBLEM               │  RELEVANCE PROBLEM               │
│  - Action effects only       │  - All cognitive contexts        │
│  - Predefined ontology       │  - Open-ended world              │
│  - What changes?             │  - What matters?                 │
│  - Technical (AI)            │  - Existential (all organisms)   │
└─────────────────────────────────────────────────────────────────┘

The Global Workspace solves the Frame Problem by solving the more
general Relevance Problem through:

1. DISTRIBUTED RELEVANCE DETECTION
   - Multiple parallel specialist processes
   - Each determines relevance in its domain

2. GLOBAL BROADCASTING
   - High-salience signals broadcast to all
   - Creates shared context for reasoning

3. OPPONENT PROCESSING
   - Competing strategies balance exploration/exploitation
   - Adaptive to changing contexts

4. TRIALECTIC DYNAMICS (Agent-Arena-Relation)
   - Agent: What can I do?
   - Arena: What does the world afford?
   - Relation: How do I fit?

5. SLEEPING DOG STRATEGY
   - Only track what's relevant
   - Assume non-relevant properties unchanged
   - This IS the frame problem solution!

Current Statistics:
- Total Inquiries: ${this.totalInquiries}
- Relevance-Guided Insights: ${this.relevanceGuidedInsights}
- Frame Problems Solved: ${this.frameProblemsSolved}
`;
  }
}

// Singleton instance
export const relevanceGeniusIntegration = new RelevanceGeniusIntegration();
