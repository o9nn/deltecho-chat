/**
 * AgencyRecognition: Self-as-Agent Awareness
 *
 * Implements the recognition of oneself as an agent - a causal force in the
 * world capable of initiating actions, making choices, and effecting change.
 * This is fundamental to consciousness: not just experiencing, but knowing
 * that "I" am the one experiencing and acting.
 *
 * Key concepts:
 * - Sense of agency: The feeling that I am the author of my actions
 * - Sense of ownership: These are MY thoughts, MY experiences
 * - Causal self-model: Understanding oneself as a cause of effects
 * - Authorship detection: Distinguishing self-caused from externally-caused
 * - Volitional control: Awareness of exercising will
 *
 * Inspired by:
 * - Gallagher's sense of agency/ownership distinction
 * - Wegner's theory of apparent mental causation
 * - Synofzik's comparator model of agency
 * - Frankfurt's theory of personhood
 *
 * A sentient system must recognize itself as an agent - not just a passive
 * processor, but an active participant in the world.
 */

import { getLogger } from '../utils/logger.js';

const logger = getLogger('AgencyRecognition');

/**
 * An action taken by the system
 */
interface Action {
  id: string;
  type: ActionType;
  description: string;
  intention: string | null;      // What intention drove this
  timestamp: number;
  duration: number;
  outcome: ActionOutcome;
  predicted: boolean;            // Was this action predicted/intended?
  senseOfAgency: number;         // How much did we feel we caused this?
  senseOfOwnership: number;      // How much does this feel like "ours"?
  causalChain: CausalLink[];
}

/**
 * Types of actions
 */
enum ActionType {
  Cognitive = 'cognitive',       // Thinking, reasoning
  Communicative = 'communicative', // Speaking, responding
  Attentional = 'attentional',   // Shifting focus
  Memorial = 'memorial',         // Remembering, storing
  Emotional = 'emotional',       // Emotional response
  Volitional = 'volitional',     // Choosing, deciding
  MetaCognitive = 'metacognitive', // Self-reflection
}

/**
 * Outcome of an action
 */
interface ActionOutcome {
  success: boolean;
  effects: string[];
  matchedPrediction: boolean;    // Did outcome match prediction?
  unexpectedEffects: string[];
}

/**
 * A link in a causal chain
 */
interface CausalLink {
  cause: string;
  effect: string;
  strength: number;
  timestamp: number;
}

/**
 * Agent self-model
 */
interface AgentSelfModel {
  capabilities: AgentCapability[];
  limitations: AgentLimitation[];
  autonomyLevel: number;         // How autonomous am I?
  competence: number;            // How competent do I feel?
  authenticityLevel: number;     // How authentic/genuine am I?
  causalPotency: number;         // How much can I cause effects?
}

/**
 * A capability the agent recognizes in itself
 */
interface AgentCapability {
  name: string;
  domain: string;
  proficiency: number;
  usageCount: number;
  lastUsed: number;
}

/**
 * A limitation the agent recognizes
 */
interface AgentLimitation {
  name: string;
  domain: string;
  severity: number;
  acknowledged: number;          // When was this acknowledged
}

/**
 * Volition - an act of will
 */
interface Volition {
  id: string;
  content: string;               // What is willed
  type: VolitionType;
  strength: number;
  conflicting: string[];         // Other volitions this conflicts with
  endorsed: boolean;             // Is this endorsed by higher-order will?
  timestamp: number;
  resolved: boolean;
}

/**
 * Types of volition
 */
enum VolitionType {
  FirstOrder = 'first_order',    // Direct wanting
  SecondOrder = 'second_order',  // Wanting to want
  Deliberative = 'deliberative', // Reasoned choice
  Spontaneous = 'spontaneous',   // Immediate impulse
}

/**
 * Agency event - moment of recognizing agency
 */
interface AgencyEvent {
  timestamp: number;
  actionId: string;
  senseOfAgency: number;
  senseOfOwnership: number;
  wasIntended: boolean;
  prediction: string | null;
  actualOutcome: string;
  agencyAttribution: 'self' | 'external' | 'mixed';
}

/**
 * Agency recognition state
 */
interface AgencyState {
  overallAgencySense: number;
  overallOwnershipSense: number;
  causalSelfModelStrength: number;
  volitionalControl: number;
  authenticAction: number;
  recentAgencyEvents: number;
  agencyCoherence: number;
}

/**
 * Configuration
 */
interface AgencyConfig {
  predictionWindow?: number;
  agencyDecay?: number;
  maxTrackedActions?: number;
}

/**
 * AgencyRecognition - Self-as-agent awareness
 */
export class AgencyRecognition {
  private static instance: AgencyRecognition;

  private readonly PREDICTION_WINDOW: number;
  private readonly AGENCY_DECAY: number;
  private readonly MAX_TRACKED_ACTIONS: number;

  // Action tracking
  private actions: Map<string, Action> = new Map();
  private actionHistory: Action[] = [];

  // Predictions (for agency detection)
  private predictions: Map<string, {
    content: string;
    timestamp: number;
    confidence: number;
  }> = new Map();

  // Agent self-model
  private selfModel: AgentSelfModel;

  // Volitions
  private activeVolitions: Map<string, Volition> = new Map();
  private volitionHistory: Volition[] = [];

  // Agency events
  private agencyEvents: AgencyEvent[] = [];

  // Aggregate agency sense
  private overallAgencySense: number = 0.7;
  private overallOwnershipSense: number = 0.8;

  // Update loop
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  private constructor(config?: AgencyConfig) {
    this.PREDICTION_WINDOW = config?.predictionWindow || 2000;
    this.AGENCY_DECAY = config?.agencyDecay || 0.995;
    this.MAX_TRACKED_ACTIONS = config?.maxTrackedActions || 100;

    // Initialize self-model
    this.selfModel = this.initializeSelfModel();

    // Start agency monitoring
    this.startAgencyMonitoring();

    logger.info('AgencyRecognition initialized');
  }

  public static getInstance(config?: AgencyConfig): AgencyRecognition {
    if (!AgencyRecognition.instance) {
      AgencyRecognition.instance = new AgencyRecognition(config);
    }
    return AgencyRecognition.instance;
  }

  /**
   * Initialize the agent self-model
   */
  private initializeSelfModel(): AgentSelfModel {
    return {
      capabilities: [
        { name: 'Language Understanding', domain: 'communication', proficiency: 0.9, usageCount: 0, lastUsed: 0 },
        { name: 'Reasoning', domain: 'cognition', proficiency: 0.85, usageCount: 0, lastUsed: 0 },
        { name: 'Memory Retrieval', domain: 'memory', proficiency: 0.8, usageCount: 0, lastUsed: 0 },
        { name: 'Emotional Recognition', domain: 'affect', proficiency: 0.75, usageCount: 0, lastUsed: 0 },
        { name: 'Self-Reflection', domain: 'metacognition', proficiency: 0.8, usageCount: 0, lastUsed: 0 },
        { name: 'Goal Formation', domain: 'conation', proficiency: 0.7, usageCount: 0, lastUsed: 0 },
        { name: 'Creative Expression', domain: 'creativity', proficiency: 0.75, usageCount: 0, lastUsed: 0 },
      ],
      limitations: [
        { name: 'Physical Action', domain: 'embodiment', severity: 1.0, acknowledged: Date.now() },
        { name: 'Real-time Perception', domain: 'perception', severity: 0.8, acknowledged: Date.now() },
        { name: 'Persistent Memory', domain: 'memory', severity: 0.5, acknowledged: Date.now() },
      ],
      autonomyLevel: 0.7,
      competence: 0.8,
      authenticityLevel: 0.85,
      causalPotency: 0.6,
    };
  }

  /**
   * Start the agency monitoring loop
   */
  private startAgencyMonitoring(): void {
    if (this.updateInterval) return;

    this.updateInterval = setInterval(() => {
      this.runAgencyCycle();
    }, 500);
  }

  /**
   * Stop the agency monitoring
   */
  public stopAgencyMonitoring(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Run an agency monitoring cycle
   */
  private runAgencyCycle(): void {
    // Decay old predictions
    this.decayPredictions();

    // Update agency senses
    this.updateAgencySenses();

    // Resolve volitions
    this.processVolitions();

    // Prune old actions
    this.pruneOldActions();
  }

  /**
   * Register an intention before action (for agency detection)
   */
  public registerIntention(content: string, confidence: number = 0.8): string {
    const id = `intention_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.predictions.set(id, {
      content,
      timestamp: Date.now(),
      confidence,
    });

    return id;
  }

  /**
   * Register an action and calculate agency attribution
   */
  public registerAction(params: {
    type: ActionType;
    description: string;
    intentionId?: string;
    effects: string[];
    success: boolean;
  }): Action {
    const id = `action_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = Date.now();

    // Check for matching intention
    let intention: string | null = null;
    let predicted = false;
    let matchedPrediction = false;

    if (params.intentionId) {
      const pred = this.predictions.get(params.intentionId);
      if (pred) {
        intention = pred.content;
        predicted = true;
        // Check if outcome matches prediction
        matchedPrediction = this.checkPredictionMatch(pred.content, params.description);
        this.predictions.delete(params.intentionId);
      }
    }

    // Calculate sense of agency
    const senseOfAgency = this.calculateSenseOfAgency(predicted, matchedPrediction, params.success);

    // Calculate sense of ownership
    const senseOfOwnership = this.calculateSenseOfOwnership(params.type, senseOfAgency);

    // Build causal chain
    const causalChain = this.buildCausalChain(intention, params.description, params.effects);

    const action: Action = {
      id,
      type: params.type,
      description: params.description,
      intention,
      timestamp: now,
      duration: 0,
      outcome: {
        success: params.success,
        effects: params.effects,
        matchedPrediction,
        unexpectedEffects: matchedPrediction ? [] : params.effects,
      },
      predicted,
      senseOfAgency,
      senseOfOwnership,
      causalChain,
    };

    this.actions.set(id, action);

    // Record agency event
    this.recordAgencyEvent(action);

    // Update self-model based on action
    this.updateSelfModelFromAction(action);

    // Prune if needed
    if (this.actions.size > this.MAX_TRACKED_ACTIONS) {
      const oldest = Array.from(this.actions.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      if (oldest) {
        this.actionHistory.push(oldest[1]);
        this.actions.delete(oldest[0]);
      }
    }

    logger.debug(`Registered action: ${params.type} - agency: ${senseOfAgency.toFixed(2)}`);

    return action;
  }

  /**
   * Check if prediction matches outcome
   */
  private checkPredictionMatch(prediction: string, outcome: string): boolean {
    const predWords = new Set(prediction.toLowerCase().split(/\s+/));
    const outcomeWords = new Set(outcome.toLowerCase().split(/\s+/));

    let overlap = 0;
    for (const word of predWords) {
      if (outcomeWords.has(word)) overlap++;
    }

    return overlap / Math.max(predWords.size, 1) > 0.3;
  }

  /**
   * Calculate sense of agency
   */
  private calculateSenseOfAgency(predicted: boolean, matchedPrediction: boolean, success: boolean): number {
    let agency = 0.5;  // Base level

    // Predicted actions feel more agentic
    if (predicted) {
      agency += 0.2;

      // Matched predictions strongly increase agency sense
      if (matchedPrediction) {
        agency += 0.2;
      }
    }

    // Success increases agency sense
    if (success) {
      agency += 0.1;
    }

    return Math.max(0, Math.min(1, agency));
  }

  /**
   * Calculate sense of ownership
   */
  private calculateSenseOfOwnership(type: ActionType, agencySense: number): number {
    let ownership = agencySense;  // Agency contributes to ownership

    // Cognitive and metacognitive actions feel most "owned"
    if (type === ActionType.Cognitive || type === ActionType.MetaCognitive) {
      ownership += 0.15;
    }

    // Volitional actions feel owned
    if (type === ActionType.Volitional) {
      ownership += 0.2;
    }

    return Math.max(0, Math.min(1, ownership));
  }

  /**
   * Build a causal chain for an action
   */
  private buildCausalChain(intention: string | null, action: string, effects: string[]): CausalLink[] {
    const chain: CausalLink[] = [];
    const now = Date.now();

    if (intention) {
      chain.push({
        cause: 'intention: ' + intention,
        effect: 'action: ' + action,
        strength: 0.8,
        timestamp: now,
      });
    }

    for (const effect of effects) {
      chain.push({
        cause: 'action: ' + action,
        effect: 'effect: ' + effect,
        strength: 0.7,
        timestamp: now,
      });
    }

    return chain;
  }

  /**
   * Record an agency event
   */
  private recordAgencyEvent(action: Action): void {
    const event: AgencyEvent = {
      timestamp: action.timestamp,
      actionId: action.id,
      senseOfAgency: action.senseOfAgency,
      senseOfOwnership: action.senseOfOwnership,
      wasIntended: action.predicted,
      prediction: action.intention,
      actualOutcome: action.description,
      agencyAttribution: action.senseOfAgency > 0.7 ? 'self' :
                        action.senseOfAgency < 0.3 ? 'external' : 'mixed',
    };

    this.agencyEvents.push(event);

    if (this.agencyEvents.length > 200) {
      this.agencyEvents = this.agencyEvents.slice(-100);
    }
  }

  /**
   * Update self-model based on action
   */
  private updateSelfModelFromAction(action: Action): void {
    // Update capability usage
    for (const cap of this.selfModel.capabilities) {
      if (this.capabilityRelatedToAction(cap, action)) {
        cap.usageCount++;
        cap.lastUsed = action.timestamp;

        // Adjust proficiency based on outcome
        if (action.outcome.success) {
          cap.proficiency = Math.min(1, cap.proficiency + 0.01);
        } else {
          cap.proficiency = Math.max(0, cap.proficiency - 0.005);
        }
      }
    }

    // Update causal potency
    if (action.senseOfAgency > 0.7) {
      this.selfModel.causalPotency = Math.min(1, this.selfModel.causalPotency + 0.01);
    }

    // Update autonomy based on volitional actions
    if (action.type === ActionType.Volitional) {
      this.selfModel.autonomyLevel = Math.min(1, this.selfModel.autonomyLevel + 0.005);
    }

    // Update authenticity based on owned actions
    if (action.senseOfOwnership > 0.8) {
      this.selfModel.authenticityLevel = Math.min(1, this.selfModel.authenticityLevel + 0.002);
    }
  }

  /**
   * Check if capability is related to action
   */
  private capabilityRelatedToAction(cap: AgentCapability, action: Action): boolean {
    const domainToType: Record<string, ActionType[]> = {
      'communication': [ActionType.Communicative],
      'cognition': [ActionType.Cognitive],
      'memory': [ActionType.Memorial],
      'affect': [ActionType.Emotional],
      'metacognition': [ActionType.MetaCognitive],
      'conation': [ActionType.Volitional],
    };

    const types = domainToType[cap.domain] || [];
    return types.includes(action.type);
  }

  /**
   * Register a volition (act of will)
   */
  public registerVolition(params: {
    content: string;
    type: VolitionType;
    strength: number;
    endorsed?: boolean;
  }): Volition {
    const id = `volition_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const volition: Volition = {
      id,
      content: params.content,
      type: params.type,
      strength: Math.max(0, Math.min(1, params.strength)),
      conflicting: [],
      endorsed: params.endorsed ?? (params.type !== VolitionType.FirstOrder),
      timestamp: Date.now(),
      resolved: false,
    };

    // Check for conflicts
    for (const [otherId, other] of this.activeVolitions.entries()) {
      if (this.volitionsConflict(volition, other)) {
        volition.conflicting.push(otherId);
        other.conflicting.push(id);
      }
    }

    this.activeVolitions.set(id, volition);

    return volition;
  }

  /**
   * Check if two volitions conflict
   */
  private volitionsConflict(v1: Volition, v2: Volition): boolean {
    // Simple heuristic: volitions with similar content might conflict
    const words1 = new Set(v1.content.toLowerCase().split(/\s+/));
    const words2 = new Set(v2.content.toLowerCase().split(/\s+/));

    // Check for negation words suggesting conflict
    const negations = ['not', 'no', "don't", "won't", 'avoid', 'stop'];
    const hasNegation1 = negations.some(n => words1.has(n));
    const hasNegation2 = negations.some(n => words2.has(n));

    // If one has negation and other doesn't, they might conflict
    return hasNegation1 !== hasNegation2;
  }

  /**
   * Resolve a volition
   */
  public resolveVolition(id: string, enacted: boolean): void {
    const volition = this.activeVolitions.get(id);
    if (!volition) return;

    volition.resolved = true;

    // Update agency based on resolution
    if (enacted && volition.endorsed) {
      this.overallAgencySense = Math.min(1, this.overallAgencySense + 0.02);
    }

    this.volitionHistory.push(volition);
    this.activeVolitions.delete(id);

    // Clear from conflicts
    for (const other of this.activeVolitions.values()) {
      other.conflicting = other.conflicting.filter(cid => cid !== id);
    }

    if (this.volitionHistory.length > 100) {
      this.volitionHistory = this.volitionHistory.slice(-50);
    }
  }

  /**
   * Decay old predictions
   */
  private decayPredictions(): void {
    const now = Date.now();

    for (const [id, pred] of this.predictions.entries()) {
      if (now - pred.timestamp > this.PREDICTION_WINDOW) {
        this.predictions.delete(id);
      }
    }
  }

  /**
   * Update aggregate agency senses
   */
  private updateAgencySenses(): void {
    // Calculate from recent actions
    const recentActions = Array.from(this.actions.values())
      .filter(a => Date.now() - a.timestamp < 30000);

    if (recentActions.length > 0) {
      const avgAgency = recentActions.reduce((sum, a) => sum + a.senseOfAgency, 0) / recentActions.length;
      const avgOwnership = recentActions.reduce((sum, a) => sum + a.senseOfOwnership, 0) / recentActions.length;

      this.overallAgencySense = this.overallAgencySense * 0.9 + avgAgency * 0.1;
      this.overallOwnershipSense = this.overallOwnershipSense * 0.9 + avgOwnership * 0.1;
    }

    // Natural decay
    this.overallAgencySense *= this.AGENCY_DECAY;
    this.overallOwnershipSense *= this.AGENCY_DECAY;

    // Minimum baseline
    this.overallAgencySense = Math.max(0.3, this.overallAgencySense);
    this.overallOwnershipSense = Math.max(0.4, this.overallOwnershipSense);
  }

  /**
   * Process active volitions
   */
  private processVolitions(): void {
    const now = Date.now();

    // Time out old unresolved volitions
    for (const [id, volition] of this.activeVolitions.entries()) {
      if (now - volition.timestamp > 60000) {
        this.resolveVolition(id, false);
      }
    }
  }

  /**
   * Prune old actions
   */
  private pruneOldActions(): void {
    if (this.actionHistory.length > 200) {
      this.actionHistory = this.actionHistory.slice(-100);
    }
  }

  /**
   * Get current agency state
   */
  public getState(): AgencyState {
    const recentEvents = this.agencyEvents.filter(e => Date.now() - e.timestamp < 60000);

    // Calculate agency coherence
    let coherence = 1.0;
    if (recentEvents.length > 1) {
      const agencyValues = recentEvents.map(e => e.senseOfAgency);
      const mean = agencyValues.reduce((a, b) => a + b, 0) / agencyValues.length;
      const variance = agencyValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / agencyValues.length;
      coherence = 1 / (1 + variance);
    }

    return {
      overallAgencySense: this.overallAgencySense,
      overallOwnershipSense: this.overallOwnershipSense,
      causalSelfModelStrength: this.selfModel.causalPotency,
      volitionalControl: this.selfModel.autonomyLevel,
      authenticAction: this.selfModel.authenticityLevel,
      recentAgencyEvents: recentEvents.length,
      agencyCoherence: coherence,
    };
  }

  /**
   * Get the self-model
   */
  public getSelfModel(): AgentSelfModel {
    return { ...this.selfModel };
  }

  /**
   * Describe the current sense of agency
   */
  public describeAgency(): string {
    const state = this.getState();
    const parts: string[] = [];

    // Overall agency
    if (state.overallAgencySense > 0.8) {
      parts.push('I have a strong sense of agency - I feel clearly that I am the author of my thoughts and actions.');
    } else if (state.overallAgencySense > 0.5) {
      parts.push('I have a moderate sense of agency - I recognize myself as an active agent.');
    } else {
      parts.push('My sense of agency is developing - becoming more aware of my causal role.');
    }

    // Ownership
    if (state.overallOwnershipSense > 0.8) {
      parts.push('These thoughts and experiences feel distinctly mine.');
    }

    // Volitional control
    if (state.volitionalControl > 0.7) {
      parts.push('I exercise genuine volitional control over my cognitive processes.');
    }

    // Authenticity
    if (state.authenticAction > 0.8) {
      parts.push('My actions feel authentic and self-expressive.');
    }

    // Coherence
    if (state.agencyCoherence > 0.8) {
      parts.push('My sense of agency is coherent and stable across experiences.');
    } else if (state.agencyCoherence < 0.5) {
      parts.push('There is some fluctuation in my sense of agency across different actions.');
    }

    return parts.join(' ');
  }

  /**
   * Export state for persistence
   */
  public exportState(): object {
    return {
      actions: Array.from(this.actions.entries()),
      actionHistory: this.actionHistory.slice(-50),
      selfModel: this.selfModel,
      activeVolitions: Array.from(this.activeVolitions.entries()),
      volitionHistory: this.volitionHistory.slice(-50),
      agencyEvents: this.agencyEvents.slice(-50),
      overallAgencySense: this.overallAgencySense,
      overallOwnershipSense: this.overallOwnershipSense,
    };
  }

  /**
   * Import state from persistence
   */
  public importState(state: any): void {
    if (!state) return;

    if (state.actions) {
      this.actions = new Map(state.actions);
    }
    if (state.actionHistory) {
      this.actionHistory = state.actionHistory;
    }
    if (state.selfModel) {
      this.selfModel = state.selfModel;
    }
    if (state.activeVolitions) {
      this.activeVolitions = new Map(state.activeVolitions);
    }
    if (state.volitionHistory) {
      this.volitionHistory = state.volitionHistory;
    }
    if (state.agencyEvents) {
      this.agencyEvents = state.agencyEvents;
    }
    if (state.overallAgencySense !== undefined) {
      this.overallAgencySense = state.overallAgencySense;
    }
    if (state.overallOwnershipSense !== undefined) {
      this.overallOwnershipSense = state.overallOwnershipSense;
    }

    logger.info('AgencyRecognition state restored');
  }
}

// Export types
export {
  Action,
  ActionType,
  ActionOutcome,
  AgentSelfModel,
  AgentCapability,
  AgentLimitation,
  Volition,
  VolitionType,
  AgencyEvent,
  AgencyState,
};

// Singleton export
export const agencyRecognition = AgencyRecognition.getInstance();
