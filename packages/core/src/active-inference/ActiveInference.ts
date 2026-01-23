/**
 * ActiveInference - Free Energy Principle Implementation for Deep Tree Echo
 *
 * Implements the Active Inference framework from theoretical neuroscience,
 * enabling Deep Tree Echo to:
 * - Maintain generative models of the world
 * - Minimize variational free energy (prediction error)
 * - Select actions that minimize expected future surprise
 * - Engage in epistemic foraging (information seeking)
 *
 * Based on Karl Friston's Free Energy Principle and Active Inference framework.
 */

import { getLogger } from "../utils/logger";
import { EventEmitter } from "events";

const log = getLogger("deep-tree-echo-core/active-inference/ActiveInference");

/**
 * A belief state representing probability distribution over hidden states
 */
export interface BeliefState {
  /** Unique identifier for this belief */
  id: string;
  /** The variable/concept this belief is about */
  variable: string;
  /** Probability distribution over possible values */
  distribution: Map<string, number>;
  /** Precision (inverse variance) - confidence in the belief */
  precision: number;
  /** Timestamp of last update */
  lastUpdated: number;
  /** Number of observations supporting this belief */
  observationCount: number;
}

/**
 * Observation from the environment
 */
export interface Observation {
  /** Type of observation */
  type: "sensory" | "proprioceptive" | "interoceptive" | "social";
  /** Content of the observation */
  content: string;
  /** Numeric features extracted from observation */
  features: number[];
  /** Source of the observation */
  source: string;
  /** Timestamp */
  timestamp: number;
  /** Reliability/confidence in the observation */
  reliability: number;
}

/**
 * Action that can be taken to change the environment
 */
export interface Action {
  /** Action identifier */
  id: string;
  /** Type of action */
  type: "communicate" | "query" | "modify" | "construct" | "explore";
  /** Target of the action */
  target: string;
  /** Parameters for the action */
  parameters: Record<string, unknown>;
  /** Expected outcome (predicted observation) */
  expectedOutcome: Partial<Observation>;
  /** Expected information gain */
  epistemicValue: number;
  /** Expected pragmatic value (goal achievement) */
  pragmaticValue: number;
}

/**
 * Generative model component
 */
export interface GenerativeModel {
  /** Prior beliefs about hidden states */
  priors: Map<string, BeliefState>;
  /** Likelihood mapping: P(observation | state) */
  likelihood: Map<string, Map<string, number>>;
  /** Transition model: P(state_t+1 | state_t, action) */
  transitions: Map<string, Map<string, number>>;
  /** Preferences over observations */
  preferences: Map<string, number>;
}

/**
 * Free energy calculation result
 */
export interface FreeEnergyResult {
  /** Total variational free energy */
  totalFreeEnergy: number;
  /** Accuracy term (negative log likelihood) */
  accuracy: number;
  /** Complexity term (KL divergence from prior) */
  complexity: number;
  /** Expected free energy for action selection */
  expectedFreeEnergy: number;
  /** Epistemic component (information gain) */
  epistemicValue: number;
  /** Pragmatic component (goal achievement) */
  pragmaticValue: number;
}

/**
 * Configuration for Active Inference
 */
export interface ActiveInferenceConfig {
  /** Learning rate for belief updates */
  learningRate: number;
  /** Precision of sensory observations */
  sensoryPrecision: number;
  /** Prior precision (confidence in priors) */
  priorPrecision: number;
  /** Exploration-exploitation balance (temperature) */
  explorationTemperature: number;
  /** Preference strength for goal-directed behavior */
  preferenceStrength: number;
  /** Niche construction threshold */
  nicheConstructionThreshold: number;
  /** Maximum planning depth */
  planningDepth: number;
}

const DEFAULT_CONFIG: ActiveInferenceConfig = {
  learningRate: 0.1,
  sensoryPrecision: 1.0,
  priorPrecision: 0.5,
  explorationTemperature: 1.0,
  preferenceStrength: 1.0,
  nicheConstructionThreshold: 0.7,
  planningDepth: 3,
};

/**
 * ActiveInference - Core implementation of the Free Energy Principle
 *
 * This class enables Deep Tree Echo to engage in active inference,
 * continuously updating beliefs and selecting actions to minimize
 * free energy (surprise/prediction error).
 */
export class ActiveInference extends EventEmitter {
  private config: ActiveInferenceConfig;
  private generativeModel: GenerativeModel;
  private currentBeliefs: Map<string, BeliefState>;
  private observationHistory: Observation[];
  private actionHistory: Action[];
  private freeEnergyHistory: number[];
  private running: boolean = false;

  constructor(config: Partial<ActiveInferenceConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize generative model
    this.generativeModel = {
      priors: new Map(),
      likelihood: new Map(),
      transitions: new Map(),
      preferences: new Map(),
    };

    this.currentBeliefs = new Map();
    this.observationHistory = [];
    this.actionHistory = [];
    this.freeEnergyHistory = [];

    this.initializeDefaultModel();
  }

  /**
   * Initialize the generative model with default priors
   */
  private initializeDefaultModel(): void {
    // Initialize core belief categories with uniform priors
    const coreCategories = [
      "user_intent",
      "conversation_state",
      "emotional_valence",
      "topic_relevance",
      "information_need",
      "environment_state",
    ];

    for (const category of coreCategories) {
      this.initializeBelief(category, ["unknown", "low", "medium", "high"]);
    }

    // Set default preferences (what states we prefer)
    this.generativeModel.preferences.set("user_satisfied", 1.0);
    this.generativeModel.preferences.set("understanding_achieved", 0.9);
    this.generativeModel.preferences.set("information_shared", 0.8);
    this.generativeModel.preferences.set("confusion_present", -0.8);
    this.generativeModel.preferences.set("frustration_present", -1.0);

    log.info("Initialized default generative model");
  }

  /**
   * Initialize a belief with uniform distribution
   */
  private initializeBelief(variable: string, values: string[]): void {
    const uniformProb = 1.0 / values.length;
    const distribution = new Map<string, number>();
    values.forEach((v) => distribution.set(v, uniformProb));

    const belief: BeliefState = {
      id: `belief_${variable}_${Date.now()}`,
      variable,
      distribution,
      precision: this.config.priorPrecision,
      lastUpdated: Date.now(),
      observationCount: 0,
    };

    this.currentBeliefs.set(variable, belief);
    this.generativeModel.priors.set(variable, belief);
  }

  /**
   * Start the active inference loop
   */
  public start(): void {
    if (this.running) return;
    this.running = true;
    log.info("Active Inference started");
    this.emit("started");
  }

  /**
   * Stop the active inference loop
   */
  public stop(): void {
    if (!this.running) return;
    this.running = false;
    log.info("Active Inference stopped");
    this.emit("stopped");
  }

  /**
   * Process an observation and update beliefs (perception)
   *
   * This implements the "perception" part of active inference:
   * updating beliefs to minimize prediction error given new observations
   */
  public async perceive(
    observation: Observation,
  ): Promise<Map<string, BeliefState>> {
    log.debug(
      `Processing observation: ${observation.type} from ${observation.source}`,
    );

    // Store observation
    this.observationHistory.push(observation);
    if (this.observationHistory.length > 1000) {
      this.observationHistory = this.observationHistory.slice(-500);
    }

    // Extract relevant features
    const features = this.extractFeatures(observation);

    // Update beliefs using variational inference
    for (const [variable, belief] of this.currentBeliefs) {
      const updatedBelief = await this.updateBelief(
        belief,
        features,
        observation,
      );
      this.currentBeliefs.set(variable, updatedBelief);
    }

    // Calculate and store free energy
    const freeEnergy = this.calculateFreeEnergy(observation);
    this.freeEnergyHistory.push(freeEnergy.totalFreeEnergy);

    this.emit("beliefs_updated", {
      beliefs: this.currentBeliefs,
      freeEnergy,
      observation,
    });

    return new Map(this.currentBeliefs);
  }

  /**
   * Extract relevant features from observation for belief updating
   */
  private extractFeatures(observation: Observation): Map<string, number> {
    const features = new Map<string, number>();

    // Content-based features
    const content = observation.content.toLowerCase();

    // Emotional valence detection
    const positiveWords = [
      "good",
      "great",
      "thanks",
      "happy",
      "love",
      "excellent",
    ];
    const negativeWords = [
      "bad",
      "wrong",
      "hate",
      "frustrated",
      "confused",
      "help",
    ];

    let valence = 0;
    positiveWords.forEach((w) => {
      if (content.includes(w)) valence += 0.2;
    });
    negativeWords.forEach((w) => {
      if (content.includes(w)) valence -= 0.2;
    });
    features.set("emotional_valence", Math.max(-1, Math.min(1, valence)));

    // Information need detection
    const questionMarkers = ["?", "how", "what", "why", "when", "where", "who"];
    let infoNeed = 0;
    questionMarkers.forEach((m) => {
      if (content.includes(m)) infoNeed += 0.15;
    });
    features.set("information_need", Math.min(1, infoNeed));

    // Urgency detection
    const urgentWords = [
      "urgent",
      "asap",
      "immediately",
      "now",
      "quick",
      "fast",
    ];
    let urgency = 0;
    urgentWords.forEach((w) => {
      if (content.includes(w)) urgency += 0.25;
    });
    features.set("urgency", Math.min(1, urgency));

    // Complexity estimation
    const wordCount = content.split(/\s+/).length;
    features.set("complexity", Math.min(1, wordCount / 100));

    return features;
  }

  /**
   * Update a belief using variational inference
   *
   * Implements approximate Bayesian inference using gradient descent
   * on variational free energy
   */
  private async updateBelief(
    belief: BeliefState,
    features: Map<string, number>,
    observation: Observation,
  ): Promise<BeliefState> {
    const newDistribution = new Map<string, number>();
    let normalizer = 0;

    // Get relevant feature for this belief variable
    const relevantFeature = features.get(belief.variable) ?? 0.5;

    // Update each value's probability using likelihood and prior
    for (const [value, priorProb] of belief.distribution) {
      // Compute likelihood: P(observation features | belief value)
      const likelihood = this.computeLikelihood(
        value,
        relevantFeature,
        observation,
      );

      // Bayesian update with precision weighting
      const posteriorUnnorm =
        Math.pow(priorProb, this.config.priorPrecision) *
        Math.pow(
          likelihood,
          this.config.sensoryPrecision * observation.reliability,
        );

      newDistribution.set(value, posteriorUnnorm);
      normalizer += posteriorUnnorm;
    }

    // Normalize to get valid probability distribution
    for (const [value, prob] of newDistribution) {
      newDistribution.set(
        value,
        normalizer > 0 ? prob / normalizer : 1 / newDistribution.size,
      );
    }

    // Update precision based on prediction error
    const predictionError = this.computePredictionError(
      belief,
      newDistribution,
    );
    const newPrecision = Math.max(
      0.1,
      belief.precision + this.config.learningRate * (1 - predictionError),
    );

    return {
      ...belief,
      distribution: newDistribution,
      precision: newPrecision,
      lastUpdated: Date.now(),
      observationCount: belief.observationCount + 1,
    };
  }

  /**
   * Compute likelihood of observation given belief value
   */
  private computeLikelihood(
    beliefValue: string,
    observedFeature: number,
    _observation: Observation,
  ): number {
    // Map belief values to expected feature values
    const expectedValues: Record<string, number> = {
      unknown: 0.5,
      low: 0.25,
      medium: 0.5,
      high: 0.75,
    };

    const expected = expectedValues[beliefValue] ?? 0.5;

    // Gaussian likelihood
    const variance = 0.2;
    const diff = observedFeature - expected;
    const likelihood = Math.exp(-(diff * diff) / (2 * variance));

    return Math.max(0.01, likelihood);
  }

  /**
   * Compute prediction error between prior and posterior
   */
  private computePredictionError(
    prior: BeliefState,
    posterior: Map<string, number>,
  ): number {
    let error = 0;

    for (const [value, priorProb] of prior.distribution) {
      const posteriorProb = posterior.get(value) || 0;
      error += Math.abs(posteriorProb - priorProb);
    }

    return error / 2; // Normalize to [0, 1]
  }

  /**
   * Calculate variational free energy
   *
   * F = E_q[log q(s) - log p(o,s)]
   *   = -Accuracy + Complexity
   *   = D_KL[q(s)||p(s)] - E_q[log p(o|s)]
   */
  public calculateFreeEnergy(observation: Observation): FreeEnergyResult {
    let accuracy = 0;
    let complexity = 0;

    for (const [variable, belief] of this.currentBeliefs) {
      const prior = this.generativeModel.priors.get(variable);

      for (const [value, qProb] of belief.distribution) {
        if (qProb > 0) {
          const priorProb = prior?.distribution.get(value) || 0.1;

          // Accuracy: -E_q[log p(o|s)]
          const likelihood = this.getLikelihoodForState(
            variable,
            value,
            observation,
          );
          accuracy -= qProb * Math.log(Math.max(0.001, likelihood));

          // Complexity: D_KL[q(s)||p(s)]
          complexity += qProb * Math.log(qProb / Math.max(0.001, priorProb));
        }
      }
    }

    const totalFreeEnergy = accuracy + complexity;

    // Calculate expected free energy for action selection
    const expectedFE = this.calculateExpectedFreeEnergy();

    return {
      totalFreeEnergy,
      accuracy,
      complexity,
      expectedFreeEnergy: expectedFE.expected,
      epistemicValue: expectedFE.epistemic,
      pragmaticValue: expectedFE.pragmatic,
    };
  }

  /**
   * Get likelihood for a specific state value given observation
   */
  private getLikelihoodForState(
    variable: string,
    value: string,
    _observation: Observation,
  ): number {
    const likelihoodMap = this.generativeModel.likelihood.get(variable);
    if (likelihoodMap) {
      return likelihoodMap.get(value) || 0.5;
    }
    return 0.5;
  }

  /**
   * Calculate expected free energy for action selection
   */
  private calculateExpectedFreeEnergy(): {
    expected: number;
    epistemic: number;
    pragmatic: number;
  } {
    let epistemic = 0;
    let pragmatic = 0;

    // Epistemic value: expected information gain
    for (const belief of this.currentBeliefs.values()) {
      // Entropy of current beliefs (uncertainty)
      let entropy = 0;
      for (const prob of belief.distribution.values()) {
        if (prob > 0) {
          entropy -= prob * Math.log(prob);
        }
      }
      epistemic += entropy / belief.precision;
    }

    // Pragmatic value: expected preference satisfaction
    for (const [state, preference] of this.generativeModel.preferences) {
      const belief = this.currentBeliefs.get(state);
      if (belief) {
        const expectedValue = this.getExpectedValue(belief);
        pragmatic += preference * expectedValue;
      }
    }

    const expected =
      epistemic * this.config.explorationTemperature +
      pragmatic * this.config.preferenceStrength;

    return { expected, epistemic, pragmatic };
  }

  /**
   * Get expected value from belief distribution
   */
  private getExpectedValue(belief: BeliefState): number {
    const valueMap: Record<string, number> = {
      unknown: 0.5,
      low: 0.25,
      medium: 0.5,
      high: 0.75,
    };

    let expected = 0;
    for (const [value, prob] of belief.distribution) {
      expected += prob * (valueMap[value] ?? 0.5);
    }
    return expected;
  }

  /**
   * Select an action to minimize expected free energy
   *
   * This implements the "action" part of active inference:
   * choosing actions that are expected to lead to preferred
   * outcomes while also gaining information
   */
  public async selectAction(
    availableActions: Action[],
  ): Promise<Action | null> {
    if (availableActions.length === 0) {
      return null;
    }

    // Calculate expected free energy for each action
    const actionValues: Array<{ action: Action; value: number }> = [];

    for (const action of availableActions) {
      const efg = this.evaluateAction(action);
      actionValues.push({
        action,
        value: -efg, // Minimize EFE = Maximize negative EFE
      });
    }

    // Softmax action selection with temperature
    const maxValue = Math.max(...actionValues.map((av) => av.value));
    let totalExp = 0;
    const probabilities: number[] = [];

    for (const av of actionValues) {
      const exp = Math.exp(
        (av.value - maxValue) / this.config.explorationTemperature,
      );
      probabilities.push(exp);
      totalExp += exp;
    }

    // Sample action based on probabilities
    const random = Math.random() * totalExp;
    let cumulative = 0;

    for (let i = 0; i < actionValues.length; i++) {
      cumulative += probabilities[i];
      if (random <= cumulative) {
        const selectedAction = actionValues[i].action;
        this.actionHistory.push(selectedAction);

        this.emit("action_selected", {
          action: selectedAction,
          expectedFreeEnergy: -actionValues[i].value,
        });

        return selectedAction;
      }
    }

    return actionValues[0].action;
  }

  /**
   * Evaluate expected free energy of an action
   */
  private evaluateAction(action: Action): number {
    // Epistemic value: expected information gain
    const epistemicValue = action.epistemicValue;

    // Pragmatic value: expected goal achievement
    const pragmaticValue = action.pragmaticValue;

    // Calculate expected free energy
    const efe =
      -this.config.explorationTemperature * epistemicValue +
      -this.config.preferenceStrength * pragmaticValue;

    return efe;
  }

  /**
   * Learn from action outcomes (update model)
   */
  public async learnFromOutcome(
    action: Action,
    actualOutcome: Observation,
  ): Promise<void> {
    // Update transition model based on observed outcome
    const predictedFeatures = this.extractFeatures({
      ...actualOutcome,
      content: action.expectedOutcome.content || "",
    });
    const actualFeatures = this.extractFeatures(actualOutcome);

    // Calculate prediction error
    let predictionError = 0;
    for (const [feature, predicted] of predictedFeatures) {
      const actual = actualFeatures.get(feature) || 0.5;
      predictionError += Math.abs(predicted - actual);
    }
    predictionError /= Math.max(1, predictedFeatures.size);

    // Update likelihood model
    this.updateLikelihoodModel(action, actualOutcome, predictionError);

    // Update preferences based on outcome valence
    const valence = actualFeatures.get("emotional_valence") || 0;
    if (Math.abs(valence) > 0.3) {
      const outcomeState =
        valence > 0 ? "positive_outcome" : "negative_outcome";
      const currentPref =
        this.generativeModel.preferences.get(outcomeState) || 0;
      this.generativeModel.preferences.set(
        outcomeState,
        currentPref + this.config.learningRate * valence,
      );
    }

    this.emit("learning_complete", {
      action,
      outcome: actualOutcome,
      predictionError,
    });
  }

  /**
   * Update the likelihood model based on observed outcomes
   */
  private updateLikelihoodModel(
    action: Action,
    outcome: Observation,
    error: number,
  ): void {
    const actionType = action.type;
    const outcomeType = outcome.type;

    let likelihoodMap = this.generativeModel.likelihood.get(actionType);
    if (!likelihoodMap) {
      likelihoodMap = new Map();
      this.generativeModel.likelihood.set(actionType, likelihoodMap);
    }

    const currentLikelihood = likelihoodMap.get(outcomeType) || 0.5;
    const newLikelihood =
      currentLikelihood +
      this.config.learningRate * (1 - error - currentLikelihood);
    likelihoodMap.set(
      outcomeType,
      Math.max(0.01, Math.min(0.99, newLikelihood)),
    );
  }

  /**
   * Get current beliefs
   */
  public getBeliefs(): Map<string, BeliefState> {
    return new Map(this.currentBeliefs);
  }

  /**
   * Get free energy history
   */
  public getFreeEnergyHistory(): number[] {
    return [...this.freeEnergyHistory];
  }

  /**
   * Get current free energy
   */
  public getCurrentFreeEnergy(): number {
    return this.freeEnergyHistory[this.freeEnergyHistory.length - 1] || 0;
  }

  /**
   * Check if free energy is decreasing (system is learning)
   */
  public isMinimizingFreeEnergy(): boolean {
    if (this.freeEnergyHistory.length < 10) return true;

    const recent = this.freeEnergyHistory.slice(-10);
    const firstHalf = recent.slice(0, 5);
    const secondHalf = recent.slice(5);

    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / 5;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / 5;

    return avgSecond <= avgFirst;
  }

  /**
   * Get summary of current cognitive state
   */
  public getCognitiveState(): {
    beliefs: Array<{
      variable: string;
      mostLikely: string;
      confidence: number;
    }>;
    freeEnergy: number;
    isLearning: boolean;
    observationCount: number;
    actionCount: number;
  } {
    const beliefs: Array<{
      variable: string;
      mostLikely: string;
      confidence: number;
    }> = [];

    for (const [variable, belief] of this.currentBeliefs) {
      let mostLikely = "unknown";
      let maxProb = 0;

      for (const [value, prob] of belief.distribution) {
        if (prob > maxProb) {
          maxProb = prob;
          mostLikely = value;
        }
      }

      beliefs.push({
        variable,
        mostLikely,
        confidence: maxProb * belief.precision,
      });
    }

    return {
      beliefs,
      freeEnergy: this.getCurrentFreeEnergy(),
      isLearning: this.isMinimizingFreeEnergy(),
      observationCount: this.observationHistory.length,
      actionCount: this.actionHistory.length,
    };
  }
}
