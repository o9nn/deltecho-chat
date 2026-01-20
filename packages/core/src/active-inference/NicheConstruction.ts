/**
 * NicheConstruction - Environment Shaping for Deep Tree Echo
 *
 * Implements niche construction from evolutionary biology and active inference,
 * enabling Deep Tree Echo to:
 * - Modify its cognitive environment to reduce prediction errors
 * - Create scaffolding structures that support future cognition
 * - Establish persistent affordances in the environment
 * - Build and maintain cognitive artifacts
 *
 * Niche construction is the process by which organisms modify their
 * environment, thereby changing the selection pressures acting on themselves.
 * In cognitive terms, this means actively shaping the information environment.
 */

import { getLogger } from "../utils/logger";
import { EventEmitter } from "events";
import {
  ActiveInference,
  BeliefState,
  Observation,
  Action,
  FreeEnergyResult,
} from "./ActiveInference.js";

const log = getLogger("deep-tree-echo-core/active-inference/NicheConstruction");

/**
 * Cognitive artifact that persists in the environment
 */
export interface CognitiveArtifact {
  /** Unique identifier */
  id: string;
  /** Type of artifact */
  type:
    | "memory_anchor"
    | "attention_scaffold"
    | "inference_template"
    | "response_pattern"
    | "context_frame";
  /** Name/label for the artifact */
  name: string;
  /** Content or structure of the artifact */
  content: unknown;
  /** When this artifact was created */
  createdAt: number;
  /** When this artifact was last used */
  lastUsed: number;
  /** Number of times this artifact has been accessed */
  accessCount: number;
  /** Effectiveness score (how much it reduces free energy) */
  effectiveness: number;
  /** Associated contexts where this artifact is relevant */
  contexts: string[];
  /** Dependencies on other artifacts */
  dependencies: string[];
}

/**
 * Environmental affordance - opportunity for action
 */
export interface Affordance {
  /** Unique identifier */
  id: string;
  /** Type of affordance */
  type: "query" | "response" | "memory" | "learning" | "adaptation";
  /** Description of what this affordance enables */
  description: string;
  /** Conditions under which this affordance is available */
  conditions: Map<string, unknown>;
  /** Expected benefit of using this affordance */
  expectedBenefit: number;
  /** Cost of using this affordance */
  cost: number;
  /** Whether this affordance is currently available */
  available: boolean;
}

/**
 * Niche state representing the current cognitive environment
 */
export interface NicheState {
  /** Active artifacts in the environment */
  artifacts: Map<string, CognitiveArtifact>;
  /** Available affordances */
  affordances: Map<string, Affordance>;
  /** Current environmental stability (low = high change rate) */
  stability: number;
  /** Richness of the environment (information density) */
  richness: number;
  /** Predictability of the environment */
  predictability: number;
  /** Fitness of the current niche (how well it supports cognition) */
  fitness: number;
}

/**
 * Niche modification action
 */
export interface NicheModification {
  /** Type of modification */
  type: "create" | "modify" | "remove" | "reinforce" | "restructure";
  /** Target artifact or affordance */
  targetId: string;
  /** Changes to apply */
  changes: Record<string, unknown>;
  /** Rationale for the modification */
  rationale: string;
  /** Expected effect on free energy */
  expectedEffect: number;
}

/**
 * Configuration for niche construction
 */
export interface NicheConstructionConfig {
  /** Maximum number of artifacts to maintain */
  maxArtifacts: number;
  /** Threshold for creating new artifacts (free energy reduction needed) */
  creationThreshold: number;
  /** Threshold for removing artifacts (min effectiveness) */
  removalThreshold: number;
  /** Rate at which artifact effectiveness decays */
  decayRate: number;
  /** How strongly to prefer proven affordances */
  exploitationBias: number;
  /** Interval for niche maintenance (ms) */
  maintenanceInterval: number;
}

const DEFAULT_CONFIG: NicheConstructionConfig = {
  maxArtifacts: 100,
  creationThreshold: 0.1,
  removalThreshold: 0.05,
  decayRate: 0.01,
  exploitationBias: 0.7,
  maintenanceInterval: 60000,
};

/**
 * NicheConstruction - Active environment shaping for cognitive enhancement
 *
 * This class enables Deep Tree Echo to actively modify its cognitive
 * environment, creating structures that reduce future prediction errors
 * and support more effective cognition.
 */
export class NicheConstruction extends EventEmitter {
  private config: NicheConstructionConfig;
  private activeInference: ActiveInference;
  private nicheState: NicheState;
  private modificationHistory: NicheModification[];
  private maintenanceTimer: NodeJS.Timeout | null = null;
  private artifactIdCounter: number = 0;

  constructor(
    activeInference: ActiveInference,
    config: Partial<NicheConstructionConfig> = {},
  ) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.activeInference = activeInference;
    this.modificationHistory = [];

    // Initialize niche state
    this.nicheState = {
      artifacts: new Map(),
      affordances: new Map(),
      stability: 0.5,
      richness: 0.5,
      predictability: 0.5,
      fitness: 0.5,
    };

    this.initializeDefaultAffordances();
    this.setupActiveInferenceIntegration();
  }

  /**
   * Initialize default affordances
   */
  private initializeDefaultAffordances(): void {
    const defaultAffordances: Omit<Affordance, "id">[] = [
      {
        type: "query",
        description: "Ask clarifying questions to reduce uncertainty",
        conditions: new Map([["uncertainty", "high"]]),
        expectedBenefit: 0.3,
        cost: 0.1,
        available: true,
      },
      {
        type: "response",
        description: "Provide information to satisfy user needs",
        conditions: new Map([["user_need", "identified"]]),
        expectedBenefit: 0.5,
        cost: 0.2,
        available: true,
      },
      {
        type: "memory",
        description: "Store important information for future retrieval",
        conditions: new Map([["importance", "high"]]),
        expectedBenefit: 0.2,
        cost: 0.05,
        available: true,
      },
      {
        type: "learning",
        description: "Update beliefs based on new information",
        conditions: new Map([["novelty", "high"]]),
        expectedBenefit: 0.4,
        cost: 0.15,
        available: true,
      },
      {
        type: "adaptation",
        description: "Adjust communication style to match context",
        conditions: new Map([["mismatch", "detected"]]),
        expectedBenefit: 0.25,
        cost: 0.1,
        available: true,
      },
    ];

    for (const affordance of defaultAffordances) {
      const id = `affordance_${this.artifactIdCounter++}`;
      this.nicheState.affordances.set(id, { id, ...affordance });
    }

    log.info(`Initialized ${defaultAffordances.length} default affordances`);
  }

  /**
   * Set up integration with active inference
   */
  private setupActiveInferenceIntegration(): void {
    // Listen for belief updates to trigger niche construction
    this.activeInference.on(
      "beliefs_updated",
      (data: {
        beliefs: Map<string, BeliefState>;
        freeEnergy: FreeEnergyResult;
      }) => {
        this.evaluateNicheConstruction(data.beliefs, data.freeEnergy);
      },
    );

    // Listen for learning events to update artifact effectiveness
    this.activeInference.on(
      "learning_complete",
      (data: { action: Action; predictionError: number }) => {
        this.updateArtifactEffectiveness(data.action, data.predictionError);
      },
    );
  }

  /**
   * Start niche construction maintenance
   */
  public start(): void {
    if (this.maintenanceTimer) return;

    this.maintenanceTimer = setInterval(() => {
      this.performMaintenance();
    }, this.config.maintenanceInterval);

    log.info("Niche construction started");
    this.emit("started");
  }

  /**
   * Stop niche construction maintenance
   */
  public stop(): void {
    if (this.maintenanceTimer) {
      clearInterval(this.maintenanceTimer);
      this.maintenanceTimer = null;
    }

    log.info("Niche construction stopped");
    this.emit("stopped");
  }

  /**
   * Evaluate whether niche construction is needed
   */
  private async evaluateNicheConstruction(
    beliefs: Map<string, BeliefState>,
    freeEnergy: FreeEnergyResult,
  ): Promise<void> {
    // High free energy suggests the environment could be improved
    if (freeEnergy.totalFreeEnergy > this.config.creationThreshold * 10) {
      await this.considerArtifactCreation(beliefs, freeEnergy);
    }

    // Update niche fitness
    this.updateNicheFitness(freeEnergy);
  }

  /**
   * Consider creating new cognitive artifacts
   */
  private async considerArtifactCreation(
    beliefs: Map<string, BeliefState>,
    freeEnergy: FreeEnergyResult,
  ): Promise<void> {
    // Identify sources of high free energy
    const highUncertaintyBeliefs: BeliefState[] = [];

    for (const belief of beliefs.values()) {
      // Calculate entropy of belief
      let entropy = 0;
      for (const prob of belief.distribution.values()) {
        if (prob > 0) {
          entropy -= prob * Math.log2(prob);
        }
      }

      if (entropy > 1.0) {
        highUncertaintyBeliefs.push(belief);
      }
    }

    // Create inference templates for high-uncertainty areas
    for (const belief of highUncertaintyBeliefs) {
      if (this.nicheState.artifacts.size >= this.config.maxArtifacts) {
        await this.pruneIneffectiveArtifacts();
      }

      const existingTemplate = this.findRelevantArtifact(
        belief.variable,
        "inference_template",
      );
      if (!existingTemplate) {
        await this.createInferenceTemplate(belief);
      }
    }

    // Create context frames for recurring patterns
    await this.detectAndCreateContextFrames(beliefs);
  }

  /**
   * Create an inference template artifact
   */
  private async createInferenceTemplate(
    belief: BeliefState,
  ): Promise<CognitiveArtifact> {
    const artifact: CognitiveArtifact = {
      id: `artifact_${this.artifactIdCounter++}`,
      type: "inference_template",
      name: `inference_${belief.variable}`,
      content: {
        targetVariable: belief.variable,
        priorDistribution: Object.fromEntries(belief.distribution),
        suggestedQueries: this.generateQueriesForUncertainty(belief.variable),
        relevantFeatures: this.identifyRelevantFeatures(belief.variable),
      },
      createdAt: Date.now(),
      lastUsed: Date.now(),
      accessCount: 0,
      effectiveness: 0.5,
      contexts: [belief.variable],
      dependencies: [],
    };

    this.nicheState.artifacts.set(artifact.id, artifact);

    const modification: NicheModification = {
      type: "create",
      targetId: artifact.id,
      changes: { artifact },
      rationale: `High uncertainty in ${belief.variable}`,
      expectedEffect: -0.1, // Expected reduction in free energy
    };

    this.modificationHistory.push(modification);
    this.emit("artifact_created", artifact);

    log.info(`Created inference template for ${belief.variable}`);
    return artifact;
  }

  /**
   * Generate queries that could reduce uncertainty for a variable
   */
  private generateQueriesForUncertainty(variable: string): string[] {
    const queryTemplates: Record<string, string[]> = {
      user_intent: [
        "Could you clarify what you're looking for?",
        "What would be most helpful for you right now?",
        "Is there a specific aspect you'd like me to focus on?",
      ],
      emotional_valence: [
        "How are you feeling about this?",
        "Is there anything concerning you?",
        "What outcome would make you happiest?",
      ],
      topic_relevance: [
        "Is this information relevant to your needs?",
        "Should I focus on a different aspect?",
        "What context am I missing?",
      ],
      information_need: [
        "What do you already know about this?",
        "What level of detail would be helpful?",
        "Are you looking for an overview or specifics?",
      ],
      default: [
        "Can you tell me more about that?",
        "What would be most helpful to discuss?",
        "Is there anything else I should know?",
      ],
    };

    return queryTemplates[variable] || queryTemplates.default;
  }

  /**
   * Identify features relevant to a belief variable
   */
  private identifyRelevantFeatures(variable: string): string[] {
    const featureMap: Record<string, string[]> = {
      user_intent: ["question_words", "action_verbs", "request_patterns"],
      emotional_valence: ["sentiment_words", "punctuation", "capitalization"],
      topic_relevance: ["keywords", "entity_mentions", "context_markers"],
      information_need: ["question_complexity", "domain_terms", "specificity"],
      default: ["content_length", "structure", "tone"],
    };

    return featureMap[variable] || featureMap.default;
  }

  /**
   * Detect recurring patterns and create context frames
   */
  private async detectAndCreateContextFrames(
    beliefs: Map<string, BeliefState>,
  ): Promise<void> {
    // Analyze belief correlations
    const beliefCorrelations = this.analyzeBeliefCorrelations(beliefs);

    for (const correlation of beliefCorrelations) {
      if (correlation.strength > 0.7) {
        const existingFrame = this.findContextFrame(correlation.variables);
        if (!existingFrame) {
          await this.createContextFrame(correlation);
        }
      }
    }
  }

  /**
   * Analyze correlations between beliefs
   */
  private analyzeBeliefCorrelations(
    beliefs: Map<string, BeliefState>,
  ): Array<{ variables: string[]; strength: number }> {
    const correlations: Array<{ variables: string[]; strength: number }> = [];
    const beliefArray = Array.from(beliefs.entries());

    for (let i = 0; i < beliefArray.length; i++) {
      for (let j = i + 1; j < beliefArray.length; j++) {
        const [var1, belief1] = beliefArray[i];
        const [var2, belief2] = beliefArray[j];

        // Calculate correlation based on distribution similarity
        const strength = this.calculateDistributionSimilarity(
          belief1.distribution,
          belief2.distribution,
        );

        if (strength > 0.5) {
          correlations.push({
            variables: [var1, var2],
            strength,
          });
        }
      }
    }

    return correlations.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Calculate similarity between two distributions
   */
  private calculateDistributionSimilarity(
    dist1: Map<string, number>,
    dist2: Map<string, number>,
  ): number {
    // Use Jensen-Shannon divergence (inverted for similarity)
    const allKeys = new Set([...dist1.keys(), ...dist2.keys()]);
    let jsd = 0;

    for (const key of allKeys) {
      const p = dist1.get(key) || 0.001;
      const q = dist2.get(key) || 0.001;
      const m = (p + q) / 2;

      if (p > 0) jsd += 0.5 * p * Math.log2(p / m);
      if (q > 0) jsd += 0.5 * q * Math.log2(q / m);
    }

    return Math.max(0, 1 - jsd);
  }

  /**
   * Find an existing context frame covering the given variables
   */
  private findContextFrame(variables: string[]): CognitiveArtifact | null {
    for (const artifact of this.nicheState.artifacts.values()) {
      if (artifact.type === "context_frame") {
        const frameVars = (artifact.content as { variables: string[] })
          .variables;
        if (variables.every((v) => frameVars.includes(v))) {
          return artifact;
        }
      }
    }
    return null;
  }

  /**
   * Create a context frame artifact
   */
  private async createContextFrame(correlation: {
    variables: string[];
    strength: number;
  }): Promise<CognitiveArtifact> {
    const artifact: CognitiveArtifact = {
      id: `artifact_${this.artifactIdCounter++}`,
      type: "context_frame",
      name: `frame_${correlation.variables.join("_")}`,
      content: {
        variables: correlation.variables,
        correlationStrength: correlation.strength,
        inferenceRules: this.generateInferenceRules(correlation.variables),
      },
      createdAt: Date.now(),
      lastUsed: Date.now(),
      accessCount: 0,
      effectiveness: 0.5,
      contexts: correlation.variables,
      dependencies: [],
    };

    this.nicheState.artifacts.set(artifact.id, artifact);
    this.emit("artifact_created", artifact);

    log.info(`Created context frame for ${correlation.variables.join(", ")}`);
    return artifact;
  }

  /**
   * Generate inference rules for correlated variables
   */
  private generateInferenceRules(
    variables: string[],
  ): Array<{ condition: string; inference: string; confidence: number }> {
    // Generate simple conditional rules
    const rules: Array<{
      condition: string;
      inference: string;
      confidence: number;
    }> = [];

    for (let i = 0; i < variables.length; i++) {
      for (let j = 0; j < variables.length; j++) {
        if (i !== j) {
          rules.push({
            condition: `${variables[i]} = high`,
            inference: `${variables[j]} likely high`,
            confidence: 0.7,
          });
          rules.push({
            condition: `${variables[i]} = low`,
            inference: `${variables[j]} likely low`,
            confidence: 0.6,
          });
        }
      }
    }

    return rules;
  }

  /**
   * Find a relevant artifact for a given context
   */
  public findRelevantArtifact(
    context: string,
    type?: CognitiveArtifact["type"],
  ): CognitiveArtifact | null {
    let bestMatch: CognitiveArtifact | null = null;
    let bestScore = 0;

    for (const artifact of this.nicheState.artifacts.values()) {
      if (type && artifact.type !== type) continue;

      if (artifact.contexts.includes(context)) {
        const score = artifact.effectiveness * artifact.accessCount;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = artifact;
        }
      }
    }

    if (bestMatch) {
      bestMatch.lastUsed = Date.now();
      bestMatch.accessCount++;
    }

    return bestMatch;
  }

  /**
   * Update artifact effectiveness based on action outcomes
   */
  private updateArtifactEffectiveness(
    action: Action,
    predictionError: number,
  ): void {
    // Find artifacts that were used for this action
    for (const artifact of this.nicheState.artifacts.values()) {
      if (artifact.contexts.some((ctx) => action.target.includes(ctx))) {
        // Update effectiveness based on prediction accuracy
        const effectiveness = 1 - predictionError;
        artifact.effectiveness =
          artifact.effectiveness * 0.9 + effectiveness * 0.1;

        this.emit("artifact_updated", artifact);
      }
    }
  }

  /**
   * Prune ineffective artifacts
   */
  private async pruneIneffectiveArtifacts(): Promise<number> {
    let pruned = 0;

    for (const [id, artifact] of this.nicheState.artifacts) {
      if (artifact.effectiveness < this.config.removalThreshold) {
        this.nicheState.artifacts.delete(id);
        pruned++;

        const modification: NicheModification = {
          type: "remove",
          targetId: id,
          changes: {},
          rationale: `Low effectiveness: ${artifact.effectiveness}`,
          expectedEffect: 0,
        };
        this.modificationHistory.push(modification);

        this.emit("artifact_removed", artifact);
      }
    }

    if (pruned > 0) {
      log.info(`Pruned ${pruned} ineffective artifacts`);
    }

    return pruned;
  }

  /**
   * Perform periodic maintenance on the niche
   */
  private async performMaintenance(): Promise<void> {
    // Decay artifact effectiveness over time
    for (const artifact of this.nicheState.artifacts.values()) {
      const timeSinceUse = Date.now() - artifact.lastUsed;
      const decayFactor = Math.exp(
        (-this.config.decayRate * timeSinceUse) / 3600000,
      );
      artifact.effectiveness *= decayFactor;
    }

    // Prune ineffective artifacts
    await this.pruneIneffectiveArtifacts();

    // Update affordance availability
    this.updateAffordanceAvailability();

    // Recalculate niche fitness
    this.recalculateNicheFitness();

    this.emit("maintenance_complete", this.nicheState);
  }

  /**
   * Update which affordances are currently available
   */
  private updateAffordanceAvailability(): void {
    const beliefs = this.activeInference.getBeliefs();

    for (const affordance of this.nicheState.affordances.values()) {
      affordance.available = this.checkAffordanceConditions(
        affordance,
        beliefs,
      );
    }
  }

  /**
   * Check if affordance conditions are met
   */
  private checkAffordanceConditions(
    affordance: Affordance,
    beliefs: Map<string, BeliefState>,
  ): boolean {
    for (const [condition, requiredValue] of affordance.conditions) {
      const belief = beliefs.get(condition);
      if (!belief) continue;

      // Find most likely value
      let mostLikely = "unknown";
      let maxProb = 0;
      for (const [value, prob] of belief.distribution) {
        if (prob > maxProb) {
          maxProb = prob;
          mostLikely = value;
        }
      }

      if (mostLikely !== requiredValue && maxProb > 0.6) {
        return false;
      }
    }

    return true;
  }

  /**
   * Update niche fitness based on free energy
   */
  private updateNicheFitness(freeEnergy: FreeEnergyResult): void {
    // Fitness is inversely related to free energy
    const newFitness = Math.exp(-freeEnergy.totalFreeEnergy / 10);
    this.nicheState.fitness = this.nicheState.fitness * 0.9 + newFitness * 0.1;

    // Update other niche properties
    this.nicheState.predictability = 1 - freeEnergy.accuracy / 10;
    this.nicheState.richness = Math.min(1, this.nicheState.artifacts.size / 50);
  }

  /**
   * Recalculate overall niche fitness
   */
  private recalculateNicheFitness(): void {
    // Calculate based on artifact effectiveness
    let totalEffectiveness = 0;
    let artifactCount = 0;

    for (const artifact of this.nicheState.artifacts.values()) {
      totalEffectiveness += artifact.effectiveness;
      artifactCount++;
    }

    const avgEffectiveness =
      artifactCount > 0 ? totalEffectiveness / artifactCount : 0.5;

    // Calculate based on affordance availability
    let availableAffordances = 0;
    for (const affordance of this.nicheState.affordances.values()) {
      if (affordance.available) availableAffordances++;
    }
    const affordanceRatio =
      availableAffordances / Math.max(1, this.nicheState.affordances.size);

    // Combined fitness
    this.nicheState.fitness =
      avgEffectiveness * 0.4 +
      affordanceRatio * 0.3 +
      this.nicheState.predictability * 0.3;
  }

  /**
   * Get available affordances for action selection
   */
  public getAvailableAffordances(): Affordance[] {
    return Array.from(this.nicheState.affordances.values()).filter(
      (a) => a.available,
    );
  }

  /**
   * Get current niche state
   */
  public getNicheState(): NicheState {
    return {
      ...this.nicheState,
      artifacts: new Map(this.nicheState.artifacts),
      affordances: new Map(this.nicheState.affordances),
    };
  }

  /**
   * Get artifacts by type
   */
  public getArtifactsByType(
    type: CognitiveArtifact["type"],
  ): CognitiveArtifact[] {
    return Array.from(this.nicheState.artifacts.values()).filter(
      (a) => a.type === type,
    );
  }

  /**
   * Get niche construction summary
   */
  public getSummary(): {
    artifactCount: number;
    affordanceCount: number;
    availableAffordances: number;
    nicheFitness: number;
    stability: number;
    recentModifications: number;
  } {
    return {
      artifactCount: this.nicheState.artifacts.size,
      affordanceCount: this.nicheState.affordances.size,
      availableAffordances: this.getAvailableAffordances().length,
      nicheFitness: this.nicheState.fitness,
      stability: this.nicheState.stability,
      recentModifications: this.modificationHistory.filter(
        (m) => Date.now() - (m as any).timestamp < 3600000,
      ).length,
    };
  }
}
